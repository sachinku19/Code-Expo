const mongoose = require("mongoose");

const editActivitySchema = new mongoose.Schema({
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
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  lineNumber: {
    type: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const EditActivity = mongoose.model("EditActivity", editActivitySchema);
module.exports = EditActivity;
