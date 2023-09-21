const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  userID: String,
  wallet: Number,
}, { timestamps: true });

module.exports = mongoose.model('Stock', userInfoSchema)
