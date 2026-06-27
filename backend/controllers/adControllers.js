const Ad = require("../models/Ad");
const fs = require("fs");
const path = require("path");
const MediaService = require("../services/MediaService");

// 1. Create Ad (Admin only)
const createAd = async (req, res) => {
  let uploadedMedia = null;
  try {
    const { title, redirectUrl, format } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "Ad title is required." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Ad banner image is required." });
    }

    // Validate ad file size and type (max 5MB)
    MediaService.validateFile(req.file, { maxSize: 5 * 1024 * 1024 });

    // Upload banner
    uploadedMedia = await MediaService.uploadMedia(
      req.file.buffer,
      req.file.originalname,
      "codeexpo_ads",
      { req }
    );

    const ad = new Ad({
      title,
      imageUrl: uploadedMedia.url,
      imageMetadata: uploadedMedia,
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

    // Clean up local temp file if Multer ever writes to disk
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: "Advertisement created and uploaded successfully.",
      ad
    });
  } catch (error) {
    // Rollback uploaded media if DB save fails
    if (uploadedMedia) {
      await MediaService.deleteMedia(uploadedMedia).catch((e) => {
        console.error("Rollback failed for uploaded ad media:", e.message);
      });
    }
    // Clean up local temp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
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

    // Clean up banner image via MediaService
    if (ad.imageMetadata || ad.imageUrl) {
      await MediaService.deleteMedia(ad.imageMetadata || ad.imageUrl).catch((err) => {
        console.error("Failed to delete ad banner from storage:", err.message);
      });
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
