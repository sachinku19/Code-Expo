const PersonalTask = require("../models/PersonalTask");
const RoomTask = require("../models/RoomTask");
const Checklist = require("../models/Checklist");
const Comment = require("../models/Comment");
const TaskActivity = require("../models/TaskActivity");
const TimerSession = require("../models/TimerSession");
const Room = require("../models/Room");
const User = require("../models/User");
const MediaService = require("../services/MediaService");

// Helper to log task activity
const logActivity = async (taskId, taskType, user, action, details = {}) => {
  try {
    await TaskActivity.create({
      taskId,
      taskType,
      user: user._id || user,
      action,
      details
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

// HELPER FOR BROADCASTING VIA ROOM OR USER PLANNERS
const getPlannerIO = (req) => {
  return req.app.get("io");
};

const checkPlannerTaskModifyPermission = async (taskId, taskType, user) => {
  if (taskType !== "RoomTask") return { allowed: true };

  const task = await RoomTask.findById(taskId);
  if (!task) return { allowed: false, status: 404, message: "Task not found" };

  const room = await Room.findOne({ roomId: task.roomId });
  if (!room) return { allowed: false, status: 404, message: "Room not found" };

  const participant = room.participants.find(p => p.user.toString() === user._id.toString());
  if (!participant) return { allowed: false, status: 403, message: "You are not a participant in this room" };

  if (participant.role === "VIEWER") {
    return { allowed: false, status: 403, message: "Viewers cannot modify tasks" };
  }

  if (participant.role === "MEMBER") {
    const isCreator = task.createdBy.toString() === user._id.toString();
    const isAssigned = task.assignedMembers.some(id => id.toString() === user._id.toString()) || task.isAssignedToAll;
    if (!isCreator && !isAssigned) {
      return { allowed: false, status: 403, message: "Members can only modify tasks they created or are assigned to" };
    }
  }

  return { allowed: true, task, roomRole: participant.role };
};

// ==========================================
// PERSONAL TASKS CONTROLLERS
// ==========================================

exports.createPersonalTask = async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      category,
      dueDate,
      reminder,
      estimatedTime,
      status,
      colorLabel,
      tags,
      notes,
      recurring
    } = req.body;

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = await MediaService.uploadMultipleMedia(req.files, "personal_tasks_attachments", { req });
    }

    const newTask = await PersonalTask.create({
      user: req.user._id,
      title,
      description,
      priority,
      category,
      dueDate,
      reminder,
      estimatedTime,
      status,
      colorLabel,
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      notes,
      recurring,
      attachments
    });

    await logActivity(newTask._id, "PersonalTask", req.user._id, "created", { title });

    res.status(201).json({
      success: true,
      message: "Personal task created successfully",
      task: newTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPersonalTasks = async (req, res) => {
  try {
    const { search, priority, status, category, tag, sort, page = 1, limit = 20 } = req.query;

    const query = { user: req.user._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } }
      ];
    }
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (category) query.category = category;
    if (tag) query.tags = tag;

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "priority") {
      sortOption = { priority: -1 }; // Critical down to Low
    }
    if (sort === "deadline") sortOption = { dueDate: 1 };
    if (sort === "progress") sortOption = { progress: -1 };
    if (sort === "recently_updated") sortOption = { updatedAt: -1 };

    // Handle priority custom sort logic if mongo supports or simple fallback
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await PersonalTask.countDocuments(query);
    const tasks = await PersonalTask.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const tasksWithStats = await Promise.all(tasks.map(async (task) => {
      const commentCount = await Comment.countDocuments({ taskId: task._id });
      const checklist = await Checklist.findOne({ taskId: task._id });
      let checklistCount = 0;
      let checklistCompletedCount = 0;
      if (checklist && checklist.items) {
        checklistCount = checklist.items.length;
        checklistCompletedCount = checklist.items.filter(item => item.isCompleted).length;
      }
      
      const taskObj = task.toObject();
      taskObj.commentCount = commentCount;
      taskObj.checklistCount = checklistCount;
      taskObj.checklistCompletedCount = checklistCompletedCount;
      return taskObj;
    }));

    res.status(200).json({
      success: true,
      tasks: tasksWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePersonalTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    const task = await PersonalTask.findOne({ _id: taskId, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Handle tags parse if sent as string
    if (updateData.tags && typeof updateData.tags === "string") {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {}
    }

    // Attachments reconciliation if files are uploaded
    if (req.files && req.files.length > 0) {
      const urlsToKeep = updateData.existingAttachments ? 
        (Array.isArray(updateData.existingAttachments) ? updateData.existingAttachments : [updateData.existingAttachments]) : [];
      
      const newAttachments = await MediaService.reconcileMediaList(
        task.attachments,
        urlsToKeep,
        req.files,
        "personal_tasks_attachments",
        { req }
      );
      updateData.attachments = newAttachments;
    }

    // Capture changes for activity log
    const changedFields = [];
    if (updateData.status && updateData.status !== task.status) {
      changedFields.push(`status to ${updateData.status}`);
      if (updateData.status === "Completed") {
        updateData.completionTime = new Date();
        updateData.progress = 100;
        await logActivity(task._id, "PersonalTask", req.user._id, "completed", { title: task.title });
      } else {
        updateData.completionTime = null;
      }
    }
    if (updateData.priority && updateData.priority !== task.priority) {
      changedFields.push(`priority to ${updateData.priority}`);
    }

    Object.assign(task, updateData);
    await task.save();

    if (changedFields.length > 0) {
      await logActivity(task._id, "PersonalTask", req.user._id, "status_changed", {
        details: `Updated ${changedFields.join(", ")}`
      });
    } else {
      await logActivity(task._id, "PersonalTask", req.user._id, "updated");
    }

    res.status(200).json({
      success: true,
      message: "Personal task updated successfully",
      task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deletePersonalTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await PersonalTask.findOneAndDelete({ _id: taskId, user: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Clean attachments
    if (task.attachments && task.attachments.length > 0) {
      await MediaService.deleteMultipleMedia(task.attachments);
    }

    // Clean up activity, checklists, comments, timers
    await Checklist.deleteMany({ taskId, taskType: "PersonalTask" });
    await Comment.deleteMany({ taskId, taskType: "PersonalTask" });
    await TaskActivity.deleteMany({ taskId, taskType: "PersonalTask" });
    await TimerSession.deleteMany({ taskId, taskType: "PersonalTask" });

    res.status(200).json({
      success: true,
      message: "Personal task and all associated resources deleted"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ROOM TASKS CONTROLLERS
// ==========================================

exports.createRoomTask = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      estimatedTime,
      assignedMembers,
      isAssignedToAll,
      labels
    } = req.body;

    // Permissions Check: Only OWNER and MODERATOR can create tasks
    if (!["OWNER", "MODERATOR"].includes(req.userRole)) {
      return res.status(403).json({ success: false, message: "Only the Room Owner or Moderators can create tasks" });
    }

    let parsedMembers = [];
    if (assignedMembers) {
      parsedMembers = Array.isArray(assignedMembers) ? assignedMembers : JSON.parse(assignedMembers);
    }

    // Only OWNER and MODERATOR can assign tasks to members
    const wantsToAssignToAll = isAssignedToAll === "true" || isAssignedToAll === true;
    if (parsedMembers.length > 0 || wantsToAssignToAll) {
      if (!["OWNER", "MODERATOR"].includes(req.userRole)) {
        return res.status(403).json({ success: false, message: "Only the Room Owner or Moderators can assign tasks to members" });
      }
    }

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = await MediaService.uploadMultipleMedia(req.files, "room_tasks_attachments", { req });
    }

    const newRoomTask = await RoomTask.create({
      roomId,
      title,
      description,
      priority,
      status: status || "Todo",
      dueDate,
      estimatedTime,
      assignedMembers: parsedMembers,
      isAssignedToAll: isAssignedToAll === "true" || isAssignedToAll === true,
      createdBy: req.user._id,
      lastUpdatedBy: req.user._id,
      labels: labels ? (Array.isArray(labels) ? labels : JSON.parse(labels)) : [],
      attachments
    });

    await logActivity(newRoomTask._id, "RoomTask", req.user._id, "created", { title });

    // Emit live update via sockets (which we'll hook up in plannerSocket)
    const io = getPlannerIO(req);
    if (io) {
      io.of("/planner").to(roomId).emit("task-created", newRoomTask);
    }

    res.status(201).json({
      success: true,
      message: "Room task created successfully",
      task: newRoomTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomTasks = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Viewers cannot see any tasks
    if (req.userRole === "VIEWER") {
      return res.status(403).json({ success: false, message: "Viewers are not authorized to view tasks" });
    }

    const { search, priority, status, assignedUser, label, sort } = req.query;

    const query = { roomId };

    if (req.userRole === "MEMBER") {
      query.$and = [
        {
          $or: [
            { createdBy: req.user._id },
            { assignedMembers: req.user._id },
            { isAssignedToAll: true }
          ]
        }
      ];
    }

    if (search) {
      const searchConditions = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ]
      };
      if (query.$and) {
        query.$and.push(searchConditions);
      } else {
        query.$or = searchConditions.$or;
      }
    }
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (label) query.labels = label;
    if (assignedUser) {
      const assignedConditions = {
        $or: [
          { assignedMembers: assignedUser },
          { isAssignedToAll: true }
        ]
      };
      if (query.$and) {
        query.$and.push(assignedConditions);
      } else {
        query.$or = assignedConditions.$or;
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "priority") {
      sortOption = { priority: -1 };
    }
    if (sort === "deadline") sortOption = { dueDate: 1 };
    if (sort === "recently_updated") sortOption = { updatedAt: -1 };

    const tasks = await RoomTask.find(query)
      .populate("assignedMembers", "username avatar title")
      .populate("createdBy", "username avatar")
      .sort(sortOption);

    res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRoomTask = async (req, res) => {
  try {
    const { roomId, taskId } = req.params;
    const updateData = req.body;

    const task = await RoomTask.findOne({ _id: taskId, roomId });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Role check:
    // - Owner / Moderator can edit everything.
    // - Member can only update task status/report if assigned or creator.
    // - Viewer can NEVER update.
    const isOwnerOrMod = ["OWNER", "MODERATOR"].includes(req.userRole);
    const isAssigned = task.assignedMembers.some(id => id.toString() === req.user._id.toString()) || task.isAssignedToAll;
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (req.userRole === "VIEWER") {
      return res.status(403).json({ success: false, message: "Viewers cannot update tasks" });
    }

    if (req.userRole === "MEMBER") {
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ success: false, message: "Members can only update reports on tasks they created or are assigned to" });
      }

      // Check if they tried to update restricted fields
      const restrictedFields = ["title", "description", "priority", "estimatedTime", "labels", "dueDate", "assignedMembers", "isAssignedToAll"];
      const modifiedFields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
      const hasRestricted = modifiedFields.some(field => restrictedFields.includes(field));

      if (hasRestricted) {
        return res.status(403).json({ 
          success: false, 
          message: "Members can only update task status and progress, they cannot modify task configuration details" 
        });
      }
    }

    // Handle parsed inputs
    if (updateData.assignedMembers && typeof updateData.assignedMembers === "string") {
      updateData.assignedMembers = JSON.parse(updateData.assignedMembers);
    }
    if (updateData.labels && typeof updateData.labels === "string") {
      updateData.labels = JSON.parse(updateData.labels);
    }

    // Role check for assigning work: only OWNER and MODERATOR can assign/change assignments
    if (!["OWNER", "MODERATOR"].includes(req.userRole)) {
      if (updateData.assignedMembers !== undefined) {
        const currentIds = task.assignedMembers.map(id => id.toString()).sort();
        const newIds = (Array.isArray(updateData.assignedMembers) ? updateData.assignedMembers : []).map(id => id.toString()).sort();
        if (JSON.stringify(currentIds) !== JSON.stringify(newIds)) {
          return res.status(403).json({ success: false, message: "Only Room Administrators can modify task assignments" });
        }
      }
      if (updateData.isAssignedToAll !== undefined) {
        const currentVal = !!task.isAssignedToAll;
        const newVal = updateData.isAssignedToAll === "true" || updateData.isAssignedToAll === true;
        if (currentVal !== newVal) {
          return res.status(403).json({ success: false, message: "Only Room Administrators can modify task assignments" });
        }
      }
    }

    // File attachments reconciliation
    if (req.files && req.files.length > 0) {
      const urlsToKeep = updateData.existingAttachments ? 
        (Array.isArray(updateData.existingAttachments) ? updateData.existingAttachments : [updateData.existingAttachments]) : [];
      
      const newAttachments = await MediaService.reconcileMediaList(
        task.attachments,
        urlsToKeep,
        req.files,
        "room_tasks_attachments",
        { req }
      );
      updateData.attachments = newAttachments;
    }

    updateData.lastUpdatedBy = req.user._id;

    // Track status change
    const oldStatus = task.status;
    const changedFields = [];
    if (updateData.status && updateData.status !== task.status) {
      changedFields.push(`status to ${updateData.status}`);
      if (updateData.status === "Completed") {
        updateData.completionTime = new Date();
        await logActivity(task._id, "RoomTask", req.user._id, "completed", { title: task.title });
      } else {
        updateData.completionTime = null;
      }
    }

    Object.assign(task, updateData);
    await task.save();

    if (changedFields.length > 0) {
      await logActivity(task._id, "RoomTask", req.user._id, "status_changed", {
        from: oldStatus,
        to: task.status,
        details: `Updated ${changedFields.join(", ")}`
      });
    } else {
      await logActivity(task._id, "RoomTask", req.user._id, "updated");
    }

    const updatedTask = await RoomTask.findById(taskId)
      .populate("assignedMembers", "username avatar title")
      .populate("createdBy", "username avatar")
      .populate("lastUpdatedBy", "username avatar");

    // Emit live socket event
    const io = getPlannerIO(req);
    if (io) {
      io.of("/planner").to(roomId).emit("task-updated", updatedTask);
    }

    res.status(200).json({
      success: true,
      message: "Room task updated successfully",
      task: updatedTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRoomTask = async (req, res) => {
  try {
    const { roomId, taskId } = req.params;

    const task = await RoomTask.findOne({ _id: taskId, roomId });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const isOwnerOrMod = ["OWNER", "MODERATOR"].includes(req.userRole);
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isOwnerOrMod && !isCreator) {
      return res.status(403).json({ success: false, message: "Only the creator or room administrators can delete this task" });
    }

    await RoomTask.deleteOne({ _id: taskId });

    // Clear media files
    if (task.attachments && task.attachments.length > 0) {
      await MediaService.deleteMultipleMedia(task.attachments);
    }

    // Delete checklist, activity history, comments, and timer sessions
    await Checklist.deleteMany({ taskId, taskType: "RoomTask" });
    await Comment.deleteMany({ taskId, taskType: "RoomTask" });
    await TaskActivity.deleteMany({ taskId, taskType: "RoomTask" });
    await TimerSession.deleteMany({ taskId, taskType: "RoomTask" });

    // Emit via sockets
    const io = getPlannerIO(req);
    if (io) {
      io.of("/planner").to(roomId).emit("task-deleted", { taskId });
    }

    res.status(200).json({
      success: true,
      message: "Room task and all related logs deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// LIVE CHECKLIST CONTROLLERS
// ==========================================

exports.getTaskChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    let checklist = await Checklist.findOne({ taskId }).populate("items.assignedTo items.completedBy", "username avatar");
    
    if (!checklist) {
      checklist = { taskId, items: [] };
    }

    res.status(200).json({ success: true, checklist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, taskType, assignedTo } = req.body;

    const check = await checkPlannerTaskModifyPermission(taskId, taskType, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    let checklist = await Checklist.findOne({ taskId });
    if (!checklist) {
      checklist = new Checklist({ taskId, taskType, items: [] });
    }

    const newItem = {
      title,
      isCompleted: false,
      assignedTo: assignedTo || []
    };

    checklist.items.push(newItem);
    await checklist.save();

    // Auto-update task progress if it is a personal task
    if (taskType === "PersonalTask") {
      const completedCount = checklist.items.filter(item => item.isCompleted).length;
      const totalCount = checklist.items.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      await PersonalTask.findByIdAndUpdate(taskId, { progress });
    }

    await logActivity(taskId, taskType, req.user._id, "checklist_updated", {
      actionType: "item_added",
      title
    });

    const populatedChecklist = await Checklist.findById(checklist._id)
      .populate("items.assignedTo items.completedBy", "username avatar");

    // Emit live socket event if RoomTask
    if (taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("checklist-update", { taskId, checklist: populatedChecklist });
        }
      }
    }

    res.status(201).json({ success: true, checklist: populatedChecklist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateChecklistItem = async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const { title, isCompleted, assignedTo } = req.body;

    const checklist = await Checklist.findOne({ taskId });
    if (!checklist) {
      return res.status(404).json({ success: false, message: "Checklist not found" });
    }

    const check = await checkPlannerTaskModifyPermission(taskId, checklist.taskType, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const item = checklist.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Checklist item not found" });
    }

    if (title !== undefined) item.title = title;
    if (isCompleted !== undefined) {
      item.isCompleted = isCompleted;
      item.completedBy = isCompleted ? req.user._id : null;
    }
    if (assignedTo !== undefined) item.assignedTo = assignedTo;

    await checklist.save();

    // Auto-update personal task progress
    if (checklist.taskType === "PersonalTask") {
      const completedCount = checklist.items.filter(i => i.isCompleted).length;
      const totalCount = checklist.items.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      await PersonalTask.findByIdAndUpdate(taskId, { progress });
    }

    await logActivity(taskId, checklist.taskType, req.user._id, "checklist_updated", {
      actionType: isCompleted ? "item_checked" : "item_updated",
      title: item.title,
      isCompleted
    });

    const populatedChecklist = await Checklist.findById(checklist._id)
      .populate("items.assignedTo items.completedBy", "username avatar");

    if (checklist.taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("checklist-update", { taskId, checklist: populatedChecklist });
        }
      }
    }

    res.status(200).json({ success: true, checklist: populatedChecklist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const { taskId, itemId } = req.params;

    const checklist = await Checklist.findOne({ taskId });
    if (!checklist) {
      return res.status(404).json({ success: false, message: "Checklist not found" });
    }

    const check = await checkPlannerTaskModifyPermission(taskId, checklist.taskType, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const item = checklist.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const itemTitle = item.title;
    checklist.items.pull(itemId);
    await checklist.save();

    // Auto-update personal progress
    if (checklist.taskType === "PersonalTask") {
      const completedCount = checklist.items.filter(i => i.isCompleted).length;
      const totalCount = checklist.items.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      await PersonalTask.findByIdAndUpdate(taskId, { progress });
    }

    await logActivity(taskId, checklist.taskType, req.user._id, "checklist_updated", {
      actionType: "item_deleted",
      title: itemTitle
    });

    const populatedChecklist = await Checklist.findById(checklist._id)
      .populate("items.assignedTo items.completedBy", "username avatar");

    if (checklist.taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("checklist-update", { taskId, checklist: populatedChecklist });
        }
      }
    }

    res.status(200).json({ success: true, checklist: populatedChecklist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DISCUSSION COMMENTS CONTROLLERS
// ==========================================

exports.getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ taskId })
      .populate("user", "username avatar title")
      .populate("mentions", "username")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text, taskType, parentCommentId, codeSnippet, mentions } = req.body;

    const newComment = await Comment.create({
      taskId,
      taskType,
      user: req.user._id,
      text,
      parentCommentId: parentCommentId || null,
      codeSnippet: codeSnippet || { code: "", language: "javascript" },
      mentions: mentions || []
    });

    await logActivity(taskId, taskType, req.user._id, "comment_added", { textSnippet: text.slice(0, 30) });

    const populatedComment = await Comment.findById(newComment._id)
      .populate("user", "username avatar title")
      .populate("mentions", "username");

    // Emit live socket event if RoomTask
    if (taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("comment-added", populatedComment);
        }
      }
    }

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // Only creator of comment or admin can delete
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this comment" });
    }

    await Comment.findByIdAndDelete(commentId);
    // Delete sub-replies
    await Comment.deleteMany({ parentCommentId: commentId });

    if (comment.taskType === "RoomTask") {
      const task = await RoomTask.findById(comment.taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("comment-deleted", { commentId, taskId: comment.taskId });
        }
      }
    }

    res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SESSION TIMER CONTROLLERS
// ==========================================

exports.startTimer = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { taskType } = req.body;

    const check = await checkPlannerTaskModifyPermission(taskId, taskType, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    // Check if user already has an active session running on ANY task
    const activeSession = await TimerSession.findOne({ user: req.user._id, isRunning: true });
    if (activeSession) {
      return res.status(400).json({
        success: false,
        message: "You already have an active timer running. Stop it before starting a new one."
      });
    }

    const session = await TimerSession.create({
      taskId,
      taskType,
      user: req.user._id,
      startTime: new Date(),
      isRunning: true
    });

    await logActivity(taskId, taskType, req.user._id, "timer_started");

    // Sockets emission
    if (taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("timer-update", {
            taskId,
            user: { _id: req.user._id, username: req.user.username },
            isRunning: true,
            startTime: session.startTime
          });
        }
      }
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.pauseTimer = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { taskType } = req.body;

    const check = await checkPlannerTaskModifyPermission(taskId, taskType, req.user);
    if (!check.allowed) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const session = await TimerSession.findOne({ taskId, user: req.user._id, isRunning: true });
    if (!session) {
      return res.status(404).json({ success: false, message: "No active timer session found for this task" });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - session.startTime) / 1000); // duration in seconds

    session.endTime = endTime;
    session.duration = duration;
    session.isRunning = false;
    await session.save();

    // Add spent time to the task model
    if (taskType === "PersonalTask") {
      await PersonalTask.findByIdAndUpdate(taskId, { $inc: { timeSpent: duration } });
    } else {
      await RoomTask.findByIdAndUpdate(taskId, { $inc: { timeSpent: duration } });
    }

    await logActivity(taskId, taskType, req.user._id, "timer_paused", { duration });

    if (taskType === "RoomTask") {
      const task = await RoomTask.findById(taskId);
      if (task) {
        const io = getPlannerIO(req);
        if (io) {
          io.of("/planner").to(task.roomId).emit("timer-update", {
            taskId,
            user: { _id: req.user._id, username: req.user.username },
            isRunning: false,
            duration
          });
        }
      }
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.stopTimer = async (req, res) => {
  // Aliased to pauseTimer
  return exports.pauseTimer(req, res);
};

exports.getTimerStatus = async (req, res) => {
  try {
    const active = await TimerSession.findOne({ user: req.user._id, isRunning: true })
      .populate("taskId");
    res.status(200).json({ success: true, activeTimer: active });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// DASHBOARDS & METRICS
// ==========================================

exports.getPersonalDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Today's boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Overdue cutoff
    const now = new Date();

    // 1. Fetch tasks
    const personalTasks = await PersonalTask.find({ user: userId });
    
    // Find rooms user is participant in to fetch assigned RoomTasks
    const userRooms = await Room.find({ "participants.user": userId });
    const roomIds = userRooms.map(r => r.roomId);
    
    const roomTasks = await RoomTask.find({
      roomId: { $in: roomIds },
      $or: [
        { assignedMembers: userId },
        { isAssignedToAll: true }
      ]
    }).populate("createdBy", "username");

    // Merge tasks for metrics
    const allPersonal = personalTasks.map(t => ({ ...t.toObject(), type: "personal" }));
    const allRoom = roomTasks.map(t => ({ ...t.toObject(), type: "room" }));
    const allTasks = [...allPersonal, ...allRoom];

    // Filter categories
    const todayTasks = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= startOfToday && d <= endOfToday && t.status !== "Completed";
    });

    const upcomingTasks = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d > endOfToday && t.status !== "Completed";
    });

    const overdueTasks = allTasks.filter(t => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d < startOfToday && t.status !== "Completed";
    });

    const recentlyCompleted = allTasks.filter(t => {
      if (t.status !== "Completed" || !t.updatedAt) return false;
      const d = new Date(t.updatedAt);
      return (now - d) < (3 * 24 * 60 * 60 * 1000); // last 3 days
    });

    // 2. Streaks calculation
    // Calculate how many consecutive days in the past the user completed at least 1 task or ran a timer
    const activityLogs = await TaskActivity.find({
      user: userId,
      action: { $in: ["completed", "timer_finished", "checklist_updated"] }
    }).sort({ createdAt: -1 });

    let streak = 0;
    const activeDays = new Set();
    activityLogs.forEach(log => {
      const dayStr = new Date(log.createdAt).toDateString();
      activeDays.add(dayStr);
    });

    let currentCheck = new Date();
    // Check if active today or yesterday
    const todayStr = currentCheck.toDateString();
    currentCheck.setDate(currentCheck.getDate() - 1);
    const yesterdayStr = currentCheck.toDateString();

    const hasActivityRecent = activeDays.has(todayStr) || activeDays.has(yesterdayStr);
    if (hasActivityRecent) {
      streak = activeDays.has(todayStr) ? 1 : 0;
      let checkDate = new Date();
      if (!activeDays.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = checkDate.toDateString();
        if (activeDays.has(checkStr)) {
          streak++;
        } else {
          break;
        }
      }
    }

    // 3. Running Timer Session
    const activeTimer = await TimerSession.findOne({ user: userId, isRunning: true });

    // 4. Progress Stats
    const completedTasksCount = allTasks.filter(t => t.status === "Completed").length;
    const completionPercent = allTasks.length > 0 ? Math.round((completedTasksCount / allTasks.length) * 100) : 0;

    // 5. Weekly progress heatmap data
    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      // Tasks completed on this specific day
      const completedOnDay = allTasks.filter(t => {
        if (t.status !== "Completed" || !t.updatedAt) return false;
        const compDate = new Date(t.updatedAt);
        return compDate >= dayStart && compDate <= dayEnd;
      }).length;

      // Timer session duration on this day
      const sessions = await TimerSession.find({
        user: userId,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      const dayTimeSpent = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

      weeklyProgress.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toLocaleDateString(),
        completedCount: completedOnDay,
        timeSpent: dayTimeSpent
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        todayTasks,
        upcomingTasks,
        overdueTasks,
        recentlyCompleted,
        streak: streak || 1, // Fallback to 1 if user just started
        completionPercent,
        totalTasks: allTasks.length,
        completedTasksCount,
        activeTimer,
        weeklyProgress
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRoomDashboard = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId }).populate("participants.user", "username avatar title");
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // 1. Fetch Room tasks
    const tasksQuery = { roomId };
    if (req.userRole === "MEMBER") {
      tasksQuery.$or = [
        { createdBy: req.user._id },
        { assignedMembers: req.user._id },
        { isAssignedToAll: true }
      ];
    }
    const tasks = await RoomTask.find(tasksQuery).populate("assignedMembers createdBy lastUpdatedBy", "username avatar");

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "Completed").length;
    const pending = tasks.filter(t => ["Todo", "Blocked"].includes(t.status)).length;
    const inProgress = tasks.filter(t => ["In Progress", "Review", "Testing"].includes(t.status)).length;
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 2. Active tasks list
    const activeTasks = tasks.filter(t => t.status !== "Completed");

    // 3. Recently updated (last 24 hours)
    const cutoff24h = new Date(Date.now() - (24 * 60 * 60 * 1000));
    const recentlyUpdated = tasks.filter(t => t.updatedAt >= cutoff24h);

    // 4. Room coding time (sum of all timer session durations)
    const timers = await TimerSession.find({ taskId: { $in: tasks.map(t => t._id) } });
    const totalCodingTime = timers.reduce((acc, t) => acc + (t.duration || 0), 0); // seconds

    // 5. Active running timers in the room right now
    const activeSessions = await TimerSession.find({
      taskId: { $in: tasks.map(t => t._id) },
      isRunning: true
    }).populate("user", "username avatar");

    // 6. User productivity index (completed tasks per member)
    const productivityByMember = room.participants.map(p => {
      const userTasks = tasks.filter(t => t.assignedMembers.some(m => m._id.toString() === p.user._id.toString()));
      const completedUserTasks = userTasks.filter(t => t.status === "Completed").length;
      return {
        user: p.user,
        role: p.role,
        assignedCount: userTasks.length,
        completedCount: completedUserTasks,
        productivity: userTasks.length > 0 ? Math.round((completedUserTasks / userTasks.length) * 100) : 0
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        activeTasksCount: inProgress,
        completionPercent,
        activeTasksList: activeTasks,
        recentlyUpdated,
        totalCodingTime,
        activeSessions,
        productivityByMember
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
