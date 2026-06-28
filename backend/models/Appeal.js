const mongoose = require("mongoose");

const appealSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  moderationAction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ModerationAction",
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    default: "",
    trim: true
  },
  attachment: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  adminResponse: {
    type: String,
    default: "",
    trim: true
  },
  resolutionDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Appeal", appealSchema);
