const User = require("../models/User");
const Follow = require("../models/Follow");
const Room = require("../models/Room");
const RoomLike = require("../models/RoomLike");
const Bookmark = require("../models/Bookmark");
const Activity = require("../models/Activity");
const { createAndSendNotification } = require("./notificationControllers");
const { logActivity, getPointsForAction, calculateCodingMinutes } = require("./activityControllers");

// Follow/Unfollow user toggle
const toggleFollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (String(targetUserId) === String(currentUserId)) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingFollow = await Follow.findOne({ follower: currentUserId, following: targetUserId });

    if (existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });

      const followingCount = await Follow.countDocuments({ follower: currentUserId });
      const followersCount = await Follow.countDocuments({ following: targetUserId });

      await User.updateOne({ _id: currentUserId }, { followingCount });
      await User.updateOne({ _id: targetUserId }, { followersCount });

      return res.status(200).json({
        success: true,
        isFollowing: false,
        message: `Unfollowed ${targetUser.username}`
      });
    } else {
      await Follow.create({ follower: currentUserId, following: targetUserId });

      const followingCount = await Follow.countDocuments({ follower: currentUserId });
      const followersCount = await Follow.countDocuments({ following: targetUserId });

      await User.updateOne({ _id: currentUserId }, { followingCount });
      await User.updateOne({ _id: targetUserId }, { followersCount });

      // Create notification
      const io = req.app.get("io");
      createAndSendNotification(targetUserId, currentUserId, "FOLLOW", "SOCIAL", null, io);

      // Log activity
      logActivity(currentUserId, req.user.username, null, null, `followed ${targetUser.username}`);

      return res.status(200).json({
        success: true,
        isFollowing: true,
        message: `Followed ${targetUser.username}`
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Force remove follower
const removeFollower = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const followRelation = await Follow.findOne({ follower: targetUserId, following: currentUserId });
    if (!followRelation) {
      return res.status(404).json({ success: false, message: "Follower relation not found" });
    }

    await Follow.deleteOne({ _id: followRelation._id });

    const followingCount = await Follow.countDocuments({ follower: targetUserId });
    const followersCount = await Follow.countDocuments({ following: currentUserId });

    await User.updateOne({ _id: targetUserId }, { followingCount });
    await User.updateOne({ _id: currentUserId }, { followersCount });

    res.status(200).json({
      success: true,
      message: "Follower removed successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get followers list
const getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const followers = await Follow.find({ following: userId })
      .populate("follower", "username email avatar bio followersCount followingCount")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      followers: followers.map(f => f.follower).filter(Boolean)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get following list
const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const following = await Follow.find({ follower: userId })
      .populate("following", "username email avatar bio followersCount followingCount")
      .sort({ createdAt: -1 });

    const io = req.app.get("io");

    const followingWithOnline = following.map(f => {
      if (!f.following) return null;
      const uObj = f.following.toObject();
      const userRoom = io?.sockets?.adapter?.rooms?.get(String(uObj._id));
      uObj.isOnline = !!(userRoom && userRoom.size > 0);
      return uObj;
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      following: followingWithOnline
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Like / unlike room toggle
const toggleLikeRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const existingLike = await RoomLike.findOne({ user: userId, room: room._id });

    if (existingLike) {
      await RoomLike.deleteOne({ _id: existingLike._id });
      return res.status(200).json({
        success: true,
        isLiked: false,
        message: "Room unliked"
      });
    } else {
      try {
        await RoomLike.create({ user: userId, room: room._id });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(200).json({
            success: true,
            isLiked: true,
            message: "Room liked"
          });
        }
        throw error;
      }

      // Notify owner
      if (String(room.createdBy) !== String(userId)) {
        const io = req.app.get("io");
        createAndSendNotification(room.createdBy, userId, "LIKE", "ROOMS", room._id, io);
      }

      // Log activity
      logActivity(userId, req.user.username, room._id, room.title, "liked room");

      return res.status(200).json({
        success: true,
        isLiked: true,
        message: "Room liked"
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bookmark / unbookmark room toggle
const toggleBookmarkRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user._id;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const existingBookmark = await Bookmark.findOne({ user: userId, room: room._id });

    if (existingBookmark) {
      await Bookmark.deleteOne({ _id: existingBookmark._id });
      return res.status(200).json({
        success: true,
        isBookmarked: false,
        message: "Room removed from bookmarks"
      });
    } else {
      await Bookmark.create({ user: userId, room: room._id });

      // Notify owner
      if (String(room.createdBy) !== String(userId)) {
        const io = req.app.get("io");
        createAndSendNotification(room.createdBy, userId, "BOOKMARK", "ROOMS", room._id, io);
      }

      // Log activity
      logActivity(userId, req.user.username, room._id, room.title, "bookmarked room");

      return res.status(200).json({
        success: true,
        isBookmarked: true,
        message: "Room bookmarked"
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unified social activity feed (paginated)
const getSocialFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const followingRelations = await Follow.find({ follower: userId });
    const followingIds = followingRelations.map(f => f.following);

    // Include followed developers and the user themselves
    const feedUserIds = [...followingIds, userId];

    const activities = await Activity.find({ user: { $in: feedUserIds } })
      .populate("user", "username email avatar bio")
      .populate("targetUser", "username email avatar")
      .populate("room", "title roomId language")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Activity.countDocuments({ user: { $in: feedUserIds } });

    res.status(200).json({
      success: true,
      activities,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Developer suggestions (recommends people you don't follow)
const getDeveloperSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;

    const followingRelations = await Follow.find({ follower: userId });
    const followingIds = followingRelations.map(f => String(f.following));
    const excludedIds = new Set([...followingIds, String(userId)]);

    const users = await User.find({ _id: { $nin: Array.from(excludedIds) } })
      .select("username email avatar bio programmingLanguages followersCount")
      .limit(100);

    const currentUser = await User.findById(userId).select("programmingLanguages");
    const currentUserLangs = new Set(currentUser?.programmingLanguages || []);

    // 2nd degree follow checks (mutual connections)
    const secondDegreeRelations = await Follow.find({ follower: { $in: followingIds } });
    const mutualCandidates = {};
    secondDegreeRelations.forEach(rel => {
      const id = String(rel.following);
      if (!excludedIds.has(id)) {
        mutualCandidates[id] = (mutualCandidates[id] || 0) + 1;
      }
    });

    const scoredSuggestions = [];
    for (let candidate of users) {
      let score = 0;
      const candidateIdStr = String(candidate._id);

      if (mutualCandidates[candidateIdStr]) {
        score += mutualCandidates[candidateIdStr] * 10;
      }

      const candidateLangs = candidate.programmingLanguages || [];
      candidateLangs.forEach(lang => {
        if (currentUserLangs.has(lang)) {
          score += 5;
        }
      });

      score += Math.min(10, (candidate.followersCount || 0) * 0.5);

      scoredSuggestions.push({
        user: candidate,
        score,
        mutualCount: mutualCandidates[candidateIdStr] || 0
      });
    }

    scoredSuggestions.sort((a, b) => b.score - a.score);

    const io = req.app.get("io");

    const suggestions = scoredSuggestions.slice(0, 5).map(item => {
      const uObj = item.user.toObject();
      const userRoom = io?.sockets?.adapter?.rooms?.get(String(uObj._id));
      uObj.isOnline = !!(userRoom && userRoom.size > 0);
      return {
        ...uObj,
        mutualCount: item.mutualCount
      };
    });

    res.status(200).json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Trending rooms query
const getTrendingRooms = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const likedRoomsAgg = await RoomLike.aggregate([
      { $group: { _id: "$room", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    const roomIds = likedRoomsAgg.map(item => item._id);
    const rooms = await Room.find({ _id: { $in: roomIds } })
      .populate("createdBy", "username avatar")
      .select("title roomId createdBy language lastActivity");

    const roomLikesMap = {};
    likedRoomsAgg.forEach(item => {
      roomLikesMap[String(item._id)] = item.count;
    });

    // Map rooms preserving the aggregate's sorted order of roomIds
    let trendingRooms = roomIds
      .map(id => {
        const room = rooms.find(r => String(r._id) === String(id));
        if (!room) return null;
        return {
          ...room.toObject(),
          likesCount: roomLikesMap[String(id)] || 0
        };
      })
      .filter(Boolean);

    if (trendingRooms.length < limit) {
      const fillLimit = limit - trendingRooms.length;
      const activeRooms = await Room.find({ _id: { $nin: roomIds } })
        .populate("createdBy", "username avatar")
        .sort({ lastActivity: -1 })
        .limit(fillLimit);

      activeRooms.forEach(room => {
        trendingRooms.push({
          ...room.toObject(),
          likesCount: 0
        });
      });
    }

    // Sort final trendingRooms list to guarantee strict ordering
    trendingRooms.sort((a, b) => {
      const likesDiff = (b.likesCount || 0) - (a.likesCount || 0);
      if (likesDiff !== 0) return likesDiff;

      const dateB = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
      const dateA = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      rooms: trendingRooms
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Room likes/bookmarks states
const getRoomSocialStats = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user._id;

    const dbRoom = await Room.findOne({ roomId });
    if (!dbRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const likesCount = await RoomLike.countDocuments({ room: dbRoom._id });
    const isLiked = await RoomLike.exists({ user: userId, room: dbRoom._id });
    const isBookmarked = await Bookmark.exists({ user: userId, room: dbRoom._id });

    // Fetch details of users who liked this room
    const roomLikes = await RoomLike.find({ room: dbRoom._id })
      .populate("user", "username avatar email bio")
      .sort({ createdAt: -1 });

    const likedBy = roomLikes.map(like => like.user).filter(Boolean);

    res.status(200).json({
      success: true,
      likesCount,
      isLiked: !!isLiked,
      isBookmarked: !!isBookmarked,
      likedBy
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLikedRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const likes = await RoomLike.find({ user: userId })
      .populate({
        path: "room",
        populate: { path: "createdBy", select: "username avatar" }
      });

    const rooms = likes.map(l => l.room).filter(Boolean);
    const roomsWithLikesCount = await Promise.all(
      rooms.map(async (room) => {
        const likesCount = await RoomLike.countDocuments({ room: room._id });
        const roomLikes = await RoomLike.find({ room: room._id }).populate("user", "username avatar email").select("user");
        const likedBy = roomLikes.map(l => l.user).filter(Boolean);
        return {
          ...room.toObject(),
          likesCount,
          likedBy
        };
      })
    );

    res.status(200).json({
      success: true,
      rooms: roomsWithLikesCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookmarkedRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookmarks = await Bookmark.find({ user: userId })
      .populate({
        path: "room",
        populate: { path: "createdBy", select: "username avatar" }
      });

    const rooms = bookmarks.map(b => b.room).filter(Boolean);
    const roomsWithLikesCount = await Promise.all(
      rooms.map(async (room) => {
        const likesCount = await RoomLike.countDocuments({ room: room._id });
        const roomLikes = await RoomLike.find({ room: room._id }).populate("user", "username avatar email").select("user");
        const likedBy = roomLikes.map(l => l.user).filter(Boolean);
        return {
          ...room.toObject(),
          likesCount,
          likedBy
        };
      })
    );

    res.status(200).json({
      success: true,
      rooms: roomsWithLikesCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const query = req.query.q || "";
    if (!query) {
      return res.status(200).json({ success: true, users: [] });
    }
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ]
    })
      .select("username email avatar bio programmingLanguages followersCount followingCount")
      .limit(10);

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUserPublicProfile = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId)
      .select("username email avatar bio programmingLanguages followersCount followingCount executionsCount");

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const followersCount = await Follow.countDocuments({ following: targetUserId });
    const followingCount = await Follow.countDocuments({ follower: targetUserId });

    if (targetUser.followersCount !== followersCount || targetUser.followingCount !== followingCount) {
      await User.updateOne(
        { _id: targetUserId },
        { followersCount, followingCount }
      );
      targetUser.followersCount = followersCount;
      targetUser.followingCount = followingCount;
    }

    const isFollowing = await Follow.exists({ follower: currentUserId, following: targetUserId });

    const rawRooms = await Room.find({ createdBy: targetUserId, isPrivate: false })
      .populate("createdBy", "username avatar")
      .sort({ createdAt: -1 });

    const likes = await RoomLike.find({ user: targetUserId })
      .populate({
        path: "room",
        populate: { path: "createdBy", select: "username avatar" }
      });
    const rawLikedRooms = likes.map(l => l.room).filter(Boolean).filter(r => !r.isPrivate);

    // Calculate likesCount for target user's rooms and liked rooms
    const rooms = await Promise.all(
      rawRooms.map(async (room) => {
        const likesCount = await RoomLike.countDocuments({ room: room._id });
        const roomLikes = await RoomLike.find({ room: room._id }).populate("user", "username avatar email").select("user");
        const likedBy = roomLikes.map(l => l.user).filter(Boolean);
        return {
          ...room.toObject(),
          likesCount,
          likedBy
        };
      })
    );

    const likedRooms = await Promise.all(
      rawLikedRooms.map(async (room) => {
        const likesCount = await RoomLike.countDocuments({ room: room._id });
        const roomLikes = await RoomLike.find({ room: room._id }).populate("user", "username avatar email").select("user");
        const likedBy = roomLikes.map(l => l.user).filter(Boolean);
        return {
          ...room.toObject(),
          likesCount,
          likedBy
        };
      })
    );

    // Calculate contribution stats & heatmap for target user
    const activitiesList = await Activity.find({ user: targetUserId });

    const yearQuery = req.query.year;
    const defaultActions = () => ({
      points: 0,
      count: 0,
      roomCreated: 0,
      codeExecution: 0,
      whiteboardActivity: 0,
      messagesSent: 0,
      filesEdited: 0,
      other: 0
    });

    const heatmapData = {};
    let startDate, endDate;

    if (yearQuery && yearQuery !== "last12") {
      const year = parseInt(yearQuery);
      startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

      let current = new Date(Date.UTC(year, 0, 1, 12, 0, 0));
      const end = new Date(Date.UTC(year, 11, 31, 12, 0, 0));
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        heatmapData[dateStr] = defaultActions();
        current.setUTCDate(current.getUTCDate() + 1);
      }
    } else {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      startDate = new Date(Date.UTC(startMonth.getFullYear(), startMonth.getMonth(), 1, 0, 0, 0));
      endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59));

      let current = new Date(startDate.getTime());
      current.setUTCHours(12, 0, 0, 0);
      const end = new Date(endDate.getTime());
      end.setUTCHours(12, 0, 0, 0);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        heatmapData[dateStr] = defaultActions();
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    // Filter activities by the selected date range
    const filteredActivities = activitiesList.filter(act => {
      const timestamp = act.createdAt || act.timestamp;
      if (!timestamp) return false;
      const date = new Date(timestamp);
      return date >= startDate && date <= endDate;
    });

    const executionsCount = filteredActivities.filter(act => act.action === "executed").length;

    const uniqueHours = new Set();
    filteredActivities.forEach(act => {
      const d = new Date(act.timestamp || act.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}`;
      uniqueHours.add(key);
    });
    const codingHours = uniqueHours.size;
    const codingMinutes = calculateCodingMinutes(filteredActivities);

    // Calculate total points for the selected period
    let totalPoints = 0;
    filteredActivities.forEach(act => {
      totalPoints += (act.points !== undefined && act.points !== null) ? act.points : getPointsForAction(act.action);
    });

    // Calculate lifetime points
    let lifetimePoints = targetUser.executionsCount || 0;

    // Sync totalPoints to executionsCount if in default view (no specific year query)
    if (!yearQuery || yearQuery === "last12") {
      totalPoints = lifetimePoints;
    }

    // Populate heatmap data
    filteredActivities.forEach(act => {
      const timestamp = act.createdAt || act.timestamp;
      if (timestamp) {
        const dateStr = new Date(timestamp).toISOString().split("T")[0];
        if (heatmapData[dateStr] !== undefined) {
          const action = act.action ? act.action.toLowerCase() : "";
          const points = (act.points !== undefined && act.points !== null) ? act.points : getPointsForAction(act.action);

          heatmapData[dateStr].points += points;
          heatmapData[dateStr].count++;

          if (action.includes("created") && action.includes("room")) {
            heatmapData[dateStr].roomCreated++;
          } else if (action === "executed" || action.includes("execute")) {
            heatmapData[dateStr].codeExecution++;
          } else if (action === "shared whiteboard" || action.includes("whiteboard")) {
            heatmapData[dateStr].whiteboardActivity++;
          } else if (action === "chat" || action.includes("message") || action === "message") {
            heatmapData[dateStr].messagesSent++;
          } else if (action === "edited" || action.includes("saved changes") || action.includes("edit")) {
            heatmapData[dateStr].filesEdited++;
          } else {
            heatmapData[dateStr].other++;
          }
        }
      }
    });

    const sortedDates = Object.keys(heatmapData).sort();
    const heatmapArray = sortedDates.map(date => {
      const dayData = heatmapData[date];
      let level = 0;
      if (dayData.points > 0) {
        if (dayData.points <= 2) level = 1;
        else if (dayData.points <= 5) level = 2;
        else if (dayData.points <= 10) level = 3;
        else level = 4;
      }
      return {
        date,
        points: dayData.points,
        count: dayData.count,
        level,
        actions: {
          roomCreated: dayData.roomCreated,
          codeExecution: dayData.codeExecution,
          whiteboardActivity: dayData.whiteboardActivity,
          messagesSent: dayData.messagesSent,
          filesEdited: dayData.filesEdited,
          other: dayData.other
        }
      };
    });

    const activeYears = new Set();
    activeYears.add(new Date().getFullYear());
    activitiesList.forEach(act => {
      if (act.timestamp) {
        activeYears.add(new Date(act.timestamp).getFullYear());
      }
    });
    const yearsArray = Array.from(activeYears).sort((a, b) => b - a);

    res.status(200).json({
      success: true,
      user: targetUser,
      isFollowing: !!isFollowing,
      rooms,
      likedRooms,
      stats: {
        codingHours,
        codingMinutes,
        executions: executionsCount,
        heatmap: heatmapArray,
        years: yearsArray,
        totalPoints,
        lifetimePoints
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const User = require("../models/User");
    const users = await User.find({}, "username avatar email title executionsCount")
      .sort({ executionsCount: -1 })
      .limit(100);

    const leaderboard = users.map((u, idx) => ({
      userId: u._id,
      username: u.username,
      avatar: u.avatar,
      email: u.email,
      title: u.title,
      xp: u.executionsCount || 0,
      rank: idx + 1
    }));

    res.status(200).json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  toggleFollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  toggleLikeRoom,
  toggleBookmarkRoom,
  getSocialFeed,
  getDeveloperSuggestions,
  getTrendingRooms,
  getRoomSocialStats,
  getLikedRooms,
  getBookmarkedRooms,
  searchUsers,
  getUserPublicProfile,
  getLeaderboard
};

