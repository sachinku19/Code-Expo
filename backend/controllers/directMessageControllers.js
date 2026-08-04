const mongoose = require("mongoose");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");
const GroupChat = require("../models/GroupChat");
const fs = require("fs");
const path = require("path");
const MediaService = require("../services/MediaService");

// 1. Get list of active conversations (one-to-one and group chats merged)
exports.getConversations = async (req, res) => {
  try {
    const myId = req.user._id;
    const currentUser = await User.findById(myId).select("blockedUsers").lean();
    const blockedList = (currentUser?.blockedUsers || []).map(id => String(id));
    const io = req.app.get("io");

    // 1. Ultra-fast MongoDB Aggregation Pipeline for Direct Messages (Grouped by Conversation)
    const directConversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [{ sender: myId }, { recipient: myId }],
          groupChat: { $exists: false },
          deletedFor: { $ne: myId }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", myId] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$sender", myId] },
                    { $eq: ["$isRead", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          unreadCount: 1,
          lastMessage: 1,
          "userInfo._id": 1,
          "userInfo.username": 1,
          "userInfo.avatar": 1,
          "userInfo.bio": 1,
          "userInfo.blockedUsers": 1
        }
      }
    ]);

    const formattedDirectList = directConversations.map(conv => {
      const otherUser = conv.userInfo;
      const otherUserId = String(otherUser._id);
      const userRoom = io?.sockets?.adapter?.rooms?.get(otherUserId);
      const isBlocked = blockedList.includes(otherUserId);
      const otherBlockedList = (otherUser.blockedUsers || []).map(id => String(id));
      const hasBlockedMe = otherBlockedList.includes(String(myId));

      return {
        _id: otherUserId,
        isGroup: false,
        user: {
          _id: otherUser._id,
          username: otherUser.username,
          avatar: otherUser.avatar,
          bio: otherUser.bio,
          isOnline: !!(userRoom && userRoom.size > 0),
          isBlocked,
          hasBlockedMe
        },
        lastMessage: {
          text: conv.lastMessage.message,
          fileUrl: conv.lastMessage.fileUrl,
          fileType: conv.lastMessage.fileType,
          senderId: conv.lastMessage.sender,
          createdAt: conv.lastMessage.createdAt,
          isRead: conv.lastMessage.isRead
        },
        unreadCount: conv.unreadCount
      };
    });

    // 2. Fetch Group Conversations with Parallel Aggregation
    const myGroups = await GroupChat.find({ members: myId })
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar")
      .lean();

    const groupIds = myGroups.map(g => g._id);

    const groupLastMessages = groupIds.length > 0 ? await DirectMessage.aggregate([
      { $match: { groupChat: { $in: groupIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$groupChat",
          lastMessage: { $first: "$$ROOT" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.sender",
          foreignField: "_id",
          as: "senderInfo"
        }
      }
    ]) : [];

    const groupLastMsgMap = {};
    groupLastMessages.forEach(item => {
      const sender = item.senderInfo[0];
      groupLastMsgMap[String(item._id)] = {
        text: item.lastMessage.message,
        fileUrl: item.lastMessage.fileUrl,
        fileType: item.lastMessage.fileType,
        senderId: item.lastMessage.sender,
        senderName: sender?.username || "Unknown",
        createdAt: item.lastMessage.createdAt,
        isRead: item.lastMessage.isRead
      };
    });

    const formattedGroupList = myGroups.map(group => ({
      _id: group._id,
      isGroup: true,
      group: {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        bio: group.bio,
        members: group.members,
        isGroup: true,
        createdBy: group.createdBy,
        admins: group.admins || []
      },
      lastMessage: groupLastMsgMap[String(group._id)] || null,
      unreadCount: 0
    }));

    // 3. Merge & Sort by newest message
    const conversations = [...formattedDirectList, ...formattedGroupList].sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error("Error in getConversations:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 2. Get chat history between current user and a target user/group
exports.getChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;
    const cleanUserId = String(userId).trim();
    const isObjId = mongoose.Types.ObjectId.isValid(cleanUserId);

    const group = isObjId ? await GroupChat.findById(cleanUserId) : null;

    if (group) {
      // Return group history
      const messages = await DirectMessage.find({
        groupChat: group._id,
        deletedFor: { $ne: myId }
      })
        .sort({ createdAt: 1 })
        .populate("sender", "username avatar")
        .lean();

      return res.status(200).json({
        success: true,
        messages
      });
    }

    const targetUser = await User.findOne(
      isObjId 
        ? { $or: [{ _id: cleanUserId }, { username: cleanUserId.toLowerCase() }] } 
        : { username: cleanUserId.toLowerCase() }
    ).select("_id username").lean();

    if (!targetUser) {
      return res.status(200).json({ success: true, messages: [] });
    }

    const realTargetId = targetUser._id;

    // Mark messages sent by target user to me as read
    const updated = await DirectMessage.updateMany(
      { sender: realTargetId, recipient: myId, isRead: false, groupChat: { $exists: false } },
      { isRead: true }
    );

    if (updated.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(String(realTargetId)).emit("dm:read", {
          readerId: String(myId),
          senderId: String(realTargetId)
        });
      }
    }

    const messages = await DirectMessage.find({
      $or: [
        { sender: myId, recipient: realTargetId },
        { sender: realTargetId, recipient: myId }
      ],
      groupChat: { $exists: false },
      deletedFor: { $ne: myId }
    })
    .sort({ createdAt: 1 })
    .populate("sender", "username avatar")
    .populate("recipient", "username avatar")
    .lean();

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    console.error("Error in getChatHistory:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 3. Send direct message (to user or group)
exports.sendDirectMessage = async (req, res) => {
  try {
    const myId = req.user._id;
    const { recipientId, message, fileType, fileUrl, fileName } = req.body;

    if (!recipientId || (!message && !fileType)) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID and message text (or fileType) are required"
      });
    }

    const cleanRecipient = String(recipientId).trim();
    const isObjId = mongoose.Types.ObjectId.isValid(cleanRecipient);

    const group = isObjId ? await GroupChat.findById(cleanRecipient) : null;

    if (group) {
      const newMessage = await DirectMessage.create({
        sender: myId,
        groupChat: group._id,
        message: message || "",
        fileType,
        fileUrl,
        fileName
      });

      const populated = await DirectMessage.findById(newMessage._id)
        .populate("sender", "username avatar");

      const io = req.app.get("io");
      if (io) {
        io.to(String(group._id)).emit("dm:receive", populated);
      }

      return res.status(200).json({
        success: true,
        message: populated
      });
    }

    // Check if either user is blocked (1-to-1 DMs only)
    const targetUser = await User.findOne(
      isObjId 
        ? { $or: [{ _id: cleanRecipient }, { username: cleanRecipient.toLowerCase() }] } 
        : { username: cleanRecipient.toLowerCase() }
    );
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const realRecipientId = targetUser._id;
    const currentUser = await User.findById(myId);

    const isBlockedByTarget = (targetUser.blockedUsers || []).map(id => String(id)).includes(String(myId));
    const isBlockingTarget = (currentUser.blockedUsers || []).map(id => String(id)).includes(String(realRecipientId));

    if (isBlockedByTarget || isBlockingTarget) {
      return res.status(403).json({
        success: false,
        message: isBlockingTarget 
          ? "You have blocked this user. Unblock them to send messages."
          : "You cannot message this user because they have blocked you."
      });
    }

    const newMessage = await DirectMessage.create({
      sender: myId,
      recipient: realRecipientId,
      message: message || "",
      fileType,
      fileUrl,
      fileName
    });

    const populated = await DirectMessage.findById(newMessage._id)
      .populate("sender", "username avatar")
      .populate("recipient", "username avatar");

    const io = req.app.get("io");
    if (io) {
      io.to(String(realRecipientId)).emit("dm:receive", populated);
      io.to(String(myId)).emit("dm:receive", populated);
    }

    res.status(200).json({
      success: true,
      message: populated
    });
  } catch (error) {
    console.error("Error in sendDirectMessage:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 4. Send direct message attachment (strictly images only)
exports.sendDirectMessageAttachment = async (req, res) => {
  let uploadedMedia = null;
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

    const cleanRecipient = String(recipientId).trim();
    const isObjId = mongoose.Types.ObjectId.isValid(cleanRecipient);

    const group = isObjId ? await GroupChat.findById(cleanRecipient) : null;
    let realRecipientId = null;

    if (!group) {
      const targetUser = await User.findOne(
        isObjId 
          ? { $or: [{ _id: cleanRecipient }, { username: cleanRecipient.toLowerCase() }] } 
          : { username: cleanRecipient.toLowerCase() }
      );
      if (!targetUser) {
        return res.status(404).json({ success: false, message: "Recipient user not found" });
      }
      realRecipientId = targetUser._id;

      const currentUser = await User.findById(myId);

      const isBlockedByTarget = (targetUser.blockedUsers || []).map(id => String(id)).includes(String(myId));
      const isBlockingTarget = (currentUser.blockedUsers || []).map(id => String(id)).includes(String(realRecipientId));

      if (isBlockedByTarget || isBlockingTarget) {
        return res.status(403).json({
          success: false,
          message: isBlockingTarget 
            ? "You have blocked this user. Unblock them to send attachments."
            : "You cannot message this user because they have blocked you."
        });
      }
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    // Strict image attachment validation
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        message: "Only image files (jpg, jpeg, png, webp) are allowed as attachments."
      });
    }
    const fileType = "image";

    let fileUrl = "";
    // Validate file type and size (max 10MB)
    MediaService.validateFile(req.file, { maxSize: 10 * 1024 * 1024 });

    uploadedMedia = await MediaService.uploadMedia(
      req.file.buffer,
      originalName,
      "codeexpo_attachments",
      { req }
    );
    fileUrl = uploadedMedia.url;

    let populated;
    let newMessage;

    if (group) {
      newMessage = await DirectMessage.create({
        sender: myId,
        groupChat: group._id,
        message: message || "",
        fileUrl,
        fileMetadata: uploadedMedia,
        fileType,
        fileName: originalName
      });

      populated = await DirectMessage.findById(newMessage._id)
        .populate("sender", "username avatar");

      const io = req.app.get("io");
      if (io) {
        io.to(String(group._id)).emit("dm:receive", populated);
      }
    } else {
      newMessage = await DirectMessage.create({
        sender: myId,
        recipient: realRecipientId,
        message: message || "",
        fileUrl,
        fileMetadata: uploadedMedia,
        fileType,
        fileName: originalName
      });

      populated = await DirectMessage.findById(newMessage._id)
        .populate("sender", "username avatar")
        .populate("recipient", "username avatar");

      const io = req.app.get("io");
      if (io) {
        io.to(String(realRecipientId)).emit("dm:receive", populated);
        io.to(String(myId)).emit("dm:receive", populated);
      }
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

    const mode = (req.body?.mode || req.query?.mode || "me").toLowerCase();
    const isSender = String(message.sender) === String(myId);

    const io = req.app.get("io");

    if (mode === "everyone" && isSender) {
      await DirectMessage.findByIdAndDelete(messageId);

      if (io) {
        const payload = { messageId, mode: "everyone", senderId: myId, recipientId: message.recipient, groupChatId: message.groupChat };
        if (message.groupChat) {
          io.to(String(message.groupChat)).emit("dm:delete", payload);
        } else {
          if (message.recipient) io.to(String(message.recipient)).emit("dm:delete", payload);
          io.to(String(myId)).emit("dm:delete", payload);
        }
      }

      return res.status(200).json({
        success: true,
        mode: "everyone",
        message: "Message deleted for everyone"
      });
    } else {
      await DirectMessage.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: myId }
      });

      if (io) {
        io.to(String(myId)).emit("dm:delete", { messageId, mode: "me", senderId: myId });
      }

      return res.status(200).json({
        success: true,
        mode: "me",
        message: "Message deleted for you"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// 5.5. Clear entire chat history for a user or group (from my side only)
exports.clearChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const { chatId } = req.params;
    const cleanChatId = String(chatId).trim();
    const isObjId = mongoose.Types.ObjectId.isValid(cleanChatId);

    const group = isObjId ? await GroupChat.findById(cleanChatId) : null;

    if (group) {
      // Add myId to deletedFor array for all messages in the group
      await DirectMessage.updateMany(
        { groupChat: group._id },
        { $addToSet: { deletedFor: myId } }
      );

      return res.status(200).json({
        success: true,
        message: "Group chat history cleared from your side"
      });
    }

    const targetUser = await User.findOne(
      isObjId 
        ? { $or: [{ _id: cleanChatId }, { username: cleanChatId.toLowerCase() }] } 
        : { username: cleanChatId.toLowerCase() }
    ).select("_id").lean();

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User or Group not found"
      });
    }

    const targetUserId = targetUser._id;

    // Add myId to deletedFor array for all messages between myId and targetUserId
    await DirectMessage.updateMany(
      {
        $or: [
          { sender: myId, recipient: targetUserId },
          { sender: targetUserId, recipient: myId }
        ],
        groupChat: { $exists: false }
      },
      { $addToSet: { deletedFor: myId } }
    );

    return res.status(200).json({
      success: true,
      message: "Chat history cleared from your side"
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

// 7. Create group chat channel
exports.createGroupChat = async (req, res) => {
  let uploadedMedia = null;
  try {
    const myId = req.user._id;
    const { name, bio, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required"
      });
    }

    let parsedMembers = [];
    if (members) {
      try {
        parsedMembers = typeof members === "string" ? JSON.parse(members) : members;
      } catch (e) {
        parsedMembers = [];
      }
    }

    // Ensure creator is in the members list
    const memberIds = Array.from(new Set([myId.toString(), ...parsedMembers.map(id => id.toString())]));

    let avatarUrl = "";
    if (req.file) {
      // Validate banner file size and types (max 5MB)
      MediaService.validateFile(req.file, { maxSize: 5 * 1024 * 1024 });

      uploadedMedia = await MediaService.uploadMedia(
        req.file.buffer,
        req.file.originalname,
        "codeexpo_groups",
        { req }
      );
      avatarUrl = uploadedMedia.url;
    }

    const newGroup = await GroupChat.create({
      name: name.trim(),
      bio: bio || "",
      avatar: avatarUrl || "",
      avatarMetadata: uploadedMedia,
      members: memberIds,
      createdBy: myId,
      admins: [myId],
      isGroup: true
    });

    // Clean up local temp file if Multer ever writes to disk
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const populatedGroup = await GroupChat.findById(newGroup._id)
      .populate("members", "username avatar bio")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    // Emit group:created to all group members via socket
    const io = req.app.get("io");
    if (io) {
      memberIds.forEach(memberId => {
        io.to(String(memberId)).emit("group:created", populatedGroup);
      });
    }

    res.status(201).json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
    // Rollback uploaded file if DB save fails
    if (uploadedMedia) {
      await MediaService.deleteMedia(uploadedMedia).catch((e) => {
        console.error("Rollback failed for group avatar:", e.message);
      });
    }
    // Clean up local temp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Block a user
exports.blockUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    if (String(myId) === String(userId)) {
      return res.status(400).json({ success: false, message: "You cannot block yourself" });
    }

    await User.findByIdAndUpdate(myId, {
      $addToSet: { blockedUsers: userId }
    });

    res.status(200).json({ success: true, message: "User blocked successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unblock a user
exports.unblockUser = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    await User.findByIdAndUpdate(myId, {
      $pull: { blockedUsers: userId }
    });

    res.status(200).json({ success: true, message: "User unblocked successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a group chat
exports.deleteGroupChat = async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Verify creator ownership
    if (group.createdBy.toString() !== myId.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator can delete this group" });
    }

    // Clean up group avatar from storage
    if (group.avatarMetadata) {
      await MediaService.deleteMedia(group.avatarMetadata).catch((err) => {
        console.error("Failed to delete group avatar from storage:", err.message);
      });
    }

    // Delete group direct messages and their attachments
    const dms = await DirectMessage.find({ groupChat: groupId });
    for (const dm of dms) {
      if (dm.fileMetadata) {
        await MediaService.deleteMedia(dm.fileMetadata).catch(console.error);
      }
    }
    await DirectMessage.deleteMany({ groupChat: groupId });

    // Delete group chat itself
    await GroupChat.findByIdAndDelete(groupId);

    // Broadcast socket event to group members
    const io = req.app.get("io");
    if (io) {
      io.to(String(groupId)).emit("group:deleted", { groupId });
    }

    res.status(200).json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add a member to a group chat
exports.addGroupMember = async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    // Only admins can add members
    const isAdmin = (group.admins || []).map(id => id.toString()).includes(myId.toString()) || group.createdBy.toString() === myId.toString();
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can add members" });
    }

    // Check if user is already a member
    if (group.members.map(id => id.toString()).includes(userId.toString())) {
      return res.status(400).json({ success: false, message: "User is already a member of this group" });
    }

    // Add user
    group.members.push(userId);
    await group.save();

    // Create system message
    const adminUser = await User.findById(myId).select("username").lean();
    const targetUser = await User.findById(userId).select("username").lean();
    const systemMsgText = `@${adminUser?.username || "Admin"} added @${targetUser?.username || "someone"}`;

    const systemMsg = await DirectMessage.create({
      sender: myId,
      groupChat: groupId,
      message: systemMsgText,
      isSystem: true
    });

    const populatedMsg = await DirectMessage.findById(systemMsg._id)
      .populate("sender", "username avatar");

    // Populate updated group details
    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Broadcast system message
      io.to(String(groupId)).emit("dm:receive", populatedMsg);
      // Broadcast to existing group members that a user joined
      io.to(String(groupId)).emit("group:member-added", { groupId, member: { _id: userId }, group: populatedGroup });
      // Tell the specific user they were added to the group
      io.to(String(userId)).emit("group:created", populatedGroup);
    }

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove a member from a group chat (or leave group)
exports.removeGroupMember = async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const isAdmin = (group.admins || []).map(id => id.toString()).includes(myId.toString()) || group.createdBy.toString() === myId.toString();
    const isRemovingSelf = userId.toString() === myId.toString();

    // Requesters can only remove others if they are the admin.
    // Or users can remove themselves (leave).
    if (!isAdmin && !isRemovingSelf) {
      return res.status(403).json({ success: false, message: "Only group admins can remove members, or you can leave by removing yourself" });
    }

    // Pull from members list
    group.members = group.members.filter(id => id.toString() !== userId.toString());

    // Pull from admins list if present
    if (group.admins) {
      group.admins = group.admins.filter(id => id.toString() !== userId.toString());
    }

    // If no members are left, delete the group
    if (group.members.length === 0) {
      // Clean up avatar
      if (group.avatarMetadata) await MediaService.deleteMedia(group.avatarMetadata).catch(console.error);
      
      await require("../models/DirectMessage").deleteMany({ groupChat: groupId });
      await GroupChat.findByIdAndDelete(groupId);
      
      const io = req.app.get("io");
      if (io) {
        io.to(String(groupId)).emit("group:deleted", { groupId });
      }
      return res.status(200).json({ success: true, message: "Group empty and deleted successfully" });
    }

    // If the creator leaves, re-assign creator to the next member
    if (group.createdBy.toString() === userId.toString()) {
      group.createdBy = group.members[0];
      // Also ensure new creator is an admin
      if (group.admins && !group.admins.map(id => id.toString()).includes(group.createdBy.toString())) {
        group.admins.push(group.createdBy);
      }
    }

    // If no admins are left, set the new owner (or first member) as admin
    if (!group.admins || group.admins.length === 0) {
      group.admins = [group.createdBy];
    }

    // Create system message
    const adminUser = await User.findById(myId).select("username").lean();
    const targetUser = await User.findById(userId).select("username").lean();
    let systemMsgText = "";
    if (isRemovingSelf) {
      systemMsgText = `@${targetUser?.username || "someone"} left the group`;
    } else {
      systemMsgText = `@${adminUser?.username || "Admin"} removed @${targetUser?.username || "someone"}`;
    }

    const systemMsg = await DirectMessage.create({
      sender: myId,
      groupChat: groupId,
      message: systemMsgText,
      isSystem: true
    });

    const populatedMsg = await DirectMessage.findById(systemMsg._id)
      .populate("sender", "username avatar");

    await group.save();

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Broadcast system message
      io.to(String(groupId)).emit("dm:receive", populatedMsg);
      // Notify group members that a user was removed
      io.to(String(groupId)).emit("group:member-removed", { groupId, userId, group: populatedGroup });
      // Notify the removed user specifically that they were kicked/removed
      io.to(String(userId)).emit("group:deleted", { groupId });
    }

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGroupChat = async (req, res) => {
  let uploadedMedia = null;
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const { name, bio } = req.body;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found"
      });
    }

    // Verify group admin is updating
    const isAdmin = (group.admins || []).map(id => id.toString()).includes(myId.toString()) || String(group.createdBy) === String(myId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only group admins can update group details"
      });
    }

    if (name && name.trim()) {
      group.name = name.trim();
    }
    if (bio !== undefined) {
      group.bio = bio.trim();
    }

    if (req.file) {
      // Validate banner file size and types (max 5MB)
      MediaService.validateFile(req.file, { maxSize: 5 * 1024 * 1024 });

      const oldMedia = group.avatarMetadata;
      uploadedMedia = await MediaService.replaceMedia(
        oldMedia,
        req.file.buffer,
        req.file.originalname,
        "codeexpo_groups",
        { req }
      );
      group.avatar = uploadedMedia.url;
      group.avatarMetadata = uploadedMedia;
    }

    await group.save();

    // Clean up local temp file if Multer ever writes to disk
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    // Emit group:member-added (to trigger frontend update of group details)
    const io = req.app.get("io");
    if (io) {
      populatedGroup.members.forEach(member => {
        io.to(String(member._id)).emit("group:member-added", { groupId, group: populatedGroup });
      });
    }

    res.status(200).json({
      success: true,
      group: populatedGroup
    });
  } catch (error) {
    // Rollback uploaded file if DB save fails
    if (uploadedMedia) {
      await MediaService.deleteMedia(uploadedMedia).catch((e) => {
        console.error("Rollback failed for group avatar update:", e.message);
      });
    }
    // Clean up local temp file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.promoteGroupAdmin = async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const myIdStr = myId.toString();
    const isAdmin = (group.admins || []).map(id => id.toString()).includes(myIdStr) || group.createdBy.toString() === myIdStr;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can promote other members" });
    }

    const targetIdStr = userId.toString();
    if (!group.members.map(id => id.toString()).includes(targetIdStr)) {
      return res.status(400).json({ success: false, message: "User must be a member of the group first" });
    }

    // Initialize admins array if not present
    if (!group.admins) {
      group.admins = [group.createdBy];
    }

    if (group.admins.map(id => id.toString()).includes(targetIdStr)) {
      return res.status(400).json({ success: false, message: "User is already an admin" });
    }

    group.admins.push(userId);
    await group.save();

    // Create system message
    const adminUser = await User.findById(myId).select("username").lean();
    const targetUser = await User.findById(userId).select("username").lean();
    const systemMsgText = `@${adminUser?.username || "Admin"} made @${targetUser?.username || "someone"} an admin`;

    const systemMsg = await DirectMessage.create({
      sender: myId,
      groupChat: groupId,
      message: systemMsgText,
      isSystem: true
    });

    const populatedMsg = await DirectMessage.findById(systemMsg._id)
      .populate("sender", "username avatar");

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Broadcast system message
      io.to(String(groupId)).emit("dm:receive", populatedMsg);
      populatedGroup.members.forEach(member => {
        io.to(String(member._id)).emit("group:member-added", { groupId, group: populatedGroup });
      });
    }

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.demoteGroupAdmin = async (req, res) => {
  try {
    const myId = req.user._id;
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await GroupChat.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    const myIdStr = myId.toString();
    const isAdmin = (group.admins || []).map(id => id.toString()).includes(myIdStr) || group.createdBy.toString() === myIdStr;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only group admins can demote other admins" });
    }

    const targetIdStr = userId.toString();
    if (group.createdBy.toString() === targetIdStr) {
      return res.status(400).json({ success: false, message: "The group creator cannot be demoted" });
    }

    if (!group.admins || !group.admins.map(id => id.toString()).includes(targetIdStr)) {
      return res.status(400).json({ success: false, message: "User is not an admin" });
    }

    group.admins = group.admins.filter(id => id.toString() !== targetIdStr);
    await group.save();

    // Create system message
    const adminUser = await User.findById(myId).select("username").lean();
    const targetUser = await User.findById(userId).select("username").lean();
    const systemMsgText = `@${adminUser?.username || "Admin"} dismissed @${targetUser?.username || "someone"} as admin`;

    const systemMsg = await DirectMessage.create({
      sender: myId,
      groupChat: groupId,
      message: systemMsgText,
      isSystem: true
    });

    const populatedMsg = await DirectMessage.findById(systemMsg._id)
      .populate("sender", "username avatar");

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar")
      .populate("admins", "username avatar");

    const io = req.app.get("io");
    if (io) {
      // Broadcast system message
      io.to(String(groupId)).emit("dm:receive", populatedMsg);
      populatedGroup.members.forEach(member => {
        io.to(String(member._id)).emit("group:member-added", { groupId, group: populatedGroup });
      });
    }

    res.status(200).json({ success: true, group: populatedGroup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
