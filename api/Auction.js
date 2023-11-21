const mongoose = require('mongoose');
const { v4 } = require('./uuidc');

const auctionSchema = new mongoose.Schema({
  auction_id: { type: String, required: true, default: v4() },
  proposal_id: String,
  stock_id: Number,
  quantity: String,
  group_id: String,
  type: String,
}, { timestamps: true });

module.exports = mongoose.model('Auction', auctionSchema);
