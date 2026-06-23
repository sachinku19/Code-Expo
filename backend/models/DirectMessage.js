const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: ""
  },
  fileUrl: {
    type: String
  },
  fileType: {
    type: String
  },
  fileName: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

directMessageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
