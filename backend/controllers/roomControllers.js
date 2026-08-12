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

        if (roomLanguage === "html") {
            // 1. Create style.css
            await WorkspaceItem.create({
                roomId,
                name: "style.css",
                type: "file",
                content: `/* style.css */\nbody {\n    margin: 0;\n    padding: 0;\n    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;\n    background: linear-gradient(135deg, #0f172a, #1e1b4b);\n    color: #ffffff;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    min-height: 100vh;\n    text-align: center;\n}\n\n.welcome-container {\n    background: rgba(255, 255, 255, 0.05);\n    border: 1px solid rgba(255, 255, 255, 0.1);\n    backdrop-filter: blur(10px);\n    padding: 40px;\n    border-radius: 16px;\n    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);\n    max-width: 500px;\n}\n\nh1 {\n    font-size: 2.2rem;\n    margin-bottom: 16px;\n    background: linear-gradient(to right, #a855f7, #6366f1);\n    -webkit-background-clip: text;\n    -webkit-text-fill-color: transparent;\n}\n\np {\n    font-size: 1rem;\n    color: rgba(255, 255, 255, 0.7);\n    margin-bottom: 12px;\n}\n\nbutton {\n    background: linear-gradient(135deg, #a855f7, #6366f1);\n    color: #ffffff;\n    border: none;\n    padding: 10px 24px;\n    border-radius: 8px;\n    font-size: 1rem;\n    font-weight: 600;\n    cursor: pointer;\n    transition: all 0.3s ease;\n    margin-top: 16px;\n}\n\nbutton:hover {\n    transform: translateY(-2px);\n    box-shadow: 0 0 15px rgba(168, 85, 247, 0.4);\n}\n`,
                language: "css",
                isEntryPoint: false,
                createdBy: req.user._id
            });

            // 2. Create script.js
            await WorkspaceItem.create({
                roomId,
                name: "script.js",
                type: "file",
                content: `// script.js\nconsole.log("Web project loaded successfully!");\n\nconst btn = document.getElementById("action-btn");\nif (btn) {\n    btn.addEventListener("click", () => {\n        console.log("Action button clicked!");\n        alert("Hello from script.js inside CodeExpo!");\n    });\n}\n`,
                language: "javascript",
                isEntryPoint: false,
                createdBy: req.user._id
            });

            // 3. Create index.html (entrypoint)
            await WorkspaceItem.create({
                roomId,
                name: "index.html",
                type: "file",
                content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>CodeExpo Web Project</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <div class="welcome-container">\n        <h1>🌐 CodeExpo Web Workspace!</h1>\n        <p>This is a real-time collaborative multi-file environment.</p>\n        <p>Edit HTML, CSS, or JS files to see the preview update live.</p>\n        <button id="action-btn">Click Me</button>\n    </div>\n    <script type="module" src="script.js"></script>\n</body>\n</html>\n`,
                language: "html",
                isEntryPoint: true,
                createdBy: req.user._id
            });
        } else {
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
            const Notification = require("../models/Notification");
            await Notification.updateMany(
                { recipient: req.user._id, targetRoom: room._id, type: { $in: ["INVITE", "JOIN_APPROVED"] } },
                { isRead: true, isUsed: true }
            );
            return res.status(200).json({
                success: true,
                room
            });
        }

        const isKicked = room.kickedUsers && room.kickedUsers.some(k => k.user && k.user.toString() === req.user._id.toString());
        if (isKicked) {
            const isPending = room.pendingRequests && room.pendingRequests.some(r => r.user && r.user.toString() === req.user._id.toString());
            if (isPending) {
                return res.status(200).json({
                    success: true,
                    requiresApproval: true,
                    isPending: true,
                    message: "Your request to re-enter this room is pending approval from the host."
                });
            }
            return res.status(200).json({
                success: true,
                requiresApproval: true,
                isKicked: true,
                message: "You were previously removed from this room and must request permission from the host to enter."
            });
        }

        if (room.isPrivate) {
            const requestExists = room.pendingRequests && room.pendingRequests.some(r => r.user && r.user.toString() === req.user._id.toString());
            if (!requestExists) {
                if (!room.pendingRequests) room.pendingRequests = [];
                room.pendingRequests.push({ user: req.user._id, username: req.user.username });
                room.rejectedRequests = (room.rejectedRequests || []).filter(r => r.user && r.user.toString() !== req.user._id.toString());
                await room.save();
            }
            return res.status(200).json({
                success: true,
                requiresApproval: true,
                message: "Waiting for approval"
            });
        }

        if (!alreadyjoined) {
            room.participants.push({ user: req.user._id, role: "MEMBER" });
            await room.save();
            const Notification = require("../models/Notification");
            await Notification.updateMany(
                { recipient: req.user._id, targetRoom: room._id, type: { $in: ["INVITE", "JOIN_APPROVED"] } },
                { isRead: true, isUsed: true }
            );
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
        const room = await Room.findOne({
            $or: [{ roomId: roomId }, { _id: roomId.match(/^[0-9a-fA-F]{24}$/) ? roomId : null }]
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room does not exist"
            });
        }

        // Only owner can delete room
        if (req.user._id.toString() !== room.createdBy.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only the room owner can delete this room"
            });
        }

        const targetRoomId = room.roomId;
        const targetRoomObjId = room._id;

        // Import related models locally to handle cleanup safely
        const Message = require("../models/Message");
        const RoomLike = require("../models/RoomLike");
        const Bookmark = require("../models/Bookmark");
        const AIConversation = require("../models/AIConversation");
        const Activity = require("../models/Activity");
        const Version = require("../models/Version");
        const RoomTask = require("../models/RoomTask");
        const TimerSession = require("../models/TimerSession");
        const TaskActivity = require("../models/TaskActivity");
        const Checklist = require("../models/Checklist");
        const LineOwnership = require("../models/LineOwnership");
        const EditActivity = require("../models/EditActivity");

        // 1. Delete Workspace Files and Folders
        await WorkspaceItem.deleteMany({ roomId: targetRoomId });

        // 2. Delete Chat Messages
        await Message.deleteMany({ roomId: targetRoomId });

        // 3. Delete Room Likes
        await RoomLike.deleteMany({ room: targetRoomObjId });

        // 4. Delete Room Bookmarks
        await Bookmark.deleteMany({ room: targetRoomObjId });

        // 5. Delete AI Conversations
        await AIConversation.deleteMany({ roomId: targetRoomId });

        // 6. Delete Activities referencing the Room
        await Activity.deleteMany({ room: targetRoomObjId });

        // 7. Delete File Version History
        await Version.deleteMany({ roomId: targetRoomId });

        // 8. Delete Line Ownership records
        await LineOwnership.deleteMany({ roomId: targetRoomId });

        // 9. Delete Edit Activities
        await EditActivity.deleteMany({ roomId: targetRoomId });

        // 10. Delete Room Tasks, Checklists, Activities, and Timers
        const tasks = await RoomTask.find({ roomId: targetRoomId });
        if (tasks && tasks.length > 0) {
            const taskIds = tasks.map(t => t._id);
            await TimerSession.deleteMany({ taskId: { $in: taskIds } });
            await TaskActivity.deleteMany({ taskId: { $in: taskIds } });
            await Checklist.deleteMany({ taskId: { $in: taskIds } });
            await RoomTask.deleteMany({ roomId: targetRoomId });
        }

        // 11. Finally, delete the Room itself
        await room.deleteOne();

        res.status(200).json({
            success: true,
            message: "Room deleted successfully"
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
            .select("-whiteboardData -__v")
            .sort({ updatedAt: -1 })
            .lean();

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room,
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

// Cache variables to optimize active rooms listing and prevent DB load under socket-driven refetches
let cachedRoomsWithCount = null;
let cachedLiveRoomIdsHash = "";
let lastCacheTime = 0;
const CACHE_TTL = 3000; // 3 seconds in-memory cache

const getLiveRooms = async (req, res) => {
    try {
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const liveRoomIds = Object.keys(roomUsers).filter(
            (roomId) => roomUsers[roomId] && roomUsers[roomId].length > 0
        );

        // Generate a fast hash to detect if active room list or user counts in those rooms have changed
        const liveRoomIdsHash = liveRoomIds.sort().join(",") + ":" + liveRoomIds.map(id => roomUsers[id].length).join(",");
        const now = Date.now();

        let roomsWithCount;

        if (cachedRoomsWithCount && cachedLiveRoomIdsHash === liveRoomIdsHash && (now - lastCacheTime < CACHE_TTL)) {
            roomsWithCount = cachedRoomsWithCount;
        } else {
            const rooms = await Room.find({
                roomId: { $in: liveRoomIds }
            })
                .populate("createdBy", "username avatar")
                .populate("participants.user", "username avatar")
                .select("-whiteboardData -__v")
                .lean();

            roomsWithCount = rooms.map((room) => {
                const activeUsers = roomUsers[room.roomId] || [];
                const likesCount = room.likes ? room.likes.length : 0;
                const likedBy = room.likes || [];
                return {
                    ...room,
                    activeUsersCount: activeUsers.length,
                    activeUsers: activeUsers.map(u => ({ username: u.username, userId: u.userId, isOwner: u.isOwner })),
                    likesCount,
                    likedBy
                };
            });

            cachedRoomsWithCount = roomsWithCount;
            cachedLiveRoomIdsHash = liveRoomIdsHash;
            lastCacheTime = now;
        }

        const filteredRooms = roomsWithCount.filter(room => {
            if (!room.isPrivate) return true;
            const isOwner = room.createdBy?._id?.toString() === req.user._id.toString();
            const isParticipant = room.participants?.some(p => p.user?._id?.toString() === req.user._id.toString());
            return isOwner || isParticipant;
        });

        res.status(200).json({
            success: true,
            rooms: filteredRooms
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
            .select("-whiteboardData -__v")
            .sort({ lastActivity: -1 })
            .limit(10)
            .lean();

        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room,
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
            if (room.kickedUsers) {
                room.kickedUsers = room.kickedUsers.filter(k => k.user && k.user.toString() !== requesterId.toString());
            }

            // Create and send notification to the requester
            const { createAndSendNotification } = require("./notificationControllers");
            const io = req.app.get("io");
            await createAndSendNotification(requesterId, req.user._id, "JOIN_APPROVED", "COLLABORATION", room._id, io);
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

        if (!room.kickedUsers) room.kickedUsers = [];
        if (!room.kickedUsers.some(k => k.user && k.user.toString() === userId.toString())) {
            room.kickedUsers.push({
                user: userId,
                username: target.user?.username || "User",
                kickedAt: new Date()
            });
        }

        // Remove user from participants list
        room.participants = room.participants.filter(p => p.user && p.user.toString() !== userId.toString());
        room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId.toString());

        await room.save();

        // Socket sync & disconnect
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        const io = req.app.get("io");

        if (io) {
            io.to(roomId).emit("user-kicked", {
                userId,
                roomId,
                username: target.user?.username || "User"
            });
        }

        if (roomUsers[roomId]) {
            const usersToKick = roomUsers[roomId].filter(u => String(u.userId) === String(userId));
            if (io && usersToKick.length > 0) {
                usersToKick.forEach(userToKick => {
                    const kickedSocket = io.sockets.sockets.get(userToKick.socketId);
                    if (kickedSocket) {
                        kickedSocket.emit("kicked", {
                            roomId,
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
            }
        }

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
            .populate("createdBy", "username avatar")
            .populate("participants.user", "username avatar")
            .populate("likes", "username avatar")
            .select("-whiteboardData -__v")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const roomsWithCount = rooms.map((room) => {
            const activeUsers = roomUsers[room.roomId] || [];
            const likesCount = room.likes ? room.likes.length : 0;
            const likedBy = room.likes || [];
            return {
                ...room,
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

        if (!room.kickedUsers) room.kickedUsers = [];
        if (!room.kickedUsers.some(k => k.user && k.user.toString() === userId.toString())) {
            room.kickedUsers.push({
                user: userId,
                username: target.user?.username || "User",
                kickedAt: new Date()
            });
        }

        room.participants = room.participants.filter(p => p.user && p.user.toString() !== userId.toString());
        room.pendingRequests = room.pendingRequests.filter(r => r.user.toString() !== userId.toString());

        await room.save();

        // Sync with socket
        const socketHandler = require("../sockets/socketHandler");
        const roomUsers = socketHandler.roomUsers || {};
        const io = req.app.get("io");

        if (io) {
            io.to(roomId).emit("user-kicked", {
                userId,
                roomId,
                username: target.user?.username || "User"
            });
        }

        if (roomUsers[roomId]) {
            const usersToKick = roomUsers[roomId].filter(u => String(u.userId) === String(userId));
            if (io && usersToKick.length > 0) {
                usersToKick.forEach(userToKick => {
                    const kickedSocket = io.sockets.sockets.get(userToKick.socketId);
                    if (kickedSocket) {
                        kickedSocket.emit("kicked", {
                            roomId,
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

        const isKicked = room.kickedUsers && room.kickedUsers.some(k => k.user && k.user.toString() === userId.toString());
        if (isKicked) {
            return res.status(403).json({ success: false, message: "You cannot join this workspace because you were removed by the host." });
        }

        const Notification = require("../models/Notification");
        const hasInvite = await Notification.findOne({
            recipient: userId,
            targetRoom: room._id,
            type: "INVITE",
            isUsed: false
        });

        if (!hasInvite && !isOwner && !alreadyJoined) {
            return res.status(403).json({ success: false, message: "Invitation is invalid or has already been used." });
        }

        if (!isOwner && !alreadyJoined) {
            room.participants.push({ user: userId, role: "MEMBER" });
            await room.save();
            
            await Notification.updateMany(
                { recipient: userId, targetRoom: room._id, type: { $in: ["INVITE", "JOIN_APPROVED"] } },
                { isRead: true, isUsed: true }
            );
            
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

const updateRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { title, isPrivate } = req.body;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: "Room ID is required"
            });
        }

        const room = await Room.findOne({
            $or: [{ roomId: roomId }, { _id: roomId.match(/^[0-9a-fA-F]{24}$/) ? roomId : null }]
        }).populate("createdBy", "username displayName avatar email");

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        // Only Room Owner can edit
        const creatorId = String(room.createdBy?._id || room.createdBy);
        const currentUserId = String(req.user._id || req.user.id);

        if (creatorId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: Only the room owner can edit this room"
            });
        }

        const updateFields = {};
        let titleChanged = false;
        let privacyChanged = false;
        const previousTitle = room.title;
        const previousIsPrivate = room.isPrivate;

        // 1. Title Validation
        if (typeof title !== "undefined") {
            if (typeof title !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Title must be a string"
                });
            }

            const trimmedTitle = title.trim();
            if (!trimmedTitle || trimmedTitle.length < 3 || trimmedTitle.length > 60) {
                return res.status(400).json({
                    success: false,
                    message: "Room title must be between 3 and 60 characters"
                });
            }

            if (trimmedTitle !== room.title) {
                updateFields.title = trimmedTitle;
                titleChanged = true;
            }
        }

        // 2. Privacy Validation
        if (typeof isPrivate !== "undefined") {
            const nextIsPrivate = Boolean(isPrivate);
            if (nextIsPrivate !== room.isPrivate) {
                updateFields.isPrivate = nextIsPrivate;
                privacyChanged = true;
            }
        }

        // If no fields actually changed, return 200 without unnecessary writes or socket broadcasts
        if (!titleChanged && !privacyChanged) {
            return res.status(200).json({
                success: true,
                message: "No changes detected",
                room,
                titleChanged: false,
                privacyChanged: false
            });
        }

        updateFields.lastActivity = new Date();

        // 3. Atomic MongoDB Update
        const updatedRoom = await Room.findOneAndUpdate(
            { _id: room._id },
            { $set: updateFields },
            { new: true }
        ).populate("createdBy", "username displayName avatar email");

        // 4. Create Activity Logs
        const Activity = require("../models/Activity");
        if (titleChanged) {
            await Activity.create({
                user: req.user._id,
                userId: req.user._id,
                username: req.user.username,
                room: updatedRoom._id,
                roomTitle: updatedRoom.title,
                action: `renamed room to "${updatedRoom.title}"`,
                activityType: "ROOM_RENAME",
                timestamp: new Date()
            }).catch(err => console.error("Error logging room rename activity:", err));
        }

        if (privacyChanged) {
            const privacyText = updatedRoom.isPrivate ? "Private" : "Public";
            await Activity.create({
                user: req.user._id,
                userId: req.user._id,
                username: req.user.username,
                room: updatedRoom._id,
                roomTitle: updatedRoom.title,
                action: `changed room privacy to ${privacyText}`,
                activityType: "ROOM_PRIVACY",
                timestamp: new Date()
            }).catch(err => console.error("Error logging room privacy activity:", err));
        }

        // 5. Emit single Socket.IO event: room:updated
        const io = req.app.get("io");
        if (io) {
            const socketPayload = {
                roomId: updatedRoom.roomId,
                title: updatedRoom.title,
                isPrivate: updatedRoom.isPrivate,
                updatedBy: {
                    _id: req.user._id,
                    username: req.user.username,
                    displayName: req.user.displayName
                },
                updatedAt: updatedRoom.updatedAt,
                titleChanged,
                privacyChanged,
                previousTitle,
                previousIsPrivate
            };

            io.emit("room:updated", socketPayload);
        }

        return res.status(200).json({
            success: true,
            message: "Room updated successfully",
            room: updatedRoom,
            titleChanged,
            privacyChanged
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createRoom,
    joinRoom,
    getRoom,
    updateRoom,
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