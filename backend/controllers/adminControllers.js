const User = require("../models/User");
const Room = require("../models/Room");
const Message = require("../models/Message");
const WebsiteRating = require("../models/WebsiteRating");
const Activity = require("../models/Activity");
const Bookmark = require("../models/Bookmark");
const RoomLike = require("../models/RoomLike");
const Notification = require("../models/Notification");
const Follow = require("../models/Follow");
const WorkspaceItem = require("../models/WorkspaceItem");
const Post = require("../models/Post");
const DirectMessage = require("../models/DirectMessage");
const GroupChat = require("../models/GroupChat");
const Report = require("../models/Report");
const MediaService = require("../services/MediaService");

// Helper to sanitize/format user responses
const formatUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isOnline: user.isOnline === "true" || user.isOnline === true,
  lastSeene: user.lastSeene,
  bio: user.bio,
  codingHours: user.codingHours,
  executionsCount: user.executionsCount || 0,
  followersCount: user.followersCount || 0,
  followingCount: user.followingCount || 0,
  programmingLanguages: user.programmingLanguages || [],
  title: user.title || "Developer",
  isSuspended: !!user.isSuspended,
  createdAt: user.createdAt
});

// Helper to log moderation actions and update user account standing
const logModerationAction = async (userId, actionType, postId, reason, moderatorUsername, currentStatus = "Active", resolutionStatus = "No Action Needed") => {
  const ModerationAction = require("../models/ModerationAction");
  const User = require("../models/User");
  const Notification = require("../models/Notification");

  const action = new ModerationAction({
    user: userId,
    actionType,
    postId,
    reason: reason || "Content violates community guidelines.",
    moderator: moderatorUsername || "System",
    currentStatus,
    resolutionStatus
  });
  await action.save();

  // Deduct health & update violations/warnings
  const userObj = await User.findById(userId);
  if (userObj) {
    if (actionType === "Post Hidden" || actionType === "Post Deleted") {
      userObj.accountHealth = Math.max(0, userObj.accountHealth - 20);
      userObj.totalViolations += 1;
    } else if (actionType === "Sensitive Content" || actionType === "Warning Issued" || actionType === "Post Flagged") {
      userObj.accountHealth = Math.max(0, userObj.accountHealth - 10);
      userObj.totalWarnings += 1;
    } else if (actionType === "Post Restored" || actionType === "Account Reactivated") {
      if (actionType === "Account Reactivated") {
        userObj.accountHealth = 100;
        userObj.isSuspended = false;
        userObj.accountStatus = "Active";
        userObj.guidelineStatus = "Good Standing";
      } else {
        userObj.accountHealth = Math.min(100, userObj.accountHealth + 20);
      }
      if (actionType === "Post Restored") {
        if (userObj.totalWarnings > 0) {
          userObj.totalWarnings = Math.max(0, userObj.totalWarnings - 1);
        } else if (userObj.totalViolations > 0) {
          userObj.totalViolations = Math.max(0, userObj.totalViolations - 1);
        }
      }
      if (userObj.accountHealth >= 50 && (userObj.accountStatus === "Restricted" || userObj.accountStatus === "Suspended" || userObj.accountStatus === "Permanently Banned")) {
        userObj.accountStatus = "Active";
        userObj.guidelineStatus = "Good Standing";
      }
    } else if (actionType === "Temporary Restriction") {
      userObj.accountHealth = Math.max(0, userObj.accountHealth - 30);
      userObj.accountStatus = "Restricted";
      userObj.guidelineStatus = "Restricted Standing";
    } else if (actionType === "Suspension") {
      userObj.accountHealth = Math.max(0, userObj.accountHealth - 50);
      userObj.accountStatus = "Suspended";
      userObj.guidelineStatus = "Suspended Standing";
      userObj.isSuspended = true;
    } else if (actionType === "Ban") {
      userObj.accountHealth = 0;
      userObj.accountStatus = "Permanently Banned";
      userObj.guidelineStatus = "Banned Standing";
      userObj.isSuspended = true;
    }

    if (userObj.accountHealth < 50 && userObj.accountStatus === "Active") {
      userObj.accountStatus = "Restricted";
      userObj.guidelineStatus = "Restricted Standing";
    }

    await userObj.save();
  }

  // Create Notification
  let notificationMessage = "";
  if (actionType === "Post Hidden") notificationMessage = "Your post has been hidden by moderators.";
  else if (actionType === "Post Deleted") notificationMessage = "Your post has been removed due to guidelines violation.";
  else if (actionType === "Post Restored") notificationMessage = "Your post has been restored.";
  else if (actionType === "Warning Issued") notificationMessage = "Your account has received an administrative warning.";
  else if (actionType === "Post Flagged") notificationMessage = "Your post has been flagged by moderators.";
  else if (actionType === "Likes Disabled") notificationMessage = "Likes have been disabled for your post.";
  else if (actionType === "Comment Disabled") notificationMessage = "Comments have been locked for your post.";
  else if (actionType === "Temporary Restriction") notificationMessage = "Your account has been temporarily restricted.";
  else if (actionType === "Suspension") notificationMessage = "Your account has been suspended.";
  else if (actionType === "Ban") notificationMessage = "Your account has been permanently banned.";
  else if (actionType === "Sensitive Content") notificationMessage = "Your post has been flagged as containing sensitive content.";
  else if (actionType === "Account Reactivated") notificationMessage = "Your account standing has been restored to active.";

  if (notificationMessage) {
    const notification = new Notification({
      recipient: userId,
      sender: userObj?._id || userId,
      type: "MODERATION_ACTION",
      category: "MODERATION",
      targetPost: postId,
      message: notificationMessage
    });
    await notification.save();

    // Emit live events
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.to(String(userId)).emit("notification-received", notification);
        socketHandler.io.to(String(userId)).emit("admin-user-action", {
          userId,
          isSuspended: userObj?.isSuspended || false,
          user: userObj
        });
      }
    } catch (e) { }
  }
};

