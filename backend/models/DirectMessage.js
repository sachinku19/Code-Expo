const mongoose = require("mongoose");
const MediaSchema = require("./Media");

const directMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false
  },
  groupChat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupChat"
  },
  message: {
    type: String,
    trim: true,
    default: ""
  },
  fileUrl: {
    type: String
  },
  fileMetadata: {
    type: MediaSchema,
    default: null
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
directMessageSchema.index({ groupChat: 1, createdAt: 1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
