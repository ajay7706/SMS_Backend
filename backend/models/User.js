const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "agent", "user"],
    default: "user",
  },
  totalLeads: { type: Number, default: 0 },
  totalTricked: { type: Number, default: 0 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// TTL index to automatically delete documents after 24 hours (86400 seconds)
userSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("User", userSchema);
