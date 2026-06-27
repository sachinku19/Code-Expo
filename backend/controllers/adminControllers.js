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
const MediaService = require("../services/MediaService");
const LoginLog = require("../models/LoginLog");

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

// 1. Overview Analytics Stats
const getAdminOverviewStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const onlineUsers = await User.countDocuments({ isOnline: { $in: [true, "true"] } });
    const totalRooms = await Room.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Sum executions
    const usersWithExecutions = await User.aggregate([
      {
        $group: {
          _id: null,
          totalExecutions: { $sum: "$executionsCount" }
        }
      }
    ]);
    const totalExecutions = usersWithExecutions.length > 0 ? usersWithExecutions[0].totalExecutions : 0;

    // Website ratings aggregated stats
    const ratingStats = await WebsiteRating.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]);
    const averageRating = ratingStats.length > 0 ? Math.round(ratingStats[0].average * 10) / 10 : 0;
    const totalRatings = ratingStats.length > 0 ? ratingStats[0].count : 0;

    // Website ratings star distribution
    const ratingDistribution = await WebsiteRating.aggregate([
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 }
        }
      }
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((dist) => {
      if (dist._id >= 1 && dist._id <= 5) {
        distribution[dist._id] = dist.count;
      }
    });

    // Recent activity counts (24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecutions = await Activity.countDocuments({
      action: "executed",
      createdAt: { $gte: oneDayAgo }
    });
    const recentRoomsCreated = await Room.countDocuments({
      createdAt: { $gte: oneDayAgo }
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
        recentRoomsCreated
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

    const admins = await User.find(adminQuery).sort({ createdAt: -1 });
    const total = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
    await user.save();

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

    let query = {};
    if (req.query.status && req.query.status !== "all") {
      query.status = req.query.status;
    }
    if (search) {
      const matchingUsers = await User.find({
        username: { $regex: search, $options: "i" }
      }).select("_id");
      const userIds = matchingUsers.map(u => u._id);

      if (query.status) {
        query.$and = [
          { status: query.status },
          {
            $or: [
              { text: { $regex: search, $options: "i" } },
              { techStack: { $regex: search, $options: "i" } },
              { author: { $in: userIds } }
            ]
          }
        ];
        delete query.status;
      } else {
        query.$or = [
          { text: { $regex: search, $options: "i" } },
          { techStack: { $regex: search, $options: "i" } },
          { author: { $in: userIds } }
        ];
      }
    }

    // Compute Feed Statistics
    const totalPosts = await Post.countDocuments();
    const flaggedPosts = await Post.countDocuments({ status: "flagged" });
    const hiddenPosts = await Post.countDocuments({ status: "hidden" });
    
    // Compute total comments count via aggregation
    const commentsCount = await Post.aggregate([
      { $project: { numberOfComments: { $size: { $ifNull: ["$comments", []] } } } },
      { $group: { _id: null, total: { $sum: "$numberOfComments" } } }
    ]);
    const totalComments = commentsCount.length > 0 ? commentsCount[0].total : 0;

    const totalFiltered = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate("author", "username email avatar title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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
          title: p.author.title
        } : { username: "Unknown / Deleted User" }
      })),
      stats: {
        totalPosts,
        flaggedPosts,
        hiddenPosts,
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

    // Delete post images via MediaService
    if (post.imagesMetadata && post.imagesMetadata.length > 0) {
      await MediaService.deleteMultipleMedia(post.imagesMetadata).catch((e) => {
        console.error("Failed to delete post images array from storage:", e.message);
      });
    } else if (post.imageMetadata || post.image) {
      await MediaService.deleteMedia(post.imageMetadata || post.image).catch((e) => {
        console.error("Failed to delete post image from storage:", e.message);
      });
    }

    await Post.deleteOne({ _id: postId });

    res.status(200).json({
      success: true,
      message: "Post has been deleted and moderated successfully."
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
    const { status, legalCase } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (status) {
      if (!["active", "flagged", "hidden"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Must be 'active', 'flagged', or 'hidden'."
        });
      }
      post.status = status;
    }

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

    res.status(200).json({
      success: true,
      message: `Post compliance status updated successfully.`,
      post: {
        id: post._id,
        status: post.status,
        legalCase: post.legalCase
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

    const query = {};

    if (req.query.userId) {
      query.user = req.query.userId;
    } else if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const total = await LoginLog.countDocuments(query);
    const logs = await LoginLog.find(query)
      .populate("user", "avatar username email role title executionsCount createdAt isOnline")
      .sort({ loginTime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      logs: logs.map(log => ({
        id: log._id,
        user: log.user ? {
          id: log.user._id,
          username: log.user.username,
          email: log.user.email,
          avatar: log.user.avatar,
          role: log.user.role,
          title: log.user.title,
          executionsCount: log.user.executionsCount,
          createdAt: log.user.createdAt,
          isOnline: log.user.isOnline === "true" || log.user.isOnline === true
        } : null,
        username: log.username,
        email: log.email,
        loginTime: log.loginTime,
        logoutTime: log.logoutTime,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt
      })),
      pagination: {
        page,
        limit,
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
  getRecentMessages,
  deleteChatMessage,
  getMaintenanceStatus,
  toggleMaintenanceMode,
  getAdminPosts,
  deleteAdminPost,
  deleteAdminPostComment,
  updateAdminPostStatus,
  getAdminLoginLogs
};
