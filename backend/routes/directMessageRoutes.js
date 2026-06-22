const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const {
  getConversations,
  getChatHistory,
  sendDirectMessage
} = require("../controllers/directMessageControllers");

const router = express.Router();

router.get("/conversations", auth_protect, getConversations);
router.get("/chat/:userId", auth_protect, getChatHistory);
router.post("/send", auth_protect, sendDirectMessage);

module.exports = router;
