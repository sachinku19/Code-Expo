const mongoose = require("mongoose");

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
