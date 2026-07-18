const User = require("../models/User");
const atcoderService = require("../services/atcoder.service");
const analyticsService = require("../services/analytics.service");

exports.connect = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "AtCoder username is required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.atcoder.username = username.trim();
    user.competitiveProgramming.platforms.atcoder.lastSynced = new Date();

    const stats = await atcoderService.fetchUserData(username.trim());
    user.competitiveProgramming.platforms.atcoder.stats = stats;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "AtCoder account connected successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect AtCoder profile"
    });
  }
};

exports.refresh = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const username = user.competitiveProgramming.platforms.atcoder.username;
    if (!username) {
      return res.status(400).json({ success: false, message: "No AtCoder profile connected to sync" });
    }

    const stats = await atcoderService.fetchUserData(username);
    user.competitiveProgramming.platforms.atcoder.stats = stats;
    user.competitiveProgramming.platforms.atcoder.lastSynced = new Date();

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "AtCoder stats refreshed successfully",
      stats,
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh AtCoder profile"
    });
  }
};

exports.disconnect = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.competitiveProgramming.platforms.atcoder.username = "";
    user.competitiveProgramming.platforms.atcoder.stats = null;
    user.competitiveProgramming.platforms.atcoder.lastSynced = null;

    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: "AtCoder account disconnected successfully",
      unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect AtCoder profile"
    });
  }
};
