const User = require("../models/User");
const codechefService = require("../services/codechef.service");
const analyticsService = require("../services/analytics.service");

exports.connect = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "CodeChef username is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.codechef.username = username.trim();
    user.competitiveProgramming.platforms.codechef.lastSynced = new Date();

    const stats = await codechefService.fetchUserData(username.trim());
    user.competitiveProgramming.platforms.codechef.stats = stats;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "CodeChef account connected successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect CodeChef profile"
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const username = user.competitiveProgramming.platforms.codechef.username;
    if (!username) {
      return res.status(400).json({ success: false, message: "No CodeChef profile connected to sync" });
    }

    const stats = await codechefService.fetchUserData(username);
    user.competitiveProgramming.platforms.codechef.stats = stats;
    user.competitiveProgramming.platforms.codechef.lastSynced = new Date();

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "CodeChef stats refreshed successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh CodeChef profile"
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.codechef.username = "";
    user.competitiveProgramming.platforms.codechef.stats = null;
    user.competitiveProgramming.platforms.codechef.lastSynced = null;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "CodeChef account disconnected successfully",
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect CodeChef profile"
    });
  }
};
