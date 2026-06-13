const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  username: {
    type: String,
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room"
  },
  roomTitle: {
    type: String
  },
  action: {
    type: String,
    required: true
  },
  activityType: {
    type: String
  },
  points: {
    type: Number,
    default: 1
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Activity", activitySchema);
