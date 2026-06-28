const Ticket = require("../models/Ticket");
const { logActivity } = require("./activityControllers");

// 1. User: Create a Support Ticket
const createTicket = async (req, res) => {
  try {
    const { subject, description, category, attachments } = req.body;
    const userId = req.user._id;

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required."
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required."
      });
    }

    const ticket = new Ticket({
      user: userId,
      subject: subject.trim(),
      description: description.trim(),
      category: category || "General",
      attachments: attachments || [],
      messages: []
    });

    await ticket.save();

    // Log the user activity
    logActivity(userId, req.user.username, null, null, `created a support ticket: "${subject.trim()}"`);

    res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create ticket."
    });
  }
};

// 2. User: Get Own Tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    const tickets = await Ticket.find({ user: userId })
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch tickets."
    });
  }
};

// 3. User & Admin: Get Specific Ticket Details
const getTicketDetails = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const userId = req.user._id;
    const userRole = req.user.role;

    const ticket = await Ticket.findById(ticketId)
      .populate("user", "username email avatar role")
      .populate("assignedTo", "username email avatar role")
      .populate("messages.sender", "username email avatar role");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found."
      });
    }

    // Access control: only owner or admins
    if (userRole !== "admin" && String(ticket.user._id || ticket.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own tickets."
      });
    }

    res.status(200).json({
      success: true,
      ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch ticket details."
    });
  }
};

// 4. User & Admin: Add a Message to Ticket Conversation
const addTicketMessage = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { message } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty."
      });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found."
      });
    }

    // Access control
    if (userRole !== "admin" && String(ticket.user) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only reply to your own tickets."
      });
    }

    // Append message
    ticket.messages.push({
      sender: userId,
      message: message.trim()
    });

    // Auto-update ticket status based on sender
    if (userRole === "admin") {
      ticket.status = "under-review"; // Set status to under-review when admin replies
    } else {
      ticket.status = "open"; // Re-open ticket when user posts a reply
    }

    await ticket.save();

    // Populate ticket messages details to send back
    const updatedTicket = await Ticket.findById(ticketId)
      .populate("messages.sender", "username email avatar role");

    // Notify user if admin replies
    if (userRole === "admin") {
      try {
        const Notification = require("../models/Notification");
        const notification = new Notification({
          recipient: ticket.user,
          sender: userId,
          type: "TICKET_UPDATE",
          category: "SYSTEM",
          ticket: ticket._id,
          message: `New support representative reply on ticket: "${ticket.subject}"`
        });
        await notification.save();

        const socketHandler = require("../sockets/socketHandler");
        if (socketHandler.io) {
          socketHandler.io.emit("notification-received", notification);
        }
      } catch (e) {
        console.error("Failed to notify user about ticket reply:", e.message);
      }
    }

    // Broadcast ticket-update via socket
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("ticket-update", {
          ticketId: ticket._id,
          ticket: updatedTicket
        });
      }
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: "Message added successfully.",
      messages: updatedTicket.messages,
      status: ticket.status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to post message reply."
    });
  }
};

// 5. Admin: Get All Tickets
const adminGetAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("user", "username email avatar role")
      .populate("assignedTo", "username email avatar role")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch all tickets."
    });
  }
};

// 6. Admin: Update Ticket Status
const adminUpdateTicketStatus = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status, assignedTo } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found."
      });
    }

    if (status) {
      if (!["open", "under-review", "waiting-for-user", "resolved", "closed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be 'open', 'under-review', 'waiting-for-user', 'resolved', or 'closed'."
        });
      }
      ticket.status = status;
    }

    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo || null;
    }

    await ticket.save();

    // Populate user and assignee details
    const updatedTicket = await Ticket.findById(ticketId)
      .populate("user", "username email avatar role")
      .populate("assignedTo", "username email avatar role")
      .populate("messages.sender", "username email avatar role");

    // Create system notification for user
    try {
      const Notification = require("../models/Notification");
      const notification = new Notification({
        recipient: ticket.user,
        sender: req.user._id,
        type: "TICKET_UPDATE",
        category: "SYSTEM",
        ticket: ticket._id,
        message: `Your ticket "${ticket.subject}" status is now "${ticket.status.toUpperCase()}"`
      });
      await notification.save();

      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("notification-received", notification);
      }
    } catch (e) {
      console.error("Failed to notify user on ticket update:", e.message);
    }

    // Emit live event
    try {
      const socketHandler = require("../sockets/socketHandler");
      if (socketHandler.io) {
        socketHandler.io.emit("ticket-update", {
          ticketId: ticket._id,
          ticket: updatedTicket
        });
      }
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Ticket updated successfully.`,
      ticket: updatedTicket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update ticket status."
    });
  }
};

module.exports = {
  createTicket,
  getUserTickets,
  getTicketDetails,
  addTicketMessage,
  adminGetAllTickets,
  adminUpdateTicketStatus
};
