const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const admin_protect = require("../middleware/adminMiddleware");
const {
  getTrustSafetyStatus,
  getModerationHistory,
  createAppeal,
  adminGetAppeals,
  adminResolveAppeal
} = require("../controllers/trustSafetyControllers");

const router = express.Router();

// User endpoints
router.get("/status", auth_protect, getTrustSafetyStatus);
router.get("/history", auth_protect, getModerationHistory);
router.post("/appeal", auth_protect, createAppeal);

// Admin endpoints
router.get("/admin/appeals", auth_protect, admin_protect, adminGetAppeals);
router.put("/admin/appeals/:id", auth_protect, admin_protect, adminResolveAppeal);

module.exports = router;
