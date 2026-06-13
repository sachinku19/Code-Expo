const mongoose = require("mongoose");

const lineOwnershipSchema = new mongoose.Schema({
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
  lines: [
    {
      lineNumber: {
        type: Number,
        required: true
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
      editedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, { timestamps: true });

// Prevent duplicate entries under the same roomId + fileId
lineOwnershipSchema.index({ roomId: 1, fileId: 1 }, { unique: true });

const LineOwnership = mongoose.model("LineOwnership", lineOwnershipSchema);
module.exports = LineOwnership;
