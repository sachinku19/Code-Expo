const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const { purchaseSubscription, getSubscriptionStatus, getBillingHistory } = require("../controllers/subscriptionController");

const router = express.Router();

// Route: POST /api/subscription/purchase - Purchase a plan
router.post("/purchase", auth_protect, purchaseSubscription);

// Route: GET /api/subscription/status - Get subscription status
router.get("/status", auth_protect, getSubscriptionStatus);

// Route: GET /api/subscription/history - Get billing transactions history
router.get("/history", auth_protect, getBillingHistory);

module.exports = router;
