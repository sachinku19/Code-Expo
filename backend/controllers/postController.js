const path = require("path");
const fs = require("fs");
const MediaService = require("../services/MediaService");
const Post = require("../models/Post");
const User = require("../models/User");

// Create a post
const createPost = async (req, res) => {
  const uploadedMedias = [];
  try {
    const { text, techStack, image } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: "Post content is required" });
    }

    let finalTechStack = [];
    if (techStack) {
      if (Array.isArray(techStack)) {
        finalTechStack = techStack;
      } else {
        try {
          finalTechStack = JSON.parse(techStack);
          if (!Array.isArray(finalTechStack)) {
            finalTechStack = [finalTechStack];
          }
        } catch (e) {
          finalTechStack = techStack.split(",").map(t => t.trim()).filter(Boolean);
        }
      }
    }

    let imageUrl = "";
    let imageMetadata = null;
    const images = [];
    const imagesMetadata = [];

    // Support multiple uploaded images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        MediaService.validateFile(file, { maxSize: 10 * 1024 * 1024 });
        const media = await MediaService.uploadMedia(
          file.buffer,
          file.originalname,
          "codeexpo_posts",
          { req }
        );
        uploadedMedias.push(media);
        images.push(media.url);
        imagesMetadata.push(media);
      }
      
      if (images.length > 0) {
        imageUrl = images[0];
        imageMetadata = imagesMetadata[0];
      }
    } else if (req.file) {
      // Support single image upload
      MediaService.validateFile(req.file, { maxSize: 10 * 1024 * 1024 });
      const media = await MediaService.uploadMedia(
        req.file.buffer,
        req.file.originalname,
        "codeexpo_posts",
        { req }
      );
      uploadedMedias.push(media);
      imageUrl = media.url;
      imageMetadata = media;
      images.push(media.url);
      imagesMetadata.push(media);
    }

    const newPost = await Post.create({
      author: req.user._id,
      text,
      techStack: finalTechStack,
      image: imageUrl || image || "",
      imageMetadata,
      images,
      imagesMetadata
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "username email avatar title developerLevel status reputationScore")
      .lean();

    // Increment user contribution score for activity
    await User.findByIdAndUpdate(req.user._id, { $inc: { contributionScore: 5 } });

    // Clean up local temp files if Multer ever writes to disk
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({ success: true, post: populatedPost });
  } catch (error) {
    // Rollback uploaded files if DB save failed
    if (uploadedMedias.length > 0) {
      await MediaService.deleteMultipleMedia(uploadedMedias).catch((e) => {
        console.error("Rollback failed for uploaded post media array:", e.message);
      });
    }
    // Clean up local temp files on error
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (e) {}
        }
      });
    }
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all posts / feed
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate("author", "username email avatar title developerLevel status reputationScore")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleLikePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Post.findOne({ _id: postId }).select("likes author").lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isLiked = post.likes.some(id => String(id) === String(userId));
    const updateQuery = isLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    const [updatedPost] = await Promise.all([
      Post.findByIdAndUpdate(postId, updateQuery, { new: true, select: "likes" }).lean(),
      User.findByIdAndUpdate(post.author, { $inc: { reputationScore: isLiked ? -2 : 2 } })
    ]);

    res.status(200).json({ success: true, likes: updatedPost.likes, isLiked: !isLiked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const comment = {
      user: userId,
      username: req.user.username,
      avatar: req.user.avatar || "",
      text,
      createdAt: new Date()
    };

    const [updatedPost] = await Promise.all([
      Post.findByIdAndUpdate(postId, { $push: { comments: comment } }, { new: true, select: "comments" }).lean(),
      User.findByIdAndUpdate(userId, { $inc: { contributionScore: 1 } })
    ]);

    if (!updatedPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.status(200).json({ success: true, comments: updatedPost.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a post
const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Only post author or admin can delete
    if (String(post.author) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    // Delete post images via MediaService
    if (post.imagesMetadata && post.imagesMetadata.length > 0) {
      await MediaService.deleteMultipleMedia(post.imagesMetadata).catch((e) => {
        console.error("Failed to delete post images array from storage:", e.message);
      });
    } else if (post.imageMetadata || post.image) {
      await MediaService.deleteMedia(post.imageMetadata || post.image).catch((e) => {
        console.error("Failed to delete post image from storage:", e.message);
      });
    }

    await Post.deleteOne({ _id: postId });
    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  toggleLikePost,
  addComment,
  deletePost
};
