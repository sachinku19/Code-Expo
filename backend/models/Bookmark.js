const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  }
}, { timestamps: true });

// Prevent duplicate bookmarks per user per room
bookmarkSchema.index({ user: 1, room: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
