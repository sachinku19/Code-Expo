const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["FOLLOW", "LIKE", "BOOKMARK", "COMMENT", "JOIN", "MENTION"],
    required: true
  },
  category: {
    type: String,
    enum: ["SOCIAL", "ROOMS", "COLLABORATION", "SYSTEM"],
    required: true
  },
  targetRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
