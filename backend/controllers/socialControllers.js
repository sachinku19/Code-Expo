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

    const currentUser = await User.findById(currentUserId);
    const isFollowing = currentUser.following ? currentUser.following.some(id => String(id) === String(targetUserId)) : false;
    const io = req.app.get("io");

    if (isFollowing) {
      const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
        User.findByIdAndUpdate(
          currentUserId,
          { $pull: { following: targetUserId }, $inc: { followingCount: -1 } },
          { new: true }
        ).populate("following", "username email avatar bio followersCount followingCount coverBanner"),
        User.findByIdAndUpdate(
          targetUserId,
          { $pull: { followers: currentUserId }, $inc: { followersCount: -1 } },
          { new: true }
        ).populate("followers", "username email avatar bio followersCount followingCount coverBanner")
      ]);

      const followingCount = updatedCurrentUser?.followingCount || 0;
      const followersCount = updatedTargetUser?.followersCount || 0;

      if (io) {
        io.to(String(currentUserId)).emit("user:follow-update", { targetUserId, isFollowing: false, followingCount, targetUser: updatedTargetUser });
        io.to(String(targetUserId)).emit("user:followers-update", { followerId: currentUserId, isFollowing: false, followersCount, followerUser: updatedCurrentUser });
        
        io.to(String(currentUserId)).emit("follow-success", { targetUserId, isFollowing: false, followingCount });
        io.to(String(targetUserId)).emit("new-follower", { followerId: currentUserId, isFollowing: false, followersCount });
        io.emit("follow-count-updated", { userId: targetUserId, followersCount, followerId: currentUserId, followingCount });
      }

      return res.status(200).json({
        success: true,
        isFollowing: false,
        message: `Unfollowed ${targetUser.username}`
      });
    } else {
      const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
        User.findByIdAndUpdate(
          currentUserId,
          { $addToSet: { following: targetUserId }, $inc: { followingCount: 1 } },
          { new: true }
        ).populate("following", "username email avatar bio followersCount followingCount coverBanner"),
        User.findByIdAndUpdate(
          targetUserId,
          { $addToSet: { followers: currentUserId }, $inc: { followersCount: 1 } },
          { new: true }
        ).populate("followers", "username email avatar bio followersCount followingCount coverBanner")
      ]);

      const followingCount = updatedCurrentUser?.followingCount || 0;
      const followersCount = updatedTargetUser?.followersCount || 0;

      if (io) {
        io.to(String(currentUserId)).emit("user:follow-update", { targetUserId, isFollowing: true, followingCount, targetUser: updatedTargetUser });
        io.to(String(targetUserId)).emit("user:followers-update", { followerId: currentUserId, isFollowing: true, followersCount, followerUser: updatedCurrentUser });
        
        io.to(String(currentUserId)).emit("follow-success", { targetUserId, isFollowing: true, followingCount });
        io.to(String(targetUserId)).emit("new-follower", { followerId: currentUserId, isFollowing: true, followersCount });
        io.emit("follow-count-updated", { userId: targetUserId, followersCount, followerId: currentUserId, followingCount });
        io.to(String(currentUserId)).emit("suggestion-refresh", { followedUserId: targetUserId });
      }

      // Create notification
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

    const io = req.app.get("io");

    const [updatedTargetUser, updatedCurrentUser] = await Promise.all([
      User.findByIdAndUpdate(
        targetUserId,
        { $pull: { following: currentUserId }, $inc: { followingCount: -1 } },
        { new: true }
      ).populate("following", "username email avatar bio followersCount followingCount coverBanner"),
      User.findByIdAndUpdate(
        currentUserId,
        { $pull: { followers: targetUserId }, $inc: { followersCount: -1 } },
        { new: true }
      ).populate("followers", "username email avatar bio followersCount followingCount coverBanner")
    ]);

    const followingCount = updatedTargetUser?.followingCount || 0;
    const followersCount = updatedCurrentUser?.followersCount || 0;

    if (io) {
      io.to(String(targetUserId)).emit("user:follow-update", { targetUserId: currentUserId, isFollowing: false, followingCount, targetUser: updatedCurrentUser });
      io.to(String(currentUserId)).emit("user:followers-update", { followerId: targetUserId, isFollowing: false, followersCount, followerUser: updatedTargetUser });
    }

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
    const user = await User.findById(userId)
      .populate("followers", "username email avatar bio followersCount followingCount coverBanner")
      .lean();

    res.status(200).json({
      success: true,
      followers: user.followers || []
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get following list
const getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId)
      .populate("following", "username email avatar bio followersCount followingCount coverBanner")
      .lean();

    const io = req.app.get("io");
    const followingList = user.following || [];

    const followingWithOnline = followingList.map(uObj => {
      const userRoom = io?.sockets?.adapter?.rooms?.get(String(uObj._id));
      uObj.isOnline = !!(userRoom && userRoom.size > 0);
      return uObj;
    });

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

    const isLiked = room.likes ? room.likes.some(id => String(id) === String(userId)) : false;
    const updateQuery = isLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    const io = req.app.get("io");

    const updatedRoom = await Room.findByIdAndUpdate(
      room._id, 
      updateQuery, 
      { new: true }
    ).populate("likes", "username avatar email bio");

    const likesCount = updatedRoom.likes ? updatedRoom.likes.length : 0;
    const likedBy = updatedRoom.likes || [];

    if (io) {
      io.emit("room:like-update", { roomId, likesCount, likedBy });
      io.to(String(userId)).emit("room:my-likes-update", { roomId, isLiked: !isLiked });
    }

    if (!isLiked) {
      if (String(room.createdBy) !== String(userId)) {
        createAndSendNotification(room.createdBy, userId, "LIKE", "ROOMS", room._id, io);
      }
      logActivity(userId, req.user.username, room._id, room.title, "liked room");
    }

    return res.status(200).json({
      success: true,
      isLiked: !isLiked,
      likes: updatedRoom.likes,
      message: isLiked ? "Room unliked" : "Room liked"
    });
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
    const io = req.app.get("io");

    if (existingBookmark) {
      await Bookmark.deleteOne({ _id: existingBookmark._id });

      if (io) {
        io.to(String(userId)).emit("room:bookmark-update", { roomId, isBookmarked: false });
      }

      return res.status(200).json({
        success: true,
        isBookmarked: false,
        message: "Room removed from bookmarks"
      });
    } else {
      await Bookmark.create({ user: userId, room: room._id });

      if (io) {
        io.to(String(userId)).emit("room:bookmark-update", { roomId, isBookmarked: true });
      }

      // Notify owner
      if (String(room.createdBy) !== String(userId)) {
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

    const activities = await Activity.find({ 
      user: { $in: feedUserIds },
      activityType: { $ne: "VIEW_PROFILE" }
    })
      .populate("user", "username email avatar bio")
      .populate("targetUser", "username email avatar")
      .populate("room", "title roomId language")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await Activity.countDocuments({ 
      user: { $in: feedUserIds },
      activityType: { $ne: "VIEW_PROFILE" }
    });

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

    const currentUser = await User.findById(userId).select("following programmingLanguages").lean();
    const followingIds = (currentUser.following || []).map(id => String(id));
    const excludedIds = new Set([...followingIds, String(userId)]);

    const users = await User.find({ _id: { $nin: Array.from(excludedIds) } })
      .select("username avatar bio programmingLanguages followersCount coverBanner")
      .limit(100)
      .lean();

    const currentUserLangs = new Set(currentUser?.programmingLanguages || []);

    const followedUsers = await User.find({ _id: { $in: followingIds } }).select("following").lean();
    const mutualCandidates = {};
    followedUsers.forEach(fUser => {
      const fFollowing = fUser.following || [];
      fFollowing.forEach(id => {
        const idStr = String(id);
        if (!excludedIds.has(idStr)) {
          mutualCandidates[idStr] = (mutualCandidates[idStr] || 0) + 1;
        }
      });
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
      const uObj = item.user;
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

    const trendingRooms = await Room.aggregate([
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } }
        }
      },
      { $sort: { likesCount: -1, lastActivity: -1 } },
      { $limit: limit }
    ]);

    const populatedTrendingRooms = await Room.populate(trendingRooms, [
      { path: "createdBy", select: "username avatar" },
      { path: "likes", select: "username avatar email bio" }
    ]);

    const roomsResult = populatedTrendingRooms.map(room => ({
      ...room,
      likedBy: room.likes || []
    }));

    res.status(200).json({
      success: true,
      rooms: roomsResult
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

    const dbRoom = await Room.findOne({ roomId }).populate("likes", "username avatar email bio");
    if (!dbRoom) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const likesCount = dbRoom.likes ? dbRoom.likes.length : 0;
    const isLiked = dbRoom.likes ? dbRoom.likes.some(id => String(id._id || id) === String(userId)) : false;
    const isBookmarked = await Bookmark.exists({ user: userId, room: dbRoom._id });
    const likedBy = dbRoom.likes || [];

    res.status(200).json({
      success: true,
      likesCount,
      isLiked,
      isBookmarked,
      likedBy
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLikedRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({ likes: userId })
      .populate("createdBy", "username avatar")
      .populate("likes", "username avatar email bio")
      .lean();

    const roomsWithLikesCount = rooms.map(room => ({
      ...room,
      likesCount: room.likes ? room.likes.length : 0,
      likedBy: room.likes || []
    }));

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
        populate: [
          { path: "createdBy", select: "username avatar" },
          { path: "likes", select: "username avatar email bio" }
        ]
      });

    const rooms = bookmarks.map(b => b.room).filter(Boolean);
    const roomsWithLikesCount = rooms.map(room => {
      const roomObj = room.toObject ? room.toObject() : room;
      return {
        ...roomObj,
        likesCount: room.likes ? room.likes.length : 0,
        likedBy: room.likes || []
      };
    });

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
      .select("username email avatar bio programmingLanguages followersCount followingCount coverBanner")
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

    const [targetUser, rawRooms, rawLikedRooms, activitiesList] = await Promise.all([
      User.findById(targetUserId).select("username email avatar bio programmingLanguages followersCount followingCount executionsCount coverBanner followers following"),
      Room.find({ createdBy: targetUserId, isPrivate: false }).populate("createdBy", "username avatar").populate("likes", "username avatar email bio").sort({ createdAt: -1 }),
      Room.find({ likes: targetUserId, isPrivate: false }).populate("createdBy", "username avatar").populate("likes", "username avatar email bio").sort({ createdAt: -1 }),
      Activity.find({ user: targetUserId, activityType: { $ne: "VIEW_PROFILE" } })
    ]);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(currentUserId) !== String(targetUserId)) {
      Promise.all([
        User.updateOne({ _id: targetUserId }, { $inc: { profileViews: 1 } }),
        Activity.create({
          user: currentUserId,
          userId: currentUserId,
          username: req.user.username,
          action: `viewed ${targetUser.username}'s profile`,
          activityType: "VIEW_PROFILE",
          targetUser: targetUserId,
          points: 0
        })
      ]).catch(err => console.error("Error updating profile view stats:", err));
    }

    const followersCount = targetUser.followers ? targetUser.followers.length : 0;
    const followingCount = targetUser.following ? targetUser.following.length : 0;
    const isFollowing = targetUser.followers ? targetUser.followers.some(id => String(id) === String(currentUserId)) : false;

    if (targetUser.followersCount !== followersCount || targetUser.followingCount !== followingCount) {
      await User.updateOne(
        { _id: targetUserId },
        { followersCount, followingCount }
      );
      targetUser.followersCount = followersCount;
      targetUser.followingCount = followingCount;
    }

    // Calculate likesCount for target user's rooms and liked rooms
    const rooms = rawRooms.map(room => {
      const roomObj = room.toObject ? room.toObject() : room;
      return {
        ...roomObj,
        likesCount: room.likes ? room.likes.length : 0,
        likedBy: room.likes || []
      };
    });

    const likedRooms = rawLikedRooms.map(room => {
      const roomObj = room.toObject ? room.toObject() : room;
      return {
        ...roomObj,
        likesCount: room.likes ? room.likes.length : 0,
        likedBy: room.likes || []
      };
    });

    // Calculate contribution stats & heatmap for target user

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

const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Available", "Busy", "Coding", "In Meeting"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { status },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("user:status-update", { userId: req.user._id, status });
    }

    res.status(200).json({ success: true, status: updatedUser.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getNetworkAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 1. Fetch user stats
    const user = await User.findById(userId).select("followersCount followingCount executionsCount codingHours profileViews developerLevel reputationScore").lean();

    // 2. Fetch all follower relations to compute growth over the last 6 months
    const follows = await Follow.find({ following: userId }).select("createdAt").sort({ createdAt: 1 }).lean();
    
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" });
      months.push({ monthName, year: d.getFullYear(), monthIndex: d.getMonth() });
    }

    const followersGrowth = months.map(m => {
      // Find count of followers registered before the end of this month
      const endOfMonth = new Date(Date.UTC(m.year, m.monthIndex + 1, 1));
      const count = follows.filter(f => new Date(f.createdAt) < endOfMonth).length;
      return { month: m.monthName, count };
    });

    // 3. Fetch VIEW_PROFILE activities for this user over the last 7 days (Daily views)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const views = await Activity.find({
      targetUser: userId,
      activityType: "VIEW_PROFILE",
      createdAt: { $gte: sevenDaysAgo }
    }).select("createdAt").lean();

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[daysOfWeek[d.getDay()]] = 0;
    }

    views.forEach(v => {
      const dayName = daysOfWeek[new Date(v.createdAt).getDay()];
      if (dayMap[dayName] !== undefined) {
        dayMap[dayName]++;
      }
    });

    const profileViews = Object.keys(dayMap).map(day => ({
      day,
      count: dayMap[day]
    }));

    // 4. Weekly engagement percentage calculation (compare last 7 days views vs previous 7 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const allRecentViews = await Activity.find({
      targetUser: userId,
      activityType: "VIEW_PROFILE",
      createdAt: { $gte: fourteenDaysAgo }
    }).select("createdAt").lean();

    const thisWeekViews = allRecentViews.filter(v => new Date(v.createdAt) >= sevenDaysAgo).length;
    const lastWeekViews = allRecentViews.filter(v => new Date(v.createdAt) < sevenDaysAgo).length;

    let weeklyEngagement = "+0%";
    if (lastWeekViews > 0) {
      const diff = ((thisWeekViews - lastWeekViews) / lastWeekViews) * 100;
      weeklyEngagement = (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
    } else if (thisWeekViews > 0) {
      weeklyEngagement = "+" + (thisWeekViews * 100) + "%";
    }

    // 5. Coding activity (using actual executionsCount)
    const codingActivity = [
      { week: "W1", hours: Math.floor((user?.executionsCount || 0) * 0.1) },
      { week: "W2", hours: Math.floor((user?.executionsCount || 0) * 0.2) },
      { week: "W3", hours: Math.floor((user?.executionsCount || 0) * 0.3) },
      { week: "W4", hours: Math.floor((user?.executionsCount || 0) * 0.4) }
    ];

    // Determine developer rating tier based on reputationScore
    let developerRating = "Bronze Tier";
    if (user?.reputationScore >= 100) developerRating = "Diamond Tier";
    else if (user?.reputationScore >= 50) developerRating = "Platinum Tier";
    else if (user?.reputationScore >= 20) developerRating = "Gold Tier";
    else if (user?.reputationScore >= 5) developerRating = "Silver Tier";

    res.status(200).json({
      success: true,
      followersGrowth,
      profileViews,
      codingActivity,
      stats: {
        totalViews: user?.profileViews || 0,
        weeklyEngagement,
        roomHours: user?.codingHours || 0,
        developerRating
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  getLeaderboard,
  updateStatus,
  getNetworkAnalytics
};

