const User = require("../models/User");
const analyticsService = require("../services/analytics.service");

// Import core services for fetching
const leetcodeService = require("../services/leetcode.service");
const codeforcesService = require("../services/codeforces.service");
const codechefService = require("../services/codechef.service");
const hackerrankService = require("../services/hackerrank.service");
const atcoderService = require("../services/atcoder.service");

// GET unified dashboard stats
exports.getUnifiedStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let unified = user.competitiveProgramming.unifiedStats;
    
    // Aggregation trigger if cache is empty but platforms are connected
    const connectedCount = Object.keys(user.competitiveProgramming.platforms || {}).filter(
      key => user.competitiveProgramming.platforms[key].username
    ).length;

    if ((!unified || Object.keys(unified).length === 0) && connectedCount > 0) {
      unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
      user.competitiveProgramming.unifiedStats = unified;
      user.competitiveProgramming.lastUpdated = new Date();
      user.markModified("competitiveProgramming");
      await user.save();
    }

    res.status(200).json({
      success: true,
      platforms: user.competitiveProgramming.platforms,
      unifiedStats: unified || null,
      lastUpdated: user.competitiveProgramming.lastUpdated || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch unified competitive programming stats"
    });
  }
};

// Connect platform (Universal endpoint)
exports.connectPlatform = async (req, res) => {
  try {
    const { platform, username } = req.body;
    if (!platform || !username || username.trim() === "") {
      return res.status(400).json({ success: false, message: "Platform and username are required" });
    }

    const platformKey = platform.toLowerCase().replace(/\s/g, "");
    
    // Supported platforms check
    const supported = ["leetcode", "codeforces", "codechef", "atcoder", "hackerrank"];
    if (!supported.includes(platformKey)) {
      return res.status(400).json({ success: false, message: `Platform '${platform}' is not supported.` });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check for duplicate platform connections across all accounts
    const existingConnection = await User.findOne({
      [`competitiveProgramming.platforms.${platformKey}.username`]: username.trim(),
      _id: { $ne: user._id }
    });
    if (existingConnection) {
      return res.status(400).json({ 
        success: false, 
        message: `The username '${username}' is already connected to another CodeExpo account on ${platform}.` 
      });
    }

    // Temporarily set status to syncing
    user.competitiveProgramming.platforms[platformKey].username = username.trim();
    user.competitiveProgramming.platforms[platformKey].lastSynced = new Date();
    user.competitiveProgramming.platforms[platformKey].syncStatus = "Syncing";
    user.competitiveProgramming.platforms[platformKey].lastError = "";
    user.markModified("competitiveProgramming");
    await user.save();

    // Fetch and validate stats
    let stats;
    try {
      if (platformKey === "leetcode") stats = await leetcodeService.fetchUserData(username.trim());
      else if (platformKey === "codeforces") stats = await codeforcesService.fetchUserData(username.trim());
      else if (platformKey === "codechef") stats = await codechefService.fetchUserData(username.trim());
      else if (platformKey === "hackerrank") stats = await hackerrankService.fetchUserData(username.trim());
      else if (platformKey === "atcoder") stats = await atcoderService.fetchUserData(username.trim());

      if (!stats) {
        throw new Error("Empty statistics returned from platform API.");
      }

      user.competitiveProgramming.platforms[platformKey].stats = stats;
      user.competitiveProgramming.platforms[platformKey].syncStatus = "Synced";
      user.competitiveProgramming.platforms[platformKey].lastError = "";
    } catch (fetchErr) {
      // Revert connection properties on validation failure
      user.competitiveProgramming.platforms[platformKey].username = "";
      user.competitiveProgramming.platforms[platformKey].stats = null;
      user.competitiveProgramming.platforms[platformKey].lastSynced = null;
      user.competitiveProgramming.platforms[platformKey].syncStatus = "Not Connected";
      user.competitiveProgramming.platforms[platformKey].lastError = "";
      user.markModified("competitiveProgramming");
      await user.save();

      return res.status(400).json({
        success: false,
        message: `Validation failed: Username '${username}' could not be verified on ${platform}. Details: ${fetchErr.message}`
      });
    }

    // Recalculate unified
    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: `${platform} connected successfully`,
      platforms: user.competitiveProgramming.platforms,
      unifiedStats: unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to connect platform"
    });
  }
};

