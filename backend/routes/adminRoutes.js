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
  getRecentMessages,
  deleteChatMessage,
  getMaintenanceStatus,
  toggleMaintenanceMode
} = require("../controllers/adminControllers");

const router = express.Router();

// Publicly/User accessible developer helper to promote/toggle own admin state
router.post("/promote-self", auth_protect, promoteSelf);

// Admin restricted endpoints
router.get("/stats", auth_protect, admin_protect, getAdminOverviewStats);

router.get("/users", auth_protect, admin_protect, getAllUsers);
router.delete("/users/:id", auth_protect, admin_protect, deleteUser);
router.put("/users/:id/role", auth_protect, admin_protect, updateUserRole);
router.put("/users/:id/title", auth_protect, admin_protect, updateUserTitle);
router.put("/users/:id/suspend", auth_protect, admin_protect, toggleUserSuspension);

router.get("/rooms", auth_protect, admin_protect, getAllRooms);
router.delete("/rooms/:id", auth_protect, admin_protect, deleteRoom);

router.get("/ratings", auth_protect, admin_protect, getAllRatings);
router.delete("/ratings/:id", auth_protect, admin_protect, deleteRating);

router.get("/messages", auth_protect, admin_protect, getRecentMessages);
router.delete("/messages/:id", auth_protect, admin_protect, deleteChatMessage);

router.get("/maintenance", auth_protect, admin_protect, getMaintenanceStatus);
router.post("/maintenance", auth_protect, admin_protect, toggleMaintenanceMode);

module.exports = router;
