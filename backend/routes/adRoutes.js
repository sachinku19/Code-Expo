const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const admin_protect = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");
const {
  createAd,
  getAdsAdmin,
  toggleAdStatus,
  deleteAd,
  getActiveAds
} = require("../controllers/adControllers");

const router = express.Router();

// User accessible: Get active ads
router.get("/active", auth_protect, getActiveAds);

// Admin restricted: Manage advertisements
router.post("/", auth_protect, admin_protect, upload.single("image"), createAd);
router.get("/", auth_protect, admin_protect, getAdsAdmin);
router.put("/:id/toggle", auth_protect, admin_protect, toggleAdStatus);
router.delete("/:id", auth_protect, admin_protect, deleteAd);

module.exports = router;
