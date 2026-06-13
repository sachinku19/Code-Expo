const mongoose = require("mongoose");

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

// Maintain composite unique indexing for relationships
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, follower: 1 });

module.exports = mongoose.model("Follow", followSchema);
