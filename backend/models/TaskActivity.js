const mongoose = require("mongoose");

const taskActivitySchema = new mongoose.Schema({
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
  action: {
    type: String,
    required: true
    // created, assigned, unassigned, status_changed, checklist_updated, comment_added, completed, deleted, timer_started, timer_paused, timer_finished
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model("TaskActivity", taskActivitySchema);
