const path = require("path");
const fs = require("fs");
const MediaService = require("../services/MediaService");
const Post = require("../models/Post");
const User = require("../models/User");

// Create a post
// Create a post
const createPost = async (req, res) => {
  const uploadedMedias = [];
  try {
    const { text, techStack, image } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: "Post content is required" });
    }

    // 1. Validate Text Length (max 5,000 chars)
    if (text.length > 5000) {
      return res.status(400).json({ success: false, message: "Text posts are limited to 5,000 characters." });
    }

    // 2. Validate Code Snippet (max 300 lines, 100 KB)
    const codeMatch = text.match(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/);
    if (codeMatch) {
      const code = codeMatch[2];
      const codeLines = code.split(/\r?\n/).length;
      const codeSize = Buffer.byteLength(code, "utf8");
      if (codeLines > 300 || codeSize > 100 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Code posts are limited to 300 lines or 100 KB. Please split your solution into multiple posts or create a Gist."
        });
      }
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

    // 3. Validate and Upload Images (max 10, max 10MB each)
    if (req.files && req.files.images && req.files.images.length > 0) {
      if (req.files.images.length > 10) {
        return res.status(400).json({ success: false, message: "A post can contain at most 10 images." });
      }
      for (const file of req.files.images) {
        MediaService.validateFile(file, {
          maxSize: 10 * 1024 * 1024,
          allowedExtensions: /jpeg|jpg|png|webp/,
          allowedMimeTypes: /image\/jpeg|image\/png|image\/webp/
        });
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
    }

    // 4. Validate and Upload Video (max 1, max 100MB)
    let videoUrl = "";
    let videoMetadata = null;

    if (req.files && req.files.video && req.files.video.length > 0) {
      if (req.files.video.length > 1) {
        return res.status(400).json({ success: false, message: "A post can contain at most 1 video." });
      }
      const videoFile = req.files.video[0];
      MediaService.validateFile(videoFile, {
        maxSize: 100 * 1024 * 1024,
        allowedExtensions: /mp4|webm|mov|avi|mkv/,
        allowedMimeTypes: /video\/mp4|video\/webm|video\/quicktime|video\/x-msvideo|video\/x-matroska/
      });
      const media = await MediaService.uploadMedia(
        videoFile.buffer,
        videoFile.originalname,
        "codeexpo_posts",
        { 
          req,
          resourceType: "video"
        }
      );
      uploadedMedias.push(media);
      videoUrl = media.url;
      videoMetadata = media;
    }

    const newPost = await Post.create({
      author: req.user._id,
      text,
      techStack: finalTechStack,
      image: imageUrl || image || "",
      imageMetadata,
      images,
      imagesMetadata,
      video: videoUrl,
      videoMetadata
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "username email avatar title developerLevel status reputationScore executionsCount subscription")
      .populate({ path: "comments.user", select: "username email avatar subscription" })
      .lean();

    // Increment user contribution score for activity
    await User.findByIdAndUpdate(req.user._id, { $inc: { contributionScore: 5 } });

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:created", populatedPost);
      }
    } catch (e) {
      console.error("Failed to emit post:created event:", e.message);
    }

    // Clean up local temp files if Multer ever writes to disk
    if (req.files) {
      if (req.files.images) {
        req.files.images.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
          }
        });
      }
      if (req.files.video) {
        req.files.video.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
          }
        });
      }
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
    if (req.files) {
      if (req.files.images) {
        req.files.images.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
          }
        });
      }
      if (req.files.video) {
        req.files.video.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
          }
        });
      }
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all posts / feed
const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: { $nin: ["hidden", "deleted"] } };
    if (req.query.author) {
      query.author = req.query.author;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      const matchingUsers = await User.find({ username: searchRegex }).select("_id");
      const matchingUserIds = matchingUsers.map(u => u._id);
      query.$or = [
        { text: searchRegex },
        { techStack: searchRegex },
        { author: { $in: matchingUserIds } }
      ];
    }

    const posts = await Post.find(query)
      .populate("author", "username email avatar title developerLevel status reputationScore executionsCount subscription")
      .populate({ path: "comments.user", select: "username email avatar subscription" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (posts.length > 0) {
      const postIds = posts.map(p => p._id);
      // Increment views count in the DB
      Post.updateMany({ _id: { $in: postIds } }, { $inc: { viewsCount: 1 } }).exec().catch(err => {
        console.error("Failed to increment viewsCount in bulk:", err.message);
      });
      // Update returned objects
      posts.forEach(p => {
        p.viewsCount = (p.viewsCount || 0) + 1;
      });
    }

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

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:liked", {
          postId,
          likes: updatedPost.likes,
          likesCount: updatedPost.likes.length
        });

        // Send notification to the post author if liked by another user
        if (!isLiked && String(post.author) !== String(userId)) {
          const { createAndSendNotification } = require("./notificationControllers");
          await createAndSendNotification(post.author, userId, "LIKE", "SOCIAL", null, socketHandler.io, postId);
        }
      }
    } catch (e) {
      console.error("Failed to emit post:liked or send notification:", e.message);
    }

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
      Post.findByIdAndUpdate(postId, { $push: { comments: comment } }, { new: true, select: "comments author" }).lean(),
      User.findByIdAndUpdate(userId, { $inc: { contributionScore: 1 } })
    ]);

    if (!updatedPost) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:commented", {
          postId,
          comments: updatedPost.comments,
          commentsCount: updatedPost.comments.length
        });

        // Send notification to the post author if commented by another user
        if (String(updatedPost.author) !== String(userId)) {
          const { createAndSendNotification } = require("./notificationControllers");
          await createAndSendNotification(updatedPost.author, userId, "COMMENT", "SOCIAL", null, socketHandler.io, postId);
        }
      }
    } catch (e) {
      console.error("Failed to emit post:commented or send notification:", e.message);
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

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:deleted", { postId });
      }
    } catch (e) {
      console.error("Failed to emit post:deleted event:", e.message);
    }

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findByIdAndUpdate(
      postId,
      { $inc: { viewsCount: 1 } },
      { new: true }
    )
      .populate("author", "username email avatar title developerLevel status reputationScore executionsCount subscription")
      .populate({ path: "comments.user", select: "username email avatar subscription" })
      .lean();

    const isAuthor = req.user && String(post.author?._id || post.author) === String(req.user._id);
    const isAdmin = req.user && req.user.role === "admin";
    if (!post || ((post.status === "deleted" || post.status === "hidden") && !isAuthor && !isAdmin)) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  toggleLikePost,
  addComment,
  deletePost
};
