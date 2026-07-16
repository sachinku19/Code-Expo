const mongoose = require("mongoose");

const personalTaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
  category: {
    type: String,
    enum: ["Study", "Coding", "Personal", "College", "Placement", "Interview", "Other"],
    default: "Other"
  },
  dueDate: {
    type: Date
  },
  reminder: {
    type: Date
  },
  estimatedTime: {
    type: Number, // In hours
    default: 0
  },
  status: {
    type: String,
    enum: ["Todo", "In Progress", "Completed"],
    default: "Todo"
  },
  colorLabel: {
    type: String, // Hex code or string
    default: "#3b82f6"
  },
  tags: [
    {
      type: String,
      trim: true
    }
  ],
  notes: {
    type: String,
    default: ""
  },
  recurring: {
    type: String,
    enum: ["None", "Daily", "Weekly", "Monthly"],
    default: "None"
  },
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
  progress: {
    type: Number, // 0 to 100
    default: 0
  },
  timeSpent: {
    type: Number, // In seconds
    default: 0
  },
  completionTime: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("PersonalTask", personalTaskSchema);
