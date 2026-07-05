require('dotenv').config();
const mongoose = require('mongoose');
const Room = require('./models/Room');
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const rooms = await Room.find({});
  console.log('Total rooms in DB:', rooms.length);
  
  let nullCreatedByCount = 0;
  let missingUserCount = 0;
  
  for (const room of rooms) {
    if (!room.createdBy) {
      nullCreatedByCount++;
      continue;
    }
    const user = await User.findById(room.createdBy);
    if (!user) {
      missingUserCount++;
    }
  }
  
  console.log('Rooms with null createdBy:', nullCreatedByCount);
  console.log('Rooms with missing/deleted createdBy user in DB:', missingUserCount);
  
  mongoose.disconnect();
}

test();
