import React from "react";
import { Users, CheckCircle, FolderOpen, Clock, Play, ArrowRight, Shield } from "lucide-react";

export default function RoomDashboard({ stats, onSelectTask, currentUser }) {
  const {
    totalTasks = 0,
    completedTasks = 0,
    pendingTasks = 0,
    activeTasksCount = 0,
    completionPercent = 0,
    activeTasksList = [],
    recentlyUpdated = [],
    totalCodingTime = 0,
    activeSessions = [],
    productivityByMember = []
  } = stats || {};

  const userId = currentUser?.id || currentUser?._id;
  const filteredActiveTasks = activeTasksList.filter(t => {
    if (!userId) return true;
    const isCreator = String(t.createdBy?._id || t.createdBy) === String(userId);
    const isAssigned = t.assignedMembers?.some(m => String(m._id || m) === String(userId)) || t.isAssignedToAll;
    return isCreator || isAssigned;
  });

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds) return "0h 0m";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="room-dashboard-grid" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Main Stats Section */}
      <div className="dashboard-grid">
        {/* Stat 1: Total & Completion rate */}
        <div className="stats-summary-card stat-completion">
          <div className="stats-card-icon-wrapper">
            <FolderOpen size={20} />
          </div>
          <div>
            <div className="stats-summary-val">{completedTasks} / {totalTasks} Tasks</div>
            <div className="stats-summary-label">Completion rate: {completionPercent}%</div>
          </div>
        </div>

        {/* Stat 2: Today's Coding Time */}
        <div className="stats-summary-card stat-timer">
          <div className="stats-card-icon-wrapper">
            <Clock size={20} />
          </div>
          <div>
            <div className="stats-summary-val">{formatSeconds(totalCodingTime)}</div>
            <div className="stats-summary-label">Room Cumulative Coding Time</div>
          </div>
        </div>

        {/* Stat 3: Active Members Coding Right Now */}
        <div className="stats-summary-card stat-streak">
          <div className="stats-card-icon-wrapper">
            <Users size={20} />
          </div>
          <div>
            <div className="stats-summary-val">{activeSessions.length} Coding</div>
            <div className="stats-summary-label">Members with active timers</div>
          </div>
        </div>
      </div>

      {/* 2. Active Sessions & Productivity Index */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        {/* Productivity By Member */}
        <div className="db-card">
          <div className="db-card-header">
            <h2>Member Contributions</h2>
            <span style={{ fontSize: "0.75rem", color: "#818cf8" }}>Productivity index</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {productivityByMember.map(p => (
              <div
                key={p.user?._id || p.user?.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: "10px 14px",
                  borderRadius: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {p.user?.avatar ? (
                    <img
                      src={p.user.avatar}
                      alt={p.user.username}
                      style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "#312e81",
                        color: "#a5b4fc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: "700"
                      }}
                    >
                      {p.user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                      @{p.user?.username}
                      {p.role === "OWNER" && <Shield size={10} style={{ color: "#ef4444" }} title="Owner" />}
                      {p.role === "MODERATOR" && <Shield size={10} style={{ color: "#f59e0b" }} title="Moderator / Admin" />}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{p.completedCount} completed of {p.assignedCount} assigned</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#818cf8" }}>{p.productivity}%</div>
                  <div style={{ width: "60px", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
                    <div style={{ width: `${p.productivity}%`, height: "100%", background: "#818cf8" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coding Now Overlay */}
        <div className="db-card">
          <div className="db-card-header">
            <h2>Active Working Sessions</h2>
            <Play size={12} style={{ color: "#22c55e" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activeSessions.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "14px 0", textAlign: "center" }}>No active timers currently running in this room.</div>
            ) : (
              activeSessions.map(s => (
                <div
                  key={s._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(34, 197, 94, 0.05)",
                    border: "1px solid rgba(34, 197, 94, 0.15)",
                    padding: "8px 12px",
                    borderRadius: "8px"
                  }}
                >
                  <span className="presence-dot" />
                  <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#4ade80" }}>@{s.user?.username}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--tp-text-secondary, #9ca3af)" }}>is working...</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Active Tasks Lists */}
      <div className="dashboard-grid">
        <div className="db-card" style={{ gridColumn: "span 2" }}>
          <div className="db-card-header">
            <h2>Active Room Tasks ({filteredActiveTasks.length})</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredActiveTasks.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "10px 0" }}>Hurray! No active tasks.</div>
            ) : (
              filteredActiveTasks.slice(0, 8).map(t => (
                <div
                  key={t._id}
                  className="task-row"
                  style={{ padding: "10px 14px" }}
                  onClick={() => onSelectTask(t)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "0.75rem", background: "rgba(255, 255, 255, 0.05)", padding: "2px 8px", borderRadius: "4px" }}>
                      {t.status}
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--tp-text-primary, #fff)" }}>{t.title}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {t.dueDate && (
                      <span style={{ fontSize: "0.72rem", color: "var(--tp-text-secondary, #9ca3af)" }}>
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span style={{ fontSize: "0.7rem", color: t.priority === "Critical" ? "#f87171" : "var(--tp-accent, #6366f1)" }}>
                      {t.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
