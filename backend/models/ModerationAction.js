const mongoose = require("mongoose");

const moderationActionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    enum: [
      "Post Hidden",
      "Post Deleted",
      "Post Restored",
      "Post Flagged",
      "Sensitive Content",
      "Copyright Notice",
      "Spam Detection",
      "Warning Issued",
      "Comment Disabled",
      "Likes Disabled",
      "Temporary Restriction",
      "Suspension",
      "Ban",
      "Account Reactivated"
    ]
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  moderator: {
    type: String,
    default: "System"
  },
  currentStatus: {
    type: String,
    enum: ["Active", "Reversed", "Appealed"],
    default: "Active"
  },
  resolutionStatus: {
    type: String,
    enum: ["Resolved", "Pending Appeal", "No Action Needed"],
    default: "No Action Needed"
  }
}, { timestamps: true });

module.exports = mongoose.model("ModerationAction", moderationActionSchema);
