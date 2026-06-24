const Story = require("../models/Story");
const Follow = require("../models/Follow");

// Create story
const createStory = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: "Story content is required" });
    }

    const story = await Story.create({
      user: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar || "",
      text
    });

    res.status(201).json({ success: true, story });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active stories (followed users + own)
const getStories = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get followed IDs
    const followedRelations = await Follow.find({ follower: userId }).lean();
    const followedIds = followedRelations.map(f => f.following);

    // Fetch active stories (including our own)
    const stories = await Story.find({
      user: { $in: [...followedIds, userId] }
    })
    .sort({ createdAt: -1 })
    .lean();

    res.status(200).json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete story
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    // Check if story belongs to the user
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this story" });
    }

    await Story.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Story deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createStory,
  getStories,
  deleteStory
};
