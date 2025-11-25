const mongoose = require('mongoose');

const gazettedHolidaySchema = new mongoose.Schema({
  // Company Reference (Multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'companies',
    required: true,
    index: true
  },
  
  // Holiday Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  
  // Holiday Type
  type: {
    type: String,
    enum: ['public', 'company', 'state-specific'],
    default: 'public'
  },
  state: {
    type: String,
    trim: true
  },
  
  // Configuration
  isPaid: {
    type: Boolean,
    default: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  // Description
  description: String,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
}, {
  timestamps: true
});

// Indexes
gazettedHolidaySchema.index({ company: 1, date: 1 });
gazettedHolidaySchema.index({ company: 1, year: 1 });
gazettedHolidaySchema.index({ date: 1 });

// Statics
gazettedHolidaySchema.statics.getHolidaysForDateRange = function(companyId, startDate, endDate) {
  return this.find({
    company: companyId,
    date: { $gte: startDate, $lte: endDate },
    isActive: true
  }).sort({ date: 1 });
};

gazettedHolidaySchema.statics.isHoliday = async function(companyId, date) {
  const holiday = await this.findOne({
    company: companyId,
    date: {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999))
    },
    isActive: true
  });
  return !!holiday;
};

gazettedHolidaySchema.statics.getWorkingDays = async function(companyId, startDate, endDate) {
  const holidays = await this.getHolidaysForDateRange(companyId, startDate, endDate);
  const holidayDates = new Set(holidays.map(h => h.date.toDateString()));
  
  let workingDays = 0;
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    const isHoliday = holidayDates.has(currentDate.toDateString());
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

const GazettedHoliday = mongoose.model('gazetted-holidays', gazettedHolidaySchema);

module.exports = GazettedHoliday;

