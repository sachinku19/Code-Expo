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
            participants: [{ user: req.user._id, role: "OWNER" }]
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
                isEntryPoint: false,
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
            participant.user && participant.user.toString() === req.user._id.toString()
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
            room.participants.push({ user: req.user._id, role: "MEMBER" });
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
            .populate("participants.user", "username email avatar");

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

        const isOwner = room.createdBy.toString() === req.user._id.toString();
        if (isOwner) {
            return res.status(400).json({
                success: false,
                message: "Owner cannot leave the room. Please delete the room instead."
            });
        }

        room.participants = room.participants.filter((p) => p.user && p.user.toString() !== req.user._id.toString());
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
                { "participants.user": userId }
            ]
        })
            .populate("createdBy", "username email avatar")
            .populate("participants.user", "username email avatar")
            .populate("likes", "username email avatar")
            .sort({ updatedAt: -1 });

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount,
                likedBy
            };
        });

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
            .populate("participants.user", "username email avatar")
            .populate("likes", "username email avatar");

        const filteredRooms = rooms.filter(room => {
            if (!room.isPrivate) return true;
            const isOwner = room.createdBy?._id.toString() === req.user._id.toString();
            const isParticipant = room.participants?.some(p => p.user && p.user._id.toString() === req.user._id.toString());
            return isOwner || isParticipant;
        });

        const roomsWithCount = filteredRooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount,
                likedBy
            };
        });

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
                { "participants.user": userId }
            ]
        })
            .populate("createdBy", "username email avatar")
            .populate("participants.user", "username email avatar")
            .populate("likes", "username email avatar")
            .sort({ lastActivity: -1 })
            .limit(10);

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount,
                likedBy
            };
        });

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

        const userRoleObj = room.participants.find(p => p.user && p.user.toString() === req.user._id.toString());
        const userRole = userRoleObj ? userRoleObj.role : null;
        
        if (userRole !== "OWNER" && userRole !== "MODERATOR") {
            return res.status(403).json({ success: false, message: "Only owners or moderators can manage requests" });
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
            const alreadyParticipant = room.participants.some(p => p.user && p.user.toString() === requesterId.toString());
            if (!alreadyParticipant) {
                room.participants.push({ user: requesterId, role: "MEMBER" });
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
            "participants.user": userId
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

        const actor = room.participants.find(p => p.user && p.user.toString() === req.user._id.toString());
        if (!actor) {
            return res.status(403).json({ success: false, message: "You are not a participant in this room" });
        }

        const target = room.participants.find(p => p.user && p.user.toString() === userId.toString());
        if (!target) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (actor.role === "OWNER") {
            if (userId.toString() === room.createdBy.toString()) {
                return res.status(400).json({ success: false, message: "Owner cannot be removed from the room" });
            }
        } else if (actor.role === "MODERATOR") {
            if (target.role === "OWNER") {
                return res.status(403).json({ success: false, message: "Moderator cannot remove the owner" });
            }
            if (target.role === "MODERATOR") {
                return res.status(403).json({ success: false, message: "Moderator cannot remove another moderator" });
            }
        } else {
            return res.status(403).json({ success: false, message: "Access denied. Only owners and moderators can remove participants" });
        }

        // Remove user from participants list
        room.participants = room.participants.filter(p => p.user && p.user.toString() !== userId.toString());

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
            .populate("participants.user", "username email avatar")
            .populate("likes", "username email avatar")
            .sort({ createdAt: -1 });

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room.toObject(),
                activeUsersCount: activeUsers.length,
                activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                likesCount,
                likedBy
            };
        });

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

