const mongoose = require("mongoose");
const MediaSchema = require("./Media");

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  techStack: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: ""
  },
  imageMetadata: {
    type: MediaSchema,
    default: null
  },
  images: {
    type: [String],
    default: []
  },
  imagesMetadata: {
    type: [MediaSchema],
    default: []
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
  }]
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
