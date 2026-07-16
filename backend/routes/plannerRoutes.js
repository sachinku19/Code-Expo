const express = require("express");
const router = express.Router();
const auth_protect = require("../middleware/authMiddleware");
const checkRoomRole = require("../middleware/roleMiddleware");
const upload = require("../middleware/upload");

const {
  createPersonalTask,
  getPersonalTasks,
  updatePersonalTask,
  deletePersonalTask,
  createRoomTask,
  getRoomTasks,
  updateRoomTask,
  deleteRoomTask,
  getTaskChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getTaskComments,
  addComment,
  deleteComment,
  startTimer,
  pauseTimer,
  getTimerStatus,
  getPersonalDashboard,
  getRoomDashboard
} = require("../controllers/plannerControllers");

// Personal Tasks Routes
router.post("/personal", auth_protect, upload.array("attachments", 5), createPersonalTask);
router.get("/personal", auth_protect, getPersonalTasks);
router.put("/personal/:taskId", auth_protect, upload.array("attachments", 5), updatePersonalTask);
router.delete("/personal/:taskId", auth_protect, deletePersonalTask);

// Room Tasks Routes
// checkRoomRole takes array of allowed roles and populates req.room and req.userRole
router.post("/room/:roomId", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER"]), upload.array("attachments", 5), createRoomTask);
router.get("/room/:roomId", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER"]), getRoomTasks);
router.put("/room/:roomId/tasks/:taskId", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER"]), upload.array("attachments", 5), updateRoomTask);
router.delete("/room/:roomId/tasks/:taskId", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER"]), deleteRoomTask);

// Checklist Routes
router.get("/tasks/:taskId/checklist", auth_protect, getTaskChecklist);
router.post("/tasks/:taskId/checklist", auth_protect, addChecklistItem);
router.put("/tasks/:taskId/checklist/:itemId", auth_protect, updateChecklistItem);
router.delete("/tasks/:taskId/checklist/:itemId", auth_protect, deleteChecklistItem);

// Comment Routes
router.get("/tasks/:taskId/comments", auth_protect, getTaskComments);
router.post("/tasks/:taskId/comments", auth_protect, addComment);
router.delete("/comments/:commentId", auth_protect, deleteComment);

// Timer Routes
router.post("/tasks/:taskId/timer/start", auth_protect, startTimer);
router.post("/tasks/:taskId/timer/pause", auth_protect, pauseTimer);
router.post("/tasks/:taskId/timer/stop", auth_protect, pauseTimer); // stop is an alias to pause/save
router.get("/timer/active", auth_protect, getTimerStatus);

// Dashboards Routes
router.get("/dashboard/personal", auth_protect, getPersonalDashboard);
router.get("/dashboard/room/:roomId", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER"]), getRoomDashboard);

module.exports = router;
