const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["FEATURE", "UPDATE", "MAINTENANCE", "ANNOUNCEMENT"],
    default: "ANNOUNCEMENT"
  },
  severity: {
    type: String,
    enum: ["INFO", "WARNING", "SUCCESS", "CRITICAL"],
    default: "INFO"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Announcement", announcementSchema);
