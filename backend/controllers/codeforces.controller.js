const User = require("../models/User");
const codeforcesService = require("../services/codeforces.service");
const analyticsService = require("../services/analytics.service");

exports.connect = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "Codeforces handle is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.codeforces.username = username.trim();
    user.competitiveProgramming.platforms.codeforces.lastSynced = new Date();

    const stats = await codeforcesService.fetchUserData(username.trim());
    user.competitiveProgramming.platforms.codeforces.stats = stats;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "Codeforces account connected successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect Codeforces profile"
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const username = user.competitiveProgramming.platforms.codeforces.username;
    if (!username) {
      return res.status(400).json({ success: false, message: "No Codeforces profile connected to sync" });
    }

    const stats = await codeforcesService.fetchUserData(username);
    user.competitiveProgramming.platforms.codeforces.stats = stats;
    user.competitiveProgramming.platforms.codeforces.lastSynced = new Date();

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "Codeforces stats refreshed successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh Codeforces profile"
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.codeforces.username = "";
    user.competitiveProgramming.platforms.codeforces.stats = null;
    user.competitiveProgramming.platforms.codeforces.lastSynced = null;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "Codeforces account disconnected successfully",
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect Codeforces profile"
    });
  }
};
