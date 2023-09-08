const mongoose = require('mongoose');

const latestStockSchema = new mongoose.Schema({
  symbol: { type: String },
  shortName: String,
  price: Number,
  currency: String,
  source: String,
}, { timestamps: true });

module.exports = mongoose.model('LatestStock', latestStockSchema);
