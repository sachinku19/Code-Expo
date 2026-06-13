const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  fileId: {
    type: String,
    default: null,
    index: true
  },
  versionId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  editedBy: {
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    }
  },
  code: {
    type: String,
    default: ""
  }
}, { timestamps: true });

versionSchema.index({ roomId: 1, fileId: 1, versionId: 1 }, { unique: true });

const Version = mongoose.model("Version", versionSchema);
module.exports = Version;
