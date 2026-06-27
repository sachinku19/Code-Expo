const Story = require("../models/Story");
const Follow = require("../models/Follow");
const MediaService = require("../services/MediaService");
const fs = require("fs");

// Create story (supports text, image, and video media)
const createStory = async (req, res) => {
  let uploadedMedia = null;
  try {
    const { text } = req.body;
    let mediaUrl = "";
    let mediaMetadata = null;

    if (req.file) {
      // Validate file size and type (supports image and video files up to 20MB)
      MediaService.validateFile(req.file, {
        maxSize: 20 * 1024 * 1024,
        allowedExtensions: /jpeg|jpg|png|webp|gif|mp4|mov|avi|webm/,
        allowedMimeTypes: /image\/jpeg|image\/png|image\/webp|image\/gif|video\/mp4|video\/quicktime|video\/x-msvideo|video\/webm/
      });

      uploadedMedia = await MediaService.uploadMedia(
        req.file.buffer,
        req.file.originalname,
        "codeexpo_stories",
        { 
          req,
          resourceType: req.file.mimetype.startsWith("video/") ? "video" : "image"
        }
      );
      mediaUrl = uploadedMedia.url;
      mediaMetadata = uploadedMedia;
    }

    const story = await Story.create({
      user: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar || "",
      text: text || "",
      mediaUrl,
      mediaMetadata
    });

    // Clean up local temp files if Multer ever writes to disk
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({ success: true, story });
  } catch (error) {
    // Rollback uploaded files if DB save failed
    if (uploadedMedia) {
      await MediaService.deleteMedia(uploadedMedia).catch((e) => {
        console.error("Rollback failed for uploaded story media:", e.message);
      });
    }
    // Clean up local temp files on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active stories (followed users + own)
const getStories = async (req, res) => {
  try {
    const userId = req.user._id;
    const followedIds = req.user.following || [];

    const stories = await Story.find({
      user: { $in: [...followedIds, userId] }
    })
    .sort({ createdAt: -1 })
    .lean();

    res.status(200).json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete story
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this story" });
    }

    // Clean up story media files from storage
    if (story.mediaMetadata || story.mediaUrl) {
      await MediaService.deleteMedia(story.mediaMetadata || story.mediaUrl).catch((e) => {
        console.error("Failed to delete story media from storage:", e.message);
      });
    }

    await Story.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Story deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle Like on Story
const toggleLikeStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const userId = req.user._id;
    const isLiked = story.likes.includes(userId);

    if (isLiked) {
      story.likes = story.likes.filter(id => id.toString() !== userId.toString());
    } else {
      story.likes.push(userId);
    }

    await story.save();
    res.status(200).json({ success: true, likes: story.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Comment on Story
const addCommentStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const comment = {
      user: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar || "",
      text: text.trim(),
      createdAt: new Date()
    };

    story.comments.push(comment);
    await story.save();

    res.status(201).json({ success: true, comments: story.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createStory,
  getStories,
  deleteStory,
  toggleLikeStory,
  addCommentStory
};