// 1. Overview Analytics Stats
const getAdminOverviewStats = async (req, res) => {
  try {
    // Get actual online user IDs from Socket.io active rooms
    const activeUserIds = [];
    if (req.io && req.io.sockets && req.io.sockets.adapter && req.io.sockets.adapter.rooms) {
      for (const [roomId, room] of req.io.sockets.adapter.rooms.entries()) {
        if (roomId.match(/^[0-9a-fA-F]{24}$/) && room && room.size > 0) {
          activeUserIds.push(roomId);
        }
      }
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch stats concurrently to maximize performance
    const [
      totalUsers,
      totalRooms,
      totalMessages,
      usersWithExecutions,
      ratingStats,
      ratingDistribution,
      recentExecutions,
      recentRoomsCreated,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalExecutions: { $sum: "$executionsCount" }
          }
        }
      ]),
      WebsiteRating.aggregate([
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 }
          }
        }
      ]),
      WebsiteRating.aggregate([
        {
          $group: {
            _id: "$rating",
            count: { $sum: 1 }
          }
        }
      ]),
      Activity.countDocuments({
        action: "executed",
        createdAt: { $gte: oneDayAgo }
      }),
      Room.countDocuments({
        createdAt: { $gte: oneDayAgo }
      }),
      User.find({ _id: { $in: activeUserIds } })
        .select("username email avatar lastSeene loginHistory")
        .sort({ lastSeene: -1 })
        .lean()
    ]);

    const onlineUsers = activeUserIds.length;
    const totalExecutions = usersWithExecutions.length > 0 ? usersWithExecutions[0].totalExecutions : 0;
    const averageRating = ratingStats.length > 0 ? Math.round(ratingStats[0].average * 10) / 10 : 0;
    const totalRatings = ratingStats.length > 0 ? ratingStats[0].count : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((dist) => {
      if (dist._id >= 1 && dist._id <= 5) {
        distribution[dist._id] = dist.count;
      }
    });

    // Fetch detailed info of online users for tracking
    const onlineUsersList = activeUsers.map((u) => {
      const activeLog = u.loginHistory && Array.isArray(u.loginHistory)
        ? (u.loginHistory.find((log) => log.logoutTime === null) || u.loginHistory[0])
        : null;
      return {
        id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        lastSeene: u.lastSeene,
        ipAddress: activeLog ? activeLog.ipAddress : "Unknown"
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        onlineUsers,
        totalRooms,
        totalMessages,
        totalExecutions,
        averageRating,
        totalRatings,
        ratingDistribution: distribution,
        recentExecutions,
        recentRoomsCreated,
        onlineUsersList
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load admin stats"
    });
  }
};

// 2. User Management: List Users
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const adminQuery = { role: "admin" };
    const userQuery = { role: "user" };

    if (search) {
      const searchOr = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
      adminQuery.$or = searchOr;
      userQuery.$or = searchOr;
    }

    // Fetch admins, total users, and paginated users concurrently
    const [admins, total, users] = await Promise.all([
      User.find(adminQuery).sort({ createdAt: -1 }).lean(),
      User.countDocuments(userQuery),
      User.find(userQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      admins: admins.map(formatUser),
      users: users.map(formatUser),
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users"
    });
  }
};

