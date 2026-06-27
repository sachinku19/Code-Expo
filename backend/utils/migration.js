const mongoose = require("mongoose");
const Room = require("../models/Room");
const User = require("../models/User");

const runStartupMigrations = async () => {
  try {
    console.log("🔄 Running database startup migrations...");

    // 1. Room Likes Migration
    let RoomLike;
    try {
      RoomLike = mongoose.model("RoomLike");
    } catch (e) {
      const roomLikeSchema = new mongoose.Schema({
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true }
      });
      RoomLike = mongoose.model("RoomLike", roomLikeSchema);
    }

    const roomLikesCount = await RoomLike.countDocuments();
    if (roomLikesCount > 0) {
      console.log(`📌 Found ${roomLikesCount} RoomLike records. Checking for migration...`);
      const allLikes = await RoomLike.find().lean();
      
      const roomLikesMap = {};
      allLikes.forEach(like => {
        if (like.room && like.user) {
          const rId = String(like.room);
          if (!roomLikesMap[rId]) roomLikesMap[rId] = [];
          roomLikesMap[rId].push(like.user);
        }
      });

      let migratedRoomsCount = 0;
      for (const [roomId, userIds] of Object.entries(roomLikesMap)) {
        const result = await Room.updateOne(
          { _id: roomId },
          { $addToSet: { likes: { $each: userIds } } }
        );
        if (result.modifiedCount > 0) {
          migratedRoomsCount++;
        }
      }
      console.log(`✅ Room likes migration sync done. Updated ${migratedRoomsCount} rooms.`);
    } else {
      console.log("ℹ️ No legacy RoomLike records found.");
    }

    // 2. Follow System Migration
    let Follow;
    try {
      Follow = mongoose.model("Follow");
    } catch (e) {
      const followSchema = new mongoose.Schema({
        follower: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        following: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
      });
      Follow = mongoose.model("Follow", followSchema);
    }

    const followsCount = await Follow.countDocuments();
    if (followsCount > 0) {
      console.log(`📌 Found ${followsCount} Follow records. Checking for migration...`);
      const allFollows = await Follow.find().lean();

      let migratedFollowersCount = 0;
      let migratedFollowingCount = 0;

      for (const f of allFollows) {
        if (f.follower && f.following) {
          const res1 = await User.updateOne(
            { _id: f.follower },
            { $addToSet: { following: f.following } }
          );
          const res2 = await User.updateOne(
            { _id: f.following },
            { $addToSet: { followers: f.follower } }
          );

          if (res1.modifiedCount > 0) migratedFollowingCount++;
          if (res2.modifiedCount > 0) migratedFollowersCount++;
        }
      }
      console.log(`✅ Follow migration sync done. Updated ${migratedFollowingCount} following arrays and ${migratedFollowersCount} followers arrays.`);
    } else {
      console.log("ℹ️ No legacy Follow records found.");
    }

    // Sync counts
    console.log("🔄 Syncing user followers/following count badges...");
    const users = await User.find().select("_id followers following followersCount followingCount").lean();
    for (const u of users) {
      const actualFollowersCount = u.followers ? u.followers.length : 0;
      const actualFollowingCount = u.following ? u.following.length : 0;
      if (u.followersCount !== actualFollowersCount || u.followingCount !== actualFollowingCount) {
        await User.updateOne(
          { _id: u._id },
          { followersCount: actualFollowersCount, followingCount: actualFollowingCount }
        );
      }
    }
    console.log("✅ User followers/following counts synced!");
    console.log("🏁 Database startup migrations complete!");

  } catch (error) {
    console.error("❌ Error during database startup migrations:", error.message);
  }
};

module.exports = { runStartupMigrations };