// Refresh platforms (Universal endpoint - handles all or single manual refresh)
exports.refreshAllPlatforms = async (req, res) => {
  try {
    const { platform } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const platforms = user.competitiveProgramming.platforms;
    let keysToRefresh = [];

    if (platform) {
      const platformKey = platform.toLowerCase().replace(/\s/g, "");
      if (!platforms[platformKey]) {
        return res.status(400).json({ success: false, message: `Platform '${platform}' is not supported.` });
      }
      if (!platforms[platformKey].username) {
        return res.status(400).json({ success: false, message: `Platform '${platform}' is not connected yet.` });
      }
      keysToRefresh = [platformKey];
    } else {
      keysToRefresh = Object.keys(platforms).filter(key => platforms[key].username);
    }

    if (keysToRefresh.length === 0) {
      return res.status(400).json({ success: false, message: "No platforms connected to refresh" });
    }

    // Set statuses to syncing first
    for (const key of keysToRefresh) {
      platforms[key].syncStatus = "Syncing";
    }
    user.markModified("competitiveProgramming");
    await user.save();

    const warnings = [];

    // Sync each platform independently (anti-fragile integration)
    for (const key of keysToRefresh) {
      const username = platforms[key].username;
      try {
        let stats;
        if (key === "leetcode") stats = await leetcodeService.fetchUserData(username);
        else if (key === "codeforces") stats = await codeforcesService.fetchUserData(username);
        else if (key === "codechef") stats = await codechefService.fetchUserData(username);
        else if (key === "hackerrank") stats = await hackerrankService.fetchUserData(username);
        else if (key === "atcoder") stats = await atcoderService.fetchUserData(username);

        if (!stats) {
          throw new Error("Platform returned empty data.");
        }

        platforms[key].stats = stats;
        platforms[key].lastSynced = new Date();
        platforms[key].syncStatus = "Synced";
        platforms[key].lastError = "";
      } catch (err) {
        // Log warning and retain previously cached data
        warnings.push(`Unable to refresh ${key.charAt(0).toUpperCase() + key.slice(1)}. Showing previously synced data.`);
        platforms[key].syncStatus = "Failed";
        platforms[key].lastError = err.message || "Failed to fetch updated data from platform API.";
      }
    }

    // Recalculate unified stats using whatever data is available
    const unified = await analyticsService.aggregateStats(user.username, platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: warnings.length === 0 ? "Synchronization completed successfully" : "Synchronization completed with warnings",
      warnings,
      platforms,
      unifiedStats: unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to refresh competitive programming platforms"
    });
  }
};

// Disconnect platform (Universal endpoint)
exports.disconnectPlatform = async (req, res) => {
  try {
    const { platform } = req.body;
    if (!platform) {
      return res.status(400).json({ success: false, message: "Platform is required" });
    }

    const platformKey = platform.toLowerCase().replace(/\s/g, "");
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.competitiveProgramming.platforms[platformKey]) {
      return res.status(400).json({ success: false, message: `Platform '${platform}' is not supported.` });
    }

    // Clear platform fields
    user.competitiveProgramming.platforms[platformKey].username = "";
    user.competitiveProgramming.platforms[platformKey].stats = null;
    user.competitiveProgramming.platforms[platformKey].lastSynced = null;
    user.competitiveProgramming.platforms[platformKey].syncStatus = "Not Connected";
    user.competitiveProgramming.platforms[platformKey].lastError = "";

    // Recalculate unified
    const unified = await analyticsService.aggregateStats(user.username, user.competitiveProgramming.platforms);
    user.competitiveProgramming.unifiedStats = unified;
    user.competitiveProgramming.lastUpdated = new Date();

    user.markModified("competitiveProgramming");
    await user.save();

    res.status(200).json({
      success: true,
      message: `${platform} disconnected successfully`,
      platforms: user.competitiveProgramming.platforms,
      unifiedStats: unified
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to disconnect platform"
    });
  }
};

// GET leaderboard comparison
exports.getLeaderboard = async (req, res) => {
  try {
    const { scope = "global" } = req.query; // 'global' | 'country' | 'college' | 'company' | 'friends'
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let filter = {
      "competitiveProgramming.unifiedStats": { $ne: null }
    };

    if (scope === "country" && currentUser.location) {
      filter["location"] = currentUser.location;
    } else if (scope === "college" && currentUser.college) {
      filter["college"] = currentUser.college;
    } else if (scope === "company" && currentUser.company) {
      filter["company"] = currentUser.company;
    } else if (scope === "friends") {
      const friendsList = currentUser.following || [];
      // Include both self and friends in the leaderboard
      filter["_id"] = { $in: [...friendsList, currentUser._id] };
    }

    const users = await User.find(filter)
      .select("username avatar title location college company competitiveProgramming.unifiedStats")
      .lean();

    // Map and sort users by CodeExpo Coding Score
    const rankings = users
      .map(u => {
        const stats = u.competitiveProgramming.unifiedStats || {};
        return {
          id: u._id,
          username: u.username,
          avatar: u.avatar,
          title: u.title || "Developer",
          location: u.location || "Global",
          college: u.college || "N/A",
          company: u.company || "N/A",
          score: stats.score || 0,
          level: stats.level || "Bronze",
          solved: stats.overallSolved || 0,
          maxRating: stats.highestRating || 0,
          platformsCount: stats.connectedPlatforms?.length || 0
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1
      }));

    res.status(200).json({
      success: true,
      scope,
      rankings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch relative leaderboard"
    });
  }
};

// POST generate share / portfolio card details
exports.shareProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const unified = user.competitiveProgramming.unifiedStats;
    if (!unified) {
      return res.status(400).json({ success: false, message: "Connect a platform before generating share profiles." });
    }

    const shareUrl = `${req.protocol}://${req.get("host")}/user/${user._id}?tab=cp`;
    
    res.status(200).json({
      success: true,
      shareUrl,
      portfolioCard: {
        username: user.username,
        score: unified.score,
        level: unified.level,
        solved: unified.overallSolved,
        maxRating: unified.highestRating,
        streak: unified.codingStreak,
        platforms: unified.connectedPlatforms
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to generate share profile metadata"
    });
  }
};
