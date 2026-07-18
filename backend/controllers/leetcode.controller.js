const User = require("../models/User");
const leetcodeService = require("../services/leetcode.service");
const analyticsService = require("../services/analytics.service");

exports.connect = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "LeetCode username is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Set connection status
    user.competitiveProgramming.platforms.leetcode.username = username.trim();
    user.competitiveProgramming.platforms.leetcode.lastSynced = new Date();

    // Fetch initial stats
    const stats = await leetcodeService.fetchUserData(username.trim());
    user.competitiveProgramming.platforms.leetcode.stats = stats;

    // Recalculate unified dashboard statistics
    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "LeetCode account connected successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect LeetCode profile"
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const username = user.competitiveProgramming.platforms.leetcode.username;
    if (!username) {
      return res.status(400).json({ success: false, message: "No LeetCode profile connected to sync" });
    }

    // Fetch stats
    const stats = await leetcodeService.fetchUserData(username);
    user.competitiveProgramming.platforms.leetcode.stats = stats;
    user.competitiveProgramming.platforms.leetcode.lastSynced = new Date();

    // Recalculate unified dashboard statistics
    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "LeetCode stats refreshed successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh LeetCode profile"
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Clear connection status
    user.competitiveProgramming.platforms.leetcode.username = "";
    user.competitiveProgramming.platforms.leetcode.stats = null;
    user.competitiveProgramming.platforms.leetcode.lastSynced = null;

    // Recalculate unified dashboard statistics
    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "LeetCode account disconnected successfully",
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect LeetCode profile"
    });
  }
};