const promoteUser = async (req, res) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findOne({ roomId }).populate("participants.user", "username email avatar");
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can promote users" });
        }

        const participant = room.participants.find(p => p.user && p.user._id.toString() === userId.toString());
        if (!participant) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (participant.role === "OWNER") {
            return res.status(400).json({ success: false, message: "Owner role cannot be changed" });
        }

        participant.role = "MODERATOR";
        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        if (roomUsers[roomId]) {
            roomUsers[roomId].forEach(u => {
                if (String(u.userId) === String(userId)) {
                    u.role = "MODERATOR";
                }
            });
            const io = req.app.get("io");
            if (io) {
                io.to(roomId).emit("role-changed", { userId, role: "MODERATOR" });
                io.to(roomId).emit("member-promoted", { userId, username: participant.user?.username });
                io.to(roomId).emit("room-users", roomUsers[roomId]);
            }
        }

        res.status(200).json({
            success: true,
            message: "User promoted to Moderator successfully",
            participants: room.participants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const demoteUser = async (req, res) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findOne({ roomId }).populate("participants.user", "username email avatar");
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can demote users" });
        }

        const participant = room.participants.find(p => p.user && p.user._id.toString() === userId.toString());
        if (!participant) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (participant.role === "OWNER") {
            return res.status(400).json({ success: false, message: "Owner role cannot be changed" });
        }

        participant.role = "MEMBER";
        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        if (roomUsers[roomId]) {
            roomUsers[roomId].forEach(u => {
                if (String(u.userId) === String(userId)) {
                    u.role = "MEMBER";
                }
            });
            const io = req.app.get("io");
            if (io) {
                io.to(roomId).emit("role-changed", { userId, role: "MEMBER" });
                io.to(roomId).emit("member-demoted", { userId, username: participant.user?.username });
                io.to(roomId).emit("room-users", roomUsers[roomId]);
            }
        }

        res.status(200).json({
            success: true,
            message: "User demoted to Member successfully",
            participants: room.participants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const changeRole = async (req, res) => {
    try {
        const { roomId, userId, role } = req.body;

        if (!["MODERATOR", "MEMBER", "VIEWER"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role specified" });
        }

        const room = await Room.findOne({ roomId }).populate("participants.user", "username email avatar");
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        if (room.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the owner can change roles" });
        }

        const participant = room.participants.find(p => p.user && p.user._id.toString() === userId.toString());
        if (!participant) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (participant.role === "OWNER") {
            return res.status(400).json({ success: false, message: "Owner role cannot be changed" });
        }

        const oldRole = participant.role;
        participant.role = role;
        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        if (roomUsers[roomId]) {
            roomUsers[roomId].forEach(u => {
                if (String(u.userId) === String(userId)) {
                    u.role = role;
                }
            });
            const io = req.app.get("io");
            if (io) {
                io.to(roomId).emit("role-changed", { userId, role });
                io.to(roomId).emit("room-users", roomUsers[roomId]);

                if (oldRole !== "MODERATOR" && role === "MODERATOR") {
                    io.to(roomId).emit("member-promoted", { userId, username: participant.user?.username });
                } else if (oldRole === "MODERATOR" && role !== "MODERATOR") {
                    io.to(roomId).emit("member-demoted", { userId, username: participant.user?.username });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `User role changed to ${role} successfully`,
            participants: room.participants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const kickUser = async (req, res) => {
    try {
        const { roomId, userId } = req.body;
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        const actorId = req.user._id.toString();
        const actor = room.participants.find(p => p.user && p.user.toString() === actorId);
        if (!actor) {
            return res.status(403).json({ success: false, message: "You are not a participant in this room" });
        }

        const target = room.participants.find(p => p.user && p.user.toString() === userId.toString());
        if (!target) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (actor.role === "OWNER") {
            if (userId.toString() === room.createdBy.toString()) {
                return res.status(400).json({ success: false, message: "Owner cannot be kicked from the room" });
            }
        } else if (actor.role === "MODERATOR") {
            if (target.role === "OWNER") {
                return res.status(403).json({ success: false, message: "Moderator cannot kick the owner" });
            }
            if (target.role === "MODERATOR") {
                return res.status(403).json({ success: false, message: "Moderator cannot kick another moderator" });
            }
        } else {
            return res.status(403).json({ success: false, message: "Access denied. Only owners and moderators can kick users" });
        }

        room.participants = room.participants.filter(p => p.user && p.user.toString() !== userId.toString());
        room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId.toString());

        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        if (roomUsers[roomId]) {
            const usersToKick = roomUsers[roomId].filter(u => String(u.userId) === String(userId));
            const io = req.app.get("io");
            if (io && usersToKick.length > 0) {
                usersToKick.forEach(userToKick => {
                    const kickedSocket = io.sockets.sockets.get(userToKick.socketId);
                    if (kickedSocket) {
                        kickedSocket.emit("kicked", {
                            message: "You have been removed from this room by the owner or moderator."
                        });
                        kickedSocket.leave(roomId);
                    }
                });

                const firstUser = usersToKick[0];
                roomUsers[roomId] = roomUsers[roomId].filter(u => String(u.userId) !== String(userId));

                io.to(roomId).emit("room-users", roomUsers[roomId]);
                io.to(roomId).emit("user-left", {
                    socketId: firstUser.socketId,
                    username: firstUser.username,
                    message: `${firstUser.username} was removed from the room.`
                });
                io.to(roomId).emit("user-kicked", { userId });
            }
        }

        res.status(200).json({
            success: true,
            message: "User kicked successfully from the room"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const muteUser = async (req, res) => {
    try {
        const { roomId, userId, mute } = req.body;
        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        const actorId = req.user._id.toString();
        const actor = room.participants.find(p => p.user && p.user.toString() === actorId);
        if (!actor) {
            return res.status(403).json({ success: false, message: "You are not a participant in this room" });
        }

        const target = room.participants.find(p => p.user && p.user.toString() === userId.toString());
        if (!target) {
            return res.status(404).json({ success: false, message: "User is not a participant in this room" });
        }

        if (actor.role === "OWNER") {
            if (userId.toString() === room.createdBy.toString()) {
                return res.status(400).json({ success: false, message: "Owner cannot be muted" });
            }
        } else if (actor.role === "MODERATOR") {
            if (target.role === "OWNER") {
                return res.status(403).json({ success: false, message: "Moderator cannot mute the owner" });
            }
            if (target.role === "MODERATOR") {
                return res.status(403).json({ success: false, message: "Moderator cannot mute another moderator" });
            }
        } else {
            return res.status(403).json({ success: false, message: "Access denied. Only owners and moderators can mute users" });
        }

        const shouldMute = mute === true || mute === "true";
        console.log(`[MUTE_USER] Room: ${roomId}, User: ${userId}, Received mute param: ${mute} (type: ${typeof mute}), Resolved shouldMute: ${shouldMute}`);

        target.isMuted = shouldMute;
        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        if (roomUsers[roomId]) {
            roomUsers[roomId].forEach(u => {
                if (String(u.userId) === String(userId)) {
                    u.isMuted = shouldMute;
                }
            });
            const io = req.app.get("io");
            if (io) {
                io.to(roomId).emit("mute-status-changed", { userId, isMuted: shouldMute });
                io.to(roomId).emit("room-users", roomUsers[roomId]);
            }
        }

        res.status(200).json({
            success: true,
            message: `User chat successfully ${mute ? "muted" : "unmuted"}`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getRoomMembers = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId })
            .populate("participants.user", "username email avatar");

        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        res.status(200).json({
            success: true,
            members: room.participants
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const sendWorkspaceInvites = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userIds } = req.body;
        const currentUserId = req.user._id;
        const { createAndSendNotification } = require("./notificationControllers");

        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ success: false, message: "userIds array is required" });
        }

        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        const isOwner = room.createdBy.toString() === currentUserId.toString();
        const isParticipant = room.participants.some(p => p.user && p.user.toString() === currentUserId.toString());
        if (!isOwner && !isParticipant) {
            return res.status(403).json({ success: false, message: "Only room participants can send invites" });
        }

        const io = req.app.get("io");
        for (const targetId of userIds) {
            const isAlreadyJoined = room.participants.some(p => p.user && p.user.toString() === targetId.toString());
            if (!isAlreadyJoined && String(room.createdBy) !== String(targetId)) {
                await createAndSendNotification(targetId, currentUserId, "INVITE", "COLLABORATION", room._id, io);
            }
        }

        res.status(200).json({
            success: true,
            message: "Invites sent successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const acceptWorkspaceInvite = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user._id;

        const room = await Room.findOne({ roomId });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }

        const isOwner = room.createdBy.toString() === userId.toString();
        const alreadyJoined = room.participants.some(p => p.user && p.user.toString() === userId.toString());

        if (!isOwner && !alreadyJoined) {
            room.participants.push({ user: userId, role: "MEMBER" });
            await room.save();
            
            const io = req.app.get("io");
            if (io) {
                const populatedRoom = await Room.findOne({ roomId }).populate("participants.user", "username email avatar");
                io.to(roomId).emit("room-participants-update", populatedRoom.participants);
            }
        }

        res.status(200).json({
            success: true,
            room,
            message: "Joined room successfully via invitation"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
    getAllPublicRooms,
    promoteUser,
    demoteUser,
    changeRole,
    kickUser,
    muteUser,
    getRoomMembers,
    sendWorkspaceInvites,
    acceptWorkspaceInvite
}