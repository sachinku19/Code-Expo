const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const checkUsername = require("../middleware/checkUsername");
const upload = require("../middleware/upload");
const {
  uploadAvatar,
  deleteAvatar,
  updateProfile,
  uploadCoverBanner,
  deleteCoverBanner,
  checkUsernameAvailability,
  setupUsername,
  changeUsername
} = require("../controllers/userControllers");

const router = express.Router();

// Memory rate limiter for check-username endpoint (60 requests per minute per IP)
const checkUsernameRateLimitMap = new Map();
const checkUsernameRateLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'global';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const record = checkUsernameRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count += 1;
  }

  checkUsernameRateLimitMap.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many username availability checks. Please slow down."
    });
  }
  next();
};

// Route: GET /api/users/check-username - Check username availability
router.get("/check-username", checkUsernameRateLimiter, checkUsernameAvailability);

// Route: POST /api/users/setup-username - Set initial username on onboarding
router.post("/setup-username", auth_protect, setupUsername);

// Route: PUT /api/users/change-username - Change username (max once per 30 days)
router.put("/change-username", auth_protect, checkUsername, changeUsername);

// Route: POST /api/users/avatar - Accept image and upload to Cloudinary
router.post("/avatar", auth_protect, checkUsername, upload.single("avatar"), uploadAvatar);

// Route: DELETE /api/users/avatar - Delete current avatar image
router.delete("/avatar", auth_protect, checkUsername, deleteAvatar);

// Route: POST /api/users/cover-banner - Accept cover image and upload to Cloudinary
router.post("/cover-banner", auth_protect, checkUsername, upload.single("coverBanner"), uploadCoverBanner);

// Route: DELETE /api/users/cover-banner - Delete current cover banner image
router.delete("/cover-banner", auth_protect, checkUsername, deleteCoverBanner);

// Route: PUT /api/users/profile - Update user bio and programming languages
router.put("/profile", auth_protect, checkUsername, updateProfile);

module.exports = router;


