const express = require("express");
const auth_protect = require("../middleware/authMiddleware");

const {
  getUnifiedStats,
  connectPlatform,
  refreshAllPlatforms,
  disconnectPlatform,
  getLeaderboard,
  shareProfile
} = require("../controllers/dashboard.controller");

// Specific platform controllers mapping
const leetcodeController = require("../controllers/leetcode.controller");
const codeforcesController = require("../controllers/codeforces.controller");
const codechefController = require("../controllers/codechef.controller");
const hackerrankController = require("../controllers/hackerrank.controller");
const atcoderController = require("../controllers/atcoder.controller");

const router = express.Router();

// General unified endpoints
router.get("/dashboard", auth_protect, getUnifiedStats);
router.post("/connect", auth_protect, connectPlatform);
router.post("/refresh", auth_protect, refreshAllPlatforms);
router.delete("/disconnect", auth_protect, disconnectPlatform);
router.get("/leaderboard", auth_protect, getLeaderboard);
router.post("/share", auth_protect, shareProfile);

// Specific REST endpoints
router.post("/leetcode/connect", auth_protect, leetcodeController.connect);
router.post("/leetcode/refresh", auth_protect, leetcodeController.refresh);
router.delete("/leetcode/disconnect", auth_protect, leetcodeController.disconnect);

router.post("/codeforces/connect", auth_protect, codeforcesController.connect);
router.post("/codeforces/refresh", auth_protect, codeforcesController.refresh);
router.delete("/codeforces/disconnect", auth_protect, codeforcesController.disconnect);

router.post("/codechef/connect", auth_protect, codechefController.connect);
router.post("/codechef/refresh", auth_protect, codechefController.refresh);
router.delete("/codechef/disconnect", auth_protect, codechefController.disconnect);


router.post("/hackerrank/connect", auth_protect, hackerrankController.connect);
router.post("/hackerrank/refresh", auth_protect, hackerrankController.refresh);
router.delete("/hackerrank/disconnect", auth_protect, hackerrankController.disconnect);

router.post("/atcoder/connect", auth_protect, atcoderController.connect);
router.post("/atcoder/refresh", auth_protect, atcoderController.refresh);
router.delete("/atcoder/disconnect", auth_protect, atcoderController.disconnect);

module.exports = router;
