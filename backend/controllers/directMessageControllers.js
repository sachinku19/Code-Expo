const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

// 1. Get list of active conversations
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user._id;
    const io = req.app.get("io");

    const messages = await DirectMessage.find({
      $or: [
        { sender: myId },
        { recipient: myId }
      ]
    })
    .sort({ createdAt: -1 })
    .populate("sender", "username avatar bio")
    .populate("recipient", "username avatar bio");

    const conversationsMap = {};
    messages.forEach(msg => {
      if (!msg.sender || !msg.recipient) return;
      const otherUser = String(msg.sender._id) === String(myId) ? msg.recipient : msg.sender;
      const otherUserId = String(otherUser._id);
      if (!conversationsMap[otherUserId]) {
        const userRoom = io?.sockets?.adapter?.rooms?.get(otherUserId);
        conversationsMap[otherUserId] = {
          user: {
            _id: otherUser._id,
            username: otherUser.username,
            avatar: otherUser.avatar,
            bio: otherUser.bio,
            isOnline: !!(userRoom && userRoom.size > 0)
          },
          lastMessage: {
            text: msg.message,
            fileUrl: msg.fileUrl,
            fileType: msg.fileType,
            senderId: msg.sender._id,
            createdAt: msg.createdAt,
            isRead: msg.isRead
          },
          unreadCount: 0
        };
      }
      if (String(msg.sender._id) === otherUserId && !msg.isRead) {
        conversationsMap[otherUserId].unreadCount += 1;
      }
    });

    const conversations = Object.values(conversationsMap);
    res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Get chat history between current user and a target user
exports.getChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    // Mark messages sent by target user to me as read
    const updated = await DirectMessage.updateMany(
      { sender: userId, recipient: myId, isRead: false },
      { isRead: true }
    );

    if (updated.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(String(userId)).emit("dm:read", {
          readerId: String(myId),
          senderId: String(userId)
        });
      }
    }

    const messages = await DirectMessage.find({
      $or: [
        { sender: myId, recipient: userId },
        { sender: userId, recipient: myId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate("sender", "username avatar")
    .populate("recipient", "username avatar");

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. Send direct message
exports.sendDirectMessage = async (req, res) => {
  try {
    const myId = req.user._id;
    const { recipientId, message } = req.body;

    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID and message text are required"
      });
    }

    const newMessage = await DirectMessage.create({
      sender: myId,
      recipient: recipientId,
      message
    });

    const populated = await DirectMessage.findById(newMessage._id)
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Emit to recipient's socket room
      io.to(String(recipientId)).emit("dm:receive", populated);
      // Emit to sender's socket room (useful if connected in multiple tabs)
      io.to(String(myId)).emit("dm:receive", populated);
    }

    res.status(200).json({
      success: true,
      message: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 4. Send direct message attachment
exports.sendDirectMessageAttachment = async (req, res) => {
  try {
    const myId = req.user._id;
    const { recipientId, message } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID is required"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No attachment file provided"
      });
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const fileType = (ext === ".pdf" || req.file.mimetype === "application/pdf") ? "pdf" : "image";

    let fileUrl = "";
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                   process.env.CLOUDINARY_API_KEY &&
                                   process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      // Local fallback
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `dm-${Date.now()}-${sanitizedName}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `${req.protocol}://${req.get("host")}/uploads/${filename}`;
    } else {
      // Upload directly to Cloudinary
      const uploadToCloudinary = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "codeexpo_attachments",
              resource_type: "auto"
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        });
      };
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      fileUrl = uploadResult.secure_url;
    }

    const newMessage = await DirectMessage.create({
      sender: myId,
      recipient: recipientId,
      message: message || "",
      fileUrl,
      fileType,
      fileName: originalName
    });

    const populated = await DirectMessage.findById(newMessage._id)
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Emit to recipient's socket room
      io.to(String(recipientId)).emit("dm:receive", populated);
      // Emit to sender's socket room
      io.to(String(myId)).emit("dm:receive", populated);
    }

    res.status(200).json({
      success: true,
      message: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 5. Delete direct message
exports.deleteDirectMessage = async (req, res) => {
  try {
    const myId = req.user._id;
    const { messageId } = req.params;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    if (String(message.sender) !== String(myId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this message"
      });
    }

    await DirectMessage.findByIdAndDelete(messageId);

    const io = req.app.get("io");
    if (io) {
      io.to(String(message.recipient)).emit("dm:delete", { messageId, senderId: myId, recipientId: message.recipient });
      io.to(String(myId)).emit("dm:delete", { messageId, senderId: myId, recipientId: message.recipient });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 6. Edit direct message text
exports.editDirectMessage = async (req, res) => {
  try {
    const myId = req.user._id;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message text is required to edit"
      });
    }

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    if (String(message.sender) !== String(myId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to edit this message"
      });
    }

    message.message = text.trim();
    await message.save();

    const populated = await DirectMessage.findById(messageId)
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(String(message.recipient)).emit("dm:edit", populated);
      io.to(String(myId)).emit("dm:edit", populated);
    }

    res.status(200).json({
      success: true,
      message: populated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
