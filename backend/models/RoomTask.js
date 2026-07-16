const mongoose = require("mongoose");

const roomTaskSchema = new mongoose.Schema({
  roomId: {
    type: String, // Matches Room's roomId (string identifier)
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["Todo", "In Progress", "Review", "Testing", "Completed", "Blocked"],
    default: "Todo"
  },
  dueDate: {
    type: Date
  },
  estimatedTime: {
    type: Number, // In hours
    default: 0
  },
  assignedMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  isAssignedToAll: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  labels: [
    {
      type: String,
      trim: true
    }
  ],
  attachments: [
    {
      url: String,
      publicId: String,
      originalFilename: String,
      size: Number,
      format: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  timeSpent: {
    type: Number, // In seconds
    default: 0
  },
  completionTime: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("RoomTask", roomTaskSchema);
