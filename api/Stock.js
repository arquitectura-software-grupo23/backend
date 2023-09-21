const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: String,
  shortName: String,
  price: Number,
  currency: String,
  source: String,
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);
