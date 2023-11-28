const mongoose = require('mongoose');
const { v4 } = require('./uuidc');

const auctionSchema = new mongoose.Schema({
  auction_id: { type: String, required: true, default: v4() },
  proposal_id: String,
  stock_id: String,
  quantity: Number,
  group_id: Number,
  type: String,
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
