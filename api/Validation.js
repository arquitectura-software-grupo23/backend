const mongoose = require("mongoose");

const validationSchema = new mongoose.Schema(
  {
    request_id: String,
    group_id: String,
    seller: Number,
    valid: Boolean,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Validation", validationSchema);
