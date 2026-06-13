const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { handleAIChat } = require("../controllers/aiControllers");

const router = express.Router();

// Optional authorization middleware to identify user if logged in
const optional_auth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    }
  } catch (error) {
    // Fail silently to support public usage
  }
  next();
};

router.post("/chat", optional_auth, handleAIChat);

module.exports = router;
