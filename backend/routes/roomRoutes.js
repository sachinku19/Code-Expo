const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
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
    removeUser,
    getAllPublicRooms
} = require("../controllers/roomControllers");

const router = express.Router();


router.post("/create", auth_protect, createRoom);
router.post("/join", auth_protect, joinRoom);
router.get("/recent", auth_protect, getRecentRooms);
router.get("/all/public", auth_protect, getAllPublicRooms);
router.get("/requests/pending", auth_protect, getPendingRequests);
router.post("/requests/respond", auth_protect, respondToJoinRequest);
router.post("/remove-user", auth_protect, removeUser);
router.get("/user/history", auth_protect, getUserRoomsHistory);
router.get("/active/live", auth_protect, getLiveRooms);
router.get("/:roomId", auth_protect, getRoom);
router.delete("/leave/:roomId", auth_protect, leaveRoom);
router.delete("/delete/:roomId", auth_protect, deleteRoom);

module.exports = router;