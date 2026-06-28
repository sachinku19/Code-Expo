const mongoose = require("mongoose");

const ticketMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: "General"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  attachments: [{
    type: String
  }],
  status: {
    type: String,
    enum: ["open", "under-review", "waiting-for-user", "resolved", "closed"],
    default: "open"
  },
  messages: [ticketMessageSchema]
}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
