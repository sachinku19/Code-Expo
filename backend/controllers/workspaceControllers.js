const fs = require("fs");
const path = require("path");
const WorkspaceItem = require("../models/WorkspaceItem");
const Room = require("../models/Room");
const { logActivity } = require("./activityControllers");

// Helper: Check if a user has access to a room
const checkRoomAccess = async (roomId, userId) => {
  const room = await Room.findOne({ roomId });
  if (!room) return null;
  const isCreator = room.createdBy.toString() === userId.toString();
  const isParticipant = room.participants.some(
    (p) => p.user && p.user.toString() === userId.toString()
  );
  if (isCreator || isParticipant) return room;
  return null;
};

// Helper: Check if user has permission to modify workspace items (renaming, moving, deleting, saving content)
const canModifyItem = (room, item, userId) => {
  // If the user is the room owner/creator, they can edit anything
  if (room.createdBy.toString() === userId.toString()) return true;

  const participant = room.participants.find(
    (p) => p.user && p.user.toString() === userId.toString()
  );
  if (!participant) return false;

  // VIEWER cannot edit anything
  if (participant.role === "VIEWER") return false;

  // OWNER and MODERATOR can edit everything
  if (participant.role === "OWNER" || participant.role === "MODERATOR") return true;

  // MEMBER can only edit files they created
  if (participant.role === "MEMBER") {
    return !!item.createdBy && item.createdBy.toString() === userId.toString();
  }

  return false;
};

// Helper: Check for cyclic loop when moving a folder
const wouldCreateCycle = async (itemId, targetParentId) => {
  if (!targetParentId) return false;
  if (itemId.toString() === targetParentId.toString()) return true;

  let currentParentId = targetParentId;
  while (currentParentId) {
    const parent = await WorkspaceItem.findById(currentParentId);
    if (!parent) break;
    if (parent.parentId && parent.parentId.toString() === itemId.toString()) {
      return true;
    }
    currentParentId = parent.parentId;
  }
  return false;
};

// Helper: Fast recursive collector & batch deleter
const deleteItemRecursively = async (itemId) => {
  const rootItem = await WorkspaceItem.findById(itemId);
  if (!rootItem) return [];

  const roomId = rootItem.roomId;
  // Fetch all items in this room to build exact recursive tree with zero missed children
  const allRoomItems = await WorkspaceItem.find({ roomId });

  const deletedIds = new Set([String(rootItem._id)]);
  let currentParents = new Set([String(rootItem._id)]);

  if (rootItem.type === "folder") {
    while (currentParents.size > 0) {
      const nextParents = new Set();
      for (const item of allRoomItems) {
        if (item.parentId && currentParents.has(String(item.parentId))) {
          const idStr = String(item._id);
          if (!deletedIds.has(idStr)) {
            deletedIds.add(idStr);
            if (item.type === "folder") {
              nextParents.add(idStr);
            }
          }
        }
      }
      currentParents = nextParents;
    }
  }

  const deletedIdArray = Array.from(deletedIds);

  // Clean up physical disk files for any deleted assets
  for (const it of allRoomItems) {
    if (deletedIds.has(String(it._id)) && it.storageKey) {
      try {
        const assetPath = path.join(__dirname, "../uploads/workspace_assets", it.storageKey);
        if (fs.existsSync(assetPath)) {
          fs.unlinkSync(assetPath);
        }
      } catch (e) {
        console.warn("Failed to delete physical asset file:", e.message);
      }
    }
  }

  // Fast single batch delete in MongoDB
  await WorkspaceItem.deleteMany({ _id: { $in: deletedIdArray } });
  return deletedIdArray;
};

