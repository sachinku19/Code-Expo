const mongoose = require("mongoose");

const loginLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    loginTime: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    logoutTime: {
      type: Date,
      default: null,
      index: true
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoginLog", loginLogSchema);
