const mongoose = require("mongoose");

const deletedLogSchema = new mongoose.Schema({
  name: String,
  phone: String,
  reason: { type: String, required: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedByName: String,
  deletedAt: { type: Date, default: Date.now },
  originalData: { type: Object }
}, { strict: false });

module.exports = mongoose.model("DeletedLog", deletedLogSchema);
