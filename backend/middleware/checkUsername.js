/**
 * Middleware to ensure the authenticated user has set up a username.
 * If user.username is missing or null, blocks request with 403 status code and requireUsernameSetup flag.
 */
const checkUsername = (req, res, next) => {
  if (req.user && !req.user.username) {
    return res.status(403).json({
      success: false,
      requireUsernameSetup: true,
      message: "You must choose a unique username before proceeding."
    });
  }
  next();
};

module.exports = checkUsername;
