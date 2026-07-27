const User = require("../models/User");
const { validateUsername, generateSuggestions } = require("../validators/usernameValidator");

/**
 * Check if a username is taken in the database.
 * @param {string} username 
 * @param {string} [excludeUserId] 
 * @returns {Promise<boolean>}
 */
const isUsernameTakenInDB = async (username, excludeUserId = null) => {
  const query = { username: username.toLowerCase().trim() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  const existing = await User.findOne(query).select("_id").lean();
  return Boolean(existing);
};

/**
 * Check username availability, returns status, validity, message, and smart suggestions.
 * @param {string} username 
 * @param {string} [currentUserId] 
 * @returns {Promise<{ available: boolean, status: string, message: string, suggestions: string[] }>}
 */
const checkUsernameAvailability = async (username, currentUserId = null) => {
  if (!username) {
    return {
      available: false,
      status: "Invalid",
      message: "Please enter a username",
      suggestions: []
    };
  }

  const cleanUsername = username.toLowerCase().trim();
  const valResult = validateUsername(cleanUsername);

  if (!valResult.isValid) {
    let suggestions = [];
    try {
      suggestions = await generateSuggestions(cleanUsername, isUsernameTakenInDB, currentUserId);
    } catch (err) {
      console.error("Error generating suggestions:", err);
    }
    return {
      available: false,
      status: "Invalid",
      message: valResult.message,
      suggestions
    };
  }

  const taken = await isUsernameTakenInDB(cleanUsername, currentUserId);

  if (taken) {
    let suggestions = [];
    try {
      suggestions = await generateSuggestions(cleanUsername, isUsernameTakenInDB, currentUserId);
    } catch (err) {
      console.error("Error generating suggestions for taken username:", err);
    }
    return {
      available: false,
      status: "Taken",
      message: "Username already taken",
      suggestions
    };
  }

  return {
    available: true,
    status: "Available",
    message: "Username is available!",
    suggestions: []
  };
};

/**
 * Set up initial username during user onboarding.
 * @param {string} userId 
 * @param {string} username 
 */
const setupUsername = async (userId, username) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.username) {
    // If username is already set, don't allow setup route again
    return {
      alreadySet: true,
      user
    };
  }

  const cleanUsername = (username || "").toLowerCase().trim();
  const valResult = validateUsername(cleanUsername);

  if (!valResult.isValid) {
    throw new Error(valResult.message);
  }

  const taken = await isUsernameTakenInDB(cleanUsername, userId);
  if (taken) {
    throw new Error("Username already taken. Please choose another username.");
  }

  user.username = cleanUsername;
  user.lastUsernameChange = new Date();

  // If user doesn't have a displayName set, copy their old name or username
  if (!user.displayName) {
    user.displayName = user.username || "Developer";
  }

  await user.save();

  return {
    alreadySet: false,
    user
  };
};

/**
 * Change existing username (enforces 30-day rule).
 * @param {string} userId 
 * @param {string} newUsername 
 */
const changeUsername = async (userId, newUsername) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const cleanNewUsername = (newUsername || "").toLowerCase().trim();

  if (user.username === cleanNewUsername) {
    return { user, message: "Username unchanged" };
  }

  // Enforce 30-day wait rule
  if (user.lastUsernameChange) {
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceLastChange = Date.now() - new Date(user.lastUsernameChange).getTime();
    if (timeSinceLastChange < thirtyDaysInMs) {
      const daysRemaining = Math.ceil((thirtyDaysInMs - timeSinceLastChange) / (1000 * 60 * 60 * 24));
      throw new Error(`Username can only be changed once every 30 days. Please wait ${daysRemaining} more day(s).`);
    }
  }

  const valResult = validateUsername(cleanNewUsername);
  if (!valResult.isValid) {
    throw new Error(valResult.message);
  }

  const taken = await isUsernameTakenInDB(cleanNewUsername, userId);
  if (taken) {
    throw new Error("Username already taken. Please choose another username.");
  }

  user.username = cleanNewUsername;
  user.lastUsernameChange = new Date();

  await user.save();

  return {
    user,
    message: "Username updated successfully"
  };
};

module.exports = {
  checkUsernameAvailability,
  setupUsername,
  changeUsername,
  isUsernameTakenInDB
};
