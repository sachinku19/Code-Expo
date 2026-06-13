const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const {
  getLineOwnership,
  getVersionHistory,
  getEditActivities,
  restoreVersion
} = require("../controllers/collaborationControllers");

const router = express.Router();

router.get("/:roomId/ownership", auth_protect, getLineOwnership);
router.get("/:roomId/versions", auth_protect, getVersionHistory);
router.get("/:roomId/activities", auth_protect, getEditActivities);
router.post("/:roomId/restore", auth_protect, restoreVersion);

module.exports = router;