// 3. User Management: Delete User (Cascading Clean)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Don't allow an admin to delete their own account from here
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account. Please contact system support."
      });
    }

    // Super admin protection: nobody can delete the super admin
    if (user.email === "adminsachin@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Access denied: The super admin account cannot be deleted."
      });
    }

    // Only super admin can delete other admins
    const isSuperAdmin = req.user && req.user.email === "adminsachin@gmail.com";
    if (user.role === "admin") {
      if (!isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only the super admin can delete other administrators."
        });
      }
    }

    // 1. Delete user's rooms (and their workspace items, messages)
    const userRooms = await Room.find({ createdBy: userId });
    for (const room of userRooms) {
      await WorkspaceItem.deleteMany({ roomId: room.roomId });
      await Message.deleteMany({ roomId: room.roomId });
      await RoomLike.deleteMany({ room: room._id });
      await Bookmark.deleteMany({ room: room._id });
      await Room.deleteOne({ _id: room._id });
    }

    // Pull deleted user from Room likes
    await Room.updateMany({}, { $pull: { likes: userId } });

    // Pull deleted user from User followers & following arrays
    await User.updateMany({}, { $pull: { followers: userId, following: userId } });

    // 2. Remove user from participants list in other rooms
    await Room.updateMany(
      { "participants.user": userId },
      { $pull: { participants: { user: userId } } }
    );

    // 3. Delete messages, ratings, activities, bookmarks, likes, follows, notifications
    await Message.deleteMany({ sender: userId });
    await WebsiteRating.deleteMany({ user: userId });
    await Activity.deleteMany({ user: userId });
    await Bookmark.deleteMany({ user: userId });
    await RoomLike.deleteMany({ user: userId });
    await Follow.deleteMany({
      $or: [{ follower: userId }, { following: userId }]
    });
    await Notification.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    // Cascade cleanup of all user-related media files from Cloudinary/uploads
    if (user.avatarMetadata || user.avatar) {
      await MediaService.deleteMedia(user.avatarMetadata || user.avatar).catch(console.error);
    }
    if (user.coverBannerMetadata || user.coverBanner) {
      await MediaService.deleteMedia(user.coverBannerMetadata || user.coverBanner).catch(console.error);
    }

    const userPosts = await Post.find({ author: userId });
    for (const post of userPosts) {
      if (post.imageMetadata || post.image) {
        await MediaService.deleteMedia(post.imageMetadata || post.image).catch(console.error);
      }
    }
    await Post.deleteMany({ author: userId });

    const userDMs = await DirectMessage.find({ sender: userId });
    for (const dm of userDMs) {
      if (dm.fileMetadata || dm.fileUrl) {
        await MediaService.deleteMedia(dm.fileMetadata || dm.fileUrl).catch(console.error);
      }
    }

    const userGroups = await GroupChat.find({ createdBy: userId });
    for (const g of userGroups) {
      if (g.avatarMetadata || g.avatar) {
        await MediaService.deleteMedia(g.avatarMetadata || g.avatar).catch(console.error);
      }
    }
    await GroupChat.deleteMany({ createdBy: userId });

    // 4. Delete the User record
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: `User ${user.username} deleted successfully, with all associated workspaces, activities, and messages.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user"
    });
  }
};

// 4. User Management: Toggle/Update User Role
const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'user' or 'admin'."
      });
    }

    // Only super admin can make admins or demote admins (change roles)
    const isSuperAdmin = req.user && req.user.email === "adminsachin@gmail.com";
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the super admin can update user roles."
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // The super admin account role cannot be changed
    if (user.email === "adminsachin@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Access denied: The super admin account role cannot be modified."
      });
    }

    // Self lockout protection
    if (String(user._id) === String(req.user._id) && role === "user") {
      return res.status(400).json({
        success: false,
        message: "You cannot demote yourself to prevent lockout. Ask another administrator."
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.username} role updated to '${role}'.`,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user role"
    });
  }
};

// 4.5 User Management: Update User Developer Rank/Title
const updateUserTitle = async (req, res) => {
  try {
    const userId = req.params.id;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Developer title is required."
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.title = title;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.username} title updated to '${title}'.`,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user title"
    });
  }
};

// 5. Room Management: List Rooms
const getAllRooms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { roomId: { $regex: search, $options: "i" } },
        { language: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Room.countDocuments(query);
    const rooms = await Room.find(query)
      .populate("createdBy", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formattedRooms = rooms.map((r) => ({
      id: r._id,
      roomId: r.roomId,
      title: r.title,
      language: r.language,
      isPrivate: r.isPrivate,
      participantsCount: r.participants ? r.participants.length : 0,
      createdBy: r.createdBy ? {
        id: r.createdBy._id,
        username: r.createdBy.username,
        email: r.createdBy.email,
        avatar: r.createdBy.avatar
      } : { username: "Unknown / Deleted" },
      lastActivity: r.lastActivity,
      createdAt: r.createdAt
    }));

    res.status(200).json({
      success: true,
      rooms: formattedRooms,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalRooms: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch rooms"
    });
  }
};

// 6. Room Management: Delete Room
const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;

    // The param could be mongo _id or human-readable roomId
    const room = await Room.findOne({ $or: [{ _id: roomId }, { roomId }] });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Clean room contents
    await WorkspaceItem.deleteMany({ roomId: room.roomId });
    await Message.deleteMany({ roomId: room.roomId });
    await RoomLike.deleteMany({ room: room._id });
    await Bookmark.deleteMany({ room: room._id });

    // Delete room
    await Room.deleteOne({ _id: room._id });

    res.status(200).json({
      success: true,
      message: `Room "${room.title}" (${room.roomId}) has been deleted, along with messages and workspace tree files.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete room"
    });
  }
};

// 7. Ratings Management: List All Ratings
const getAllRatings = async (req, res) => {
  try {
    const ratings = await WebsiteRating.find()
      .populate("user", "username email avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      ratings: ratings.map((r) => ({
        id: r._id,
        rating: r.rating,
        comment: r.comment,
        timestamp: r.timestamp,
        user: r.user ? {
          id: r.user._id,
          username: r.user.username,
          email: r.user.email,
          avatar: r.user.avatar
        } : { username: "Deleted User" }
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ratings"
    });
  }
};

// 8. Ratings Management: Delete Rating
const deleteRating = async (req, res) => {
  try {
    const ratingId = req.params.id;

    const rating = await WebsiteRating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Feedback record not found"
      });
    }

    await WebsiteRating.findByIdAndDelete(ratingId);

    res.status(200).json({
      success: true,
      message: "Feedback review comment has been deleted."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete rating"
    });
  }
};

