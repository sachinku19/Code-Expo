const mongoose = require("mongoose");

const workspaceItemSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["file", "folder"],
      required: true
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkspaceItem",
      default: null,
      index: true
    },
    content: {
      type: String,
      default: ""
    },
    language: {
      type: String,
      default: "javascript"
    },
    isEntryPoint: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    yjsState: {
      type: Buffer,
      default: null
    }
  },
  { timestamps: true }
);

// Prevent duplicate names under the same folder inside a room
workspaceItemSchema.index({ roomId: 1, parentId: 1, name: 1 }, { unique: true });

const WorkspaceItem = mongoose.model("WorkspaceItem", workspaceItemSchema);

module.exports = WorkspaceItem;
