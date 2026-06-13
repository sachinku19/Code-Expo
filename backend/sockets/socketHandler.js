const Room = require("../models/Room");
const Message = require("../models/Message");
const WorkspaceItem = require("../models/WorkspaceItem");
const { executeCode } = require("../services/jdoodleService");

// Import Collaboration models
const LineOwnership = require("../models/LineOwnership");
const Version = require("../models/Version");
const EditActivity = require("../models/EditActivity");

// Store online users by room
const roomUsers = {};
// Store active interactive child execution processes
const activeExecutions = {};

// Collaboration caches and batch queues
const activeCursors = {};
const activeOwnerships = {};
const pendingOwnershipSaves = {};

// High-frequency socket database write throttling caches
const lastFileWriteTimes = {};
const lastRoomActivityTimes = {};

const saveOwnershipToDB = (roomId, fileId) => {
  const fileKey = fileId || "null";
  const key = `${roomId}:${fileKey}`;
  if (pendingOwnershipSaves[key]) return;

  pendingOwnershipSaves[key] = setTimeout(async () => {
    delete pendingOwnershipSaves[key];
    const memLines = activeOwnerships[roomId]?.[fileKey];
    if (!memLines) return;

    try {
      await LineOwnership.findOneAndUpdate(
        { roomId, fileId: fileId || null },
        { lines: memLines },
        { upsert: true, new: true }
      );
      console.log(`💾 Saved line ownership to DB for ${key}`);
    } catch (error) {
      console.error("Failed to save line ownership to DB:", error.message);
    }
  }, 3000);
};

