const mongoose = require('mongoose');

const userInfoSchema = new mongoose.Schema({
  userID: String,
  wallet: Number,
  mail: String,
  userName: String,
  isAdmin: Boolean,
}, { timestamps: true });

module.exports = mongoose.model('UserInfo', userInfoSchema);