// 9. Development Helper: Toggle Self Admin Promotion
const promoteSelf = async (req, res) => {
  try {
    // Only allow self promotion for the super admin
    const isSuperAdmin = req.user && req.user.email === "adminsachin@gmail.com";
    if (!isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only the super admin can promote accounts."
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Toggle role
    const newRole = user.role === "admin" ? "user" : "admin";
    user.role = newRole;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Account role toggled successfully. You are now a '${newRole}'.`,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Self promotion failed"
    });
  }
};

// 10. Toggle User Suspension (Ban/Unban)
const toggleUserSuspension = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot suspend your own admin account."
      });
    }

    // Super admin protection: nobody can suspend the super admin
    if (user.email === "adminsachin@gmail.com") {
      return res.status(403).json({
        success: false,
        message: "Access denied: The super admin account cannot be suspended."
      });
    }

    // Prevent self-suspension
    if (req.user && req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Access denied: You cannot suspend or reactivate your own admin account."
      });
    }

    // Only super admin can suspend other admins
    const isSuperAdmin = req.user && req.user.email === "adminsachin@gmail.com";
    if (user.role === "admin") {
      if (!isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Only the super admin can suspend other administrators."
        });
      }
    }

    user.isSuspended = !user.isSuspended;
    if (user.isSuspended) {
      user.accountStatus = "Suspended";
      user.guidelineStatus = "Suspended Standing";
      user.accountHealth = Math.max(0, user.accountHealth - 50);
    } else {
      user.accountStatus = "Active";
      user.guidelineStatus = "Good Standing";
      user.accountHealth = 100;
    }
    await user.save();

    await logModerationAction(
      user._id,
      user.isSuspended ? "Suspension" : "Account Reactivated",
      null,
      req.body.reason || (user.isSuspended ? "Suspended for safety and compliance review." : "Account access reinstated."),
      req.user?.username || "Admin"
    );

    res.status(200).json({
      success: true,
      message: `User ${user.username} account has been ${user.isSuspended ? "suspended" : "reactivated"}.`,
      user: formatUser(user)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle user suspension"
    });
  }
};

const adminIssueUserAction = async (req, res) => {
  try {
    const userId = req.params.id;
    const { actionType, reason } = req.body; // "Warning Issued", "Temporary Restriction", "Suspension", "Ban", "Account Reactivated"

    if (!actionType || !["Warning Issued", "Temporary Restriction", "Suspension", "Ban", "Account Reactivated"].includes(actionType)) {
      return res.status(400).json({ success: false, message: "Invalid action type." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Prevent self-moderation actions
    if (req.user && req.user._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Access denied: You cannot apply warnings, restrictions, or suspensions to your own admin account."
      });
    }

    // Delegate all property updates entirely to logModerationAction to prevent double-deduction!
    await logModerationAction(
      user._id,
      actionType,
      null,
      reason || `Administrative action: ${actionType}`,
      req.user?.username || "Admin"
    );

    const updatedUser = await User.findById(userId);

    res.status(200).json({
      success: true,
      message: `Successfully issued ${actionType} action to ${user.username}.`,
      user: formatUser(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Chat Moderation: List Recent Messages across all rooms
const getRecentMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.content = { $regex: search, $options: "i" };
    }

    const total = await Message.countDocuments(query);
    const messages = await Message.find(query)
      .populate("sender", "username email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Fetch the room title for each message. Since messages contain roomId, we resolve them.
    const roomIds = [...new Set(messages.map(m => m.roomId))];
    const rooms = await Room.find({ roomId: { $in: roomIds } }).select("roomId title");
    const roomMap = {};
    rooms.forEach(r => { roomMap[r.roomId] = r.title; });

    const formattedMessages = messages.map(m => ({
      id: m._id,
      content: m.content,
      roomId: m.roomId,
      roomTitle: roomMap[m.roomId] || "Unknown Room/Deleted",
      createdAt: m.createdAt,
      sender: m.sender ? {
        id: m.sender._id,
        username: m.sender.username,
        email: m.sender.email,
        avatar: m.sender.avatar
      } : { username: "System / Deleted User" }
    }));

    res.status(200).json({
      success: true,
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalMessages: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch chat logs"
    });
  }
};

// 12. Chat Moderation: Delete Chat Message
const deleteChatMessage = async (req, res) => {
  try {
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      success: true,
      message: "Chat message has been deleted and moderated."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete chat message"
    });
  }
};

// 13. System maintenance mode: Get status
const getMaintenanceStatus = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      maintenanceMode: !!global.maintenanceMode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 14. System maintenance mode: Toggle state
const toggleMaintenanceMode = async (req, res) => {
  try {
    const { active } = req.body;
    global.maintenanceMode = active === undefined ? !global.maintenanceMode : !!active;

    res.status(200).json({
      success: true,
      maintenanceMode: global.maintenanceMode,
      message: `Maintenance Mode is now ${global.maintenanceMode ? "ENABLED" : "DISABLED"}.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 15. Feed Moderation: List all posts
const getAdminPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    if (req.query.grouped === "true") {
      // Find all unique authors who have posts or stories
      const postAuthors = await Post.distinct("author");
      const Story = require("../models/Story");
      const storyAuthors = await Story.distinct("user");
      
      const authorIds = Array.from(new Set([
        ...postAuthors.map(String), 
        ...storyAuthors.map(String)
      ].filter(Boolean)));

      const userQuery = { _id: { $in: authorIds } };
      if (search) {
        userQuery.$or = [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ];
      }

      const total = await User.countDocuments(userQuery);
      const users = await User.find(userQuery)
        .select("username email avatar role title isOnline")
        .skip(skip)
        .limit(limit)
        .lean();

      const usersWithContent = await Promise.all(users.map(async (u) => {
        const posts = await Post.find({ author: u._id }).sort({ createdAt: -1 }).lean();
        const stories = await Story.find({ user: u._id }).sort({ createdAt: -1 }).lean();
        return {
          id: u._id,
          username: u.username,
          email: u.email,
          avatar: u.avatar,
          role: u.role,
          title: u.title,
          isOnline: u.isOnline === "true" || u.isOnline === true,
          posts: posts.map(p => ({
            id: p._id,
            text: p.text,
            techStack: p.techStack || [],
            image: p.image || "",
            images: p.images || [],
            likesCount: p.likes ? p.likes.length : 0,
            comments: p.comments || [],
            status: p.status || "active",
            isPinned: p.isPinned || false,
            isFeatured: p.isFeatured || false,
            viewsCount: p.viewsCount || 0,
            createdAt: p.createdAt
          })),
          stories: stories.map(s => ({
            id: s._id,
            text: s.text,
            mediaUrl: s.mediaUrl || "",
            likesCount: s.likes ? s.likes.length : 0,
            viewsCount: s.viewsCount || 0,
            status: s.status || "active",
            isFeatured: s.isFeatured || false,
            createdAt: s.createdAt
          }))
        };
      }));

      // Also get overall overview stats for the stats cards
      const [
        totalPosts,
        flaggedPosts,
        hiddenPosts,
        featuredPosts,
        pinnedPosts,
        totalStories,
        hiddenStories
      ] = await Promise.all([
        Post.countDocuments(),
        Post.countDocuments({ status: "flagged" }),
        Post.countDocuments({ status: "hidden" }),
        Post.countDocuments({ isFeatured: true }),
        Post.countDocuments({ isPinned: true }),
        Story.countDocuments(),
        Story.countDocuments({ status: "hidden" })
      ]);

      return res.status(200).json({
        success: true,
        grouped: true,
        users: usersWithContent,
        stats: {
          totalPosts,
          flaggedPosts,
          hiddenPosts,
          featuredPosts,
          pinnedPosts,
          totalStories,
          hiddenStories
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          totalUsers: total
        }
      });
    }

    let query = {};
    if (req.query.userId) {
      query.author = req.query.userId;
    }
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }
    if (search) {
      const matchingUsers = await User.find({
        username: { $regex: search, $options: "i" }
      }).select("_id");
      const userIds = matchingUsers.map(u => u._id);

      const searchConditions = {
        $or: [
          { text: { $regex: search, $options: "i" } },
          { techStack: { $regex: search, $options: "i" } },
          { author: { $in: userIds } }
        ]
      };

      if (query.author || query.status) {
        query.$and = [
          { ...query },
          searchConditions
        ];
        delete query.author;
        delete query.status;
      } else {
        query = searchConditions;
      }
    }

    // Fetch stats and posts concurrently
    const [
      totalPosts,
      flaggedPosts,
      hiddenPosts,
      featuredPosts,
      pinnedPosts,
      totalStories,
      hiddenStories,
      commentsCount,
      totalFiltered,
      posts
    ] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: "flagged" }),
      Post.countDocuments({ status: "hidden" }),
      Post.countDocuments({ isFeatured: true }),
      Post.countDocuments({ isPinned: true }),
      require("../models/Story").countDocuments(),
      require("../models/Story").countDocuments({ status: "hidden" }),
      Post.aggregate([
        { $group: { _id: null, total: { $sum: { $size: { $ifNull: ["$comments", []] } } } } }
      ]),
      Post.countDocuments(query),
      Post.find(query)
        .populate("author", "username email avatar title role isOnline executionsCount createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const totalComments = commentsCount.length > 0 ? commentsCount[0].total : 0;

    res.status(200).json({
      success: true,
      posts: posts.map(p => ({
        id: p._id,
        text: p.text,
        techStack: p.techStack || [],
        image: p.image || "",
        images: p.images || [],
        likesCount: p.likes ? p.likes.length : 0,
        comments: p.comments || [],
        status: p.status || "active",
        isPinned: p.isPinned || false,
        isFeatured: p.isFeatured || false,
        viewsCount: p.viewsCount || 0,
        legalCase: p.legalCase ? {
          caseId: p.legalCase.caseId || "",
          infringementType: p.legalCase.infringementType || "None",
          caseStatus: p.legalCase.caseStatus || "Resolved",
          notes: p.legalCase.notes || "",
          actionTakenBy: p.legalCase.actionTakenBy || "",
          actionDate: p.legalCase.actionDate
        } : {
          caseId: "",
          infringementType: "None",
          caseStatus: "Resolved",
          notes: "",
          actionTakenBy: "",
          actionDate: null
        },
        createdAt: p.createdAt,
        author: p.author ? {
          id: p.author._id,
          username: p.author.username,
          email: p.author.email,
          avatar: p.author.avatar,
          title: p.author.title,
          role: p.author.role,
          isOnline: p.author.isOnline,
          executionsCount: p.author.executionsCount,
          createdAt: p.author.createdAt
        } : { username: "Unknown / Deleted User" }
      })),
      stats: {
        totalPosts,
        flaggedPosts,
        hiddenPosts,
        featuredPosts,
        pinnedPosts,
        totalStories,
        hiddenStories,
        totalComments
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit),
        totalPosts: totalFiltered
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch posts"
    });
  }
};

