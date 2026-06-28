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
  video: {
    type: String,
    default: ""
  },
  videoMetadata: {
    type: MediaSchema,
    default: null
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  commentsLocked: {
    type: Boolean,
    default: false
  },
  likesDisabled: {
    type: Boolean,
    default: false
  },
  isSensitive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["active", "flagged", "hidden", "deleted"],
    default: "active"
  },
  legalCase: {
    caseId: {
      type: String,
      default: ""
    },
    infringementType: {
      type: String,
      enum: ["None", "DMCA Takedown Request", "Copyright Infringement", "TOS Violation", "Hate Speech / Harassment", "Other Legal Claim"],
      default: "None"
    },
    caseStatus: {
      type: String,
      enum: ["Open", "Under Review", "Compliance Action Taken", "Dismissed", "Resolved"],
      default: "Resolved"
    },
    notes: {
      type: String,
      default: ""
    },
    actionTakenBy: {
      type: String,
      default: ""
    },
    actionDate: {
      type: Date
    }
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
