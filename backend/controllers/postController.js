const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const Post = require("../models/Post");
const User = require("../models/User");

// Create a post
const createPost = async (req, res) => {
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
    if (req.file) {
      const originalName = req.file.originalname;
      const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                     process.env.CLOUDINARY_API_KEY &&
                                     process.env.CLOUDINARY_API_SECRET;

      if (!isCloudinaryConfigured) {
        const uploadsDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `post-${Date.now()}-${sanitizedName}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        imageUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
      } else {
        const uploadToCloudinary = (fileBuffer) => {
          return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: "codeexpo_posts",
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
    }

    const newPost = await Post.create({
      author: req.user._id,
      text,
      techStack: finalTechStack,
      image: imageUrl || image || ""
    });

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "username email avatar title developerLevel status reputationScore")
      .lean();

    // Increment user contribution score for activity
    await User.findByIdAndUpdate(req.user._id, { $inc: { contributionScore: 5 } });

    res.status(201).json({ success: true, post: populatedPost });
  } catch (error) {
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
