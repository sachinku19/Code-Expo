const Announcement = require("../models/Announcement");

// 1. Create system announcement (Admin only)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, severity } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: "Title and content are required." });
    }

    const announcement = new Announcement({
      title,
      content,
      type: type || "ANNOUNCEMENT",
      severity: severity || "INFO",
      createdBy: req.user._id
    });

    await announcement.save();

    // Broadcast Socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("announcement:broadcast", announcement);
    }

    res.status(201).json({
      success: true,
      message: "System announcement broadcasted successfully.",
      announcement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to create announcement." });
  }
};

// 2. Get all announcements for admin panel (Admin only)
const getAnnouncementsAdmin = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      announcements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch announcements." });
  }
};

// 3. Delete system announcement (Admin only)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcementId = req.params.id;
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }

    await Announcement.findByIdAndDelete(announcementId);

    // Broadcast Socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("announcement:delete", announcementId);
    }

    res.status(200).json({
      success: true,
      message: "System announcement deleted and unbroadcasted."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to delete announcement." });
  }
};

// 4. Get all active announcements (User accessible)
const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      announcements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Failed to fetch active announcements." });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncementsAdmin,
  deleteAnnouncement,
  getActiveAnnouncements
};
