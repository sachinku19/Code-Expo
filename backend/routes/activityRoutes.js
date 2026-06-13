const express = require("express");
const { getActivityFeed, getStats } = require("../controllers/activityControllers");
const auth_protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", auth_protect, getActivityFeed);
router.get("/stats", auth_protect, getStats);

module.exports = router;
