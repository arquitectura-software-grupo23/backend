const mongoose = require('mongoose');
// const { v4: uuidv4 } = require('uuid');
const { v4 } = require('./uuidc');

const requestSchema = new mongoose.Schema(
  {
    request_id: { type: String, required: true, default: v4() },
    group_id: String,
    symbol: String,
    deposit_token: String,
    quantity: Number,
    seller: Number,
    user_id: String,
    user_location: String,
    user_ip: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Request', requestSchema);
