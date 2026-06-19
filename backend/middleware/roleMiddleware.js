const Room = require("../models/Room");

/**
 * Middleware to check if the authenticated user has the required role inside a room.
 * @param {string[]} allowedRoles - List of allowed roles (OWNER, MODERATOR, MEMBER, VIEWER)
 */
const checkRoomRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const roomId = req.params.roomId || req.body.roomId;
      if (!roomId) {
        return res.status(400).json({ success: false, message: "Room ID is required" });
      }

      const room = await Room.findOne({ roomId });
      if (!room) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }

      const userId = req.user._id;
      const participant = room.participants.find(p => p.user.toString() === userId.toString());

      if (!participant) {
        return res.status(403).json({ success: false, message: "You are not a participant in this room" });
      }

      if (!allowedRoles.includes(participant.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Required roles: ${allowedRoles.join(", ")}` 
        });
      }

      // Attach data to request for subsequent middleware or controller actions
      req.room = room;
      req.userParticipant = participant;
      req.userRole = participant.role;

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
};

module.exports = checkRoomRole;
