const Ad = require("../models/Ad");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// 1. Create Ad (Admin only)
const createAd = async (req, res) => {
  try {
    const { title, redirectUrl, format } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Ad title is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Ad banner image is required." });
    }

    let imageUrl = "";
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                   process.env.CLOUDINARY_API_KEY &&
                                   process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      // Local fallback
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `ad-${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    } else {
      // Upload directly to Cloudinary
      const uploadToCloudinary = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "codeexpo_ads",
              resource_type: "image"
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        });
      };
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    const ad = new Ad({
      title,
      imageUrl,
      redirectUrl: redirectUrl || "",
      format: format || "SIDEBAR",
      createdBy: req.user._id
    });

    await ad.save();

    // Broadcast Socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("ad:created", ad);
    }

    res.status(201).json({
      success: true,
      message: "Advertisement created and uploaded successfully.",
      ad
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to create ad." });
  }
};

// 2. Get all Ads for admin panel (Admin only)
const getAdsAdmin = async (req, res) => {
  try {
    const ads = await Ad.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, ads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch ads." });
  }
};

// 3. Toggle Ad status (Admin only)
const toggleAdStatus = async (req, res) => {
  try {
    const adId = req.params.id;
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found." });
    }
    ad.isActive = !ad.isActive;
    await ad.save();

    // Broadcast Socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("ad:toggled", { id: adId, isActive: ad.isActive });
    }

    res.status(200).json({
      success: true,
      message: `Ad status updated to ${ad.isActive ? "ACTIVE" : "INACTIVE"}.`,
      ad
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to toggle ad status." });
  }
};

// 4. Delete Ad (Admin only)
const deleteAd = async (req, res) => {
  try {
    const adId = req.params.id;
    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found." });
    }

    // Clean up file if local
    if (ad.imageUrl && ad.imageUrl.includes("/uploads/")) {
      const filename = ad.imageUrl.split("/uploads/")[1];
      const filePath = path.join(__dirname, "../uploads", filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error("Failed to delete local ad file:", unlinkErr.message);
        }
      }
    } else if (ad.imageUrl && ad.imageUrl.includes("cloudinary.com")) {
      // Clean up Cloudinary asset
      const parts = ad.imageUrl.split("/upload/");
      if (parts.length >= 2) {
        const pathAfterUpload = parts[1];
        const pathParts = pathAfterUpload.split("/");
        const startIndex = pathParts[0].startsWith("v") ? 1 : 0;
        const filenameWithExtension = pathParts.slice(startIndex).join("/");
        const publicId = filenameWithExtension.substring(0, filenameWithExtension.lastIndexOf("."));
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (cloudErr) {
          console.error("Failed to delete Cloudinary ad file:", cloudErr.message);
        }
      }
    }

    await Ad.findByIdAndDelete(adId);

    // Broadcast Socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("ad:deleted", adId);
    }

    res.status(200).json({ success: true, message: "Advertisement deleted and unbroadcasted." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete ad." });
  }
};

// 5. Get Active Ads (User accessible)
const getActiveAds = async (req, res) => {
  try {
    const ads = await Ad.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, ads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch active ads." });
  }
};

module.exports = {
  createAd,
  getAdsAdmin,
  toggleAdStatus,
  deleteAd,
  getActiveAds
};
