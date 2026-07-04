const User = require("../models/User");
const Follow = require("../models/Follow");
const fs = require("fs");
const path = require("path");
const MediaService = require("../services/MediaService");

// Upload Avatar Controller
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload."
      });
    }

    // Validate size and extensions
    MediaService.validateFile(req.file, { maxSize: 5 * 1024 * 1024 });

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Replace the avatar
    const oldMedia = user.avatarMetadata || user.avatar;
    const mediaObj = await MediaService.replaceMedia(
      oldMedia,
      req.file.buffer,
      req.file.originalname,
      "codeexpo_avatars",
      { req, width: 250, height: 250, crop: "fill" }
    );

    // Save in DB
    user.avatar = mediaObj.url;
    user.avatarMetadata = mediaObj;
    await user.save();

    // Clean up local temp file if Multer ever writes to disk
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      avatar: user.avatar,
      avatarMetadata: user.avatarMetadata
    });
  } catch (error) {
    // Clean up local temp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload avatar"
    });
  }
};

// Delete Avatar Controller
const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.avatar) {
      return res.status(400).json({
        success: false,
        message: "No avatar to delete."
      });
    }

    // Delete image from local storage or Cloudinary
    await MediaService.deleteMedia(user.avatarMetadata || user.avatar);

    // Clear user avatar fields in database
    user.avatar = "";
    user.avatarMetadata = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully",
      avatar: ""
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete avatar"
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { bio, programmingLanguages } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (bio !== undefined) user.bio = bio;
    if (req.body.location !== undefined) user.location = req.body.location;
    if (programmingLanguages !== undefined) {
      if (Array.isArray(programmingLanguages)) {
        user.programmingLanguages = programmingLanguages;
      } else if (typeof programmingLanguages === "string") {
        user.programmingLanguages = programmingLanguages.split(",").map(l => l.trim()).filter(Boolean);
      }
    }

    await user.save();

    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;
    if (user.followersCount !== followersCount || user.followingCount !== followingCount) {
      await User.updateOne(
        { _id: user._id },
        { followersCount, followingCount }
      );
      user.followersCount = followersCount;
      user.followingCount = followingCount;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        coverBanner: user.coverBanner,
        bio: user.bio,
        programmingLanguages: user.programmingLanguages,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        location: user.location || ""
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile"
    });
  }
};

// Upload Cover Banner Controller
const uploadCoverBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload as cover banner."
      });
    }

    // Validate cover banner file size & types (max 5MB)
    MediaService.validateFile(req.file, { maxSize: 5 * 1024 * 1024 });

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const oldMedia = user.coverBannerMetadata || user.coverBanner;
    const mediaObj = await MediaService.replaceMedia(
      oldMedia,
      req.file.buffer,
      req.file.originalname,
      "codeexpo_banners",
      { req, width: 1200, height: 400, crop: "fill" }
    );

    user.coverBanner = mediaObj.url;
    user.coverBannerMetadata = mediaObj;
    await user.save();

    // Clean up local temp file if Multer ever writes to disk
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      message: "Cover banner updated successfully",
      coverBanner: user.coverBanner,
      coverBannerMetadata: user.coverBannerMetadata
    });
  } catch (error) {
    // Clean up local temp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload cover banner"
    });
  }
};

// Delete Cover Banner Controller
const deleteCoverBanner = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.coverBanner) {
      return res.status(400).json({ success: false, message: "No cover banner to delete." });
    }

    // Delete image from local storage or Cloudinary
    await MediaService.deleteMedia(user.coverBannerMetadata || user.coverBanner);

    user.coverBanner = "";
    user.coverBannerMetadata = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cover banner deleted successfully",
      coverBanner: ""
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete cover banner"
    });
  }
};

module.exports = {
  uploadAvatar,
  deleteAvatar,
  updateProfile,
  uploadCoverBanner,
  deleteCoverBanner
};


