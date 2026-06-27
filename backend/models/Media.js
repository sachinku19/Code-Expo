const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    default: ""
  },
  originalFilename: {
    type: String,
    default: ""
  },
  folder: {
    type: String,
    default: ""
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  format: {
    type: String
  },
  size: {
    type: Number
  },
  resourceType: {
    type: String,
    default: "image"
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

module.exports = MediaSchema;
