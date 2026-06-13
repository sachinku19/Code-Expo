const jwt = require("jsonwebtoken");
const User = require("../models/User");

const maintenanceMiddleware = async (req, res, next) => {
  // If maintenance mode is disabled, proceed normally
  if (!global.maintenanceMode) {
    return next();
  }

  // Bypass list for login and administrative control routes
  const bypassPaths = [
    "/api/auth/login",
    "/api/admin/promote-self",
    "/api/admin/stats",
    "/api/admin/users",
    "/api/admin/rooms",
    "/api/admin/ratings"
  ];

  const requestUrl = req.originalUrl || "";
  const isBypass = bypassPaths.some(path => requestUrl.startsWith(path));
  
  if (isBypass) {
    return next();
  }

  // Verify if the incoming request is authenticated as an Admin
  let isAdmin = false;
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      const token = req.headers.authorization.split(" ")[1];
      if (token && token !== "null" && token !== "undefined") {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.role === "admin") {
          isAdmin = true;
        }
      }
    }
  } catch (err) {
    // Fail silently, treating user as a standard visitor
  }

  if (isAdmin) {
    return next();
  }

  // Block the request with a 503 Maintenance Status
  return res.status(503).json({
    success: false,
    isMaintenance: true,
    message: "CodeExpo is currently undergoing scheduled maintenance. Please check back later."
  });
};

module.exports = maintenanceMiddleware;
