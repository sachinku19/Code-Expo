import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  createRoom,
  joinRoom,
  getUserRoomsHistory,
  getLiveRooms,
  getRecentRooms,
  getPendingRequests,
  respondToJoinRequest,
  getActivityFeed,
  getActivityStats,
  removeUser,
  leaveRoom,
  deleteRoom,
  getAllPublicRooms
} from "../services/roomService";
import socket from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, changePassword } from "../services/authService";
import {
  Plus, LogIn, History as HistoryIcon, User,
  Sun, Moon, Sparkles, Globe, Lock, Settings as SettingsIcon,
  Users, Clock, Terminal, Activity, FolderGit, Check, X, ShieldAlert, UserMinus,
  Search, SlidersHorizontal, BookOpen, ShieldCheck, Mail, Key, Eye, EyeOff, BellRing, Laptop,
  Palette, Bell, HelpCircle, Copy, Folder, ChevronRight, ChevronDown, Code,
  Heart, Bookmark, UserPlus, UserCheck, ArrowLeft, Flame, Trophy, Calendar,
  Megaphone, Wrench
} from "lucide-react";
import {
  toggleFollowUser,
  removeFollower,
  getFollowers,
  getFollowing,
  toggleLikeRoom,
  toggleBookmarkRoom,
  getRoomSocialStats,
  getTrendingRooms,
  getSocialFeed,
  getDeveloperSuggestions,
  getNotifications,
  markNotificationsRead,
  getLikedRooms,
  getBookmarkedRooms,
  getUserPublicProfile
} from "../services/socialService";
import { updateUserProfile, getActiveAnnouncements, getActiveAds } from "../services/userService";
import "./Dashboard.css";
import MainLayout from "../layouts/MainLayout";
import ProfileAvatar from "../components/ProfileAvatar";
import HelpDesk from "../components/helpdesk/HelpDesk";

const playNotificationSound = () => {
  const audio = new Audio("/mixkit-software-interface-start-2574.wav");
  audio.play().catch(err => console.log("Audio play blocked by browser policy:", err));
};

const formatCodingTime = (hours, minutes) => {
  if (minutes !== undefined && minutes !== null) {
    if (minutes === 0) return "0m active time";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return `${h}h ${m}m active time`;
    }
    return `${m}m active time`;
  }
  return `${hours || 0} active hours`;
};

const parseDateUTC = (dateStr) => {
  if (!dateStr) return null;
  const [yr, mo, dy] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(yr, mo - 1, dy));
};

