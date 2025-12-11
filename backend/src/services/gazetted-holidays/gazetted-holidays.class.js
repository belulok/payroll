const { Service } = require('feathers-mongoose');
const { BadRequest } = require('@feathersjs/errors');

exports.GazettedHolidays = class GazettedHolidays extends Service {
  constructor(options, app) {
    super(options);
    this.app = app;
  }

  async create(data, params) {
    // Handle bulk import
    if (data.bulkImport && Array.isArray(data.holidays)) {
      return this.bulkImport(data.holidays, data.company, params);
    }

    // Ensure company is set from authenticated user if not provided
    if (!data.company && params.user) {
      if (params.user.role === 'subcon-admin') {
        data.company = params.user.company;
      }
    }

    // Extract year from date
    if (data.date && !data.year) {
      data.year = new Date(data.date).getFullYear();
    }

    const result = await super.create(data, params);

    // Update timesheets for this public holiday
    await this.updateTimesheetsForHoliday(result);

    return result;
  }

  // Update all timesheets for a public holiday
  async updateTimesheetsForHoliday(holiday) {
    try {
      const Timesheet = this.app.service('timesheets').Model;
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);

      // Find all timesheets for this company that include this date
      const timesheets = await Timesheet.find({
        company: holiday.company,
        weekStartDate: { $lte: holidayDate },
        weekEndDate: { $gte: holidayDate }
      });

      for (const timesheet of timesheets) {
        let modified = false;

        for (const entry of timesheet.dailyEntries) {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);

          // Check if this entry matches the holiday date
          if (entryDate.getTime() === holidayDate.getTime()) {
            // Only mark as PH if not already on leave or has no clock data
            if (!entry.leaveType || entry.leaveType === null) {
              entry.isAbsent = true;
              entry.leaveType = 'PH';
              entry.notes = holiday.name;
              // Clear work hours for PH (worker gets the day off)
              entry.clockIn = null;
              entry.clockOut = null;
              entry.lunchOut = null;
              entry.lunchIn = null;
              entry.normalHours = 0;
              entry.ot1_5Hours = 0;
              entry.ot2_0Hours = 0;
              entry.totalHours = 0;
              modified = true;
            }
          }
        }

        if (modified) {
          // Recalculate totals
          timesheet.totalNormalHours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.normalHours || 0), 0);
          timesheet.totalOT1_5Hours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.ot1_5Hours || 0), 0);
          timesheet.totalOT2_0Hours = timesheet.dailyEntries.reduce((sum, e) => sum + (e.ot2_0Hours || 0), 0);
          timesheet.totalHours = timesheet.totalNormalHours + timesheet.totalOT1_5Hours + timesheet.totalOT2_0Hours;
          await timesheet.save();
          console.log(`Updated timesheet ${timesheet._id} for PH: ${holiday.name}`);
        }
      }
    } catch (error) {
      console.error('Error updating timesheets for holiday:', error);
    }
  }

  // Parse various date formats (Excel exports different formats)
  parseDate(dateStr) {
    if (!dateStr) return null;

    const str = String(dateStr).trim();

    // Try ISO format first (2025-01-01)
    let date = new Date(str);
    if (!isNaN(date.getTime()) && str.includes('-')) {
      return date;
    }

    // Try M/D/YYYY or MM/DD/YYYY (US format from Excel)
    const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Try D/M/YYYY or DD/MM/YYYY (EU format)
    const euMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const [, day, month, year] = euMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Try YYYY/MM/DD
    const altMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (altMatch) {
      const [, year, month, day] = altMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD-MM-YYYY
    const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const [, day, month, year] = dashMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }

    // Last resort - let JS parse it
    date = new Date(str);
    if (!isNaN(date.getTime())) return date;

    return null;
  }

  async bulkImport(holidays, companyId, params) {
    if (!companyId) {
      throw new BadRequest('Company ID is required for bulk import');
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < holidays.length; i++) {
      const holiday = holidays[i];
      try {
        // Clean up field names (handle different casing/spacing)
        const name = holiday.name || holiday.Name || holiday.NAME || '';
        const dateStr = holiday.date || holiday.Date || holiday.DATE || '';

        // Validate required fields
        if (!name.toString().trim() || !dateStr.toString().trim()) {
          results.failed++;
          results.errors.push({ row: i + 2, error: `Name and date are required. Got name="${name}", date="${dateStr}"` });
          continue;
        }

        // Parse date with flexible format
        const date = this.parseDate(dateStr);
        if (!date) {
          results.failed++;
          results.errors.push({ row: i + 2, error: `Invalid date format: "${dateStr}". Use YYYY-MM-DD or M/D/YYYY` });
          continue;
        }

        // Check for duplicate (same name and date for this company)
        const existing = await super.find({
          query: {
            company: companyId,
            name: name.toString().trim(),
            date: {
              $gte: new Date(date.setHours(0, 0, 0, 0)),
              $lt: new Date(date.setHours(23, 59, 59, 999))
            }
          },
          paginate: false
        });

        if (existing && existing.length > 0) {
          results.skipped++;
          continue; // Skip duplicates silently
        }

        // Reset date hours after the duplicate check
        date.setHours(12, 0, 0, 0);

        const type = (holiday.type || holiday.Type || 'public').toString().toLowerCase().trim();
        const state = holiday.state || holiday.State || '';
        const isPaid = holiday.isPaid || holiday.IsPaid || holiday.ispaid || 'true';
        const isRecurring = holiday.isRecurring || holiday.IsRecurring || holiday.isrecurring || 'false';
        const description = holiday.description || holiday.Description || '';

        const holidayData = {
          company: companyId,
          name: name.toString().trim(),
          date: date,
          year: date.getFullYear(),
          type: ['public', 'company', 'state-specific'].includes(type) ? type : 'public',
          state: state.toString().trim() || null,
          isPaid: isPaid.toString().toLowerCase() !== 'false',
          isRecurring: isRecurring.toString().toLowerCase() === 'true',
          description: description.toString().trim(),
          isActive: true
        };

        const created = await super.create(holidayData, { ...params, provider: undefined });
        // Update timesheets for this holiday
        await this.updateTimesheetsForHoliday(created);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 2, error: error.message });
      }
    }

    return results;
  }

  async find(params) {
    // Multi-tenant isolation
    if (params.user && params.user.role === 'subcon-admin') {
      params.query = {
        ...params.query,
        company: params.user.company
      };
    }

    return super.find(params);
  }
};

