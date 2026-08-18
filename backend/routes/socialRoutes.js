const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const {
  toggleFollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  toggleLikeRoom,
  toggleBookmarkRoom,
  getSocialFeed,
  getDeveloperSuggestions,
  getTrendingRooms,
  getRoomSocialStats,
  getLikedRooms,
  getBookmarkedRooms,
  searchUsers,
  getUserPublicProfile,
  getLeaderboard,
  updateStatus,
  getNetworkAnalytics,
  reportUser
} = require("../controllers/socialControllers");
const {
  getNotifications,
  markNotificationsRead,
  deleteNotifications
} = require("../controllers/notificationControllers");
const {
  createPost,
  getPosts,
  getPostById,
  toggleLikePost,
  addComment,
  toggleLikeComment,
  deleteComment,
  deletePost
} = require("../controllers/postController");
const {
  createStory,
  getStories,
  deleteStory,
  toggleLikeStory,
  addCommentStory
} = require("../controllers/storyController");

const upload = require("../middleware/upload");

const router = express.Router();

const optional_auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "null" && token !== "undefined" && token.trim() !== "") {
        return auth_protect(req, res, next);
      }
    }
    return next();
  } catch (e) {
    return next();
  }
};

// Social Connections
router.post("/follow/:id", auth_protect, toggleFollowUser);
router.delete("/followers/:id", auth_protect, removeFollower);
router.get("/followers/:id", optional_auth, getFollowers);
router.get("/following/:id", optional_auth, getFollowing);

// Feed & Rooms
router.get("/feed", optional_auth, getSocialFeed);
router.get("/rooms/trending", optional_auth, getTrendingRooms);
router.get("/trending-rooms", optional_auth, getTrendingRooms);
router.get("/rooms/liked", auth_protect, getLikedRooms);
router.get("/rooms/bookmarked", auth_protect, getBookmarkedRooms);
router.get("/rooms/:id/stats", optional_auth, getRoomSocialStats);
router.get("/room-stats/:id", optional_auth, getRoomSocialStats);
router.post("/rooms/:id/like", auth_protect, toggleLikeRoom);
router.post("/like/:id", auth_protect, toggleLikeRoom);
router.post("/rooms/:id/bookmark", auth_protect, toggleBookmarkRoom);

// Recommendations & Network
router.get("/suggestions", auth_protect, getDeveloperSuggestions);
router.get("/leaderboard", auth_protect, getLeaderboard);

// User Search & Public Profile
router.get("/users/search", auth_protect, searchUsers);
router.get("/users/profile/:id", optional_auth, getUserPublicProfile);
router.post("/users/:id/report", auth_protect, reportUser);

// Notifications
router.get("/notifications", auth_protect, getNotifications);
router.post("/notifications/read", auth_protect, markNotificationsRead);
router.delete("/notifications", auth_protect, deleteNotifications);

// Posts
router.post("/posts", auth_protect, upload.fields([{ name: "images", maxCount: 10 }, { name: "video", maxCount: 1 }]), createPost);
router.get("/posts", optional_auth, getPosts);
router.get("/posts/:id", optional_auth, getPostById);
router.delete("/posts/:id", auth_protect, deletePost);
router.post("/posts/:id/like", auth_protect, toggleLikePost);
router.post("/posts/:id/comment", auth_protect, addComment);
router.post("/posts/:id/comments/:commentId/like", auth_protect, toggleLikeComment);
router.delete("/posts/:id/comments/:commentId", auth_protect, deleteComment);

// Stories
router.post("/stories", auth_protect, upload.single("media"), createStory);
router.get("/stories", auth_protect, getStories);
router.delete("/stories/:id", auth_protect, deleteStory);
router.post("/stories/:id/like", auth_protect, toggleLikeStory);
router.post("/stories/:id/comment", auth_protect, addCommentStory);

// Status & Analytics
router.post("/status", auth_protect, updateStatus);
router.get("/analytics", auth_protect, getNetworkAnalytics);

module.exports = router;

