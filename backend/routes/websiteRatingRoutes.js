const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const { submitWebsiteRating, getWebsiteRatingInfo } = require("../controllers/websiteRatingControllers");

const router = express.Router();

router.post("/submit", auth_protect, submitWebsiteRating);
router.get("/info", getWebsiteRatingInfo);

module.exports = router;
