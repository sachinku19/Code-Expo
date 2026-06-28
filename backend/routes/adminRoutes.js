const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const admin_protect = require("../middleware/adminMiddleware");
const {
  getAdminOverviewStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserTitle,
  getAllRooms,
  deleteRoom,
  getAllRatings,
  deleteRating,
  promoteSelf,
  toggleUserSuspension,
  adminIssueUserAction,
  getRecentMessages,
  deleteChatMessage,
  getMaintenanceStatus,
  toggleMaintenanceMode,
  getAdminPosts,
  deleteAdminPost,
  deleteAdminPostComment,
  updateAdminPostStatus,
  getAdminLoginLogs,
  getAdminStories,
  deleteAdminStory,
  bulkDeletePosts,
  bulkHidePosts,
  bulkFeaturePosts,
  updateAdminStoryStatus,
  toggleAdminStoryFeature
} = require("../controllers/adminControllers");

const router = express.Router();

// Publicly/User accessible developer helper to promote/toggle own admin state
router.post("/promote-self", auth_protect, promoteSelf);

// Admin restricted endpoints
router.get("/stats", auth_protect, admin_protect, getAdminOverviewStats);

// User/Developer management
router.get("/users", auth_protect, admin_protect, getAllUsers);
router.delete("/users/:id", auth_protect, admin_protect, deleteUser);
router.put("/users/:id/role", auth_protect, admin_protect, updateUserRole);
router.put("/users/:id/title", auth_protect, admin_protect, updateUserTitle);
router.put("/users/:id/suspend", auth_protect, admin_protect, toggleUserSuspension);
router.put("/users/:id/action", auth_protect, admin_protect, adminIssueUserAction);

// Rooms
router.get("/rooms", auth_protect, admin_protect, getAllRooms);
router.delete("/rooms/:id", auth_protect, admin_protect, deleteRoom);

// Ratings
router.get("/ratings", auth_protect, admin_protect, getAllRatings);
router.delete("/ratings/:id", auth_protect, admin_protect, deleteRating);

// Messages
router.get("/messages", auth_protect, admin_protect, getRecentMessages);
router.delete("/messages/:id", auth_protect, admin_protect, deleteChatMessage);

// Maintenance
router.get("/maintenance", auth_protect, admin_protect, getMaintenanceStatus);
router.post("/maintenance", auth_protect, admin_protect, toggleMaintenanceMode);

// Feed Moderation
router.get("/posts", auth_protect, admin_protect, getAdminPosts);
router.delete("/posts/:id", auth_protect, admin_protect, deleteAdminPost);
router.delete("/posts/:id/comments/:commentId", auth_protect, admin_protect, deleteAdminPostComment);
router.put("/posts/:id/status", auth_protect, admin_protect, updateAdminPostStatus);
router.post("/posts/bulk-delete", auth_protect, admin_protect, bulkDeletePosts);
router.post("/posts/bulk-hide", auth_protect, admin_protect, bulkHidePosts);
router.post("/posts/bulk-feature", auth_protect, admin_protect, bulkFeaturePosts);

// Login Logs
router.get("/login-logs", auth_protect, admin_protect, getAdminLoginLogs);

// Story Moderation
router.get("/stories", auth_protect, admin_protect, getAdminStories);
router.delete("/stories/:id", auth_protect, admin_protect, deleteAdminStory);
router.put("/stories/:id/status", auth_protect, admin_protect, updateAdminStoryStatus);
router.put("/stories/:id/feature", auth_protect, admin_protect, toggleAdminStoryFeature);

module.exports = router;
