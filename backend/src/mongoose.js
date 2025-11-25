const mongoose = require('mongoose');

module.exports = function (app) {
  const mongooseUri = process.env.MONGODB_URI || app.get('mongodb');

  mongoose.connect(mongooseUri).then(() => {
    console.log('Connected to MongoDB');
  }).catch(err => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.Promise = global.Promise;

  app.set('mongooseClient', mongoose);
};

