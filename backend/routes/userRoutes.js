const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { uploadAvatar, deleteAvatar, updateProfile } = require("../controllers/userControllers");

const router = express.Router();

// Route: POST /api/users/avatar - Accept image and upload to Cloudinary
router.post("/avatar", auth_protect, upload.single("avatar"), uploadAvatar);

// Route: DELETE /api/users/avatar - Delete current avatar image
router.delete("/avatar", auth_protect, deleteAvatar);

// Route: PUT /api/users/profile - Update user bio and programming languages
router.put("/profile", auth_protect, updateProfile);

module.exports = router;

