const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const admin_protect = require("../middleware/adminMiddleware");
const {
  createAnnouncement,
  getAnnouncementsAdmin,
  deleteAnnouncement,
  getActiveAnnouncements
} = require("../controllers/announcementControllers");

const router = express.Router();

// User accessible: Get active system alerts
router.get("/active", auth_protect, getActiveAnnouncements);

// Admin restricted: Manage announcements
router.post("/", auth_protect, admin_protect, createAnnouncement);
router.get("/", auth_protect, admin_protect, getAnnouncementsAdmin);
router.delete("/:id", auth_protect, admin_protect, deleteAnnouncement);

module.exports = router;
