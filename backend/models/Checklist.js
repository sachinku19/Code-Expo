const mongoose = require("mongoose");

const checklistSchema = new mongoose.Schema({
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
  items: [
    {
      title: {
        type: String,
        required: true,
        trim: true
      },
      isCompleted: {
        type: Boolean,
        default: false
      },
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      assignedTo: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Checklist", checklistSchema);
