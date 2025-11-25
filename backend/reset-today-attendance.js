const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/payroll')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Timesheet = mongoose.model('Timesheet', new mongoose.Schema({}, { strict: false }), 'timesheets');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Removing all daily entries for today:', today.toDateString());
    
    const result = await Timesheet.updateMany(
      {},
      { 
        $pull: { 
          dailyEntries: { 
            date: { 
              $gte: today 
            } 
          } 
        } 
      }
    );
    
    console.log('Modified timesheets:', result.modifiedCount);
    console.log('Today\'s attendance has been reset!');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });

