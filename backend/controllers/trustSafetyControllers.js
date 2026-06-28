const User = require("../models/User");
const ModerationAction = require("../models/ModerationAction");
const Appeal = require("../models/Appeal");
const Ticket = require("../models/Ticket");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

// Emit helper
const emitSocketEvent = (event, data) => {
  try {
    const socketHandler = require("../sockets/socketHandler");
    if (socketHandler.io) {
      socketHandler.io.emit(event, data);
    }
  } catch (e) {
    console.error(`Failed to emit socket event ${event}:`, e.message);
  }
};

// 1. Get Trust & Safety Status and Counters
const getTrustSafetyStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Calculate counters dynamically
    const openAppealsCount = await Appeal.countDocuments({ user: userId, status: "Pending" });
    const openSupportTicketsCount = await Ticket.countDocuments({
      user: userId,
      status: { $in: ["open", "under-review", "waiting-for-user"] }
    });
    const removedPostsCount = await Post.countDocuments({ author: userId, status: "deleted" });
    const hiddenPostsCount = await Post.countDocuments({ author: userId, status: "hidden" });
    const activeRestrictionsCount = user.accountStatus !== "Active" ? 1 : 0;

    res.status(200).json({
      success: true,
      status: {
        accountStatus: user.accountStatus,
        accountHealth: user.accountHealth,
        guidelineStatus: user.guidelineStatus,
        totalWarnings: user.totalWarnings,
        totalViolations: user.totalViolations,
        appealStatus: user.appealStatus,
        lastReviewedDate: user.lastReviewedDate,
        counters: {
          openAppealsCount,
          openSupportTicketsCount,
          removedPostsCount,
          hiddenPostsCount,
          activeRestrictionsCount
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Get Moderation History Timeline
const getModerationHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("🔍 [getModerationHistory] Request by User:", req.user.username, "| ID:", userId);
    const history = await ModerationAction.find({ user: userId })
      .populate("postId", "title text image images video textFormat")
      .sort({ createdAt: -1 });
    console.log("🔍 [getModerationHistory] Found history items:", history.length);

    res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 3. File Appeal for Moderation Action
const createAppeal = async (req, res) => {
  try {
    const { moderationActionId, reason, notes, attachment } = req.body;
    const userId = req.user._id;

    if (!moderationActionId || !reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: "Moderation Action and Reason are required." });
    }

    const action = await ModerationAction.findById(moderationActionId);
    if (!action) {
      return res.status(404).json({ success: false, message: "Moderation action not found." });
    }

    if (String(action.user) !== String(userId)) {
      return res.status(403).json({ success: false, message: "You can only appeal your own moderation actions." });
    }

    // Check if appeal already exists
    const existingAppeal = await Appeal.findOne({ moderationAction: moderationActionId, status: "Pending" });
    if (existingAppeal) {
      return res.status(400).json({ success: false, message: "An appeal is already pending for this action." });
    }

    const appeal = new Appeal({
      user: userId,
      moderationAction: moderationActionId,
      reason: reason.trim(),
      notes: (notes || "").trim(),
      attachment: attachment || ""
    });

    await appeal.save();

    // Update action resolution state
    action.resolutionStatus = "Pending Appeal";
    action.currentStatus = "Appealed";
    await action.save();

    // Update user appeal state
    await User.findByIdAndUpdate(userId, { appealStatus: "Pending" });

    // Notify admins via Socket.IO
    emitSocketEvent("admin-appeal-action", {
      type: "appeal-submitted",
      userId,
      appealId: appeal._id
    });

    res.status(201).json({
      success: true,
      message: "Appeal submitted successfully.",
      appeal
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 4. Admin: Get All Appeals
const adminGetAppeals = async (req, res) => {
  try {
    const appeals = await Appeal.find()
      .populate("user", "username email avatar status role")
      .populate({
        path: "moderationAction",
        populate: { path: "postId", select: "title text image images video textFormat" }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      appeals
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 5. Admin: Resolve Appeal
const adminResolveAppeal = async (req, res) => {
  try {
    const appealId = req.params.id;
    const { status, adminResponse } = req.body; // status: "Approved" or "Rejected"

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'Approved' or 'Rejected'." });
    }

    const appeal = await Appeal.findById(appealId).populate("moderationAction");
    if (!appeal) {
      return res.status(404).json({ success: false, message: "Appeal not found." });
    }

    appeal.status = status;
    appeal.adminResponse = (adminResponse || "").trim();
    appeal.resolutionDate = new Date();
    await appeal.save();

    const action = appeal.moderationAction;
    const user = await User.findById(appeal.user);

    if (status === "Approved") {
      action.currentStatus = "Reversed";
      action.resolutionStatus = "Resolved";
      await action.save();

      // Restore health points and update standing
      if (user) {
        user.accountHealth = Math.min(100, user.accountHealth + 20);
        if (action.actionType === "Warning Issued") {
          user.totalWarnings = Math.max(0, user.totalWarnings - 1);
        } else {
          user.totalViolations = Math.max(0, user.totalViolations - 1);
        }

        // Restore normal status if user was restricted
        if (user.accountStatus === "Restricted" && user.accountHealth >= 50) {
          user.accountStatus = "Active";
          user.guidelineStatus = "Good Standing";
        }
        user.appealStatus = "Resolved";
        user.lastReviewedDate = new Date();
        await user.save();
      }

      // Reverse action in database based on type
      if (action.postId) {
        const post = await Post.findById(action.postId);
        if (post) {
          if (action.actionType === "Post Hidden") {
            post.status = "active";
          } else if (action.actionType === "Post Deleted") {
            post.status = "active"; // Restore soft delete
          } else if (action.actionType === "Likes Disabled") {
            post.likesDisabled = false;
          } else if (action.actionType === "Comment Disabled") {
            post.commentsLocked = false;
          } else if (action.actionType === "Sensitive Content") {
            post.isSensitive = false;
          }
          await post.save();

          // Broadcast post update
          emitSocketEvent("admin-post-action", {
            postId: post._id,
            post
          });
        }
      } else {
        // Account reactivation
        if (action.actionType === "Suspension" || action.actionType === "Ban") {
          if (user) {
            user.isSuspended = false;
            user.accountStatus = "Active";
            await user.save();
          }
        }
      }
    } else {
      // Appeal Rejected
      action.resolutionStatus = "Resolved";
      await action.save();

      if (user) {
        user.appealStatus = "Resolved";
        user.lastReviewedDate = new Date();
        await user.save();
      }
    }

    // Create Notification for the user
    const notification = new Notification({
      recipient: appeal.user,
      sender: req.user._id,
      type: "APPEAL_STATUS",
      category: "MODERATION",
      appeal: appeal._id,
      message: `Your appeal for "${action.actionType}" has been ${status.toLowerCase()}.`
    });
    await notification.save();

    // Emit live events to user
    emitSocketEvent("notification-received", notification);
    emitSocketEvent("admin-user-action", {
      userId: appeal.user,
      isSuspended: user?.isSuspended || false,
      user
    });

    res.status(200).json({
      success: true,
      message: `Appeal has been ${status.toLowerCase()}.`,
      appeal
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getTrustSafetyStatus,
  getModerationHistory,
  createAppeal,
  adminGetAppeals,
  adminResolveAppeal
};
