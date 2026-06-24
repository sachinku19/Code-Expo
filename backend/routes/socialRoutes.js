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
  getNetworkAnalytics
} = require("../controllers/socialControllers");
const {
  getNotifications,
  markNotificationsRead
} = require("../controllers/notificationControllers");
const {
  createPost,
  getPosts,
  toggleLikePost,
  addComment,
  deletePost
} = require("../controllers/postController");
const {
  createStory,
  getStories,
  deleteStory
} = require("../controllers/storyController");

const router = express.Router();

// Follow actions
router.post("/follow/:id", auth_protect, toggleFollowUser);
router.delete("/follower/:id", auth_protect, removeFollower);
router.get("/followers/:id", auth_protect, getFollowers);
router.get("/following/:id", auth_protect, getFollowing);

// Room interactions
router.post("/like/:id", auth_protect, toggleLikeRoom);
router.post("/bookmark/:id", auth_protect, toggleBookmarkRoom);
router.get("/room-stats/:id", auth_protect, getRoomSocialStats);
router.get("/trending-rooms", auth_protect, getTrendingRooms);
router.get("/rooms/liked", auth_protect, getLikedRooms);
router.get("/rooms/bookmarked", auth_protect, getBookmarkedRooms);

// Social Feed & Suggestions
router.get("/feed", auth_protect, getSocialFeed);
router.get("/suggestions", auth_protect, getDeveloperSuggestions);
router.get("/leaderboard", auth_protect, getLeaderboard);

// User Search & Public Profile
router.get("/users/search", auth_protect, searchUsers);
router.get("/users/profile/:id", auth_protect, getUserPublicProfile);

// Notifications
router.get("/notifications", auth_protect, getNotifications);
router.post("/notifications/read", auth_protect, markNotificationsRead);

// Posts
router.post("/posts", auth_protect, createPost);
router.get("/posts", auth_protect, getPosts);
router.delete("/posts/:id", auth_protect, deletePost);
router.post("/posts/:id/like", auth_protect, toggleLikePost);
router.post("/posts/:id/comment", auth_protect, addComment);

// Stories
router.post("/stories", auth_protect, createStory);
router.get("/stories", auth_protect, getStories);
router.delete("/stories/:id", auth_protect, deleteStory);

// Status & Analytics
router.post("/status", auth_protect, updateStatus);
router.get("/analytics", auth_protect, getNetworkAnalytics);

module.exports = router;

