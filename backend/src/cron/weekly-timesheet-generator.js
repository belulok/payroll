/**
 * Weekly Timesheet Generator Service
 *
 * This cron job automatically creates empty timesheets for hourly workers
 * at the start of each week. The timesheets are then filled when:
 * - Workers check in/out
 * - Leave requests are approved
 * - Public holidays are applied
 */

const cron = require('node-cron');
const { authenticate } = require('@feathersjs/authentication').hooks;

class WeeklyTimesheetGenerator {
  constructor(app) {
    this.app = app;
    this.cronJob = null;
  }

  /**
   * Get the Monday of the current week (or a specific date)
   */
  getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get the Sunday of the current week (or a specific date)
   */
  getWeekEnd(date = new Date()) {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * Get day of week abbreviation
   */
  getDayOfWeek(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  }

  /**
   * Generate empty daily entries for a week
   */
  generateEmptyDailyEntries(weekStart) {
    const entries = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      entries.push({
        date: date,
        dayOfWeek: this.getDayOfWeek(date),
        clockIn: null,
        clockOut: null,
        lunchOut: null,
        lunchIn: null,
        normalHours: 0,
        ot1_5Hours: 0,
        ot2_0Hours: 0,
        totalHours: 0,
        checkInMethod: 'manual',
        notes: null,
        isAbsent: false,
        leaveType: null
      });
    }
    return entries;
  }

  /**
   * Create weekly timesheets for all hourly workers in a company
   */
  async createWeeklyTimesheetsForCompany(companyId, weekStart, weekEnd) {
    const Worker = this.app.service('workers').Model;
    const Timesheet = this.app.service('timesheets').Model;

    // Find all hourly workers (not monthly-salary) for this company
    // Include workers where status is 'active' OR status is not set (undefined/null)
    const hourlyWorkers = await Worker.find({
      company: companyId,
      paymentType: { $in: ['hourly', 'unit-based'] },
      $or: [
        { status: 'active' },
        { status: { $exists: false } },
        { status: null }
      ],
      isDeleted: { $ne: true }
    }).select('_id firstName lastName employeeId');

    console.log(`[Timesheet Generator] Found ${hourlyWorkers.length} hourly workers for company ${companyId}`);

    let created = 0;
    let skipped = 0;

    for (const worker of hourlyWorkers) {
      try {
        // Check if timesheet already exists for this week
        const existingTimesheet = await Timesheet.findOne({
          company: companyId,
          worker: worker._id,
          weekStartDate: weekStart,
          isDeleted: { $ne: true }
        });

        if (existingTimesheet) {
          skipped++;
          continue;
        }

        // Create new empty timesheet
        const timesheet = new Timesheet({
          company: companyId,
          worker: worker._id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          dailyEntries: this.generateEmptyDailyEntries(weekStart),
          totalNormalHours: 0,
          totalOT1_5Hours: 0,
          totalOT2_0Hours: 0,
          totalHours: 0,
          status: 'draft',
          manuallyEdited: false,
          isDeleted: false
        });

        await timesheet.save({ validateBeforeSave: false }); // Skip createdBy validation for auto-generated
        created++;

        console.log(`[Timesheet Generator] Created timesheet for worker ${worker.firstName} ${worker.lastName} (${worker._id})`);
      } catch (error) {
        console.error(`[Timesheet Generator] Error creating timesheet for worker ${worker._id}:`, error.message);
      }
    }

    return { created, skipped, total: hourlyWorkers.length };
  }

  /**
   * Generate weekly timesheets for all companies
   */
  async generateWeeklyTimesheets(specificDate = null) {
    console.log('[Timesheet Generator] Starting weekly timesheet generation...');

    const Company = this.app.service('companies').Model;
    const weekStart = this.getWeekStart(specificDate ? new Date(specificDate) : new Date());
    const weekEnd = this.getWeekEnd(specificDate ? new Date(specificDate) : new Date());

    console.log(`[Timesheet Generator] Week: ${weekStart.toDateString()} - ${weekEnd.toDateString()}`);

    try {
      // Get all active companies
      const companies = await Company.find({ isDeleted: { $ne: true } }).select('_id name');
      console.log(`[Timesheet Generator] Processing ${companies.length} companies...`);

      let totalCreated = 0;
      let totalSkipped = 0;

      for (const company of companies) {
        const result = await this.createWeeklyTimesheetsForCompany(company._id, weekStart, weekEnd);
        totalCreated += result.created;
        totalSkipped += result.skipped;
        console.log(`[Timesheet Generator] Company "${company.name}": ${result.created} created, ${result.skipped} skipped`);
      }

      console.log(`[Timesheet Generator] Completed. Total: ${totalCreated} created, ${totalSkipped} skipped`);
      return {
        success: true,
        created: totalCreated,
        skipped: totalSkipped,
        week: {
          start: weekStart,
          end: weekEnd
        }
      };
    } catch (error) {
      console.error('[Timesheet Generator] Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate timesheets for a specific company only
   */
  async generateForCompany(companyId, specificDate = null) {
    const weekStart = this.getWeekStart(specificDate ? new Date(specificDate) : new Date());
    const weekEnd = this.getWeekEnd(specificDate ? new Date(specificDate) : new Date());

    const result = await this.createWeeklyTimesheetsForCompany(companyId, weekStart, weekEnd);
    return {
      success: true,
      ...result,
      week: {
        start: weekStart,
        end: weekEnd
      }
    };
  }

  /**
   * Start the cron job
   * Runs every day at 00:01 AM to ensure all hourly workers have timesheets
   */
  start() {
    // Run every day at 00:01 AM
    // Cron format: minute hour day-of-month month day-of-week
    this.cronJob = cron.schedule('1 0 * * *', async () => {
      console.log('[Timesheet Generator] Daily cron triggered at', new Date().toISOString());
      await this.generateWeeklyTimesheets();
    }, {
      timezone: 'Asia/Kuala_Lumpur' // Adjust to your timezone
    });

    console.log('📅 Daily timesheet generator scheduled (00:01 AM every day)');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[Timesheet Generator] Cron job stopped');
    }
  }
}

/**
 * Register the service with the app
 */
module.exports = function (app) {
  const generator = new WeeklyTimesheetGenerator(app);

  // Start the cron job
  generator.start();

  // Attach to app for use by other services
  app.set('timesheetGenerator', generator);

  // API endpoint to manually trigger generation for all companies
  app.post('/timesheets/generate-weekly', authenticate('jwt'), async (req, res) => {
    try {
      const { date } = req.body;
      const result = await generator.generateWeeklyTimesheets(date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API endpoint to generate for a specific company
  app.post('/timesheets/generate-weekly/:companyId', authenticate('jwt'), async (req, res) => {
    try {
      const { companyId } = req.params;
      const { date } = req.body;
      const result = await generator.generateForCompany(companyId, date);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
};

