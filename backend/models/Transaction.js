const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  plan: {
    type: String,
    enum: ["Developer Pro", "Elite Sponsor"],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    default: "pending"
  },
  paymentMethodType: {
    type: String,
    enum: ["card", "upi"],
    default: "card"
  },
  upiId: {
    type: String,
    default: ""
  },
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  cardBrand: {
    type: String,
    default: "Visa"
  },
  cardLast4: {
    type: String,
    default: "4242"
  },
  billingEmail: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
