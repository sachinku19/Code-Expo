const admin_protect = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied: Administrative privileges required."
    });
  }
};

module.exports = admin_protect;
