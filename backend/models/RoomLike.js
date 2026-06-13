const mongoose = require("mongoose");

const roomLikeSchema = new mongoose.Schema({
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

// Prevent duplicate likes per user per room
roomLikeSchema.index({ user: 1, room: 1 }, { unique: true });
roomLikeSchema.index({ room: 1 });

module.exports = mongoose.model("RoomLike", roomLikeSchema);
