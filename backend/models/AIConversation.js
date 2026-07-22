const mongoose = require("mongoose");

const aiConversationSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    prompt: {
      type: String,
      required: true,
      trim: true
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    actionType: {
      type: String,
      enum: [
        "chat",
        "explain",
        "fix",
        "optimize",
        "review",
        "generate-tests",
        "documentation",
        "convert-language",
        "generate-code",
        "generate-comments"
      ],
      default: "chat"
    },
    language: {
      type: String,
      default: "javascript"
    },
    codeSnippet: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Index for fast query of room history by creation date
aiConversationSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model("AIConversation", aiConversationSchema);
