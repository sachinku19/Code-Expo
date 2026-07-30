require("dotenv").config();
const mongoose = require("mongoose");

async function cleanDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is missing in .env file.");
      process.exit(1);
    }

    console.log(`Connecting to database: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    const dbName = mongoose.connection.db.databaseName;
    console.log(`Dropping database '${dbName}'...`);
    
    await mongoose.connection.db.dropDatabase();
    console.log(`✅ Database '${dbName}' has been completely cleaned & wiped!`);

    process.exit(0);
  } catch (error) {
    console.error("Error wiping database:", error);
    process.exit(1);
  }
}

cleanDatabase();
