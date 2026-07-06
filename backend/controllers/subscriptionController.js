const User = require("../models/User");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");

// Purchase subscription plan (Mock Payment Processing)
exports.purchaseSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { plan, paymentDetails } = req.body;

    if (!plan || !["Developer Pro", "Elite Sponsor"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid subscription plan selected." });
    }

    if (!paymentDetails || !paymentDetails.billingEmail) {
      return res.status(400).json({ success: false, message: "Billing email is required." });
    }

    const paymentMethodType = paymentDetails.paymentMethodType || "card";
    let last4 = "4242";
    let brand = "Visa";
    let upiId = "";
    let paymentMethodStr = "";

    if (paymentMethodType === "card") {
      if (!paymentDetails.cardNumber) {
        return res.status(400).json({ success: false, message: "Card number is required." });
      }
      last4 = paymentDetails.cardNumber.slice(-4) || "4242";
      brand = paymentDetails.cardBrand || "Visa";
      paymentMethodStr = `${brand} ending in ${last4}`;
    } else if (paymentMethodType === "upi") {
      if (!paymentDetails.upiId) {
        return res.status(400).json({ success: false, message: "UPI ID is required." });
      }
      upiId = paymentDetails.upiId;
      brand = "UPI";
      last4 = upiId.slice(-4) || "UPI";
      paymentMethodStr = `UPI: ${upiId}`;
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment method type." });
    }

    const price = plan === "Developer Pro" ? 9.99 : 29.99;
    const transactionId = "TXN_" + crypto.randomBytes(8).toString("hex").toUpperCase();

    // Create billing transaction log with pending status
    const transaction = await Transaction.create({
      user: userId,
      plan,
      amount: price,
      status: "pending",
      transactionId,
      cardBrand: brand,
      cardLast4: last4,
      billingEmail: paymentDetails.billingEmail,
      paymentMethodType,
      upiId
    });

    // Update User's subscription details, set status to pending
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.subscription = {
      plan,
      status: "pending",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day billing period
      paymentMethod: paymentMethodStr,
      amountPaid: price,
      transactionId
    };

    await user.save();

    // Emit live real-time notification
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("subscription:updated", { userId: user._id, plan, status: "pending" });
      }
    } catch (e) {
      console.error("Failed to emit subscription:updated event:", e.message);
    }

    res.status(200).json({
      success: true,
      message: `Subscription request for ${plan} submitted. Waiting for admin approval.`,
      subscription: user.subscription,
      transaction
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get personal subscription details
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("subscription");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({ success: true, subscription: user.subscription || { plan: "Free", status: "inactive" } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get personal billing invoice history
exports.getBillingHistory = async (req, res) => {
  try {
    const history = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
