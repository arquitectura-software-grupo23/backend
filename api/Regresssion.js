const mongoose = require('mongoose');

const regressionResultSchema = new mongoose.Schema({
  jobId: String,
  userId: String,
  originalDataset: [{
    timestamp: Number,
    value: Number
  }],
  projections: [{
    timestamp: Number,
    value: Number
  }],
}, { timestamps: true });

module.exports = mongoose.model('RegressionResult', regressionResultSchema);
