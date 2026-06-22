const Room = require("../models/Room");
const WorkspaceItem = require("../models/WorkspaceItem");
const LineOwnership = require("../models/LineOwnership");
const Version = require("../models/Version");
const EditActivity = require("../models/EditActivity");

// Helper: Check if user has access to room
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

// 1. Get line ownership
exports.getLineOwnership = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileId } = req.query; // fileId is optional (null for single-file rooms)
    const userId = req.user._id;

    const room = await checkRoomAccess(roomId, userId);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room"
      });
    }

    const ownership = await LineOwnership.findOne({
      roomId,
      fileId: fileId || null
    });

    res.status(200).json({
      success: true,
      ownership: ownership ? ownership.lines : []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Get version snapshots history
exports.getVersionHistory = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileId } = req.query;
    const userId = req.user._id;

    const room = await checkRoomAccess(roomId, userId);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room"
      });
    }

    const versions = await Version.find({
      roomId,
      fileId: fileId || null
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      versions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. Get recent edit activities
exports.getEditActivities = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileId } = req.query;
    const userId = req.user._id;

    const room = await checkRoomAccess(roomId, userId);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room"
      });
    }

    const activities = await EditActivity.find({
      roomId,
      fileId: fileId || null
    }).sort({ timestamp: -1 }).limit(100);

    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 4. Restore version snapshot
exports.restoreVersion = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fileId, versionId } = req.body;
    const userId = req.user._id;

    const room = await checkRoomAccess(roomId, userId);
    if (!room) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room"
      });
    }

    // Find the version content
    const version = await Version.findOne({
      roomId,
      fileId: fileId || null,
      versionId
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: "Version snapshot not found"
      });
    }

    // Update the actual file contents (either WorkspaceItem or Room legacy code)
    if (fileId) {
      const file = await WorkspaceItem.findById(fileId);
      if (!file) {
        return res.status(404).json({
          success: false,
          message: "Workspace file not found"
        });
      }
      file.content = version.code;
      await file.save();
    } else {
      room.code = version.code;
      await room.save();
    }

    // Broadcast content update to active Socket connections
    const io = req.app.get("io");
    if (io) {
      if (fileId) {
        io.to(roomId).emit("receive-file-content", {
          fileId,
          content: version.code
        });
      } else {
        io.to(roomId).emit("receive-code", version.code);
      }
      
      // Log and emit a restore activity
      const activityText = `restored file content to snapshot from ${new Date(version.timestamp).toLocaleString()}`;
      await EditActivity.create({
        roomId,
        fileId: fileId || null,
        username: req.user.username,
        action: activityText,
        timestamp: new Date()
      });

      // Keep at most 50 milestones per room/file to optimize database storage
      const count = await EditActivity.countDocuments({ roomId, fileId: fileId || null });
      if (count > 50) {
        const oldest = await EditActivity.find({ roomId, fileId: fileId || null })
          .sort({ timestamp: 1 })
          .limit(count - 50);
        const deleteIds = oldest.map(act => act._id);
        await EditActivity.deleteMany({ _id: { $in: deleteIds } });
      }

      io.to(roomId).emit("activity:add", {
        username: req.user.username,
        action: activityText,
        lineNumber: null,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      code: version.code,
      message: "Version restored successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
