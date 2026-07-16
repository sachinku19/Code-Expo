const express = require("express");
const cors = require("cors");
const path = require("path");
const maintenanceMiddleware = require("./middleware/maintenanceMiddleware");


//import routes
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const compilerRoutes = require("./routes/compilerRoutes");
const messageRouter = require("./routes/messageRoutes");
const activityRoutes = require("./routes/activityRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const userRoutes = require("./routes/userRoutes");
const socialRoutes = require("./routes/socialRoutes");
const collaborationRoutes = require("./routes/collaborationRoutes");
const directMessageRoutes = require("./routes/directMessageRoutes");
const websiteRatingRoutes = require("./routes/websiteRatingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const aiRoutes = require("./routes/aiRoutes");
const trustSafetyRoutes = require("./routes/trustSafetyRoutes");

// make app
const app = express();

//middleware
app.use(express.json());
app.use(cors());
app.use(maintenanceMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Health Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CodeExpo Backend is Running"
  });
});

//user route
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

//room route
app.use("/api/rooms", roomRoutes);

//workspace route
app.use("/api/workspace", workspaceRoutes);

//run code route
app.use("/api/compiler", compilerRoutes);

//message
app.use("/api/message", messageRouter);

//activity
app.use("/api/activity", activityRoutes);

//social
app.use("/api/social", socialRoutes);

//collaboration
app.use("/api/collaboration", collaborationRoutes);

//direct messages
app.use("/api/direct-messages", directMessageRoutes);

//website rating
app.use("/api/website-rating", websiteRatingRoutes);

//admin route
app.use("/api/admin", adminRoutes);

//announcements route
app.use("/api/announcements", announcementRoutes);

//ticket route
app.use("/api/tickets", ticketRoutes);

// ai route
app.use("/api/ai", aiRoutes);

// trust-safety route
app.use("/api/trust-safety", trustSafetyRoutes);

// ads route
const adRoutes = require("./routes/adRoutes");
app.use("/api/ads", adRoutes);

// subscription routes
const subscriptionRoutes = require("./routes/subscriptionRoutes");
app.use("/api/subscription", subscriptionRoutes);

// planner routes
const plannerRoutes = require("./routes/plannerRoutes");
app.use("/api/planner", plannerRoutes);

// Serve static assets from frontend build in production
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// Wildcard middleware to redirect all frontend reloads/refresh to index.html
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
    return res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) {
        // If frontend dist is not built yet (development mode), skip fallback
        next();
      }
    });
  }
  next();
});

module.exports = app;