// 1. Get Workspace Tree Metadata (excluding contents)
exports.getWorkspaceTree = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this workspace"
      });
    }

    const items = await WorkspaceItem.find({ roomId })
      .select("-content")
      .populate("createdBy", "username avatar")
      .sort({ type: 1, name: 1 }); // Folders first, then alphabetically

    res.status(200).json({
      success: true,
      items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Get Single File Content
exports.getFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await WorkspaceItem.findById(fileId).populate("createdBy", "username avatar");
    if (!file || file.type !== "file") {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    const room = await checkRoomAccess(file.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this file"
      });
    }

    res.status(200).json({
      success: true,
      file
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. Create Workspace Item (File or Folder)
exports.createWorkspaceItem = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, type, parentId, language } = req.body;

    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this workspace"
      });
    }

    const participant = room.participants.find(
      (p) => p.user && p.user.toString() === req.user._id.toString()
    );
    if (participant && participant.role === "VIEWER") {
      return res.status(403).json({
        success: false,
        message: "Viewers are not authorized to create workspace items"
      });
    }

    // Validation: Parent folder check
    if (parentId) {
      const parent = await WorkspaceItem.findById(parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Parent folder not found"
        });
      }
      if (parent.roomId !== roomId) {
        return res.status(400).json({
          success: false,
          message: "Parent folder belongs to a different room"
        });
      }
      if (parent.type !== "folder") {
        return res.status(400).json({
          success: false,
          message: "Parent must be a folder"
        });
      }

      // Check parent folder write permission (members can only create files inside folders they created)
      if (!canModifyItem(room, parent, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to create items inside this folder"
        });
      }
    }

    // Check for duplicate name in same directory
    const existing = await WorkspaceItem.findOne({ roomId, parentId, name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An item named "${name}" already exists in this directory`
      });
    }

    if (type === "file") {
      const { calculateRoomStorage } = require("../services/importService");
      const { MAX_ROOM_STORAGE } = require("../utils/importRules");
      const storageInfo = await calculateRoomStorage(roomId);
      if (storageInfo.currentUsage >= MAX_ROOM_STORAGE) {
        return res.status(400).json({
          success: false,
          message: "Room storage limit of 10 MB reached. Cannot create more files."
        });
      }
    }

    const newItem = await WorkspaceItem.create({
      roomId,
      name,
      type,
      parentId: parentId || null,
      content: type === "file" ? "" : undefined,
      language: type === "file" ? language || "javascript" : undefined,
      createdBy: req.user._id
    });

    const populatedItem = await WorkspaceItem.findById(newItem._id).populate("createdBy", "username avatar");

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `created ${type} "${name}"`
    );

    res.status(201).json({
      success: true,
      item: populatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 4. Rename Item
exports.renameWorkspaceItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name } = req.body;

    const item = await WorkspaceItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Workspace item not found"
      });
    }

    const room = await checkRoomAccess(item.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this item"
      });
    }

    if (!canModifyItem(room, item, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to rename this item. Only the creator or room administrators can modify it."
      });
    }

    // Check duplicates under the same parent
    const existing = await WorkspaceItem.findOne({
      roomId: item.roomId,
      parentId: item.parentId,
      name,
      _id: { $ne: itemId }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An item named "${name}" already exists in this directory`
      });
    }

    const oldName = item.name;
    item.name = name;
    await item.save();

    const populatedItem = await WorkspaceItem.findById(item._id).populate("createdBy", "username avatar");

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `renamed "${oldName}" to "${name}"`
    );

    res.status(200).json({
      success: true,
      item: populatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 5. Move Item
exports.moveWorkspaceItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { parentId } = req.body; // Target folder ID or null (root)

    const item = await WorkspaceItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Workspace item not found"
      });
    }

    const room = await checkRoomAccess(item.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this item"
      });
    }

    if (!canModifyItem(room, item, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to move this item. Only the creator or room administrators can modify it."
      });
    }

    // Check parent constraints
    if (parentId) {
      const parent = await WorkspaceItem.findById(parentId);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: "Target parent folder not found"
        });
      }
      if (parent.roomId !== item.roomId) {
        return res.status(400).json({
          success: false,
          message: "Target parent folder belongs to a different room"
        });
      }
      if (parent.type !== "folder") {
        return res.status(400).json({
          success: false,
          message: "Target parent must be a folder"
        });
      }

      // Check target parent folder write permission (members can only move items into folders they created)
      if (!canModifyItem(room, parent, req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to move items into this folder"
        });
      }
    }

    // Check duplicate name in target folder
    const existing = await WorkspaceItem.findOne({
      roomId: item.roomId,
      parentId: parentId || null,
      name: item.name,
      _id: { $ne: itemId }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An item named "${item.name}" already exists in the target directory`
      });
    }

    // Prevent cyclic movement (moving folder into itself or its descendant)
    if (item.type === "folder") {
      const hasCycle = await wouldCreateCycle(itemId, parentId);
      if (hasCycle) {
        return res.status(400).json({
          success: false,
          message: "Cannot move a folder into itself or one of its subfolders"
        });
      }
    }

    item.parentId = parentId || null;
    await item.save();

    const populatedItem = await WorkspaceItem.findById(item._id).populate("createdBy", "username avatar");

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `moved "${item.name}"`
    );

    res.status(200).json({
      success: true,
      item: populatedItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 6. Delete Item (Recursive)
exports.deleteWorkspaceItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const item = await WorkspaceItem.findById(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Workspace item not found"
      });
    }

    const room = await checkRoomAccess(item.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this item"
      });
    }

    if (!canModifyItem(room, item, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this item. Only the creator or room administrators can modify it."
      });
    }

    const name = item.name;
    const type = item.type;

    const deletedIds = await deleteItemRecursively(itemId);

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `deleted ${type} "${name}"`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${type} "${name}"`,
      deletedItemIds: deletedIds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 7. Save File Content
exports.saveFileContent = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { content } = req.body;

    const file = await WorkspaceItem.findById(fileId);
    if (!file || file.type !== "file") {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    const room = await checkRoomAccess(file.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to write to this file"
      });
    }

    if (!canModifyItem(room, file, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this file. Only the creator or room administrators can modify it."
      });
    }

    if (file.fileType === "asset") {
      return res.status(400).json({
        success: false,
        message: "Binary asset files (.jpg, .jpeg, .png) cannot be edited as plain text."
      });
    }

    if (content && content.split(/\r?\n/).length > 1000) {
      return res.status(400).json({
        success: false,
        message: "File content exceeds the maximum limit of 1000 lines."
      });
    }

    const oldSize = Buffer.byteLength(file.content || "", "utf8");
    const newSize = Buffer.byteLength(content || "", "utf8");
    const sizeDelta = newSize - oldSize;
    if (sizeDelta > 0) {
      const { calculateRoomStorage } = require("../services/importService");
      const { MAX_ROOM_STORAGE } = require("../utils/importRules");
      const storageInfo = await calculateRoomStorage(file.roomId);
      if (storageInfo.currentUsage + sizeDelta > MAX_ROOM_STORAGE) {
        return res.status(400).json({
          success: false,
          message: "Room storage limit exceeded. Saving this file would exceed the 10 MB workspace limit."
        });
      }
    }

    file.content = content;
    await file.save();

    res.status(200).json({
      success: true,
      message: "File saved successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 8. Toggle File Entry Point
exports.setFileEntryPoint = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await WorkspaceItem.findById(fileId);
    if (!file || file.type !== "file") {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    const room = await checkRoomAccess(file.roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this file"
      });
    }

    if (!canModifyItem(room, file, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this file. Only the creator or room administrators can modify it."
      });
    }

    const wasEntryPoint = file.isEntryPoint;

    // Set all files in this room to false
    await WorkspaceItem.updateMany(
      { roomId: file.roomId, type: "file" },
      { isEntryPoint: false }
    );

    // Toggle: if it wasn't the entry point, make it the entry point.
    // If it was the entry point, it remains false (removed).
    if (!wasEntryPoint) {
      file.isEntryPoint = true;
      await file.save();
    }

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      !wasEntryPoint
        ? `set "${file.name}" as execution entry point`
        : `removed "${file.name}" as execution entry point`
    );

    res.status(200).json({
      success: true,
      isEntryPoint: !wasEntryPoint,
      message: !wasEntryPoint
        ? `Successfully set "${file.name}" as compilation entry point`
        : `Successfully removed "${file.name}" as compilation entry point`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 9. Get Room Activity History (Only Room Owner/Creator)
exports.getRoomHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const Room = require("../models/Room");
    const Activity = require("../models/Activity");

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Only Room Owner/Creator is authorized
    const isCreator = room.createdBy.toString() === req.user._id.toString();
    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the Room Owner is authorized to view room history"
      });
    }

    const history = await Activity.find({ room: room._id })
      .populate("user", "username email avatar")
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 10. Get All Workspace Files with Content (for Live Preview compilation)
exports.getWorkspaceContents = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this workspace"
      });
    }

    const items = await WorkspaceItem.find({ roomId, type: "file" })
      .select("name type parentId content language isEntryPoint")
      .lean();

    res.status(200).json({
      success: true,
      files: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 11. Get Authoritative Room Storage Usage (10 MB Limit)
exports.getRoomStorageUsage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view storage usage for this workspace"
      });
    }

    const { calculateRoomStorage } = require("../services/importService");
    const storageInfo = await calculateRoomStorage(roomId);

    res.status(200).json({
      success: true,
      storage: storageInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 12. Validate Import Batch (Pre-flight Inspection)
exports.validateImport = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { files = [] } = req.body;

    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this workspace"
      });
    }

    const { validateImportBatch } = require("../services/importService");
    const result = await validateImportBatch(roomId, room.language, files, req.user, room);

    res.status(200).json({
      success: true,
      validation: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 13. Execute Import Batch
exports.executeImport = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to import files into this workspace"
      });
    }

    const { executeImportBatch } = require("../services/importService");

    let files = [];
    let duplicateResolutions = {};

    // Check if multipart files were uploaded
    if (req.files && req.files.length > 0) {
      let pathsMap = {};
      if (req.body.paths) {
        try {
          pathsMap = typeof req.body.paths === "string" ? JSON.parse(req.body.paths) : req.body.paths;
        } catch {
          pathsMap = {};
        }
      }

      if (req.body.duplicateResolutions) {
        try {
          duplicateResolutions =
            typeof req.body.duplicateResolutions === "string"
              ? JSON.parse(req.body.duplicateResolutions)
              : req.body.duplicateResolutions;
        } catch {
          duplicateResolutions = {};
        }
      }

      files = req.files.map((f, idx) => {
        let relativePath = "";
        if (Array.isArray(pathsMap)) {
          relativePath = pathsMap[idx] || f.originalname || `file_${idx}`;
        } else if (typeof pathsMap === "object" && pathsMap !== null) {
          relativePath = pathsMap[idx] || pathsMap[f.originalname] || f.originalname || `file_${idx}`;
        } else {
          relativePath = f.originalname || `file_${idx}`;
        }

        const ext = path.extname(relativePath).toLowerCase();
        const isImg = [".jpg", ".jpeg", ".png"].includes(ext);

        return {
          name: path.basename(relativePath),
          relativePath,
          buffer: f.buffer,
          content: isImg ? (f.buffer ? `data:${ext === ".png" ? "image/png" : "image/jpeg"};base64,${f.buffer.toString("base64")}` : "") : (f.buffer ? f.buffer.toString("utf8") : ""),
          size: f.size
        };
      });
    } else if (req.body.files && Array.isArray(req.body.files)) {
      // JSON body upload
      files = req.body.files;
      duplicateResolutions = req.body.duplicateResolutions || {};
    } else {
      return res.status(400).json({
        success: false,
        message: "No files provided for import"
      });
    }

    const result = await executeImportBatch(
      roomId,
      room.language,
      files,
      duplicateResolutions,
      req.user,
      room
    );

    res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Import execution failed"
    });
  }
};

// 14. Serve Workspace Binary Asset (Stream with Security Headers)
exports.serveWorkspaceAsset = async (req, res) => {
  try {
    const { roomId, assetId } = req.params;

    const room = await checkRoomAccess(roomId, req.user._id);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access assets in this workspace"
      });
    }

    const item = await WorkspaceItem.findOne({ _id: assetId, roomId, type: "file" });
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    const mimeType = item.mimeType || "application/octet-stream";

    // 1. Try streaming from physical disk
    if (item.storageKey) {
      const diskPath = path.join(__dirname, "../uploads/workspace_assets", item.storageKey);
      if (fs.existsSync(diskPath)) {
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        return fs.createReadStream(diskPath).pipe(res);
      }
    }

    // 2. Fallback to base64 content if disk file was moved/cached
    if (item.content && item.content.startsWith("data:")) {
      const base64Data = item.content.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    }

    return res.status(404).json({
      success: false,
      message: "Asset binary data unavailable"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to serve asset"
    });
  }
};
