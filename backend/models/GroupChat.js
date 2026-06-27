const mongoose = require("mongoose");
const MediaSchema = require("./Media");

const groupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ""
  },
  avatarMetadata: {
    type: MediaSchema,
    default: null
  },
  bio: {
    type: String,
    trim: true,
    default: ""
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  isGroup: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("GroupChat", groupChatSchema);