// 16. Feed Moderation: Delete post
const deleteAdminPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Soft-delete: update status to "deleted" (preserve files in case of restoration)
    post.status = "deleted";
    await post.save();

    await logModerationAction(
      post.author,
      "Post Deleted",
      post._id,
      req.body.reason || "Content violates community guidelines.",
      req.user?.username || "Admin"
    );

    // Broadcast post update via Socket.IO
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("admin-post-action", {
          postId: post._id,
          post
        });
      }
    } catch (e) {
      console.error("Failed to broadcast admin-post-action via socket:", e.message);
    }

    res.status(200).json({
      success: true,
      message: "Post has been soft-deleted and moderated successfully."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete post"
    });
  }
};

// 17. Feed Moderation: Delete comment
const deleteAdminPostComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    const commentIndex = post.comments.findIndex(c => String(c._id) === String(commentId));
    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    // Emit real-time socket event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("post:commented", {
          postId,
          comments: post.comments,
          commentsCount: post.comments.length
        });
      }
    } catch (e) {
      console.error("Failed to emit post:commented event from admin comment deletion:", e.message);
    }

    res.status(200).json({
      success: true,
      message: "Comment has been deleted and moderated successfully.",
      comments: post.comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete comment"
    });
  }
};

// 18. Feed Moderation: Update post status & compliance case files
const updateAdminPostStatus = async (req, res) => {
  try {
    const postId = req.params.id;
    const { status, legalCase, isPinned, isFeatured, commentsLocked, likesDisabled, isSensitive, text } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    // Determine what changed to log moderation actions
    const oldStatus = post.status;
    const oldSensitive = post.isSensitive;
    const oldCommentsLocked = post.commentsLocked;
    const oldLikesDisabled = post.likesDisabled;
    const oldPinned = post.isPinned;
    const oldFeatured = post.isFeatured;

    if (status) {
      if (!["active", "flagged", "hidden", "deleted"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Must be 'active', 'flagged', 'hidden', or 'deleted'."
        });
      }
      post.status = status;
    }

    if (isPinned !== undefined) post.isPinned = isPinned;
    if (isFeatured !== undefined) post.isFeatured = isFeatured;
    if (commentsLocked !== undefined) post.commentsLocked = commentsLocked;
    if (likesDisabled !== undefined) post.likesDisabled = likesDisabled;
    if (isSensitive !== undefined) post.isSensitive = isSensitive;
    if (text !== undefined) post.text = text;

    if (legalCase) {
      post.legalCase = {
        caseId: legalCase.caseId || post.legalCase?.caseId || `CE-LEGAL-${Math.floor(1000 + Math.random() * 9000)}`,
        infringementType: legalCase.infringementType || "None",
        caseStatus: legalCase.caseStatus || "Resolved",
        notes: legalCase.notes || "",
        actionTakenBy: req.user?.username || "Admin System",
        actionDate: new Date()
      };
    }

    await post.save();

    // Log corresponding moderation actions
    const moderatorUser = req.user?.username || "Admin";
    const modReason = legalCase?.notes || req.body.reason || "Compliance review update";

    if (status && oldStatus !== status) {
      if (status === "hidden") {
        await logModerationAction(post.author, "Post Hidden", post._id, modReason, moderatorUser);
      } else if (status === "flagged") {
        await logModerationAction(post.author, "Post Flagged", post._id, modReason || "Post flagged by moderators.", moderatorUser);
      } else if (status === "active") {
        await logModerationAction(post.author, "Post Restored", post._id, modReason || "Post restored by moderators.", moderatorUser);
      } else if (status === "deleted") {
        await logModerationAction(post.author, "Post Deleted", post._id, modReason || "Post deleted by moderators.", moderatorUser);
      }
    }
    if (isSensitive !== undefined && oldSensitive !== isSensitive) {
      if (isSensitive) {
        await logModerationAction(post.author, "Sensitive Content", post._id, modReason, moderatorUser);
      }
    }
    if (commentsLocked !== undefined && oldCommentsLocked !== commentsLocked && commentsLocked) {
      await logModerationAction(post.author, "Comment Disabled", post._id, modReason, moderatorUser);
    }
    if (likesDisabled !== undefined && oldLikesDisabled !== likesDisabled && likesDisabled) {
      await logModerationAction(post.author, "Likes Disabled", post._id, modReason, moderatorUser);
    }
    if (isPinned !== undefined && oldPinned !== isPinned && isPinned) {
      await logModerationAction(post.author, "Pin Post", post._id, modReason, moderatorUser);
    }
    if (isFeatured !== undefined && oldFeatured !== isFeatured && isFeatured) {
      await logModerationAction(post.author, "Feature Post", post._id, modReason, moderatorUser);
    }

    // Broadcast post update via Socket.IO
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("admin-post-action", {
          postId: post._id,
          post
        });
      }
    } catch (e) {
      console.error("Failed to broadcast admin-post-action via socket:", e.message);
    }

    res.status(200).json({
      success: true,
      message: `Post compliance status updated successfully.`,
      post: {
        ...post.toObject(),
        id: post._id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update post status"
    });
  }
};

