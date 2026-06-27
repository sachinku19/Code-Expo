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
    const currentUser = await User.findById(myId);
    const blockedList = (currentUser?.blockedUsers || []).map(id => String(id));
    const io = req.app.get("io");

    // Get direct messages
    const messages = await DirectMessage.find({
      $or: [
        { sender: myId },
        { recipient: myId }
      ],
      groupChat: { $exists: false }
    })
    .sort({ createdAt: -1 })
    .populate("sender", "username avatar bio blockedUsers")
    .populate("recipient", "username avatar bio blockedUsers");

    const conversationsMap = {};
    messages.forEach(msg => {
      if (!msg.sender || !msg.recipient) return;
      const otherUser = String(msg.sender._id) === String(myId) ? msg.recipient : msg.sender;
      const otherUserId = String(otherUser._id);
      if (!conversationsMap[otherUserId]) {
        const userRoom = io?.sockets?.adapter?.rooms?.get(otherUserId);
        const isBlocked = blockedList.includes(otherUserId);
        const otherBlockedList = (otherUser.blockedUsers || []).map(id => String(id));
        const hasBlockedMe = otherBlockedList.includes(String(myId));

        conversationsMap[otherUserId] = {
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

    // Get group chats
    const myGroups = await GroupChat.find({ members: myId })
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar");
    const groupConversations = [];

    for (const group of myGroups) {
      const lastMsg = await DirectMessage.findOne({ groupChat: group._id })
        .sort({ createdAt: -1 })
        .populate("sender", "username avatar");

      groupConversations.push({
        _id: group._id,
        isGroup: true,
        group: {
          _id: group._id,
          name: group.name,
          avatar: group.avatar,
          bio: group.bio,
          members: group.members,
          isGroup: true,
          createdBy: group.createdBy
        },
        lastMessage: lastMsg ? {
          text: lastMsg.message,
          fileUrl: lastMsg.fileUrl,
          fileType: lastMsg.fileType,
          senderId: lastMsg.sender?._id || lastMsg.sender,
          senderName: lastMsg.sender?.username || "Unknown",
          createdAt: lastMsg.createdAt,
          isRead: lastMsg.isRead
        } : null,
        unreadCount: 0
      });
    }

    const conversations = [
      ...Object.values(conversationsMap),
      ...groupConversations
    ];

    // Sort conversations by last message timestamp
    conversations.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

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

// 2. Get chat history between current user and a target user/group
exports.getChatHistory = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    const group = await GroupChat.findById(userId);

    if (group) {
      // Return group history
      const messages = await DirectMessage.find({ groupChat: userId })
        .sort({ createdAt: 1 })
        .populate("sender", "username avatar");

      return res.status(200).json({
        success: true,
        messages
      });
    }

    // Mark messages sent by target user to me as read
    const updated = await DirectMessage.updateMany(
      { sender: userId, recipient: myId, isRead: false, groupChat: { $exists: false } },
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
      ],
      groupChat: { $exists: false }
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

    const group = await GroupChat.findById(recipientId);

    if (group) {
      const newMessage = await DirectMessage.create({
        sender: myId,
        groupChat: recipientId,
        message: message || "",
        fileType,
        fileUrl,
        fileName
      });

      const populated = await DirectMessage.findById(newMessage._id)
        .populate("sender", "username avatar");

      const io = req.app.get("io");
      if (io) {
        io.to(String(recipientId)).emit("dm:receive", populated);
      }

      return res.status(200).json({
        success: true,
        message: populated
      });
    }

    // Check if either user is blocked (1-to-1 DMs only)
    const targetUser = await User.findById(recipientId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const currentUser = await User.findById(myId);

    const isBlockedByTarget = (targetUser.blockedUsers || []).map(id => String(id)).includes(String(myId));
    const isBlockingTarget = (currentUser.blockedUsers || []).map(id => String(id)).includes(String(recipientId));

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
      recipient: recipientId,
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
      io.to(String(recipientId)).emit("dm:receive", populated);
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

    const group = await GroupChat.findById(recipientId);

    if (!group) {
      const targetUser = await User.findById(recipientId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: "Recipient user not found" });
      }

      const currentUser = await User.findById(myId);

      const isBlockedByTarget = (targetUser.blockedUsers || []).map(id => String(id)).includes(String(myId));
      const isBlockingTarget = (currentUser.blockedUsers || []).map(id => String(id)).includes(String(recipientId));

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
        groupChat: recipientId,
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
        io.to(String(recipientId)).emit("dm:receive", populated);
      }
    } else {
      newMessage = await DirectMessage.create({
        sender: myId,
        recipient: recipientId,
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
        io.to(String(recipientId)).emit("dm:receive", populated);
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
      isGroup: true
    });

    // Clean up local temp file if Multer ever writes to disk
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const populatedGroup = await GroupChat.findById(newGroup._id)
      .populate("members", "username avatar bio")
      .populate("createdBy", "username avatar");

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

    // Only creator (admin) can add members
    if (group.createdBy.toString() !== myId.toString()) {
      return res.status(403).json({ success: false, message: "Only the group creator/admin can add members" });
    }

    // Check if user is already a member
    if (group.members.map(id => id.toString()).includes(userId.toString())) {
      return res.status(400).json({ success: false, message: "User is already a member of this group" });
    }

    // Add user
    group.members.push(userId);
    await group.save();

    // Populate updated group details
    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar");

    const io = req.app.get("io");
    if (io) {
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

    const isCreator = group.createdBy.toString() === myId.toString();
    const isRemovingSelf = userId.toString() === myId.toString();

    // Requesters can only remove others if they are the admin (creator).
    // Or users can remove themselves (leave).
    if (!isCreator && !isRemovingSelf) {
      return res.status(403).json({ success: false, message: "Only the admin can remove members, or you can leave by removing yourself" });
    }

    // Pull from members list
    group.members = group.members.filter(id => id.toString() !== userId.toString());

    // If no members are left, or if creator leaves and group is empty, delete the group
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
    }

    await group.save();

    const populatedGroup = await GroupChat.findById(groupId)
      .populate("members", "username avatar bio isOnline")
      .populate("createdBy", "username avatar");

    const io = req.app.get("io");
    if (io) {
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

    // Verify creator is updating
    if (String(group.createdBy) !== String(myId)) {
      return res.status(403).json({
        success: false,
        message: "Only the group creator can update group details"
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
      .populate("createdBy", "username avatar");

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
