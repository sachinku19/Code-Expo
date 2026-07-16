// Socket.IO namespace handler for '/planner'
module.exports = (io) => {
  const plannerNs = io.of("/planner");

  // In-memory tracker for user presence: roomId -> Array of { socketId, userId, username, action, taskId, field }
  const activePresence = new Map();

  plannerNs.on("connection", (socket) => {
    let currentRoomId = null;
    let currentUserId = null;
    let currentUsername = null;

    // Join room planner socket channel
    socket.on("join-room", ({ roomId, userId, username }) => {
      socket.join(roomId);
      currentRoomId = roomId;
      currentUserId = userId;
      currentUsername = username;

      // Initialize presence array if needed
      if (!activePresence.has(roomId)) {
        activePresence.set(roomId, []);
      }

      // Broadcast existing presence to the newly joined user
      socket.emit("presence-list", activePresence.get(roomId));
    });

    // Handle user updating their presence status (e.g. editing, reviewing, checklist)
    socket.on("presence-status", ({ taskId, field, action }) => {
      if (!currentRoomId || !currentUserId) return;

      const presenceList = activePresence.get(currentRoomId) || [];
      
      // Remove any existing presence entry for this user in this room
      const filtered = presenceList.filter(p => p.userId !== currentUserId);

      if (action && action !== "idle") {
        filtered.push({
          socketId: socket.id,
          userId: currentUserId,
          username: currentUsername,
          action, // "editing", "reviewing", "updating_checklist"
          taskId,
          field // e.g. "title", "description", "checklist"
        });
      }

      activePresence.set(currentRoomId, filtered);
      
      // Broadcast updated presence list to everyone in the room
      plannerNs.to(currentRoomId).emit("presence-list", filtered);
    });

    // Custom checklist live edits
    socket.on("checklist-item-edit", ({ taskId, itemId, text }) => {
      if (!currentRoomId) return;
      // Broadcast to other users to sync checklist item text edits optimistically
      socket.to(currentRoomId).emit("checklist-item-edit-broadcast", { taskId, itemId, text });
    });

    // Leave room planner
    socket.on("leave-room", () => {
      if (currentRoomId) {
        socket.leave(currentRoomId);
        
        // Clean presence
        const presenceList = activePresence.get(currentRoomId) || [];
        const filtered = presenceList.filter(p => p.socketId !== socket.id);
        activePresence.set(currentRoomId, filtered);
        
        plannerNs.to(currentRoomId).emit("presence-list", filtered);
        currentRoomId = null;
      }
    });

    socket.on("disconnect", () => {
      if (currentRoomId) {
        const presenceList = activePresence.get(currentRoomId) || [];
        const filtered = presenceList.filter(p => p.socketId !== socket.id);
        
        if (filtered.length === 0) {
          activePresence.delete(currentRoomId);
        } else {
          activePresence.set(currentRoomId, filtered);
        }
        
        plannerNs.to(currentRoomId).emit("presence-list", filtered);
      }
    });
  });
};