// 19. Get Admin Login Logs
const getAdminLoginLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    // 1. Single user details modal: return flat log array under `logs` for backwards compatibility
    if (req.query.userId) {
      const user = await User.findById(req.query.userId).select("username email avatar role title executionsCount createdAt isOnline loginHistory");
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const logs = (user.loginHistory || []).map(log => ({
        id: log._id,
        loginTime: log.loginTime,
        logoutTime: log.logoutTime,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent
      }));

      return res.status(200).json({
        success: true,
        logs: logs,
        pagination: {
          page: 1,
          limit: 10,
          total: logs.length,
          pages: 1
        }
      });
    }

    // 2. Paginated overall logs list: group/separate by user!
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    // Only query users who have at least one session in history
    query["loginHistory.0"] = { $exists: true };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("username email avatar role title executionsCount createdAt isOnline loginHistory")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        role: u.role,
        title: u.title,
        executionsCount: u.executionsCount,
        createdAt: u.createdAt,
        isOnline: u.isOnline === "true" || u.isOnline === true,
        loginHistory: (u.loginHistory || []).map(log => ({
          id: log._id,
          loginTime: log.loginTime,
          logoutTime: log.logoutTime,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        totalPages: Math.ceil(total / limit),
        totalLogs: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch login logs"
    });
  }
};

