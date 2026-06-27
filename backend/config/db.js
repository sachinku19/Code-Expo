const mongoose = require("mongoose");
const { runStartupMigrations } = require("../utils/migration");

const connectDB = async () => {
  try {

    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected : ${conn.connection.host}`)
    
    // Run startup migrations
    await runStartupMigrations();

  } catch (error) {
    console.log(`MongoDB connection Failed:${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;