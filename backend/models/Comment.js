const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  taskType: {
    type: String,
    enum: ["PersonalTask", "RoomTask"],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
    index: true
  },
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  reactions: [
    {
      emoji: {
        type: String,
        required: true
      },
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        }
      ]
    }
  ],
  codeSnippet: {
    code: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      default: "javascript"
    }
  }
}, { timestamps: true });

module.exports = mongoose.model("Comment", commentSchema);
