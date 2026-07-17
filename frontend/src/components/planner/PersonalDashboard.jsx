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

  // Selected date for agenda display (default to today)
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toDateString());

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

  const selectedDateLabel = new Date(selectedDateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  // Filter tasks specifically for the selected date to show in agenda
  const selectedDateTasks = useMemo(() => {
    return allDashboardTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === selectedDateStr;
    });
  }, [allDashboardTasks, selectedDateStr]);

  return (
    <div className="personal-dashboard-layout" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", alignItems: "stretch" }}>
      
      {/* Column 1: Weekly Progress & Focus Metrics */}
      <div className="db-card" style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
        <div className="db-card-header">
          <h2>Weekly Progress</h2>
          <span style={{ fontSize: "0.75rem", color: "var(--tp-accent)" }}>Last 7 Days</span>
        </div>
        <div className="progress-heatmap-container" style={{ flexGrow: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "180px", padding: "10px 0" }}>
          {weeklyProgress.map((p, idx) => {
            const maxVal = Math.max(...weeklyProgress.map(x => x.completedCount + (x.timeSpent / 3600)), 1);
            const heightPct = Math.min(((p.completedCount + (p.timeSpent / 3600)) / maxVal) * 100, 100);
            return (
              <div key={idx} className="heatmap-column" title={`${p.completedCount} tasks completed, ${formatSeconds(p.timeSpent)} spent`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1 }}>
                <div className="heatmap-bar-track" style={{ width: "12px", height: "120px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
                  <div className="heatmap-bar-fill" style={{ height: `${heightPct || 10}%`, width: "100%", background: "var(--tp-accent)", position: "absolute", bottom: 0, borderRadius: "6px" }} />
                </div>
                <span className="heatmap-label" style={{ fontSize: "0.68rem", color: "var(--tp-text-muted)" }}>{p.day}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.72rem", color: "var(--tp-text-muted)", marginBottom: "6px" }}>
          <span>⚡ Bar height determines completed count + duration</span>
        </div>
        
        {/* Core Stats Embedded inside Column 1 */}
        <div style={{ borderTop: "1px solid var(--tp-border)", paddingTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "auto" }}>
          {/* Stat 1: Streak */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "var(--tp-bg)", border: "1px solid var(--tp-border)", borderRadius: "8px" }}>
            <Flame size={16} style={{ color: "#ef4444" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--tp-text-primary)" }}>{streak} {streak === 1 ? "Day" : "Days"}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--tp-text-muted)" }}>Streak</div>
            </div>
          </div>
          
          {/* Stat 2: Completion Rate */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "var(--tp-bg)", border: "1px solid var(--tp-border)", borderRadius: "8px" }}>
            <CheckCircle size={16} style={{ color: "#22c55e" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--tp-text-primary)" }}>{completionPercent}%</div>
              <div style={{ fontSize: "0.65rem", color: "var(--tp-text-muted)" }}>Completion</div>
            </div>
          </div>
          
          {/* Stat 3: Active Timer Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "var(--tp-bg)", border: "1px solid var(--tp-border)", borderRadius: "8px", gridColumn: "span 2" }}>
            <Clock size={16} style={{ color: activeTimer ? "#60a5fa" : "var(--tp-text-muted)" }} />
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: "700", color: activeTimer ? "#60a5fa" : "var(--tp-text-primary)" }}>
                {activeTimer ? "Running Timer..." : "Timer Idle"}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--tp-text-muted)" }}>Focus Tracker</div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: Today's Tasks & Active Agenda */}
      <div className="db-card" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
        <div className="db-card-header" style={{ borderColor: "var(--tp-border)" }}>
          <h2>Active Agenda</h2>
          <span style={{ fontSize: "0.72rem", color: "var(--tp-text-muted)" }}>Today & Overdue</span>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px", flexGrow: 1 }}>
          
          {/* Overdue Tasks Section */}
          {overdueTasks.length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.7rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertCircle size={10} /> Overdue Tasks ({overdueTasks.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {overdueTasks.slice(0, 4).map(t => (
                  <div key={t._id} className="task-row" style={{ padding: "8px 12px" }} onClick={() => onSelectTask(t)}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--tp-text-primary, #fff)" }}>{t.title}</span>
                      <span style={{ fontSize: "0.65rem", color: "#ef4444" }}>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "#ef4444", fontWeight: "700" }}>{t.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Tasks Section */}
          <div>
            <h3 style={{ fontSize: "0.7rem", fontWeight: "700", color: "#60a5fa", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle size={10} /> Today's Tasks ({todayTasks.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {todayTasks.length === 0 ? (
                <div style={{ fontSize: "0.75rem", color: "var(--tp-text-muted)", padding: "4px 0" }}>No tasks due today. Sweet!</div>
              ) : (
                todayTasks.map(t => (
                  <div key={t._id} className="task-row" style={{ padding: "8px 12px" }} onClick={() => onSelectTask(t)}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--tp-text-primary, #fff)" }}>{t.title}</span>
                    <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "var(--tp-accent-bg-tag, rgba(99, 102, 241, 0.1))", color: "var(--tp-accent, #a5b4fc)" }}>
                      {t.type === "personal" ? t.category : "Room Board"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Completed Section */}
          {recentlyCompleted.length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.7rem", fontWeight: "700", color: "#4ade80", textTransform: "uppercase", marginBottom: "8px" }}>
                Recently Completed ({recentlyCompleted.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {recentlyCompleted.slice(0, 3).map(t => (
                  <div key={t._id} className="task-row" style={{ padding: "8px 12px", border: "1px dashed rgba(74, 222, 128, 0.2)" }} onClick={() => onSelectTask(t)}>
                    <span style={{ fontSize: "0.8rem", textDecoration: "line-through", color: "var(--tp-text-muted, #9ca3af)" }}>{t.title}</span>
                    <span style={{ fontSize: "0.65rem", color: "#4ade80" }}>Done</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Calendar Widget */}
      <div className="db-card" style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div className="db-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ textTransform: "capitalize", letterSpacing: "normal" }}>{currentMonthLabel}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button 
              onClick={handlePrevMonth}
              style={{ background: "transparent", border: "none", color: "var(--tp-text-secondary, #9ca3af)", cursor: "pointer", display: "flex", padding: "4px" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={handleNextMonth}
              style={{ background: "transparent", border: "none", color: "var(--tp-text-secondary, #9ca3af)", cursor: "pointer", display: "flex", padding: "4px" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="calendar-grid" style={{ flexGrow: 1 }}>
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

            const isSelected = cellDateStr === selectedDateStr;

            return (
              <div
                key={i}
                className={`calendar-day-cell ${d.isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${!d.dayNumber ? "empty" : ""} ${dayTasks.length > 0 ? "has-tasks" : ""}`}
                title={dayTasks.length > 0 ? `${dayTasks.length} task(s):\n` + dayTasks.map(t => `• ${t.title}`).join("\n") : undefined}
                onClick={(e) => {
                  if (d.dayNumber) {
                    setSelectedDateStr(cellDateStr);
                    if (dayTasks.length > 1) {
                      const cardRect = e.currentTarget.closest(".db-card").getBoundingClientRect();
                      const cellRect = e.currentTarget.getBoundingClientRect();
                      setPopoverAnchor({
                        top: cellRect.bottom - cardRect.top,
                        left: Math.max(10, Math.min(cellRect.left - cardRect.left, cardRect.width - 240))
                      });
                      setSelectedDayTasks(dayTasks);
                    } else {
                      setSelectedDayTasks(null);
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
                      borderRadius: "1px",
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

        {/* Selected Day Agenda/Tasks list with Colored SQUARE indicators */}
        <div style={{ borderTop: "1px solid var(--tp-border)", paddingTop: "10px", marginTop: "4px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--tp-text-secondary)" }}>
              Agenda for {selectedDateLabel}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "110px", overflowY: "auto", paddingRight: "2px" }}>
            {selectedDateTasks.length === 0 ? (
              <span style={{ fontSize: "0.68rem", color: "var(--tp-text-muted)", fontStyle: "italic" }}>
                No tasks scheduled for this day.
              </span>
            ) : (
              selectedDateTasks.map(t => {
                let pColor = "var(--tp-accent, #6366f1)";
                if (t.priority === "Critical" || t.priority === "High") pColor = "#ef4444";
                else if (t.priority === "Medium") pColor = "#fbbf24";
                else if (t.priority === "Low") pColor = "#4ade80";

                return (
                  <div
                    key={t._id}
                    onClick={() => onSelectTask(t)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      background: "var(--tp-bg)",
                      border: "1px solid var(--tp-border)",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                    className="calendar-agenda-item"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      {/* Square priority indicator */}
                      <div style={{ width: "8px", height: "8px", borderRadius: "1.5px", background: pColor, flexShrink: 0 }} />
                      <span style={{ fontSize: "0.74rem", fontWeight: "600", color: "var(--tp-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.title}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.62rem", padding: "2px 4px", borderRadius: "3px", background: "var(--tp-accent-bg-tag)", color: "var(--tp-accent)", flexShrink: 0 }}>
                      {t.type === "personal" ? "Self" : "Room"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
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
                      background: t.type === "personal" ? "var(--tp-accent-bg-tag, rgba(99, 102, 241, 0.15))" : "var(--tp-room-tag-bg, rgba(168, 85, 247, 0.15))",
                      color: t.type === "personal" ? "var(--tp-accent, #a5b4fc)" : "var(--tp-room-tag-color, #d8b4fe)",
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
  );
}
