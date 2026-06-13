const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "username avatar")
      .populate("targetRoom", "title roomId")
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notificationId } = req.body;

    if (notificationId) {
      await Notification.updateOne({ _id: notificationId, recipient: userId }, { isRead: true });
    } else {
      await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    }

    res.status(200).json({
      success: true,
      message: "Notifications marked as read"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createAndSendNotification = async (recipient, sender, type, category, targetRoom, io) => {
  try {
    const newNotification = await Notification.create({
      recipient,
      sender,
      type,
      category,
      targetRoom
    });

    if (io) {
      const populatedNotification = await Notification.findById(newNotification._id)
        .populate("sender", "username avatar")
        .populate("targetRoom", "title roomId");

      io.to(String(recipient)).emit("notification-received", populatedNotification);
    }
    return newNotification;
  } catch (error) {
    console.error("Error creating/dispatching notification:", error.message);
  }
};

module.exports = {
  getNotifications,
  markNotificationsRead,
  createAndSendNotification
};