const getOrInitializeOwnership = async (roomId, fileId) => {
  const fileKey = fileId || "null";
  if (!activeOwnerships[roomId]) {
    activeOwnerships[roomId] = {};
  }
  if (!activeOwnerships[roomId][fileKey]) {
    const ownership = await LineOwnership.findOne({ roomId, fileId: fileId || null });
    activeOwnerships[roomId][fileKey] = ownership ? ownership.lines : [];
  }
  return activeOwnerships[roomId][fileKey];
};

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    // Register user globally for direct notifications
    socket.on("register-user", (userId) => {
      if (!userId) return;
      socket.join(String(userId));
      console.log(`👤 User registered for notifications: ${userId} (${socket.id})`);
    });

    // ======================
    // JOIN ROOM
    // ======================
    socket.on("join-room", ({
      roomId,
      username,
      userId,
      isOwner,
      avatar
    }) => {

      socket.roomId = roomId;
      socket.username = username;
      socket.userId = userId;

      // Create room if not exists
      if (!roomUsers[roomId]) {
        roomUsers[roomId] = [];
      }

      // Check if this specific socket is already registered
      const socketAlreadyInRoom = roomUsers[roomId].some(
        (user) => user.socketId === socket.id
      );

      if (socketAlreadyInRoom) {
        // Same socket connection re-emitting join-room. Do not block.
        return;
      }

      // Check if there is an existing socket session for this user ID
      const existingUserIndex = roomUsers[roomId].findIndex(
        (user) => String(user.userId) === String(userId)
      );

      if (existingUserIndex !== -1) {
        const existingUser = roomUsers[roomId][existingUserIndex];

        // Forcefully disconnect/kick the previous socket session
        const oldSocket = io.sockets.sockets.get(existingUser.socketId);
        if (oldSocket) {
          oldSocket.emit("kicked", {
            message: "You have been disconnected because your account joined this room from another tab or window."
          });
          oldSocket.leave(roomId);

          // Broadcast user-left for the old socket so other clients clean it up!
          socket.to(roomId).emit("user-left", {
            socketId: existingUser.socketId,
            username: existingUser.username,
            message: `${existingUser.username} switched sessions.`
          });
        }

        // Remove the old socket user from roomUsers list
        roomUsers[roomId].splice(existingUserIndex, 1);
      }

      socket.join(roomId);

      roomUsers[roomId].push({
        socketId: socket.id,
        username,
        userId,
        isOwner,
        avatar: avatar || ""
      });

      console.log(
        `📌 ${username} joined room ${roomId}`
      );

      // Update participants
      io.to(roomId).emit(
        "room-users",
        roomUsers[roomId]
      );

      // Notify others
      socket.to(roomId).emit(
        "user-joined",
        {
          socketId: socket.id,
          username,
          type: "join",
          message: `${username} joined the room`
        }
      );
    });

    socket.on("join-request", async ({ roomId, userId, username, title }) => {
      try {
        const alreadyOnline = roomUsers[roomId]?.some(
          user => user.userId === userId
        );
        if (alreadyOnline) {
          socket.emit("already-online", {
            message: "You are already active in this room from another browser."
          });
          return;
        }

        const room = await Room.findOne({ roomId });
        if (room) {
          // Add to pendingRequests in database
          const requestExists = room.pendingRequests.some(r => r.user.toString() === userId);
          if (!requestExists) {
            room.pendingRequests.push({ user: userId, username });
            await room.save();
          }
        }

        const owner = roomUsers[roomId]?.find(
          user => user.isOwner
        );

        if (owner) {
          io.to(owner.socketId).emit("join-request", {
            roomId,
            userId,
            username,
            requesterSocketId: socket.id
          });
        }

        console.log(`${username} requested to join roomid ${roomId} `);
      } catch (err) {
        console.error("Socket join-request error:", err.message);
      }
    })


    //========
    //approve request
    //========
    socket.on(
      "approve-request",
      async ({
        roomId,
        userId,
        username,
        requesterSocketId
      }) => {
        try {
          console.log("APPROVE DATA:", { roomId, userId, username });
          const room = await Room.findOne({ roomId });

          if (!room) return;

          // Clean up from pendingRequests
          room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId);

          if (!room.participants.includes(userId)) {
            room.participants.push(userId);
          }

          room.lastActivity = Date.now();
          await room.save();

          // Log activity
          const { logActivity } = require("../controllers/activityControllers");
          await logActivity(userId, username || "User", room._id, room.title, "joined");

          // Broadcast to everyone (including dashboard sockets) so the approved user redirects
          io.emit("join-approved", {
            roomId,
            userId
          });
        } catch (err) {
          console.error(err);
        }
      }
    );

    // =============================
    // reject request
    // ============================
    socket.on("reject-request", async ({
      roomId,
      userId,
      requesterSocketId
    }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId);
          await room.save();
        }

        if (requesterSocketId) {
          io.to(requesterSocketId).emit("join-rejected", {
            roomId,
            userId,
            message: "Your join request was rejected"
          });
        }
      } catch (err) {
        console.error(err);
      }
    })

    // KICK USER FROM ROOM BY OWNER
    socket.on("kick-user", ({ roomId, userId }) => {
      try {
        console.log(`Owner requested to kick user ${userId} from room ${roomId}`);
        if (roomUsers[roomId]) {
          const usersToKick = roomUsers[roomId].filter(u => String(u.userId) === String(userId));
          if (usersToKick.length > 0) {
            usersToKick.forEach(userToKick => {
              const kickedSocket = io.sockets.sockets.get(userToKick.socketId);
              if (kickedSocket) {
                kickedSocket.emit("kicked", {
                  message: "You have been removed from this room by the owner."
                });
                kickedSocket.leave(roomId);
              }
            });

            const firstUser = usersToKick[0];

            // Remove from roomUsers list
            roomUsers[roomId] = roomUsers[roomId].filter(u => String(u.userId) !== String(userId));

            // Broadcast updated users to room
            io.to(roomId).emit("room-users", roomUsers[roomId]);

            // Notify others
            socket.to(roomId).emit("user-left", {
              socketId: firstUser.socketId,
              username: firstUser.username,
              message: `${firstUser.username} was removed from the room by the owner.`
            });
          }
        }
      } catch (err) {
        console.error("Socket kick-user error:", err.message);
      }
    });


    // ======================
    // LEAVE ROOM
    // ======================
    socket.on("leave-room", ({ roomId }) => {
      if (!roomUsers[roomId]) return;

      const userId = socket.userId;

      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      socket.leave(roomId);

      console.log(
        `👋 ${socket.username} left room ${roomId}`
      );

      // Update participants list
      io.to(roomId).emit(
        "room-users",
        roomUsers[roomId]
      );

      // Check if user has other connections left in the room
      const hasOtherConnections = userId && roomUsers[roomId].some(
        (user) => String(user.userId) === String(userId)
      );

      // Notify others only if it was the last connection
      if (!hasOtherConnections) {
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          username: socket.username,
          type: "leave",
          message: `${socket.username || "User"} left the room`
        });
      }

      // Delete room if empty
      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }
    });

    // ======================
    // ROOM DELETED
    // ======================
    socket.on("room-deleted", ({ roomId }) => {
      const room = io.sockets.adapter.rooms.get(roomId);

      console.log("ROOM MEMBERS:", room);
      console.log("ROOM DELETED:", roomId);

      io.to(roomId).emit("room-deleted");
    });

    // ======================
    // REALTIME CODE SYNC (LEGACY SINGLE FILE)
    // ======================
    socket.on("code-change", async ({ roomId, code }) => {
      socket.to(roomId).emit(
        "receive-code",
        code
      );

      // Throttle database update to once every 30 seconds per room
      const now = Date.now();
      const lastUpdate = lastRoomActivityTimes[roomId] || 0;
      if (now - lastUpdate > 30000) {
        lastRoomActivityTimes[roomId] = now;
        try {
          await Room.updateOne({ roomId }, { lastActivity: now });
        } catch (err) {
          console.error("Socket code-change lastActivity update error:", err);
        }
      }
    });

    // Realtime code cursor movement (scoped by fileId if multi-file)
    socket.on("code-cursor-move", (data) => {
      if (!data || !data.roomId) return;
      socket.to(data.roomId).emit("code-cursor-move", {
        userId: socket.id,
        username: socket.username || data.username,
        position: data.position,
        color: data.color,
        fileId: data.fileId
      });
    });

    // ======================
    // SAVE CODE (LEGACY SINGLE FILE)
    // ======================
    socket.on("save-code", async (data) => {
      if (!data) return;

      const { roomId, code, userId, username } = data;

      if (!roomId) return;

      try {
        const room = await Room.findOne({ roomId });

        if (!room) return;

        room.code = code;
        room.lastActivity = Date.now();
        await room.save();

        console.log(
          `💾 Code saved for room ${roomId}`
        );

        if (userId && username) {
          const { logActivity } = require("../controllers/activityControllers");
          await logActivity(userId, username, room._id, room.title, "edited");
        }
      } catch (error) {
        console.log(
          "Save Code Error:",
          error.message
        );
      }
    });

    // ===================================
    // MULTI-FILE WORKSPACE SOCKET SYNCS
    // ===================================

    // 1. Real-time multi-file keystroke sync
    socket.on("file-content-changed", async ({ roomId, fileId, content }) => {
      socket.to(roomId).emit("receive-file-content", { fileId, content });

      const now = Date.now();
      const lastFileWrite = lastFileWriteTimes[fileId] || 0;
      const lastRoomActivity = lastRoomActivityTimes[roomId] || 0;

      try {
        // Throttle file saves in DB to once every 5 seconds
        if (now - lastFileWrite > 5000) {
          lastFileWriteTimes[fileId] = now;
          await WorkspaceItem.updateOne({ _id: fileId }, { content });
        }

        // Throttle room lastActivity updates to once every 30 seconds
        if (now - lastRoomActivity > 30000) {
          lastRoomActivityTimes[roomId] = now;
          await Room.updateOne({ roomId }, { lastActivity: now });
        }
      } catch (err) {
        console.error("Socket file-content-changed update error:", err.message);
      }
    });

    // 2. Real-time file content save (debounced/throttled on client)
    socket.on("save-file-content", async ({ roomId, fileId, content, userId, username }) => {
      try {
        const file = await WorkspaceItem.findById(fileId);
        if (!file) return;
        file.content = content;
        await file.save();

        const room = await Room.findOne({ roomId });
        if (room) {
          room.lastActivity = Date.now();
          await room.save();
          if (userId && username) {
            const { logActivity } = require("../controllers/activityControllers");
            await logActivity(userId, username, room._id, room.title, `saved changes to "${file.name}"`);
          }
        }
        console.log(`💾 File content saved for "${file.name}"`);
      } catch (err) {
        console.error("Socket save-file-content error:", err.message);
      }
    });

    // 3. Structure creation sync
    socket.on("file-created", ({ roomId, item }) => {
      io.to(roomId).emit("file-created", item);
    });

    socket.on("folder-created", ({ roomId, item }) => {
      io.to(roomId).emit("folder-created", item);
    });

    // 4. Structure deletion sync
    socket.on("file-deleted", ({ roomId, itemId }) => {
      socket.to(roomId).emit("file-deleted", itemId);
    });

    socket.on("folder-deleted", ({ roomId, itemId }) => {
      socket.to(roomId).emit("folder-deleted", itemId);
    });

    // 5. Structure rename sync
    socket.on("file-renamed", ({ roomId, itemId, name }) => {
      socket.to(roomId).emit("file-renamed", { itemId, name });
    });

    socket.on("folder-renamed", ({ roomId, itemId, name }) => {
      socket.to(roomId).emit("folder-renamed", { itemId, name });
    });

    // 6. Structure move sync
    socket.on("file-moved", ({ roomId, itemId, parentId }) => {
      socket.to(roomId).emit("file-moved", { itemId, parentId });
    });

    // 7. Compilation entry point sync
    socket.on("entry-point-changed", ({ roomId, fileId }) => {
      socket.to(roomId).emit("entry-point-changed", { fileId });
    });

    // ===================================
    // COLLABORATION AND OWNERSHIP SYNC
    // ===================================

    // Live User Cursors
    socket.on("cursor:update", (data) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      if (!activeCursors[roomId]) {
        activeCursors[roomId] = {};
      }
      activeCursors[roomId][socket.id] = {
        userId: socket.userId,
        username: socket.username,
        color: data.color,
        line: data.line,
        column: data.column,
        fileId: data.fileId || null
      };

      socket.to(roomId).emit("cursor:update", {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.username,
        color: data.color,
        line: data.line,
        column: data.column,
        fileId: data.fileId || null
      });
    });

    // Line Ownership Tracking & Delta Coordinates Shift Math
    socket.on("line:ownership:update", async (data) => {
      const { fileId, startLineNumber, endLineNumber, linesAdded, linesDeleted } = data;
      const roomId = socket.roomId;
      if (!roomId) return;

      const fileKey = fileId || "null";
      const currentLines = await getOrInitializeOwnership(roomId, fileId);

      const lineDiff = linesAdded - linesDeleted;
      let newLines = [];

      for (let line of currentLines) {
        if (line.lineNumber < startLineNumber) {
          newLines.push(line);
        } else if (line.lineNumber >= endLineNumber && lineDiff !== 0) {
          newLines.push({
            lineNumber: line.lineNumber + lineDiff,
            editedBy: line.editedBy,
            editedAt: line.editedAt
          });
        }
      }

      for (let i = 0; i <= linesAdded; i++) {
        newLines.push({
          lineNumber: startLineNumber + i,
          editedBy: {
            userId: data.userId || socket.userId,
            username: data.username || socket.username
          },
          editedAt: new Date()
        });
      }

      const uniqueLines = {};
      for (let line of newLines) {
        if (!uniqueLines[line.lineNumber] || new Date(line.editedAt) > new Date(uniqueLines[line.lineNumber].editedAt)) {
          uniqueLines[line.lineNumber] = line;
        }
      }

      const sorted = Object.values(uniqueLines).sort((a, b) => a.lineNumber - b.lineNumber);
      activeOwnerships[roomId][fileKey] = sorted;

      io.to(roomId).emit("line:ownership:update", {
        fileId: fileId || null,
        lines: sorted
      });

      saveOwnershipToDB(roomId, fileId);
    });

    // Collaborative Edit Activity feed log
    socket.on("activity:add", async (data) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const currentUsername = data.username || socket.username;
      try {
        const timestamp = new Date();

        // Broadcast real-time feed immediately to everyone in the room
        io.to(roomId).emit("activity:add", {
          username: currentUsername,
          action: data.action,
          lineNumber: data.lineNumber || null,
          timestamp
        });

        // Do NOT store temporary character keypresses to save database storage space.
        // Only store milestones / non-typing alerts (e.g. files created, restored, compiled).
        const isGenericTyping = data.action && (
          data.action.includes("edited line") ||
          data.action.includes("added ") ||
          data.action.includes("deleted ")
        );

        if (!isGenericTyping) {
          await EditActivity.create({
            roomId,
            fileId: data.fileId || null,
            username: currentUsername,
            action: data.action,
            lineNumber: data.lineNumber || null,
            timestamp
          });

          // Keep at most 50 milestones per room/file to optimize database storage
          const count = await EditActivity.countDocuments({ roomId, fileId: data.fileId || null });
          if (count > 50) {
            const oldest = await EditActivity.find({ roomId, fileId: data.fileId || null })
              .sort({ timestamp: 1 })
              .limit(count - 50);
            const deleteIds = oldest.map(act => act._id);
            await EditActivity.deleteMany({ _id: { $in: deleteIds } });
          }
        }
      } catch (error) {
        console.error("activity:add error:", error.message);
      }
    });

    // Version Control Document State snapshots
    socket.on("version:create", async (data) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      try {
        const count = await Version.countDocuments({ roomId, fileId: data.fileId || null });
        const versionId = `v${count + 1}`;

        const version = await Version.create({
          roomId,
          fileId: data.fileId || null,
          versionId,
          timestamp: new Date(),
          editedBy: {
            userId: data.userId || socket.userId,
            username: data.username || socket.username
          },
          code: data.code
        });

        io.to(roomId).emit("version:create", version);
      } catch (error) {
        console.error("version:create error:", error.message);
      }
    });

    // Connect user presence listeners
    socket.on("user:join", (data) => {
      socket.roomId = data.roomId;
      socket.username = data.username;
      socket.userId = data.userId;
      socket.join(data.roomId);

      socket.to(data.roomId).emit("user:join", {
        socketId: socket.id,
        userId: data.userId,
        username: data.username
      });
    });

    socket.on("user:leave", (data) => {
      const roomId = socket.roomId || data.roomId;
      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit("user:leave", {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // ======================
    // CHAT
    // ======================
    socket.on(
      "send-message",
      async ({
        roomId,
        message,
        userId,
        username,
      }) => {
        try {
          const newMessage = await Message.create({
            roomId,
            sender: userId,
            username,
            message,
          });

          const populatedMessage = await newMessage.populate("sender", "username email avatar");

          io.to(roomId).emit(
            "Receive-Message",
            populatedMessage
          );

          // Update lastActivity and log activity
          const room = await Room.findOne({ roomId });
          if (room) {
            room.lastActivity = Date.now();
            await room.save();
            const { logActivity } = require("../controllers/activityControllers");
            await logActivity(userId, username, room._id, room.title, "chat");
          }
        } catch (error) {
          console.log(
            `🤬 Message Error: ${error.message}`
          );
        }
      }
    );

    socket.on(
      "delete-message",
      async ({ roomId, messageId, userId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          const room = await Room.findOne({ roomId });
          if (!room) return;

          const isMessageSender = message.sender.toString() === userId.toString();
          const isRoomOwner = room.createdBy.toString() === userId.toString();

          if (isMessageSender || isRoomOwner) {
            await Message.findByIdAndDelete(messageId);
            io.to(roomId).emit("message-deleted", { messageId });
            console.log(`🗑️ Message deleted: ${messageId} in room ${roomId}`);
          }
        } catch (error) {
          console.log(`🤬 Delete Message Error: ${error.message}`);
        }
      }
    );


    //=============================
    // whiteboard draw
    socket.on("draw", ({ roomId, x0, y0, x1, y1 }) => {
      socket.to(roomId).emit("draw", { x0, y0, x1, y1 });
    })

    // CLEAR WHITEBOARD
    socket.on("clear-board", ({ roomId }) => {
      io.to(roomId).emit(
        "clear-board"
      );
    });

    // ==============================
    // ADVANCED WHITEBOARD SOCKET EVENTS
    // ==============================

    // Cursor movement tracking
    socket.on("cursor-move", ({ roomId, x, y, username, color }) => {
      socket.to(roomId).emit("cursor-move", {
        socketId: socket.id,
        x,
        y,
        username,
        color
      });
    });

    // In-progress transient element update
    socket.on("draw-element-update", ({ roomId, element, isDrawing, userId }) => {
      socket.to(roomId).emit("draw-element-update", {
        element,
        isDrawing,
        userId,
        socketId: socket.id
      });
    });

    // Sync finished shapes/elements list
    socket.on("sync-whiteboard", ({ roomId, elements }) => {
      socket.to(roomId).emit("sync-whiteboard", {
        elements
      });
    });

    // Save whiteboard data to MongoDB
    socket.on("save-whiteboard", async (data) => {
      if (!data || !data.roomId) return;
      const { roomId, whiteboardData, userId, username } = data;
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          room.whiteboardData = typeof whiteboardData === 'string' ? whiteboardData : JSON.stringify(whiteboardData);
          room.lastActivity = Date.now();
          await room.save();
          console.log(`💾 Whiteboard saved for room ${roomId}`);

          if (userId && username) {
            const { logActivity } = require("../controllers/activityControllers");
            await logActivity(userId, username, room._id, room.title, "shared whiteboard");
          }
        }
      } catch (err) {
        console.error("Save Whiteboard Error:", err.message);
      }
    });

    // Whiteboard activity logs
    socket.on("whiteboard-activity", ({ roomId, username, avatar, action }) => {
      io.to(roomId).emit("whiteboard-activity", {
        username,
        avatar: avatar || "",
        action,
        id: Math.random().toString(36).substring(7),
        time: new Date()
      });
    });

    // Avatar change synchronization
    socket.on("avatar-updated", ({ userId, avatar }) => {
      console.log(`👤 Avatar updated for user ${userId}: ${avatar}`);

      // Update the user's presence avatar inside all active rooms
      Object.keys(roomUsers).forEach((roomId) => {
        let roomUpdated = false;
        roomUsers[roomId] = roomUsers[roomId].map((user) => {
          if (String(user.userId) === String(userId)) {
            roomUpdated = true;
            return { ...user, avatar };
          }
          return user;
        });

        if (roomUpdated) {
          io.to(roomId).emit("room-users", roomUsers[roomId]);
        }
      });

      // Broadcast a global update notification
      io.emit("user-avatar-updated", { userId, avatar });
    });

    // Layout sync
    socket.on("layout-change", ({ roomId, layoutMode }) => {
      socket.to(roomId).emit("layout-change", { layoutMode });
    });


    // ======================
    // DISCONNECT
    // ======================
    // Realtime Code Execution via JDoodle (Render deployment friendly)
    socket.on("execute-code", async (data) => {
      if (!data || !data.roomId || !data.language) {
        socket.emit("terminal-output", {
          text: "\r\n\x1b[31m[System Error] Invalid run parameters.\x1b[0m\r\n"
        });
        return;
      }

      const { roomId, language, activeFileId } = data;

      try {
        // Broadcast that execution is starting
        io.to(roomId).emit("terminal-output", {
          text: `\r\n\x1b[33m[System] Starting execution for ${language.toUpperCase()}...\x1b[0m\r\n`
        });

        // Log the execution activity to increment stats and award points
        const Room = require("../models/Room");
        const roomObj = await Room.findOne({ roomId });
        if (roomObj) {
          const { logActivity } = require("../controllers/activityControllers");
          await logActivity(socket.userId, socket.username, roomObj._id, roomObj.title, "executed");
          const User = require("../models/User");
          await User.findByIdAndUpdate(socket.userId, { $inc: { executionsCount: 1 } });
        }

        // 1. Fetch code and optional stdin from workspace/room
        let sourceCode = "";
        let stdin = "";

        const items = await WorkspaceItem.find({ roomId });
        const files = items.filter(item => item.type === "file");

        if (files.length > 0) {
          // Find the active file first, then check entryPoint, then defaults, then fallback by ext
          let entryPoint;
          if (activeFileId) {
            entryPoint = files.find((item) => item._id.toString() === activeFileId.toString());
          }
          if (!entryPoint) {
            entryPoint = files.find((item) => item.isEntryPoint);
          }

          // Fallbacks if no entry point configured
          if (!entryPoint) {
            const defaults = {
              javascript: "index.js",
              python: "main.py",
              cpp: "main.cpp",
              java: "Main.java"
            };
            const defaultName = defaults[language];
            entryPoint = files.find((item) => item.name === defaultName);
          }

          // If still no entry point, take first file of matching language extension
          if (!entryPoint) {
            const exts = {
              javascript: ".js",
              python: ".py",
              cpp: ".cpp",
              java: ".java"
            };
            const ext = exts[language];
            entryPoint = files.find((item) => item.name.endsWith(ext));
          }

          if (!entryPoint) {
            throw new Error(`No entry point selected or default file found for ${language}.`);
          }

          sourceCode = entryPoint.content || "";

          // Support standard input via input.txt file inside the workspace
          const inputItem = files.find(item => item.name === "input.txt");
          if (inputItem) {
            stdin = inputItem.content || "";
          }
        } else {
          // Fallback to legacy single file room code
          sourceCode = roomObj ? roomObj.code : "";
        }

        // 2. Execute via JDoodle
        const output = await executeCode(language, sourceCode, stdin);

        // Send output to the terminal
        io.to(roomId).emit("terminal-output", { text: output + "\r\n" });

        // Signal completion
        io.to(roomId).emit("terminal-exit", {
          code: 0,
          message: `\r\n\x1b[32m[System] Process finished.\x1b[0m\r\n`
        });

      } catch (error) {
        io.to(roomId).emit("terminal-output", {
          text: `\r\n\x1b[31m[System Error] ${error.message || String(error)}\x1b[0m\r\n`
        });
        io.to(roomId).emit("terminal-exit", {
          code: 1,
          message: `\r\n\x1b[31m[System] Process exited with errors.\x1b[0m\r\n`
        });
      }
    });

    // Receive interactive terminal input (informs user that interactive console input is disabled)
    socket.on("terminal-input", (data) => {
      if (!data || !data.input) return;
      const roomId = socket.roomId;
      if (roomId) {
        io.to(roomId).emit("terminal-output", {
          text: `\r\n\x1b[33m[System Tip] Interactive input is not supported in this environment. Please create a file named 'input.txt' in your workspace to supply stdin.\x1b[0m\r\n`
        });
        io.to(roomId).emit("terminal-exit", {
          code: 0,
          message: ""
        });
      }
    });

    // ======================
    // WEBRTC CALL SIGNALLING
    // ======================
    socket.on("join-call", (data) => {
      if (!data || !data.roomId) return;
      socket.to(data.roomId).emit("user-joined-call", {
        socketId: socket.id,
        username: socket.username || data.username,
        mediaType: data.mediaType
      });
    });

    socket.on("webrtc-offer", (data) => {
      if (!data || !data.targetSocketId) return;
      io.to(data.targetSocketId).emit("webrtc-offer", {
        senderSocketId: socket.id,
        offer: data.offer
      });
    });

    socket.on("webrtc-answer", (data) => {
      if (!data || !data.targetSocketId) return;
      io.to(data.targetSocketId).emit("webrtc-answer", {
        senderSocketId: socket.id,
        answer: data.answer
      });
    });

    socket.on("webrtc-ice-candidate", (data) => {
      if (!data || !data.targetSocketId) return;
      io.to(data.targetSocketId).emit("webrtc-ice-candidate", {
        senderSocketId: socket.id,
        candidate: data.candidate
      });
    });

    socket.on("leave-call", (data) => {
      if (!data || !data.roomId) return;
      socket.to(data.roomId).emit("user-left-call", {
        socketId: socket.id,
        username: socket.username
      });
    });

    socket.on("toggle-media", (data) => {
      if (!data || !data.roomId) return;
      socket.to(data.roomId).emit("user-toggle-media", {
        socketId: socket.id,
        isMuted: data.isMuted,
        isCameraOff: data.isCameraOff
      });
    });

    socket.on("disconnect", () => {
      console.log(
        `❌ ${socket.username || "User"} disconnected`
      );

      const roomId = socket.roomId;
      // Clean up active cursor on disconnect
      if (roomId && activeCursors[roomId] && activeCursors[roomId][socket.id]) {
        delete activeCursors[roomId][socket.id];
        socket.to(roomId).emit("cursor:remove", { socketId: socket.id, userId: socket.userId });
      }

      // Clean up WebRTC call state
      if (roomId) {
        socket.to(roomId).emit("user-left-call", {
          socketId: socket.id,
          username: socket.username
        });
      }

      // Clean up running process on disconnect
      if (activeExecutions[socket.id]) {
        try {
          const execution = activeExecutions[socket.id];
          execution.child.kill("SIGKILL");
          removeDirectoryRecursively(execution.executionDir);
        } catch (e) {
          console.error("Disconnect cleanup error:", e);
        }
        delete activeExecutions[socket.id];
      }

      if (roomId && roomUsers[roomId]) {
        const userId = socket.userId;

        roomUsers[roomId] = roomUsers[roomId].filter(
          (user) => user.socketId !== socket.id
        );

        io.to(roomId).emit(
          "room-users",
          roomUsers[roomId]
        );

        // Check if user has other connections left in the room
        const hasOtherConnections = userId && roomUsers[roomId].some(
          (user) => String(user.userId) === String(userId)
        );

        // Notify others only if it was the last connection
        if (!hasOtherConnections) {
          socket.to(roomId).emit("user-left", {
            socketId: socket.id,
            username: socket.username,
          });
          socket.to(roomId).emit("user:leave", {
            socketId: socket.id,
            userId: socket.userId,
            username: socket.username
          });
        }

        if (roomUsers[roomId].length === 0) {
          delete roomUsers[roomId];
        }
      }
    });
  });
};


socketHandler.roomUsers = roomUsers;
module.exports = socketHandler;