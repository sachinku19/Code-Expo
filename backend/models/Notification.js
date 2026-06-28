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
    enum: ["FOLLOW", "LIKE", "BOOKMARK", "COMMENT", "JOIN", "MENTION", "INVITE", "MODERATION_ACTION", "APPEAL_STATUS", "TICKET_UPDATE"],
    required: true
  },
  category: {
    type: String,
    enum: ["SOCIAL", "ROOMS", "COLLABORATION", "SYSTEM", "MODERATION"],
    required: true
  },
  targetRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },
  targetPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  },
  appeal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appeal"
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket"
  },
  message: {
    type: String,
    default: ""
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
