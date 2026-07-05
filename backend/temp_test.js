require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  // Find all rooms in DB to check
  const allRooms = await Room.find({}).limit(5);
  console.log('Sample rooms in DB:', allRooms.map(r => ({ roomId: r.roomId, createdBy: r.createdBy })));
  
  if (allRooms.length > 0) {
    const roomUsers = {};
    // Put the first room in the active room list
    roomUsers[allRooms[0].roomId] = [{ username: "test", userId: "some_user", isOwner: true }];
    const liveRoomIds = Object.keys(roomUsers);
    
    try {
      const rooms = await Room.find({
        roomId: { $in: liveRoomIds }
      })
      .populate("createdBy", "username email avatar")
      .populate("participants.user", "username email avatar")
      .populate("likes", "username email avatar");
      
      console.log('Found live rooms count:', rooms.length);
      
      const filteredRooms = rooms.filter(room => {
        // Simulate a dummy user id
        const reqUserId = "60c72b2f9b1d8b2a3c8e4d5e";
        if (!room.isPrivate) return true;
        
        console.log('Checking createdBy:', room.createdBy);
        const isOwner = room.createdBy?._id.toString() === reqUserId;
        const isParticipant = room.participants?.some(p => p.user && p.user._id.toString() === reqUserId);
        return isOwner || isParticipant;
      });
      console.log('Filtered rooms count:', filteredRooms.length);
    } catch (err) {
      console.error('ERROR OCCURRED in getLiveRooms filter logic:', err);
    }
  }
  
  mongoose.disconnect();
}

test();
