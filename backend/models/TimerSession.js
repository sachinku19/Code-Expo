const mongoose = require("mongoose");

const timerSessionSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  taskType: {
    type: String,
    enum: ["PersonalTask", "RoomTask"],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // duration in seconds of this session
    default: 0
  },
  isRunning: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("TimerSession", timerSessionSchema);
