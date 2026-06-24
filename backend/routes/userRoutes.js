const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { uploadAvatar, deleteAvatar, updateProfile, uploadCoverBanner, deleteCoverBanner } = require("../controllers/userControllers");

const router = express.Router();

// Route: POST /api/users/avatar - Accept image and upload to Cloudinary
router.post("/avatar", auth_protect, upload.single("avatar"), uploadAvatar);

// Route: DELETE /api/users/avatar - Delete current avatar image
router.delete("/avatar", auth_protect, deleteAvatar);

// Route: POST /api/users/cover-banner - Accept cover image and upload to Cloudinary
router.post("/cover-banner", auth_protect, upload.single("coverBanner"), uploadCoverBanner);

// Route: DELETE /api/users/cover-banner - Delete current cover banner image
router.delete("/cover-banner", auth_protect, deleteCoverBanner);

// Route: PUT /api/users/profile - Update user bio and programming languages
router.put("/profile", auth_protect, updateProfile);

module.exports = router;

