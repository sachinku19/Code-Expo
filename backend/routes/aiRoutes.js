const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const { aiRateLimiter } = require("../middleware/rateLimiter");
const { validateAIRequest } = require("../validators/aiValidator");
const {
  handleAIChat,
  handleExplain,
  handleFix,
  handleOptimize,
  handleReview,
  handleGenerateTests,
  handleDocumentation,
  handleConvertLanguage,
  getRoomAIHistory,
  clearRoomAIHistory
} = require("../controllers/aiControllers");

const router = express.Router();

// AI endpoints with JWT protection, Rate Limiting, and Body Validation
router.post("/chat", auth_protect, aiRateLimiter, validateAIRequest, handleAIChat);
router.post("/explain", auth_protect, aiRateLimiter, validateAIRequest, handleExplain);
router.post("/fix", auth_protect, aiRateLimiter, validateAIRequest, handleFix);
router.post("/optimize", auth_protect, aiRateLimiter, validateAIRequest, handleOptimize);
router.post("/review", auth_protect, aiRateLimiter, validateAIRequest, handleReview);
router.post("/generate-tests", auth_protect, aiRateLimiter, validateAIRequest, handleGenerateTests);
router.post("/documentation", auth_protect, aiRateLimiter, validateAIRequest, handleDocumentation);
router.post("/convert-language", auth_protect, aiRateLimiter, validateAIRequest, handleConvertLanguage);

// Room AI History Endpoints
router.get("/history/:roomId", auth_protect, getRoomAIHistory);
router.delete("/history/:roomId", auth_protect, clearRoomAIHistory);

module.exports = router;
