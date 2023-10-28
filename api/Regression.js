const mongoose = require('mongoose');

const dataPointSchema = new mongoose.Schema({
  timestamp: Number,
  value: Number
}, { _id: false });


const regressionResultSchema = new mongoose.Schema({
  jobId: String,
  userId: String,
  symbol: String,
  originalDataset: [dataPointSchema],
  projections: [dataPointSchema],      
}, { timestamps: true });

module.exports = mongoose.model('RegressionResult', regressionResultSchema);
