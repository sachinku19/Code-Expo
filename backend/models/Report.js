const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ["Spam", "Harassment", "Hate Speech", "Fraud / Scam", "Inappropriate Content", "TOS Violation", "Other"]
  },
  details: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  evidenceType: {
    type: String,
    required: true,
    enum: ["ROOM", "MESSAGE", "POST", "COMMENT", "PROFILE", "OTHER"]
  },
  evidenceId: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["pending", "resolved", "dismissed"],
    default: "pending"
  },
  resolutionNotes: {
    type: String,
    default: ""
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Prevent a user from spamming multiple reports for the same user-evidence combination in quick succession
reportSchema.index({ reporter: 1, reportedUser: 1, evidenceType: 1, evidenceId: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
