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
          allowedExtensions: /jpeg|jpg|png|webp|avif/,
          allowedMimeTypes: /image\/jpeg|image\/png|image\/webp|image\/avif/
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
        maxSize: 10 * 1024 * 1024,
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

    const isLiked = post.likes ? post.likes.some(id => String(id._id || id) === String(userId)) : false;
    const updateQuery = isLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    const [updatedPost] = await Promise.all([
      Post.findByIdAndUpdate(postId, updateQuery, { returnDocument: 'after', select: "likes updatedAt" }).lean(),
      User.findByIdAndUpdate(post.author, { $inc: { reputationScore: isLiked ? -2 : 2 } })
    ]);

    const version = Date.now();
    const likesCount = updatedPost.likes ? updatedPost.likes.length : 0;

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("like:update", {
          entityType: "POST",
          entityId: postId,
          likes: updatedPost.likes,
          likesCount,
          version,
          updatedAt: updatedPost.updatedAt || new Date().toISOString()
        });

        // Send notification to the post author if liked by another user
        if (!isLiked && String(post.author) !== String(userId)) {
          const { createAndSendNotification } = require("./notificationControllers");
          await createAndSendNotification(post.author, userId, "LIKE", "SOCIAL", null, socketHandler.io, postId);
        }
      }
    } catch (e) {
      console.error("Failed to emit like:update or send notification:", e.message);
    }

    res.status(200).json({
      success: true,
      likes: updatedPost.likes,
      likesCount,
      isLiked: !isLiked,
      version
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const findNodeRecursively = (items, targetId) => {
  if (!items || !Array.isArray(items)) return null;
  for (const item of items) {
    if (String(item._id) === String(targetId)) return item;
    if (item.replies && item.replies.length > 0) {
      const found = findNodeRecursively(item.replies, targetId);
      if (found) return found;
    }
  }
  return null;
};

const countAllCommentsServer = (comments) => {
  if (!comments || !Array.isArray(comments)) return 0;
  let count = 0;
  for (const c of comments) {
    count += 1;
    if (c.replies && Array.isArray(c.replies)) {
      count += countAllCommentsServer(c.replies);
    }
  }
  return count;
};

const deleteNodeRecursively = (items, targetId, userId, isPostOwner, isAdmin) => {
  if (!items || !Array.isArray(items)) return false;
  const index = items.findIndex(item => String(item._id) === String(targetId));
  if (index !== -1) {
    const itemObj = items[index];
    const isAuthor = String(itemObj.user) === String(userId);
    if (!isPostOwner && !isAuthor && !isAdmin) {
      const err = new Error("Unauthorized to delete this message");
      err.status = 403;
      throw err;
    }
    items.splice(index, 1);
    return true;
  }
  for (const item of items) {
    if (item.replies && item.replies.length > 0) {
      const deleted = deleteNodeRecursively(item.replies, targetId, userId, isPostOwner, isAdmin);
      if (deleted) return true;
    }
  }
  return false;
};

const addComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { text, commentId, parentCommentId } = req.body;
    const targetParentId = parentCommentId || commentId;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (targetParentId) {
      const targetNode = findNodeRecursively(post.comments, targetParentId);
      if (targetNode) {
        targetNode.replies = targetNode.replies || [];
        targetNode.replies.push({
          user: userId,
          username: req.user.username,
          avatar: req.user.avatar || "",
          text,
          likes: [],
          replies: [],
          createdAt: new Date()
        });
      } else {
        post.comments.push({
          user: userId,
          username: req.user.username,
          avatar: req.user.avatar || "",
          text,
          likes: [],
          replies: [],
          createdAt: new Date()
        });
      }
    } else {
      post.comments.push({
        user: userId,
        username: req.user.username,
        avatar: req.user.avatar || "",
        text,
        likes: [],
        replies: [],
        createdAt: new Date()
      });
    }

    post.markModified("comments");
    await post.save();
    await User.findByIdAndUpdate(userId, { $inc: { contributionScore: 1 } });

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:commented", {
          postId,
          comments: post.comments,
          commentsCount: countAllCommentsServer(post.comments)
        });

        if (String(post.author) !== String(userId)) {
          const { createAndSendNotification } = require("./notificationControllers");
          await createAndSendNotification(post.author, userId, "COMMENT", "SOCIAL", null, socketHandler.io, postId);
        }
      }
    } catch (e) {
      console.error("Failed to emit post:commented or send notification:", e.message);
    }

    res.status(200).json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleLikeComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const targetComment = findNodeRecursively(post.comments, commentId);

    if (!targetComment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    targetComment.likes = targetComment.likes || [];
    const isLiked = targetComment.likes.some(id => String(id) === String(userId));
    if (isLiked) {
      targetComment.likes = targetComment.likes.filter(id => String(id) !== String(userId));
    } else {
      targetComment.likes.push(userId);
    }

    post.markModified("comments");
    await post.save();

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:commented", {
          postId,
          comments: post.comments,
          commentsCount: countAllCommentsServer(post.comments)
        });
      }
    } catch (e) {
      console.error("Failed to emit comment like event:", e.message);
    }

    res.status(200).json({
      success: true,
      comments: post.comments,
      isLiked: !isLiked,
      likesCount: targetComment.likes.length
    });
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
      { returnDocument: 'after' }
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

const deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isPostOwner = String(post.author) === String(userId);

    const commentIndex = post.comments.findIndex(c => String(c._id) === String(commentId));

    if (commentIndex !== -1) {
      const commentObj = post.comments[commentIndex];
      const isCommentAuthor = String(commentObj.user) === String(userId);

      if (!isPostOwner && !isCommentAuthor && req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Unauthorized to delete this comment" });
      }

      post.comments.splice(commentIndex, 1);
    } else {
      let replyFound = false;
      for (const c of post.comments) {
        if (c.replies) {
          const replyIndex = c.replies.findIndex(r => String(r._id) === String(commentId));
          if (replyIndex !== -1) {
            const replyObj = c.replies[replyIndex];
            const isReplyAuthor = String(replyObj.user) === String(userId);

            if (!isPostOwner && !isReplyAuthor && req.user.role !== "admin") {
              return res.status(403).json({ success: false, message: "Unauthorized to delete this reply" });
            }

            c.replies.splice(replyIndex, 1);
            replyFound = true;
            break;
          }
        }
      }

      if (!replyFound) {
        return res.status(404).json({ success: false, message: "Comment or reply not found" });
      }
    }

    post.markModified("comments");
    await post.save();

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:commented", {
          postId,
          comments: post.comments,
          commentsCount: countAllCommentsServer(post.comments)
        });
      }
    } catch (e) {
      console.error("Failed to emit comment deletion socket event:", e.message);
    }

    res.status(200).json({ success: true, message: "Comment deleted successfully", comments: post.comments });
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
  toggleLikeComment,
  deleteComment,
  deletePost
};
