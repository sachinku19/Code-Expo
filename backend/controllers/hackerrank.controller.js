const User = require("../models/User");
const hackerrankService = require("../services/hackerrank.service");
const analyticsService = require("../services/analytics.service");

exports.connect = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "HackerRank username is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.hackerrank.username = username.trim();
    user.competitiveProgramming.platforms.hackerrank.lastSynced = new Date();

    const stats = await hackerrankService.fetchUserData(username.trim());
    user.competitiveProgramming.platforms.hackerrank.stats = stats;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "HackerRank account connected successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect HackerRank profile"
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const username = user.competitiveProgramming.platforms.hackerrank.username;
    if (!username) {
      return res.status(400).json({ success: false, message: "No HackerRank profile connected to sync" });
    }

    const stats = await hackerrankService.fetchUserData(username);
    user.competitiveProgramming.platforms.hackerrank.stats = stats;
    user.competitiveProgramming.platforms.hackerrank.lastSynced = new Date();

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "HackerRank stats refreshed successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh HackerRank profile"
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.hackerrank.username = "";
    user.competitiveProgramming.platforms.hackerrank.stats = null;
    user.competitiveProgramming.platforms.hackerrank.lastSynced = null;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "HackerRank account disconnected successfully",
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect HackerRank profile"
    });
  }
};
