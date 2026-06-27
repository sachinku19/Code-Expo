const mongoose = require("mongoose");
const MediaSchema = require("./Media");

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  imageMetadata: {
    type: MediaSchema,
    default: null
  },
  redirectUrl: {
    type: String,
    default: ""
  },
  isActive: {
    type: Boolean,
    default: true
  },
  format: {
    type: String,
    enum: ["SIDEBAR", "POPUP"],
    default: "SIDEBAR"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Ad", adSchema);
