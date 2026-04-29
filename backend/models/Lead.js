const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  pincode: { type: String, required: true },
  district: { type: String },
  state: { type: String },
  areaType: { type: String, enum: ["City", "Village"], default: "City" },
  status: { type: String, enum: ["pending", "tracked"], default: "pending" },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index to automatically delete documents after 14 days (1209600 seconds)
leadSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1209600 });

module.exports = mongoose.model("Lead", leadSchema);