// Isolated contribution heatmap component to prevent main Dashboard re-renders
const ContributionHeatmap = ({ rawHeatmap, selectedYear, onYearChange, availableYears }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  const [highlightFilter, setHighlightFilter] = useState(null);

  const calculatedHeatmap = useMemo(() => {
    let startDate, endDate;
    const today = new Date();

    if (selectedYear === "last12") {
      const startMonth = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      startDate = new Date(Date.UTC(startMonth.getFullYear(), startMonth.getMonth(), 1));
      endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    } else {
      const year = parseInt(selectedYear, 10);
      startDate = new Date(Date.UTC(year, 0, 1));
      endDate = new Date(Date.UTC(year, 11, 31));
    }

    const daysMap = {};
    let curr = new Date(startDate.getTime());
    while (curr <= endDate) {
      const dateStr = curr.toISOString().split("T")[0];
      daysMap[dateStr] = {
        date: dateStr,
        count: 0,
        score: 0,
        level: 0,
        actions: {
          roomCreated: 0,
          codeExecution: 0,
          whiteboardActivity: 0,
          messagesSent: 0,
          filesEdited: 0,
          other: 0
        }
      };
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    if (rawHeatmap && Array.isArray(rawHeatmap)) {
      rawHeatmap.forEach(day => {
        if (!day.date) return;
        const dateStr = day.date.split("T")[0];
        if (daysMap[dateStr]) {
          daysMap[dateStr].count = day.count || 0;
          daysMap[dateStr].score = day.points || day.score || 0;
          daysMap[dateStr].level = day.level || 0;
          if (day.actions) {
            daysMap[dateStr].actions = { ...daysMap[dateStr].actions, ...day.actions };
          }
        }
      });
    }

    return Object.values(daysMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [rawHeatmap, selectedYear]);

  const monthBlocks = useMemo(() => {
    if (calculatedHeatmap.length === 0) return [];

    // Group days by YYYY-MM
    const groups = {};
    calculatedHeatmap.forEach(day => {
      if (!day.date) return;
      const parts = day.date.split("-");
      const key = `${parts[0]}-${parts[1]}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(day);
    });

    const actualMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const blocks = [];

    // Process each month group in chronological order
    Object.keys(groups).forEach(key => {
      const days = groups[key];
      if (days.length === 0) return;

      // Parse the first day to find padding start
      const firstDay = parseDateUTC(days[0].date);
      const startPad = firstDay.getUTCDay();

      // Parse the last day to find padding end
      const lastDay = parseDateUTC(days[days.length - 1].date);
      const endPad = 6 - lastDay.getUTCDay();

      const padded = [];
      for (let i = 0; i < startPad; i++) {
        padded.push({ isPlaceholder: true, date: null, count: 0, level: 0 });
      }
      padded.push(...days);
      for (let i = 0; i < endPad; i++) {
        padded.push({ isPlaceholder: true, date: null, count: 0, level: 0 });
      }

      // Group padded days into columns of 7
      const columns = [];
      for (let i = 0; i < padded.length; i += 7) {
        columns.push(padded.slice(i, i + 7));
      }

      const [yearStr, monthStr] = key.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;

      blocks.push({
        name: actualMonthNames[monthIdx],
        year: yearStr,
        columns
      });
    });

    return blocks;
  }, [calculatedHeatmap]);

  const stats = useMemo(() => {
    let totalContributions = 0;
    let activeDays = 0;
    let totalRoomsCreated = 0;
    let totalCodeRuns = 0;
    let totalWhiteboardActions = 0;

    calculatedHeatmap.forEach(day => {
      totalContributions += (day.score || 0);
      if (day.score > 0) {
        activeDays++;
      }
      totalRoomsCreated += (day.actions?.roomCreated || 0);
      totalCodeRuns += (day.actions?.codeExecution || 0);
      totalWhiteboardActions += (day.actions?.whiteboardActivity || 0);
    });

    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let tempStartIdx = -1;
    let maxStartIdx = -1;
    let maxEndIdx = -1;
    const currentStreakDates = new Set();
    const maxStreakDates = new Set();

    calculatedHeatmap.forEach((day, idx) => {
      if (day.score > 0) {
        if (tempStreak === 0) {
          tempStartIdx = idx;
        }
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          maxStartIdx = tempStartIdx;
          maxEndIdx = idx;
        }
      } else {
        tempStreak = 0;
      }
    });

    if (maxStartIdx !== -1 && maxEndIdx !== -1) {
      for (let i = maxStartIdx; i <= maxEndIdx; i++) {
        if (calculatedHeatmap[i]) {
          maxStreakDates.add(calculatedHeatmap[i].date);
        }
      }
    }

    const reversed = [...calculatedHeatmap].reverse();
    if (reversed.length > 0) {
      const todayActive = (reversed[0].score || 0) > 0;
      const yesterdayActive = reversed.length > 1 && (reversed[1].score || 0) > 0;

      if (todayActive || yesterdayActive) {
        let streakCount = 0;
        for (let i = 0; i < reversed.length; i++) {
          if ((reversed[i].score || 0) > 0) {
            streakCount++;
            currentStreakDates.add(reversed[i].date);
          } else {
            if (i === 0 && !todayActive && yesterdayActive) {
              continue;
            }
            break;
          }
        }
        currentStreak = streakCount;
      }
    }

    return {
      totalContributions,
      activeDays,
      totalRoomsCreated,
      totalCodeRuns,
      totalWhiteboardActions,
      currentStreak,
      longestStreak,
      currentStreakDates,
      maxStreakDates
    };
  }, [calculatedHeatmap]);

  const toggleFilter = (filterType) => {
    setHighlightFilter(prev => prev === filterType ? null : filterType);
  };

  return (
    <div className="profile-sec-card heatmap-wrapper-card">
      {/* Top Header Row */}
      <div className="heatmap-header-row">
        <div className="heatmap-header-left">
          <span className="heatmap-total-submissions">
            <strong>{stats.totalContributions.toLocaleString()}</strong> points in the {selectedYear === "last12" ? "past one year" : `year ${selectedYear}`}
          </span>
        </div>
        <div className="heatmap-header-right">
          <span
            className={`heatmap-header-stat clickable ${highlightFilter === 'active' ? 'active-filter-stat' : ''}`}
            onClick={() => toggleFilter('active')}
            title="Click to highlight active days"
          >
            Total active days: <strong className="stat-highlight">{stats.activeDays}</strong>
          </span>
          <span
            className={`heatmap-header-stat clickable ${highlightFilter === 'current-streak' ? 'active-filter-stat' : ''}`}
            onClick={() => toggleFilter('current-streak')}
            title="Click to highlight current streak"
          >
            Current streak: <strong className="stat-highlight orange">{stats.currentStreak}</strong>
          </span>
          <span
            className={`heatmap-header-stat clickable ${highlightFilter === 'max-streak' ? 'active-filter-stat' : ''}`}
            onClick={() => toggleFilter('max-streak')}
            title="Click to highlight max streak"
          >
            Max streak: <strong className="stat-highlight gold">{stats.longestStreak}</strong>
          </span>

          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="heatmap-year-select"
          >
            <option value="last12">Current</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="heatmap-container-layout">
        {/* Top: Full-Width Calendar Grid */}
        <div className="heatmap-calendar-scroll-wrapper">
          <div className="heatmap-grid-inner-wrapper">
            {/* Weekdays */}
            <div className="weekday-labels-grid">
              <span></span>
              <span>Mon</span>
              <span></span>
              <span>Wed</span>
              <span></span>
              <span>Fri</span>
              <span></span>
            </div>

            {/* Month Blocks Container */}
            <div className="heatmap-month-blocks-container">
              {monthBlocks.map((month, mIdx) => (
                <div key={`month-${mIdx}`} className="heatmap-month-block">
                  <div className="heatmap-month-grid">
                    {month.columns.map((col, colIdx) => (
                      <div
                        key={`col-${colIdx}`}
                        className="heatmap-week-column"
                      >
                        {col.map((day, dayIdx) => {
                          if (day.isPlaceholder) {
                            return (
                              <div
                                key={`placeholder-${colIdx}-${dayIdx}`}
                                className="heatmap-cell-3d placeholder"
                                style={{ visibility: "hidden" }}
                              />
                            );
                          }

                          let cellClasses = `heatmap-cell-3d level-${day.level}`;
                          if (highlightFilter) {
                            if (highlightFilter === 'active' || highlightFilter === 'submissions') {
                              if (day.score > 0) {
                                cellClasses += ' highlighted-active';
                              } else {
                                cellClasses += ' dimmed';
                              }
                            } else if (highlightFilter === 'current-streak') {
                              if (stats.currentStreakDates.has(day.date)) {
                                cellClasses += ' highlighted-current-streak';
                              } else {
                                cellClasses += ' dimmed';
                              }
                            } else if (highlightFilter === 'max-streak') {
                              if (stats.maxStreakDates.has(day.date)) {
                                cellClasses += ' highlighted-max-streak';
                              } else {
                                cellClasses += ' dimmed';
                              }
                            }
                          }

                          return (
                            <div
                              key={`day-${day.date}`}
                              className={cellClasses}
                              onMouseEnter={(e) => {
                                const parentRect = e.currentTarget.closest(".heatmap-wrapper-card").getBoundingClientRect();
                                const cellRect = e.currentTarget.getBoundingClientRect();
                                setHoveredDay({
                                  date: day.date,
                                  count: day.count,
                                  score: day.score,
                                  level: day.level,
                                  left: cellRect.left - parentRect.left + cellRect.width / 2,
                                  top: cellRect.top - parentRect.top
                                });
                              }}
                              onMouseMove={(e) => {
                                const parentRect = e.currentTarget.closest(".heatmap-wrapper-card").getBoundingClientRect();
                                const cellRect = e.currentTarget.getBoundingClientRect();
                                setHoveredDay({
                                  date: day.date,
                                  count: day.count,
                                  score: day.score,
                                  level: day.level,
                                  left: cellRect.left - parentRect.left + cellRect.width / 2,
                                  top: cellRect.top - parentRect.top
                                });
                              }}
                              onMouseLeave={() => setHoveredDay(null)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="heatmap-month-name">{month.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend / Footer row */}
        <div className="heatmap-footer-row">
          <span className="heatmap-footer-note">
            Note: Hover over cells to see daily details. Click stats above to highlight streaks.
          </span>
          <div className="heatmap-legend-3d">
            <span>Less</span>
            <div className="heatmap-cell-3d level-0 legend" />
            <div className="heatmap-cell-3d level-1 legend" />
            <div className="heatmap-cell-3d level-2 legend" />
            <div className="heatmap-cell-3d level-3 legend" />
            <div className="heatmap-cell-3d level-4 legend" />
            <span>More</span>
          </div>
        </div>
      </div>

      {hoveredDay && (
        <div
          className="heatmap-custom-tooltip"
          style={{
            position: "absolute",
            left: `${hoveredDay.left}px`,
            top: `${hoveredDay.top - 8}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            pointerEvents: "none"
          }}
        >
          <div className="tooltip-header">
            {hoveredDay.score > 0 && <Flame size={12} className="tooltip-fire-icon" />}
            <span className="tooltip-count">
              {hoveredDay.score} point{hoveredDay.score === 1 ? '' : 's'}
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)", margin: "2px 0" }}>
            {hoveredDay.count} activit{hoveredDay.count === 1 ? 'y' : 'ies'}
          </div>
          <div className="tooltip-date">
            {(() => {
              if (!hoveredDay.date) return "";
              const [yr, mo, dy] = hoveredDay.date.split("-").map(Number);
              const d = new Date(yr, mo - 1, dy);
              return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            })()}
          </div>
          <span className="tooltip-level-badge">Level {hoveredDay.level}</span>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
};

const getBadgeStyle = (title) => {
  const t = (title || "").toLowerCase();
  if (t === "system admin") {
    return {
      background: "linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)",
      color: "#fff",
      boxShadow: "0 0 12px rgba(170, 59, 255, 0.5)",
      border: "1px solid rgba(239, 68, 68, 0.5)"
    };
  }
  if (t.includes("legendary")) {
    return {
      background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
      color: "#fff",
      boxShadow: "0 0 10px rgba(244, 63, 94, 0.4)"
    };
  }
  if (t.includes("admin") || t.includes("architect")) {
    return {
      background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
      color: "#fff"
    };
  }
  if (t.includes("elite")) {
    return {
      background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
      color: "#000"
    };
  }
  if (t.includes("senior")) {
    return {
      background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      color: "#fff"
    };
  }
  return {
    background: "rgba(255, 255, 255, 0.08)",
    color: "var(--ce-text)",
    border: "1px solid var(--ce-border)"
  };
};

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();

  const [stats, setStats] = useState({
    totalCreated: 0,
    totalJoined: 0,
    activeRooms: 0,
    onlineUsers: 0,
    codingHours: 0,
    codingMinutes: 0,
    lifetimePoints: 0,
    executions: 0,
    publicCreatedCount: 0,
    privateCreatedCount: 0,
    totalJoinedFromStart: 0,
    totalPoints: 0
  });

  const [historyRooms, setHistoryRooms] = useState([]);
  const [recentRooms, setRecentRooms] = useState([]);
  const [liveRooms, setLiveRooms] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);

  // System announcements states
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try {
      const stored = localStorage.getItem("dismissedAnnouncements");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Ads states
  const [activeAds, setActiveAds] = useState([]);

  // Social states
  const [suggestions, setSuggestions] = useState([]);
  const [trendingRooms, setTrendingRooms] = useState([]);
  const [onlineFollows, setOnlineFollows] = useState([]);
  const [feedActivities, setFeedActivities] = useState([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [langsInput, setLangsInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("rooms");
  const [likedRooms, setLikedRooms] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  // Viewed user states
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [viewingUserStats, setViewingUserStats] = useState(null);
  const [viewingUserRooms, setViewingUserRooms] = useState([]);
  const [viewingUserLikedRooms, setViewingUserLikedRooms] = useState([]);
  const [selectedYear, setSelectedYear] = useState("last12");
  const [ownYears, setOwnYears] = useState([new Date().getFullYear()]);
  const [targetFollowersList, setTargetFollowersList] = useState([]);
  const [targetFollowingList, setTargetFollowingList] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  const [animatingLikes, setAnimatingLikes] = useState({});

  const isRoomLiked = (roomId) => {
    return likedRooms.some(lr => lr && (lr.roomId === roomId || lr._id === roomId)) ||
      viewingUserLikedRooms.some(lr => lr && (lr.roomId === roomId || lr._id === roomId));
  };

  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };


  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Search & Filter state for History
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilterLang, setHistoryFilterLang] = useState("all");
  const [historySortBy, setHistorySortBy] = useState("recent");

  // Settings tab state
  const [settingsTab, setSettingsTab] = useState("account");

  // Theme synchronization state
  const [activeTheme, setActiveTheme] = useState(
    localStorage.getItem("codeExpoHomeTheme") || "dark"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const currentTheme = document.documentElement.className.includes("light") ? "light" : "dark";
      setActiveTheme(currentTheme);
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const handleThemeChange = (newTheme) => {
    document.documentElement.className = newTheme;
    localStorage.setItem("codeExpoHomeTheme", newTheme);
    setActiveTheme(newTheme);
  };

  // Working states for Editor Settings
  const [dashEditorFontSize, setDashEditorFontSize] = useState(
    Number(localStorage.getItem("editor_fontSize")) || 14
  );
  const [dashEditorTabSize, setDashEditorTabSize] = useState(
    Number(localStorage.getItem("editor_tabSize")) || 2
  );
  const [dashEditorMinimap, setDashEditorMinimap] = useState(
    localStorage.getItem("editor_minimap") === "true"
  );

  // Notification Settings states
  const [notifApprovalAlerts, setNotifApprovalAlerts] = useState(
    localStorage.getItem("notif_approvalAlerts") !== "false"
  );
  const [notifMentionAlerts, setNotifMentionAlerts] = useState(
    localStorage.getItem("notif_mentionAlerts") !== "false"
  );

  // Security preferences states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // GitHub Integration & API Keys States
  const [gitHubToken, setGitHubToken] = useState(
    localStorage.getItem("git_githubToken") || ""
  );
  const [showGitToken, setShowGitToken] = useState(false);
  const [gitDefaultBranch, setGitDefaultBranch] = useState(
    localStorage.getItem("git_defaultBranch") || "main"
  );
  const [isVerifyingGit, setIsVerifyingGit] = useState(false);
  const [gitConnectionInfo, setGitConnectionInfo] = useState(() => {
    try {
      const info = localStorage.getItem("git_connectionInfo");
      return info ? JSON.parse(info) : null;
    } catch {
      return null;
    }
  });

  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const keys = localStorage.getItem("ce_api_keys");
      return keys ? JSON.parse(keys) : [];
    } catch {
      return [];
    }
  });
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);
  const [apiKeyName, setApiKeyName] = useState("");

  const [dashEditorWordWrap, setDashEditorWordWrap] = useState(
    localStorage.getItem("editor_wordWrap") !== "off"
  );
  const [dashEditorLineNumbers, setDashEditorLineNumbers] = useState(
    localStorage.getItem("editor_lineNumbers") !== "off"
  );
  const [dashDefaultLanguage, setDashDefaultLanguage] = useState(
    localStorage.getItem("default_language") || "javascript"
  );
  const [dashWhiteboardGrid, setDashWhiteboardGrid] = useState(
    localStorage.getItem("whiteboard_gridType") || "dots"
  );

  const handleEditorFontSizeChange = (e) => {
    const val = Number(e.target.value);
    setDashEditorFontSize(val);
    localStorage.setItem("editor_fontSize", val);
    addToast(`Editor font size set to ${val}px`, "success");
  };

  const handleEditorTabSizeChange = (e) => {
    const val = Number(e.target.value);
    setDashEditorTabSize(val);
    localStorage.setItem("editor_tabSize", val);
    addToast(`Editor tab size set to ${val} spaces`, "success");
  };

  const handleEditorMinimapChange = (e) => {
    const val = e.target.checked;
    setDashEditorMinimap(val);
    localStorage.setItem("editor_minimap", val);
    addToast(`Minimap ${val ? "enabled" : "disabled"}`, "success");
  };

  const handleApprovalAlertsChange = (e) => {
    const val = e.target.checked;
    setNotifApprovalAlerts(val);
    localStorage.setItem("notif_approvalAlerts", val);
    addToast(`Room approval alerts ${val ? "enabled" : "disabled"}`, "success");
  };

  const handleMentionAlertsChange = (e) => {
    const val = e.target.checked;
    setNotifMentionAlerts(val);
    localStorage.setItem("notif_mentionAlerts", val);
    addToast(`Mention notifications ${val ? "enabled" : "disabled"}`, "success");
  };

  const handleEditorWordWrapChange = (e) => {
    const val = e.target.checked;
    setDashEditorWordWrap(val);
    localStorage.setItem("editor_wordWrap", val ? "on" : "off");
    addToast(`Word wrap ${val ? "enabled" : "disabled"}`, "success");
  };

  const handleEditorLineNumbersChange = (e) => {
    const val = e.target.checked;
    setDashEditorLineNumbers(val);
    localStorage.setItem("editor_lineNumbers", val ? "on" : "off");
    addToast(`Line numbers ${val ? "enabled" : "disabled"}`, "success");
  };

  const handleDefaultLanguageChange = (e) => {
    const val = e.target.value;
    setDashDefaultLanguage(val);
    localStorage.setItem("default_language", val);
    addToast(`Default language set to ${val.toUpperCase()}`, "success");
  };

  const handleWhiteboardGridChange = (e) => {
    const val = e.target.value;
    setDashWhiteboardGrid(val);
    localStorage.setItem("whiteboard_gridType", val);
    addToast(`Default whiteboard grid set to ${val.toUpperCase()}`, "success");
  };

  const handleVerifyGitHubToken = async (e) => {
    if (e) e.preventDefault();
    if (!gitHubToken.trim()) {
      addToast("Please enter a GitHub Access Token", "error");
      return;
    }

    setIsVerifyingGit(true);
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${gitHubToken.trim()}`,
          Accept: "application/vnd.github.v3+json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const connectionDetails = {
          login: data.login,
          name: data.name || data.login,
          avatar_url: data.avatar_url,
          html_url: data.html_url
        };

        localStorage.setItem("git_githubToken", gitHubToken.trim());
        localStorage.setItem("git_connectionInfo", JSON.stringify(connectionDetails));
        setGitConnectionInfo(connectionDetails);
        addToast(`Successfully connected as @${data.login}!`, "success");
      } else {
        const errorData = await response.json().catch(() => ({}));
        addToast(errorData.message || "Failed to authenticate with GitHub", "error");
      }
    } catch (err) {
      addToast("Network error or invalid API token. Please check connection.", "error");
    } finally {
      setIsVerifyingGit(false);
    }
  };

  const handleDisconnectGitHub = () => {
    localStorage.removeItem("git_githubToken");
    localStorage.removeItem("git_connectionInfo");
    setGitHubToken("");
    setGitConnectionInfo(null);
    addToast("GitHub integration disconnected.", "success");
  };

  const handleSaveGitBranch = (e) => {
    e.preventDefault();
    localStorage.setItem("git_defaultBranch", gitDefaultBranch);
    addToast(`Default branch set to "${gitDefaultBranch}"`, "success");
  };

  const handleGenerateApiKey = (name) => {
    if (!name.trim()) {
      addToast("Please provide a name for your API key", "error");
      return;
    }

    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const rawKey = `ce_pat_${hex}`;

    const newKeyItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      prefix: `${rawKey.slice(0, 10)}...`,
      createdAt: new Date().toISOString()
    };

    const updatedKeys = [...apiKeys, newKeyItem];
    localStorage.setItem("ce_api_keys", JSON.stringify(updatedKeys));

    try {
      const activeRawSecrets = JSON.parse(localStorage.getItem("ce_raw_secrets") || "{}");
      activeRawSecrets[newKeyItem.id] = rawKey;
      localStorage.setItem("ce_raw_secrets", JSON.stringify(activeRawSecrets));
    } catch (e) { }

    setApiKeys(updatedKeys);
    setNewlyGeneratedKey(rawKey);
    addToast("Personal API key generated successfully", "success");
  };

  const handleRevokeApiKey = (id) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    localStorage.setItem("ce_api_keys", JSON.stringify(updatedKeys));

    try {
      const activeRawSecrets = JSON.parse(localStorage.getItem("ce_raw_secrets") || "{}");
      delete activeRawSecrets[id];
      localStorage.setItem("ce_raw_secrets", JSON.stringify(activeRawSecrets));
    } catch (e) { }

    setApiKeys(updatedKeys);
    addToast("Personal API key revoked", "success");
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      addToast("Please fill in both password fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      addToast("New password must be at least 6 characters", "error");
      return;
    }
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        addToast("Password changed successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        addToast(res.message || "Failed to update password", "error");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to update password", "error");
    }
  };

  // Quick Action Forms
  const [formData, setFormData] = useState({
    title: "",
    language: localStorage.getItem("default_language") || "javascript",
    isPrivate: false
  });
  const [roomId, setRoomId] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [selectedRoomLikes, setSelectedRoomLikes] = useState([]);
  const [isLoadingRoomLikes, setIsLoadingRoomLikes] = useState(false);

  useEffect(() => {
    if (selectedRoomDetails?.roomId) {
      const fetchLikes = async () => {
        setIsLoadingRoomLikes(true);
        try {
          const res = await getRoomSocialStats(selectedRoomDetails.roomId);
          if (res.success) {
            setSelectedRoomLikes(res.likedBy || []);
          }
        } catch (err) {
          console.error("Error fetching room likes:", err);
          setSelectedRoomLikes([]);
        } finally {
          setIsLoadingRoomLikes(false);
        }
      };
      fetchLikes();
    } else {
      setSelectedRoomLikes([]);
    }
  }, [selectedRoomDetails?.roomId]);

  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [showQuickJoinModal, setShowQuickJoinModal] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [activeDropdownCardId, setActiveDropdownCardId] = useState(null);

  // Search and view state for split lists
  const [continueCodingSearch, setContinueCodingSearch] = useState("");
  const [showAllActiveContinueCoding, setShowAllActiveContinueCoding] = useState(false);
  const [showAllOfflineContinueCoding, setShowAllOfflineContinueCoding] = useState(false);

  const [publicRooms, setPublicRooms] = useState([]);
  const [publicRoomsSearch, setPublicRoomsSearch] = useState("");
  const [showAllPublicRooms, setShowAllPublicRooms] = useState(false);
  const [roomsTab, setRoomsTab] = useState("recent");
  const [activeRoomsTab, setActiveRoomsTab] = useState("my-active");
  const [myRoomsTabSearch, setMyRoomsTabSearch] = useState("");
  const [showAllActiveMyRoomsTab, setShowAllActiveMyRoomsTab] = useState(false);
  const [showAllOfflineMyRoomsTab, setShowAllOfflineMyRoomsTab] = useState(false);

  // Gate Opening Portal Animation State
  const [gateAnimationRoomId, setGateAnimationRoomId] = useState(null);
  const [kickModalOpen, setKickModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState({ roomId: "", userId: "", username: "" });
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  const [joinTargetRoom, setJoinTargetRoom] = useState(null);

  const confirmKickUser = async () => {
    const { roomId: targetRoomId, userId } = kickTarget;
    setKickModalOpen(false);
    try {
      await removeUser(targetRoomId, userId);
      socket.emit("kick-user", { roomId: targetRoomId, userId });
      fetchDashboardData();
      setSelectedRoomDetails(prev => {
        if (!prev || prev.roomId !== targetRoomId) return prev;
        return {
          ...prev,
          participants: (prev.participants || []).filter(p => String(p._id || p) !== String(userId))
        };
      });
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const triggerGateAndNavigate = (targetRoomId) => {
    setGateAnimationRoomId(targetRoomId);
    setTimeout(() => {
      navigate(`/editor/${targetRoomId}`);
      // Clear gate animation room ID after navigation
      setTimeout(() => {
        setGateAnimationRoomId(null);
      }, 500);
    }, 1100);
  };

  // Sync section with query tab
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveSection(tab);
      if (tab === "profile") {
        setViewingUserProfile(null);
        setViewingUserStats(null);
      }
    } else {
      setActiveSection("dashboard");
    }
  }, [location]);

  // Admin redirect logic
  useEffect(() => {
    if (user && user.role === "admin" && !localStorage.getItem("ceBypassAdminRedirect")) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      const [historyData, recentData, liveData, requestsData, activityData, statsData, publicData] = await Promise.all([
        getUserRoomsHistory(),
        getRecentRooms(),
        getLiveRooms(),
        getPendingRequests(),
        getActivityFeed(),
        getActivityStats(),
        getAllPublicRooms()
      ]);

      const history = historyData.rooms || [];
      const recent = recentData.rooms || [];
      const live = liveData.rooms || [];
      const requests = requestsData.requests || [];
      const activityList = activityData.activities || [];
      const dbStats = statsData.stats || { codingHours: 0, executions: 0, heatmap: [] };
      const publicR = publicData.rooms || [];

      setHistoryRooms(history);
      setRecentRooms(recent);
      setLiveRooms(live);
      setJoinRequests(requests);
      setActivities(activityList);
      setHeatmap(dbStats.heatmap || []);
      setOwnYears(dbStats.years || [new Date().getFullYear()]);
      setPublicRooms(publicR);

      const created = history.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id).length;
      const joined = history.length - created;

      setStats({
        totalCreated: dbStats.totalCreatedCount !== undefined ? dbStats.totalCreatedCount : created,
        totalJoined: dbStats.totalJoinedFromStart !== undefined ? dbStats.totalJoinedFromStart : (joined >= 0 ? joined : 0),
        activeRooms: live.length,
        onlineUsers: live.reduce((acc, r) => acc + (r.activeUsersCount || 0), 0),
        codingHours: dbStats.codingHours,
        codingMinutes: dbStats.codingMinutes || 0,
        lifetimePoints: dbStats.lifetimePoints || 0,
        executions: dbStats.executions,
        publicCreatedCount: dbStats.publicCreatedCount || 0,
        privateCreatedCount: dbStats.privateCreatedCount || 0,
        totalJoinedFromStart: dbStats.totalJoinedFromStart || 0,
        totalPoints: dbStats.totalPoints || 0
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      if (error.response?.status === 503 || error.response?.data?.isMaintenance) {
        setIsMaintenance(true);
      }
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const fetchSocialDashboardData = async () => {
    if (!user) return;
    try {
      const [sugRes, trendRes, followRes, feedRes, likedRes, savedRes, notifRes, profileRes] = await Promise.all([
        getDeveloperSuggestions().catch(() => ({ success: false, suggestions: [] })),
        getTrendingRooms().catch(() => ({ success: false, rooms: [] })),
        getFollowing(user.id || user._id).catch(() => ({ success: false, following: [] })),
        getSocialFeed(1, 10).catch(() => ({ success: false, activities: [], totalPages: 1 })),
        getLikedRooms().catch(() => ({ success: false, rooms: [] })),
        getBookmarkedRooms().catch(() => ({ success: false, rooms: [] })),
        getNotifications().catch(() => ({ success: false, notifications: [], unreadCount: 0 })),
        getUserProfile().catch(() => ({ success: false }))
      ]);

      if (sugRes.success) setSuggestions(sugRes.suggestions || []);
      if (trendRes.success) {
        setTrendingRooms(prev => {
          const newRooms = trendRes.rooms || [];
          if (!prev || prev.length === 0) return newRooms;

          const updated = prev.map(p => {
            const match = newRooms.find(n => n.roomId === p.roomId || n._id === p._id);
            return match ? { ...p, ...match } : p;
          });

          const newAdditions = newRooms.filter(n => !prev.some(p => p.roomId === n.roomId || p._id === n._id));
          return [...updated, ...newAdditions].slice(0, 5);
        });
      }
      if (followRes.success) {
        const following = followRes.following || [];
        setFollowingList(following);
        const online = following.filter(f => f.isOnline === "true" || f.isOnline === true);
        setOnlineFollows(online);
      }
      if (feedRes.success) {
        setFeedActivities(feedRes.activities || []);
        setFeedTotalPages(feedRes.totalPages || 1);
        setFeedPage(1);
      }
      if (likedRes.success) setLikedRooms(likedRes.rooms || []);
      if (savedRes.success) setSavedRooms(savedRes.rooms || []);
      if (notifRes.success) {
        setNotificationsList(notifRes.notifications || []);
        setUnreadNotificationsCount(notifRes.unreadCount || 0);
      }
      if (profileRes.success) {
        setUser(profileRes.user);
        localStorage.setItem("user", JSON.stringify(profileRes.user));
      }

      const followersRes = await getFollowers(user.id || user._id).catch(() => ({ success: false, followers: [] }));
      if (followersRes.success) {
        setFollowersList(followersRes.followers || []);
      }
    } catch (err) {
      console.error("Error fetching social dashboard data:", err);
      if (err.response?.status === 503 || err.response?.data?.isMaintenance) {
        setIsMaintenance(true);
      }
    }
  };

  const handleLoadMoreFeed = async () => {
    if (feedLoading || feedPage >= feedTotalPages) return;
    setFeedLoading(true);
    try {
      const nextPage = feedPage + 1;
      const feedRes = await getSocialFeed(nextPage, 10);
      if (feedRes.success) {
        setFeedActivities(prev => [...prev, ...(feedRes.activities || [])]);
        setFeedPage(nextPage);
        setFeedTotalPages(feedRes.totalPages);
      }
    } catch (err) {
      console.error("Error loading more feed:", err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleFollowToggle = async (candidateId) => {
    // Keep copies of original states for potential rollback
    const prevFollowingList = [...followingList];
    const prevOnlineFollows = [...onlineFollows];
    const prevSuggestions = [...suggestions];
    const prevFollowersList = [...followersList];
    const prevUser = user ? { ...user } : null;
    const prevViewingUser = viewingUserProfile ? { ...viewingUserProfile } : null;

    const isFollowing = followingList.some(f => String(f._id || f) === String(candidateId));
    let targetUser = suggestions.find(s => String(s._id || s) === String(candidateId)) ||
                     followersList.find(f => String(f._id || f) === String(candidateId)) ||
                     (viewingUserProfile && String(viewingUserProfile._id) === String(candidateId) ? viewingUserProfile : null) ||
                     { _id: candidateId, username: "Developer", isOnline: false };

    // Optimistic UI updates
    if (isFollowing) {
      // Unfollow
      setFollowingList(prev => prev.filter(f => String(f._id || f) !== String(candidateId)));
      setOnlineFollows(prev => prev.filter(f => String(f._id || f) !== String(candidateId)));
      if (user) {
        setUser(prev => ({ ...prev, followingCount: Math.max(0, (prev.followingCount || 1) - 1) }));
      }
      setSuggestions(prev => prev.map(s => {
        if (String(s._id || s) === String(candidateId)) {
          return { ...s, followersCount: Math.max(0, (s.followersCount || 1) - 1), isFollowing: false };
        }
        return s;
      }));
      setFollowersList(prev => prev.map(f => {
        if (String(f._id || f) === String(candidateId)) {
          return { ...f, isFollowing: false };
        }
        return f;
      }));
      if (viewingUserProfile && String(viewingUserProfile._id) === String(candidateId)) {
        setViewingUserProfile(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1), isFollowing: false }));
      }
    } else {
      // Follow
      const newFollowItem = { ...targetUser, isFollowing: true };
      setFollowingList(prev => [...prev, newFollowItem]);
      if (targetUser.isOnline === "true" || targetUser.isOnline === true) {
        setOnlineFollows(prev => [...prev, newFollowItem]);
      }
      if (user) {
        setUser(prev => ({ ...prev, followingCount: (prev.followingCount || 0) + 1 }));
      }
      setSuggestions(prev => prev.map(s => {
        if (String(s._id || s) === String(candidateId)) {
          return { ...s, followersCount: (s.followersCount || 0) + 1, isFollowing: true };
        }
        return s;
      }));
      setFollowersList(prev => prev.map(f => {
        if (String(f._id || f) === String(candidateId)) {
          return { ...f, isFollowing: true };
        }
        return f;
      }));
      if (viewingUserProfile && String(viewingUserProfile._id) === String(candidateId)) {
        setViewingUserProfile(prev => ({ ...prev, followersCount: (prev.followersCount || 0) + 1, isFollowing: true }));
      }
    }

    try {
      const res = await toggleFollowUser(candidateId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background synchronization
        fetchSocialDashboardData();
      } else {
        throw new Error(res.message || "Failed to toggle follow status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback to previous states on failure
      setFollowingList(prevFollowingList);
      setOnlineFollows(prevOnlineFollows);
      setSuggestions(prevSuggestions);
      setFollowersList(prevFollowersList);
      if (prevUser) setUser(prevUser);
      if (prevViewingUser) setViewingUserProfile(prevViewingUser);
    }
  };

  const handleRemoveFollower = async (followerId) => {
    const prevFollowersList = [...followersList];
    const prevUser = user ? { ...user } : null;

    // Optimistically remove follower from UI
    setFollowersList(prev => prev.filter(f => String(f._id || f) !== String(followerId)));
    if (user) {
      setUser(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1) }));
    }

    try {
      const res = await removeFollower(followerId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background synchronization
        fetchSocialDashboardData();
      } else {
        throw new Error(res.message || "Failed to remove follower");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback to previous states on failure
      setFollowersList(prevFollowersList);
      if (prevUser) setUser(prevUser);
    }
  };

  const handleLikeRoom = async (roomId) => {
    setAnimatingLikes(prev => ({ ...prev, [roomId]: true }));
    setTimeout(() => {
      setAnimatingLikes(prev => ({ ...prev, [roomId]: false }));
    }, 600);

    const prevLikedRooms = [...likedRooms];
    const prevTrendingRooms = [...trendingRooms];
    const prevHistoryRooms = [...historyRooms];
    const prevViewingUserLikedRooms = [...viewingUserLikedRooms];

    const wasLiked = isRoomLiked(roomId);

    // Optimistically update states
    if (wasLiked) {
      setLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r.roomId === roomId) ||
        trendingRooms.find(r => r.roomId === roomId) ||
        viewingUserRooms.find(r => r.roomId === roomId);
      if (matchedRoom) {
        setLikedRooms(prev => [...prev, matchedRoom]);
      }
    }

    setTrendingRooms(prev => prev.map(r => {
      if (r.roomId === roomId) {
        return {
          ...r,
          likesCount: Math.max(0, (r.likesCount || 0) + (wasLiked ? -1 : 1))
        };
      }
      return r;
    }));

    setHistoryRooms(prev => prev.map(r => {
      if (r.roomId === roomId) {
        return {
          ...r,
          likesCount: Math.max(0, (r.likesCount || 0) + (wasLiked ? -1 : 1))
        };
      }
      return r;
    }));

    if (viewingUserProfile) {
      if (wasLiked) {
        setViewingUserLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
      } else {
        const matchedRoom = historyRooms.find(r => r.roomId === roomId) ||
          trendingRooms.find(r => r.roomId === roomId) ||
          viewingUserRooms.find(r => r.roomId === roomId);
        if (matchedRoom) {
          setViewingUserLikedRooms(prev => [...prev, matchedRoom]);
        }
      }
    }

    try {
      const res = await toggleLikeRoom(roomId);
      if (res.success) {
        addToast(res.message, "success");
        // Refetch notifications silently in the background
        const notifRes = await getNotifications().catch(() => ({ success: false, notifications: [], unreadCount: 0 }));
        if (notifRes.success) {
          setNotificationsList(notifRes.notifications || []);
          setUnreadNotificationsCount(notifRes.unreadCount || 0);
        }
      } else {
        throw new Error(res.message || "Failed to update like status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      setLikedRooms(prevLikedRooms);
      setTrendingRooms(prevTrendingRooms);
      setHistoryRooms(prevHistoryRooms);
      setViewingUserLikedRooms(prevViewingUserLikedRooms);
    }
  };

  const handleBookmarkRoom = async (roomId) => {
    const prevSavedRooms = [...savedRooms];
    const isBookmarked = savedRooms.some(r => r && (r.roomId === roomId || r._id === roomId));

    // Optimistically update bookmark state
    if (isBookmarked) {
      setSavedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r.roomId === roomId) ||
        trendingRooms.find(r => r.roomId === roomId) ||
        viewingUserRooms.find(r => r.roomId === roomId);
      if (matchedRoom) {
        setSavedRooms(prev => [...prev, matchedRoom]);
      }
    }

    try {
      const res = await toggleBookmarkRoom(roomId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background synchronization
        const savedRes = await getBookmarkedRooms().catch(() => ({ success: false, rooms: [] }));
        if (savedRes.success) setSavedRooms(savedRes.rooms || []);
      } else {
        throw new Error(res.message || "Failed to toggle bookmark status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      setSavedRooms(prevSavedRooms);
    }
  };

  const startEditingProfile = () => {
    setBioInput(user?.bio || "");
    setLangsInput((user?.programmingLanguages || []).join(", "));
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      const res = await updateUserProfile({
        bio: bioInput,
        programmingLanguages: langsInput
      });
      if (res.success) {
        addToast("Profile updated successfully", "success");
        setUser(res.user);
        localStorage.setItem("user", JSON.stringify(res.user));
        setIsEditingProfile(false);
        fetchSocialDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleViewUserProfile = async (targetUserId) => {
    try {
      setIsLoadingDashboard(true);
      setSelectedYear("last12");
      const res = await getUserPublicProfile(targetUserId);
      if (res.success) {
        setViewingUserProfile(res.user);
        setViewingUserRooms(res.rooms || []);
        setViewingUserLikedRooms(res.likedRooms || []);
        setViewingUserStats(res.stats || null);
        setProfileTab("rooms");
        setActiveSection("profile");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    try {
      setIsLoadingDashboard(true);
      const res = await getActivityStats(year);
      if (res.success) {
        setHeatmap(res.stats.heatmap || []);
        setStats(prev => ({
          ...prev,
          codingHours: res.stats.codingHours,
          codingMinutes: res.stats.codingMinutes || 0,
          lifetimePoints: res.stats.lifetimePoints || 0,
          executions: res.stats.executions,
          totalCreatedCount: res.stats.totalCreatedCount,
          publicCreatedCount: res.stats.publicCreatedCount,
          privateCreatedCount: res.stats.privateCreatedCount,
          totalJoinedFromStart: res.stats.totalJoinedFromStart,
          totalJoined: res.stats.totalJoinedFromStart || 0,
          totalPoints: res.stats.totalPoints
        }));
      }
    } catch (err) {
      addToast("Failed to fetch statistics for selected year.", "error");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleTargetYearChange = async (year) => {
    setSelectedYear(year);
    if (!viewingUserProfile) return;
    try {
      setIsLoadingDashboard(true);
      const res = await getUserPublicProfile(viewingUserProfile._id, year);
      if (res.success) {
        setViewingUserStats(res.stats || null);
      }
    } catch (err) {
      addToast("Failed to fetch developer statistics for selected year.", "error");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    const fetchModalSocialData = async () => {
      const activeId = viewingUserProfile ? viewingUserProfile._id : user?.id || user?._id;
      if (!activeId) return;
      try {
        const [followersRes, followingRes] = await Promise.all([
          getFollowers(activeId).catch(() => ({ success: false, followers: [] })),
          getFollowing(activeId).catch(() => ({ success: false, following: [] }))
        ]);
        if (followersRes.success) setTargetFollowersList(followersRes.followers || []);
        if (followingRes.success) setTargetFollowingList(followingRes.following || []);
      } catch (err) {
        console.error("Failed to load modal social data:", err);
      } finally {
        setLoadingModalData(false);
      }
    };

    if (showFollowersModal || showFollowingModal) {
      fetchModalSocialData();
    } else {
      setTargetFollowersList([]);
      setTargetFollowingList([]);
    }
  }, [showFollowersModal, showFollowingModal, viewingUserProfile, user?.id, user?._id]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await markNotificationsRead();
      if (res.success) {
        setUnreadNotificationsCount(0);
        setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const handleMarkOneNotificationRead = async (notifId) => {
    try {
      const res = await markNotificationsRead(notifId);
      if (res.success) {
        setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const fetchAnnouncementsData = async () => {
    try {
      const data = await getActiveAnnouncements();
      if (data.success) {
        setActiveAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error("Failed to load active announcements:", err);
    }
  };

  const fetchAdsData = async () => {
    try {
      const data = await getActiveAds();
      if (data.success) {
        setActiveAds(data.ads || []);
      }
    } catch (err) {
      console.error("Failed to load active ads:", err);
    }
  };

  const handleDismissAnnouncement = (id) => {
    const nextDismissed = [...dismissedAnnouncements, id];
    setDismissedAnnouncements(nextDismissed);
    localStorage.setItem("dismissedAnnouncements", JSON.stringify(nextDismissed));
  };

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      fetchDashboardData();
      fetchSocialDashboardData();
      fetchAnnouncementsData();
      fetchAdsData();
      const interval = setInterval(() => {
        fetchDashboardData();
        fetchSocialDashboardData();
        fetchAnnouncementsData();
        fetchAdsData();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (user && !isEditingProfile) {
      setBioInput(user.bio || "");
      setLangsInput((user.programmingLanguages || []).join(", "));
    }
  }, [user, isEditingProfile]);


  useEffect(() => {
    if (!socket) return;

    const userId = user?.id || user?._id;
    if (userId) {
      socket.emit("register-user", userId);
    }

    const handleJoinRequest = (data) => {
      playNotificationSound();
      fetchDashboardData();
    };

    const handleRealtimeNotification = (notif) => {
      playNotificationSound();
      setNotificationsList(prev => [notif, ...prev]);
      setUnreadNotificationsCount(prev => prev + 1);

      let actionText = "";
      if (notif.type === "FOLLOW") actionText = "followed you";
      else if (notif.type === "LIKE") actionText = `liked your room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "BOOKMARK") actionText = `bookmarked your room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN") actionText = `wants to join "${notif.targetRoom?.title || "workspace"}"`;

      const msg = `${notif.sender?.username || "Someone"} ${actionText}`;
      addToast(msg, "info");
    };

    const handleJoinApproved = (data) => {
      if (data && String(data.userId) === String(user?.id || user?._id)) {
        addToast("Your join request has been approved! Redirecting...", "success");
        triggerGateAndNavigate(data.roomId);
      }
    };

    const handleJoinRejected = (data) => {
      if (data && String(data.userId) === String(user?.id || user?._id)) {
        addToast(data.message || "Your join request was rejected by the owner.", "error");
      }
    };

    const handleAnnouncementBroadcast = (announcement) => {
      setActiveAnnouncements(prev => {
        if (prev.some(ann => ann._id === announcement._id)) return prev;
        return [announcement, ...prev];
      });
      addToast(`New Broadcast: ${announcement.title}`, "info");
    };

    const handleAnnouncementDelete = (announcementId) => {
      setActiveAnnouncements(prev => prev.filter(ann => ann._id !== announcementId));
    };

    const handleAdCreated = (ad) => {
      setActiveAds(prev => {
        if (prev.some(a => a._id === ad._id)) return prev;
        return [ad, ...prev];
      });
    };

    const handleAdToggled = ({ id, isActive }) => {
      if (isActive) {
        fetchAdsData();
      } else {
        setActiveAds(prev => prev.filter(a => a._id !== id));
      }
    };

    const handleAdDeleted = (adId) => {
      setActiveAds(prev => prev.filter(a => a._id !== adId));
    };

    socket.on("join-request", handleJoinRequest);
    socket.on("notification-received", handleRealtimeNotification);
    socket.on("already-online", (data) => {
      alert(data.message);
    });
    socket.on("join-approved", handleJoinApproved);
    socket.on("join-rejected", handleJoinRejected);
    socket.on("announcement:broadcast", handleAnnouncementBroadcast);
    socket.on("announcement:delete", handleAnnouncementDelete);
    socket.on("ad:created", handleAdCreated);
    socket.on("ad:toggled", handleAdToggled);
    socket.on("ad:deleted", handleAdDeleted);

    return () => {
      socket.off("join-request", handleJoinRequest);
      socket.off("notification-received", handleRealtimeNotification);
      socket.off("already-online");
      socket.off("join-approved", handleJoinApproved);
      socket.off("join-rejected", handleJoinRejected);
      socket.off("announcement:broadcast", handleAnnouncementBroadcast);
      socket.off("announcement:delete", handleAnnouncementDelete);
      socket.off("ad:created", handleAdCreated);
      socket.off("ad:toggled", handleAdToggled);
      socket.off("ad:deleted", handleAdDeleted);
    };
  }, [user?.id, user?._id, socket]);


  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const data = await createRoom(formData.title, formData.language, formData.isPrivate);
      triggerGateAndNavigate(data.room.roomId);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;
    handleJoinRoomDirect(roomId);
  };

  const proceedJoinRoom = async (targetRoomId) => {
    try {
      const data = await joinRoom(targetRoomId);
      if (data.requiresApproval) {
        socket.emit("join-request", {
          roomId: targetRoomId,
          userId: user?.id,
          username: user?.username,
        });
        playNotificationSound();
        alert("Join request sent to room owner for approval");
        return;
      }
      triggerGateAndNavigate(targetRoomId);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleJoinRoomDirect = (targetRoomId) => {
    const room = liveRooms.find(r => r.roomId === targetRoomId) ||
      historyRooms.find(r => r.roomId === targetRoomId) ||
      publicRooms.find(r => r.roomId === targetRoomId) ||
      { roomId: targetRoomId, title: "Workspace Room" };
    setJoinTargetRoom(room);
    setShowJoinConfirmModal(true);
  };
  const handleRespondRequest = async (roomId, requesterId, action) => {
    try {
      await respondToJoinRequest(roomId, requesterId, action);
      if (action === "accept") {
        socket.emit("approve-request", { roomId, userId: requesterId });
        playNotificationSound();
      } else {
        socket.emit("reject-request", { roomId, userId: requesterId });
      }
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleRemoveUser = (roomID, targetUserId, targetUsername) => {
    setKickTarget({ roomId: roomID, userId: targetUserId, username: targetUsername });
    setKickModalOpen(true);
  };

  const handleLeaveRoom = async (targetRoomId) => {
    const confirmLeave = window.confirm("Are you sure you want to leave this room?");
    if (!confirmLeave) return;
    try {
      socket.emit("leave-room", { roomId: targetRoomId });
      await leaveRoom(targetRoomId);
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleDeleteRoom = async (targetRoomId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this room? This action cannot be undone.");
    if (!confirmDelete) return;
    try {
      socket.emit("room-deleted", { roomId: targetRoomId });
      await deleteRoom(targetRoomId);
      fetchDashboardData();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveDropdownCardId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const formatLastActive = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Filtered and Sorted History Rooms
  const getFilteredHistory = () => {
    let list = historyRooms.filter(room => {
      const matchesSearch = room.title.toLowerCase().includes(historySearch.toLowerCase()) || room.roomId.includes(historySearch);
      const matchesLang = historyFilterLang === "all" || room.language === historyFilterLang;
      return matchesSearch && matchesLang;
    });

    if (historySortBy === "name") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (historySortBy === "recent") {
      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else if (historySortBy === "created") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  };

  const filteredHistory = getFilteredHistory();

  const getAvatarColor = (name) => {
    const colors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
      "#ec4899", "#14b8a6", "#6366f1", "#06b6d4", "#84cc16"
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderRoomCard = (room) => {
    const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
    const ownerName = isOwner ? "You" : (room.createdBy?.username || "Developer");
    const activeCount = room.activeUsersCount || 0;

    // Get all joined members (owner + participants)
    const allMembers = [];
    const memberIds = new Set();

    if (room.createdBy) {
      const ownerId = room.createdBy._id || room.createdBy;
      allMembers.push({
        _id: String(ownerId),
        username: room.createdBy.username || "Owner",
        avatar: room.createdBy.avatar,
        isOwner: true
      });
      memberIds.add(String(ownerId));
    }

    if (room.participants) {
      room.participants.forEach(p => {
        const pId = p._id || p;
        if (!memberIds.has(String(pId))) {
          allMembers.push({
            _id: String(pId),
            username: p.username || "Collaborator",
            avatar: p.avatar,
            isOwner: false
          });
          memberIds.add(String(pId));
        }
      });
    }

    const onlineUserIds = new Set((room.activeUsers || []).map(u => String(u.userId)));

    const membersWithStatus = allMembers.map(m => {
      const isOnline = onlineUserIds.has(m._id) || (room.activeUsers || []).some(au => au.username === m.username);
      return {
        ...m,
        isOnline
      };
    });

    // Sort: Online members first, then by username
    membersWithStatus.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.username.localeCompare(b.username);
    });

    // Check if owner is online
    const ownerId = room.createdBy?._id || room.createdBy;
    const isOwnerOnline = onlineUserIds.has(String(ownerId)) || (room.activeUsers || []).some(au => au.username === room.createdBy?.username);

    // Get language configuration for the square badge
    const getLangBadgeConfig = (lang) => {
      const l = String(lang).toLowerCase();
      const isLight = activeTheme === "light";

      if (l === "javascript" || l === "js") {
        return {
          text: "JS",
          color: isLight ? "#a18c00" : "#f7df1e",
          bg: isLight ? "rgba(247, 223, 30, 0.08)" : "rgba(247, 223, 30, 0.05)",
          border: isLight ? "rgba(161, 140, 0, 0.3)" : "rgba(247, 223, 30, 0.25)"
        };
      }
      if (l === "python" || l === "py") {
        return {
          text: "PY",
          color: isLight ? "#1e5b8a" : "#65b5ff",
          bg: isLight ? "rgba(55, 118, 171, 0.08)" : "rgba(101, 181, 255, 0.05)",
          border: isLight ? "rgba(30, 91, 138, 0.3)" : "rgba(101, 181, 255, 0.25)"
        };
      }
      if (l === "cpp" || l === "c++") {
        return {
          text: "C++",
          color: isLight ? "#004b85" : "#63b3ed",
          bg: isLight ? "rgba(0, 89, 156, 0.08)" : "rgba(99, 179, 237, 0.05)",
          border: isLight ? "rgba(0, 75, 133, 0.3)" : "rgba(99, 179, 237, 0.25)"
        };
      }
      if (l === "java") {
        return {
          text: "JAVA",
          color: isLight ? "#b86a00" : "#fca035",
          bg: isLight ? "rgba(248, 152, 32, 0.08)" : "rgba(252, 160, 53, 0.05)",
          border: isLight ? "rgba(184, 106, 0, 0.3)" : "rgba(252, 160, 53, 0.25)"
        };
      }
      return {
        text: l.toUpperCase(),
        color: isLight ? "#7c22e0" : "#d69cff",
        bg: isLight ? "rgba(170, 59, 255, 0.08)" : "rgba(214, 156, 255, 0.05)",
        border: isLight ? "rgba(124, 34, 224, 0.3)" : "rgba(214, 156, 255, 0.25)"
      };
    };
    const langConfig = getLangBadgeConfig(room.language);

    return (
      <div key={room.roomId} className="active-room-card-wrapper">
        <div className="active-room-card">
          {/* Top Row */}
          <div className="room-card-top-row">
            <div className="room-lang-icon-square" style={{
              "--lang-color": langConfig.color,
              "--lang-bg": langConfig.bg,
              "--lang-border": langConfig.border
            }}>
              {langConfig.text === "C++" || langConfig.text === "CPP" ? (
                <Code size={12} />
              ) : (
                <Terminal size={12} />
              )}
              <span>{langConfig.text}</span>
            </div>

            <div className="room-card-top-right">
              <span className="room-visibility-outline-badge">
                {room.isPrivate ? "Private" : "Public"}
              </span>
              <span className="room-status-indicator-text">
                <span className={`room-status-dot-mini ${activeCount > 0 ? "active" : "offline"}`} />
                {activeCount > 0 ? "Active" : "Offline"}
              </span>
            </div>
          </div>

          {/* Middle Info */}
          <div className="room-card-middle">
            <h4 className="room-card-title-new" title={room.title}>
              {room.title}
            </h4>
            <p className="room-card-desc-new">
              {room.description || "Collaborate, code and build together in real-time."}
            </p>
          </div>

          {/* Meta Info Line */}
          <div className="room-card-meta-line">
            <span className="meta-item-new">
              <Folder size={13} />
              <span>{room.roomId}</span>
            </span>
            <span className="meta-divider-bullet">•</span>

            {/* Interactive Users List Toggle */}
            <span className="meta-item-new members-interactive-wrapper" onClick={(e) => e.stopPropagation()}>
              <Users size={13} />
              <span>{membersWithStatus.length} Members</span>

              <div className="avatar-bubbles-group">
                {membersWithStatus.slice(0, 3).map((m, idx) => (
                  <div
                    key={idx}
                    className="bubble-avatar-item"
                    style={{
                      backgroundColor: m.avatar ? "transparent" : getAvatarColor(m.username),
                      zIndex: 3 - idx
                    }}
                    title={`${m.username} (${m.isOnline ? 'Online' : 'Offline'})`}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      (m.username || "C").charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {membersWithStatus.length > 3 && (
                  <div className="bubble-avatar-item plus-more">
                    +{membersWithStatus.length - 3}
                  </div>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCardId(expandedCardId === room.roomId ? null : room.roomId);
                }}
                className={`expand-members-btn-new ${expandedCardId === room.roomId ? 'expanded' : ''}`}
                title="Toggle Members List"
              >
                <ChevronDown size={12} />
              </button>
            </span>

            <span className="meta-divider-bullet">•</span>
            <span className="meta-item-new">
              <Clock size={13} />
              <span>Updated {formatLastActive(room.lastActivity || room.updatedAt)}</span>
            </span>
          </div>

          {/* Expanded Drawer for Members categorization */}
          {expandedCardId === room.roomId && (
            <div className="card-members-expanded-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-section">
                <span className="drawer-section-title green-theme">Online</span>
                <div className="drawer-members-list">
                  {membersWithStatus.filter(m => m.isOnline).map((m, idx) => (
                    <div key={idx} className="drawer-member-pill online">
                      <span className="pill-dot online" />
                      <span className="pill-name">{m.username}</span>
                    </div>
                  ))}
                  {membersWithStatus.filter(m => m.isOnline).length === 0 && (
                    <span className="empty-pill-text">No one online</span>
                  )}
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title grey-theme">Offline</span>
                <div className="drawer-members-list">
                  {membersWithStatus.filter(m => !m.isOnline && !m.isOwner).map((m, idx) => (
                    <div key={idx} className="drawer-member-pill offline">
                      <span className="pill-dot offline" />
                      <span className="pill-name">{m.username}</span>
                    </div>
                  ))}
                  {membersWithStatus.filter(m => !m.isOnline && !m.isOwner).length === 0 && (
                    <span className="empty-pill-text">No offline members</span>
                  )}
                </div>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title gold-theme">Owner</span>
                <div className="drawer-members-list">
                  {membersWithStatus.filter(m => m.isOwner).map((m, idx) => (
                    <div key={idx} className="drawer-member-pill owner">
                      <span className="pill-crown">👑</span>
                      <span className="pill-name">{m.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <hr className="room-card-divider" />

          {/* Bottom Row */}
          <div className="room-card-bottom-row">
            {/* Owner profile */}
            <div className="room-card-owner-profile">
              <div className="owner-avatar-wrapper-new">
                <div className="owner-avatar-circle" style={{ backgroundColor: room.createdBy?.avatar ? "transparent" : getAvatarColor(room.createdBy?.username || "Owner") }}>
                  {room.createdBy?.avatar ? (
                    <img src={room.createdBy.avatar} alt={room.createdBy.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    (room.createdBy?.username || "O").charAt(0).toUpperCase()
                  )}
                </div>
                <span className={`owner-presence-badge ${isOwnerOnline ? "online" : "offline"}`} />
              </div>
              <div className="owner-profile-details">
                <span className="owner-label-text">Owner</span>
                <span className="owner-name-text">{room.createdBy?.username || "Collaborator"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="room-card-actions-wrapper">
              <button
                type="button"
                className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLikeRoom(room.roomId);
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--ce-border)",
                  cursor: "pointer",
                  color: isRoomLiked(room.roomId) ? "var(--ce-danger, #f85149)" : "var(--ce-text)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.35s ease"
                }}
                title={isRoomLiked(room.roomId) ? "Unlike Room" : "Like Room"}
              >
                <Heart
                  size={13}
                  fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                  style={{
                    transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                  }}
                />
                <span style={{ fontSize: "0.72rem", fontWeight: "600" }}>{room.likesCount || 0}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRoomDetails(room);
                }}
                className="details-btn-new"
              >
                Details
              </button>
              <button onClick={() => handleJoinRoomDirect(room.roomId)} className="resume-btn-new">
                <span>Open Workspace</span>
                <ChevronRight size={14} />
              </button>

              {/* Three dots menu container */}
              <div className="card-menu-dropdown-container" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDropdownCardId(activeDropdownCardId === room.roomId ? null : room.roomId);
                  }}
                  className="card-menu-trigger-btn"
                  title="More Actions"
                >
                  <span className="dots-icon">•••</span>
                </button>

                {activeDropdownCardId === room.roomId && (
                  <div className="card-menu-dropdown-list">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(e, room.roomId);
                        setActiveDropdownCardId(null);
                      }}
                      className="dropdown-item"
                    >
                      Copy Room ID
                    </button>
                    {isOwner ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.roomId);
                          setActiveDropdownCardId(null);
                        }}
                        className="dropdown-item delete"
                      >
                        Delete Room
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveRoom(room.roomId);
                          setActiveDropdownCardId(null);
                        }}
                        className="dropdown-item leave"
                      >
                        Leave Room
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleSearchSelect = async (item) => {
    if (item.type === "room") {
      handleJoinRoomDirect(item.roomId);
    } else if (item.type === "sandbox") {
      try {
        const data = await createRoom(`Sandbox (${item.language})`, item.language, true);
        triggerGateAndNavigate(data.room.roomId);
      } catch (error) {
        alert(error.response?.data?.message || error.message);
      }
    } else if (item.type === "view-profile") {
      handleViewUserProfile(item.userId);
    }
  };

  const getCoderRank = (points) => {
    if (points >= 400) return { title: "Antigravity Architect 🌌", nextLimit: Infinity, prevLimit: 400, color: "var(--ce-accent, #8b5cf6)", badgeClass: "rank-architect" };
    if (points >= 150) return { title: "Hackathon Hero 🏆", nextLimit: 400, prevLimit: 150, color: "var(--ce-warning, #f59e0b)", badgeClass: "rank-hero" };
    if (points >= 50) return { title: "Code Artisan 🛠️", nextLimit: 150, prevLimit: 50, color: "var(--ce-success, #10b981)", badgeClass: "rank-artisan" };
    return { title: "Junior Coder 💻", nextLimit: 50, prevLimit: 0, color: "var(--ce-primary, #3b82f6)", badgeClass: "rank-junior" };
  };

  const rank = getCoderRank(stats.totalPoints || 0);
  const nextRankPoints = rank.nextLimit - rank.prevLimit;
  const currentRankPoints = (stats.totalPoints || 0) - rank.prevLimit;
  const progressPercent = rank.nextLimit === Infinity ? 100 : Math.min(100, Math.max(0, (currentRankPoints / nextRankPoints) * 100));

  const dashboardNotifications = notificationsList
    .filter(notif => !notif.isRead)
    .map(notif => {
      let actionText = "";
      if (notif.type === "FOLLOW") actionText = "followed you";
      else if (notif.type === "LIKE") actionText = `liked room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "BOOKMARK") actionText = `bookmarked room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN") actionText = `wants to join "${notif.targetRoom?.title || "workspace"}"`;
      return {
        id: notif._id,
        message: `${notif.sender?.username || "Someone"} ${actionText}`,
        time: notif.createdAt
      };
    });

  if (isMaintenance) {
    return (
      <div className="maintenance-lockout-overlay" style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(10, 10, 14, 0.97)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        fontFamily: "var(--sans)",
        color: "var(--text-h)"
      }}>
        <div className="maintenance-lockout-card glass-panel" style={{
          maxWidth: "450px",
          padding: "40px 30px",
          background: "rgba(255, 255, 255, 0.015)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--shadow)",
          textAlign: "center"
        }}>
          <div className="lockout-pulse-icon" style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto"
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "750", color: "#f3f4f6", margin: "0 0 10px 0" }}>System Under Maintenance</h2>
          <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: "0 0 24px 0", lineHeight: "1.45" }}>
            CodeExpo is currently undergoing scheduled platform diagnostics and service optimization.
          </p>
          <div style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "20px",
            fontSize: "0.78rem",
            color: "#ef4444",
            fontWeight: "600"
          }}>
            Please check back in a few minutes. We apologize for the inconvenience.
          </div>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      notifications={dashboardNotifications}
      clearNotifications={handleMarkAllNotificationsRead}
      onSearchSelect={handleSearchSelect}
    >
      <div className="ce-dashboard-container">
        {activeSection === "dashboard" && (
          <>
            {/* SYSTEM ANNOUNCEMENTS BROADCAST FEED */}
            {activeAnnouncements.filter(ann => !dismissedAnnouncements.includes(ann._id)).length > 0 && (
              <div className="ce-announcements-banner-wrapper">
                {activeAnnouncements
                  .filter(ann => !dismissedAnnouncements.includes(ann._id))
                  .map((ann) => (
                    <div key={ann._id} className={`ce-announcement-card severity-${ann.severity.toLowerCase()}`}>
                      <div className="announcement-content-row">
                        <div className="announcement-icon-box">
                          {ann.severity === "WARNING" && <Wrench size={16} />}
                          {ann.severity === "CRITICAL" && <ShieldAlert size={16} />}
                          {ann.severity === "SUCCESS" && <Sparkles size={16} />}
                          {ann.severity === "INFO" && <Megaphone size={16} />}
                        </div>
                        <div className="announcement-text-box">
                          <h5 className="announcement-title">
                            <span className="announcement-badge-type">{ann.type}</span>
                            {ann.title}
                          </h5>
                          <p className="announcement-body">{ann.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismissAnnouncement(ann._id)}
                          className="btn-announcement-dismiss"
                          aria-label="Dismiss Announcement"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="dashboard-grid-layout">

            {/* STATS SUMMARY GRID */}
            <div className="ce-stats-grid">

              {/* Card 1: Developer Rank Gamification */}
              <div className="compact-stat-card gamification-card">
                <div className={`stat-card-icon-wrapper rank-icon-wrapper ${rank.badgeClass}`}>
                  <Trophy size={18} />
                </div>
                <div className="stat-card-info gamification-info">
                  <span className="stat-card-label">Developer Tier</span>
                  <span className="stat-card-val rank-title-text" style={{ color: rank.color }}>
                    {rank.title}
                  </span>

                  <div className="tier-progress-container">
                    <div className="tier-progress-track">
                      <div className="tier-progress-bar" style={{ width: `${progressPercent}%`, backgroundColor: rank.color }} />
                    </div>
                    <span className="tier-progress-label">
                      {stats.totalPoints || 0} XP • {rank.nextLimit === Infinity ? "Max Level" : `${rank.nextLimit - (stats.totalPoints || 0)} XP to next`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Rooms Created Breakdown */}
              <div className="compact-stat-card created-rooms-card">
                <div className="stat-card-icon-wrapper blue-theme-wrapper">
                  <FolderGit size={18} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Rooms Created</span>
                  <span className="stat-card-val">{stats.totalCreated}</span>
                  <div className="sub-breakdown-row">
                    <span className="sub-badge public-badge">
                      <Globe size={10} /> {stats.publicCreatedCount} Public
                    </span>
                    <span className="sub-badge private-badge">
                      <Lock size={10} /> {stats.privateCreatedCount} Private
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Joined Workspaces */}
              <div className="compact-stat-card joined-rooms-card">
                <div className="stat-card-icon-wrapper green-theme-wrapper">
                  <Users size={18} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Rooms Joined</span>
                  <span className="stat-card-val">{stats.totalJoined}</span>
                  <span className="stat-card-subtitle">From starting</span>
                </div>
              </div>

              {/* Card 4: Compiler Executions */}
              <div className="compact-stat-card executions-card">
                <div className="stat-card-icon-wrapper purple-theme-wrapper">
                  <Activity size={18} />
                </div>
                <div className="stat-card-info">
                  <span className="stat-card-label">Code Runs</span>
                  <span className="stat-card-val">{stats.executions.toLocaleString()}</span>
                  <span className="stat-card-subtitle">{formatCodingTime(stats.codingHours, stats.codingMinutes)}</span>
                </div>
              </div>

            </div>

            {/* TWO COLUMN GRID */}
            <div className="ce-dashboard-columns">

              {/* LEFT COLUMN */}
              <div className="ce-column-left">

                {/* ACTIVE ROOMS */}
                <section className="ce-dashboard-section">
                  <div className="section-header">
                    <span className="live-indicator-dot"></span>
                    <h3 className="section-title">Active Rooms</h3>
                  </div>

                  {liveRooms.length === 0 ? (
                    <div className="empty-state-card">
                      <Terminal size={18} className="empty-state-icon" />
                      <p>No active rooms currently online.</p>
                    </div>
                  ) : (
                    (() => {
                      const myActive = liveRooms.filter(room => {
                        const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
                        const isParticipant = room.participants?.some(p => String(p._id || p) === String(user?.id || user?._id));
                        return isOwner || isParticipant;
                      });

                      const otherActive = liveRooms.filter(room => {
                        const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
                        const isParticipant = room.participants?.some(p => String(p._id || p) === String(user?.id || user?._id));
                        return !(isOwner || isParticipant);
                      });

                      return (
                        <div style={{ marginTop: "12px" }}>
                          {/* Tabs Switcher */}
                          <div className="profile-tabs-header" style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--ce-border)", paddingBottom: "8px", marginBottom: "16px" }}>
                            <button
                              className={`profile-tab-btn ${activeRoomsTab === "my-active" ? "active" : ""}`}
                              onClick={() => setActiveRoomsTab("my-active")}
                              style={{ background: "none", border: "none", color: activeRoomsTab === "my-active" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: activeRoomsTab === "my-active" ? "2px solid var(--ce-primary)" : "2px solid transparent", cursor: "pointer", outline: "none" }}
                            >
                              My Active Workspaces ({myActive.length})
                            </button>
                            <button
                              className={`profile-tab-btn ${activeRoomsTab === "other-active" ? "active" : ""}`}
                              onClick={() => setActiveRoomsTab("other-active")}
                              style={{ background: "none", border: "none", color: activeRoomsTab === "other-active" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: activeRoomsTab === "other-active" ? "2px solid var(--ce-primary)" : "2px solid transparent", cursor: "pointer", outline: "none" }}
                            >
                              Other Active Workspaces ({otherActive.length})
                            </button>
                          </div>

                          {/* Tab Contents */}
                          {activeRoomsTab === "my-active" && (
                            <div style={{ marginTop: "8px" }}>
                              {myActive.length === 0 ? (
                                <div className="empty-state-card compact">
                                  <p>No active workspaces of yours.</p>
                                </div>
                              ) : (
                                <div className="rooms-grid-explore" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "start" }}>
                                  {myActive.map(room => renderRoomCard(room))}
                                </div>
                              )}
                            </div>
                          )}

                          {activeRoomsTab === "other-active" && (
                            <div style={{ marginTop: "8px" }}>
                              {otherActive.length === 0 ? (
                                <div className="empty-state-card compact">
                                  <p>No other active workspaces online.</p>
                                </div>
                              ) : (
                                <div className="rooms-grid-explore" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "start" }}>
                                  {otherActive.map(room => renderRoomCard(room))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </section>

                {/* UNIFIED SOCIAL FEED */}
                <section className="ce-dashboard-section social-feed-section">
                  <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Activity size={16} className="brand-logo" />
                      <h3 className="section-title">Developer Activity Feed</h3>
                    </div>
                  </div>

                  {feedActivities.length === 0 ? (
                    <div className="empty-state-card">
                      <p>No activity logs recorded. Follow other developers to see their updates here!</p>
                    </div>
                  ) : (
                    <div className="social-activities-list">
                      {feedActivities.map(act => (
                        <div key={act._id} className="social-activity-card" style={{ padding: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--ce-border)", borderRadius: "8px", marginBottom: "8px" }}>
                          <div className="social-activity-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div className="actor-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: act.user?.avatar ? "transparent" : getAvatarColor(act.user?.username || "D") }}>
                                {act.user?.avatar ? (
                                  <img src={act.user.avatar} alt={act.user?.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#fff" }}>{(act.user?.username || "D").charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="actor-meta" style={{ display: "flex", flexDirection: "column" }}>
                                <span className="actor-username" style={{ fontSize: "0.85rem", color: "var(--ce-text)" }}>
                                  <strong>{act.user?.username || "Someone"}</strong>
                                </span>
                                <span className="activity-action-text" style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)" }}>
                                  {act.action} {act.roomTitle ? (
                                    <strong className="clickable-room" onClick={() => act.room?.roomId && handleJoinRoomDirect(act.room.roomId)} style={{ color: "var(--ce-primary)", cursor: "pointer" }}>
                                      {act.roomTitle}
                                    </strong>
                                  ) : act.targetUser ? (
                                    <strong style={{ color: "var(--ce-accent)" }}>{act.targetUser.username}</strong>
                                  ) : ""}
                                </span>
                              </div>
                            </div>
                            <span className="activity-timestamp" style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>
                              {formatLastActive(act.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {feedPage < feedTotalPages && (
                        <button
                          onClick={handleLoadMoreFeed}
                          className="feed-load-more-btn"
                          disabled={feedLoading}
                          style={{ width: "100%", padding: "10px", marginTop: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontWeight: "600" }}
                        >
                          {feedLoading ? "Loading..." : "Load More Activity"}
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* RIGHT COLUMN */}
              <div className="ce-column-right">

                {/* QUICK ACTIONS */}
                <section className="ce-dashboard-section">
                  <h3 className="section-title" style={{ marginBottom: "12px" }}>Quick Actions</h3>
                  <div className="quick-actions-grid-sidebar">
                    <div className="quick-action-card-item create" onClick={() => {
                      setFormData({
                        title: "",
                        language: localStorage.getItem("default_language") || "javascript",
                        isPrivate: false
                      });
                      setShowQuickCreateModal(true);
                    }}>
                      <div className="quick-action-icon-wrapper">
                        <Plus size={18} />
                      </div>
                      <div className="quick-action-details">
                        <h4>Create Room</h4>
                        <p>Launch a collaborative sandbox</p>
                      </div>
                    </div>

                    <div className="quick-action-card-item join" onClick={() => setShowQuickJoinModal(true)}>
                      <div className="quick-action-icon-wrapper">
                        <LogIn size={18} />
                      </div>
                      <div className="quick-action-details">
                        <h4>Join Room</h4>
                        <p>Enter workspace via code ID</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* PENDING JOIN REQUESTS */}
                {joinRequests.length > 0 && (
                  <section className="ce-dashboard-section" style={{ borderColor: "var(--ce-warning)" }}>
                    <div className="section-header">
                      <ShieldAlert size={14} className="warning-theme-color" />
                      <h3 className="section-title">Pending Access Requests</h3>
                    </div>
                    <div className="join-requests-grid">
                      {joinRequests.map(req => (
                        <div key={req.requestId} className="join-request-card">
                          <div className="request-user-info">
                            <div className="req-user-avatar" style={{ backgroundColor: req.user?.avatar ? "transparent" : getAvatarColor(req.username) }}>
                              {req.user?.avatar ? (
                                <img src={req.user.avatar} alt={req.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                req.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="req-details">
                              <strong>{req.username}</strong>
                              <span>wants to join <b>{req.roomTitle}</b></span>
                            </div>
                          </div>
                          <div className="request-actions">
                            <button onClick={() => handleRespondRequest(req.roomId, req.user?._id || req.user, "accept")} className="accept-btn">
                              Accept
                            </button>
                            <button onClick={() => handleRespondRequest(req.roomId, req.user?._id || req.user, "reject")} className="reject-btn">
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* ONLINE FOLLOWS */}
                <section className="ce-dashboard-section">
                  <h3 className="section-title" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="live-indicator-dot" style={{ position: "relative", top: 0 }} /> Online Follows ({onlineFollows.length})
                  </h3>
                  {onlineFollows.length === 0 ? (
                    <div className="empty-state-card compact">
                      <p>No followed developers online.</p>
                    </div>
                  ) : (
                    <div className="online-follows-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {onlineFollows.map(f => (
                        <div key={f._id} className="online-follow-item" onClick={() => handleViewUserProfile(f._id)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", cursor: "pointer" }}>
                          <div className="follow-avatar-wrapper" style={{ position: "relative", width: "28px", height: "28px" }}>
                            {f.avatar ? (
                              <img src={f.avatar} alt={f.username} className="follow-avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div className="follow-avatar-initial" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(f.username), fontSize: "0.78rem", fontWeight: "600", color: "#fff" }}>
                                {f.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="online-badge-dot" style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", border: "1.5px solid var(--ce-bg)" }} />
                          </div>
                          <div className="follow-info" style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                            <span className="follow-name" style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.username}</span>
                            <span className="follow-bio" style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.bio || "No bio yet"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* PEOPLE YOU MAY KNOW */}
                <section className="ce-dashboard-section">
                  <h3 className="section-title" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={14} style={{ color: "var(--ce-accent)" }} /> People You May Know
                  </h3>
                  {suggestions.length === 0 ? (
                    <div className="empty-state-card compact">
                      <p>No suggestions available.</p>
                    </div>
                  ) : (
                    <div className="suggestions-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {suggestions.map(s => (
                        <div key={s._id} className="suggestion-item" style={{ display: "flex", alignItems: "center", justifyItems: "space-between", gap: "10px", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px" }}>
                          <div onClick={() => handleViewUserProfile(s._id)} style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer", minWidth: 0 }}>
                            <div className="suggestion-avatar" style={{ width: "28px", height: "28px", flexShrink: 0, position: "relative" }}>
                              {s.avatar ? (
                                <img src={s.avatar} alt={s.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <div className="suggestion-avatar-initial" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(s.username), fontSize: "0.78rem", fontWeight: "600", color: "#fff" }}>
                                  {s.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {s.isOnline && (
                                <span className="online-badge-dot" style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", border: "1.5px solid var(--ce-bg)" }} />
                              )}
                            </div>
                            <div className="suggestion-details" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span className="suggestion-name" style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.username}</span>
                              <span className="suggestion-reason" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {s.mutualCount > 0 ? `${s.mutualCount} mutual connection${s.mutualCount > 1 ? "s" : ""}` : s.programmingLanguages?.length > 0 ? `Tags: ${s.programmingLanguages.slice(0, 2).join(", ")}` : "Recommended"}
                              </span>
                            </div>
                          </div>
                          <button
                            className="suggestion-follow-btn"
                            onClick={() => handleFollowToggle(s._id)}
                            style={{ padding: "4px 8px", background: "rgba(88, 166, 255, 0.1)", border: "1px solid rgba(88, 166, 255, 0.2)", borderRadius: "4px", color: "var(--ce-primary)", fontSize: "0.7rem", cursor: "pointer", fontWeight: "600", flexShrink: 0 }}
                          >
                            <Plus size={10} style={{ marginRight: "2px", verticalAlign: "middle" }} /> Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* TRENDING ROOMS */}
                <section className="ce-dashboard-section">
                  <h3 className="section-title" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={14} style={{ color: "var(--ce-primary)" }} /> Trending Rooms
                  </h3>
                  {trendingRooms.length === 0 ? (
                    <div className="empty-state-card compact">
                      <p>No trending rooms.</p>
                    </div>
                  ) : (
                    <div className="trending-rooms-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {trendingRooms.map(room => (
                        <div
                          key={room._id}
                          className="trending-room-item"
                          onClick={() => handleJoinRoomDirect(room.roomId)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--ce-border)", borderRadius: "8px", cursor: "pointer", transition: "transform 0.2s" }}
                        >
                          <div className="room-trending-details" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span className="room-trending-title" style={{ fontSize: "0.82rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>🔥 {room.title}</span>
                            <span className="room-trending-meta" style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>
                              {room.language?.toUpperCase()}
                            </span>
                          </div>
                          <button
                            type="button"
                            className={`room-trending-like-btn ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikeRoom(room.roomId);
                            }}
                            style={{
                              background: isRoomLiked(room.roomId) ? "rgba(248, 81, 73, 0.1)" : "rgba(255, 255, 255, 0.03)",
                              border: isRoomLiked(room.roomId) ? "1px solid rgba(248, 81, 73, 0.2)" : "1px solid var(--ce-border)",
                              color: isRoomLiked(room.roomId) ? "var(--ce-danger, #f85149)" : "var(--ce-text)",
                              cursor: "pointer",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              transition: "all 0.35s ease",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px"
                            }}
                            title={isRoomLiked(room.roomId) ? "Unlike Room" : "Like Room"}
                          >
                            <Heart
                              size={12}
                              fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                              style={{
                                transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                              }}
                            />
                            <span style={{ fontSize: "0.68rem", fontWeight: "600" }}>{room.likesCount || 0}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* SPONSORED PROMOTIONS */}
                {activeAds.length > 0 && (
                  <section className="ce-dashboard-section sponsored-ads-section">
                    <h3 className="section-title text-warning" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={14} style={{ color: "var(--ce-warning)" }} /> Sponsored Promotions
                    </h3>
                    <div className="sponsored-ads-container" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {activeAds.map(ad => (
                        <a
                          key={ad._id}
                          href={ad.redirectUrl || undefined}
                          target={ad.redirectUrl ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className="sponsored-ad-card"
                          style={{
                            display: "block",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid var(--ce-border)",
                            borderRadius: "10px",
                            overflow: "hidden",
                            textDecoration: "none",
                            color: "inherit",
                            transition: "all 0.3s ease"
                          }}
                        >
                          <div className="sponsored-ad-image-wrapper" style={{ position: "relative", width: "100%", height: "140px", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="sponsored-ad-image"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                transition: "transform 0.5s ease"
                              }}
                            />
                            <span className="sponsored-tag" style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: "rgba(0, 0, 0, 0.75)",
                              color: "var(--ce-warning)",
                              fontSize: "0.58rem",
                              fontWeight: "800",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 215, 0, 0.3)",
                              letterSpacing: "1px"
                            }}>
                              SPONSORED
                            </span>
                          </div>
                          <div className="sponsored-ad-details" style={{ padding: "10px 12px" }}>
                            <h4 className="sponsored-ad-title" style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--ce-text)", margin: "0 0 4px 0", lineHeight: "1.3" }}>
                              {ad.title}
                            </h4>
                            {ad.redirectUrl && (
                              <span className="sponsored-ad-link" style={{ fontSize: "0.68rem", color: "var(--ce-primary)", display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                                {ad.redirectUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]} ↗
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </>
      )}

        {/* ROOMS & ACTIONS SECTION */}
        {activeSection === "rooms" && (
          <div className="rooms-section-container">
            <div className="rooms-split-layout">
              {/* Left Side: Actions */}
              <div className="rooms-actions-sidebar">
                {/* CREATE WORKSPACE */}
                <div className="action-form-card">
                  <div className="form-card-header">
                    <Plus size={18} className="form-icon" />
                    <h3>Create Workspace Room</h3>
                  </div>
                  <form onSubmit={handleCreateRoom} className="compact-form">
                    <div className="form-field">
                      <label>Workspace Title</label>
                      <input
                        type="text"
                        placeholder="e.g. DSA Practice Prep"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label>Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Privacy Type</label>
                      <select
                        value={formData.isPrivate}
                        onChange={(e) => setFormData({ ...formData, isPrivate: e.target.value === "true" })}
                      >
                        <option value="false">Public</option>
                        <option value="true">Private (Requires Approval)</option>
                      </select>
                    </div>

                    <button type="submit" className="form-submit-btn" style={{ marginTop: "6px" }}>
                      Create Room Workspace
                    </button>
                  </form>
                </div>

                {/* JOIN WORKSPACE */}
                <div className="action-form-card">
                  <div className="form-card-header">
                    <LogIn size={18} className="form-icon" />
                    <h3>Join Room Workspace</h3>
                  </div>
                  <form onSubmit={handleJoinRoom} className="compact-form">
                    <div className="form-field">
                      <label>Workspace Room ID Code</label>
                      <input
                        type="text"
                        placeholder="Enter room hash token"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="form-submit-btn secondary" style={{ marginTop: "6px" }}>
                      Join Workspace Session
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Side: Explorer tabs */}
              <div className="rooms-explorer-content">
                {/* Tabs switcher */}
                <div className="profile-tabs-header">
                  <button
                    className={`profile-tab-btn ${roomsTab === "recent" ? "active" : ""}`}
                    onClick={() => setRoomsTab("recent")}
                  >
                    Continue Coding ({recentRooms.length})
                  </button>
                  <button
                    className={`profile-tab-btn ${roomsTab === "public" ? "active" : ""}`}
                    onClick={() => setRoomsTab("public")}
                  >
                    Explore Public ({publicRooms.length})
                  </button>
                  <button
                    className={`profile-tab-btn ${roomsTab === "myrooms" ? "active" : ""}`}
                    onClick={() => setRoomsTab("myrooms")}
                  >
                    My Rooms ({historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length})
                  </button>
                </div>

                {roomsTab === "recent" && (
                  <div style={{ marginTop: "8px" }}>
                    {(() => {
                      const filteredRecent = recentRooms.filter(room => {
                        const term = continueCodingSearch.toLowerCase();
                        return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                      });

                      const activeRecent = filteredRecent.filter(room => (room.activeUsersCount || 0) > 0);
                      const offlineRecent = filteredRecent.filter(room => (room.activeUsersCount || 0) === 0);

                      return (
                        <>
                          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Clock size={16} className="brand-logo" />
                              <h3 className="section-title">Continue Coding</h3>
                            </div>
                            {recentRooms.length > 0 && (
                              <div className="section-search-container">
                                <Search size={13} className="section-search-icon" />
                                <input
                                  type="text"
                                  placeholder="Search by ID or name..."
                                  value={continueCodingSearch}
                                  onChange={(e) => setContinueCodingSearch(e.target.value)}
                                  className="section-search-input"
                                />
                              </div>
                            )}
                          </div>

                          {recentRooms.length === 0 ? (
                            <div className="empty-state-card">
                              <Terminal size={18} className="empty-state-icon" />
                              <p>No recently opened rooms. Create a room on the left to begin!</p>
                            </div>
                          ) : filteredRecent.length === 0 ? (
                            <div className="empty-state-card">
                              <Search size={18} className="empty-state-icon" />
                              <p>No recently opened rooms match "{continueCodingSearch}".</p>
                            </div>
                          ) : (
                            <div className="dashboard-split-layout">
                              {/* ACTIVE RECENT ROOMS COLUMN */}
                              <div className="split-column">
                                <h4 className="split-column-title">
                                  <span className="live-indicator-dot" />
                                  Active Rooms ({activeRecent.length})
                                </h4>
                                {activeRecent.length === 0 ? (
                                  <div className="empty-state-card compact">
                                    <p>No active rooms match your search.</p>
                                  </div>
                                ) : (
                                  <div className="split-column-cards-list">
                                    {activeRecent
                                      .slice(0, showAllActiveContinueCoding ? undefined : 2)
                                      .map(room => renderRoomCard(room))}
                                  </div>
                                )}
                                {activeRecent.length > 2 && (
                                  <button
                                    onClick={() => setShowAllActiveContinueCoding(!showAllActiveContinueCoding)}
                                    className="split-column-toggle-btn"
                                  >
                                    <span>{showAllActiveContinueCoding ? "Show Less" : "Show All"}</span>
                                    <ChevronDown size={14} style={{ transform: showAllActiveContinueCoding ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                                  </button>
                                )}
                              </div>

                              {/* OFFLINE RECENT ROOMS COLUMN */}
                              <div className="split-column">
                                <h4 className="split-column-title">
                                  <span className="offline-indicator-dot" />
                                  Offline Rooms ({offlineRecent.length})
                                </h4>
                                {offlineRecent.length === 0 ? (
                                  <div className="empty-state-card compact">
                                    <p>No offline rooms match your search.</p>
                                  </div>
                                ) : (
                                  <div className="split-column-cards-list">
                                    {offlineRecent
                                      .slice(0, showAllOfflineContinueCoding ? undefined : 2)
                                      .map(room => renderRoomCard(room))}
                                  </div>
                                )}
                                {offlineRecent.length > 2 && (
                                  <button
                                    onClick={() => setShowAllOfflineContinueCoding(!showAllOfflineContinueCoding)}
                                    className="split-column-toggle-btn"
                                  >
                                    <span>{showAllOfflineContinueCoding ? "Show Less" : "Show All"}</span>
                                    <ChevronDown size={14} style={{ transform: showAllOfflineContinueCoding ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {roomsTab === "public" && (
                  <div style={{ marginTop: "8px" }}>
                    <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Globe size={16} className="brand-logo" />
                        <h3 className="section-title">Explore Public Workspaces</h3>
                      </div>
                      {publicRooms.length > 0 && (
                        <div className="section-search-container">
                          <Search size={13} className="section-search-icon" />
                          <input
                            type="text"
                            placeholder="Search public rooms..."
                            value={publicRoomsSearch}
                            onChange={(e) => setPublicRoomsSearch(e.target.value)}
                            className="section-search-input"
                          />
                        </div>
                      )}
                    </div>

                    {publicRooms.length === 0 ? (
                      <div className="empty-state-card">
                        <Globe size={18} className="empty-state-icon" />
                        <p>No public workspaces found. Be the first to create one!</p>
                      </div>
                    ) : (() => {
                      const filteredPublic = publicRooms.filter(room => {
                        const term = publicRoomsSearch.toLowerCase();
                        return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                      });

                      if (filteredPublic.length === 0) {
                        return (
                          <div className="empty-state-card">
                            <Search size={18} className="empty-state-icon" />
                            <p>No public rooms match "{publicRoomsSearch}".</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="rooms-grid-explore" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", alignItems: "start" }}>
                            {filteredPublic
                              .slice(0, showAllPublicRooms ? undefined : 6)
                              .map(room => renderRoomCard(room))}
                          </div>
                          {filteredPublic.length > 6 && (
                            <button
                              onClick={() => setShowAllPublicRooms(!showAllPublicRooms)}
                              className="split-column-toggle-btn"
                              style={{ marginTop: "16px" }}
                            >
                              <span>{showAllPublicRooms ? "Show Less" : "Show All"}</span>
                              <ChevronDown size={14} style={{ transform: showAllPublicRooms ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {roomsTab === "myrooms" && (
                  <div style={{ marginTop: "8px" }}>
                    <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FolderGit size={16} className="brand-logo" />
                        <h3 className="section-title">My Workspaces</h3>
                      </div>
                      {historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length > 0 && (
                        <div className="section-search-container">
                          <Search size={13} className="section-search-icon" />
                          <input
                            type="text"
                            placeholder="Search your workspaces..."
                            value={myRoomsTabSearch}
                            onChange={(e) => setMyRoomsTabSearch(e.target.value)}
                            className="section-search-input"
                          />
                        </div>
                      )}
                    </div>

                    {(() => {
                      const ownedRooms = historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id);

                      if (ownedRooms.length === 0) {
                        return (
                          <div className="empty-state-card">
                            <FolderGit size={18} className="empty-state-icon" />
                            <p>No owned workspaces found. Create a room on the left to begin!</p>
                          </div>
                        );
                      }

                      const filteredOwned = ownedRooms.filter(room => {
                        const term = myRoomsTabSearch.toLowerCase();
                        return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                      });

                      if (filteredOwned.length === 0) {
                        return (
                          <div className="empty-state-card">
                            <Search size={18} className="empty-state-icon" />
                            <p>No owned rooms match "{myRoomsTabSearch}".</p>
                          </div>
                        );
                      }

                      // Split into Active and Offline owned rooms
                      const activeOwnedTab = filteredOwned.filter(room => {
                        const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                        return roomFromLive && (roomFromLive.activeUsersCount || 0) > 0;
                      });

                      const offlineOwnedTab = filteredOwned.filter(room => {
                        const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                        return !roomFromLive || (roomFromLive.activeUsersCount || 0) === 0;
                      });

                      return (
                        <div className="dashboard-split-layout">
                          {/* ACTIVE OWNED ROOMS COLUMN */}
                          <div className="split-column">
                            <h4 className="split-column-title">
                              <span className="live-indicator-dot" />
                              Active Rooms ({activeOwnedTab.length})
                            </h4>
                            {activeOwnedTab.length === 0 ? (
                              <div className="empty-state-card compact">
                                <p>No active rooms match your search.</p>
                              </div>
                            ) : (
                              <div className="split-column-cards-list">
                                {activeOwnedTab
                                  .slice(0, showAllActiveMyRoomsTab ? undefined : 3)
                                  .map(room => {
                                    // Match current dynamic count/users from liveRooms if online
                                    const liveRoomObj = liveRooms.find(lr => lr.roomId === room.roomId);
                                    return renderRoomCard(liveRoomObj || room);
                                  })}
                              </div>
                            )}
                            {activeOwnedTab.length > 3 && (
                              <button
                                onClick={() => setShowAllActiveMyRoomsTab(!showAllActiveMyRoomsTab)}
                                className="split-column-toggle-btn"
                                style={{ marginTop: "12px" }}
                              >
                                <span>{showAllActiveMyRoomsTab ? "Show Less" : "Show All"}</span>
                                <ChevronDown size={14} style={{ transform: showAllActiveMyRoomsTab ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                              </button>
                            )}
                          </div>

                          {/* OFFLINE OWNED ROOMS COLUMN */}
                          <div className="split-column">
                            <h4 className="split-column-title">
                              <span className="offline-indicator-dot" />
                              Offline Rooms ({offlineOwnedTab.length})
                            </h4>
                            {offlineOwnedTab.length === 0 ? (
                              <div className="empty-state-card compact">
                                <p>No offline rooms match your search.</p>
                              </div>
                            ) : (
                              <div className="split-column-cards-list">
                                {offlineOwnedTab
                                  .slice(0, showAllOfflineMyRoomsTab ? undefined : 3)
                                  .map(room => renderRoomCard(room))}
                              </div>
                            )}
                            {offlineOwnedTab.length > 3 && (
                              <button
                                onClick={() => setShowAllOfflineMyRoomsTab(!showAllOfflineMyRoomsTab)}
                                className="split-column-toggle-btn"
                                style={{ marginTop: "12px" }}
                              >
                                <span>{showAllOfflineMyRoomsTab ? "Show Less" : "Show All"}</span>
                                <ChevronDown size={14} style={{ transform: showAllOfflineMyRoomsTab ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ROOM HISTORY SECTION */}
        {activeSection === "history" && (
          <div className="history-section-container">
            <div className="history-table-controls">
              <div className="search-bar-container">
                <Search size={14} className="control-search-icon" />
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>

              <div className="filter-controls">
                <SlidersHorizontal size={14} />
                <select value={historyFilterLang} onChange={(e) => setHistoryFilterLang(e.target.value)}>
                  <option value="all">All Languages</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                </select>

                <select value={historySortBy} onChange={(e) => setHistorySortBy(e.target.value)}>
                  <option value="recent">Sort by: Recent</option>
                  <option value="name">Sort by: Name</option>
                  <option value="created">Sort by: Date Created</option>
                </select>
              </div>
            </div>

            <div className="history-table-wrapper">
              <table className="history-data-table">
                <thead>
                  <tr>
                    <th>Room Workspace</th>
                    <th>Language</th>
                    <th>Participants</th>
                    <th>Owner</th>
                    <th>Last Activity</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "var(--ce-text-muted)" }}>No rooms match your filter.</td>
                    </tr>
                  ) : (
                    filteredHistory.map(room => {
                      const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
                      return (
                        <tr key={room.roomId}>
                          <td>
                            <div className="table-room-title">🚀 {room.title}</div>
                            <div className="table-room-id">{room.roomId}</div>
                          </td>
                          <td>
                            <span className="lang-badge-small">{room.language?.toUpperCase()}</span>
                          </td>
                          <td>
                            <span className="participants-count">{room.participants?.length || 1} online</span>
                          </td>
                          <td>
                            <span className="participants-count">{isOwner ? "You" : room.createdBy?.username || "Collaborator"}</span>
                          </td>
                          <td>
                            {new Date(room.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="text-right">
                            <button onClick={() => triggerGateAndNavigate(room.roomId)} className="history-resume-btn">
                              Resume
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WHITEBOARDS TAB SECTION */}
        {activeSection === "whiteboards" && (
          <div className="history-section-container">
            <div className="section-header" style={{ marginBottom: "16px" }}>
              <Palette size={16} className="brand-logo" />
              <h3 className="section-title">Collaborative Whiteboards</h3>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)", marginBottom: "16px" }}>
              Click any workspace below to open directly into collaborative whiteboard canvas mode.
            </p>
            <div className="whiteboards-list">
              {historyRooms.length === 0 ? (
                <div className="empty-state-card">
                  <p>No active workspaces found. Create a room first to access the whiteboard canvas.</p>
                </div>
              ) : (
                historyRooms.map(room => (
                  <div key={room.roomId} className="whiteboard-item">
                    <div className="whiteboard-item-left">
                      <Palette size={16} style={{ color: "var(--ce-primary)" }} />
                      <div>
                        <div className="wb-title">{room.title} Whiteboard Canvas</div>
                        <div className="wb-desc">Associated Room ID: {room.roomId} • {room.language}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerGateAndNavigate(room.roomId)}
                      className="history-resume-btn"
                    >
                      Open Canvas
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS FEED SECTION */}
        {activeSection === "notifications" && (
          <div className="history-section-container">
            <div className="section-header" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Bell size={16} className="brand-logo" />
                <h3 className="section-title">System & Social Notifications</h3>
              </div>
              {unreadNotificationsCount > 0 && (
                <button onClick={handleMarkAllNotificationsRead} className="history-resume-btn" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notifications-list">
              {joinRequests.length > 0 && joinRequests.map(req => (
                <div key={req.requestId} className="notification-item" style={{ borderColor: "var(--ce-warning)", padding: "12px", borderLeft: "2px solid var(--ce-warning)", background: "rgba(255,255,255,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "6px", marginBottom: "8px" }}>
                  <div className="notification-item-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ShieldAlert size={16} style={{ color: "var(--ce-warning)" }} />
                    <div>
                      <div className="notif-title" style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--ce-text)" }}>Join Request Approval Pending</div>
                      <div className="notif-desc" style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)" }}><b>{req.username}</b> requested to access private room <b>{req.roomTitle}</b>.</div>
                    </div>
                  </div>
                  <button onClick={() => navigate("/dashboard")} className="history-resume-btn" style={{ fontSize: "0.75rem", padding: "4px 10px" }}>
                    Review
                  </button>
                </div>
              ))}

              {notificationsList.length === 0 ? (
                <div className="empty-state-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px" }}>
                  <Bell size={24} style={{ color: "var(--ce-text-muted)", marginBottom: "8px" }} />
                  <p style={{ color: "var(--ce-text-muted)", fontSize: "0.85rem" }}>You have no notifications yet.</p>
                </div>
              ) : (
                notificationsList.map(notif => {
                  const isRead = notif.isRead;
                  const senderName = notif.sender?.username || "Someone";
                  const senderAvatar = notif.sender?.avatar;
                  const roomTitle = notif.targetRoom?.title || "workspace";
                  const roomLink = notif.targetRoom?.roomId;

                  let notifIcon = <Bell size={14} />;
                  let actionText = "";

                  if (notif.type === "FOLLOW") {
                    notifIcon = <Users size={14} style={{ color: "var(--ce-primary)" }} />;
                    actionText = "followed you";
                  } else if (notif.type === "LIKE") {
                    notifIcon = <Heart size={14} style={{ color: "#ef4444" }} />;
                    actionText = `liked your room "${roomTitle}"`;
                  } else if (notif.type === "BOOKMARK") {
                    notifIcon = <Bookmark size={14} style={{ color: "var(--ce-accent)" }} />;
                    actionText = `bookmarked your room "${roomTitle}"`;
                  } else if (notif.type === "JOIN") {
                    notifIcon = <ShieldAlert size={14} style={{ color: "var(--ce-warning)" }} />;
                    actionText = `wants to join "${roomTitle}"`;
                  }

                  return (
                    <div
                      key={notif._id}
                      className={`notification-item ${isRead ? "read" : "unread"}`}
                      style={{
                        borderLeft: isRead ? "2px solid transparent" : "2px solid var(--ce-primary)",
                        padding: "12px",
                        background: isRead ? "rgba(255,255,255,0.01)" : "rgba(88, 166, 255, 0.03)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: "6px",
                        marginBottom: "8px",
                        cursor: "pointer"
                      }}
                      onClick={() => !isRead && handleMarkOneNotificationRead(notif._id)}
                    >
                      <div className="notification-item-left" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="notif-category-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }}>
                          {notifIcon}
                        </div>
                        <div className="notif-sender-avatar" style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: senderAvatar ? "transparent" : getAvatarColor(senderName) }}>
                          {senderAvatar ? (
                            <img src={senderAvatar} alt={senderName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "600" }}>{senderName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="notif-desc" style={{ fontSize: "0.8rem", color: "var(--ce-text)" }}>
                            <strong>{senderName}</strong> {actionText}
                          </div>
                          <div className="notif-category-badge" style={{ fontSize: "0.6rem", padding: "1px 5px", borderRadius: "3px", display: "inline-block", marginTop: "4px", background: "rgba(255,255,255,0.05)", textTransform: "uppercase", color: "var(--ce-text-muted)" }}>
                            {notif.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="notif-time" style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>{formatLastActive(notif.createdAt)}</span>
                        {roomLink && (
                          <button onClick={(e) => { e.stopPropagation(); triggerGateAndNavigate(roomLink); }} className="history-resume-btn" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>
                            View Room
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* PROFILE SECTION */}
        {activeSection === "profile" && (
          <div className="profile-section-container">
            <div className="github-profile-layout" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px" }}>

              {/* Profile Card Header / Sidebar */}
              <div className="profile-sidebar-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {viewingUserProfile ? (
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: viewingUserProfile.avatar ? "transparent" : getAvatarColor(viewingUserProfile.username), fontSize: "1.8rem", color: "#fff", fontWeight: "600", border: "2px solid var(--ce-border)" }}>
                    {viewingUserProfile.avatar ? (
                      <img src={viewingUserProfile.avatar} alt={viewingUserProfile.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      viewingUserProfile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                ) : (
                  <ProfileAvatar />
                )}
                <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--ce-text)", marginTop: "12px", marginBottom: "2px" }}>{viewingUserProfile ? viewingUserProfile.username : user?.username}</h2>
                <span className="profile-email" style={{ fontSize: "0.75rem", color: "var(--ce-text-muted)", marginBottom: "8px" }}>{viewingUserProfile ? viewingUserProfile.email : user?.email}</span>
                <span
                  className="profile-badge"
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: "700",
                    display: "inline-block",
                    ...getBadgeStyle(viewingUserProfile ? viewingUserProfile.title : user?.title)
                  }}
                >
                  {viewingUserProfile ? viewingUserProfile.title : user?.title || "Developer"}
                </span>

                {/* Followers & Following Statistics Count */}
                <div className="profile-social-stats" style={{ display: "flex", gap: "16px", marginTop: "16px", borderTop: "1px solid var(--ce-border)", borderBottom: "1px solid var(--ce-border)", width: "100%", padding: "12px 0", justifyContent: "space-around" }}>
                  <div className="profile-stat-click" onClick={() => { setLoadingModalData(true); setShowFollowersModal(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                    <strong style={{ fontSize: "1rem", color: "var(--ce-text)" }}>{viewingUserProfile ? viewingUserProfile.followersCount : user?.followersCount || 0}</strong>
                    <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>Followers</span>
                  </div>
                  <div className="profile-stat-click" onClick={() => { setLoadingModalData(true); setShowFollowingModal(true); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                    <strong style={{ fontSize: "1rem", color: "var(--ce-text)" }}>{viewingUserProfile ? viewingUserProfile.followingCount : user?.followingCount || 0}</strong>
                    <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>Following</span>
                  </div>
                </div>

                {/* Profile Bio Details & Update Form */}
                {isEditingProfile && !viewingUserProfile ? (
                  <div className="profile-edit-form-card" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: "12px" }}>
                    <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Bio</label>
                      <textarea
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                        placeholder="Write a bio..."
                        className="profile-edit-textarea"
                        style={{ width: "100%", minHeight: "60px", background: "rgba(128, 128, 128, 0.08)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem", resize: "none" }}
                      />
                    </div>
                    <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Languages</label>
                      <input
                        type="text"
                        value={langsInput}
                        onChange={(e) => setLangsInput(e.target.value)}
                        placeholder="e.g. JavaScript, Python"
                        className="profile-edit-input"
                        style={{ width: "100%", background: "rgba(128, 128, 128, 0.08)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="profile-edit-save-btn" onClick={handleSaveProfile} style={{ flex: 1, padding: "6px", background: "var(--ce-primary)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600" }}>
                        Save
                      </button>
                      <button className="profile-edit-cancel-btn" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "6px", background: "rgba(255,255,255,0.05)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: "100%" }}>
                    <p className="profile-bio-text" style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)", marginTop: "12px", textAlign: "center", fontStyle: "italic", lineHeight: "1.4" }}>
                      {viewingUserProfile ? viewingUserProfile.bio || "No bio yet." : user?.bio || "No bio set yet. Click Edit Profile below to tell developers about yourself!"}
                    </p>
                    {((viewingUserProfile ? viewingUserProfile.programmingLanguages : user?.programmingLanguages) || []).length > 0 && (
                      <div className="profile-languages-chips" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "12px", justifyContent: "center" }}>
                        {(viewingUserProfile ? viewingUserProfile.programmingLanguages : user.programmingLanguages).map(lang => (
                          <span key={lang} className="lang-chip-badge" style={{ fontSize: "0.62rem", padding: "2px 6px", background: "rgba(88, 166, 255, 0.08)", color: "var(--ce-primary)", borderRadius: "4px", border: "1px solid rgba(88, 166, 255, 0.15)", fontWeight: "600" }}>
                            {lang}
                          </span>
                        ))}
                      </div>
                    )}
                    {viewingUserProfile ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                        {String(viewingUserProfile._id) !== String(user?.id || user?._id) && (
                          followingList.some(f => String(f._id || f) === String(viewingUserProfile._id)) ? (
                            <button
                              className="profile-follow-btn unfollow"
                              onClick={async () => {
                                await handleFollowToggle(viewingUserProfile._id);
                                const res = await getUserPublicProfile(viewingUserProfile._id);
                                if (res.success) {
                                  setViewingUserProfile(res.user);
                                  setViewingUserStats(res.stats || null);
                                }
                              }}
                              style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text-muted)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", transition: "all 0.2s" }}
                            >
                              Unfollow
                            </button>
                          ) : (
                            <button
                              className="profile-follow-btn follow"
                              onClick={async () => {
                                await handleFollowToggle(viewingUserProfile._id);
                                const res = await getUserPublicProfile(viewingUserProfile._id);
                                if (res.success) {
                                  setViewingUserProfile(res.user);
                                  setViewingUserStats(res.stats || null);
                                }
                              }}
                              style={{ width: "100%", padding: "8px", background: "var(--ce-primary)", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", transition: "all 0.2s" }}
                            >
                              Follow
                            </button>
                          )
                        )}
                        <button
                          className="profile-back-btn"
                          onClick={() => setViewingUserProfile(null)}
                          style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                        >
                          <ArrowLeft size={13} /> Back to My Profile
                        </button>
                      </div>
                    ) : (
                      <button className="profile-edit-trigger-btn" onClick={startEditingProfile} style={{ width: "100%", marginTop: "16px", padding: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", transition: "all 0.2s" }}>
                        Edit Profile
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Main Content */}
              <div className="profile-main-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <ContributionHeatmap
                  rawHeatmap={viewingUserProfile ? (viewingUserStats?.heatmap || []) : (heatmap || [])}
                  selectedYear={selectedYear}
                  onYearChange={viewingUserProfile ? handleTargetYearChange : handleYearChange}
                  availableYears={viewingUserProfile ? (viewingUserStats?.years || [new Date().getFullYear()]) : ownYears}
                />

                {/* Achievements Card */}
                <div className="profile-sec-card">
                  <h3>Achievements</h3>
                  <div className="achievements-container">
                    <div className="achievement-badge-card" title="Created more than 5 rooms">
                      <Sparkles size={14} className="badge-icon gold" />
                      <span>Creator Pro</span>
                    </div>
                    <div className="achievement-badge-card" title="Collaborated in a room">
                      <Users size={14} className="badge-icon blue" />
                      <span>Team Player</span>
                    </div>
                    <div className="achievement-badge-card" title="Executed JavaScript code">
                      <Terminal size={14} className="badge-icon green" />
                      <span>Script Master</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Tab Panels for Liked/Saved Rooms, created Rooms & Logs */}
                <div className="profile-tabs-container">
                  <div className="profile-tabs-header">
                    <button className={`profile-tab-btn ${profileTab === "rooms" ? "active" : ""}`} onClick={() => setProfileTab("rooms")}>
                      {viewingUserProfile ? "Rooms" : "My Rooms"} ({viewingUserProfile ? viewingUserRooms.length : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length})
                    </button>
                    <button className={`profile-tab-btn ${profileTab === "liked" ? "active" : ""}`} onClick={() => setProfileTab("liked")}>
                      Liked ({viewingUserProfile ? viewingUserLikedRooms.length : likedRooms.length})
                    </button>
                    {!viewingUserProfile && (
                      <button className={`profile-tab-btn ${profileTab === "saved" ? "active" : ""}`} onClick={() => setProfileTab("saved")}>
                        Saved ({savedRooms.length})
                      </button>
                    )}
                    {!viewingUserProfile && (
                      <button className={`profile-tab-btn ${profileTab === "activity" ? "active" : ""}`} onClick={() => setProfileTab("activity")}>
                        Recent Logs
                      </button>
                    )}
                  </div>

                  <div className="profile-tab-content">
                    {profileTab === "rooms" && (
                      <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                        {(viewingUserProfile ? viewingUserRooms : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id)).length === 0 ? (
                          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No rooms created yet.</p>
                        ) : (
                          (viewingUserProfile ? viewingUserRooms : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id)).map(room => (
                            <div key={room.roomId} className="profile-room-card" onClick={() => triggerGateAndNavigate(room.roomId)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer", position: "relative" }}>
                              <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                              <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                              <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>ID: {room.roomId}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>{new Date(room.createdAt).toLocaleDateString()}</span>
                                  {room.likedBy && room.likedBy.length > 0 && (
                                    <div className="card-likes-avatars-stack" style={{ display: "flex", alignItems: "center", marginLeft: "4px" }}>
                                      {room.likedBy.slice(0, 3).map((u, i) => (
                                        <div
                                          key={i}
                                          className="avatar-stack-item"
                                          style={{
                                            width: "14px",
                                            height: "14px",
                                            borderRadius: "50%",
                                            overflow: "hidden",
                                            border: "1px solid var(--ce-border)",
                                            marginLeft: i > 0 ? "-4px" : "0",
                                            zIndex: 10 - i,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "var(--ce-bg-sidebar)"
                                          }}
                                          title={`Liked by ${u.username}`}
                                        >
                                          {u.avatar ? (
                                            <img src={u.avatar} alt={u.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                          ) : (
                                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.45rem", fontWeight: "700", color: "#fff", backgroundColor: getAvatarColor(u.username || "D") }}>
                                              {(u.username || "D").charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                      {room.likedBy.length > 3 && (
                                        <span style={{ fontSize: "0.58rem", color: "var(--ce-text-muted)", marginLeft: "3px" }} title={room.likedBy.slice(3).map(u => u.username).join(", ")}>
                                          +{room.likedBy.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                                    onClick={() => handleLikeRoom(room.roomId)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: isRoomLiked(room.roomId) ? "var(--ce-danger, #f85149)" : "var(--ce-text)",
                                      padding: "2px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      transition: "color 0.35s ease, transform 0.2s ease"
                                    }}
                                  >
                                    <Heart
                                      size={12}
                                      fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                      style={{
                                        transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                                      }}
                                    />
                                    <span style={{ fontSize: "0.68rem" }}>{room.likesCount || 0}</span>
                                  </button>
                                  <button onClick={() => handleBookmarkRoom(room.roomId)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ce-text-muted)", padding: "2px" }}><Bookmark size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {profileTab === "liked" && (
                      <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                        {(viewingUserProfile ? viewingUserLikedRooms : likedRooms).length === 0 ? (
                          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No liked rooms.</p>
                        ) : (
                          (viewingUserProfile ? viewingUserLikedRooms : likedRooms).map(room => (
                            <div key={room.roomId} className="profile-room-card" onClick={() => triggerGateAndNavigate(room.roomId)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer" }}>
                              <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                              <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                              <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>By {room.createdBy?.username || "Developer"}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                                <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>Liked</span>
                                <button
                                  type="button"
                                  className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); handleLikeRoom(room.roomId); }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--ce-danger, #f85149)",
                                    padding: "2px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    transition: "color 0.35s ease, transform 0.2s ease"
                                  }}
                                >
                                  <Heart
                                    size={12}
                                    fill="currentColor"
                                    style={{
                                      transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                                    }}
                                  />
                                  <span style={{ fontSize: "0.68rem" }}>{room.likesCount || 0}</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {!viewingUserProfile && profileTab === "saved" && (
                      <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                        {savedRooms.length === 0 ? (
                          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No bookmarked rooms.</p>
                        ) : (
                          savedRooms.map(room => (
                            <div key={room.roomId} className="profile-room-card" onClick={() => triggerGateAndNavigate(room.roomId)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer" }}>
                              <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                              <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                              <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>By {room.createdBy?.username || "Developer"}</p>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                                <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>Saved</span>
                                <button onClick={(e) => { e.stopPropagation(); handleBookmarkRoom(room.roomId); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ce-primary, #58a6ff)", padding: "2px" }}><Bookmark size={12} fill="currentColor" /></button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {!viewingUserProfile && profileTab === "activity" && (
                      <div className="profile-activity-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {activities.filter(a => String(a.username) === String(user?.username)).length === 0 ? (
                          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No recent activity logged.</p>
                        ) : (
                          activities.filter(a => String(a.username) === String(user?.username)).slice(0, 10).map(act => (
                            <div key={act._id} className="profile-activity-item" style={{ padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", fontSize: "0.75rem", color: "var(--ce-text-muted)", display: "flex", justifyContent: "space-between" }}>
                              <span>You {act.action} room <strong>{act.roomTitle}</strong></span>
                              <span style={{ fontSize: "0.68rem" }}>{formatLastActive(act.timestamp)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}


        {/* SETTINGS SECTION */}
        {activeSection === "settings" && (
          <div className="settings-section-container">
            <div className="settings-tabbed-layout">
              <aside className="settings-tabs-sidebar">
                <button
                  onClick={() => setSettingsTab("account")}
                  className={`settings-tab-btn ${settingsTab === "account" ? "active" : ""}`}
                >
                  <User size={14} /> Account Details
                </button>
                <button
                  onClick={() => setSettingsTab("appearance")}
                  className={`settings-tab-btn ${settingsTab === "appearance" ? "active" : ""}`}
                >
                  <Laptop size={14} /> Theme & Appearance
                </button>
                <button
                  onClick={() => setSettingsTab("editor")}
                  className={`settings-tab-btn ${settingsTab === "editor" ? "active" : ""}`}
                >
                  <BookOpen size={14} /> Editor Prefs
                </button>
                <button
                  onClick={() => setSettingsTab("notifications")}
                  className={`settings-tab-btn ${settingsTab === "notifications" ? "active" : ""}`}
                >
                  <BellRing size={14} /> Notifications
                </button>
                <button
                  onClick={() => setSettingsTab("security")}
                  className={`settings-tab-btn ${settingsTab === "security" ? "active" : ""}`}
                >
                  <Key size={14} /> Security
                </button>
                <button
                  onClick={() => setSettingsTab("integrations")}
                  className={`settings-tab-btn ${settingsTab === "integrations" ? "active" : ""}`}
                >
                  <FolderGit size={14} /> Integrations & APIs
                </button>
              </aside>

              <div className="settings-pane-content">
                {settingsTab === "account" && (
                  <div className="settings-pane-form">
                    <h3>Account Profile</h3>
                    <p>Manage your account name, email listings, and developer bio.</p>
                    <div className="settings-form-row">
                      <div className="settings-form-field flex-1">
                        <label>Username</label>
                        <input type="text" value={user?.username || ""} disabled />
                      </div>
                      <div className="settings-form-field flex-1">
                        <label>Email Address</label>
                        <input type="email" value={user?.email || ""} disabled />
                      </div>
                    </div>
                    <div className="settings-form-field">
                      <label>Profile Bio</label>
                      <textarea
                        placeholder="Tell us about your coding identity..."
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                      />
                    </div>
                    <div className="settings-form-field">
                      <label>Programming Languages</label>
                      <input
                        type="text"
                        placeholder="e.g. JavaScript, Python, C++"
                        value={langsInput}
                        onChange={(e) => setLangsInput(e.target.value)}
                      />
                    </div>
                    <button className="settings-save-btn" onClick={handleSaveProfile}>Update Profile</button>
                  </div>
                )}

                {settingsTab === "appearance" && (
                  <div className="settings-pane-form">
                    <h3>Theme & Appearance</h3>
                    <p>Customize the look and feel of your workspace.</p>
                    <div className="appearance-themes-grid">
                      <div
                        className={`appearance-theme-card ${activeTheme === "dark" ? "active" : ""}`}
                        onClick={() => handleThemeChange("dark")}
                      >
                        <div className="theme-preview dark" />
                        <span>System Dark Mode</span>
                      </div>
                      <div
                        className={`appearance-theme-card ${activeTheme === "light" ? "active" : ""}`}
                        onClick={() => handleThemeChange("light")}
                      >
                        <div className="theme-preview light" />
                        <span>Linear Light Mode</span>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "editor" && (
                  <div className="settings-pane-form">
                    <h3>Editor & Workspace Settings</h3>
                    <p>Customize the Monaco code compiler and workspace canvas preferences.</p>

                    <div className="settings-form-row">
                      <div className="settings-form-field flex-1">
                        <label>Font Size (px)</label>
                        <input type="number" value={dashEditorFontSize} onChange={handleEditorFontSizeChange} min="12" max="24" />
                      </div>
                      <div className="settings-form-field flex-1">
                        <label>Tab Size</label>
                        <select value={dashEditorTabSize} onChange={handleEditorTabSizeChange}>
                          <option value={2}>2 spaces</option>
                          <option value={4}>4 spaces</option>
                          <option value={8}>8 spaces</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-form-row">
                      <div className="settings-form-field flex-1">
                        <label>Default Room Language</label>
                        <select value={dashDefaultLanguage} onChange={handleDefaultLanguageChange}>
                          <option value="javascript">JavaScript</option>
                          <option value="python">Python</option>
                          <option value="cpp">C++</option>
                          <option value="java">Java</option>
                        </select>
                      </div>
                      <div className="settings-form-field flex-1">
                        <label>Default Whiteboard Grid</label>
                        <select value={dashWhiteboardGrid} onChange={handleWhiteboardGridChange}>
                          <option value="dots">Dots</option>
                          <option value="lines">Grid Lines</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Minimap Preview</span>
                        <span className="toggle-desc">Show mini outline code map on the right side of the canvas</span>
                      </div>
                      <label className="ce-switch">
                        <input type="checkbox" checked={dashEditorMinimap} onChange={handleEditorMinimapChange} />
                        <span className="ce-switch-slider" />
                      </label>
                    </div>

                    <div className="settings-toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Word Wrap</span>
                        <span className="toggle-desc">Auto-wrap long code lines to fit the viewport boundary</span>
                      </div>
                      <label className="ce-switch">
                        <input type="checkbox" checked={dashEditorWordWrap} onChange={handleEditorWordWrapChange} />
                        <span className="ce-switch-slider" />
                      </label>
                    </div>

                    <div className="settings-toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Line Numbers</span>
                        <span className="toggle-desc">Display line numbers in the editor margin gutter</span>
                      </div>
                      <label className="ce-switch">
                        <input type="checkbox" checked={dashEditorLineNumbers} onChange={handleEditorLineNumbersChange} />
                        <span className="ce-switch-slider" />
                      </label>
                    </div>
                  </div>
                )}

                {settingsTab === "notifications" && (
                  <div className="settings-pane-form">
                    <h3>Notification Settings</h3>
                    <p>Manage when you want to receive real-time dashboard notifications.</p>

                    <div className="settings-toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Room Join Request Alerts</span>
                        <span className="toggle-desc">Get notified immediately when someone requests to join your room</span>
                      </div>
                      <label className="ce-switch">
                        <input type="checkbox" checked={notifApprovalAlerts} onChange={handleApprovalAlertsChange} />
                        <span className="ce-switch-slider" />
                      </label>
                    </div>

                    <div className="settings-toggle-row">
                      <div className="toggle-info">
                        <span className="toggle-label">Direct Message Tones</span>
                        <span className="toggle-desc">Receive popups when other developers ping you in DM chats</span>
                      </div>
                      <label className="ce-switch">
                        <input type="checkbox" checked={notifMentionAlerts} onChange={handleMentionAlertsChange} />
                        <span className="ce-switch-slider" />
                      </label>
                    </div>
                  </div>
                )}

                {settingsTab === "security" && (
                  <div className="settings-pane-form">
                    <h3>Security Preferences</h3>
                    <p>Configure security authorizations and passwords.</p>
                    <div className="settings-form-field">
                      <label>Current Password</label>
                      <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className="settings-form-field">
                      <label>New Password</label>
                      <input type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <button className="settings-save-btn" onClick={handleUpdatePassword}>Change Password</button>
                  </div>
                )}

                {settingsTab === "integrations" && (
                  <div className="settings-pane-form integrations-pane">
                    <h3>Integrations & API Services</h3>
                    <p>Connect your account to third-party services and generate personal API tokens for CLI tool access.</p>

                    {/* GitHub Integration Section */}
                    <div className="integration-card-wrapper">
                      <div className="integration-card-header">
                        <div className="integration-service-meta">
                          <div className="integration-icon-bg github">
                            <Code size={18} style={{ color: "#fff" }} />
                          </div>
                          <div>
                            <h4>GitHub Integration</h4>
                            <span className="integration-desc-small">Link repositories, push files, and collaborate.</span>
                          </div>
                        </div>
                        {gitConnectionInfo ? (
                          <span className="badge-status-new success">Connected</span>
                        ) : (
                          <span className="badge-status-new danger">Disconnected</span>
                        )}
                      </div>

                      {gitConnectionInfo ? (
                        <div className="git-connected-container">
                          <div className="git-user-profile">
                            <img src={gitConnectionInfo.avatar_url} alt={gitConnectionInfo.login} className="git-avatar" />
                            <div className="git-user-details">
                              <strong>{gitConnectionInfo.name}</strong>
                              <a href={gitConnectionInfo.html_url} target="_blank" rel="noopener noreferrer" className="git-profile-link">
                                @{gitConnectionInfo.login}
                              </a>
                            </div>
                          </div>
                          <div className="git-connected-actions">
                            <div className="settings-form-field flex-1" style={{ maxWidth: "240px" }}>
                              <label>Default Repo Branch</label>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                  type="text"
                                  value={gitDefaultBranch}
                                  onChange={(e) => setGitDefaultBranch(e.target.value)}
                                  placeholder="main"
                                />
                                <button className="settings-save-btn" onClick={handleSaveGitBranch} style={{ padding: "0 12px" }}>Save</button>
                              </div>
                            </div>
                            <button className="settings-btn-revoke danger" onClick={handleDisconnectGitHub}>
                              Disconnect GitHub
                            </button>
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleVerifyGitHubToken} className="git-disconnected-form">
                          <div className="settings-form-field">
                            <label>GitHub Personal Access Token (PAT)</label>
                            <div className="input-with-action-wrapper">
                              <input
                                type={showGitToken ? "text" : "password"}
                                placeholder="ghp_..."
                                value={gitHubToken}
                                onChange={(e) => setGitHubToken(e.target.value)}
                              />
                              <button
                                type="button"
                                className="input-action-btn"
                                onClick={() => setShowGitToken(!showGitToken)}
                              >
                                {showGitToken ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <span className="field-help-hint">
                              Create a classic token with `read:user` scope on GitHub settings to sync user stats.
                            </span>
                          </div>

                          <div className="settings-form-row">
                            <div className="settings-form-field flex-1">
                              <label>Default Branch</label>
                              <input
                                type="text"
                                value={gitDefaultBranch}
                                onChange={(e) => setGitDefaultBranch(e.target.value)}
                                placeholder="main"
                              />
                            </div>
                            <div className="settings-form-field flex-1" style={{ justifyContent: "flex-end" }}>
                              <button
                                type="submit"
                                className="settings-save-btn"
                                disabled={isVerifyingGit}
                                style={{ width: "100%", alignSelf: "unset" }}
                              >
                                {isVerifyingGit ? "Verifying..." : "Verify & Connect"}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>

                    <div className="settings-divider-horizontal" />

                    {/* Personal API Keys Section */}
                    <div className="integration-card-wrapper api-keys-section">
                      <h4>Personal Access Keys</h4>
                      <p className="section-desc-sub text-muted" style={{ marginTop: "-10px", marginBottom: "16px", fontSize: "0.78rem" }}>
                        Generate secure tokens to interface with the CODE-EXPO command line tools and automated runners.
                      </p>

                      <div className="generate-api-key-form">
                        <div className="settings-form-field">
                          <label>New Key Identifier / Name</label>
                          <div style={{ display: "flex", gap: "12px" }}>
                            <input
                              type="text"
                              placeholder="e.g. VSCode-Local-Dev"
                              value={apiKeyName}
                              onChange={(e) => setApiKeyName(e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              className="settings-save-btn"
                              onClick={() => {
                                handleGenerateApiKey(apiKeyName);
                                setApiKeyName("");
                              }}
                            >
                              Generate Key
                            </button>
                          </div>
                        </div>
                      </div>

                      {newlyGeneratedKey && (
                        <div className="generated-key-alert success">
                          <div className="alert-content">
                            <strong>New API Key Created!</strong>
                            <p>Copy this key now. For security reasons, it will not be displayed again.</p>
                            <div className="key-display-copy-row">
                              <code className="raw-key-code">{newlyGeneratedKey}</code>
                              <button
                                className="copy-key-btn"
                                onClick={(e) => {
                                  navigator.clipboard.writeText(newlyGeneratedKey);
                                  addToast("API Key copied to clipboard", "success");
                                }}
                              >
                                <Check size={14} /> Copy
                              </button>
                            </div>
                            <button className="btn-close-alert" onClick={() => setNewlyGeneratedKey(null)}>
                              I've Copied the Key
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="active-keys-table-container">
                        <h5>Active Keys</h5>
                        {apiKeys.length === 0 ? (
                          <p className="no-active-keys-hint">No active API keys found. Generate one above to get started.</p>
                        ) : (
                          <div className="keys-list-container">
                            {apiKeys.map(key => (
                              <div key={key.id} className="key-list-row-item">
                                <div className="key-info-meta">
                                  <strong className="key-item-name">{key.name}</strong>
                                  <div className="key-item-details">
                                    <code className="key-prefix-hint">{key.prefix}</code>
                                    <span className="dot-divider" />
                                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <button
                                  className="key-revoke-btn"
                                  title="Revoke Key"
                                  onClick={() => handleRevokeApiKey(key.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === "helpdesk" && (
          <HelpDesk />
        )}

        {/* Room Details Modal */}
        {selectedRoomDetails && (
          <div className="ce-modal-overlay" onClick={() => setSelectedRoomDetails(null)}>
            <div className="ce-modal-card room-details-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setSelectedRoomDetails(null)}>
                <X size={18} />
              </button>

              <div className="modal-header-new">
                <span className="modal-label-tag">Room Overview</span>
                <h3 className="modal-title-new">🚀 {selectedRoomDetails.title}</h3>
              </div>

              <div className="modal-details-grid">
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Room ID</span>
                  <div className="modal-detail-value-wrapper">
                    <span className="modal-detail-value mono-text">{selectedRoomDetails.roomId}</span>
                    <button
                      onClick={(e) => handleCopyId(e, selectedRoomDetails.roomId)}
                      className="modal-copy-btn"
                      title="Copy Room ID"
                    >
                      {copiedId === selectedRoomDetails.roomId ? <Check size={12} style={{ color: "var(--ce-success)" }} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">Language</span>
                  <span className="modal-detail-value lang-badge-new">{selectedRoomDetails.language?.toUpperCase()}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">Visibility</span>
                  <span className="modal-detail-value privacy-badge-new">
                    {selectedRoomDetails.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                    {selectedRoomDetails.isPrivate ? "Private Room" : "Public Room"}
                  </span>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">Owner</span>
                  <span className="modal-detail-value owner-name-new">
                    👤 {selectedRoomDetails.createdBy?.username || "Collaborator"}
                  </span>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">Last Active</span>
                  <span className="modal-detail-value">
                    🕒 {formatLastActive(selectedRoomDetails.lastActivity || selectedRoomDetails.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="modal-members-section">
                <h4 className="members-title-new">
                  Members ({selectedRoomDetails.participants?.length || 0})
                </h4>
                <div className="members-list-scrollable">
                  {(() => {
                    const onlineUserIds = new Set((selectedRoomDetails.activeUsers || []).map(u => String(u.userId)));
                    const isCurrentUserOwner = String(selectedRoomDetails.createdBy?._id || selectedRoomDetails.createdBy) === String(user?.id);
                    return (selectedRoomDetails.participants || []).map((m, i) => {
                      const isOnline = onlineUserIds.has(m._id || m) || (selectedRoomDetails.activeUsers || []).some(au => au.username === m.username);
                      const isOwner = String(m._id || m) === String(selectedRoomDetails.createdBy?._id || selectedRoomDetails.createdBy);
                      const isSelf = String(m._id || m) === String(user?.id);

                      return (
                        <div key={i} className="modal-member-card">
                          <div className="member-avatar-wrapper-mini">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.username} className="member-avatar-img-mini" />
                            ) : (
                              <div className="member-avatar-initials-mini" style={{ backgroundColor: getAvatarColor(m.username || "Collaborator") }}>
                                {(m.username || "C").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`presence-indicator-dot-mini ${isOnline ? "online" : "offline"}`} />
                          </div>
                          <div className="modal-member-info">
                            <span className="modal-member-name">{m.username || "Collaborator"}</span>
                            {isOwner && <span className="member-role-badge">Owner</span>}
                          </div>
                          <span className={`presence-text-badge-mini ${isOnline ? "online" : "offline"}`}>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                          {isCurrentUserOwner && !isOwner && !isSelf && (
                            <button
                              onClick={() => handleRemoveUser(selectedRoomDetails.roomId, m._id || m, m.username || "Collaborator")}
                              className="drawer-member-remove-btn"
                              style={{ margin: 0, padding: "2px 8px", height: "24px", fontSize: "0.65rem", marginLeft: "10px" }}
                              title="Kick user from room"
                            >
                              Kick
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Liked By Section */}
              <div className="modal-likes-section" style={{ marginTop: "16px", borderTop: "1px solid var(--ce-border)", paddingTop: "14px" }}>
                <h4 className="members-title-new" style={{ display: "flex", alignItems: "center", gap: "6px", margin: "0 0 10px 0", fontSize: "0.78rem", fontWeight: "700", color: "var(--ce-text)" }}>
                  <Heart size={13} fill="var(--ce-danger, #f85149)" style={{ color: "var(--ce-danger, #f85149)" }} />
                  Liked By ({selectedRoomLikes.length})
                </h4>
                {isLoadingRoomLikes ? (
                  <div style={{ fontSize: "0.74rem", color: "var(--ce-text-muted)", padding: "10px 0" }}>Loading likes...</div>
                ) : selectedRoomLikes.length === 0 ? (
                  <p style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", margin: "8px 0" }}>No likes yet. Be the first to like this room!</p>
                ) : (
                  <div className="likes-list-scrollable" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px", maxHeight: "100px", overflowY: "auto" }}>
                    {selectedRoomLikes.map((u, idx) => (
                      <div
                        key={idx}
                        className="modal-like-chip"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--ce-border)",
                          borderRadius: "20px",
                          padding: "4px 10px 4px 6px",
                          fontSize: "0.72rem",
                          color: "var(--ce-text)"
                        }}
                        title={u.bio || u.email || `@${u.username}`}
                      >
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.username}
                            style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              backgroundColor: getAvatarColor(u.username || "D"),
                              display: "grid",
                              placeItems: "center",
                              fontSize: "0.55rem",
                              fontWeight: "700",
                              color: "#fff"
                            }}
                          >
                            {(u.username || "D").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{u.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions-new">
                <button onClick={() => {
                  handleJoinRoomDirect(selectedRoomDetails.roomId);
                  setSelectedRoomDetails(null);
                }} className="modal-join-btn-new">
                  Enter Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Create Room Modal */}
        {showQuickCreateModal && (
          <div className="ce-modal-overlay" onClick={() => setShowQuickCreateModal(false)}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowQuickCreateModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Quick Action</span>
                <h3 className="modal-title-new">Create Workspace Room</h3>
              </div>

              <form onSubmit={(e) => {
                handleCreateRoom(e);
                setShowQuickCreateModal(false);
              }} className="compact-form modal-form-new">
                <div className="form-field">
                  <label>Workspace Title</label>
                  <input
                    type="text"
                    placeholder="e.g. DSA Practice Prep"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="modal-input-new"
                  />
                </div>

                <div className="form-field-row">
                  <div className="form-field flex-1">
                    <label>Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="modal-input-new select"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                    </select>
                  </div>

                  <div className="form-field flex-1">
                    <label>Privacy Type</label>
                    <select
                      value={formData.isPrivate}
                      onChange={(e) => setFormData({ ...formData, isPrivate: e.target.value === "true" })}
                      className="modal-input-new select"
                    >
                      <option value="false">Public</option>
                      <option value="true">Private (Requires Approval)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="modal-join-btn-new" style={{ marginTop: "16px" }}>
                  Create Room Workspace
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Quick Join Room Modal */}
        {showQuickJoinModal && (
          <div className="ce-modal-overlay" onClick={() => setShowQuickJoinModal(false)}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowQuickJoinModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Quick Action</span>
                <h3 className="modal-title-new">Join Workspace Room</h3>
              </div>

              <form onSubmit={(e) => {
                handleJoinRoom(e);
                setShowQuickJoinModal(false);
              }} className="compact-form modal-form-new">
                <div className="form-field">
                  <label>Workspace Room ID Code</label>
                  <input
                    type="text"
                    placeholder="Enter room hash token"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    required
                    className="modal-input-new"
                  />
                </div>

                <button type="submit" className="modal-join-btn-new" style={{ marginTop: "16px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)" }}>
                  Join Workspace
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Gate Entry Animation Overlay */}
        {gateAnimationRoomId && (
          <div className="ce-gate-overlay">
            <div className="gate-door gate-door-left" />
            <div className="gate-door gate-door-right" />
            <div className="gate-core-portal">
              <div className="gate-portal-glow" />
              <h2 className="gate-portal-text">Entering Workspace...</h2>
            </div>
          </div>
        )}

        {/* Kick Confirmation Modal */}
        {kickModalOpen && (
          <div className="ce-modal-overlay" style={{ zIndex: 100000 }}>
            <div className="ce-modal-card warning-glow">
              <div className="modal-icon error" style={{ width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", marginBottom: "16px" }}>
                <UserMinus size={32} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--ce-text)", marginBottom: "8px" }}>Remove Participant?</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ce-text-muted)", marginBottom: "20px", lineHeight: "1.4" }}>
                Are you sure you want to remove <strong>{kickTarget.username}</strong> from this workspace? They will be immediately disconnected.
              </p>
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button
                  className="ce-btn-secondary"
                  type="button"
                  onClick={() => setKickModalOpen(false)}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer", background: "rgba(255, 255, 255, 0.05)", color: "var(--ce-text)", border: "1px solid var(--ce-border)" }}
                >
                  Cancel
                </button>
                <button
                  className="ce-btn-danger"
                  type="button"
                  onClick={confirmKickUser}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer", background: "var(--ce-danger, #f85149)", color: "#ffffff", border: "none" }}
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Confirmation Modal */}
        {showJoinConfirmModal && joinTargetRoom && (
          <div className="ce-modal-overlay" style={{ zIndex: 100000 }} onClick={() => {
            setShowJoinConfirmModal(false);
            setJoinTargetRoom(null);
          }}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon" style={{ width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(56, 189, 248, 0.1)", color: "var(--ce-primary)", marginBottom: "16px" }}>
                <LogIn size={32} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--ce-text)", marginBottom: "8px" }}>Join Workspace?</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ce-text-muted)", marginBottom: "20px", lineHeight: "1.4", textAlign: "center" }}>
                Are you sure you want to join <strong>{joinTargetRoom.title}</strong>? You will connect to this collaborative sandbox.
              </p>
              <div style={{ display: "flex", gap: "10px", width: "100%" }}>
                <button
                  className="ce-btn-secondary"
                  type="button"
                  onClick={() => {
                    setShowJoinConfirmModal(false);
                    setJoinTargetRoom(null);
                  }}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer", background: "rgba(255, 255, 255, 0.05)", color: "var(--ce-text)", border: "1px solid var(--ce-border)" }}
                >
                  Cancel
                </button>
                <button
                  className="ce-btn-primary"
                  type="button"
                  onClick={() => {
                    setShowJoinConfirmModal(false);
                    proceedJoinRoom(joinTargetRoom.roomId);
                    setJoinTargetRoom(null);
                  }}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer", background: "var(--ce-primary)", color: "#ffffff", border: "none" }}
                >
                  Yes, Join Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Followers modal */}
        {showFollowersModal && (
          <div className="ce-modal-overlay" onClick={() => setShowFollowersModal(false)} style={{ zIndex: 10000 }}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "400px", maxWidth: "90%" }}>
              <button className="modal-close-btn" onClick={() => setShowFollowersModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Social Graph</span>
                <h3 className="modal-title-new">Followers ({targetFollowersList.length})</h3>
              </div>
              <div className="modal-members-section" style={{ marginTop: "16px" }}>
                <div className="members-list-scrollable" style={{ maxHeight: "300px" }}>
                  {loadingModalData ? (
                    <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>Loading followers...</p>
                  ) : targetFollowersList.length === 0 ? (
                    <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>No followers yet.</p>
                  ) : (
                    targetFollowersList.map(item => {
                      const isSelf = String(item._id) === String(user?.id || user?._id);
                      const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                      return (
                        <div key={item._id} className="modal-member-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", marginBottom: "6px" }}>
                          <div
                            onClick={() => {
                              setShowFollowersModal(false);
                              handleViewUserProfile(item._id);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1, cursor: "pointer" }}
                          >
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.username} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(item.username), fontSize: "0.7rem", fontWeight: "600", color: "#fff" }}>
                                {item.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.username}</span>
                              <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.bio || "No bio"}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            {!isSelf && (
                              <button
                                onClick={async () => {
                                  await handleFollowToggle(item._id);
                                  const activeId = viewingUserProfile ? viewingUserProfile._id : user?.id || user?._id;
                                  const followersRes = await getFollowers(activeId).catch(() => ({ success: false, followers: [] }));
                                  if (followersRes.success) setTargetFollowersList(followersRes.followers || []);
                                  if (viewingUserProfile) {
                                    const res = await getUserPublicProfile(viewingUserProfile._id);
                                    if (res.success) {
                                      setViewingUserProfile(res.user);
                                      setViewingUserStats(res.stats || null);
                                    }
                                  }
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: isFollowingUser ? "rgba(255, 255, 255, 0.05)" : "rgba(88, 166, 255, 0.1)",
                                  border: isFollowingUser ? "1px solid var(--ce-border)" : "1px solid rgba(88, 166, 255, 0.2)",
                                  borderRadius: "4px",
                                  color: isFollowingUser ? "var(--ce-text-muted)" : "var(--ce-primary)",
                                  fontSize: "0.7rem",
                                  cursor: "pointer",
                                  fontWeight: "600"
                                }}
                              >
                                {isFollowingUser ? "Following" : "Follow Back"}
                              </button>
                            )}
                            {!viewingUserProfile && (
                              <button
                                onClick={async () => {
                                  await handleRemoveFollower(item._id);
                                  const activeId = user?.id || user?._id;
                                  const followersRes = await getFollowers(activeId).catch(() => ({ success: false, followers: [] }));
                                  if (followersRes.success) setTargetFollowersList(followersRes.followers || []);
                                }}
                                style={{ padding: "4px 8px", background: "rgba(248, 81, 73, 0.1)", border: "1px solid rgba(248, 81, 73, 0.2)", borderRadius: "4px", color: "var(--ce-danger, #f85149)", fontSize: "0.7rem", cursor: "pointer", fontWeight: "600" }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Following modal */}
        {showFollowingModal && (
          <div className="ce-modal-overlay" onClick={() => setShowFollowingModal(false)} style={{ zIndex: 10000 }}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "400px", maxWidth: "90%" }}>
              <button className="modal-close-btn" onClick={() => setShowFollowingModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Social Graph</span>
                <h3 className="modal-title-new">Following ({targetFollowingList.length})</h3>
              </div>
              <div className="modal-members-section" style={{ marginTop: "16px" }}>
                <div className="members-list-scrollable" style={{ maxHeight: "300px" }}>
                  {loadingModalData ? (
                    <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>Loading following...</p>
                  ) : targetFollowingList.length === 0 ? (
                    <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>Not following anyone yet.</p>
                  ) : (
                    targetFollowingList.map(item => {
                      const isSelf = String(item._id) === String(user?.id || user?._id);
                      const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                      return (
                        <div key={item._id} className="modal-member-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", marginBottom: "6px" }}>
                          <div
                            onClick={() => {
                              setShowFollowingModal(false);
                              handleViewUserProfile(item._id);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1, cursor: "pointer" }}
                          >
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.username} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(item.username), fontSize: "0.7rem", fontWeight: "600", color: "#fff" }}>
                                {item.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.username}</span>
                              <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.bio || "No bio"}</span>
                            </div>
                          </div>
                          {!isSelf && (
                            <button
                              onClick={async () => {
                                await handleFollowToggle(item._id);
                                const activeId = viewingUserProfile ? viewingUserProfile._id : user?.id || user?._id;
                                const followingRes = await getFollowing(activeId).catch(() => ({ success: false, following: [] }));
                                if (followingRes.success) setTargetFollowingList(followingRes.following || []);
                                if (viewingUserProfile) {
                                  const res = await getUserPublicProfile(viewingUserProfile._id);
                                  if (res.success) {
                                    setViewingUserProfile(res.user);
                                    setViewingUserStats(res.stats || null);
                                  }
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                background: isFollowingUser ? "rgba(255, 255, 255, 0.05)" : "rgba(88, 166, 255, 0.1)",
                                border: isFollowingUser ? "1px solid var(--ce-border)" : "1px solid rgba(88, 166, 255, 0.2)",
                                borderRadius: "4px",
                                color: isFollowingUser ? "var(--ce-text-muted)" : "var(--ce-primary)",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                fontWeight: "600"
                              }}
                            >
                              {isFollowingUser ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Toast Notifications stack overlay */}
        <div className="ce-toast-notifications-stack" style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 99999999, pointerEvents: "none" }}>
          {toasts.map(t => (
            <div
              key={t.id}
              className={`ce-toast-alert ${t.type}`}
              style={{
                pointerEvents: "auto",
                background: "rgba(10, 10, 15, 0.95)",
                border: t.type === "error" ? "1px solid rgba(239, 68, 68, 0.5)" : t.type === "info" ? "1px solid rgba(88, 166, 255, 0.5)" : "1px solid rgba(16, 185, 129, 0.5)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                color: "#fff",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "250px",
                maxWidth: "350px"
              }}
            >
              <div className="toast-bullet" style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: t.type === "error" ? "#ef4444" : t.type === "info" ? "#38bdf8" : "#10b981" }} />
              <div className="toast-message-text" style={{ flex: 1 }}>{t.message}</div>
            </div>
          ))}
        </div>

      </div>
    </MainLayout>
  );
}

export default Dashboard;