// 20. Get Admin Stories
const getAdminStories = async (req, res) => {
  try {
    const Story = require("../models/Story");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.userId) {
      query.user = req.query.userId;
    }
    if (req.query.search) {
      query.$or = [
        { text: { $regex: req.query.search, $options: "i" } },
        { username: { $regex: req.query.search, $options: "i" } }
      ];
    }
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }

    const total = await Story.countDocuments(query);
    const stories = await Story.find(query)
      .populate("user", "avatar username email role title isOnline lastSeene")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      stories: stories.map(story => ({
        id: story._id,
        user: story.user ? {
          id: story.user._id,
          username: story.user.username,
          email: story.user.email,
          avatar: story.user.avatar,
          role: story.user.role,
          title: story.user.title,
          isOnline: story.user.isOnline === "true" || story.user.isOnline === true,
          lastSeene: story.user.lastSeene
        } : null,
        username: story.username,
        avatar: story.avatar,
        text: story.text,
        mediaUrl: story.mediaUrl,
        likesCount: story.likes ? story.likes.length : 0,
        commentsCount: story.comments ? story.comments.length : 0,
        createdAt: story.createdAt,
        status: story.status || "active",
        isFeatured: story.isFeatured || false,
        viewsCount: story.viewsCount || 0
      })),
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalStories: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stories"
    });
  }
};

// 21. Delete Admin Story
const deleteAdminStory = async (req, res) => {
  try {
    const Story = require("../models/Story");
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found"
      });
    }

    // Log the moderation action to update user's standing and health
    await logModerationAction(
      story.user,
      "Post Deleted",
      null,
      req.body.reason || "Story content violates community guidelines.",
      req.user?.username || "Admin"
    );

    // Clean up story media files from storage
    if (story.mediaMetadata || story.mediaUrl) {
      await MediaService.deleteMedia(story.mediaMetadata || story.mediaUrl).catch((e) => {
        console.error("Failed to delete story media from storage:", e.message);
      });
    }

    await Story.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Story moderated and deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete story"
    });
  }
};

