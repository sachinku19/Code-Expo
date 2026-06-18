const mongoose = require("mongoose");
const Room = require("../models/Room");
const WorkspaceItem = require("../models/WorkspaceItem");

const createRoom = async (req, res) => {

    try {
        const { title, language, isPrivate } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        //generate unique room id
        const roomId = Math.random().toString(36).substring(2, 8);

        const room = await Room.create({
            roomId,
            title,
            language: language || "javascript",
            isPrivate,
            createdBy: req.user._id,
            participants: [req.user._id]
        });

        // Create a default file for the room workspace
        const roomLanguage = (language || "javascript").toLowerCase();
        const defaults = {
            javascript: {
                name: "index.js",
                content: `// 🚀 Welcome to CodeExpo Collaborative Editor!\n// You are in an isolated, secure Docker sandbox environment.\n// Start coding your JavaScript application here...\n\nconsole.log("Welcome to your CodeExpo JavaScript workspace!");\n`
            },
            python: {
                name: "main.py",
                content: `# 🚀 Welcome to CodeExpo Collaborative Editor!\n# You are in an isolated, secure Docker sandbox environment.\n# Start coding your Python application here...\n\nprint("Welcome to your CodeExpo Python workspace!")\n`
            },
            cpp: {
                name: "main.cpp",
                content: `// 🚀 Welcome to CodeExpo Collaborative Editor!\n// You are in an isolated, secure Docker sandbox environment.\n// Start coding your C++ application here...\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Welcome to your CodeExpo C++ workspace!" << endl;\n    return 0;\n}\n`
            },
            java: {
                name: "Main.java",
                content: `// 🚀 Welcome to CodeExpo Collaborative Editor!\n// You are in an isolated, secure Docker sandbox environment.\n// Start coding your Java application here...\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to your CodeExpo Java workspace!");\n    }\n}\n`
            }
        };

        const defaultFile = defaults[roomLanguage];
        if (defaultFile) {
            await WorkspaceItem.create({
                roomId,
                name: defaultFile.name,
                type: "file",
                content: defaultFile.content,
                language: roomLanguage,
                isEntryPoint: true,
                createdBy: req.user._id
            });
        }

        res.status(201).json({
            success: true,
            message: "Room created successfully",
            room
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const joinRoom = async (req, res) => {

    try {
        const { roomId } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID required"
            });
        }
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // Owner can always join, and previously approved participants can join directly
        const isOwner = room.createdBy.toString() === req.user._id.toString();
        const alreadyjoined = room.participants.some(participant =>
            participant.toString() === req.user._id.toString()
        );

        if (isOwner || alreadyjoined) {
            return res.status(200).json({
                success: true,
                room
            });
        }

        if (room.isPrivate) {
            return res.status(200).json({
                success: true,
                requiresApproval: true,
                message: "Waiting for approval"
            });
        }

        if (!alreadyjoined) {
            room.participants.push(req.user._id);
            await room.save();
        }

        res.status(200).json({
            success: true,
            message: "Joined room successfully",
            room
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

}

const getRoom = async (req, res) => {

    try {
        const { roomId } = req.params;
        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID required"
            });
        }

        //find room
        const room = await Room.findOne({ roomId })
            .populate("createdBy", "username email avatar")
            .populate("participants", "username email avatar");

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        //send responses
        res.status(200).json({
            success: true,
            room
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


// leave room
const leaveRoom = async (req, res) => {

    try {
        const { roomId } = req.params;

        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        room.participants = room.participants.filter((participants) => participants.toString() !== req.user._id.toString());
        await room.save();

        res.status(200).json({
            success: true,
            message: "Left room successfuly",
            user: req.user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room Does Not Exist"
            });
        }

        //check creater
        if (req.user._id.toString() !== room.createdBy.toString()) {
            return res.status(403).json({
                success: false,
                message: "Only Owner can delete this group"
            });
        }

        await room.deleteOne();

        res.status(200).json({
            success: true,
            message: "Group deleted"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

const getUserRoomsHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const rooms = await Room.find({
            $or: [
                { createdBy: userId },
                { participants: userId }
            ]
        })
            .populate("createdBy", "username email avatar")
            .populate("participants", "username email avatar")
            .sort({ updatedAt: -1 });

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        const RoomLike = require("../models/RoomLike");

        const roomsWithCount = await Promise.all(rooms.map(async (room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = await RoomLike.countDocuments({ room: room._id });
            const roomLikes = await RoomLike.find({ room: room._id }).populate("user", "username avatar email").select("user");
            const likedBy = roomLikes.map(l => l.user).filter(Boolean);
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount,
                likedBy
            };
        }));

        res.status(200).json({
            success: true,
            rooms: roomsWithCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getLiveRooms = async (req, res) => {
    try {
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const liveRoomIds = Object.keys(roomUsers).filter(
            (roomId) => roomUsers[roomId] && roomUsers[roomId].length > 0
        );

        const rooms = await Room.find({
            roomId: { $in: liveRoomIds }
        })
            .populate("createdBy", "username email avatar")
            .populate("participants", "username email avatar");

        const filteredRooms = rooms.filter(room => {
            if (!room.isPrivate) return true;
            const isOwner = room.createdBy?._id.toString() === req.user._id.toString();
            const isParticipant = room.participants?.some(p => p._id.toString() === req.user._id.toString());
            return isOwner || isParticipant;
        });

        const RoomLike = require("../models/RoomLike");
        const roomsWithCount = await Promise.all(filteredRooms.map(async (room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = await RoomLike.countDocuments({ room: room._id });
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount
            };
        }));

        res.status(200).json({
            success: true,
            rooms: roomsWithCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getRecentRooms = async (req, res) => {
    try {
        const userId = req.user._id;
        const rooms = await Room.find({
            $or: [
                { createdBy: userId },
                { participants: userId }
            ]
        })
            .populate("createdBy", "username email avatar")
            .populate("participants", "username email avatar")
            .sort({ lastActivity: -1 })
            .limit(10);

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        const RoomLike = require("../models/RoomLike");

        const roomsWithCount = await Promise.all(rooms.map(async (room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = await RoomLike.countDocuments({ room: room._id });
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount
            };
        }));

        res.status(200).json({
            success: true,
            rooms: roomsWithCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const rooms = await Room.find({
            createdBy: userId,
            "pendingRequests.0": { $exists: true }
        }).populate("pendingRequests.user", "username email avatar");

        let allRequests = [];
        rooms.forEach(room => {
            room.pendingRequests.forEach(reqObj => {
                allRequests.push({
                    roomId: room.roomId,
                    roomTitle: room.title,
                    requestId: reqObj._id,
                    user: reqObj.user,
                    username: reqObj.username,
                    timestamp: reqObj.timestamp
                });
            });
        });

        res.status(200).json({
            success: true,
            requests: allRequests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const respondToJoinRequest = async (req, res) => {
    try {
        const { roomId, requesterId, action } = req.body; // action: 'accept' or 'reject'
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can manage requests" });
        }

        // Remove from pending
        room.pendingRequests = room.pendingRequests.filter(
            r => r.user.toString() !== requesterId
        );

        // Remove from rejected just in case
        room.rejectedRequests = (room.rejectedRequests || []).filter(
            r => r.user.toString() !== requesterId
        );

        if (action === "accept") {
            if (!room.participants.includes(requesterId)) {
                room.participants.push(requesterId);
            }
        } else if (action === "reject") {
            if (!room.rejectedRequests) room.rejectedRequests = [];
            const alreadyRejected = room.rejectedRequests.some(r => r.user.toString() === requesterId);
            if (!alreadyRejected) {
                room.rejectedRequests.push({ user: requesterId, username: "User" });
            }
        }

        await room.save();

        res.status(200).json({
            success: true,
            message: `Request ${action}ed successfully`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getMySentRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Rooms where current user has a pending request
        const pendingRooms = await Room.find({
            "pendingRequests.user": userId
        }).populate("createdBy", "username email avatar");

        // 2. Rooms where current user has a rejected request
        const rejectedRooms = await Room.find({
            "rejectedRequests.user": userId
        }).populate("createdBy", "username email avatar");

        // 3. Private rooms where current user is a participant but not the creator (accepted request)
        const acceptedRooms = await Room.find({
            isPrivate: true,
            createdBy: { $ne: userId },
            participants: userId
        }).populate("createdBy", "username email avatar");

        const requests = [
            ...pendingRooms.map(r => ({
                roomId: r.roomId,
                title: r.title,
                language: r.language,
                isPrivate: r.isPrivate,
                createdBy: r.createdBy,
                status: "pending",
                updatedAt: r.updatedAt
            })),
            ...rejectedRooms.map(r => ({
                roomId: r.roomId,
                title: r.title,
                language: r.language,
                isPrivate: r.isPrivate,
                createdBy: r.createdBy,
                status: "rejected",
                updatedAt: r.updatedAt
            })),
            ...acceptedRooms.map(r => ({
                roomId: r.roomId,
                title: r.title,
                language: r.language,
                isPrivate: r.isPrivate,
                createdBy: r.createdBy,
                status: "accepted",
                updatedAt: r.updatedAt
            }))
        ];

        // Sort by updatedAt descending
        requests.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        res.status(200).json({
            success: true,
            requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const removeUser = async (req, res) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        // Only owner can remove
        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can remove participants" });
        }

        // Owner cannot remove themselves
        if (room.createdBy.toString() === userId.toString()) {
            return res.status(400).json({ success: false, message: "Owner cannot be removed from the room" });
        }

        // Remove user from participants list
        room.participants = room.participants.filter(p => p.toString() !== userId.toString());

        // Also remove from pending requests just in case
        room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId.toString());

        await room.save();

        res.status(200).json({
            success: true,
            message: "User removed successfully from the room"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllPublicRooms = async (req, res) => {
    try {
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        const RoomLike = require("../models/RoomLike");

        const rooms = await Room.find({ isPrivate: false })
            .populate("createdBy", "username email avatar")
            .populate("participants", "username email avatar")
            .sort({ createdAt: -1 });

        const roomsWithCount = await Promise.all(rooms.map(async (room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = await RoomLike.countDocuments({ room: room._id });
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount
            };
        }));

        res.status(200).json({
            success: true,
            rooms: roomsWithCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
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
    getAllPublicRooms
}