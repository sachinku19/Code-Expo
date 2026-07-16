import React, { useMemo, useState, useEffect } from "react";
import { Flame, CheckCircle, Clock, Calendar, AlertCircle, Play, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export default function PersonalDashboard({ stats, onSelectTask, onStartTimer, activeTabChange }) {
  const {
    todayTasks = [],
    upcomingTasks = [],
    overdueTasks = [],
    recentlyCompleted = [],
    streak = 1,
    completionPercent = 0,
    activeTimer = null,
    weeklyProgress = []
  } = stats || {};

  // Interactive Month & Year Selector States
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // Popover state for multiple tasks on the same day
  const [selectedDayTasks, setSelectedDayTasks] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (selectedDayTasks && !e.target.closest(".calendar-popover") && !e.target.closest(".calendar-day-cell")) {
        setSelectedDayTasks(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [selectedDayTasks]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Merge all tasks to render calendar dots
  const allDashboardTasks = useMemo(() => {
    const list = [
      ...todayTasks,
      ...upcomingTasks,
      ...overdueTasks,
      ...recentlyCompleted
    ];
    const seen = new Set();
    return list.filter(t => {
      if (!t || !t._id) return false;
      if (seen.has(t._id)) return false;
      seen.add(t._id);
      return true;
    });
  }, [todayTasks, upcomingTasks, overdueTasks, recentlyCompleted]);

  // Simple Mini Calendar Logic
  const calendarDays = useMemo(() => {
    const days = [];
    const now = new Date();
    
    // Start of the month day index (0 = Sun, etc.)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Padding empty blocks before day 1
    for (let i = 0; i < firstDay; i++) {
      days.push({ dayNumber: "", active: false, isToday: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday =
        d === now.getDate() &&
        currentMonth === now.getMonth() &&
        currentYear === now.getFullYear();

      days.push({
        dayNumber: d,
        isToday,
        active: true
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds) return "0h 0m";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const currentMonthLabel = new Date(currentYear, currentMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="personal-dashboard-grid" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Main Stats Section */}
      <div className="dashboard-grid">
        {/* Stat 1: Streak */}
        <div className="stats-summary-card stat-streak">
          <div className="stats-card-icon-wrapper">
            <Flame size={20} />
          </div>
          <div>
            <div className="stats-summary-val">{streak} {streak === 1 ? "Day" : "Days"}</div>
            <div className="stats-summary-label">Coding Streak</div>
          </div>
        </div>

        {/* Stat 2: Completion Rate */}
        <div className="stats-summary-card stat-completion">
          <div className="stats-card-icon-wrapper">
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="stats-summary-val">{completionPercent}%</div>
            <div className="stats-summary-label">Tasks Completion</div>
          </div>
        </div>

        {/* Stat 3: Active Timer */}
        <div className="stats-summary-card stat-timer">
          <div className="stats-card-icon-wrapper">
            <Clock size={20} />
          </div>
          <div>
            {activeTimer ? (
              <div className="stats-summary-val" style={{ color: "#60a5fa" }}>Running...</div>
            ) : (
              <div className="stats-summary-val">Idle</div>
            )}
            <div className="stats-summary-label">Timer Status</div>
          </div>
        </div>
      </div>

      {/* 2. Heatmap & Calendar Split */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        {/* Weekly Productivity Heatmap */}
        <div className="db-card">
          <div className="db-card-header">
            <h2>Weekly Progress & Focus</h2>
            <span style={{ fontSize: "0.75rem", color: "#818cf8" }}>Last 7 Days</span>
          </div>
          <div className="progress-heatmap-container">
            {weeklyProgress.map((p, idx) => {
              const maxVal = Math.max(...weeklyProgress.map(x => x.completedCount + (x.timeSpent / 3600)), 1);
              const heightPct = Math.min(((p.completedCount + (p.timeSpent / 3600)) / maxVal) * 100, 100);
              return (
                <div key={idx} className="heatmap-column" title={`${p.completedCount} tasks completed, ${formatSeconds(p.timeSpent)} spent`}>
                  <div className="heatmap-bar-track">
                    <div className="heatmap-bar-fill" style={{ height: `${heightPct || 10}%` }} />
                  </div>
                  <span className="heatmap-label">{p.day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "0.75rem", color: "#6b7280" }}>
            <span>⚡ Task completion count + coding duration determines bar heights</span>
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="db-card" style={{ position: "relative" }}>
          <div className="db-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ textTransform: "capitalize", letterSpacing: "normal" }}>{currentMonthLabel}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button 
                onClick={handlePrevMonth}
                style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", padding: "4px" }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleNextMonth}
                style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", padding: "4px" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            {calendarDays.map((d, i) => {
              const cellDate = d.dayNumber ? new Date(currentYear, currentMonth, d.dayNumber) : null;
              const cellDateStr = cellDate ? cellDate.toDateString() : "";
              const dayTasks = cellDate ? allDashboardTasks.filter(t => {
                if (!t.dueDate) return false;
                return new Date(t.dueDate).toDateString() === cellDateStr;
              }) : [];

              return (
                <div
                  key={i}
                  className={`calendar-day-cell ${d.isToday ? "today" : ""} ${!d.dayNumber ? "empty" : ""} ${dayTasks.length > 0 ? "has-tasks" : ""}`}
                  title={dayTasks.length > 0 ? `${dayTasks.length} task(s):\n` + dayTasks.map(t => `• ${t.title}`).join("\n") : undefined}
                  onClick={(e) => {
                    if (dayTasks.length > 0) {
                      if (dayTasks.length === 1) {
                        onSelectTask(dayTasks[0]);
                        setSelectedDayTasks(null);
                      } else {
                        const cardRect = e.currentTarget.closest(".db-card").getBoundingClientRect();
                        const cellRect = e.currentTarget.getBoundingClientRect();
                        setPopoverAnchor({
                          top: cellRect.bottom - cardRect.top,
                          left: Math.max(10, Math.min(cellRect.left - cardRect.left, cardRect.width - 240))
                        });
                        setSelectedDayTasks(dayTasks);
                      }
                    }
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                    cursor: d.dayNumber ? "pointer" : "default"
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: d.isToday ? "700" : "500" }}>{d.dayNumber}</span>
                  {dayTasks.length > 0 && (
                    <span 
                      className={`day-task-dot ${dayTasks.some(t => t.priority === "Critical" || t.priority === "High") ? "critical" : "normal"}`}
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        position: "absolute",
                        bottom: "3px",
                        background: d.isToday ? "#ffffff" : (dayTasks.some(t => t.priority === "Critical" || t.priority === "High") ? "#f87171" : "#818cf8")
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating task selector popover for days with multiple tasks */}
          {selectedDayTasks && popoverAnchor && (
            <div 
              className="calendar-popover"
              style={{
                position: "absolute",
                top: `${popoverAnchor.top + 6}px`,
                left: `${popoverAnchor.left}px`,
                background: "var(--tp-card-bg)",
                border: "1px solid var(--tp-border)",
                borderRadius: "8px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.4)",
                padding: "8px",
                zIndex: 100,
                width: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "4px", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--tp-text-secondary)" }}>Tasks Due Today</span>
                <button 
                  onClick={() => setSelectedDayTasks(null)}
                  style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem", padding: "0 4px" }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {selectedDayTasks.map(t => (
                  <div 
                    key={t._id}
                    className="calendar-popover-item"
                    onClick={() => {
                      onSelectTask(t);
                      setSelectedDayTasks(null);
                    }}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span className="popover-item-title" style={{ fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: "6px", color: "var(--tp-text-primary)" }}>
                      {t.title}
                    </span>
                    <span 
                      style={{
                        fontSize: "0.58rem",
                        padding: "2px 4px",
                        borderRadius: "3px",
                        background: t.type === "personal" ? "rgba(99, 102, 241, 0.15)" : "rgba(168, 85, 247, 0.15)",
                        color: t.type === "personal" ? "#a5b4fc" : "#d8b4fe",
                        flexShrink: 0
                      }}
                    >
                      {t.type === "personal" ? "Self" : "Room"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Task Focus columns */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {/* Today's Tasks */}
        <div className="db-card">
          <div className="db-card-header" style={{ borderColor: "rgba(59, 130, 246, 0.2)" }}>
            <h2 style={{ color: "#60a5fa" }}>Today's Tasks ({todayTasks.length})</h2>
            <CheckCircle size={14} style={{ color: "#60a5fa" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {todayTasks.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "10px 0" }}>No tasks due today. Sweet!</div>
            ) : (
              todayTasks.map(t => (
                <div key={t._id} className="task-row" style={{ padding: "10px 14px" }} onClick={() => onSelectTask(t)}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{t.title}</span>
                  <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(99, 102, 241, 0.1)", color: "#a5b4fc" }}>
                    {t.type === "personal" ? t.category : "Room Board"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Alert list */}
        <div className="db-card">
          <div className="db-card-header" style={{ borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <h2 style={{ color: "#f87171" }}>Overdue Tasks ({overdueTasks.length})</h2>
            <AlertCircle size={14} style={{ color: "#f87171" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {overdueTasks.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "10px 0" }}>All caught up! Nothing is overdue.</div>
            ) : (
              overdueTasks.slice(0, 5).map(t => (
                <div key={t._id} className="task-row" style={{ padding: "10px 14px" }} onClick={() => onSelectTask(t)}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{t.title}</span>
                    <span style={{ fontSize: "0.68rem", color: "#ef4444" }}>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: "700" }}>{t.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Completed */}
        <div className="db-card">
          <div className="db-card-header" style={{ borderColor: "rgba(34, 197, 94, 0.2)" }}>
            <h2 style={{ color: "#4ade80" }}>Recently Completed</h2>
            <CheckCircle size={14} style={{ color: "#4ade80" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentlyCompleted.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "#6b7280", padding: "10px 0" }}>Complete tasks to see them here!</div>
            ) : (
              recentlyCompleted.slice(0, 5).map(t => (
                <div key={t._id} className="task-row" style={{ padding: "10px 14px", border: "1px dashed rgba(74, 222, 128, 0.2)" }} onClick={() => onSelectTask(t)}>
                  <span style={{ fontSize: "0.85rem", textDecoration: "line-through", color: "#9ca3af" }}>{t.title}</span>
                  <span style={{ fontSize: "0.68rem", color: "#4ade80" }}>Done</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
