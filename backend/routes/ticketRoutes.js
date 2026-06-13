const express = require("express");
const auth_protect = require("../middleware/authMiddleware");
const admin_protect = require("../middleware/adminMiddleware");
const {
  createTicket,
  getUserTickets,
  getTicketDetails,
  addTicketMessage,
  adminGetAllTickets,
  adminUpdateTicketStatus
} = require("../controllers/ticketControllers");

const router = express.Router();

// User routes (auth required)
router.post("/", auth_protect, createTicket);
router.get("/", auth_protect, getUserTickets);
router.get("/:id", auth_protect, getTicketDetails);
router.post("/:id/messages", auth_protect, addTicketMessage);

// Admin-only routes (auth & admin required)
router.get("/admin/all", auth_protect, admin_protect, adminGetAllTickets);
router.put("/admin/:id/status", auth_protect, admin_protect, adminUpdateTicketStatus);

module.exports = router;