// Bulk Actions on Posts
const bulkDeletePosts = async (req, res) => {
  try {
    const Post = require("../models/Post");
    const { postIds } = req.body;
    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ success: false, message: "Invalid postIds format" });
    }

    const posts = await Post.find({ _id: { $in: postIds } });
    for (const post of posts) {
      await logModerationAction(
        post.author,
        "Post Deleted",
        null,
        "Bulk deleted by admin",
        req.user?.username || "Admin"
      );
      if (post.image || post.images?.length > 0 || post.video) {
        const MediaService = require("../services/mediaService");
        if (post.image) await MediaService.deleteMedia(post.image).catch(() => {});
        if (post.video) await MediaService.deleteMedia(post.video).catch(() => {});
        for (const img of post.images || []) {
          await MediaService.deleteMedia(img).catch(() => {});
        }
      }
    }

    await Post.deleteMany({ _id: { $in: postIds } });

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        for (const id of postIds) {
          socketHandler.io.emit("admin-post-action", { postId: id, post: null, isDeleted: true });
        }
      }
    } catch (e) {}

    res.status(200).json({ success: true, message: `${postIds.length} posts deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkHidePosts = async (req, res) => {
  try {
    const Post = require("../models/Post");
    const { postIds, hide } = req.body;
    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ success: false, message: "Invalid postIds format" });
    }

    const status = hide ? "hidden" : "active";
    const action = hide ? "Post Hidden" : "Post Restored";

    const posts = await Post.find({ _id: { $in: postIds } });
    for (const post of posts) {
      post.status = status;
      await post.save();
      await logModerationAction(
        post.author,
        action,
        post._id,
        "Bulk action by admin",
        req.user?.username || "Admin"
      );
    }

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        for (const post of posts) {
          socketHandler.io.emit("admin-post-action", { postId: post._id, post });
        }
      }
    } catch (e) {}

    res.status(200).json({ success: true, message: `${postIds.length} posts status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkFeaturePosts = async (req, res) => {
  try {
    const Post = require("../models/Post");
    const { postIds, feature } = req.body;
    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({ success: false, message: "Invalid postIds format" });
    }

    const posts = await Post.find({ _id: { $in: postIds } });
    for (const post of posts) {
      post.isFeatured = feature;
      await post.save();
      await logModerationAction(
        post.author,
        feature ? "Featured by Admin" : "Post Restored",
        post._id,
        "Bulk action by admin",
        req.user?.username || "Admin"
      );
    }

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        for (const post of posts) {
          socketHandler.io.emit("admin-post-action", { postId: post._id, post });
        }
      }
    } catch (e) {}

    res.status(200).json({ success: true, message: `${postIds.length} posts featured status updated` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateAdminStoryStatus = async (req, res) => {
  try {
    const Story = require("../models/Story");
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "hidden"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    story.status = status;
    await story.save();

    await logModerationAction(
      story.user,
      status === "hidden" ? "Story Hidden" : "Story Restored",
      null,
      `Story status set to ${status} by admin`,
      req.user?.username || "Admin"
    );

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("admin-story-action", { storyId: id, story });
      }
    } catch (e) {}

    res.status(200).json({ success: true, message: `Story status updated to ${status}`, story });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleAdminStoryFeature = async (req, res) => {
  try {
    const Story = require("../models/Story");
    const { id } = req.params;
    const { isFeatured } = req.body;

    const story = await Story.findById(id);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    story.isFeatured = isFeatured;
    await story.save();

    await logModerationAction(
      story.user,
      isFeatured ? "Featured by Admin" : "Story Restored",
      null,
      isFeatured ? "Story featured by admin" : "Story unfeatured by admin",
      req.user?.username || "Admin"
    );

    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("admin-story-action", { storyId: id, story });
      }
    } catch (e) {}

    res.status(200).json({ success: true, message: `Story featured status updated`, story });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminGetReports = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const reports = await Report.find({ status })
      .populate("reporter", "username email avatar")
      .populate("reportedUser", "username email avatar isSuspended accountStatus accountHealth loginHistory totalWarnings totalViolations")
      .sort({ createdAt: -1 });

    // Group reports by reported user
    const grouped = {};
    reports.forEach(report => {
      const user = report.reportedUser;
      if (!user) return;
      
      const userIdStr = String(user._id);
      if (!grouped[userIdStr]) {
        grouped[userIdStr] = {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isSuspended: user.isSuspended,
            accountStatus: user.accountStatus,
            accountHealth: user.accountHealth,
            totalWarnings: user.totalWarnings || 0,
            totalViolations: user.totalViolations || 0,
            loginHistory: user.loginHistory || []
          },
          reports: [],
          count: 0
        };
      }
      
      grouped[userIdStr].reports.push({
        id: report._id,
        reporter: report.reporter ? {
          id: report.reporter._id,
          username: report.reporter.username,
          email: report.reporter.email
        } : null,
        reason: report.reason,
        details: report.details,
        evidenceType: report.evidenceType,
        evidenceId: report.evidenceId,
        createdAt: report.createdAt
      });
      grouped[userIdStr].count++;
    });

    const groupedList = Object.values(grouped).sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      groups: groupedList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const adminResolveReports = async (req, res) => {
  try {
    const { userId } = req.params;
    const { actionType, resolutionNotes } = req.body; // dismiss or resolve

    const statusValue = actionType === "dismiss" ? "dismissed" : "resolved";

    await Report.updateMany(
      { reportedUser: userId, status: "pending" },
      {
        status: statusValue,
        resolutionNotes: resolutionNotes || `Reports closed as ${statusValue}`,
        resolvedBy: req.user._id,
        resolvedAt: Date.now()
      }
    );

    res.status(200).json({
      success: true,
      message: `All pending reports for the user have been successfully ${statusValue}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAdminOverviewStats,
  getAllUsers,
  deleteUser,
  updateUserRole,
  updateUserTitle,
  getAllRooms,
  deleteRoom,
  getAllRatings,
  deleteRating,
  promoteSelf,
  toggleUserSuspension,
  adminIssueUserAction,
  getRecentMessages,
  deleteChatMessage,
  getMainMaintenanceStatus: getMaintenanceStatus,
  getMaintenanceStatus,
  toggleMaintenanceMode,
  getAdminPosts,
  deleteAdminPost,
  deleteAdminPostComment,
  updateAdminPostStatus,
  getAdminLoginLogs,
  getAdminStories,
  deleteAdminStory,
  bulkDeletePosts,
  bulkHidePosts,
  bulkFeaturePosts,
  updateAdminStoryStatus,
  toggleAdminStoryFeature,
  adminGetReports,
  adminResolveReports
};
