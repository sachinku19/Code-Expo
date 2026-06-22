const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");

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
    await DirectMessage.updateMany(
      { sender: userId, recipient: myId, isRead: false },
      { isRead: true }
    );

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
