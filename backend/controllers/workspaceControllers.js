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

// Helper: Recursively delete items
const deleteItemRecursively = async (itemId) => {
  const item = await WorkspaceItem.findById(itemId);
  if (!item) return;

  if (item.type === "folder") {
    const children = await WorkspaceItem.find({ parentId: itemId });
    for (const child of children) {
      await deleteItemRecursively(child._id);
    }
  }

  await WorkspaceItem.findByIdAndDelete(itemId);
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
    }

    // Check for duplicate name in same directory
    const existing = await WorkspaceItem.findOne({ roomId, parentId, name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An item named "${name}" already exists in this directory`
      });
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

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `created ${type} "${name}"`
    );

    res.status(201).json({
      success: true,
      item: newItem
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

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `renamed "${oldName}" to "${name}"`
    );

    res.status(200).json({
      success: true,
      item
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

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `moved "${item.name}"`
    );

    res.status(200).json({
      success: true,
      item
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

    const name = item.name;
    const type = item.type;

    await deleteItemRecursively(itemId);

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `deleted ${type} "${name}"`
    );

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${type} "${name}"`
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

    // Set all other files in this room to false
    await WorkspaceItem.updateMany(
      { roomId: file.roomId, type: "file" },
      { isEntryPoint: false }
    );

    // Set this file to true
    file.isEntryPoint = true;
    await file.save();

    logActivity(
      req.user._id,
      req.user.username,
      room._id,
      room.title,
      `set "${file.name}" as execution entry point`
    );

    res.status(200).json({
      success: true,
      message: `Successfully set "${file.name}" as compilation entry point`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
