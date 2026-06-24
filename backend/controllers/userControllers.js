const User = require("../models/User");
const Follow = require("../models/Follow");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// Helper to extract Cloudinary public_id from secure URL
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return null;
    const pathAfterUpload = parts[1];
    const pathParts = pathAfterUpload.split("/");
    // If first part is version prefix (starts with 'v'), skip it
    const startIndex = pathParts[0].startsWith("v") ? 1 : 0;
    const filenameWithExtension = pathParts.slice(startIndex).join("/");
    // Remove the extension to get the public_id
    const publicId = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf("."));
    return publicId;
  } catch (err) {
    console.error("Failed to parse Cloudinary URL public_id:", err);
    return null;
  }
};

// Upload Avatar Controller
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image file to upload."
      });
    }

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                   process.env.CLOUDINARY_API_KEY &&
                                   process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      // Local storage fallback for development
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `avatar-${req.user._id}-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);

      // Save buffer locally
      fs.writeFileSync(filePath, req.file.buffer);

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Cleanup old local file if existed
      if (user.avatar && user.avatar.includes("/uploads/")) {
        const oldFilename = user.avatar.split("/uploads/")[1];
        const oldFilePath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (unlinkErr) {
            console.error("Failed to clean up old local avatar file:", unlinkErr.message);
          }
        }
      }

      // Update Database URL
      const localUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
      user.avatar = localUrl;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Avatar updated successfully (local backup active)",
        avatar: user.avatar
      });
    }

    // Upload buffer directly to Cloudinary
    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: "codeexpo_avatars",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"]
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });
    };

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    // Retrieve user and clean up old avatar from Cloudinary if it exists
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.avatar) {
      if (user.avatar.includes("/uploads/")) {
        // Cleanup old local file if migrating to Cloudinary
        const oldFilename = user.avatar.split("/uploads/")[1];
        const oldFilePath = path.join(__dirname, "../uploads", oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (unlinkErr) {
            console.error("Failed to clean up old local avatar file:", unlinkErr.message);
          }
        }
      } else {
        const oldPublicId = getPublicIdFromUrl(user.avatar);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId);
            console.log(`Deleted old avatar from Cloudinary: ${oldPublicId}`);
          } catch (destroyErr) {
            console.error("Failed to delete old avatar from Cloudinary:", destroyErr.message);
          }
        }
      }
    }

    // Update database avatar url
    user.avatar = cloudinaryResult.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      avatar: user.avatar
    });
  } catch (error) {
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
    if (user.avatar.includes("/uploads/")) {
      const filename = user.avatar.split("/uploads/")[1];
      const filePath = path.join(__dirname, "../uploads", filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted local avatar file: ${filename}`);
        } catch (unlinkErr) {
          console.error("Failed to delete local file:", unlinkErr.message);
        }
      }
    } else {
      const publicId = getPublicIdFromUrl(user.avatar);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted avatar from Cloudinary: ${publicId}`);
        } catch (destroyErr) {
          console.error("Failed to delete avatar from Cloudinary:", destroyErr.message);
        }
      }
    }

    // Clear user avatar field in database
    user.avatar = "";
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
    if (programmingLanguages !== undefined) {
      if (Array.isArray(programmingLanguages)) {
        user.programmingLanguages = programmingLanguages;
      } else if (typeof programmingLanguages === "string") {
        user.programmingLanguages = programmingLanguages.split(",").map(l => l.trim()).filter(Boolean);
      }
    }

    await user.save();

    const followersCount = await Follow.countDocuments({ following: user._id });
    const followingCount = await Follow.countDocuments({ follower: user._id });
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
        followingCount: user.followingCount
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

    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                   process.env.CLOUDINARY_API_KEY &&
                                   process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      // Local storage fallback
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `banner-${req.user._id}-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, req.file.buffer);

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Cleanup old local banner
      if (user.coverBanner && user.coverBanner.includes("/uploads/")) {
        const oldFilename = user.coverBanner.split("/uploads/")[1];
        const oldFilePath = path.join(uploadsDir, oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (unlinkErr) {
            console.error("Failed to clean up old local banner file:", unlinkErr.message);
          }
        }
      }

      const localUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
      user.coverBanner = localUrl;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Cover banner updated successfully (local backup)",
        coverBanner: user.coverBanner
      });
    }

    // Upload to Cloudinary
    const uploadToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { 
            folder: "codeexpo_banners",
            resource_type: "image",
            allowed_formats: ["jpg", "jpeg", "png", "webp"]
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(fileBuffer);
      });
    };

    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.coverBanner) {
      if (user.coverBanner.includes("/uploads/")) {
        const oldFilename = user.coverBanner.split("/uploads/")[1];
        const oldFilePath = path.join(__dirname, "../uploads", oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (unlinkErr) {
            console.error("Failed to clean up old local banner file:", unlinkErr.message);
          }
        }
      } else {
        const oldPublicId = getPublicIdFromUrl(user.coverBanner);
        if (oldPublicId) {
          try {
            await cloudinary.uploader.destroy(oldPublicId);
          } catch (destroyErr) {
            console.error("Failed to delete old banner from Cloudinary:", destroyErr.message);
          }
        }
      }
    }

    user.coverBanner = cloudinaryResult.secure_url;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Cover banner updated successfully",
      coverBanner: user.coverBanner
    });
  } catch (error) {
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

    if (user.coverBanner.includes("/uploads/")) {
      const filename = user.coverBanner.split("/uploads/")[1];
      const filePath = path.join(__dirname, "../uploads", filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error("Failed to delete local file:", unlinkErr.message);
        }
      }
    } else {
      const publicId = getPublicIdFromUrl(user.coverBanner);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (destroyErr) {
          console.error("Failed to delete banner from Cloudinary:", destroyErr.message);
        }
      }
    }

    user.coverBanner = "";
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


