import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FolderKanban, ClipboardList, LayoutDashboard, Search, Filter, ArrowUpDown,
  Plus, Check, X, Calendar, AlertCircle, Play, ShieldAlert, Award, Loader2,
  NotebookPen, ChevronDown, DoorOpen
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getPersonalTasks, createPersonalTask, updatePersonalTask, deletePersonalTask,
  getRoomTasks, createRoomTask, updateRoomTask, deleteRoomTask,
  getPersonalDashboard, getRoomDashboard
} from "../../services/plannerService";
import { getUserRoomsHistory } from "../../services/roomService";
import plannerSocket from "../../socket/plannerSocket";
import PersonalDashboard from "./PersonalDashboard";
import RoomDashboard from "./RoomDashboard";
import KanbanBoard from "./KanbanBoard";
import TaskDetailsModal from "./TaskDetailsModal";
import "./TaskPlanner.css";

export default function TaskPlanner({ roomId: editorRoomId }) {
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  // Tab management: "personal_dashboard" | "personal_tasks" | "room_dashboard" | "room_board"
  const [activeTab, setActiveTab] = useState(editorRoomId ? "room_board" : "personal_dashboard");
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [personalStats, setPersonalStats] = useState(null);
  const [roomStats, setRoomStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [myRooms, setMyRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(editorRoomId || "");
  const [roomDetails, setRoomDetails] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState("MEMBER");
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);

  // Selected task details overlay
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskCreating, setTaskCreating] = useState(false);

  // Search/Filter/Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  // Presence state from socket namespace
  const [presenceList, setPresenceList] = useState([]);

  // Create Task Form States
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPriority, setFormPriority] = useState("Medium");
  const [formCategory, setFormCategory] = useState("Coding");
  const [formDueDate, setFormDueDate] = useState("");
  const [formReminder, setFormReminder] = useState("");
  const [formEstTime, setFormEstTime] = useState(0);
  const [formColorLabel, setFormColorLabel] = useState("#3b82f6");
  const [formTags, setFormTags] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formRecurring, setFormRecurring] = useState("None");
  const [formAssigned, setFormAssigned] = useState([]);
  const [formIsAssignedToAll, setFormIsAssignedToAll] = useState(false);
  const [formLabels, setFormLabels] = useState("");
  const [formFiles, setFormFiles] = useState([]);

  // Socket sync channel reference
  const currentChannelRef = useRef(null);

  const currentUserRoleRef = useRef(currentUserRole);
  useEffect(() => {
    currentUserRoleRef.current = currentUserRole;
  }, [currentUserRole]);

  // 1. Fetch user's room list for selector
  useEffect(() => {
    if (!editorRoomId) {
      getUserRoomsHistory()
        .then((res) => {
          if (res?.success && res.rooms) {
            setMyRooms(res.rooms);
            if (res.rooms.length > 0) {
              setSelectedRoomId(res.rooms[0].roomId);
            }
          }
        })
        .catch(console.error);
    }
  }, [editorRoomId]);

  // 2. Fetch data depending on active tab
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const isPersonal = activeTab.startsWith("personal");
      
      if (isPersonal) {
        if (activeTab === "personal_dashboard") {
          const res = await getPersonalDashboard();
          if (res.success) setPersonalStats(res.stats);
        } else {
          // fetch list with active filters
          const res = await getPersonalTasks({
            search: searchQuery,
            priority: filterPriority,
            status: filterStatus,
            category: filterCategory,
            sort: sortOption
          });
          if (res.success) setTasks(res.tasks);
        }
      } else {
        // Room based tabs
        const currentRoom = editorRoomId || selectedRoomId;
        if (!currentRoom) {
          if (!silent) setIsLoading(false);
          return;
        }

        // Fetch room info to get participants and current role
        const roomsHistory = await getUserRoomsHistory();
        const activeRoom = roomsHistory.rooms?.find(r => r.roomId === currentRoom);
        if (activeRoom) {
          setRoomDetails(activeRoom);
          const p = activeRoom.participants?.find(part => String(part.user?._id || part.user) === String(userId));
          setCurrentUserRole(p?.role || "MEMBER");
        }

        if (activeTab === "room_dashboard") {
          const res = await getRoomDashboard(currentRoom);
          if (res.success) setRoomStats(res.stats);
        } else {
          const res = await getRoomTasks(currentRoom, {
            search: searchQuery,
            priority: filterPriority,
            status: filterStatus,
            sort: sortOption
          });
          if (res.success) setTasks(res.tasks);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeTab, selectedRoomId, editorRoomId, searchQuery, filterPriority, filterStatus, filterCategory, sortOption, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 3. Socket Namespace Connection & Room Join Sync
  useEffect(() => {
    plannerSocket.connect();

    const currentRoom = activeTab.startsWith("room") ? (editorRoomId || selectedRoomId) : `personal_${userId}`;
    
    if (currentRoom) {
      // Leave previous channel
      if (currentChannelRef.current && currentChannelRef.current !== currentRoom) {
        plannerSocket.emit("leave-room");
      }

      // Join new channel
      plannerSocket.emit("join-room", {
        roomId: currentRoom,
        userId,
        username: user?.username || "user"
      });
      currentChannelRef.current = currentRoom;
    }

    // Socket Event listeners
    plannerSocket.off("presence-list");
    plannerSocket.on("presence-list", (list) => {
      setPresenceList(list);
    });

    plannerSocket.off("task-created");
    plannerSocket.on("task-created", (newTask) => {
      if (currentUserRoleRef.current === "MEMBER") {
        const creatorId = newTask.createdBy?._id || newTask.createdBy;
        const isCreator = String(creatorId) === String(userId);
        const isAssigned = newTask.assignedMembers?.some(m => String(m._id || m) === String(userId)) || newTask.isAssignedToAll;
        if (!isCreator && !isAssigned) return;
      }
      setTasks((prev) => {
        const getTaskId = (t) => String(t?._id || t?.id || "");
        const newId = getTaskId(newTask);
        if (newId && prev.some(t => getTaskId(t) === newId)) return prev;
        return [newTask, ...prev];
      });
      fetchData(true);
    });

    plannerSocket.off("task-updated");
    plannerSocket.on("task-updated", (updatedTask) => {
      if (currentUserRoleRef.current === "MEMBER") {
        const creatorId = updatedTask.createdBy?._id || updatedTask.createdBy;
        const isCreator = String(creatorId) === String(userId);
        const isAssigned = updatedTask.assignedMembers?.some(m => String(m._id || m) === String(userId)) || updatedTask.isAssignedToAll;
        if (!isCreator && !isAssigned) {
          setTasks((prev) => prev.filter((t) => t._id !== updatedTask._id));
          setSelectedTask((curr) => (curr && curr._id === updatedTask._id ? null : curr));
          return;
        }
      }
      setTasks((prev) => prev.map((t) => (t._id === updatedTask._id ? updatedTask : t)));
      setSelectedTask((curr) => (curr && curr._id === updatedTask._id ? updatedTask : curr));
      fetchData(true);
    });

    plannerSocket.off("task-deleted");
    plannerSocket.on("task-deleted", ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask((curr) => (curr && curr._id === taskId ? null : curr));
      fetchData(true);
    });

    return () => {
      plannerSocket.off("presence-list");
      plannerSocket.off("task-created");
      plannerSocket.off("task-updated");
      plannerSocket.off("task-deleted");
      plannerSocket.emit("leave-room");
      plannerSocket.disconnect();
    };
  }, [activeTab, selectedRoomId, editorRoomId, userId, user?.username, fetchData]);

  // 4. Update status with Optimistic UI updates
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const targetTask = tasks.find(t => t._id === taskId);
    const isPersonal = targetTask 
      ? (targetTask.type === "personal" || (!targetTask.roomId && targetTask.type !== "room"))
      : activeTab.startsWith("personal");

    // 1. Optimistic Update in State
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    try {
      if (isPersonal) {
        await updatePersonalTask(taskId, { status: newStatus });
      } else {
        const taskRoomId = targetTask?.roomId || editorRoomId || selectedRoomId;
        await updateRoomTask(taskRoomId, taskId, { status: newStatus });
      }
      fetchData(true);
    } catch (error) {
      // Revert on error
      setTasks(previousTasks);
      alert(error.response?.data?.message || "Failed to update task status");
    }
  };

  // 5. General Task details modification in modal
  const handleUpdateTaskDetails = async (taskId, updatedFields) => {
    try {
      const isPersonal = selectedTask?.type === "personal" || (!selectedTask?.roomId && selectedTask?.type !== "room");
      if (isPersonal) {
        const res = await updatePersonalTask(taskId, updatedFields);
        if (res.success) {
          setTasks(prev => prev.map(t => t._id === taskId ? res.task : t));
          setSelectedTask(res.task);
          fetchData(true);
        }
      } else {
        const taskRoomId = selectedTask?.roomId || editorRoomId || selectedRoomId;
        const res = await updateRoomTask(taskRoomId, taskId, updatedFields);
        if (res.success) {
          setTasks(prev => prev.map(t => t._id === taskId ? res.task : t));
          setSelectedTask(res.task);
          fetchData(true);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 6. Create Task Form submit
  const handleCreateTaskSubmit = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || taskCreating) return;
    setTaskCreating(true);

    try {
      const formData = new FormData();
      formData.append("title", formTitle);
      formData.append("description", formDesc);
      formData.append("priority", formPriority);
      formData.append("dueDate", formDueDate);
      formData.append("estimatedTime", formEstTime);

      formFiles.forEach(file => {
        formData.append("attachments", file);
      });

      const isPersonal = activeTab.startsWith("personal");
      if (isPersonal) {
        formData.append("category", formCategory);
        formData.append("reminder", formReminder);
        formData.append("colorLabel", formColorLabel);
        formData.append("notes", formNotes);
        formData.append("recurring", formRecurring);
        
        const tagsArr = formTags ? formTags.split(",").map(t => t.trim()) : [];
        formData.append("tags", JSON.stringify(tagsArr));

        const res = await createPersonalTask(formData);
        if (res.success) {
          setTasks(prev => [res.task, ...prev]);
          setShowCreateModal(false);
          resetCreateForm();
          fetchData(true);
        }
      } else {
        // Room Board tasks creation
        const currentRoom = editorRoomId || selectedRoomId;
        formData.append("isAssignedToAll", formIsAssignedToAll);
        
        const labelsArr = formLabels ? formLabels.split(",").map(l => l.trim()) : [];
        formData.append("labels", JSON.stringify(labelsArr));
        formData.append("assignedMembers", JSON.stringify(formAssigned));

        const res = await createRoomTask(currentRoom, formData);
        if (res.success) {
          // Do not append locally; the socket broadcast 'task-created' handles it
          setShowCreateModal(false);
          resetCreateForm();
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setTaskCreating(false);
    }
  };

  const resetCreateForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormPriority("Medium");
    setFormCategory("Coding");
    setFormDueDate("");
    setFormReminder("");
    setFormEstTime(0);
    setFormColorLabel("#3b82f6");
    setFormTags("");
    setFormNotes("");
    setFormRecurring("None");
    setFormAssigned([]);
    setFormIsAssignedToAll(false);
    setFormLabels("");
    setFormFiles([]);
  };

  const renderFiltersBar = (tabType) => (
    <div className="planner-header-filters" style={{ width: "100%", marginBottom: "16px" }}>
      <div className="search-input-wrapper">
        <Search size={14} className="search-icon-inside" />
        <input
          type="text"
          placeholder="Search by task title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-sort-group">
        <select className="tp-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">Priority: All</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        <select className="tp-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Status: All</option>
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          {tabType === "room" && (
            <>
              <option value="Review">Review</option>
              <option value="Testing">Testing</option>
              <option value="Blocked">Blocked</option>
            </>
          )}
          <option value="Completed">Completed</option>
        </select>

        {tabType === "personal" && (
          <select className="tp-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Category: All</option>
            <option value="Study">Study</option>
            <option value="Coding">Coding</option>
            <option value="Personal">Personal</option>
            <option value="College">College</option>
            <option value="Placement">Placement</option>
            <option value="Interview">Interview</option>
            <option value="Other">Other</option>
          </select>
        )}

        <select className="tp-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="priority">Priority level</option>
          <option value="deadline">Due date</option>
          {tabType === "personal" && <option value="progress">Completion %</option>}
        </select>
      </div>
    </div>
  );

  const isRoomTask = selectedTask?.type === "room" || !!selectedTask?.roomId;
  const selectedTaskType = isRoomTask ? "RoomTask" : "PersonalTask";
  const selectedTaskRoomId = selectedTask?.roomId || editorRoomId || selectedRoomId;
  const selectedTaskRoomDetails = isRoomTask && myRooms.find(r => r.roomId === selectedTask?.roomId);
  const selectedTaskRoomParticipants = selectedTaskRoomDetails ? (selectedTaskRoomDetails.participants || []) : (roomDetails?.participants || []);
  const selectedTaskUserRole = selectedTaskRoomDetails
    ? (selectedTaskRoomDetails.participants?.find(p => String(p.user?._id || p.user) === String(userId))?.role || "MEMBER")
    : currentUserRole;

  return (
    <div className="task-planner-wrapper">
      
      {/* Header and Switcher tabs */}
      <div className="planner-header">
        <div className="planner-title-group">
          <h1>
            <NotebookPen size={22} className="planner-title-icon" style={{ verticalAlign: "middle", marginRight: "10px", color: "var(--tp-accent)" }} />
            Task Planner
          </h1>

          {/* Room Selector Dropdown when outside editor */}
          {!editorRoomId && (activeTab === "room_board" || activeTab === "room_dashboard") && myRooms.length > 0 && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <button
                className="custom-select-trigger room-select-dropdown"
                onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  background: "var(--tp-card-bg)",
                  border: "1.5px solid var(--tp-accent)",
                  color: "var(--tp-text-primary)",
                  cursor: "pointer",
                  fontSize: "0.825rem",
                  transition: "all 0.2s ease"
                }}
              >
                <DoorOpen size={15} style={{ color: "var(--tp-accent)" }} />
                <span>{myRooms.find(r => r.roomId === selectedRoomId)?.roomName || selectedRoomId}</span>
                <ChevronDown size={14} style={{ opacity: 0.6 }} />
              </button>

              {showRoomDropdown && (
                <>
                  <div
                    style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                    onClick={() => setShowRoomDropdown(false)}
                  />
                  <div
                    className="room-dropdown-menu fade-in-up"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      zIndex: 999,
                      background: "var(--tp-card-bg)",
                      border: "1px solid var(--tp-border)",
                      borderRadius: "8px",
                      boxShadow: "var(--tp-shadow)",
                      minWidth: "220px",
                      padding: "4px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px"
                    }}
                  >
                    {myRooms.map(room => {
                      const isSelected = room.roomId === selectedRoomId;
                      return (
                        <button
                          key={room.roomId}
                          onClick={() => {
                            setSelectedRoomId(room.roomId);
                            setShowRoomDropdown(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: isSelected ? "rgba(99, 102, 241, 0.08)" : "transparent",
                            color: isSelected ? "var(--tp-accent)" : "var(--tp-text-primary)",
                            fontWeight: isSelected ? "700" : "500",
                            textAlign: "left",
                            cursor: "pointer",
                            fontSize: "0.825rem",
                            transition: "all 0.15s ease"
                          }}
                          className="room-dropdown-item"
                        >
                          <DoorOpen size={14} style={{ opacity: isSelected ? 1 : 0.6, color: isSelected ? "var(--tp-accent)" : "inherit" }} />
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flexGrow: 1 }}>
                            {room.roomName || room.roomId}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Tab switcher & Create Task button */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {!editorRoomId && (
            <div className="planner-tabs">
              <button
                className={`planner-tab-btn ${activeTab === "personal_dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("personal_dashboard")}
              >
                <LayoutDashboard size={14} />
                <span>Personal Dashboard</span>
              </button>
              <button
                className={`planner-tab-btn ${activeTab === "personal_tasks" ? "active" : ""}`}
                onClick={() => setActiveTab("personal_tasks")}
              >
                <ClipboardList size={14} />
                <span>Personal Agenda</span>
              </button>
              <button
                className={`planner-tab-btn ${activeTab === "room_dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("room_dashboard")}
              >
                <LayoutDashboard size={14} />
                <span>Room Metrics</span>
              </button>
              <button
                className={`planner-tab-btn ${activeTab === "room_board" ? "active" : ""}`}
                onClick={() => setActiveTab("room_board")}
              >
                <FolderKanban size={14} />
                <span>Room Board</span>
              </button>
            </div>
          )}

          {/* Create Task button */}
          <button className="tp-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Loading Progress Bar Spacer Container */}
      <div style={{ height: "3px", width: "100%", overflow: "hidden", position: "relative", marginBottom: "12px", borderRadius: "2px" }}>
        {isLoading && !isInitialLoad && (
          <div style={{
            width: "100%",
            height: "100%",
            background: "var(--tp-accent, #6366f1)",
            position: "relative",
            overflow: "hidden"
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              animation: "ce-loading-bar 1.2s infinite linear"
            }} />
          </div>
        )}
      </div>

      {/* Main Body Switcher */}
      <div style={{ flexGrow: 1, minHeight: 0, position: "relative" }}>

        {isLoading && isInitialLoad ? (
          <div className="ce-roller-container">
            <div className="ce-roller">
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-secondary)" }}>
              Initializing Task Planner...
            </span>
          </div>
        ) : (
          <>
            {activeTab === "personal_dashboard" && (
              <div className="fade-in-up">
                {!personalStats ? (
                  <div className="ce-roller-container" style={{ padding: "40px 20px" }}>
                    <div className="ce-roller">
                      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-secondary)" }}>
                      Loading Personal Dashboard...
                    </span>
                  </div>
                ) : (
                  <PersonalDashboard
                    stats={personalStats}
                    onSelectTask={setSelectedTask}
                    activeTabChange={setActiveTab}
                  />
                )}
              </div>
            )}

            {activeTab === "room_dashboard" && (
              <div className="fade-in-up">
                {!roomStats ? (
                  <div className="ce-roller-container" style={{ padding: "40px 20px" }}>
                    <div className="ce-roller">
                      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-secondary)" }}>
                      Loading Room Metrics...
                    </span>
                  </div>
                ) : (
                  <RoomDashboard
                    stats={roomStats}
                    onSelectTask={setSelectedTask}
                    currentUser={user}
                  />
                )}
              </div>
            )}

            {activeTab === "personal_tasks" && (
              <div className="personal-tasks-list fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {renderFiltersBar("personal")}
                {isLoading && tasks.length === 0 ? (
                  <div className="ce-roller-container" style={{ padding: "40px 20px" }}>
                    <div className="ce-roller">
                      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-secondary)" }}>
                      Loading Personal Agenda...
                    </span>
                  </div>
                ) : tasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                    No tasks found matching your filters.
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task._id}
                      className="task-row"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="task-row-left">
                        <button
                          className={`task-checkbox-btn ${task.status === "Completed" ? "completed" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateTaskStatus(task._id, task.status === "Completed" ? "Todo" : "Completed");
                          }}
                        >
                          {task.status === "Completed" && <Check size={12} style={{ color: "#fff" }} />}
                        </button>
                        
                        <div className="task-row-details">
                          <h3 className={task.status === "Completed" ? "completed" : ""}>{task.title}</h3>
                          <div className="task-row-meta">
                            <span style={{ color: formColorLabel }}>🏷️ {task.category}</span>
                            {task.dueDate && (
                              <span>📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                            )}
                            {task.recurring !== "None" && (
                              <span style={{ color: "#818cf8" }}>🔄 {task.recurring}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="task-row-right">
                        <span style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: task.priority === "Critical" ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
                          color: task.priority === "Critical" ? "#fca5a5" : "#d1d5db"
                        }}>
                          {task.priority}
                        </span>
                        
                        <span style={{ fontSize: "0.8rem", color: "#818cf8", fontWeight: "700" }}>{task.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "room_board" && (
              <div className="fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                {renderFiltersBar("room")}
                {isLoading && tasks.length === 0 ? (
                  <div className="ce-roller-container" style={{ padding: "40px 20px" }}>
                    <div className="ce-roller">
                      <div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-secondary)" }}>
                      Loading Room Board...
                    </span>
                  </div>
                ) : (
                  <KanbanBoard
                    tasks={tasks}
                    currentUser={user}
                    userRole={currentUserRole}
                    presenceList={presenceList}
                    onSelectTask={setSelectedTask}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onOpenCreateTaskModal={() => setShowCreateModal(true)}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Details Modal overlay */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          taskType={selectedTaskType}
          roomId={selectedTaskRoomId}
          currentUser={user}
          roomParticipants={selectedTaskRoomParticipants}
          userRole={selectedTaskUserRole}
          onClose={() => setSelectedTask(null)}
          onUpdateTask={handleUpdateTaskDetails}
          presenceList={presenceList}
          onRefresh={() => fetchData(true)}
        />
      )}

      {/* Create Task Modal Overlay */}
      {showCreateModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-card" style={{ maxWidth: "550px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--tp-text-primary)", margin: 0 }}>
                {activeTab.startsWith("personal") ? "New Personal Task" : "New Room Kanban Task"}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="tp-form" style={{ padding: "20px" }}>
              <div className="tp-form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  required
                  className="tp-input"
                  placeholder="Enter task title..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="tp-form-group">
                <label>Description</label>
                <textarea
                  className="tp-input"
                  placeholder="Enter detailed description..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ minHeight: "60px" }}
                />
              </div>

              <div className="tp-row-split">
                <div className="tp-form-group">
                  <label>Priority</label>
                  <select className="tp-select" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {activeTab.startsWith("personal") ? (
                  <div className="tp-form-group">
                    <label>Category</label>
                    <select className="tp-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                      <option value="Study">Study</option>
                      <option value="Coding">Coding</option>
                      <option value="Personal">Personal</option>
                      <option value="College">College</option>
                      <option value="Placement">Placement</option>
                      <option value="Interview">Interview</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                ) : (
                  <div className="tp-form-group">
                    <label>Labels / Tags (comma separated)</label>
                    <input
                      type="text"
                      className="tp-input"
                      placeholder="frontend, bug, docs"
                      value={formLabels}
                      onChange={(e) => setFormLabels(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="tp-row-split">
                <div className="tp-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="tp-input"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                  />
                </div>

                <div className="tp-form-group">
                  <label>Estimated Time (Hours)</label>
                  <input
                    type="number"
                    className="tp-input"
                    value={formEstTime}
                    onChange={(e) => setFormEstTime(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {activeTab.startsWith("personal") && (
                <div className="tp-row-split">
                  <div className="tp-form-group">
                    <label>Reminder</label>
                    <input
                      type="datetime-local"
                      className="tp-input"
                      value={formReminder}
                      onChange={(e) => setFormReminder(e.target.value)}
                    />
                  </div>

                  <div className="tp-form-group">
                    <label>Recurring</label>
                    <select className="tp-select" value={formRecurring} onChange={(e) => setFormRecurring(e.target.value)}>
                      <option value="None">None</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Room assignments multi-select (Room board tasks only) */}
              {!activeTab.startsWith("personal") && (
                <div className="tp-form-group">
                  <label>Assign to Members</label>
                  {["OWNER", "MODERATOR"].includes(currentUserRole) ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", maxHeight: "100px", overflowY: "auto", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                       {roomDetails?.participants?.map(p => {
                        const isSelected = formAssigned.includes(p.user?._id);
                        return (
                          <button
                            key={p.user?._id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFormAssigned(prev => prev.filter(id => id !== p.user?._id));
                              } else {
                                setFormAssigned(prev => [...prev, p.user?._id]);
                              }
                            }}
                            style={{
                              background: isSelected ? "rgba(99, 102, 241, 0.25)" : "rgba(255,255,255,0.05)",
                              border: `1px solid ${isSelected ? "#6366f1" : "var(--tp-glass-border)"}`,
                              color: isSelected ? "#fff" : "#9ca3af",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              cursor: "pointer"
                            }}
                          >
                            @{p.user?.username}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic", background: "rgba(0,0,0,0.1)", padding: "8px", borderRadius: "6px" }}>
                      Only Room Administrators (Owner or Moderator) can assign members to tasks.
                    </div>
                  )}
                </div>
              )}

              {/* File Upload attachments */}
              <div className="tp-form-group">
                <label>Attachments (Optional)</label>
                <input
                  type="file"
                  multiple
                  className="tp-input"
                  onChange={(e) => setFormFiles(Array.from(e.target.files))}
                  style={{ fontSize: "0.785rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="tp-btn-primary" style={{ background: "rgba(255,255,255,0.05)", color: "#fff", border: "none" }} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="tp-btn-primary" disabled={taskCreating}>
                  {taskCreating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Task</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
