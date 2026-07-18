import React, { useState } from "react";
import { AlertCircle, Calendar, Clock, CheckSquare, Plus } from "lucide-react";

export default function KanbanBoard({
  tasks = [],
  currentUser,
  userRole = "MEMBER",
  presenceList = [],
  onSelectTask,
  onUpdateTaskStatus,
  onOpenCreateTaskModal
}) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  const canModifyTask = (task) => {
    if (userRole === "VIEWER") return false;
    if (userRole === "OWNER" || userRole === "MODERATOR") return true;
    const creatorId = task.createdBy?._id || task.createdBy;
    const currentUserId = currentUser?.id || currentUser?._id;
    const isCreator = creatorId && String(creatorId) === String(currentUserId);
    const isAssigned = task.assignedMembers?.some(m => String(m._id || m) === String(currentUserId)) || task.isAssignedToAll;
    return isCreator || isAssigned;
  };

  const COLUMNS = ["Todo", "In Progress", "Review", "Testing", "Completed", "Blocked"];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Critical": return "#ef4444";
      case "High": return "#f97316";
      case "Medium": return "#eab308";
      case "Low": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e, column) => {
    e.preventDefault();
    if (userRole === "VIEWER") return;
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedTaskId(null);
    if (userRole === "VIEWER") return;

    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onUpdateTaskStatus(taskId, targetColumn);
    }
  };

  return (
    <div className="kanban-board-container">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col);
        const isOver = dragOverColumn === col;

        return (
          <div
            key={col}
            className="kanban-column"
            onDragOver={(e) => handleDragOver(e, col)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col)}
          >
            {/* Header */}
            <div className="kanban-column-header">
              <div className="column-title-box">
                <span
                  className="priority-indicator"
                  style={{
                    backgroundColor:
                      col === "Completed" ? "#22c55e" :
                      col === "Blocked" ? "#ef4444" :
                      col === "In Progress" ? "#3b82f6" : "#6b7280"
                  }}
                />
                <span className="column-title">{col}</span>
                <span className="column-badge">{columnTasks.length}</span>
              </div>
              
              {["OWNER", "MODERATOR"].includes(userRole) && col === "Todo" && (
                <button
                  onClick={onOpenCreateTaskModal}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                  title="Create new task"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {/* Cards container */}
            <div className={`kanban-column-cards ${isOver ? "drag-over" : ""}`}>
              {columnTasks.length === 0 ? (
                <div className="kanban-empty-column">
                  <CheckSquare size={16} style={{ opacity: 0.3, color: "var(--tp-accent)" }} />
                  <span>No tasks here</span>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const cardPresence = presenceList.filter(
                    (p) => p.taskId === task._id && p.action === "editing"
                  );

                  return (
                    <div
                      key={task._id}
                      className={`task-card ${draggedTaskId === task._id ? "dragging" : ""}`}
                      draggable={canModifyTask(task)}
                      onDragStart={(e) => handleDragStart(e, task._id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectTask(task)}
                    >
                      {/* Header */}
                      <div className="task-card-header">
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          {task.labels && task.labels.length > 0 && (
                            <span className="task-card-category">{task.labels[0]}</span>
                          )}
                          <span
                            className={`priority-badge ${task.priority?.toLowerCase() || "medium"}`}
                          >
                            {task.priority || "Medium"}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3>{task.title}</h3>

                      {/* Description snippet */}
                      {task.description && (
                        <p className="task-card-desc">{task.description}</p>
                      )}

                      {/* Active presence indicators */}
                      {cardPresence.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.68rem",
                            color: "#4ade80",
                            margin: "4px 0 10px 0",
                            background: "rgba(34, 197, 94, 0.05)",
                            padding: "4px 8px",
                            borderRadius: "4px"
                          }}
                        >
                          <span className="presence-dot" />
                          <span>@{cardPresence[0].username} is editing</span>
                        </div>
                      )}

                      {/* Footer info */}
                      <div className="task-card-footer">
                        {task.dueDate && (
                          <div className="task-card-dates">
                            <Calendar size={10} />
                            <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        )}

                        {/* Assigned avatars */}
                        <div className="task-card-avatars">
                          {task.isAssignedToAll ? (
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "#4f46e5",
                                color: "#fff",
                                fontSize: "0.65rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "800"
                              }}
                              title="Assigned to entire Room"
                            >
                              ALL
                            </div>
                          ) : (
                            task.assignedMembers?.slice(0, 3).map((m, idx) => (
                              <React.Fragment key={m._id || m}>
                                {m.avatar ? (
                                  <img
                                    src={m.avatar}
                                    alt={m.username}
                                    className="task-card-avatar"
                                    title={`@${m.username}`}
                                  />
                                ) : (
                                  <div
                                    className="task-card-avatar"
                                    style={{
                                      background: "#312e81",
                                      color: "#a5b4fc",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.65rem",
                                      fontWeight: "800"
                                    }}
                                    title={`@${m.username || 'user'}`}
                                  >
                                    {(m.username || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </React.Fragment>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
