require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const email = process.argv[2] || "adminsachin@gmail.com";
const newPassword = process.argv[3] || "Admin@12345";

async function resetPassword() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in .env file.");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to Database successfully.");

    const targetEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: targetEmail });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (!user) {
      console.log(`User ${targetEmail} not found in database. Creating account...`);
      user = await User.create({
        email: targetEmail,
        username: "adminsachin",
        displayName: "Admin Sachin",
        password: hashedPassword,
        role: "admin"
      });
      console.log(`Account created successfully! Email: ${user.email}, Role: ${user.role}`);
    } else {
      user.password = hashedPassword;
      user.role = "admin";
      await user.save();
      console.log(`Password reset successfully for ${user.email}! (Role: ${user.role})`);
    }

    console.log(`NEW_PASSWORD:${newPassword}`);
    process.exit(0);
  } catch (error) {
    console.error("Error running reset script:", error);
    process.exit(1);
  }
}

resetPassword();
