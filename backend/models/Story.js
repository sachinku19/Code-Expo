const mongoose = require("mongoose");
const MediaSchema = require("./Media");

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ""
  },
  text: {
    type: String,
    default: "",
    trim: true
  },
  mediaUrl: {
    type: String,
    default: ""
  },
  mediaMetadata: {
    type: MediaSchema,
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    username: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ""
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ["active", "hidden"],
    default: "active"
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Expire in 24 hours (86400 seconds)
  }
});

module.exports = mongoose.model("Story", storySchema);
