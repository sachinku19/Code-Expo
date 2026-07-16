import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, CheckSquare, Plus, Trash2, MessageSquare, Clock, Paperclip,
  Activity, Play, Pause, Square, Send, User, ChevronDown, Check, Smile, Code, Shield, Loader2
} from "lucide-react";
import {
  getTaskChecklist, addChecklistItem, updateChecklistItem, deleteChecklistItem,
  getTaskComments, addComment, deleteComment, startTimer, stopTimer
} from "../../services/plannerService";
import plannerSocket from "../../socket/plannerSocket";

export default function TaskDetailsModal({
  task,
  taskType, // "PersonalTask" | "RoomTask"
  roomId, // Room ID if RoomTask
  currentUser,
  roomParticipants = [], // list of room participants if RoomTask
  userRole = "MEMBER", // role of current user if RoomTask
  onClose,
  onUpdateTask,
  presenceList = []
}) {
  const [checklist, setChecklist] = useState({ items: [] });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLanguage, setCommentLanguage] = useState("javascript");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [commentCode, setCommentCode] = useState("");
  const [activities, setActivities] = useState([]);

  // Submissions loader states
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [checklistAdding, setChecklistAdding] = useState(false);
  const [togglingItems, setTogglingItems] = useState({}); // itemId -> boolean

  // Timer state
  const [timerSession, setTimerSession] = useState(null);
  const [localSeconds, setLocalSeconds] = useState(task.timeSpent || 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef(null);

  // Custom Dropdown Pickers state
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const statusRef = useRef(null);
  const priorityRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusRef.current && !statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target)) {
        setPriorityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Field locking presence
  const activeTaskPresence = presenceList.filter(
    p => p.taskId === task._id && String(p.userId) !== String(currentUser._id || currentUser.id)
  );

  const isOwnerOrMod = ["OWNER", "MODERATOR"].includes(userRole);
  const isCreator = task.createdBy && String(task.createdBy._id || task.createdBy) === String(currentUser?.id || currentUser?._id);
  const isAssigned = task.assignedMembers?.some(m => String(m._id || m) === String(currentUser?.id || currentUser?._id)) || task.isAssignedToAll;
  
  const canModifyDetails = isOwnerOrMod || taskType === "PersonalTask";
  const canModifyReport = isOwnerOrMod || (userRole === "MEMBER" && (isCreator || isAssigned)) || taskType === "PersonalTask";

  const isFieldLocked = (fieldName) => {
    return activeTaskPresence.find(p => p.field === fieldName && p.action === "editing");
  };

  // Focus reporting
  const handleFieldFocus = (fieldName) => {
    if (taskType === "RoomTask") {
      plannerSocket.emit("presence-status", {
        taskId: task._id,
        field: fieldName,
        action: "editing"
      });
    }
  };

  const handleFieldBlur = () => {
    if (taskType === "RoomTask") {
      plannerSocket.emit("presence-status", {
        taskId: task._id,
        field: "",
        action: "idle"
      });
    }
  };

  // 1. Fetch checklists & comments & activity timeline on load
  useEffect(() => {
    const fetchModalData = async () => {
      try {
        const checkRes = await getTaskChecklist(task._id);
        if (checkRes.success && checkRes.checklist) {
          setChecklist(checkRes.checklist);
        }
        
        const commRes = await getTaskComments(task._id);
        if (commRes.success) {
          setComments(commRes.comments);
        }

        // Active timer session check
        const activeTimers = localStorage.getItem(`timer_${task._id}`);
        if (activeTimers) {
          const startTime = new Date(activeTimers);
          const elapsed = Math.round((new Date() - startTime) / 1000);
          setLocalSeconds((task.timeSpent || 0) + elapsed);
          setTimerRunning(true);
        }
      } catch (e) {
        console.error("Error loading task details:", e);
      }
    };

    fetchModalData();

    // Socket listeners for live checklist / comments updates
    if (taskType === "RoomTask") {
      plannerSocket.off("checklist-update");
      plannerSocket.on("checklist-update", (data) => {
        if (data.taskId === task._id) {
          setChecklist(data.checklist);
        }
      });

      plannerSocket.off("comment-added");
      plannerSocket.on("comment-added", (comment) => {
        if (comment.taskId === task._id) {
          setComments(prev => {
            const getCommentId = (c) => String(c?._id || c?.id || "");
            const newId = getCommentId(comment);
            if (newId && prev.some(c => getCommentId(c) === newId)) return prev;
            return [...prev, comment];
          });
        }
      });

      plannerSocket.off("comment-deleted");
      plannerSocket.on("comment-deleted", (data) => {
        if (data.taskId === task._id) {
          setComments(prev => prev.filter(c => String(c._id || c.id) !== String(data.commentId)));
        }
      });
    }

    return () => {
      if (taskType === "RoomTask") {
        plannerSocket.off("checklist-update");
        plannerSocket.off("comment-added");
        plannerSocket.off("comment-deleted");
      }
      clearInterval(timerIntervalRef.current);
    };
  }, [task._id, taskType]);

  // 2. Timer runner local ticks
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setLocalSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  // Checklist Actions
  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim() || checklistAdding) return;
    setChecklistAdding(true);
    try {
      const res = await addChecklistItem(task._id, {
        title: newChecklistItem,
        taskType
      });
      if (res.success) {
        setChecklist(res.checklist);
        setNewChecklistItem("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecklistAdding(false);
    }
  };

  const handleToggleChecklistItem = async (itemId, currentCompleted) => {
    if (togglingItems[itemId]) return;
    setTogglingItems(prev => ({ ...prev, [itemId]: true }));
    try {
      const res = await updateChecklistItem(task._id, itemId, {
        isCompleted: !currentCompleted
      });
      if (res.success) {
        setChecklist(res.checklist);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingItems(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    try {
      const res = await deleteChecklistItem(task._id, itemId);
      if (res.success) {
        setChecklist(res.checklist);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Comments Actions
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || commentSubmitting) return;
    setCommentSubmitting(true);

    try {
      const payload = {
        text: newCommentText,
        taskType,
        codeSnippet: showCodeInput ? { code: commentCode, language: commentLanguage } : undefined
      };
      
      const res = await addComment(task._id, payload);
      if (res.success) {
        if (taskType === "PersonalTask") {
          setComments(prev => [...prev, res.comment]);
        }
        setNewCommentText("");
        setCommentCode("");
        setShowCodeInput(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await deleteComment(commentId);
      if (res.success) {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Timer Session Start / Stop
  const handleStartTimer = async () => {
    try {
      const res = await startTimer(task._id, taskType);
      if (res.success) {
        setTimerRunning(true);
        localStorage.setItem(`timer_${task._id}`, new Date().toISOString());
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleStopTimer = async () => {
    try {
      const res = await stopTimer(task._id, taskType);
      if (res.success) {
        setTimerRunning(false);
        localStorage.removeItem(`timer_${task._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Assignment & Metadata Updates (emitted back up to planner component)
  const handleUpdateStatus = (status) => {
    onUpdateTask(task._id, { status });
  };

  const handleUpdatePriority = (priority) => {
    onUpdateTask(task._id, { priority });
  };

  const handleAssignUser = (memberId) => {
    const isAssigned = task.assignedMembers?.some(m => (m._id || m) === memberId);
    let updatedList;
    if (isAssigned) {
      updatedList = task.assignedMembers.filter(m => (m._id || m) !== memberId).map(m => m._id || m);
    } else {
      updatedList = [...(task.assignedMembers || []).map(m => m._id || m), memberId];
    }
    onUpdateTask(task._id, { assignedMembers: JSON.stringify(updatedList) });
  };

  const handleToggleAssignAll = () => {
    onUpdateTask(task._id, { isAssignedToAll: !task.isAssignedToAll });
  };

  // Seconds formatting helper
  const formatTimerClock = (totalSec) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSec % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const statusOptions = taskType === "PersonalTask" 
    ? ["Todo", "In Progress", "Completed"]
    : ["Todo", "In Progress", "Review", "Testing", "Completed", "Blocked"];

  const getStatusColor = (status) => {
    switch (status) {
      case "Todo": return "#9ca3af";
      case "In Progress": return "#3b82f6";
      case "Review": return "#a855f7";
      case "Testing": return "#f97316";
      case "Completed": return "#22c55e";
      case "Blocked": return "#ef4444";
      default: return "#9ca3af";
    }
  };

  const priorityOptions = ["Low", "Medium", "High", "Critical"];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low": return "#3b82f6";
      case "Medium": return "#eab308";
      case "High": return "#f97316";
      case "Critical": return "#ef4444";
      default: return "#9ca3af";
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: "700", textTransform: "uppercase" }}>
              {taskType === "PersonalTask" ? `Personal Tasks / ${task.category}` : `Room Kanban / Board`}
            </span>
            <h2 className="modal-title-text">
              {task.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Presence notification banner if a peer is editing */}
        {activeTaskPresence.length > 0 && (
          <div style={{ padding: "0 24px", marginTop: "12px" }}>
            {activeTaskPresence.map((p, idx) => (
              <div key={idx} className="presence-banner">
                <span className="presence-dot" />
                <span>🟢 <strong>@{p.username}</strong> is currently {p.action} the {p.field || "task"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Body split */}
        <div className="modal-body">
          
          {/* Main column */}
          <div className="modal-main-col">
            
            {/* Description details */}
            <div>
              <h3 className="modal-section-title">Description</h3>
              {isFieldLocked("description") ? (
                <div style={{ padding: "8px 12px", border: "1px dashed rgba(239, 68, 68, 0.2)", borderRadius: "8px", background: "rgba(255,255,255,0.02)", color: "#9ca3af", fontSize: "0.875rem" }}>
                  Locked by {isFieldLocked("description").username}...
                </div>
              ) : (
                <textarea
                  className="tp-textarea"
                  style={{ width: "100%", minHeight: "80px", background: "rgba(255,255,255,0.02)" }}
                  value={task.description}
                  onChange={(e) => onUpdateTask(task._id, { description: e.target.value })}
                  onFocus={() => handleFieldFocus("description")}
                  onBlur={handleFieldBlur}
                  placeholder="Add a detailed description for this task..."
                  disabled={!canModifyDetails}
                />
              )}
            </div>

            {/* Checklist */}
            <div className="checklist-wrapper">
              <h3 className="modal-section-title">Checklist / Subtasks</h3>
              
              {/* Progress visual bar */}
              <div className="checklist-progress-bar-container">
                <div
                  className="checklist-progress-fill"
                  style={{
                    width: `${
                      checklist.items?.length > 0
                        ? Math.round((checklist.items.filter(i => i.isCompleted).length / checklist.items.length) * 100)
                        : 0
                    }%`
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {checklist.items?.map((item) => (
                  <div key={item._id} className="checklist-item">
                    <div className="checklist-item-left">
                      <button
                        className={`task-checkbox-btn ${item.isCompleted ? "completed" : ""}`}
                        onClick={() => canModifyReport && !togglingItems[item._id] && handleToggleChecklistItem(item._id, item.isCompleted)}
                        style={{ width: "16px", height: "16px", cursor: canModifyReport && !togglingItems[item._id] ? "pointer" : "default" }}
                        disabled={togglingItems[item._id]}
                      >
                        {togglingItems[item._id] ? (
                          <Loader2 size={10} className="animate-spin" style={{ color: "var(--tp-accent)" }} />
                        ) : (
                          item.isCompleted && <Check size={10} style={{ color: "#fff" }} />
                        )}
                      </button>
                      <span className={`checklist-item-input ${item.isCompleted ? "completed" : ""}`}>
                        {item.title}
                      </span>
                    </div>
                    
                    {/* Delete item button */}
                    {canModifyReport && (
                      <button
                        onClick={() => handleDeleteChecklistItem(item._id)}
                        style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add checklist input */}
              {canModifyReport && (
                <form onSubmit={handleAddChecklistItem} style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="tp-input"
                    style={{ flexGrow: 1, padding: "6px 12px", fontSize: "0.8rem" }}
                    placeholder="Add subtask item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                  />
                  <button type="submit" className="tp-btn-primary" style={{ padding: "6px 12px" }} disabled={checklistAdding}>
                    {checklistAdding ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Comments Threaded */}
            <div className="comments-section">
              <h3 className="modal-section-title">Comments & Activity Discussion</h3>
              
              <div className="comments-list">
                {comments.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "10px 0", textAlign: "center" }}>No comments yet. Start the conversation!</div>
                ) : (
                  comments.map((comm) => (
                    <div key={comm._id} className="comment-item">
                      <div className="comment-bubble">
                        <div className="comment-bubble-header">
                          <span className="commenter-name">@{comm.user?.username || "user"}</span>
                          <span className="comment-time">
                            {new Date(comm.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 6px 0", fontSize: "0.85rem" }}>{comm.text}</p>
                        
                        {comm.codeSnippet?.code && (
                          <pre style={{ background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "monospace", overflowX: "auto" }}>
                            <code>{comm.codeSnippet.code}</code>
                          </pre>
                        )}

                        {/* Trash */}
                        {String(comm.user?._id || comm.user) === String(currentUser._id || currentUser.id) && (
                          <button
                            onClick={() => handleDeleteComment(comm._id)}
                            style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", float: "right", marginTop: "-20px" }}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment submission form */}
              <form onSubmit={handleAddComment} className="comment-input-box">
                <textarea
                  placeholder="Post comment... use @mention or add snippet"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  style={{ minHeight: "50px" }}
                />

                {showCodeInput && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                    <select
                      className="tp-select"
                      style={{ alignSelf: "flex-start", padding: "4px 8px" }}
                      value={commentLanguage}
                      onChange={(e) => setCommentLanguage(e.target.value)}
                    >
                      <option value="javascript">Javascript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="html">HTML/CSS</option>
                    </select>
                    <textarea
                      placeholder="Paste code snippet here..."
                      value={commentCode}
                      onChange={(e) => setCommentCode(e.target.value)}
                      style={{ fontFamily: "monospace", fontSize: "0.75rem", minHeight: "80px" }}
                    />
                  </div>
                )}

                <div className="comment-toolbar">
                  <div className="comment-actions">
                    <button
                      type="button"
                      className={`comment-tool-btn ${showCodeInput ? "active" : ""}`}
                      onClick={() => setShowCodeInput(!showCodeInput)}
                      title="Attach code snippet"
                    >
                      <Code size={14} />
                    </button>
                  </div>
                  
                  <button type="submit" className="tp-btn-primary" style={{ padding: "6px 12px", fontSize: "0.75rem" }} disabled={commentSubmitting}>
                    {commentSubmitting ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>
          {/* Sidebar col */}
          <div className="modal-side-col">
            
            {/* Status Option */}
            <div className="tp-form-group" ref={statusRef} style={{ position: "relative" }}>
              <label>Status</label>
              <button
                type="button"
                className={`custom-select-trigger ${!canModifyReport ? "disabled" : ""}`}
                onClick={() => canModifyReport && setStatusOpen(!statusOpen)}
                disabled={!canModifyReport}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="status-dot" style={{ backgroundColor: getStatusColor(task.status) }} />
                  <span>{task.status}</span>
                </div>
                <ChevronDown size={14} />
              </button>
              {statusOpen && (
                <div className="custom-select-options">
                  {statusOptions.map((opt) => (
                    <div
                      key={opt}
                      className={`custom-select-opt ${task.status === opt ? "selected" : ""}`}
                      onClick={() => {
                        handleUpdateStatus(opt);
                        setStatusOpen(false);
                      }}
                    >
                      <span className="status-dot" style={{ backgroundColor: getStatusColor(opt) }} />
                      <span>{opt}</span>
                      {task.status === opt && <Check size={12} style={{ marginLeft: "auto", color: "var(--tp-accent)" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Option */}
            <div className="tp-form-group" ref={priorityRef} style={{ position: "relative" }}>
              <label>Priority</label>
              <button
                type="button"
                className={`custom-select-trigger ${!canModifyDetails ? "disabled" : ""}`}
                onClick={() => canModifyDetails && setPriorityOpen(!priorityOpen)}
                disabled={!canModifyDetails}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`priority-badge ${task.priority?.toLowerCase() || "medium"}`} style={{ border: "none", padding: "1px 6px" }}>
                    {task.priority || "Medium"}
                  </span>
                </div>
                <ChevronDown size={14} />
              </button>
              {priorityOpen && (
                <div className="custom-select-options">
                  {priorityOptions.map((opt) => (
                    <div
                      key={opt}
                      className={`custom-select-opt ${task.priority === opt ? "selected" : ""}`}
                      onClick={() => {
                        handleUpdatePriority(opt);
                        setPriorityOpen(false);
                      }}
                    >
                      <span className={`priority-badge ${opt.toLowerCase()}`} style={{ border: "none" }}>
                        {opt}
                      </span>
                      {task.priority === opt && <Check size={12} style={{ marginLeft: "auto", color: "var(--tp-accent)" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time session Timer */}
            <div className="tp-form-group">
              <label>Session Tracker</label>
              <div className="timer-container">
                <div className="timer-clock">
                  {formatTimerClock(localSeconds)}
                </div>
                <div className="timer-btn-group">
                  {!timerRunning ? (
                    <button
                      className="timer-btn start"
                      onClick={handleStartTimer}
                      title="Start Session Timer"
                      disabled={!canModifyReport}
                    >
                      <Play size={14} fill="#22c55e" />
                    </button>
                  ) : (
                    <>
                      <button
                        className="timer-btn pause"
                        onClick={handleStopTimer}
                        title="Pause Session Timer"
                        disabled={!canModifyReport}
                      >
                        <Pause size={14} fill="#fde047" />
                      </button>
                      <button
                        className="timer-btn stop"
                        onClick={handleStopTimer}
                        title="Stop Timer & Log"
                        disabled={!canModifyReport}
                      >
                        <Square size={14} fill="#fca5a5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--tp-text-muted)", marginTop: "4px" }}>
                Total cumulative logged: <strong>{formatTimerClock(task.timeSpent || 0)}</strong>
              </span>
            </div>

            {/* Assigned Users list (Room only) */}
            {taskType === "RoomTask" && (
              <div className="tp-form-group">
                <label>Assigned Members</label>
                {!isOwnerOrMod && (
                  <div style={{ fontSize: "0.7rem", color: "var(--tp-text-muted)", fontStyle: "italic", marginBottom: "8px" }}>
                    Only Room Administrators (Owner/Moderator) can modify assignments.
                  </div>
                )}
                
                {/* Toggle assign all */}
                {isOwnerOrMod && (
                  <button
                    type="button"
                    onClick={handleToggleAssignAll}
                    className="assign-all-btn"
                  >
                    🚀 {task.isAssignedToAll ? "All Room Members Assigned" : "Assign Entire Room"}
                  </button>
                )}
 
                <div className="assigned-members-selector-list">
                  {roomParticipants.map((p) => {
                    const isAssigned = task.assignedMembers?.some(m => String(m._id || m) === String(p.user?._id));
                    return (
                      <div
                        key={p.user?._id}
                        onClick={() => isOwnerOrMod && handleAssignUser(p.user?._id)}
                        className={`member-assignee-row ${isAssigned ? "assigned" : ""}`}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {p.user?.avatar ? (
                            <img src={p.user.avatar} className="member-assignee-avatar" alt="" />
                          ) : (
                            <div className="member-assignee-fallback">
                              {p.user?.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>@{p.user?.username}</span>
                        </div>
                        {isAssigned && <Check size={12} style={{ color: "var(--tp-accent)" }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attachments List */}
            <div className="tp-form-group">
              <label>Attachments ({task.attachments?.length || 0})</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.72rem" }}>
                {task.attachments?.map((att, index) => (
                  <a
                    key={index}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#818cf8",
                      textDecoration: "underline",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <Paperclip size={10} />
                    {att.originalFilename || `file_${index + 1}`}
                  </a>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
