const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const {
  getWorkspaceTree,
  getFileContent,
  createWorkspaceItem,
  renameWorkspaceItem,
  moveWorkspaceItem,
  deleteWorkspaceItem,
  saveFileContent,
  setFileEntryPoint,
  getRoomHistory
} = require("../controllers/workspaceControllers");

const router = express.Router();

router.get("/:roomId/tree", auth_protect, getWorkspaceTree);
router.get("/:roomId/history", auth_protect, getRoomHistory);
router.get("/files/:fileId", auth_protect, getFileContent);
router.post("/:roomId/item", auth_protect, createWorkspaceItem);
router.put("/items/:itemId/rename", auth_protect, renameWorkspaceItem);
router.put("/items/:itemId/move", auth_protect, moveWorkspaceItem);
router.delete("/items/:itemId", auth_protect, deleteWorkspaceItem);
router.put("/files/:fileId/content", auth_protect, saveFileContent);
router.put("/files/:fileId/entry-point", auth_protect, setFileEntryPoint);

module.exports = router;
