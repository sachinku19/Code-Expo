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
  getUserPublicProfile
} = require("../controllers/socialControllers");
const {
  getNotifications,
  markNotificationsRead
} = require("../controllers/notificationControllers");

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

// User Search & Public Profile
router.get("/users/search", auth_protect, searchUsers);
router.get("/users/profile/:id", auth_protect, getUserPublicProfile);

// Notifications
router.get("/notifications", auth_protect, getNotifications);
router.post("/notifications/read", auth_protect, markNotificationsRead);

module.exports = router;

