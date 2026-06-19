const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const checkRoomRole = require("../middleware/roleMiddleware");
const {
    createRoom,
    joinRoom,
    getRoom,
    leaveRoom,
    deleteRoom,
    getUserRoomsHistory,
    getLiveRooms,
    getRecentRooms,
    getPendingRequests,
    respondToJoinRequest,
    getMySentRequests,
    removeUser,
    getAllPublicRooms,
    promoteUser,
    demoteUser,
    changeRole,
    kickUser,
    muteUser,
    getRoomMembers
} = require("../controllers/roomControllers");

const router = express.Router();

router.post("/create", auth_protect, createRoom);
router.post("/join", auth_protect, joinRoom);
router.get("/recent", auth_protect, getRecentRooms);
router.get("/all/public", auth_protect, getAllPublicRooms);
router.get("/requests/pending", auth_protect, getPendingRequests);
router.get("/requests/my-requests", auth_protect, getMySentRequests);
router.post("/requests/respond", auth_protect, respondToJoinRequest);
router.post("/remove-user", auth_protect, removeUser);
router.get("/user/history", auth_protect, getUserRoomsHistory);
router.get("/active/live", auth_protect, getLiveRooms);

// RBAC Routes
router.post("/promote", auth_protect, checkRoomRole(["OWNER"]), promoteUser);
router.post("/demote", auth_protect, checkRoomRole(["OWNER"]), demoteUser);
router.post("/role", auth_protect, checkRoomRole(["OWNER"]), changeRole);
router.post("/kick", auth_protect, checkRoomRole(["OWNER", "MODERATOR"]), kickUser);
router.post("/mute", auth_protect, checkRoomRole(["OWNER", "MODERATOR"]), muteUser);
router.get("/:roomId/members", auth_protect, checkRoomRole(["OWNER", "MODERATOR", "MEMBER", "VIEWER"]), getRoomMembers);

router.get("/:roomId", auth_protect, getRoom);
router.delete("/leave/:roomId", auth_protect, leaveRoom);
router.delete("/delete/:roomId", auth_protect, deleteRoom);

module.exports = router;