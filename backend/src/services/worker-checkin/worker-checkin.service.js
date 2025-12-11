const { authenticate } = require('@feathersjs/authentication').hooks;
const { BadRequest, Forbidden, NotFound } = require('@feathersjs/errors');

module.exports = function (app) {
  // Worker Check-in Service
  // Allows workers to clock in/out without full timesheet edit permissions
  app.use('/worker-checkin', {
    async create(data, params) {
      const user = params.user;

      if (!user) {
        throw new Forbidden('Authentication required');
      }

      // Only workers can use this endpoint
      if (user.role !== 'worker') {
        throw new Forbidden('This endpoint is only for workers');
      }

      if (!user.worker) {
        throw new Forbidden('Worker account not properly linked');
      }

      const { action, qrCode, location } = data;

      if (!action || !['clockIn', 'clockOut', 'lunchOut', 'lunchIn'].includes(action)) {
        throw new BadRequest('Invalid action. Must be: clockIn, clockOut, lunchOut, or lunchIn');
      }

      const workerId = user.worker;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get worker details - use internal call to bypass permission checks
      let worker;
      try {
        worker = await app.service('workers').get(workerId, { provider: undefined });
      } catch (e) {
        console.error('Error fetching worker:', e);
        throw new NotFound('Worker not found');
      }

      if (!worker) {
        throw new NotFound('Worker not found');
      }

      // Get company ID safely
      const companyId = typeof worker.company === 'object'
        ? (worker.company?._id?.toString() || worker.company?.toString())
        : worker.company?.toString();

      if (!companyId) {
        throw new BadRequest('Worker has no company assigned');
      }

      console.log('Worker check-in:', { workerId, companyId, action, paymentType: worker.paymentType });

      if (worker.paymentType === 'monthly-salary') {
        // Monthly workers - record attendance without timesheet
        return this.recordMonthlyWorkerAttendance(app, worker, companyId, action, now, qrCode, location);
      } else {
        // Hourly/Unit workers - need timesheet
        return this.recordHourlyWorkerAttendance(app, worker, companyId, action, now, today, qrCode, location);
      }
    },

    async recordMonthlyWorkerAttendance(app, worker, companyId, action, now, qrCode, location) {
      console.log('Recording monthly worker attendance:', { workerId: worker._id, companyId, action });

      // For monthly workers, we just record attendance in a simple format (no timesheets)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Try to find existing attendance record for today
      let attendance = null;
      try {
        console.log('Looking for existing attendance record...');
        const result = await app.service('attendance').find({
          query: {
            worker: worker._id,
            date: {
              $gte: today,
              $lt: tomorrow
            },
            $limit: 1
          },
          provider: undefined
        });

        attendance = result.data?.[0] || result[0];
        console.log('Existing attendance:', attendance ? 'found' : 'not found');
      } catch (e) {
        console.log('Error finding attendance:', e.message);
      }

      if (!attendance) {
        // Create new attendance record for today
        console.log('Creating new attendance record...');
        try {
          attendance = await app.service('attendance').create({
            worker: worker._id,
            company: companyId,
            date: today,
            [action]: now,
            checkInMethod: qrCode ? 'qr-code' : 'manual',
            qrCodeData: qrCode || undefined,
            location: location || undefined,
            status: 'present'
          }, { provider: undefined });

          console.log('Attendance created:', attendance._id);
          return {
            success: true,
            action,
            time: now,
            message: `Successfully ${this.getActionMessage(action)}`
          };
        } catch (createError) {
          console.error('Error creating attendance:', createError);
          throw createError;
        }
      }

      // Update existing attendance record
      console.log('Updating existing attendance:', attendance._id);
      const updateData = {
        [action]: now
      };

      if (qrCode && action === 'clockIn') {
        updateData.checkInMethod = 'qr-code';
        updateData.qrCodeData = qrCode;
        if (location) {
          updateData.location = location;
        }
      }

      try {
        await app.service('attendance').patch(attendance._id, updateData, { provider: undefined });
        console.log('Attendance updated successfully');
      } catch (patchError) {
        console.error('Error patching attendance:', patchError);
        throw patchError;
      }

      return {
        success: true,
        action,
        time: now,
        message: `Successfully ${this.getActionMessage(action)}`
      };
    },

    async recordHourlyWorkerAttendance(app, worker, companyId, action, now, today, qrCode, location) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find existing timesheet for this week
      const weekStart = this.getWeekStart(today);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let timesheet = null;
      try {
        const result = await app.service('timesheets').find({
          query: {
            worker: worker._id,
            weekStartDate: {
              $gte: weekStart,
              $lt: new Date(weekStart.getTime() + 24 * 60 * 60 * 1000)
            },
            $limit: 1
          },
          provider: undefined
        });

        timesheet = result.data?.[0] || result[0];
      } catch (e) {
        console.log('No existing timesheet found for hourly worker');
      }

      if (!timesheet) {
        // Create new timesheet for the week
        timesheet = await app.service('timesheets').create({
          worker: worker._id,
          company: companyId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          paymentType: worker.paymentType,
          status: 'draft',
        dailyEntries: [{
          date: today,
          [action]: now,
          checkInMethod: qrCode ? 'qr-code' : 'manual',
            qrCodeCheckIn: qrCode ? {
              qrCodeData: qrCode,
              timestamp: now,
              location: location
            } : undefined
          }]
        }, { provider: undefined });

        return {
          success: true,
          action,
          time: now,
          message: `Successfully ${this.getActionMessage(action)}`
        };
      }

      // Update existing timesheet
      const entryIndex = timesheet.dailyEntries?.findIndex(e => {
        const entryDate = new Date(e.date);
        return entryDate >= today && entryDate < tomorrow;
      });

      if (entryIndex >= 0) {
        timesheet.dailyEntries[entryIndex][action] = now;
        if (qrCode && action === 'clockIn') {
          timesheet.dailyEntries[entryIndex].checkInMethod = 'qr-code';
          timesheet.dailyEntries[entryIndex].qrCodeCheckIn = {
            qrCodeData: qrCode,
            timestamp: now,
            location: location
          };
        }
      } else {
        timesheet.dailyEntries.push({
          date: today,
          [action]: now,
          checkInMethod: qrCode ? 'qr-code' : 'manual',
          qrCodeCheckIn: qrCode ? {
            qrCodeData: qrCode,
            timestamp: now,
            location: location
          } : undefined
        });
      }

      await app.service('timesheets').patch(timesheet._id, {
        dailyEntries: timesheet.dailyEntries
      }, { provider: undefined });

      return {
        success: true,
        action,
        time: now,
        message: `Successfully ${this.getActionMessage(action)}`
      };
    },

    getWeekStart(date) {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
      return new Date(d.setDate(diff));
    },

    getActionMessage(action) {
      switch (action) {
        case 'clockIn': return 'clocked in';
        case 'clockOut': return 'clocked out';
        case 'lunchOut': return 'started lunch break';
        case 'lunchIn': return 'ended lunch break';
        default: return action;
      }
    },

    // Get today's status for the worker
    async find(params) {
      const user = params.user;

      if (!user || user.role !== 'worker' || !user.worker) {
        throw new Forbidden('This endpoint is only for workers');
      }

      const workerId = user.worker;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get worker to check payment type
      let worker;
      try {
        worker = await app.service('workers').get(workerId, { provider: undefined });
      } catch (e) {
        console.error('Error fetching worker:', e);
      }

      // For monthly workers, check attendance records
      if (worker && worker.paymentType === 'monthly-salary') {
        try {
          const result = await app.service('attendance').find({
            query: {
              worker: workerId,
              date: {
                $gte: today,
                $lt: tomorrow
              },
              $limit: 1
            },
            provider: undefined
          });

          const attendance = result.data?.[0] || result[0];

          if (attendance) {
            return {
              hasCheckedIn: !!attendance.clockIn,
              clockIn: attendance.clockIn || null,
              clockOut: attendance.clockOut || null,
              lunchOut: attendance.lunchOut || null,
              lunchIn: attendance.lunchIn || null,
              checkInMethod: attendance.checkInMethod || null
            };
          }
        } catch (e) {
          console.error('Error fetching attendance:', e);
        }
      } else {
        // For hourly workers, check timesheets
        try {
          const result = await app.service('timesheets').find({
            query: {
              worker: workerId,
              'dailyEntries.date': {
                $gte: today,
                $lt: tomorrow
              },
              $limit: 1
            },
            provider: undefined
          });

          const timesheet = result.data?.[0] || result[0];

          if (timesheet) {
            const todayEntry = timesheet.dailyEntries?.find(e => {
              const entryDate = new Date(e.date);
              return entryDate >= today && entryDate < tomorrow;
            });

            return {
              hasCheckedIn: !!todayEntry?.clockIn,
              clockIn: todayEntry?.clockIn || null,
              clockOut: todayEntry?.clockOut || null,
              lunchOut: todayEntry?.lunchOut || null,
              lunchIn: todayEntry?.lunchIn || null,
              checkInMethod: todayEntry?.checkInMethod || null
            };
          }
        } catch (e) {
          console.error('Error fetching timesheet:', e);
        }
      }

      return {
        hasCheckedIn: false,
        clockIn: null,
        clockOut: null,
        lunchOut: null,
        lunchIn: null,
        checkInMethod: null
      };
    }
  });

  // Add authentication hook
  app.service('worker-checkin').hooks({
    before: {
      all: [authenticate('jwt')]
    }
  });
};

