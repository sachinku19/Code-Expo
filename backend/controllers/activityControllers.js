const Activity = require("../models/Activity");

const getActivityFeed = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate("user", "username email avatar")
      .sort({ timestamp: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      activities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getPointsForAction = (action) => {
  if (!action) return 0;
  const act = action.toLowerCase();
  
  if (act === "executed" || act.includes("execute")) {
    return 1;
  }
  return 0;
};

const logActivity = async (userId, username, roomId, roomTitle, action) => {
  try {
    const throttleTime = new Date(Date.now() - 30 * 1000); // 30s throttle
    const existingActivity = await Activity.findOne({
      user: userId,
      room: roomId,
      action,
      timestamp: { $gte: throttleTime }
    });

    if (existingActivity) return;

    const points = getPointsForAction(action);

    await Activity.create({
      user: userId,
      userId: userId,
      username,
      room: roomId,
      roomTitle,
      action,
      activityType: action,
      points,
      timestamp: new Date(),
      createdAt: new Date()
    });

    // Storage optimization: Keep only the 15 most recent activities globally
    const count = await Activity.countDocuments();
    if (count > 15) {
      const activitiesToKeep = await Activity.find()
        .sort({ timestamp: -1 })
        .limit(15)
        .select("_id");
      const keepIds = activitiesToKeep.map(act => act._id);
      await Activity.deleteMany({ _id: { $nin: keepIds } });
    }
  } catch (error) {
    console.error("Error logging activity:", error.message);
  }
};

const calculateCodingMinutes = (activities) => {
  if (!activities || activities.length === 0) return 0;
  
  const activeActivities = activities.filter(act => {
    if (!act.action) return false;
    const a = act.action.toLowerCase();
    return a.includes("edit") || 
           a.includes("save") || 
           a.includes("execute") || 
           a.includes("whiteboard") || 
           a.includes("chat") || 
           a.includes("message") ||
           a.includes("joined") ||
           a.includes("create");
  });

  if (activeActivities.length === 0) return 0;

  const sorted = [...activeActivities].sort((a, b) => {
    const tA = a.createdAt || a.timestamp;
    const tB = b.createdAt || b.timestamp;
    return new Date(tA) - new Date(tB);
  });

  let totalMinutes = 0;
  let sessionStart = new Date(sorted[0].createdAt || sorted[0].timestamp);
  let sessionLast = new Date(sorted[0].createdAt || sorted[0].timestamp);

  const SESSION_THRESHOLD_MS = 20 * 60 * 1000;

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].createdAt || sorted[i].timestamp);
    if (current - sessionLast <= SESSION_THRESHOLD_MS) {
      sessionLast = current;
    } else {
      const durationMs = sessionLast - sessionStart;
      const durationMins = Math.round(durationMs / 60000) + 5;
      totalMinutes += durationMins;

      sessionStart = current;
      sessionLast = current;
    }
  }

  const durationMs = sessionLast - sessionStart;
  const durationMins = Math.round(durationMs / 60000) + 5;
  totalMinutes += durationMins;

  return totalMinutes;
};

const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const Room = require("../models/Room");

    const activities = await Activity.find({ user: userId });

    // 1. Heatmap: Activity level for each of the last 365 days or calendar year
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
      endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59));

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
    const filteredActivities = activities.filter(act => {
      const timestamp = act.createdAt || act.timestamp;
      if (!timestamp) return false;
      const date = new Date(timestamp);
      return date >= startDate && date <= endDate;
    });

    // 2. Get executions count (use the persistent user record count directly)
    const executionsCount = req.user.executionsCount || 0;

    // 3. Get unique active hours (coding hours) in the selected period
    const uniqueHours = new Set();
    filteredActivities.forEach(act => {
      const d = new Date(act.timestamp || act.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()} ${d.getHours()}`;
      uniqueHours.add(key);
    });
    const codingHours = uniqueHours.size;
    const codingMinutes = calculateCodingMinutes(filteredActivities);

    // 4. Created Rooms breakdown (within period if selected, otherwise lifetime)
    // For rooms we'll query based on period
    const roomQuery = { createdBy: userId };
    if (yearQuery) {
      roomQuery.createdAt = { $gte: startDate, $lte: endDate };
    }
    const totalCreatedCount = await Room.countDocuments(roomQuery);
    const publicCreatedCount = await Room.countDocuments({ ...roomQuery, isPrivate: false });
    const privateCreatedCount = await Room.countDocuments({ ...roomQuery, isPrivate: true });

    // 5. Joined Rooms from start (safe lookup in participants array + historic activity distinct)
    const currentJoinedRooms = await Room.find({
      participants: userId
    });
    const currentJoinedIds = currentJoinedRooms
      .filter(room => room.createdBy.toString() !== userId.toString())
      .map(room => room._id.toString());

    const historicJoinedRooms = await Activity.distinct("room", {
      user: userId,
      action: { $regex: /joined/i }
    });

    const allJoinedRoomIds = new Set([
      ...historicJoinedRooms.map(id => id ? id.toString() : null).filter(Boolean),
      ...currentJoinedIds
    ]);
    const totalJoinedFromStart = allJoinedRoomIds.size;

    // 6. Total points in the selected period
    let totalPoints = 0;
    filteredActivities.forEach(act => {
      totalPoints += (act.points !== undefined && act.points !== null) ? act.points : getPointsForAction(act.action);
    });

    // 7. Lifetime points
    let lifetimePoints = req.user.executionsCount || 0;

    // Sync totalPoints to executionsCount if in default dashboard view (no specific year query)
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
    activities.forEach(act => {
      if (act.timestamp) {
        activeYears.add(new Date(act.timestamp).getFullYear());
      }
    });
    const yearsArray = Array.from(activeYears).sort((a, b) => b - a);

    res.status(200).json({
      success: true,
      stats: {
        codingHours,
        codingMinutes,
        executions: executionsCount,
        heatmap: heatmapArray,
        years: yearsArray,
        totalCreatedCount,
        publicCreatedCount,
        privateCreatedCount,
        totalJoinedFromStart,
        totalPoints,
        lifetimePoints
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getActivityFeed,
  logActivity,
  getStats,
  getPointsForAction,
  calculateCodingMinutes
};
