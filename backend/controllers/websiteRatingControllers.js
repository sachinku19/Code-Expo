const WebsiteRating = require("../models/WebsiteRating");
const { logActivity } = require("./activityControllers");

// Submit or update a website rating (1-5 stars)
const submitWebsiteRating = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5."
      });
    }

    // Upsert the rating
    await WebsiteRating.findOneAndUpdate(
      { user: userId },
      { rating, comment: comment || "", timestamp: new Date() },
      { new: true, upsert: true }
    );

    // Log the action
    await logActivity(userId, req.user.username, null, null, `rated the platform (${rating} stars)`);

    // Get new aggregated statistics
    const stats = await WebsiteRating.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]);

    const averageRating = stats.length > 0 ? Math.round(stats[0].average * 10) / 10 : 0;
    const ratingsCount = stats.length > 0 ? stats[0].count : 0;

    return res.status(200).json({
      success: true,
      message: "Thank you for your feedback!",
      averageRating,
      ratingsCount,
      userRating: rating
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get website rating metrics and review timeline
const getWebsiteRatingInfo = async (req, res) => {
  try {
    let userId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        if (token && token !== "null" && token !== "undefined") {
          const jwt = require("jsonwebtoken");
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.id;
        }
      } catch (err) {
        // Safe check failed, ignore token for public views
      }
    }

    // Get aggregated statistics
    const stats = await WebsiteRating.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: "$rating" },
          count: { $sum: 1 }
        }
      }
    ]);

    const averageRating = stats.length > 0 ? Math.round(stats[0].average * 10) / 10 : 0;
    const ratingsCount = stats.length > 0 ? stats[0].count : 0;

    // Fetch all reviews sorted by recent updates (populating username, avatar, email, and languages)
    const reviews = await WebsiteRating.find()
      .populate("user", "username avatar email programmingLanguages")
      .sort({ updatedAt: -1 });

    // Fetch user rating if logged in
    let userRating = null;
    let userComment = "";
    if (userId) {
      const userRatingRecord = await WebsiteRating.findOne({ user: userId });
      if (userRatingRecord) {
        userRating = userRatingRecord.rating;
        userComment = userRatingRecord.comment;
      }
    }

    return res.status(200).json({
      success: true,
      averageRating,
      ratingsCount,
      userRating,
      userComment,
      reviews
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  submitWebsiteRating,
  getWebsiteRatingInfo
};
