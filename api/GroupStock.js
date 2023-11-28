const mongoose = require('mongoose');

const groupStockSchema = new mongoose.Schema({
  symbol: { type: String },
  amount: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('GroupStock', groupStockSchema);
