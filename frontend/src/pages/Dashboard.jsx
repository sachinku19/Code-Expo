import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  getAllPublicRooms,
  getMySentRequests,
  acceptWorkspaceInvite
} from "../services/roomService";
import socket from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, changePassword } from "../services/authService";
import {
  Plus, LogIn, History as HistoryIcon, User,
  Sun, Moon, Sparkles, Globe, Lock, Settings as SettingsIcon,
  Users, Clock, Terminal, Activity, FolderGit, Check, X, ShieldAlert, UserMinus,
  Search, SlidersHorizontal, BookOpen, ShieldCheck, Mail, Key, Eye, EyeOff, BellRing, Laptop,
  Palette, Bell, HelpCircle, Copy, Folder, ChevronRight, ChevronLeft, ChevronDown, Code,
  Heart, Bookmark, UserPlus, UserCheck, ArrowLeft, Flame, Trophy, Calendar, Share2,
  Megaphone, Wrench, Award, Compass, MessageSquare, LayoutGrid, Image, Play
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
  getUserPublicProfile,
  getLeaderboard,
  getPosts,
  toggleLikePost,
  addCommentPost
} from "../services/socialService";
import { updateUserProfile, getActiveAnnouncements, getActiveAds, uploadCoverBanner, deleteCoverBanner } from "../services/userService";
import { getTrustSafetyStatus } from "../services/trustSafetyService";
import "./Dashboard.css";
import MainLayout from "../layouts/MainLayout";
import ProfileAvatar from "../components/ProfileAvatar";
import DirectMessages from "../components/chat/DirectMessages";
import StoriesSystem from "../components/social/StoriesSystem";
import DeveloperFeed from "../components/social/DeveloperFeed";
import NetworkSidebar from "../components/social/NetworkSidebar";
import LeftSidebar from "../components/social/LeftSidebar";
import TrustSafety from "../components/social/TrustSafety";
import NetworkAnalytics from "../components/social/NetworkAnalytics";
import UserProfileModal from "../components/social/UserProfileModal";
const HelpDesk = lazy(() => import("../components/helpdesk/HelpDesk"));
import { StatsSkeleton, RoomGridSkeleton, ActivityFeedSkeleton, UserListSkeleton, TrendingListSkeleton, AdSkeleton } from "../components/SkeletonLoader";
import { useGateTransition } from "../routes/AppRoutes";

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

// Parsing Helpers for Markdown, Code, and Layouts
const extractCodeBlock = (text) => {
  if (!text) return null;
  const match = text.match(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/);
  if (match) {
    return {
      lang: match[1] || "code",
      code: match[2].trim()
    };
  }
  return null;
};

const getRightSideText = (text) => {
  if (!text) return "";
  // Remove the code block from the text so we don't show it twice
  return text.replace(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/g, "").trim();
};

const highlightCode = (lineText) => {
  if (!lineText) return "&nbsp;";
  let escaped = lineText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const keywords = [
    "class", "public", "private", "protected", "int", "double", "float", "char", "void", "vector",
    "std", "include", "return", "if", "else", "for", "while", "do", "break", "continue", "switch",
    "case", "const", "let", "var", "function", "import", "export", "from", "default", "new", "this",
    "struct", "template", "typename", "using", "namespace", "false", "true", "null", "nullptr"
  ];

  const regex = new RegExp(
    `(\\/\\/.*)|` + 
    `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|` + 
    `\\b(${keywords.join("|")})\\b|` + 
    `\\b(\\d+)\\b`,
    "g"
  );

  return escaped.replace(regex, (match, comment, string, keyword, number) => {
    if (comment) {
      return `<span style="color:#64748b; font-style:italic;">${comment}</span>`;
    }
    if (string) {
      return `<span style="color:#34d399;">${string}</span>`;
    }
    if (keyword) {
      return `<span style="color:#f472b6; font-weight:600;">${keyword}</span>`;
    }
    if (number) {
      return `<span style="color:#fbbf24;">${number}</span>`;
    }
    return match;
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval}y ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval}mo ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;
  return "just now";
};

// Reusable styled ProfilePostCard component for the profile grid
const ProfilePostCard = ({ post, onOpen, user }) => {
  const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
  const hasImage = postImages.length > 0;
  const codeDetails = extractCodeBlock(post.text);
  const hasCode = !!codeDetails;
  const hasVideo = !!post.video;

  const renderBadge = () => {
    if (hasCode) return <span className="profile-card-type-badge code">{codeDetails.lang}</span>;
    if (hasVideo) return <span className="profile-card-type-badge video">Video</span>;
    if (hasImage) return <span className="profile-card-type-badge image">Image</span>;
    return <span className="profile-card-type-badge text">Text</span>;
  };

  const renderBody = () => {
    if (hasCode) {
      const codeLines = codeDetails.code.split(/\r?\n/);
      const totalLines = codeLines.length;
      const previewLines = codeLines.slice(0, 6);

      return (
        <div className="profile-card-code-preview">
          {previewLines.map((line, idx) => (
            <div key={idx} className="profile-card-code-line" dangerouslySetInnerHTML={{ __html: highlightCode(line) }} />
          ))}
          <div className="profile-card-code-fade" />
          <span className="profile-card-code-lines-count">
            {totalLines} lines
          </span>
        </div>
      );
    }

    if (hasImage) {
      const cleanDesc = hasCode ? getRightSideText(post.text) : post.text;
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <img src={postImages[0]} alt="Post media preview" className="profile-card-image-preview" />
          {cleanDesc && (
            <p className="profile-card-image-caption">{cleanDesc}</p>
          )}
        </div>
      );
    }

    if (hasVideo) {
      const cleanDesc = hasCode ? getRightSideText(post.text) : post.text;
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="profile-card-video-preview">
            <video src={post.video} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div className="profile-card-video-overlay">
              <Play size={16} fill="#fff" color="#fff" />
            </div>
          </div>
          {cleanDesc && (
            <p className="profile-card-image-caption">{cleanDesc}</p>
          )}
        </div>
      );
    }

    return (
      <p className="profile-card-text-preview">{post.text}</p>
    );
  };

  const author = post.author || user || {};

  return (
    <div className="profile-post-card-item" onClick={onOpen}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Header */}
        <div className="profile-card-header">
          <div className="profile-card-author-info">
            {author.avatar ? (
              <img src={author.avatar} alt={author.username} className="profile-card-avatar" />
            ) : (
              <div className="profile-card-avatar-fallback" style={{ backgroundColor: "#aa3bff" }}>
                {(author.username || "D").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-card-meta">
              <span className="profile-card-username">@{author.username || "developer"}</span>
              <span className="profile-card-time">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
          {renderBadge()}
        </div>

        {/* Body */}
        <div className="profile-card-body">
          {renderBody()}
        </div>
      </div>

      {/* Footer */}
      <div className="profile-card-footer">
        <div className="profile-card-stats">
          <span className="profile-card-stat">
            <Heart size={14} fill="none" /> {post.likes?.length || 0}
          </span>
          <span className="profile-card-stat">
            <MessageSquare size={14} /> {post.comments?.length || 0}
          </span>
        </div>

        <button className="profile-card-action-btn">
          {hasCode ? "View Full Code" : "Read More"}
        </button>
      </div>
    </div>
  );
};

const parseMarkdown = (text) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold/Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code block
  html = html.replace(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background:#09090f; border:1px solid rgba(255,255,255,0.06); padding:12px; border-radius:10px; font-family:'Fira Code', monospace; font-size:0.8rem; overflow:auto; max-height:180px; margin:12px 0; max-width:100%; box-sizing:border-box;"><div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#64748b; margin-bottom:6px; text-transform:uppercase; position:sticky; top:0; background:#09090f; padding-bottom:4px;"><span>${lang || "code"}</span></div><code style="color:#38bdf8; white-space:pre; display:block;">${code}</code></pre>`;
  });

  // Inline Code
  html = html.replace(/`([^`\r\n]+)`/g, '<code style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-family:monospace; color:#fb7185;">$1</code>');

  // Hashtags
  html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span style="color:#8b5cf6; font-weight:600;">#$1</span>');

  // Mentions
  html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color:#06b6d4; font-weight:600;">@$1</span>');

  html = html.replace(/\n/g, "<br />");

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
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
          <div className="tooltip-activity">
            {hoveredDay.count} activit{hoveredDay.count === 1 ? 'y' : 'ies'}
          </div>
          <div className="tooltip-date">
            {(() => {
              if (!hoveredDay.date) return "";
              const [yr, mo, dy] = hoveredDay.date.split("-").map(Number);
              const d = new Date(yr, mo - 1, dy);
              return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

const renderLanguageLogo = (lang, title) => {
  let l = String(lang || "").toLowerCase().trim();
  const t = String(title || "").toLowerCase();

  if (!l) {
    if (t.includes("cpp") || t.includes("c++")) l = "cpp";
    else if (t.includes("python") || t.includes("py-") || t.includes("-py") || t.includes("api")) l = "python";
    else if (t.includes("java") && !t.includes("javascript") && !t.includes("js")) l = "java";
    else if (t.includes("node") || t.includes("js") || t.includes("javascript")) l = "node";
    else l = "javascript";
  }

  // Normalize name
  if (l === "js") l = "javascript";
  if (l === "py") l = "python";
  if (l === "c++") l = "cpp";
  if (l === "nodejs" || l === "node.js") l = "node";
  if (l === "ts") l = "typescript";
  if (l === "html5") l = "html";
  if (l === "css3") l = "css";

  if (l === "javascript") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="JavaScript">
        <rect width="24" height="24" rx="6" fill="#f7df1e" />
        <path d="M13.5 12.5c0 .8.5 1.3 1.2 1.3s1.2-.5 1.2-1.3v-3.5h1.2v3.5c0 1.5-1 2.5-2.4 2.5s-2.4-1-2.4-2.5h1.2zm3.8.7c.3.5.8.8 1.5.8.7 0 1.2-.4 1.2-.9 0-.6-.5-.8-1.2-1.1l-.8-.3c-.9-.4-1.5-1-1.5-2 0-1.4 1.1-2.2 2.5-2.2 1.1 0 1.9.5 2.3 1.3l-1 .6c-.3-.5-.7-.7-1.3-.7-.6 0-1 .3-1 .8 0 .5.4.7 1 .9l.8.3c1.1.4 1.7 1 1.7 2.1 0 1.5-1.1 2.3-2.6 2.3-1.4 0-2.3-.7-2.7-1.6l1-.6z" fill="#000000" />
      </svg>
    );
  }

  if (l === "python") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="Python">
        <rect width="24" height="24" rx="6" fill="#1e1e24" />
        <path d="M12 4c-1.6 0-3 .5-3.5 1.3-.8 1.2-.5 2.2.5 2.2H12v1H9.8c-1.6 0-2.8 1.2-2.8 2.8 0 1.5 1.2 2.8 2.8 2.8H11v-1.5c0-1.1.9-2 2-2h3c1.1 0 2-.9 2-2V9c0-2.8-2.2-5-5-5z" fill="#3776ab" />
        <path d="M12 20c1.6 0 3-.5 3.5-1.3.8-1.2.5-2.2-.5-2.2H12v-1h2.2c1.6 0 2.8-1.2 2.8-2.8 0-1.5-1.2-2.8-2.8-2.8H13v1.5c0 1.1-.9 2-2 2H8c-1.1 0-2 .9-2 2V15c0 2.8 2.2 5 5 5z" fill="#ffd343" />
        <circle cx="10.5" cy="6.5" r="0.5" fill="#ffffff" />
        <circle cx="13.5" cy="17.5" r="0.5" fill="#1e1e24" />
      </svg>
    );
  }

  if (l === "cpp") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="C++">
        <rect width="24" height="24" rx="6" fill="#1d2d3d" />
        <path d="M12 4l6.5 3.8v7.5L12 19.2l-6.5-3.8V7.8L12 4z" fill="#00599c" />
        <path d="M10 9.5c-.8 0-1.5.7-1.5 1.5v2c0 .8.7 1.5 1.5 1.5h2.5v-1.2H10v-1.6h2.5V9.5H10z" fill="#ffffff" />
        <path d="M14.5 11.5h1.5v-1.5h1v1.5h1.5v1h-1.5v1.5h-1v-1.5h-1.5v-1zM18.5 11.5H20v-1.5h1v1.5h1.5v1H21v1.5h-1v-1.5h-1.5v-1z" fill="#ffffff" />
      </svg>
    );
  }

  if (l === "java") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="Java">
        <rect width="24" height="24" rx="6" fill="#2b2625" />
        <path d="M10 5c.5-1 .5-2 0-3M13 5c.8-1 .8-2 0-3M16 6c.5-1 .5-2 0-3" stroke="#f05a28" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M6 10c0 4 3 5 6 5s6-1 6-5H6z" fill="#5382a1" />
        <path d="M7 11h10v1.5c0 2-2 3.5-5 3.5s-5-1.5-5-3.5V11z" fill="#f05a28" />
        <path d="M17 11c1.5 0 2 .5 2 1.25s-.5 1.25-2 1.25v-2.5z" stroke="#5382a1" strokeWidth="1.2" fill="none" />
        <path d="M5 17c3 1 11 1 14 0" stroke="#5382a1" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (l === "node") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="Node.js">
        <rect width="24" height="24" rx="6" fill="#1e291b" />
        <path d="M6 8.5v7M6 11.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5v4h-1.5v-3.5c0-.8-.4-1.2-1-1.2s-1 .4-1 1.2v3.5H6v-7z" stroke="#68a063" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14.5 10c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5 2.5-1 2.5-2.5-1-2.5-2.5-2.5zm0 3.8c-.8 0-1.2-.5-1.2-1.3s.4-1.3 1.2-1.3 1.2.5 1.2 1.3-.4 1.3-1.2 1.3z" stroke="#68a063" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 8.5v7M19 11.5c.5-1 1.5-1.5 2.5-1.5v1.5c-.8 0-1.5.4-2 1v4H18v-7z" stroke="#68a063" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (l === "typescript") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="TypeScript">
        <rect width="24" height="24" rx="6" fill="#3178c6" />
        <path d="M12 9.2H9v1.2h1.2v4.8h1.2v-4.8H12.6V9.2zm2.5 4c.3.5.8.8 1.5.8.7 0 1.2-.4 1.2-.9 0-.6-.5-.8-1.2-1.1l-.8-.3c-.9-.4-1.5-1-1.5-2 0-1.4 1.1-2.2 2.5-2.2 1.1 0 1.9.5 2.3 1.3l-1 .6c-.3-.5-.7-.7-1.3-.7-.6 0-1 .3-1 .8 0 .5.4.7 1 .9l.8.3c1.1.4 1.7 1 1.7 2.1 0 1.5-1.1 2.3-2.6 2.3-1.4 0-2.3-.7-2.7-1.6l1-.6z" fill="#ffffff" />
      </svg>
    );
  }

  if (l === "html") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="HTML5">
        <rect width="24" height="24" rx="6" fill="#f06529" />
        <path d="M6 6l1.2 11.5L12 19l4.8-1.5L18 6H6zm9.5 3H9.2l.1 1.2h6.1l-.3 3-3 1-3-1-.2-1.8H10l.2 2.2 1.8.6 1.8-.6.2-1.8H9.4l-.2-2.4h6.5L15.5 9z" fill="#ffffff" />
      </svg>
    );
  }

  if (l === "css") {
    return (
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title="CSS3">
        <rect width="24" height="24" rx="6" fill="#2965f1" />
        <path d="M6 6l1.2 11.5L12 19l4.8-1.5L18 6H6zm9.5 3H9.2l.1 1.2h6.1l-.3 3-3 1-3-1-.2-1.8H10l.2 2.2 1.8.6 1.8-.6.2-1.8H9.4l-.2-2.4h6.5L15.5 9z" fill="#ffffff" />
      </svg>
    );
  }

  // Fallback default code icon
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" title={lang}>
      <rect width="24" height="24" rx="6" fill="#4f46e5" />
      <path d="M8.5 9.5L6 12l2.5 2.5m7-5L18 12l-2.5 2.5M13.5 7.5l-3 9" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const loadFromCache = (key, fallback) => {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : fallback;
  } catch (e) {
    return fallback;
  }
};

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { triggerGateTransition } = useGateTransition();
  const pendingLikesRef = useRef(new Set());
  const pendingFollowsRef = useRef(new Set());
  const pendingBookmarksRef = useRef(new Set());
  const followingSearchInputRef = useRef(null);

  const [stats, setStats] = useState(() => loadFromCache("ce_cache_stats", {
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
  }));

  const [historyRooms, setHistoryRooms] = useState(() => loadFromCache("ce_cache_historyRooms", []));
  const [visibleJoinedRooms, setVisibleJoinedRooms] = useState(4);
  const [visibleFeedCount, setVisibleFeedCount] = useState(4);
  const [recentRooms, setRecentRooms] = useState(() => loadFromCache("ce_cache_recentRooms", []));
  const [liveRooms, setLiveRooms] = useState(() => loadFromCache("ce_cache_liveRooms", []));
  const [joinRequests, setJoinRequests] = useState(() => loadFromCache("ce_cache_joinRequests", []));
  const [mySentRequests, setMySentRequests] = useState(() => loadFromCache("ce_cache_mySentRequests", []));
  const [activities, setActivities] = useState(() => loadFromCache("ce_cache_activities", []));
  const [heatmap, setHeatmap] = useState(() => loadFromCache("ce_cache_heatmap", []));
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(() => {
    try {
      const cached = localStorage.getItem("ce_cache_stats");
      return cached ? false : true;
    } catch {
      return true;
    }
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // System announcements states
  const [activeAnnouncements, setActiveAnnouncements] = useState(() => loadFromCache("ce_cache_activeAnnouncements", []));
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState(() => {
    try {
      const stored = localStorage.getItem("dismissedAnnouncements");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Ads states
  const [activeAds, setActiveAds] = useState(() => loadFromCache("ce_cache_activeAds", []));
  const sidebarAds = useMemo(() => activeAds.filter(ad => ad.format === "SIDEBAR" || !ad.format), [activeAds]);
  const [currentPopupAd, setCurrentPopupAd] = useState(null);
  const [hasShownPopup, setHasShownPopup] = useState(false);

  // Social states
  const [suggestions, setSuggestions] = useState(() => loadFromCache("ce_cache_suggestions", []));
  const [trendingRooms, setTrendingRooms] = useState(() => loadFromCache("ce_cache_trendingRooms", []));
  const [onlineFollows, setOnlineFollows] = useState(() => loadFromCache("ce_cache_onlineFollows", []));
  const [feedActivities, setFeedActivities] = useState(() => loadFromCache("ce_cache_feedActivities", []));
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [followersList, setFollowersList] = useState(() => loadFromCache("ce_cache_followersList", []));
  const [followingList, setFollowingList] = useState(() => loadFromCache("ce_cache_followingList", []));
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [socialSubTab, setSocialSubTab] = useState("explore");
  const [visibleFollowingCount, setVisibleFollowingCount] = useState(6);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [langsInput, setLangsInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("rooms");
  const [likedRooms, setLikedRooms] = useState(() => loadFromCache("ce_cache_likedRooms", []));
  const [savedRooms, setSavedRooms] = useState(() => loadFromCache("ce_cache_savedRooms", []));
  const [notificationsList, setNotificationsList] = useState(() => loadFromCache("ce_cache_notificationsList", []));
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(() => loadFromCache("ce_cache_unreadNotificationsCount", 0));
  const [notifPage, setNotifPage] = useState(1);
  const [notifTotalPages, setNotifTotalPages] = useState(1);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState("all");
  const [toasts, setToasts] = useState([]);

  // Viewed user states
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const [preselectedChatPartner, setPreselectedChatPartner] = useState(null);
  const [viewingUserStats, setViewingUserStats] = useState(null);
  const [viewingUserRooms, setViewingUserRooms] = useState([]);
  const [viewingUserLikedRooms, setViewingUserLikedRooms] = useState([]);
  const [selectedYear, setSelectedYear] = useState("last12");
  const [ownYears, setOwnYears] = useState(() => loadFromCache("ce_cache_ownYears", [new Date().getFullYear()]));
  const [targetFollowersList, setTargetFollowersList] = useState([]);
  const [targetFollowingList, setTargetFollowingList] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [profilePosts, setProfilePosts] = useState([]);
  const [isProfilePostsLoading, setIsProfilePostsLoading] = useState(false);

  const fetchProfilePosts = useCallback(async (targetUserId) => {
    if (!targetUserId) return;
    setIsProfilePostsLoading(true);
    try {
      const res = await getPosts(1, 100);
      if (res && res.success && res.posts) {
        const filtered = res.posts.filter(post => {
          const authorId = post.author?._id || post.author;
          return String(authorId) === String(targetUserId);
        });
        setProfilePosts(filtered);
      }
    } catch (e) {
      console.error("Error fetching profile posts:", e);
    } finally {
      setIsProfilePostsLoading(false);
    }
  }, []);

  const resolveLikedUser = useCallback((likeUserId) => {
    if (!likeUserId) return null;
    const targetId = typeof likeUserId === "object" ? likeUserId._id || likeUserId.id : likeUserId;
    if (user && (String(targetId) === String(user.id) || String(targetId) === String(user._id))) {
      return {
        _id: targetId,
        username: user.username,
        avatar: user.avatar,
        title: user.title || "Developer"
      };
    }
    const foundInSuggestions = suggestions.find(s => String(s._id || s.id) === String(targetId));
    if (foundInSuggestions) return foundInSuggestions;

    const foundInFollowers = followersList.find(f => String(f._id || f.id) === String(targetId));
    if (foundInFollowers) return foundInFollowers;
    
    const foundInFollowing = followingList.find(f => String(f._id || f.id) === String(targetId));
    if (foundInFollowing) return foundInFollowing;

    const suffix = typeof targetId === "string" ? targetId.slice(-4) : "dev";
    return {
      _id: targetId,
      username: `dev_${suffix}`,
      avatar: null,
      title: "Software Engineer"
    };
  }, [user, suggestions, followersList, followingList]);

  const [likedUsersListModal, setLikedUsersListModal] = useState(null);
  const [selectedPostModal, setSelectedPostModal] = useState(null);
  const [savedPostIds, setSavedPostIds] = useState(() => {
    try {
      const saved = localStorage.getItem("codeexpo_bookmarked_post_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [allFeedPosts, setAllFeedPosts] = useState([]);

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const res = await getPosts(1, 100);
        if (res?.success && res.posts) {
          setAllFeedPosts(res.posts);
        }
      } catch (err) {
        console.error("Error fetching all posts:", err);
      }
    };
    fetchAllPosts();
  }, [selectedPostModal]);

  const [modalActiveImageIdx, setModalActiveImageIdx] = useState(0);
  const [modalShareOpen, setModalShareOpen] = useState(false);

  const handleClosePostModal = () => {
    setSelectedPostModal(null);
    setModalShareOpen(false);
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has("post")) {
      searchParams.delete("post");
      const newSearch = searchParams.toString();
      navigate(newSearch ? `${location.pathname}?${newSearch}` : location.pathname, { replace: true });
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const postId = searchParams.get("post");
    if (postId && allFeedPosts.length > 0) {
      const matchedPost = allFeedPosts.find(p => p._id === postId);
      if (matchedPost) {
        setSelectedPostModal(matchedPost);
      }
    }
  }, [location.search, allFeedPosts]);

  useEffect(() => {
    setModalActiveImageIdx(0);
  }, [selectedPostModal]);

  const [modalCommentText, setModalCommentText] = useState("");
  const [modalRevealedSensitive, setModalRevealedSensitive] = useState(false);
  
  useEffect(() => {
    setModalRevealedSensitive(false);
  }, [selectedPostModal]);

  const handleLikePostInModal = async () => {
    if (!selectedPostModal) return;
    try {
      await toggleLikePost(selectedPostModal._id);
      const res = await getPosts(1, 100);
      if (res?.success) {
        const found = res.posts.find(p => p._id === selectedPostModal._id);
        if (found) {
          setSelectedPostModal(found);
        }
        const filtered = res.posts.filter(post => {
          const authorId = post.author?._id || post.author;
          return String(authorId) === String(viewingUserProfile?._id || user?.id || user?._id);
        });
        setProfilePosts(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCommentInModal = async (e) => {
    e.preventDefault();
    if (!selectedPostModal || !modalCommentText.trim()) return;
    try {
      await addCommentPost(selectedPostModal._id, modalCommentText);
      setModalCommentText("");
      const res = await getPosts(1, 100);
      if (res?.success) {
        const found = res.posts.find(p => p._id === selectedPostModal._id);
        if (found) {
          setSelectedPostModal(found);
        }
        const filtered = res.posts.filter(post => {
          const authorId = post.author?._id || post.author;
          return String(authorId) === String(viewingUserProfile?._id || user?.id || user?._id);
        });
        setProfilePosts(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [animatingLikes, setAnimatingLikes] = useState({});
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardTab, setLeaderboardTab] = useState("global");

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
  const [dashEditorSuggestions, setDashEditorSuggestions] = useState(
    localStorage.getItem("editor_suggestions") || "standard"
  );
  const [dashEditorAutoSave, setDashEditorAutoSave] = useState(
    localStorage.getItem("editor_autoSave") || "off"
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

  const handleEditorSuggestionsChange = (e) => {
    const val = e.target.value;
    setDashEditorSuggestions(val);
    localStorage.setItem("editor_suggestions", val);
    addToast(`AI IntelliSense set to ${val === "ai" ? "AI-Powered" : val}`, "success");
  };

  const handleEditorAutoSaveChange = (e) => {
    const val = e.target.value;
    setDashEditorAutoSave(val);
    localStorage.setItem("editor_autoSave", val);
    addToast(`Auto-save frequency updated: ${val === "off" ? "Off" : val + "s"}`, "success");
  };

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "None", color: "transparent", percent: 0 };
    if (newPassword.length < 6) return { score: 1, label: "Too Short (Min 6 chars)", color: "#ef4444", percent: 25 };

    let score = 0;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    let label = "Weak";
    let color = "#ef4444";
    let percent = 25;

    if (score === 2) {
      label = "Medium";
      color = "#f59e0b";
      percent = 50;
    } else if (score === 3) {
      label = "Strong";
      color = "#10b981";
      percent = 75;
    } else if (score >= 4) {
      label = "Very Strong / Bulletproof 🚀";
      color = "#06b6d4";
      percent = 100;
    }

    return { score, label, color, percent };
  }, [newPassword]);

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
  const [roomsTab, setRoomsTab] = useState("public");
  const [activeRoomsTab, setActiveRoomsTab] = useState("my-active");
  const [myRoomsTabSearch, setMyRoomsTabSearch] = useState("");
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [followingSearch, setFollowingSearch] = useState("");
  const filteredFollowing = useMemo(() => {
    return followingList.filter(dev => {
      const term = followingSearch.toLowerCase();
      return dev.username.toLowerCase().includes(term) || (dev.bio && dev.bio.toLowerCase().includes(term));
    });
  }, [followingList, followingSearch]);
  const [showAllActiveMyRoomsTab, setShowAllActiveMyRoomsTab] = useState(false);
  const [showAllOfflineMyRoomsTab, setShowAllOfflineMyRoomsTab] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [expandedAchievementId, setExpandedAchievementId] = useState(null);

  const targetUserIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("userId");
  }, [location.search]);

  const isViewingPublicProfile = activeSection === "profile" && !!targetUserIdFromUrl;

  const isPublicProfileLoading = isViewingPublicProfile && (!viewingUserProfile || (String(viewingUserProfile._id) !== String(targetUserIdFromUrl) && String(viewingUserProfile.id) !== String(targetUserIdFromUrl)));

  // Gate Opening Portal Animation State
  const [resumingHistoryRoomId, setResumingHistoryRoomId] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
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

  const prefetchEditor = () => {
    try {
      import("./Editor").catch(() => { });
    } catch (e) { }
  };

  const triggerGateAndNavigate = (targetRoomId) => {
    triggerGateTransition(`/editor/${targetRoomId}`, "Syncing with Workspace Grid...");
  };

  const triggerResumeHistory = (targetRoomId) => {
    setResumingHistoryRoomId(targetRoomId);
    triggerGateTransition(`/editor/${targetRoomId}`, "Resuming Session Sync...");
    setTimeout(() => {
      setResumingHistoryRoomId(null);
    }, 1000);
  };

  // Sync section with query tab
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    let tab = searchParams.get("tab");
    const userId = searchParams.get("userId");
    if (tab) {
      if (tab === "feed-action") {
        tab = "trust-safety";
      }
      setActiveSection(tab);
      if (tab === "profile") {
        if (userId) {
          const isOwnProfile = user && (String(userId) === String(user.id) || String(userId) === String(user._id));
          if (isOwnProfile) {
            setViewingUserProfile(null);
            setViewingUserStats(null);
            fetchProfilePosts(user.id || user._id);
            navigate("/dashboard?tab=profile", { replace: true });
          } else if (!viewingUserProfile || (String(viewingUserProfile._id) !== String(userId) && String(viewingUserProfile.id) !== String(userId))) {
            handleViewUserProfile(userId);
          }
        } else {
          setViewingUserProfile(null);
          setViewingUserStats(null);
          if (user) {
            fetchProfilePosts(user.id || user._id);
          }
        }
      } else {
        setViewingUserProfile(null);
        setViewingUserStats(null);
      }
    } else {
      setActiveSection("dashboard");
      setViewingUserProfile(null);
      setViewingUserStats(null);
    }
  }, [location.search, user?.id, user?._id]);

  // Admin redirect logic
  useEffect(() => {
    if (user && user.role === "admin" && !localStorage.getItem("ceBypassAdminRedirect")) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      const [historyData, recentData, liveData, requestsData, activityData, statsData, publicData, sentRequestsData] = await Promise.all([
        getUserRoomsHistory(),
        getRecentRooms(),
        getLiveRooms(),
        getPendingRequests(),
        getActivityFeed(),
        getActivityStats(),
        getAllPublicRooms(),
        getMySentRequests().catch(() => ({ success: false, requests: [] }))
      ]);

      const history = historyData.rooms || [];
      const recent = recentData.rooms || [];
      const live = liveData.rooms || [];
      const requests = requestsData.requests || [];
      const activityList = activityData.activities || [];
      const dbStats = statsData.stats || { codingHours: 0, executions: 0, heatmap: [] };
      const publicR = publicData.rooms || [];
      const sentRequests = sentRequestsData?.requests || [];

      setHistoryRooms(history);
      localStorage.setItem("ce_cache_historyRooms", JSON.stringify(history));
      setRecentRooms(recent);
      localStorage.setItem("ce_cache_recentRooms", JSON.stringify(recent));
      setLiveRooms(live);
      localStorage.setItem("ce_cache_liveRooms", JSON.stringify(live));
      setJoinRequests(requests);
      localStorage.setItem("ce_cache_joinRequests", JSON.stringify(requests));
      setMySentRequests(sentRequests);
      localStorage.setItem("ce_cache_mySentRequests", JSON.stringify(sentRequests));
      setActivities(activityList);
      localStorage.setItem("ce_cache_activities", JSON.stringify(activityList));
      setHeatmap(dbStats.heatmap || []);
      localStorage.setItem("ce_cache_heatmap", JSON.stringify(dbStats.heatmap || []));
      setOwnYears(dbStats.years || [new Date().getFullYear()]);
      localStorage.setItem("ce_cache_ownYears", JSON.stringify(dbStats.years || [new Date().getFullYear()]));
      setPublicRooms(publicR);
      localStorage.setItem("ce_cache_publicRooms", JSON.stringify(publicR));

      const created = history.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id).length;
      const joined = history.length - created;

      const statsObj = {
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
      };
      setStats(statsObj);
      localStorage.setItem("ce_cache_stats", JSON.stringify(statsObj));
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
        getNotifications(1, 10).catch(() => ({ success: false, notifications: [], unreadCount: 0 })),
        getUserProfile().catch(() => ({ success: false }))
      ]);

      if (sugRes.success) {
        setSuggestions(sugRes.suggestions || []);
        localStorage.setItem("ce_cache_suggestions", JSON.stringify(sugRes.suggestions || []));
      }
      if (trendRes.success) {
        setTrendingRooms(prev => {
          const newRooms = trendRes.rooms || [];
          let updated = newRooms;
          if (prev && prev.length > 0) {
            const updatedRooms = prev.map(p => {
              const match = newRooms.find(n => n.roomId === p.roomId || n._id === p._id);
              return match ? { ...p, ...match } : p;
            });
            const newAdditions = newRooms.filter(n => !prev.some(p => p.roomId === n.roomId || p._id === n._id));
            updated = [...updatedRooms, ...newAdditions].slice(0, 5);
          }
          localStorage.setItem("ce_cache_trendingRooms", JSON.stringify(updated));
          return updated;
        });
      }
      if (followRes.success) {
        const following = followRes.following || [];
        setFollowingList(following);
        localStorage.setItem("ce_cache_followingList", JSON.stringify(following));
        const online = following.filter(f => f.isOnline === "true" || f.isOnline === true);
        setOnlineFollows(online);
        localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(online));
      }
      if (feedRes.success) {
        setFeedActivities(feedRes.activities || []);
        localStorage.setItem("ce_cache_feedActivities", JSON.stringify(feedRes.activities || []));
        setFeedTotalPages(feedRes.totalPages || 1);
        localStorage.setItem("ce_cache_feedTotalPages", JSON.stringify(feedRes.totalPages || 1));
        setFeedPage(1);
      }
      if (likedRes.success) {
        setLikedRooms(likedRes.rooms || []);
        localStorage.setItem("ce_cache_likedRooms", JSON.stringify(likedRes.rooms || []));
      }
      if (savedRes.success) {
        setSavedRooms(savedRes.rooms || []);
        localStorage.setItem("ce_cache_savedRooms", JSON.stringify(savedRes.rooms || []));
      }
      if (notifRes.success) {
        setNotificationsList(notifRes.notifications || []);
        localStorage.setItem("ce_cache_notificationsList", JSON.stringify(notifRes.notifications || []));
        setUnreadNotificationsCount(notifRes.unreadCount || 0);
        localStorage.setItem("ce_cache_unreadNotificationsCount", JSON.stringify(notifRes.unreadCount || 0));
        setNotifPage(1);
        setNotifTotalPages(notifRes.totalPages || 1);
      }
      if (profileRes.success) {
        setUser(profileRes.user);
        localStorage.setItem("user", JSON.stringify(profileRes.user));
      }

      const followersRes = await getFollowers(user.id || user._id).catch(() => ({ success: false, followers: [] }));
      if (followersRes.success) {
        setFollowersList(followersRes.followers || []);
        localStorage.setItem("ce_cache_followersList", JSON.stringify(followersRes.followers || []));
      }
    } catch (err) {
      console.error("Error fetching social dashboard data:", err);
      if (err.response?.status === 503 || err.response?.data?.isMaintenance) {
        setIsMaintenance(true);
      }
    }
  };

  const fetchFollowingListOnly = async () => {
    if (!user) return;
    setIsFollowingLoading(true);
    try {
      const res = await getFollowing(user.id || user._id);
      if (res.success) {
        const following = res.following || [];
        setFollowingList(following);
        localStorage.setItem("ce_cache_followingList", JSON.stringify(following));
        const online = following.filter(f => f.isOnline === "true" || f.isOnline === true);
        setOnlineFollows(online);
        localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(online));
      }
    } catch (err) {
      console.error("Error fetching following:", err);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "following") {
      fetchFollowingListOnly();
    }
  }, [activeSection]);

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

  const handleLoadMoreFeedClick = () => {
    const nextVisible = visibleFeedCount + 4;
    setVisibleFeedCount(nextVisible);
    if (nextVisible > feedActivities.length && feedPage < feedTotalPages) {
      handleLoadMoreFeed();
    }
  };

  const handleLoadMoreNotifications = async () => {
    if (notifLoading || notifPage >= notifTotalPages) return;
    setNotifLoading(true);
    try {
      const nextPage = notifPage + 1;
      const notifRes = await getNotifications(nextPage, 10);
      if (notifRes.success) {
        setNotificationsList(prev => [...prev, ...(notifRes.notifications || [])]);
        setNotifPage(nextPage);
        setNotifTotalPages(notifRes.totalPages || 1);
      }
    } catch (err) {
      console.error("Error loading more notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const fetchAndAppendSuggestion = useCallback(async (followedId) => {
    try {
      const res = await getDeveloperSuggestions();
      if (res.success && res.suggestions) {
        setSuggestions(prev => {
          const currentIds = new Set(prev.map(s => String(s._id || s)));
          const newSuggestion = res.suggestions.find(s =>
            !currentIds.has(String(s._id || s)) &&
            String(s._id || s) !== String(followedId)
          );

          let next = prev;
          if (newSuggestion) {
            next = [...prev, newSuggestion];
          } else if (prev.length < 5) {
            const missingCount = 5 - prev.length;
            const itemsToAdd = res.suggestions.filter(s =>
              !currentIds.has(String(s._id || s)) &&
              String(s._id || s) !== String(followedId)
            ).slice(0, missingCount);
            next = [...prev, ...itemsToAdd];
          }
          localStorage.setItem("ce_cache_suggestions", JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.error("Failed to fetch replacement suggestion in background:", err);
    }
  }, []);

  const handleFollowToggle = useCallback(async (candidateId) => {
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
      setFollowingList(prev => {
        const next = prev.filter(f => String(f._id || f) !== String(candidateId));
        localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
        return next;
      });
      setOnlineFollows(prev => {
        const next = prev.filter(f => String(f._id || f) !== String(candidateId));
        localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
        return next;
      });
      if (user) {
        setUser(prev => {
          if (!prev) return null;
          const next = { ...prev, followingCount: Math.max(0, (prev.followingCount || 1) - 1) };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
      setSuggestions(prev => {
        const next = prev.map(s => {
          if (String(s._id || s) === String(candidateId)) {
            return { ...s, followersCount: Math.max(0, (s.followersCount || 1) - 1), isFollowing: false };
          }
          return s;
        });
        localStorage.setItem("ce_cache_suggestions", JSON.stringify(next));
        return next;
      });
      setFollowersList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(candidateId)) {
            return { ...f, isFollowing: false };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followersList", JSON.stringify(next));
        return next;
      });
      if (viewingUserProfile && String(viewingUserProfile._id) === String(candidateId)) {
        setViewingUserProfile(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1), isFollowing: false }));
      }
    } else {
      // Follow
      const newFollowItem = { ...targetUser, isFollowing: true };
      setFollowingList(prev => {
        const next = [...prev, newFollowItem];
        localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
        return next;
      });
      if (targetUser.isOnline === "true" || targetUser.isOnline === true) {
        setOnlineFollows(prev => {
          const next = [...prev, newFollowItem];
          localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
          return next;
        });
      }
      if (user) {
        setUser(prev => {
          if (!prev) return null;
          const next = { ...prev, followingCount: (prev.followingCount || 0) + 1 };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
      setSuggestions(prev => {
        const next = prev.filter(s => String(s._id || s) !== String(candidateId));
        localStorage.setItem("ce_cache_suggestions", JSON.stringify(next));
        return next;
      });
      setFollowersList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(candidateId)) {
            return { ...f, isFollowing: true };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followersList", JSON.stringify(next));
        return next;
      });
      if (viewingUserProfile && String(viewingUserProfile._id) === String(candidateId)) {
        setViewingUserProfile(prev => ({ ...prev, followersCount: (prev.followersCount || 0) + 1, isFollowing: true }));
      }

      fetchAndAppendSuggestion(candidateId);
    }

    try {
      const res = await toggleFollowUser(candidateId);
      if (res.success) {
        addToast(res.message, "success");
      } else {
        throw new Error(res.message || "Failed to toggle follow status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      setFollowingList(prevFollowingList);
      setOnlineFollows(prevOnlineFollows);
      setSuggestions(prevSuggestions);
      setFollowersList(prevFollowersList);
      if (prevUser) setUser(prevUser);
      if (prevViewingUser) setViewingUserProfile(prevViewingUser);
      localStorage.setItem("ce_cache_followingList", JSON.stringify(prevFollowingList));
      localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(prevOnlineFollows));
      localStorage.setItem("ce_cache_suggestions", JSON.stringify(prevSuggestions));
      localStorage.setItem("ce_cache_followersList", JSON.stringify(prevFollowersList));
      if (prevUser) localStorage.setItem("user", JSON.stringify(prevUser));
    }
  }, [user, setUser, followingList, onlineFollows, suggestions, followersList, viewingUserProfile, addToast, fetchAndAppendSuggestion]);

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
    const currentUser = user;
    if (!currentUser) return;

    setAnimatingLikes(prev => ({ ...prev, [roomId]: true }));
    setTimeout(() => {
      setAnimatingLikes(prev => ({ ...prev, [roomId]: false }));
    }, 600);

    const prevLikedRooms = [...likedRooms];
    const prevTrendingRooms = [...trendingRooms];
    const prevHistoryRooms = [...historyRooms];
    const prevViewingUserLikedRooms = [...viewingUserLikedRooms];
    const prevPublicRooms = [...publicRooms];
    const prevLiveRooms = [...liveRooms];
    const prevRecentRooms = [...recentRooms];
    const prevViewingUserRooms = [...viewingUserRooms];
    const prevSavedRooms = [...savedRooms];

    const wasLiked = isRoomLiked(roomId);
    const isAdd = !wasLiked;

    // Optimistically update likedRooms list
    if (wasLiked) {
      setLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        trendingRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        publicRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        liveRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        recentRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        savedRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        viewingUserRooms.find(r => r && (r.roomId === roomId || r._id === roomId));
      if (matchedRoom) {
        const updatedMatched = {
          ...matchedRoom,
          likesCount: (matchedRoom.likesCount || 0) + 1,
          likedBy: [...(matchedRoom.likedBy || []), currentUser]
        };
        setLikedRooms(prev => [...prev, updatedMatched]);
      }
    }

    const toggleRoomInArray = (roomsArray) => {
      if (!roomsArray) return roomsArray;
      return roomsArray.map(r => {
        if (r && (r.roomId === roomId || r._id === roomId)) {
          const alreadyLiked = (r.likedBy || []).some(u => String(u._id || u) === String(currentUser.id || currentUser._id));
          let updatedLikedBy = r.likedBy || [];
          if (isAdd) {
            if (!alreadyLiked) updatedLikedBy = [...updatedLikedBy, currentUser];
          } else {
            updatedLikedBy = updatedLikedBy.filter(u => String(u._id || u) !== String(currentUser.id || currentUser._id));
          }
          return {
            ...r,
            likesCount: updatedLikedBy.length,
            likedBy: updatedLikedBy
          };
        }
        return r;
      });
    };

    // Optimistically update counts and avatars on all lists
    setTrendingRooms(prev => toggleRoomInArray(prev));
    setHistoryRooms(prev => toggleRoomInArray(prev));
    setPublicRooms(prev => toggleRoomInArray(prev));
    setLiveRooms(prev => toggleRoomInArray(prev));
    setRecentRooms(prev => toggleRoomInArray(prev));
    setViewingUserRooms(prev => toggleRoomInArray(prev));
    setSavedRooms(prev => toggleRoomInArray(prev));

    if (viewingUserProfile) {
      if (wasLiked) {
        setViewingUserLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
      } else {
        const matchedRoom = historyRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          trendingRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          publicRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          liveRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          recentRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          savedRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
          viewingUserRooms.find(r => r && (r.roomId === roomId || r._id === roomId));
        if (matchedRoom) {
          const updatedMatched = {
            ...matchedRoom,
            likesCount: (matchedRoom.likesCount || 0) + 1,
            likedBy: [...(matchedRoom.likedBy || []), currentUser]
          };
          setViewingUserLikedRooms(prev => [...prev, updatedMatched]);
        }
      }
    }

    try {
      const res = await toggleLikeRoom(roomId);
      if (res.success) {
        const notifRes = await getNotifications(1, 10).catch(() => ({ success: false, notifications: [], unreadCount: 0 }));
        if (notifRes.success) {
          setNotificationsList(notifRes.notifications || []);
          setUnreadNotificationsCount(notifRes.unreadCount || 0);
          setNotifPage(1);
          setNotifTotalPages(notifRes.totalPages || 1);
        }
      } else {
        throw new Error(res.message || "Failed to update like status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      setLikedRooms(prevLikedRooms);
      setTrendingRooms(prevTrendingRooms);
      setHistoryRooms(prevHistoryRooms);
      setViewingUserLikedRooms(prevViewingUserLikedRooms);
      setPublicRooms(prevPublicRooms);
      setLiveRooms(prevLiveRooms);
      setRecentRooms(prevRecentRooms);
      setViewingUserRooms(prevViewingUserRooms);
      setSavedRooms(prevSavedRooms);
    }
  };

  const handleBookmarkRoom = async (roomId) => {
    if (pendingBookmarksRef.current.has(roomId)) return;
    pendingBookmarksRef.current.add(roomId);

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
    } finally {
      pendingBookmarksRef.current.delete(roomId);
    }
  };

  const startEditingProfile = () => {
    setBioInput(user?.bio || "");
    setLangsInput((user?.programmingLanguages || []).join(", "));
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
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
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCoverBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast("Please upload an image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("Image size must be less than 5MB.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("coverBanner", file);

    try {
      addToast("Uploading cover banner...", "info");
      const res = await uploadCoverBanner(formData);
      if (res.success) {
        setUser(prev => {
          const updated = { ...prev, coverBanner: res.coverBanner };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        addToast("Cover banner updated successfully", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleCoverBannerDelete = async () => {
    try {
      addToast("Deleting cover banner...", "info");
      const res = await deleteCoverBanner();
      if (res.success) {
        setUser(prev => {
          const updated = { ...prev, coverBanner: "" };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
        addToast("Cover banner removed successfully", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleViewUserProfile = async (targetUserId) => {
    // If viewing own profile, redirect to own profile tab directly
    if (user && (String(targetUserId) === String(user.id) || String(targetUserId) === String(user._id))) {
      setViewingUserProfile(null);
      setViewingUserRooms([]);
      setViewingUserLikedRooms([]);
      setViewingUserStats(null);
      setActiveSection("profile");
      setProfileTab("rooms");
      fetchProfilePosts(user.id || user._id);
      navigate("/dashboard?tab=profile");
      return;
    }

    // Clear previous profile to avoid flashing old data
    setViewingUserProfile(null);
    setViewingUserRooms([]);
    setViewingUserLikedRooms([]);
    setViewingUserStats(null);

    // Always transition to profile section tab
    setActiveSection("profile");
    setProfileTab("rooms");

    // Update URL to point to this target user's public profile
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("tab") !== "profile" || searchParams.get("userId") !== String(targetUserId)) {
      navigate(`/dashboard?tab=profile&userId=${targetUserId}`);
    }

    try {
      setIsLoadingDashboard(true);
      setSelectedYear("last12");
      const res = await getUserPublicProfile(targetUserId);
      if (res.success) {
        setViewingUserProfile(res.user);
        setViewingUserRooms(res.rooms || []);
        setViewingUserLikedRooms(res.likedRooms || []);
        setViewingUserStats(res.stats || null);
        fetchProfilePosts(targetUserId);
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      setActiveSection("dashboard");
      navigate("/dashboard");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    try {
      setIsLoadingStats(true);
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
      setIsLoadingStats(false);
    }
  };

  const handleTargetYearChange = async (year) => {
    setSelectedYear(year);
    if (!viewingUserProfile) return;
    try {
      setIsLoadingStats(true);
      const res = await getUserPublicProfile(viewingUserProfile._id, year);
      if (res.success) {
        setViewingUserStats(res.stats || null);
      }
    } catch (err) {
      addToast("Failed to fetch developer statistics for selected year.", "error");
    } finally {
      setIsLoadingStats(false);
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
        window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
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
        window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleAcceptInvite = async (targetRoomId, notifId) => {
    const confirm = await window.showConfirm(
      "Are you sure you want to accept this invitation and enter the workspace?",
      "Join Workspace",
      "info"
    );
    if (!confirm) return;
    try {
      await acceptWorkspaceInvite(targetRoomId);
      await markNotificationsRead(notifId);
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
      navigate(`/editor/${targetRoomId}`);
    } catch (err) {
      console.error("Failed to accept workspace invite:", err);
    }
  };

  const handleIgnoreInvite = async (notifId) => {
    try {
      await markNotificationsRead(notifId);
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to ignore workspace invite:", err);
    }
  };

  const fetchAnnouncementsData = async () => {
    try {
      const data = await getActiveAnnouncements();
      if (data.success) {
        setActiveAnnouncements(data.announcements || []);
        localStorage.setItem("ce_cache_activeAnnouncements", JSON.stringify(data.announcements || []));
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
        localStorage.setItem("ce_cache_activeAds", JSON.stringify(data.ads || []));
      }
    } catch (err) {
      console.error("Failed to load active ads:", err);
    }
  };

  const [trustStatus, setTrustStatus] = useState(null);

  const fetchTrustStatus = useCallback(async () => {
    try {
      const res = await getTrustSafetyStatus();
      if (res.success) {
        setTrustStatus(res.status);
      }
    } catch (err) {
      console.error("Failed to load trust safety status for dashboard dashboard:", err.message);
    }
  }, []);

  const renderTrustSafetyHeaderCards = () => {
    if (!trustStatus) return null;
    return (
      <div 
        className="ce-trust-safety-cards-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
          width: "100%"
        }}
      >
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Account Status</span>
          <span style={{
            fontSize: "0.78rem",
            fontWeight: "750",
            color: trustStatus.accountStatus === "Active" ? "#10b981" : "#f59e0b"
          }}>{trustStatus.accountStatus}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Account Health</span>
          <span style={{
            fontSize: "0.8rem",
            fontWeight: "750",
            color: trustStatus.accountHealth >= 80 ? "#10b981" : trustStatus.accountHealth >= 50 ? "#f59e0b" : "#ef4444"
          }}>{trustStatus.accountHealth}%</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Active Restrictions</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#f43f5e" }}>{trustStatus.counters?.activeRestrictionsCount || 0}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Open Appeals</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "var(--accent)" }}>{trustStatus.counters?.openAppealsCount || 0}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Open Tickets</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#10b981" }}>{trustStatus.counters?.openSupportTicketsCount || 0}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Total Warnings</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#f59e0b" }}>{trustStatus.totalWarnings || 0}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Removed Posts</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#ef4444" }}>{trustStatus.counters?.removedPostsCount || 0}</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.62rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Hidden Posts</span>
          <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#ef4444" }}>{trustStatus.counters?.hiddenPostsCount || 0}</span>
        </div>
      </div>
    );
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
      fetchTrustStatus();
      const interval = setInterval(() => {
        fetchDashboardData();
        fetchSocialDashboardData();
        fetchAnnouncementsData();
        fetchAdsData();
        fetchTrustStatus();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [user?.id, user?._id, fetchTrustStatus]);

  useEffect(() => {
    const handleAdminPostAction = ({ postId, post: updatedPost }) => {
      if (updatedPost && (String(updatedPost.author) === String(user?.id || user?._id) || String(updatedPost.author?._id) === String(user?.id || user?._id))) {
        fetchTrustStatus();
      }
      // 1. If post is hidden or deleted, remove it
      if (updatedPost.status === "hidden" || updatedPost.status === "deleted") {
        setAllFeedPosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
        setProfilePosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
        setSelectedPostModal(prev => {
          if (prev && (prev._id === postId || prev.id === postId)) {
            addToast("This post has been moderated or hidden by the platform.", "info");
            return null;
          }
          return prev;
        });
      } else {
        // 2. Otherwise update fields
        const updateFn = p => {
          if (p._id === postId || p.id === postId) {
            return {
              ...p,
              ...updatedPost,
              _id: postId,
              id: postId,
              author: p.author
            };
          }
          return p;
        };
        setAllFeedPosts(prev => prev.map(updateFn));
        setProfilePosts(prev => prev.map(updateFn));
        setSelectedPostModal(prev => {
          if (prev && (prev._id === postId || prev.id === postId)) {
            return {
              ...prev,
              ...updatedPost,
              _id: postId,
              id: postId,
              author: prev.author
            };
          }
          return prev;
        });
      }
    };

    const handleAdminUserAction = ({ userId, isSuspended, user: updatedUser }) => {
      // Refresh safety parameters
      const currentUserId = user?.id || user?._id;
      if (currentUserId && String(currentUserId) === String(userId)) {
        fetchTrustStatus();
      }

      if (isSuspended) {
        // Remove all posts by this user from feed/profile arrays
        const filterFn = p => p.author?._id !== userId && p.author?.id !== userId;
        setAllFeedPosts(prev => prev.filter(filterFn));
        setProfilePosts(prev => prev.filter(filterFn));
        setSelectedPostModal(prev => {
          if (prev && (prev.author?._id === userId || prev.author?.id === userId)) {
            addToast("This user has been suspended by the platform.", "info");
            return null;
          }
          return prev;
        });

        // Force logout if self is suspended
        if (currentUserId && String(currentUserId) === String(userId)) {
          localStorage.clear();
          addToast("Your account has been suspended by an administrator.", "error");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
      }
    };

    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("admin-user-action", handleAdminUserAction);

    return () => {
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("admin-user-action", handleAdminUserAction);
    };
  }, [user, addToast, fetchTrustStatus]);

  useEffect(() => {
    if (activeAds.length > 0 && !hasShownPopup) {
      const popupAd = activeAds.find(ad => ad.format === "POPUP");
      if (popupAd) {
        const isDismissed = localStorage.getItem(`ce_dismissed_ad_${popupAd._id}`);
        if (!isDismissed) {
          setCurrentPopupAd(popupAd);
          setHasShownPopup(true);
        }
      }
    }
  }, [activeAds, hasShownPopup]);

  const handleClosePopupAd = () => {
    if (currentPopupAd) {
      localStorage.setItem(`ce_dismissed_ad_${currentPopupAd._id}`, "true");
    }
    setCurrentPopupAd(null);
  };

  const handlePopupAdClick = () => {
    if (currentPopupAd) {
      localStorage.setItem(`ce_dismissed_ad_${currentPopupAd._id}`, "true");
      if (currentPopupAd.redirectUrl) {
        window.open(currentPopupAd.redirectUrl, "_blank", "noopener,noreferrer");
      }
    }
    setCurrentPopupAd(null);
  };

  useEffect(() => {
    if (user && !isEditingProfile) {
      setBioInput(user.bio || "");
      setLangsInput((user.programmingLanguages || []).join(", "));
    }
  }, [user, isEditingProfile]);

  const fetchLeaderboardData = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await getLeaderboard();
      if (res.success) {
        setLeaderboardData(res.leaderboard || []);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      addToast("Failed to load global leaderboard", "error");
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (activeSection === "leaderboard") {
      fetchLeaderboardData();
    }
  }, [activeSection]);


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

    const handleRoomLikeUpdate = ({ roomId, likesCount, likedBy }) => {
      const updateLikes = (roomsArray) =>
        roomsArray.map(r => (r && (r.roomId === roomId || r._id === roomId) ? { ...r, likesCount, likedBy } : r));

      setTrendingRooms(prev => updateLikes(prev));
      setHistoryRooms(prev => updateLikes(prev));
      setPublicRooms(prev => updateLikes(prev));
      setLiveRooms(prev => updateLikes(prev));
      setRecentRooms(prev => updateLikes(prev));
      setViewingUserRooms(prev => updateLikes(prev));
      setSavedRooms(prev => updateLikes(prev));
      setViewingUserLikedRooms(prev => updateLikes(prev));
    };

    const handleRoomMyLikesUpdate = async () => {
      try {
        const res = await getLikedRooms();
        if (res.success) {
          setLikedRooms(res.rooms || []);
        }
      } catch (err) {
        console.error("Error updating my likes:", err);
      }
    };

    const handleRoomBookmarkUpdate = () => {
      fetchSocialDashboardData();
    };

    const handleUserFollowUpdate = ({ targetUserId, isFollowing, followingCount, targetUser }) => {
      if (followingCount !== undefined) {
        setUser(prev => prev ? { ...prev, followingCount } : null);
      }
      setSuggestions(prev => prev.map(s => {
        if (String(s._id || s) === String(targetUserId)) {
          return {
            ...s,
            isFollowing,
            followersCount: isFollowing ? (s.followersCount || 0) + 1 : Math.max(0, (s.followersCount || 1) - 1)
          };
        }
        return s;
      }));
      if (isFollowing) {
        setFollowingList(prev => {
          if (prev.some(f => String(f._id || f) === String(targetUserId))) return prev;
          const candidate = targetUser || suggestions.find(s => String(s._id || s) === String(targetUserId)) || { _id: targetUserId, username: "Developer" };
          const next = [...prev, { ...candidate, isFollowing: true }];
          localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
          return next;
        });
      } else {
        setFollowingList(prev => {
          const next = prev.filter(f => String(f._id || f) !== String(targetUserId));
          localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
          return next;
        });
        setOnlineFollows(prev => {
          const next = prev.filter(f => String(f._id || f) !== String(targetUserId));
          localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
          return next;
        });
      }
    };

    const handleUserFollowersUpdate = ({ followerId, isFollowing, followersCount, followerUser }) => {
      if (followersCount !== undefined) {
        setUser(prev => prev ? { ...prev, followersCount } : null);
      }
      if (followerUser) {
        setFollowersList(prev => {
          let next;
          if (isFollowing) {
            if (prev.some(f => String(f._id || f) === String(followerId))) return prev;
            next = [...prev, followerUser];
          } else {
            next = prev.filter(f => String(f._id || f) !== String(followerId));
          }
          localStorage.setItem("ce_cache_followersList", JSON.stringify(next));
          return next;
        });
      }
    };

    const handleFollowSuccess = ({ targetUserId, isFollowing, followingCount }) => {
      if (followingCount !== undefined) {
        setUser(prev => {
          if (!prev) return null;
          const next = { ...prev, followingCount };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
    };

    const handleNewFollower = ({ followerId, isFollowing, followersCount }) => {
      if (followersCount !== undefined) {
        setUser(prev => {
          if (!prev) return null;
          const next = { ...prev, followersCount };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
    };

    const handleFollowCountUpdated = ({ userId, followersCount, followerId, followingCount }) => {
      setSuggestions(prev => {
        const next = prev.map(s => {
          if (String(s._id || s) === String(userId)) {
            return { ...s, followersCount };
          }
          if (String(s._id || s) === String(followerId)) {
            return { ...s, followingCount };
          }
          return s;
        });
        localStorage.setItem("ce_cache_suggestions", JSON.stringify(next));
        return next;
      });

      setFollowingList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(userId)) {
            return { ...f, followersCount };
          }
          if (String(f._id || f) === String(followerId)) {
            return { ...f, followingCount };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
        return next;
      });

      setFollowersList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(userId)) {
            return { ...f, followersCount };
          }
          if (String(f._id || f) === String(followerId)) {
            return { ...f, followingCount };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followersList", JSON.stringify(next));
        return next;
      });

      if (viewingUserProfile) {
        if (String(viewingUserProfile._id) === String(userId)) {
          setViewingUserProfile(prev => ({ ...prev, followersCount }));
        } else if (String(viewingUserProfile._id) === String(followerId)) {
          setViewingUserProfile(prev => ({ ...prev, followingCount }));
        }
      }
    };

    const handleSuggestionRefresh = ({ followedUserId }) => {
      fetchAndAppendSuggestion(followedUserId);
    };

    socket.on("room:like-update", handleRoomLikeUpdate);
    socket.on("room:my-likes-update", handleRoomMyLikesUpdate);
    socket.on("room:bookmark-update", handleRoomBookmarkUpdate);
    socket.on("user:follow-update", handleUserFollowUpdate);
    socket.on("user:followers-update", handleUserFollowersUpdate);
    socket.on("follow-success", handleFollowSuccess);
    socket.on("new-follower", handleNewFollower);
    socket.on("follow-count-updated", handleFollowCountUpdated);
    socket.on("suggestion-refresh", handleSuggestionRefresh);

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
      socket.off("room:like-update", handleRoomLikeUpdate);
      socket.off("room:my-likes-update", handleRoomMyLikesUpdate);
      socket.off("room:bookmark-update", handleRoomBookmarkUpdate);
      socket.off("user:follow-update", handleUserFollowUpdate);
      socket.off("user:followers-update", handleUserFollowersUpdate);
      socket.off("follow-success", handleFollowSuccess);
      socket.off("new-follower", handleNewFollower);
      socket.off("follow-count-updated", handleFollowCountUpdated);
      socket.off("suggestion-refresh", handleSuggestionRefresh);

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
  }, [user?.id, user?._id, socket, fetchAndAppendSuggestion]);


  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setIsCreatingRoom(true);
    try {
      const data = await createRoom(formData.title, formData.language, formData.isPrivate);
      setShowQuickCreateModal(false);
      setIsCreatingRoom(false);
      triggerGateAndNavigate(data.room.roomId);
    } catch (error) {
      setIsCreatingRoom(false);
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
    const confirmLeave = await window.showConfirm("Are you sure you want to leave this room?", "Leave Room", "warning");
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
    const confirmDelete = await window.showConfirm("Are you sure you want to delete this room? This action cannot be undone.", "Delete Room", "error");
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

  const getBannerGradient = (username) => {
    const colors = [
      "linear-gradient(135deg, #3f37c9 0%, #480ca8 100%)",
      "linear-gradient(135deg, #7209b7 0%, #f72585 100%)",
      "linear-gradient(135deg, #03045e 0%, #0077b6 100%)",
      "linear-gradient(135deg, #1b4332 0%, #40916c 100%)",
      "linear-gradient(135deg, #d90429 0%, #ef233c 100%)",
      "linear-gradient(135deg, #ffa116 0%, #ff5500 100%)",
      "linear-gradient(135deg, #240046 0%, #7b2cbf 100%)",
    ];
    if (!username) return colors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const renderRoomCard = (room) => {
    const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
    const ownerName = isOwner ? "You" : (room.createdBy?.username || "Developer");
    const activeCount = room.activeUsersCount || 0;
    const isBookmarked = savedRooms.some(r => r && (r.roomId === room.roomId || r._id === room._id || r._id === room.roomId));

    // Get all joined members (owner + participants)
    const allMembers = [];
    const memberIds = new Set();

    if (room.createdBy) {
      const ownerId = room.createdBy._id || room.createdBy;
      allMembers.push({
        _id: String(ownerId),
        username: room.createdBy.username || "Owner",
        avatar: room.createdBy.avatar,
        role: "OWNER",
        isOwner: true
      });
      memberIds.add(String(ownerId));
    }

    if (room.participants) {
      room.participants.forEach(p => {
        const userObj = p.user && typeof p.user === 'object' ? p.user : null;
        const pId = userObj ? userObj._id : (p.user || p._id || p);
        if (pId && !memberIds.has(String(pId))) {
          const username = userObj ? userObj.username : (p.username || "Collaborator");
          const avatar = userObj ? userObj.avatar : p.avatar;
          const role = p.role || "MEMBER";
          allMembers.push({
            _id: String(pId),
            username: username,
            avatar: avatar,
            role: role,
            isOwner: role === "OWNER" || String(pId) === String(room.createdBy?._id || room.createdBy)
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
                      {m.role && (
                        <span className={`drawer-member-role-tag ${String(m.role).toLowerCase()}`}>
                          {m.role}
                        </span>
                      )}
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
                      {m.role && (
                        <span className={`drawer-member-role-tag ${String(m.role).toLowerCase()}`}>
                          {m.role}
                        </span>
                      )}
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
                      <span className="drawer-member-role-tag owner">OWNER</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <hr className="room-card-divider" />

          {/* Bottom Layout */}
          <div className="room-card-footer-layout">
            <div className="room-card-footer-top-line">
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

              {/* Secondary Actions */}
              <div className="room-card-footer-actions-secondary">
                <button
                  type="button"
                  className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeRoom(room.roomId);
                  }}
                  title={isRoomLiked(room.roomId) ? "Unlike Room" : "Like Room"}
                >
                  <Heart
                    size={13}
                    fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                  />
                  <span className="like-count-text">{room.likesCount || 0}</span>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmarkRoom(room.roomId);
                          setActiveDropdownCardId(null);
                        }}
                        className="dropdown-item"
                      >
                        {isBookmarked ? "Remove Bookmark" : "Bookmark Room"}
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

            {/* Primary Actions */}
            <div className="room-card-footer-buttons-primary">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRoomDetails(room);
                }}
                className="details-btn-new"
              >
                Details
              </button>
              <button
                onClick={() => handleJoinRoomDirect(room.roomId)}
                onMouseEnter={prefetchEditor}
                className="resume-btn-new"
              >
                <span>Open Workspace</span>
                <ChevronRight size={14} />
              </button>
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
      else if (notif.type === "INVITE") actionText = `invited you to join workspace "${notif.targetRoom?.title || "workspace"}"`;
      return {
        id: notif._id,
        message: `${notif.sender?.username || "Someone"} ${actionText}`,
        time: notif.createdAt,
        type: notif.type,
        roomId: notif.targetRoom?.roomId
      };
    });

  if (!localStorage.getItem("token")) {
    return null;
  }

  if (isMaintenance) {
    return (
      <div className="maintenance-lockout-overlay" style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "var(--ce-fog)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        fontFamily: "var(--sans)",
        color: "var(--ce-text-h)"
      }}>
        <div className="maintenance-lockout-card glass-panel" style={{
          maxWidth: "450px",
          padding: "40px 30px",
          background: "var(--ce-surface)",
          border: "1px solid var(--ce-border)",
          borderRadius: "12px",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--ce-card-shadow)",
          textAlign: "center"
        }}>
          <div className="lockout-pulse-icon" style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--ce-danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto"
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: "750", color: "var(--ce-text-h)", margin: "0 0 10px 0" }}>System Under Maintenance</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--ce-text)", margin: "0 0 24px 0", lineHeight: "1.45" }}>
            CodeExpo is currently undergoing scheduled platform diagnostics and service optimization.
          </p>
          <div style={{
            borderTop: "1px solid var(--ce-border)",
            paddingTop: "20px",
            fontSize: "0.78rem",
            color: "var(--ce-danger)",
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
      <div className={`ce-dashboard-container ${activeSection === "feed" ? "feed-layout-active" : ""}`}>
        <AnimatePresence mode="wait">
          {activeSection === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <div className="dashboard-home-section">
                {renderTrustSafetyHeaderCards()}
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
                  {isLoadingDashboard && stats.totalCreated === 0 && stats.totalJoined === 0 ? (
                    <StatsSkeleton />
                  ) : (
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
                  )}

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

                        {isLoadingDashboard && liveRooms.length === 0 ? (
                          <div style={{ padding: "10px" }}>
                            <RoomGridSkeleton count={2} />
                          </div>
                        ) : liveRooms.length === 0 ? (
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
                              <div className="active-rooms-wrapper">
                                {/* Segmented Pill Switcher with Round Sliding Background */}
                                <div className="ce-pill-switcher-container">
                                  <div className="ce-pill-switcher">
                                    <div
                                      className="ce-pill-bg-slide"
                                      style={{
                                        transform: activeRoomsTab === "my-active" ? "translateX(0)" : "translateX(100%)"
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className={`ce-pill-btn ${activeRoomsTab === "my-active" ? "active" : ""}`}
                                      onClick={() => setActiveRoomsTab("my-active")}
                                    >
                                      My Active ({myActive.length})
                                    </button>
                                    <button
                                      type="button"
                                      className={`ce-pill-btn ${activeRoomsTab === "other-active" ? "active" : ""}`}
                                      onClick={() => setActiveRoomsTab("other-active")}
                                    >
                                      Other Active ({otherActive.length})
                                    </button>
                                  </div>
                                </div>

                                {/* Tab Contents */}
                                {activeRoomsTab === "my-active" && (
                                  <div className="active-rooms-tab-pane">
                                    {myActive.length === 0 ? (
                                      <div className="empty-state-card compact">
                                        <p>No active workspaces of yours.</p>
                                      </div>
                                    ) : (
                                      <div className="rooms-grid-explore">
                                        {myActive.map(room => renderRoomCard(room))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {activeRoomsTab === "other-active" && (
                                  <div className="active-rooms-tab-pane">
                                    {otherActive.length === 0 ? (
                                      <div className="empty-state-card compact">
                                        <p>No other active workspaces online.</p>
                                      </div>
                                    ) : (
                                      <div className="rooms-grid-explore">
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

                      {/* SPLIT FEED AND RECENT JOINED ROOMS GRID */}
                      <div className="ce-dashboard-split-grid">

                        {/* LEFT SECTION: DEVELOPER ACTIVITY FEED */}
                        <section className="ce-dashboard-section social-feed-section" style={{ marginBottom: 0 }}>
                          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Activity size={16} className="brand-logo" />
                              <h3 className="section-title">Developer Activity Feed</h3>
                            </div>
                          </div>

                          {isLoadingDashboard && feedActivities.length === 0 ? (
                            <ActivityFeedSkeleton count={3} />
                          ) : feedActivities.length === 0 ? (
                            <div className="empty-state-card">
                              <p>No activity logs recorded. Follow other developers to see their updates here!</p>
                            </div>
                          ) : (
                            <div className="social-activities-list">
                              {feedActivities.slice(0, visibleFeedCount).map(act => (
                                <div key={act._id} className="social-activity-card">
                                  <div className="social-activity-header">
                                    <div className="social-activity-actor-info">
                                      <div className="actor-avatar" style={{ background: act.user?.avatar ? "transparent" : getAvatarColor(act.user?.username || "D") }}>
                                        {act.user?.avatar ? (
                                          <img src={act.user.avatar} alt={act.user?.username} />
                                        ) : (
                                          <span>{(act.user?.username || "D").charAt(0).toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="actor-meta">
                                        <span className="actor-username">
                                          <strong>{act.user?.username || "Someone"}</strong>
                                        </span>
                                        <span className="activity-action-text">
                                          {act.action} {act.roomTitle ? (
                                            <strong className="clickable-room" onClick={() => act.room?.roomId && handleJoinRoomDirect(act.room.roomId)}>
                                              {act.roomTitle}
                                            </strong>
                                          ) : act.targetUser ? (
                                            <strong className="activity-target-user">{act.targetUser.username}</strong>
                                          ) : ""}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="activity-timestamp">
                                      {formatLastActive(act.timestamp)}
                                    </span>
                                  </div>
                                </div>
                              ))}

                              {(visibleFeedCount < feedActivities.length || feedPage < feedTotalPages) && (
                                <button
                                  onClick={handleLoadMoreFeedClick}
                                  className="feed-load-more-btn"
                                  disabled={feedLoading}
                                >
                                  {feedLoading ? "Loading..." : "Load More Activity"}
                                </button>
                              )}
                            </div>
                          )}
                        </section>

                        {/* RIGHT SECTION: RECENT JOINED ROOMS */}
                        <section className="ce-dashboard-section recent-joined-section" style={{ marginBottom: 0 }}>
                          <div className="section-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Users size={16} className="brand-logo" style={{ color: "var(--ce-success)" }} />
                              <h3 className="section-title">Recent Joined Rooms</h3>
                            </div>
                          </div>

                          {isLoadingDashboard && historyRooms.length === 0 ? (
                            <ActivityFeedSkeleton count={3} />
                          ) : (() => {
                            const joinedRooms = historyRooms.filter(room => {
                              const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
                              return !isOwner;
                            });

                            if (joinedRooms.length === 0) {
                              return (
                                <div className="empty-state-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                  <Terminal size={18} className="empty-state-icon" />
                                  <p>No recently joined rooms. Join rooms from the Explore tab or via room code!</p>
                                </div>
                              );
                            }

                            return (
                              <div className="recent-joined-list">
                                {joinedRooms.slice(0, visibleJoinedRooms).map(room => {
                                  const activeCount = room.activeUsersCount || 0;
                                  const isOnline = activeCount > 0;
                                  const langClass = (room.language || "javascript").toLowerCase();
                                  return (
                                    <div
                                      key={room._id}
                                      className="recent-joined-card"
                                      onClick={() => handleJoinRoomDirect(room.roomId)}
                                      onMouseEnter={prefetchEditor}
                                    >
                                      <div className="joined-card-top-content">
                                        <div className="joined-card-logo-area">
                                          {renderLanguageLogo(room.language, room.title)}
                                        </div>
                                        <div className="joined-card-info-area">
                                          <h4 className="joined-room-title" title={room.title}>{room.title}</h4>
                                          <span className="joined-room-owner">
                                            Owner: <strong>@{room.createdBy?.username || "Developer"}</strong>
                                          </span>
                                        </div>
                                      </div>
                                      <div className="joined-card-footer-layout">
                                        <span className={`joined-status ${isOnline ? "online" : "offline"}`}>
                                          <span className={`status-dot-mini ${isOnline ? "active" : "offline"}`} />
                                          {isOnline ? `${activeCount} Active` : "Offline"}
                                        </span>
                                        <button
                                          className="joined-enter-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleJoinRoomDirect(room.roomId);
                                          }}
                                        >
                                          Enter
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                {joinedRooms.length > visibleJoinedRooms && (
                                  <button
                                    onClick={() => setVisibleJoinedRooms(prev => prev + 4)}
                                    className="feed-load-more-btn"
                                    style={{ marginTop: "14px" }}
                                  >
                                    Load More Rooms
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </section>

                      </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="ce-column-right">


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
                        {isLoadingDashboard && onlineFollows.length === 0 ? (
                          <UserListSkeleton count={3} />
                        ) : onlineFollows.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No followed developers online.</p>
                          </div>
                        ) : (
                          <div className="online-follows-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {onlineFollows.map(f => (
                              <div key={f._id} className="online-follow-item" onClick={() => handleViewUserProfile(f._id)}>
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
                        {isLoadingDashboard && suggestions.length === 0 ? (
                          <UserListSkeleton count={3} showButton={true} />
                        ) : suggestions.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No suggestions available.</p>
                          </div>
                        ) : (
                          <div className="suggestions-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {suggestions.map(s => (
                              <div key={s._id} className="suggestion-item">
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
                                  className={`suggestion-follow-btn ${followingList.some(f => String(f._id || f) === String(s._id)) ? "following" : ""}`}
                                  onClick={() => handleFollowToggle(s._id)}
                                >
                                  {followingList.some(f => String(f._id || f) === String(s._id)) ? (
                                    <>
                                      <Check size={10} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Following
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={10} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Follow
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* TRENDING ROOMS */}
                      <section className="ce-dashboard-section">
                        <h3 className="section-title">
                          <Activity size={14} /> Trending Rooms
                        </h3>
                        {isLoadingDashboard && trendingRooms.length === 0 ? (
                          <TrendingListSkeleton count={2} />
                        ) : trendingRooms.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No trending rooms.</p>
                          </div>
                        ) : (
                          <div className="trending-rooms-list">
                            {trendingRooms.map((room, index) => {
                              const rank = index + 1;
                              const creatorName = room.createdBy?.username || "Developer";
                              const creatorAvatar = room.createdBy?.avatar;
                              const lang = (room.language || "javascript").toLowerCase();

                              let rankIcon = <Flame size={12} />;
                              if (rank === 1) rankIcon = <Trophy size={12} className="text-gold" />;
                              else if (rank === 2) rankIcon = <Flame size={12} className="text-orange" />;

                              return (
                                <div
                                  key={room._id}
                                  className={`trending-room-card rank-${rank}`}
                                  onClick={() => handleJoinRoomDirect(room.roomId)}
                                >
                                  <div className="trending-card-top">
                                    <div className="trending-creator-info">
                                      <div
                                        className="trending-creator-avatar"
                                        style={{
                                          backgroundColor: creatorAvatar ? "transparent" : getAvatarColor(creatorName)
                                        }}
                                      >
                                        {creatorAvatar ? (
                                          <img src={creatorAvatar} alt={creatorName} />
                                        ) : (
                                          creatorName.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <span className="trending-creator-name">@{creatorName}</span>
                                    </div>
                                    <span className={`trending-rank-badge rank-${rank}`}>
                                      {rankIcon}
                                      <span>#{rank}</span>
                                    </span>
                                  </div>

                                  <h4 className="trending-card-title">
                                    {room.title}
                                  </h4>

                                  <div className="trending-card-bottom">
                                    <div className="trending-meta-left">
                                      <span className={`trending-lang-tag lang-${lang}`}>
                                        <Code size={11} />
                                        <span>{room.language || "JavaScript"}</span>
                                      </span>
                                      {room.lastActivity && (
                                        <span className="trending-time-ago" title="Last Active">
                                          <Clock size={11} />
                                          <span>{formatLastActive(room.lastActivity)}</span>
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      className={`room-trending-like-btn ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLikeRoom(room.roomId);
                                      }}
                                      title={isRoomLiked(room.roomId) ? "Unlike Room" : "Like Room"}
                                    >
                                      <Heart
                                        size={12}
                                        fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                      />
                                      <span className="like-count-text">{room.likesCount || 0}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      {/* SPONSORED PROMOTIONS */}
                      {(sidebarAds.length > 0 || (isLoadingDashboard && activeAds.length === 0)) && (
                        <section className="ce-dashboard-section sponsored-ads-section">
                          <h3 className="section-title text-warning" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={14} style={{ color: "var(--ce-warning)" }} /> Sponsored Promotions
                          </h3>
                          <div className="sponsored-ads-container" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {isLoadingDashboard && activeAds.length === 0 ? (
                              <AdSkeleton />
                            ) : (
                              sidebarAds.map(ad => (
                                <a
                                  key={ad._id}
                                  href={ad.redirectUrl || undefined}
                                  target={ad.redirectUrl ? "_blank" : undefined}
                                  rel="noopener noreferrer"
                                  className="sponsored-ad-card"
                                  style={{ color: "inherit" }}
                                >
                                  <div className="sponsored-ad-image-wrapper">
                                    <img
                                      src={ad.imageUrl}
                                      alt={ad.title}
                                      className="sponsored-ad-image"
                                      loading="lazy"
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
                              ))
                            )}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* MY ROOMS SECTION */}
          {activeSection === "myrooms" && (
            <motion.div
              key="myrooms"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <div className="myrooms-section-container">
                {/* Stats Cards Grid for My Rooms */}
                <div className="ce-stats-grid" style={{ marginBottom: "24px" }}>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper blue-theme-wrapper">
                      <FolderGit size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Total Workspaces</span>
                      <span className="stat-card-val">
                        {historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length}
                      </span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper green-theme-wrapper">
                      <Activity size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Active Now</span>
                      <span className="stat-card-val">
                        {historyRooms.filter(r => {
                          const isCreated = r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id;
                          const isLive = liveRooms.some(lr => lr.roomId === r.roomId && (lr.activeUsersCount || 0) > 0);
                          return isCreated && isLive;
                        }).length}
                      </span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper purple-theme-wrapper">
                      <Globe size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Public Access</span>
                      <span className="stat-card-val">
                        {historyRooms.filter(r => {
                          const isCreated = r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id;
                          return isCreated && !r.isPrivate;
                        }).length}
                      </span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper rank-icon-wrapper rank-junior">
                      <Lock size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Private / Secure</span>
                      <span className="stat-card-val">
                        {historyRooms.filter(r => {
                          const isCreated = r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id;
                          return isCreated && r.isPrivate;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FolderGit size={18} className="brand-logo" />
                    <h3 className="section-title">My Created Rooms & Workspaces</h3>
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <div className="section-search-container">
                      <Search size={13} className="section-search-icon" />
                      <input
                        type="text"
                        placeholder="Search by ID or title..."
                        value={myRoomsTabSearch}
                        onChange={(e) => setMyRoomsTabSearch(e.target.value)}
                        className="section-search-input"
                      />
                    </div>
                  </div>
                </div>

                {(() => {
                  const owned = historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id);
                  const filteredOwned = owned.filter(room => {
                    const term = myRoomsTabSearch.toLowerCase();
                    return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                  });

                  if (owned.length === 0) {
                    return (
                      <div className="empty-state-card" style={{ padding: "48px 24px" }}>
                        <Folder size={32} className="empty-state-icon" style={{ color: "var(--ce-primary)", marginBottom: "16px" }} />
                        <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)" }}>No workspaces found</h3>
                        <p style={{ margin: "0 0 16px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>Launch your first collaborative coding workspace right now!</p>
                        <button
                          className="room-enter-btn-action"
                          style={{ margin: "0 auto" }}
                          onClick={() => {
                            setFormData({ title: "", language: "javascript", isPrivate: false });
                            setShowQuickCreateModal(true);
                          }}
                        >
                          <Plus size={14} /> Create Room
                        </button>
                      </div>
                    );
                  }

                  if (filteredOwned.length === 0) {
                    return (
                      <div className="empty-state-card" style={{ padding: "32px" }}>
                        <Search size={24} className="empty-state-icon" />
                        <p>No owned rooms match search term "{myRoomsTabSearch}".</p>
                      </div>
                    );
                  }

                  // Split into Active and Offline
                  const activeRoomsList = filteredOwned.filter(room => {
                    const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                    return roomFromLive && (roomFromLive.activeUsersCount || 0) > 0;
                  });

                  const offlineRoomsList = filteredOwned.filter(room => {
                    const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                    return !roomFromLive || (roomFromLive.activeUsersCount || 0) === 0;
                  });

                  return (
                    <div className="dashboard-split-layout">
                      <div className="split-column">
                        <h4 className="split-column-title">
                          <span className="live-indicator-dot" />
                          Active Rooms ({activeRoomsList.length})
                        </h4>
                        {activeRoomsList.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No active rooms match your search.</p>
                          </div>
                        ) : (
                          <div className="split-column-cards-list">
                            {activeRoomsList.map(room => {
                              const liveRoomObj = liveRooms.find(lr => lr.roomId === room.roomId);
                              return renderRoomCard(liveRoomObj || room);
                            })}
                          </div>
                        )}
                      </div>

                      <div className="split-column">
                        <h4 className="split-column-title">
                          <span className="offline-indicator-dot" />
                          Offline Rooms ({offlineRoomsList.length})
                        </h4>
                        {offlineRoomsList.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No offline rooms match your search.</p>
                          </div>
                        ) : (
                          <div className="split-column-cards-list">
                            {offlineRoomsList.map(room => renderRoomCard(room))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* LIVE ROOMS SECTION */}
          {activeSection === "liverooms" && (
            <motion.div
              key="liverooms"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <div className="liverooms-section-container">
                {/* Stats Header for Live Rooms */}
                <div className="ce-stats-grid" style={{ marginBottom: "24px" }}>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper blue-theme-wrapper">
                      <Activity size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Active Live Rooms</span>
                      <span className="stat-card-val">{liveRooms.length}</span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper green-theme-wrapper">
                      <Users size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Active Developers Online</span>
                      <span className="stat-card-val">
                        {liveRooms.reduce((acc, r) => acc + (r.activeUsersCount || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="live-indicator-dot" />
                    <h3 className="section-title">Global Live Coding Workspaces</h3>
                  </div>
                  <div className="section-search-container">
                    <Search size={13} className="section-search-icon" />
                    <input
                      type="text"
                      placeholder="Search live rooms..."
                      value={publicRoomsSearch}
                      onChange={(e) => setPublicRoomsSearch(e.target.value)}
                      className="section-search-input"
                    />
                  </div>
                </div>

                {liveRooms.length === 0 ? (
                  <div className="empty-state-card" style={{ padding: "48px 24px" }}>
                    <Activity size={32} className="empty-state-icon" style={{ color: "var(--ce-success)", marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)" }}>No active workspaces</h3>
                    <p style={{ margin: "0 0 16px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>Nobody is hosting a live room. Launch yours to go live!</p>
                    <button
                      className="room-enter-btn-action"
                      style={{ margin: "0 auto" }}
                      onClick={() => {
                        setFormData({ title: "", language: "javascript", isPrivate: false });
                        setShowQuickCreateModal(true);
                      }}
                    >
                      <Plus size={14} /> Create Room
                    </button>
                  </div>
                ) : (() => {
                  const filteredLive = liveRooms.filter(room => {
                    const term = publicRoomsSearch.toLowerCase();
                    return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                  });

                  if (filteredLive.length === 0) {
                    return (
                      <div className="empty-state-card" style={{ padding: "32px" }}>
                        <Search size={24} className="empty-state-icon" />
                        <p>No active live rooms match search term "{publicRoomsSearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div className="rooms-grid-explore">
                      {filteredLive.map(room => renderRoomCard(room))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* BOOKMARKS SECTION */}
          {activeSection === "bookmarks" && (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <div className="bookmarks-section-container">
                {/* Stats Cards Grid for Bookmarks */}
                <div className="ce-stats-grid" style={{ marginBottom: "24px" }}>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper blue-theme-wrapper">
                      <Bookmark size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Total Bookmarked</span>
                      <span className="stat-card-val">{savedRooms.length}</span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper green-theme-wrapper">
                      <Activity size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Active Now</span>
                      <span className="stat-card-val">
                        {savedRooms.filter(r => liveRooms.some(lr => lr.roomId === r.roomId && (lr.activeUsersCount || 0) > 0)).length}
                      </span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper purple-theme-wrapper">
                      <Globe size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Public Access</span>
                      <span className="stat-card-val">{savedRooms.filter(r => !r.isPrivate).length}</span>
                    </div>
                  </div>
                  <div className="compact-stat-card">
                    <div className="stat-card-icon-wrapper rank-icon-wrapper rank-junior">
                      <Lock size={18} />
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-label">Private Rooms</span>
                      <span className="stat-card-val">{savedRooms.filter(r => r.isPrivate).length}</span>
                    </div>
                  </div>
                </div>

                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Bookmark size={18} className="brand-logo" style={{ color: "var(--ce-accent)" }} />
                    <h3 className="section-title">My Bookmarked Rooms</h3>
                  </div>
                  <div className="section-search-container">
                    <Search size={13} className="section-search-icon" />
                    <input
                      type="text"
                      placeholder="Search bookmarks..."
                      value={bookmarkSearch}
                      onChange={(e) => setBookmarkSearch(e.target.value)}
                      className="section-search-input"
                    />
                  </div>
                </div>

                {savedRooms.length === 0 ? (
                  <div className="empty-state-card" style={{ padding: "48px 24px" }}>
                    <Bookmark size={32} className="empty-state-icon" style={{ color: "var(--ce-accent)", marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)" }}>No bookmarks found</h3>
                    <p style={{ margin: "0 0 16px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>You haven't bookmarked any spaces yet. Explore public rooms to save them here!</p>
                    <button
                      className="room-enter-btn-action"
                      style={{ margin: "0 auto" }}
                      onClick={() => navigate("/dashboard?tab=rooms&subtab=explore")}
                    >
                      <Globe size={14} /> Explore Rooms
                    </button>
                  </div>
                ) : (() => {
                  const filteredBookmarks = savedRooms.filter(room => {
                    const term = bookmarkSearch.toLowerCase();
                    return room.title.toLowerCase().includes(term) || room.roomId.toLowerCase().includes(term);
                  });

                  if (filteredBookmarks.length === 0) {
                    return (
                      <div className="empty-state-card" style={{ padding: "32px" }}>
                        <Search size={24} className="empty-state-icon" />
                        <p>No bookmarked rooms match search term "{bookmarkSearch}".</p>
                      </div>
                    );
                  }

                  // Split into Active and Offline
                  const activeBookmarksList = filteredBookmarks.filter(room => {
                    const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                    return roomFromLive && (roomFromLive.activeUsersCount || 0) > 0;
                  });

                  const offlineBookmarksList = filteredBookmarks.filter(room => {
                    const roomFromLive = liveRooms.find(lr => lr.roomId === room.roomId);
                    return !roomFromLive || (roomFromLive.activeUsersCount || 0) === 0;
                  });

                  return (
                    <div className="dashboard-split-layout">
                      <div className="split-column">
                        <h4 className="split-column-title">
                          <span className="live-indicator-dot" />
                          Active Rooms ({activeBookmarksList.length})
                        </h4>
                        {activeBookmarksList.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No active bookmarked rooms.</p>
                          </div>
                        ) : (
                          <div className="split-column-cards-list">
                            {activeBookmarksList.map(room => {
                              const liveRoomObj = liveRooms.find(lr => lr.roomId === room.roomId);
                              return renderRoomCard(liveRoomObj || room);
                            })}
                          </div>
                        )}
                      </div>

                      <div className="split-column">
                        <h4 className="split-column-title">
                          <span className="offline-indicator-dot" />
                          Offline Rooms ({offlineBookmarksList.length})
                        </h4>
                        {offlineBookmarksList.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No offline bookmarked rooms.</p>
                          </div>
                        ) : (
                          <div className="split-column-cards-list">
                            {offlineBookmarksList.map(room => renderRoomCard(room))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* NETWORK FEED SECTION */}
          {activeSection === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="feed-section-container"
              style={{ width: "100%" }}
            >
              <div className="premium-layout-wrapper">
                <div className="premium-stories-column">
                  <StoriesSystem user={user} addToast={addToast} vertical={true} />
                </div>
                <div className="premium-center-feed">
                  <DeveloperFeed
                    user={user}
                    addToast={addToast}
                    followingList={followingList}
                    handleFollowToggle={handleFollowToggle}
                    onViewProfile={handleViewUserProfile}
                    suggestions={suggestions}
                  />
                </div>
                <NetworkSidebar
                  suggestions={suggestions}
                  onlineFollows={onlineFollows}
                  handleFollowToggle={handleFollowToggle}
                  handleViewUserProfile={handleViewUserProfile}
                  setPreselectedChatPartner={setPreselectedChatPartner}
                  navigate={navigate}
                />
              </div>
            </motion.div>
          )}

          {/* FOLLOWING SECTION */}
          {activeSection === "following" && (
            <motion.div
              key="following"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="following-section-container"
            >
              {/* V2 Sub-navigation tabs */}
              <div className="social-v2-tabs-nav">
                <button
                  onClick={() => setSocialSubTab("explore")}
                  className={`social-v2-tab-btn ${socialSubTab === "explore" ? "active" : ""}`}
                >
                  Explore Developers
                </button>
                <button
                  onClick={() => setSocialSubTab("analytics")}
                  className={`social-v2-tab-btn ${socialSubTab === "analytics" ? "active" : ""}`}
                >
                  Analytics
                </button>
              </div>

              <AnimatePresence mode="wait">

                {socialSubTab === "analytics" && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    style={{ width: "100%" }}
                  >
                    <NetworkAnalytics addToast={addToast} />
                  </motion.div>
                )}

                {socialSubTab === "explore" && (
                  <motion.div
                    key="explore"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18 }}
                    style={{ width: "100%" }}
                  >
                    <div className="network-split-layout" style={{ display: "flex", gap: "24px", width: "100%", alignItems: "flex-start" }}>

                      {/* 70% Left Column */}
                      <div className="network-left-column" style={{ flex: "0 0 70%", minWidth: 0 }}>

                        {/* Stats row on top of left column */}
                        <div className="ce-stats-grid" style={{ marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", width: "100%" }}>
                          <div className="compact-stat-card" style={{ padding: "10px 12px" }}>
                            <div className="stat-card-icon-wrapper blue-theme-wrapper" style={{ width: "32px", height: "32px" }}>
                              <UserCheck size={14} />
                            </div>
                            <div className="stat-card-info">
                              <span className="stat-card-label" style={{ fontSize: "0.65rem" }}>Following</span>
                              <span className="stat-card-val" style={{ fontSize: "0.95rem" }}>{followingList.length}</span>
                            </div>
                          </div>
                          <div className="compact-stat-card" style={{ padding: "10px 12px" }}>
                            <div className="stat-card-icon-wrapper green-theme-wrapper" style={{ width: "32px", height: "32px" }}>
                              <Users size={14} />
                            </div>
                            <div className="stat-card-info">
                              <span className="stat-card-label" style={{ fontSize: "0.65rem" }}>Followers</span>
                              <span className="stat-card-val" style={{ fontSize: "0.95rem" }}>{followersList.length}</span>
                            </div>
                          </div>
                          <div className="compact-stat-card" style={{ padding: "10px 12px" }}>
                            <div className="stat-card-icon-wrapper purple-theme-wrapper" style={{ width: "32px", height: "32px" }}>
                              <span className="live-indicator-dot" style={{ margin: 0, width: "8px", height: "8px" }} />
                            </div>
                            <div className="stat-card-info" style={{ marginLeft: "6px" }}>
                              <span className="stat-card-label" style={{ fontSize: "0.65rem" }}>Online</span>
                              <span className="stat-card-val" style={{ fontSize: "0.95rem" }}>
                                {followingList.filter(f => f.isOnline === true || f.isOnline === "true").length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <UserCheck size={18} className="brand-logo" style={{ color: "var(--ce-primary)" }} />
                            <h3 className="section-title">Developer Network</h3>
                            {isFollowingLoading && (
                              <span className="btn-spinner" style={{ marginLeft: "4px" }} />
                            )}
                            <AnimatePresence>
                              {followingSearch && (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="network-search-count-badge"
                                >
                                  {filteredFollowing.length} match{filteredFollowing.length !== 1 ? 'es' : ''}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                          <div className="network-search-group">
                            <div className="network-search-input-wrapper">
                              <Search size={14} className="network-search-icon" />
                              <input
                                ref={followingSearchInputRef}
                                type="text"
                                placeholder="Search developers by name or bio..."
                                value={followingSearch}
                                onChange={(e) => {
                                  setFollowingSearch(e.target.value);
                                  setVisibleFollowingCount(6);
                                }}
                                className="network-search-input"
                              />
                              <AnimatePresence>
                                {followingSearch && (
                                  <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    type="button"
                                    className="network-clear-btn"
                                    onClick={() => {
                                      setFollowingSearch("");
                                      setVisibleFollowingCount(6);
                                      followingSearchInputRef.current?.focus();
                                    }}
                                    aria-label="Clear search"
                                  >
                                    <X size={14} />
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>

                        {followingList.length === 0 ? (
                          <div className="empty-state-card" style={{ padding: "40px 24px", marginBottom: "32px" }}>
                            <Users size={32} className="empty-state-icon" style={{ color: "var(--ce-text-muted)", marginBottom: "16px" }} />
                            <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)" }}>Not following anyone yet</h3>
                            <p style={{ margin: "0 0 16px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>Start building your network! Follow developers from suggestions on the sidebar or the Global Leaderboard.</p>
                          </div>
                        ) : (() => {
                          if (filteredFollowing.length === 0) {
                            return (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="empty-state-card search-empty-state"
                                style={{ padding: "40px 24px", marginBottom: "32px", textAlign: "center" }}
                              >
                                <div className="search-empty-icon-wrapper">
                                  <Search size={28} className="empty-state-icon-glow" />
                                </div>
                                <h4 style={{ margin: "16px 0 8px 0", color: "var(--ce-text-h)", fontSize: "1rem" }}>No results found</h4>
                                <p style={{ margin: "0 0 16px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>
                                  We couldn't find any followed developers matching "<strong>{followingSearch}</strong>".
                                </p>
                                <button
                                  type="button"
                                  className="network-clear-search-btn"
                                  onClick={() => {
                                    setFollowingSearch("");
                                    setVisibleFollowingCount(6);
                                    followingSearchInputRef.current?.focus();
                                  }}
                                >
                                  Clear Search
                                </button>
                              </motion.div>
                            );
                          }

                          return (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                              <motion.div
                                layout
                                className="following-developers-grid"
                                style={{ width: "100%", marginBottom: "24px", position: "relative" }}
                              >
                                <AnimatePresence mode="popLayout">
                                  {filteredFollowing.slice(0, visibleFollowingCount).map(dev => {
                                    const isOnline = dev.isOnline === true || dev.isOnline === "true";
                                    const followsYou = followersList.some(f => String(f._id || f) === String(dev._id || dev.id));
                                    return (
                                      <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 15 }}
                                        transition={{ type: "spring", stiffness: 220, damping: 26 }}
                                        key={String(dev._id || dev.id || dev)}
                                        className="developer-card-premium"
                                      >
                                        <div className="dev-card-banner" style={{ background: dev.coverBanner ? `url(${dev.coverBanner}) center/cover no-repeat` : getBannerGradient(dev.username) }} />
                                        <div className="dev-card-avatar-wrapper">
                                          {dev.avatar ? (
                                            <img src={dev.avatar} alt={dev.username} className="dev-card-avatar" />
                                          ) : (
                                            <div className="dev-card-avatar-fallback" style={{ backgroundColor: getAvatarColor(dev.username) }}>
                                              {dev.username.charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className={`dev-online-status-badge ${isOnline ? "online" : "offline"}`} />
                                        </div>

                                        <div className="dev-card-body">
                                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                            <h4 className="dev-card-username">@{dev.username}</h4>
                                            {followsYou && (
                                              <span className="dev-follows-you-pill">Follows You</span>
                                            )}
                                          </div>
                                          <span className="dev-card-email">{dev.email}</span>
                                          <p className="dev-card-bio">{dev.bio || "No bio description set yet."}</p>

                                          {dev.programmingLanguages && dev.programmingLanguages.length > 0 && (
                                            <div className="dev-card-langs">
                                              {dev.programmingLanguages.slice(0, 3).map((lang, i) => (
                                                <span key={i} className="dev-lang-tag">{lang}</span>
                                              ))}
                                              {dev.programmingLanguages.length > 3 && (
                                                <span className="dev-lang-tag-more">+{dev.programmingLanguages.length - 3}</span>
                                              )}
                                            </div>
                                          )}

                                          <div className="dev-card-stats-row">
                                            <div className="dev-card-stat">
                                              <strong>{dev.followersCount || 0}</strong>
                                              <span>Followers</span>
                                            </div>
                                            <div className="dev-card-stat">
                                              <strong>{dev.followingCount || 0}</strong>
                                              <span>Following</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="dev-card-actions">
                                          <button
                                            onClick={() => {
                                              setPreselectedChatPartner(dev);
                                              navigate("/dashboard?tab=messages");
                                            }}
                                            className="dev-btn-message"
                                          >
                                            <MessageSquare size={14} /> Message
                                          </button>
                                          <div className="dev-card-secondary-actions">
                                            <button
                                              onClick={() => handleViewUserProfile(dev._id || dev.id)}
                                              className="dev-btn-view-profile"
                                            >
                                              Profile
                                            </button>
                                            <button
                                              onClick={() => handleFollowToggle(dev._id || dev.id)}
                                              className="dev-btn-unfollow"
                                            >
                                              Unfollow
                                            </button>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </AnimatePresence>
                              </motion.div>

                              {filteredFollowing.length > visibleFollowingCount && (
                                <button
                                  onClick={() => setVisibleFollowingCount(prev => prev + 6)}
                                  className="network-load-more-btn"
                                >
                                  Load More Developers
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 30% Right Column */}
                      <div className="network-right-column" style={{ flex: "0 0 30%", display: "flex", flexDirection: "column", gap: "20px", minWidth: "260px" }}>

                        {/* POWERFUL WIDGET 1: Profile Invite Link */}
                        <div style={{
                          background: "linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
                          border: "1px solid rgba(88, 166, 255, 0.15)",
                          borderRadius: "12px",
                          padding: "16px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Sparkles size={16} style={{ color: "var(--ce-primary)" }} />
                            <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", color: "var(--ce-text-h)" }}>Network Overview</h4>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid var(--ce-border)" }}>
                              <span style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", display: "block" }}>Followers</span>
                              <strong style={{ fontSize: "1.1rem", color: "var(--ce-text-h)" }}>{followersList.length}</strong>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", border: "1px solid var(--ce-border)" }}>
                              <span style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", display: "block" }}>Following</span>
                              <strong style={{ fontSize: "1.1rem", color: "var(--ce-text-h)" }}>{followingList.length}</strong>
                            </div>
                          </div>

                          <div style={{
                            background: "rgba(0,0,0,0.15)",
                            borderRadius: "8px",
                            padding: "10px",
                            border: "1px solid rgba(255,255,255,0.03)"
                          }}>
                            <span style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", display: "block", marginBottom: "4px" }}>Share Profile Invite Link</span>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <input
                                type="text"
                                readOnly
                                value={`${window.location.origin}/user/${user?.id || user?._id}`}
                                style={{
                                  flex: 1,
                                  background: "rgba(0,0,0,0.2)",
                                  border: "1px solid var(--ce-border)",
                                  borderRadius: "4px",
                                  padding: "4px 8px",
                                  fontSize: "0.65rem",
                                  color: "var(--ce-text-muted)",
                                  textOverflow: "ellipsis"
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  navigator.clipboard.writeText(`${window.location.origin}/user/${user?.id || user?._id}`);
                                  addToast("Profile invite link copied!", "success");
                                }}
                                style={{
                                  padding: "4px 8px",
                                  background: "var(--ce-primary)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.65rem",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* SUGGESTED DEVELOPERS IN FOLLOWING TAB */}
                        {suggestions.length > 0 && (
                          <div className="suggested-developers-section" style={{
                            background: "rgba(255,255,255,0.01)",
                            border: "1px solid var(--ce-border)",
                            borderRadius: "12px",
                            padding: "16px"
                          }}>
                            <div className="section-header" style={{ marginBottom: "16px" }}>
                              <Compass size={16} className="brand-logo" style={{ color: "var(--ce-warning)" }} />
                              <h3 className="section-title" style={{ fontSize: "0.85rem" }}>Suggested Developers</h3>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              {suggestions.slice(0, 5).map(dev => (
                                <div key={dev._id} className="suggested-dev-card-compact">
                                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <div className="suggested-avatar-wrapper" style={{ position: "relative" }}>
                                      {dev.avatar ? (
                                        <img src={dev.avatar} alt={dev.username} className="suggested-avatar" />
                                      ) : (
                                        <div className="suggested-avatar-fallback" style={{ backgroundColor: getAvatarColor(dev.username) }}>
                                          {dev.username.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span className={`dev-online-status-badge mini ${dev.isOnline === true || dev.isOnline === "true" ? "online" : "offline"}`} />
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                      <span className="suggested-username" style={{ fontWeight: 700, color: "var(--ce-text-h)", fontSize: "0.8rem" }}>@{dev.username}</span>
                                      <span className="suggested-bio" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {dev.bio || "Full stack developer"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="suggested-actions" style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                    <button
                                      onClick={() => handleViewUserProfile(dev._id || dev.id)}
                                      className="suggested-btn-profile"
                                    >
                                      Profile
                                    </button>
                                    <button
                                      onClick={() => handleFollowToggle(dev._id || dev.id)}
                                      className="suggested-btn-follow"
                                    >
                                      + Follow
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


            </motion.div>
          )}

          {/* LEADERBOARD SECTION */}
          {activeSection === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="leaderboard-section-container"
            >
              {/* Leaderboard Stats Cards */}
              <div className="ce-stats-grid" style={{ marginBottom: "24px" }}>
                <div className="compact-stat-card">
                  <div className="stat-card-icon-wrapper blue-theme-wrapper">
                    <Users size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Platform Developers</span>
                    <span className="stat-card-val">{leaderboardData.length}</span>
                  </div>
                </div>
                <div className="compact-stat-card">
                  <div className="stat-card-icon-wrapper rank-icon-wrapper rank-junior" style={{ background: "var(--ce-primary-glow)", color: "var(--ce-primary)" }}>
                    <Trophy size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Your Global Rank</span>
                    <span className="stat-card-val">
                      {(() => {
                        const myIndex = leaderboardData.findIndex(item => String(item.userId) === String(user?.id || user?._id));
                        return myIndex !== -1 ? `#${myIndex + 1}` : "N/A";
                      })()}
                    </span>
                  </div>
                </div>
                <div className="compact-stat-card">
                  <div className="stat-card-icon-wrapper purple-theme-wrapper">
                    <Flame size={18} style={{ color: "#ff7b00" }} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">Highest Score</span>
                    <span className="stat-card-val">
                      {leaderboardData[0] ? `${leaderboardData[0].xp} XP` : "0 XP"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Podium for top 3 */}
              {leaderboardData.length > 0 && !leaderboardSearch && leaderboardTab === "global" && (
                <div className="leaderboard-podium">
                  {/* 2nd Place */}
                  {leaderboardData[1] && (
                    <div className="podium-item rank-silver" onClick={() => handleViewUserProfile(leaderboardData[1].userId)}>
                      <div className="podium-avatar-wrapper">
                        {leaderboardData[1].avatar ? (
                          <img src={leaderboardData[1].avatar} alt={leaderboardData[1].username} className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[1].username) }}>
                            {leaderboardData[1].username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge">2</div>
                      </div>
                      <span className="podium-username">@{leaderboardData[1].username}</span>
                      <span className="podium-title-badge">{leaderboardData[1].title || "Senior Coder"}</span>
                      <div className="rank-podium height-silver">
                        <span className="podium-xp">{leaderboardData[1].xp} XP</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {leaderboardData[0] && (
                    <div className="podium-item rank-gold" onClick={() => handleViewUserProfile(leaderboardData[0].userId)}>
                      <div className="podium-avatar-wrapper">
                        {leaderboardData[0].avatar ? (
                          <img src={leaderboardData[0].avatar} alt={leaderboardData[0].username} className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[0].username) }}>
                            {leaderboardData[0].username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge"><Trophy size={14} fill="#ffd700" /></div>
                      </div>
                      <span className="podium-username">@{leaderboardData[0].username}</span>
                      <span className="podium-title-badge primary">{leaderboardData[0].title || "Antigravity Architect"}</span>
                      <div className="rank-podium height-gold">
                        <span className="podium-xp">{leaderboardData[0].xp} XP</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {leaderboardData[2] && (
                    <div className="podium-item rank-bronze" onClick={() => handleViewUserProfile(leaderboardData[2].userId)}>
                      <div className="podium-avatar-wrapper">
                        {leaderboardData[2].avatar ? (
                          <img src={leaderboardData[2].avatar} alt={leaderboardData[2].username} className="podium-avatar" />
                        ) : (
                          <div className="podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[2].username) }}>
                            {leaderboardData[2].username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="podium-badge">3</div>
                      </div>
                      <span className="podium-username">@{leaderboardData[2].username}</span>
                      <span className="podium-title-badge">{leaderboardData[2].title || "Code Artisan"}</span>
                      <div className="rank-podium height-bronze">
                        <span className="podium-xp">{leaderboardData[2].xp} XP</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Leaderboard Controls (Tabs and Search) */}
              <div className="leaderboard-table-controls-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
                {/* Filter Tabs */}
                <div className="leaderboard-filter-tabs">
                  <button
                    onClick={() => setLeaderboardTab("global")}
                    className={`leaderboard-filter-tab-btn ${leaderboardTab === "global" ? "active" : ""}`}
                  >
                    Global Leaders
                  </button>
                  <button
                    onClick={() => setLeaderboardTab("network")}
                    className={`leaderboard-filter-tab-btn ${leaderboardTab === "network" ? "active" : ""}`}
                  >
                    My Network
                  </button>
                  <button
                    onClick={() => setLeaderboardTab("top10")}
                    className={`leaderboard-filter-tab-btn ${leaderboardTab === "top10" ? "active" : ""}`}
                  >
                    Top 10 Elite
                  </button>
                </div>

                {/* Search input */}
                <div className="section-search-container" style={{ margin: 0 }}>
                  <Search size={13} className="section-search-icon" />
                  <input
                    type="text"
                    placeholder="Search developers..."
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    className="section-search-input"
                  />
                </div>
              </div>

              {/* Global Rankings List */}
              <div className="history-table-wrapper">
                {isLoadingLeaderboard ? (
                  <div style={{ textAlign: "center", padding: "48px", color: "var(--ce-text-muted)" }}>
                    <div className="btn-spinner" style={{ margin: "0 auto 12px auto", width: "24px", height: "24px" }}></div>
                    Synchronizing Leaderboard Rankings...
                  </div>
                ) : (
                  (() => {
                    let filteredList = leaderboardData.filter(item =>
                      item.username.toLowerCase().includes(leaderboardSearch.toLowerCase())
                    );

                    // Apply tab filters
                    if (leaderboardTab === "network") {
                      filteredList = filteredList.filter(item =>
                        followingList.some(f => String(f._id || f) === String(item.userId)) ||
                        String(item.userId) === String(user?.id || user?._id)
                      );
                    } else if (leaderboardTab === "top10") {
                      filteredList = filteredList.slice(0, 10);
                    }

                    if (filteredList.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: "48px", color: "var(--ce-text-muted)" }}>
                          No developers found.
                        </div>
                      );
                    }

                    // If search is active or using custom tabs, show everyone in order. Otherwise (global, no search), slice out the podium top 3
                    const displayList = (leaderboardSearch || leaderboardTab !== "global") ? filteredList : filteredList.slice(3);

                    const getDeveloperTier = (xp) => {
                      if (xp >= 1000) return { name: "Legendary Arch-Coder", className: "tier-badge legendary" };
                      if (xp >= 500) return { name: "Elite Architect", className: "tier-badge elite" };
                      if (xp >= 250) return { name: "Master Engineer", className: "tier-badge master" };
                      if (xp >= 100) return { name: "Senior Developer", className: "tier-badge senior" };
                      return { name: "Junior Coder", className: "tier-badge junior" };
                    };

                    return (
                      <table className="history-data-table leaderboard-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Developer</th>
                            <th>Developer Tier</th>
                            <th>Coding XP</th>
                            <th className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayList.map((item) => {
                            const isCurrentUser = String(item.userId) === String(user?.id || user?._id);
                            const isFollowingUser = followingList.some(f => String(f._id || f) === String(item.userId));
                            const tier = getDeveloperTier(item.xp);

                            let rankDisplay = `#${item.rank}`;
                            let rankClass = "";
                            if (item.rank === 1) {
                              rankDisplay = "🥇";
                              rankClass = "rank-medal-1";
                            } else if (item.rank === 2) {
                              rankDisplay = "🥈";
                              rankClass = "rank-medal-2";
                            } else if (item.rank === 3) {
                              rankDisplay = "🥉";
                              rankClass = "rank-medal-3";
                            }

                            return (
                              <tr key={item.userId} className={isCurrentUser ? "current-user-row-highlight" : ""}>
                                <td>
                                  <span className={`leaderboard-rank-number ${rankClass}`}>
                                    {rankDisplay}
                                  </span>
                                </td>
                                <td style={{ cursor: "pointer" }} onClick={() => handleViewUserProfile(item.userId)}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {item.avatar ? (
                                      <img src={item.avatar} alt={item.username} className="user-avatar-small" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
                                    ) : (
                                      <div className="user-avatar-small" style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: getAvatarColor(item.username), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: "600", color: "#fff" }}>
                                        {item.username.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontWeight: "700", color: "var(--ce-text-h)" }}>{item.username} {isCurrentUser ? "(you)" : ""}</span>
                                      <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>{item.email}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className={tier.className}>
                                    {tier.name}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: "var(--ce-primary)" }}>{item.xp} XP</strong>
                                </td>
                                <td className="text-right">
                                  {isCurrentUser ? (
                                    <span style={{ fontSize: "0.75rem", color: "var(--ce-primary)", fontWeight: "600" }}>Your Rank</span>
                                  ) : (
                                    <button
                                      onClick={() => handleFollowToggle(item.userId)}
                                      className={`history-resume-btn ${isFollowingUser ? "unfollow" : "follow"}`}
                                      style={{
                                        fontSize: "0.72rem",
                                        padding: "4px 10px",
                                        background: isFollowingUser ? "var(--ce-surface-card)" : "var(--ce-primary-glow)",
                                        color: isFollowingUser ? "var(--ce-text-muted)" : "var(--ce-primary)",
                                        border: "1px solid var(--ce-border)"
                                      }}
                                    >
                                      {isFollowingUser ? "Following" : "+ Follow"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>
            </motion.div>
          )}

          {/* ACHIEVEMENTS SECTION */}
          {activeSection === "achievements" && (() => {
            const achievementsList = [
              {
                id: "creator_pro",
                title: "Creator Pro",
                description: "Create 5 or more rooms",
                icon: FolderGit,
                color: "#3b82f6",
                condition: (stats.totalCreated || 0) >= 5,
                current: stats.totalCreated || 0,
                target: 5,
                category: "Development",
                xpReward: 150,
                tip: "To complete this achievement, use the 'Create Workspace Room' form in the Rooms tab and initialize 5 separate workspaces."
              },
              {
                id: "team_player",
                title: "Team Player",
                description: "Join and collaborate in 3 or more rooms",
                icon: Users,
                color: "#10b981",
                condition: (stats.totalJoined || 0) >= 3,
                current: stats.totalJoined || 0,
                target: 3,
                category: "Collaboration",
                xpReward: 120,
                tip: "Browse through active Live Rooms and join at least 3 distinct workspaces hosted by other developers."
              },
              {
                id: "script_master",
                title: "Script Master",
                description: "Execute compilation script 10 or more times",
                icon: Terminal,
                color: "#f59e0b",
                condition: (stats.executions || 0) >= 10,
                current: stats.executions || 0,
                target: 10,
                category: "Activity",
                xpReward: 80,
                tip: "Open the code editor in any of your workspaces and press the compile/run button 10 times to test your scripts."
              },
              {
                id: "marathoner",
                title: "Code Marathoner",
                description: "Log 5 hours of active development time",
                icon: Clock,
                color: "#8b5cf6",
                condition: (stats.codingHours || 0) >= 5,
                current: stats.codingHours || 0,
                target: 5,
                category: "Milestones",
                xpReward: 200,
                tip: "Spend a cumulative total of 5 hours active in the workspace code editor collaborating or compiling programs."
              },
              {
                id: "social_coder",
                title: "Social Coder",
                description: "Like or Bookmark 5 or more workspaces",
                icon: Heart,
                color: "#ec4899",
                condition: (likedRooms.length + savedRooms.length) >= 5,
                current: likedRooms.length + savedRooms.length,
                target: 5,
                category: "Social",
                xpReward: 50,
                tip: "Go to Live Rooms or other developers' shared spaces and like/bookmark at least 5 different workspaces."
              },
              {
                id: "polyglot",
                title: "Polyglot Developer",
                description: "Create workspaces in 3 different languages",
                icon: Code,
                color: "#06b6d4",
                condition: new Set(historyRooms.filter(r => r.language).map(r => r.language.toLowerCase())).size >= 3,
                current: new Set(historyRooms.filter(r => r.language).map(r => r.language.toLowerCase())).size,
                target: 3,
                category: "Development",
                xpReward: 150,
                tip: "Launch workspaces choosing 3 different languages (e.g. JavaScript, Python, C++) when configuring room creation settings."
              },
              {
                id: "rising_star",
                title: "Rising Star",
                description: "Earn 100 or more developer points",
                icon: Sparkles,
                color: "#f43f5e",
                condition: (stats.totalPoints || 0) >= 100,
                current: stats.totalPoints || 0,
                target: 100,
                category: "Milestones",
                xpReward: 100,
                tip: "Collect 100 XP points. Points are earned by coding, hosting collaborative sessions, and getting followers."
              },
              {
                id: "elite_architect",
                title: "Elite Architect",
                description: "Reach Antigravity Architect tier (400+ points)",
                icon: Trophy,
                color: "#e11d48",
                condition: (stats.totalPoints || 0) >= 400,
                current: stats.totalPoints || 0,
                target: 400,
                category: "Milestones",
                xpReward: 300,
                tip: "Gather 400 XP points to earn the most prestigious badge on CodeExpo, proving you are an elite engineering generalist."
              }
            ];

            const unlockedCount = achievementsList.filter(a => a.condition).length;
            const totalCount = achievementsList.length;
            const radius = 28;
            const circumference = 2 * Math.PI * radius;
            const strokeDashoffset = circumference * (1 - (unlockedCount / totalCount));

            const filteredAchievements = achievementsList.filter(ach => {
              if (achievementFilter === "unlocked") return ach.condition;
              if (achievementFilter === "locked") return !ach.condition;
              return true;
            });

            const containerVariants = {
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05
                }
              }
            };

            const itemVariants = {
              hidden: { opacity: 0, y: 15, scale: 0.96 },
              show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 22 } }
            };

            return (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="achievements-section-container"
              >
                {/* Upgraded Level & Career Dashboard Banner */}
                <div className="achievements-dashboard-header">
                  <div className="achievements-dashboard-left">
                    <div className={`rank-avatar-badge ${rank.badgeClass}`} style={{ color: rank.color, border: `3px solid ${rank.color}` }}>
                      <Award size={30} />
                      <span className="rank-badge-glow" style={{ backgroundColor: rank.color }} />
                    </div>
                    <div className="rank-dashboard-details">
                      <span className="rank-sub-title">Current Development Standing</span>
                      <h2 className="rank-main-title" style={{ color: rank.color }}>
                        {rank.title}
                      </h2>
                      <div className="rank-progress-bar-container">
                        <div className="rank-progress-bar-track">
                          <div className="rank-progress-bar-fill" style={{ width: `${progressPercent}%`, backgroundColor: rank.color }} />
                        </div>
                        <div className="rank-progress-labels">
                          <span><strong>{stats.totalPoints || 0}</strong> XP Total</span>
                          <span>{rank.nextLimit === Infinity ? "Highest Tier Unlocked" : `${rank.nextLimit - (stats.totalPoints || 0)} XP to next level`}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="achievements-dashboard-right">
                    <div className="achievements-circle-widget">
                      <svg className="progress-ring" width="72" height="72">
                        <circle className="progress-ring-circle-bg" stroke="var(--ce-border)" strokeWidth="3.5" fill="transparent" r={radius} cx="36" cy="36" />
                        <circle
                          className="progress-ring-circle"
                          stroke={rank.color}
                          strokeWidth="3.5"
                          strokeDasharray={`${circumference}`}
                          strokeDashoffset={`${strokeDashoffset}`}
                          fill="transparent"
                          r={radius}
                          cx="36"
                          cy="36"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="circle-widget-text">
                        <span className="unlocked-count"><strong>{unlockedCount}</strong></span>
                        <span className="total-count">/ {totalCount}</span>
                      </div>
                    </div>
                    <div className="achievements-widget-info">
                      <h4>Badges Unlocked</h4>
                      <p>{Math.round((unlockedCount / totalCount) * 100)}% completion of platform goals</p>
                    </div>
                  </div>
                </div>

                {/* Achievements Filter Tabs & Category Legend */}
                <div className="achievements-filter-row">
                  <div className="achievements-filter-tabs">
                    <button
                      className={`ach-filter-tab ${achievementFilter === "all" ? "active" : ""}`}
                      onClick={() => setAchievementFilter("all")}
                    >
                      <span>All Badges</span>
                      <span className="ach-filter-count">{achievementsList.length}</span>
                    </button>
                    <button
                      className={`ach-filter-tab ${achievementFilter === "unlocked" ? "active" : ""}`}
                      onClick={() => setAchievementFilter("unlocked")}
                    >
                      <span>Unlocked</span>
                      <span className="ach-filter-count">{achievementsList.filter(a => a.condition).length}</span>
                    </button>
                    <button
                      className={`ach-filter-tab ${achievementFilter === "locked" ? "active" : ""}`}
                      onClick={() => setAchievementFilter("locked")}
                    >
                      <span>In Progress</span>
                      <span className="ach-filter-count">{achievementsList.filter(a => !a.condition).length}</span>
                    </button>
                  </div>
                  <div className="ach-category-legend">
                    <span className="legend-item"><span className="legend-dot milestones" /> Milestones</span>
                    <span className="legend-item"><span className="legend-dot development" /> Development</span>
                    <span className="legend-item"><span className="legend-dot collaboration" /> Collaboration</span>
                    <span className="legend-item"><span className="legend-dot social" /> Social</span>
                    <span className="legend-item"><span className="legend-dot activity" /> Activity</span>
                  </div>
                </div>

                {/* Achievements Staggered Grid List */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="achievements-grid"
                >
                  {filteredAchievements.map((ach) => {
                    const Icon = ach.icon;
                    const progressVal = Math.min(100, Math.max(0, (ach.current / ach.target) * 100));
                    const isExpanded = expandedAchievementId === ach.id;
                    const categoryClass = ach.category ? ach.category.toLowerCase() : "general";

                    return (
                      <motion.div
                        variants={itemVariants}
                        key={ach.id}
                        onClick={() => setExpandedAchievementId(isExpanded ? null : ach.id)}
                        className={`achievement-card-detailed ${ach.condition ? "unlocked" : "locked"} cat-${categoryClass} ${isExpanded ? "expanded" : ""}`}
                        style={{
                          borderColor: ach.condition ? ach.color : "var(--ce-border)",
                          "--ach-accent": ach.color
                        }}
                      >
                        {/* Floating XP badge */}
                        <div className="achievement-xp-badge" style={{ backgroundColor: ach.condition ? ach.color : "var(--ce-border)" }}>
                          +{ach.xpReward} XP
                        </div>

                        <div className="achievement-card-main">
                          <div className="achievement-icon-wrapper" style={{ backgroundColor: ach.condition ? `${ach.color}15` : "var(--ce-hover)", color: ach.condition ? ach.color : "var(--ce-text-muted)" }}>
                            {ach.condition ? <Icon size={24} /> : <Lock size={20} />}
                          </div>

                          <div className="achievement-details-col">
                            <div className="achievement-name-row">
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                <span className={`achievement-category-pill ${categoryClass}`}>{ach.category}</span>
                                <h4 className="achievement-title">{ach.title}</h4>
                              </div>
                              {ach.condition ? (
                                <span className="status-pill unlocked">Unlocked</span>
                              ) : (
                                <span className="status-pill locked">Locked</span>
                              )}
                            </div>
                            <p className="achievement-desc">{ach.description}</p>

                            <div className="achievement-progress-row">
                              <div className="achievement-progress-bar-track">
                                <div className="achievement-progress-bar-fill" style={{ width: `${progressVal}%`, backgroundColor: ach.condition ? ach.color : "var(--ce-text-muted)" }} />
                              </div>
                              <span className="achievement-progress-text">
                                {ach.current} / {ach.target}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Expandable guide/tips */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeInOut" }}
                              className="achievement-expanded-guide"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="guide-divider" />
                              <div className="guide-content">
                                <span className="guide-label">How to Unlock:</span>
                                <p className="guide-text">{ach.tip}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            );
          })()}

          {/* ROOMS & ACTIONS SECTION */}
          {activeSection === "rooms" && (
            <motion.div
              key="rooms"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
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
                            disabled={isCreatingRoom}
                          />
                        </div>

                        <div className="form-field">
                          <label>Language</label>
                          <select
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            disabled={isCreatingRoom}
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
                            disabled={isCreatingRoom}
                          >
                            <option value="false">Public</option>
                            <option value="true">Private (Requires Approval)</option>
                          </select>
                        </div>

                        <button type="submit" className="form-submit-btn" style={{ marginTop: "6px" }} disabled={isCreatingRoom}>
                          {isCreatingRoom && <span className="btn-spinner"></span>}
                          {isCreatingRoom ? "Creating Workspace..." : "Create Room Workspace"}
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
                    {/* Segmented Pill Switcher with Round Sliding Background */}
                    <div className="ce-pill-switcher-container">
                      <div className="ce-pill-switcher" style={{ maxWidth: "720px" }}>
                        <div
                          className="ce-pill-bg-slide"
                          style={{
                            width: "calc(33.333% - 2px)",
                            transform: `translateX(${(roomsTab === "public" ? 0 : roomsTab === "myrooms" ? 1 : 2) * 100}%)`
                          }}
                        />
                        <button
                          type="button"
                          className={`ce-pill-btn ${roomsTab === "public" ? "active" : ""}`}
                          onClick={() => setRoomsTab("public")}
                        >
                          Explore Public ({publicRooms.length})
                        </button>
                        <button
                          type="button"
                          className={`ce-pill-btn ${roomsTab === "myrooms" ? "active" : ""}`}
                          onClick={() => setRoomsTab("myrooms")}
                        >
                          My Rooms ({historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length})
                        </button>
                        <button
                          type="button"
                          className={`ce-pill-btn ${roomsTab === "requests" ? "active" : ""}`}
                          onClick={() => setRoomsTab("requests")}
                        >
                          My Requests ({mySentRequests.length})
                        </button>
                      </div>
                    </div>



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

                    {roomsTab === "requests" && (
                      <div style={{ marginTop: "8px" }}>
                        <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Clock size={16} className="brand-logo" />
                            <h3 className="section-title">My Sent Requests</h3>
                          </div>
                        </div>

                        {mySentRequests.length === 0 ? (
                          <div className="empty-state-card">
                            <Terminal size={18} className="empty-state-icon" />
                            <p>You haven't requested to join any private rooms yet.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {mySentRequests.map((req) => (
                              <div
                                key={req.roomId}
                                className="social-activity-card"
                                style={{
                                  padding: "16px",
                                  background: "rgba(255, 255, 255, 0.02)",
                                  border: "1px solid var(--ce-border)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: "16px"
                                }}
                              >
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="room-title-text" style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--ce-text)" }}>
                                      {req.title}
                                    </span>
                                    <span className="lang-badge" style={{ fontSize: "0.65rem", padding: "2px 6px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", textTransform: "uppercase", color: "var(--ce-text-muted)" }}>
                                      {req.language}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)" }}>
                                    Created by <strong>{req.createdBy?.username || "Owner"}</strong> ({req.createdBy?.email})
                                  </span>
                                  <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>
                                    Requested on {new Date(req.updatedAt || req.createdAt).toLocaleDateString()}
                                  </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                                  {req.status === "pending" && (
                                    <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "4px 10px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "12px" }}>
                                      Pending Approval
                                    </span>
                                  )}
                                  {req.status === "rejected" && (
                                    <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "4px 10px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px" }}>
                                      Request Rejected
                                    </span>
                                  )}
                                  {req.status === "accepted" && (
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "4px 10px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px" }}>
                                        Request Accepted
                                      </span>
                                      <button
                                        onClick={() => proceedJoinRoom(req.roomId)}
                                        className="ce-btn-primary"
                                        style={{
                                          padding: "6px 16px",
                                          fontSize: "0.78rem",
                                          fontWeight: "600",
                                          background: "var(--ce-primary)",
                                          color: "#fff",
                                          border: "none",
                                          borderRadius: "6px",
                                          cursor: "pointer",
                                          boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)"
                                        }}
                                      >
                                        Join Workspace
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ROOM HISTORY SECTION */}
          {activeSection === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
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
                                <button
                                  onClick={() => handleJoinRoomDirect(room.roomId)}
                                  className="history-resume-btn"
                                >
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
            </motion.div>
          )}

          {/* WHITEBOARDS TAB SECTION */}
          {activeSection === "whiteboards" && (
            <motion.div
              key="whiteboards"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
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
                          onMouseEnter={prefetchEditor}
                          className="history-resume-btn"
                        >
                          Open Canvas
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* DIRECT MESSAGES SECTION */}
          {activeSection === "messages" && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <DirectMessages
                preselectedUser={preselectedChatPartner}
                onChatLoaded={() => setPreselectedChatPartner(null)}
                onViewProfile={handleViewUserProfile}
              />
            </motion.div>
          )}

          {/* NOTIFICATIONS FEED SECTION */}
          {activeSection === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
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

                {/* Premium Category Filter Tabs */}
                <div className="notif-filter-tabs-container" style={{ marginBottom: "20px" }}>
                  <div className="achievements-filter-tabs">
                    <button
                      className={`ach-filter-tab ${notifFilter === "all" ? "active" : ""}`}
                      onClick={() => setNotifFilter("all")}
                    >
                      <span>All</span>
                      <span className="ach-filter-count">{notificationsList.length}</span>
                    </button>
                    <button
                      className={`ach-filter-tab ${notifFilter === "unread" ? "active" : ""}`}
                      onClick={() => setNotifFilter("unread")}
                    >
                      <span>Unread</span>
                      <span className="ach-filter-count">{unreadNotificationsCount}</span>
                    </button>
                    <button
                      className={`ach-filter-tab ${notifFilter === "workspaces" ? "active" : ""}`}
                      onClick={() => setNotifFilter("workspaces")}
                    >
                      <span>Workspaces</span>
                      <span className="ach-filter-count">
                        {notificationsList.filter(n => ["LIKE", "BOOKMARK", "JOIN"].includes(n.type)).length}
                      </span>
                    </button>
                    <button
                      className={`ach-filter-tab ${notifFilter === "social" ? "active" : ""}`}
                      onClick={() => setNotifFilter("social")}
                    >
                      <span>Social</span>
                      <span className="ach-filter-count">
                        {notificationsList.filter(n => n.type === "FOLLOW").length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="notifications-list">
                  {/* Render Action Required / Pending Join Requests at the top if All or Workspaces is selected */}
                  {(notifFilter === "all" || notifFilter === "workspaces") && joinRequests.length > 0 && joinRequests.map(req => (
                    <div key={req.requestId} className="notification-item join-request-pending notif-type-join-pending" style={{ borderColor: "var(--ce-warning)", borderLeft: "3px solid var(--ce-warning)" }}>
                      <div className="notif-left-content">
                        <div className="notif-category-icon-container">
                          <ShieldAlert size={16} style={{ color: "var(--ce-warning)" }} />
                        </div>
                        <div className="notif-main-info">
                          <div className="notif-text-message">
                            <strong>Join Request Approval Pending</strong>
                          </div>
                          <div className="notif-desc" style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>
                            <strong>{req.username}</strong> requested to access private room <strong>{req.roomTitle}</strong>.
                          </div>
                        </div>
                      </div>
                      <div className="notif-right-content" style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespondRequest(req.roomId, req.user?._id || req.user, "accept");
                          }}
                          className="history-resume-btn notif-action-btn accept"
                          style={{
                            fontSize: "0.72rem",
                            padding: "4px 10px",
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#10b981",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer"
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespondRequest(req.roomId, req.user?._id || req.user, "reject");
                          }}
                          className="history-resume-btn notif-action-btn reject"
                          style={{
                            fontSize: "0.72rem",
                            padding: "4px 10px",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "8px",
                            cursor: "pointer"
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {(() => {
                    const filteredNotifs = notificationsList.filter(notif => {
                      if (notifFilter === "unread") return !notif.isRead;
                      if (notifFilter === "social") return notif.category === "SOCIAL" || notif.type === "FOLLOW";
                      if (notifFilter === "workspaces") return notif.category === "ROOMS" || notif.category === "COLLABORATION" || ["LIKE", "BOOKMARK", "JOIN", "INVITE"].includes(notif.type);
                      return true;
                    });

                    if (filteredNotifs.length === 0) {
                      return (
                        <div className="empty-state-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px", textAlign: "center" }}>
                          <Bell size={28} style={{ color: "var(--ce-text-muted)", marginBottom: "12px" }} />
                          <h4 style={{ color: "var(--ce-text-h)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>No notifications found</h4>
                          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", margin: 0 }}>
                            {notifFilter === "all"
                              ? "You have no notifications yet."
                              : `No ${notifFilter} notifications were found matching your criteria.`}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {filteredNotifs.map(notif => {
                          const isRead = notif.isRead;
                          const senderName = notif.sender?.username || "Someone";
                          const senderAvatar = notif.sender?.avatar;
                          const roomTitle = notif.targetRoom?.title || "workspace";
                          const roomLink = notif.targetRoom?.roomId;

                          let notifIcon = <Bell size={14} />;
                          let actionText = "";
                          let typeClass = "notif-type-general";

                          if (notif.type === "FOLLOW") {
                            notifIcon = <Users size={14} style={{ color: "var(--ce-primary)" }} />;
                            actionText = "followed you";
                            typeClass = "notif-type-follow";
                          } else if (notif.type === "LIKE") {
                            notifIcon = <Heart size={14} style={{ color: "#ef4444" }} />;
                            actionText = `liked your room "${roomTitle}"`;
                            typeClass = "notif-type-like";
                          } else if (notif.type === "BOOKMARK") {
                            notifIcon = <Bookmark size={14} style={{ color: "var(--ce-accent)" }} />;
                            actionText = `bookmarked your room "${roomTitle}"`;
                            typeClass = "notif-type-bookmark";
                          } else if (notif.type === "JOIN") {
                            notifIcon = <ShieldAlert size={14} style={{ color: "var(--ce-warning)" }} />;
                            actionText = `wants to join "${roomTitle}"`;
                            typeClass = "notif-type-join";
                          } else if (notif.type === "INVITE") {
                            notifIcon = <Mail size={14} style={{ color: "var(--ce-primary)" }} />;
                            actionText = `invited you to join workspace "${roomTitle}"`;
                            typeClass = "notif-type-invite";
                          }

                          // Follow status mapping for social notifications
                          const isFollowingSender = followingList.some(f => String(f._id || f) === String(notif.sender?._id || notif.sender));

                          // Access request lookup
                          const pendingReq = joinRequests.find(req =>
                            String(req.roomId) === String(notif.targetRoom?.roomId || notif.targetRoom?._id) &&
                            String(req.user?._id || req.user) === String(notif.sender?._id)
                          );

                          return (
                            <div
                              key={notif._id}
                              className={`notification-item ${isRead ? "read" : "unread"} ${typeClass}`}
                              onClick={() => !isRead && handleMarkOneNotificationRead(notif._id)}
                            >
                              <div className="notif-left-content">
                                <div className="notif-category-icon-container">
                                  {notifIcon}
                                </div>
                                <div className="notif-sender-avatar-container" style={{ backgroundColor: senderAvatar ? "transparent" : getAvatarColor(senderName) }}>
                                  {senderAvatar ? (
                                    <img src={senderAvatar} alt={senderName} className="notif-sender-img" />
                                  ) : (
                                    <span className="notif-sender-initial">{senderName.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="notif-main-info">
                                  <div className="notif-text-message">
                                    <strong>{senderName}</strong> {actionText}
                                  </div>

                                  {/* Context-aware inline actions inside the details block */}
                                  {notif.type === "FOLLOW" && (
                                    <div style={{ marginTop: "4px" }}>
                                      {isFollowingSender ? (
                                        <span className="notif-action-status-label" style={{ fontSize: "0.68rem", color: "var(--ce-primary)", display: "inline-flex", alignItems: "center", gap: "3px", fontWeight: "600" }}>
                                          <Check size={11} /> Following
                                        </span>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleFollowToggle(notif.sender?._id || notif.sender);
                                          }}
                                          className="history-resume-btn notif-action-btn follow-back"
                                          style={{
                                            fontSize: "0.68rem",
                                            padding: "3px 8px",
                                            borderRadius: "6px",
                                            background: "rgba(59, 130, 246, 0.12)",
                                            color: "var(--ce-primary)",
                                            border: "1px solid rgba(59, 130, 246, 0.25)",
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "3px"
                                          }}
                                        >
                                          <UserPlus size={10} /> Follow Back
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {notif.type === "JOIN" && (
                                    <div style={{ marginTop: "4px" }}>
                                      {pendingReq ? (
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRespondRequest(pendingReq.roomId, pendingReq.user?._id || pendingReq.user, "accept");
                                            }}
                                            className="history-resume-btn notif-action-btn accept"
                                            style={{
                                              fontSize: "0.68rem",
                                              padding: "3px 8px",
                                              borderRadius: "6px",
                                              background: "rgba(16, 185, 129, 0.12)",
                                              color: "#10b981",
                                              border: "1px solid rgba(16, 185, 129, 0.25)",
                                              cursor: "pointer"
                                            }}
                                          >
                                            Accept
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRespondRequest(pendingReq.roomId, pendingReq.user?._id || pendingReq.user, "reject");
                                            }}
                                            className="history-resume-btn notif-action-btn reject"
                                            style={{
                                              fontSize: "0.68rem",
                                              padding: "3px 8px",
                                              borderRadius: "6px",
                                              background: "rgba(239, 68, 68, 0.12)",
                                              color: "#ef4444",
                                              border: "1px solid rgba(239, 68, 68, 0.25)",
                                              cursor: "pointer"
                                            }}
                                          >
                                            Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="notif-action-status-label" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>
                                          Request processed
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {notif.type === "INVITE" && (
                                    <div style={{ marginTop: "4px" }}>
                                      {!notif.isRead ? (
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAcceptInvite(roomLink, notif._id);
                                            }}
                                            className="history-resume-btn notif-action-btn accept"
                                            style={{
                                              fontSize: "0.68rem",
                                              padding: "3px 8px",
                                              borderRadius: "6px",
                                              background: "rgba(16, 185, 129, 0.12)",
                                              color: "#10b981",
                                              border: "1px solid rgba(16, 185, 129, 0.25)",
                                              cursor: "pointer"
                                            }}
                                          >
                                            Join Workspace
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleIgnoreInvite(notif._id);
                                            }}
                                            className="history-resume-btn notif-action-btn reject"
                                            style={{
                                              fontSize: "0.68rem",
                                              padding: "3px 8px",
                                              borderRadius: "6px",
                                              background: "rgba(239, 68, 68, 0.12)",
                                              color: "#ef4444",
                                              border: "1px solid rgba(239, 68, 68, 0.25)",
                                              cursor: "pointer"
                                            }}
                                          >
                                            Ignore
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="notif-action-status-label" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>
                                          Invite processed
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <div className="notif-meta-tags" style={{ marginTop: "2px" }}>
                                    <span className="notif-tag-badge">{notif.category}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="notif-right-content">
                                <span className="notif-time-badge">{formatLastActive(notif.createdAt)}</span>
                                {roomLink && notif.type !== "JOIN" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerGateAndNavigate(roomLink);
                                    }}
                                    className="history-resume-btn notif-view-btn"
                                  >
                                    View Room
                                  </button>
                                )}
                                {!isRead && <span className="notif-unread-dot" />}
                              </div>
                            </div>
                          );
                        })}

                        {notifPage < notifTotalPages && (
                          <div className="notif-load-more-container" style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                            <button
                              onClick={handleLoadMoreNotifications}
                              disabled={notifLoading}
                              className="notif-load-more-btn"
                            >
                              {notifLoading ? "Loading..." : "Load More Notifications"}
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}

          {/* PROFILE SECTION */}
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <div className="profile-section-container">
                {isPublicProfileLoading ? (
                  <div className="profile-loader-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "16px" }}>
                    <div className="modal-roller-spinner">
                      <div></div><div></div><div></div><div></div>
                      <div></div><div></div><div></div><div></div>
                    </div>
                    <h4 style={{ color: "var(--ce-text)", fontWeight: "500", letterSpacing: "0.5px" }}>Loading Developer Profile...</h4>
                    <p style={{ color: "var(--ce-text-muted)", fontSize: "0.8rem", marginTop: "-8px" }}>Fetching portfolios, stats, and workspaces</p>
                  </div>
                ) : (
                  <div className="github-profile-layout">

                    {/* Profile Card Header / Sidebar */}
                    <div className="profile-sidebar-card" style={{ padding: 0, overflow: "hidden" }}>

                      {/* Cover Banner */}
                      <div
                        className="profile-cover-banner"
                        style={{
                          background: (viewingUserProfile ? viewingUserProfile.coverBanner : user?.coverBanner)
                            ? `url(${viewingUserProfile ? viewingUserProfile.coverBanner : user.coverBanner}) center/cover no-repeat`
                            : "linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%)",
                          height: "100px",
                          width: "100%",
                          position: "relative",
                          cursor: !viewingUserProfile ? "pointer" : "default"
                        }}
                        onClick={() => {
                          if (!viewingUserProfile) {
                            document.getElementById("banner-upload-input").click();
                          }
                        }}
                      >
                        {!viewingUserProfile && (
                          <div className="banner-edit-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s ease", color: "#fff", fontSize: "0.7rem", fontWeight: "600" }}>
                            Change Banner
                          </div>
                        )}
                        <style>{`
                    .profile-cover-banner:hover .banner-edit-overlay {
                      opacity: 1 !important;
                    }
                  `}</style>
                      </div>

                      {!viewingUserProfile && (
                        <input
                          type="file"
                          id="banner-upload-input"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleCoverBannerUpload}
                        />
                      )}

                      {/* Main Card Content Wrapper (with padding) */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 24px 24px 24px" }}>

                        {/* Avatar overlapped over the banner */}
                        <div style={{ marginTop: "-40px", zIndex: 2, position: "relative" }}>
                          {viewingUserProfile ? (
                            <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: viewingUserProfile.avatar ? "transparent" : getAvatarColor(viewingUserProfile.username), fontSize: "1.8rem", color: "#fff", fontWeight: "600", border: "4px solid var(--ce-surface-card)" }}>
                              {viewingUserProfile.avatar ? (
                                <img src={viewingUserProfile.avatar} alt={viewingUserProfile.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                viewingUserProfile.username.charAt(0).toUpperCase()
                              )}
                            </div>
                          ) : (
                            <div style={{ border: "4px solid var(--ce-surface-card)", borderRadius: "50%", background: "var(--ce-surface-card)" }}>
                              <ProfileAvatar />
                            </div>
                          )}
                        </div>

                        <h2>{viewingUserProfile ? viewingUserProfile.username : user?.username}</h2>
                        <span className="profile-email">{viewingUserProfile ? viewingUserProfile.email : user?.email}</span>
                        <span
                          className="profile-badge"
                          style={getBadgeStyle(viewingUserProfile ? viewingUserProfile.title : user?.title)}
                        >
                          {viewingUserProfile ? viewingUserProfile.title : user?.title || "Developer"}
                        </span>

                        {/* Followers & Following Statistics Count */}
                        <div className="profile-stats-bar">
                          <div className="profile-stat-item" onClick={() => { setLoadingModalData(true); setShowFollowersModal(true); }}>
                            <strong>{viewingUserProfile ? viewingUserProfile.followersCount : user?.followersCount || 0}</strong>
                            <span>Followers</span>
                          </div>
                          <div className="profile-stat-item" onClick={() => { setLoadingModalData(true); setShowFollowingModal(true); }}>
                            <strong>{viewingUserProfile ? viewingUserProfile.followingCount : user?.followingCount || 0}</strong>
                            <span>Following</span>
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
                                style={{ width: "100%", minHeight: "60px", background: "var(--ce-surface-card)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem", resize: "none" }}
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
                                style={{ width: "100%", background: "var(--ce-surface-card)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem" }}
                              />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button className="profile-edit-save-btn" onClick={handleSaveProfile} disabled={isSavingProfile} style={{ flex: 1, padding: "6px", background: "var(--ce-primary)", color: "var(--ce-primary-text)", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600" }}>
                                {isSavingProfile ? "Saving..." : "Save"}
                              </button>
                              <button className="profile-edit-cancel-btn" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "6px", background: "var(--ce-surface-card)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem" }}>
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
                                  <span key={lang} className="lang-chip-badge" style={{ fontSize: "0.62rem", padding: "2px 6px", background: "var(--ce-primary-glow)", color: "var(--ce-primary)", borderRadius: "4px", border: "1px solid var(--ce-border)", fontWeight: "600" }}>
                                    {lang}
                                  </span>
                                ))}
                              </div>
                            )}
                            {viewingUserProfile ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                                {String(viewingUserProfile._id) !== String(user?.id || user?._id) && (
                                  <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                                    {followingList.some(f => String(f._id || f) === String(viewingUserProfile._id)) ? (
                                      <button
                                        className="profile-follow-btn unfollow"
                                        onClick={() => handleFollowToggle(viewingUserProfile._id)}
                                        style={{ flex: 1 }}
                                      >
                                        Unfollow
                                      </button>
                                    ) : (
                                      <button
                                        className="profile-follow-btn follow"
                                        onClick={() => handleFollowToggle(viewingUserProfile._id)}
                                        style={{ flex: 1 }}
                                      >
                                        Follow
                                      </button>
                                    )}
                                    <button
                                      className="profile-message-btn"
                                      onClick={() => {
                                        setPreselectedChatPartner({
                                          _id: viewingUserProfile._id,
                                          username: viewingUserProfile.username,
                                          avatar: viewingUserProfile.avatar,
                                          bio: viewingUserProfile.bio || "Developer"
                                        });
                                        navigate("/dashboard?tab=messages");
                                      }}
                                      style={{ flex: 1 }}
                                    >
                                      <MessageSquare size={14} /> Message
                                    </button>
                                  </div>
                                )}
                                <button
                                  className="profile-back-btn"
                                  onClick={() => navigate("/dashboard?tab=profile")}
                                  style={{ width: "100%", padding: "8px", background: "var(--ce-surface-card)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                                >
                                  <ArrowLeft size={13} /> Back to My Profile
                                </button>
                              </div>
                            ) : (
                              <button className="profile-edit-trigger-btn" onClick={startEditingProfile} style={{ width: "100%", marginTop: "16px", padding: "8px", background: "var(--ce-surface-card)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", transition: "all 0.2s" }}>
                                Edit Profile
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Profile Main Content */}
                    <div className="profile-main-body" style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: isLoadingStats ? 0.6 : 1, transition: "opacity 0.22s ease", pointerEvents: isLoadingStats ? "none" : "auto" }}>
                      <ContributionHeatmap
                        rawHeatmap={viewingUserProfile ? (viewingUserStats?.heatmap || []) : (heatmap || [])}
                        selectedYear={selectedYear}
                        onYearChange={viewingUserProfile ? handleTargetYearChange : handleYearChange}
                        availableYears={viewingUserProfile ? (viewingUserStats?.years || [new Date().getFullYear()]) : ownYears}
                      />



                      {/* Dynamic Tab Panels for Liked/Saved Rooms, created Rooms & Logs */}
                      <div className="profile-tabs-container">
                        <div className="profile-switchers-row" style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "20px" }}>
                          
                          {/* Switcher 1: Rooms Hub */}
                          <div style={{ flex: "1 1 300px", minWidth: "280px" }}>
                            <h4 style={{ fontSize: "0.82rem", fontWeight: "700", textTransform: "uppercase", color: "var(--ce-text-muted)", letterSpacing: "1px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                              💻 Rooms Hub
                            </h4>
                            {(() => {
                              const roomsTabs = [
                                { id: "rooms", label: viewingUserProfile ? "Rooms" : "My Rooms", count: viewingUserProfile ? viewingUserRooms.length : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length },
                                { id: "liked", label: "Liked", count: viewingUserProfile ? viewingUserLikedRooms.length : likedRooms.length }
                              ];
                              if (!viewingUserProfile) {
                                roomsTabs.push({ id: "saved", label: "Saved", count: savedRooms.length });
                              }
                              const isActive = roomsTabs.some(t => t.id === profileTab);
                              const activeIdx = Math.max(0, roomsTabs.findIndex(t => t.id === profileTab));
                              const tabWidth = 100 / roomsTabs.length;

                              const getTabIcon = (id) => {
                                switch (id) {
                                  case "rooms": return <LayoutGrid size={14} style={{ marginRight: "6px" }} />;
                                  case "liked": return <Heart size={14} style={{ marginRight: "6px" }} />;
                                  case "saved": return <Bookmark size={14} style={{ marginRight: "6px" }} />;
                                  default: return null;
                                }
                              };

                              return (
                                <div className="ce-pill-switcher-container" style={{ margin: 0, padding: 0, width: "100%" }}>
                                  <div className="ce-pill-switcher" style={{ width: "100%" }}>
                                    {isActive && (
                                      <div
                                        className="ce-pill-bg-slide"
                                        style={{
                                          width: `calc(${tabWidth}% - ${8 / roomsTabs.length}px)`,
                                          transform: `translateX(${activeIdx * 100}%)`,
                                          background: "var(--ce-primary)"
                                        }}
                                      />
                                    )}
                                    {roomsTabs.map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        className={`ce-pill-btn ${profileTab === tab.id ? "active" : ""}`}
                                        onClick={() => setProfileTab(tab.id)}
                                        style={{ flex: 1, textAlign: "center" }}
                                      >
                                        {getTabIcon(tab.id)} {tab.label} {tab.count !== null ? `(${tab.count})` : ""}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Switcher 2: Feed Activity */}
                          <div style={{ flex: "1 1 300px", minWidth: "280px" }}>
                            <h4 style={{ fontSize: "0.82rem", fontWeight: "700", textTransform: "uppercase", color: "var(--ce-text-muted)", letterSpacing: "1px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                              📣 Feed & Social
                            </h4>
                            {(() => {
                              const feedTabs = [
                                { id: "posts", label: "Posts", count: profilePosts.length }
                              ];
                              if (!viewingUserProfile) {
                                const savedPostsCount = allFeedPosts.filter(post => savedPostIds.has(post._id)).length;
                                feedTabs.push(
                                  { id: "saved_posts", label: "Saved Posts", count: savedPostsCount },
                                  { id: "activity", label: "Logs", count: null }
                                );
                              }
                              const isActive = feedTabs.some(t => t.id === profileTab);
                              const activeIdx = Math.max(0, feedTabs.findIndex(t => t.id === profileTab));
                              const tabWidth = 100 / feedTabs.length;

                              const getTabIcon = (id) => {
                                switch (id) {
                                  case "posts": return <Image size={14} style={{ marginRight: "6px" }} />;
                                  case "saved_posts": return <Bookmark size={14} style={{ marginRight: "6px" }} />;
                                  case "activity": return <Activity size={14} style={{ marginRight: "6px" }} />;
                                  default: return null;
                                }
                              };

                              return (
                                <div className="ce-pill-switcher-container" style={{ margin: 0, padding: 0, width: "100%" }}>
                                  <div className="ce-pill-switcher" style={{ width: "100%" }}>
                                    {isActive && (
                                      <div
                                        className="ce-pill-bg-slide"
                                        style={{
                                          width: `calc(${tabWidth}% - ${8 / feedTabs.length}px)`,
                                          transform: `translateX(${activeIdx * 100}%)`,
                                          background: "var(--ce-primary)"
                                        }}
                                      />
                                    )}
                                    {feedTabs.map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        className={`ce-pill-btn ${profileTab === tab.id ? "active" : ""}`}
                                        onClick={() => setProfileTab(tab.id)}
                                        style={{ flex: 1, textAlign: "center" }}
                                      >
                                        {getTabIcon(tab.id)} {tab.label} {tab.count !== null ? `(${tab.count})` : ""}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                        </div>

                        <div className="profile-tab-content">
                          {profileTab === "rooms" && (
                            <div className="profile-rooms-grid">
                              {(viewingUserProfile ? viewingUserRooms : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id)).length === 0 ? (
                                <p className="profile-rooms-empty-text">No rooms created yet.</p>
                              ) : (
                                (viewingUserProfile ? viewingUserRooms : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id)).map(room => (
                                  <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                    <div className="profile-room-card-header">
                                      <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                                      <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                                    </div>
                                    <p className="profile-room-card-id">ID: {room.roomId}</p>
                                    <div className="profile-room-card-footer">
                                      <div className="profile-room-card-footer-left">
                                        <span className="profile-room-card-date">{new Date(room.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                                        {room.likedBy && room.likedBy.length > 0 && (
                                          <div className="card-likes-avatars-stack">
                                            {room.likedBy.slice(0, 3).map((u, i) => (
                                              <div
                                                key={i}
                                                className="avatar-stack-item"
                                                style={{
                                                  marginLeft: i > 0 ? "-6px" : "0",
                                                  zIndex: 10 - i
                                                }}
                                              >
                                                {u.avatar ? (
                                                  <img src={u.avatar} alt={u.username} />
                                                ) : (
                                                  <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                    {(u.username || "D").charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            {room.likedBy.length > 3 && (
                                              <span className="avatar-stack-more">
                                                +{room.likedBy.length - 3}
                                              </span>
                                            )}
                                            <div className="likes-tooltip">
                                              <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                              <div className="likes-tooltip-list">
                                                {room.likedBy.map((u, idx) => (
                                                  <div key={idx} className="likes-tooltip-user">
                                                    {u.avatar ? (
                                                      <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                                    ) : (
                                                      <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                        {(u.username || "D").charAt(0).toUpperCase()}
                                                      </div>
                                                    )}
                                                    <span className="likes-tooltip-username">{u.username}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                          onClick={() => handleLikeRoom(room.roomId)}
                                        >
                                          <Heart
                                            size={12}
                                            fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                          />
                                          <span className="like-count-text">{room.likesCount || 0}</span>
                                        </button>
                                        <button onClick={() => handleBookmarkRoom(room.roomId)} className="profile-room-bookmark-btn"><Bookmark size={12} /></button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {profileTab === "posts" && (
                            <div style={{ width: "100%" }}>
                              {isProfilePostsLoading ? (
                                <p className="profile-rooms-empty-text">Loading posts...</p>
                              ) : profilePosts.length === 0 ? (
                                <p className="profile-rooms-empty-text">No posts shared yet.</p>
                              ) : (
                                <div className="profile-post-card-grid">
                                  {profilePosts.map(post => (
                                    <ProfilePostCard 
                                      key={post._id} 
                                      post={post} 
                                      onOpen={() => setSelectedPostModal(post)} 
                                      user={viewingUserProfile || user}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {profileTab === "saved_posts" && (
                            <div style={{ width: "100%" }}>
                              {(() => {
                                const savedPostsList = allFeedPosts.filter(post => savedPostIds.has(post._id));
                                if (savedPostsList.length === 0) {
                                  return <p className="profile-rooms-empty-text">No saved posts yet.</p>;
                                }
                                return (
                                  <div className="profile-post-card-grid">
                                    {savedPostsList.map(post => (
                                      <ProfilePostCard 
                                        key={post._id} 
                                        post={post} 
                                        onOpen={() => setSelectedPostModal(post)} 
                                        user={post.author}
                                      />
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}



                          {profileTab === "liked" && (
                            <div className="profile-rooms-grid">
                              {(viewingUserProfile ? viewingUserLikedRooms : likedRooms).length === 0 ? (
                                <p className="profile-rooms-empty-text">No liked rooms.</p>
                              ) : (
                                (viewingUserProfile ? viewingUserLikedRooms : likedRooms).map(room => (
                                  <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                    <div className="profile-room-card-header">
                                      <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                                      <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                                    </div>
                                    <p className="profile-room-card-author">By {room.createdBy?.username || "Developer"}</p>
                                    <div className="profile-room-card-footer">
                                      <div className="profile-room-card-footer-left">
                                        <span className="profile-room-card-status-text">Liked</span>
                                      </div>
                                      <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                                        {room.likedBy && room.likedBy.length > 0 && (
                                          <div className="card-likes-avatars-stack">
                                            {room.likedBy.slice(0, 3).map((u, i) => (
                                              <div
                                                key={i}
                                                className="avatar-stack-item"
                                                style={{
                                                  marginLeft: i > 0 ? "-6px" : "0",
                                                  zIndex: 10 - i
                                                }}
                                              >
                                                {u.avatar ? (
                                                  <img src={u.avatar} alt={u.username} />
                                                ) : (
                                                  <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                    {(u.username || "D").charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            {room.likedBy.length > 3 && (
                                              <span className="avatar-stack-more">
                                                +{room.likedBy.length - 3}
                                              </span>
                                            )}
                                            <div className="likes-tooltip">
                                              <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                              <div className="likes-tooltip-list">
                                                {room.likedBy.map((u, idx) => (
                                                  <div key={idx} className="likes-tooltip-user">
                                                    {u.avatar ? (
                                                      <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                                    ) : (
                                                      <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                        {(u.username || "D").charAt(0).toUpperCase()}
                                                      </div>
                                                    )}
                                                    <span className="likes-tooltip-username">{u.username}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                          onClick={() => handleLikeRoom(room.roomId)}
                                        >
                                          <Heart
                                            size={12}
                                            fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                          />
                                          <span className="like-count-text">{room.likesCount || 0}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {!viewingUserProfile && profileTab === "saved" && (
                            <div className="profile-rooms-grid">
                              {savedRooms.length === 0 ? (
                                <p className="profile-rooms-empty-text">No bookmarked rooms.</p>
                              ) : (
                                savedRooms.map(room => (
                                  <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                    <div className="profile-room-card-header">
                                      <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                                      <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                                    </div>
                                    <p className="profile-room-card-author">By {room.createdBy?.username || "Developer"}</p>
                                    <div className="profile-room-card-footer">
                                      <div className="profile-room-card-footer-left">
                                        <span className="profile-room-card-status-text">Saved</span>
                                      </div>
                                      <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                                        {room.likedBy && room.likedBy.length > 0 && (
                                          <div className="card-likes-avatars-stack">
                                            {room.likedBy.slice(0, 3).map((u, i) => (
                                              <div
                                                key={i}
                                                className="avatar-stack-item"
                                                style={{
                                                  marginLeft: i > 0 ? "-6px" : "0",
                                                  zIndex: 10 - i
                                                }}
                                              >
                                                {u.avatar ? (
                                                  <img src={u.avatar} alt={u.username} />
                                                ) : (
                                                  <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                    {(u.username || "D").charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                            {room.likedBy.length > 3 && (
                                              <span className="avatar-stack-more">
                                                +{room.likedBy.length - 3}
                                              </span>
                                            )}
                                            <div className="likes-tooltip">
                                              <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                              <div className="likes-tooltip-list">
                                                {room.likedBy.map((u, idx) => (
                                                  <div key={idx} className="likes-tooltip-user">
                                                    {u.avatar ? (
                                                      <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                                    ) : (
                                                      <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                                        {(u.username || "D").charAt(0).toUpperCase()}
                                                      </div>
                                                    )}
                                                    <span className="likes-tooltip-username">{u.username}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                          onClick={() => handleLikeRoom(room.roomId)}
                                        >
                                          <Heart
                                            size={12}
                                            fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                          />
                                          <span className="like-count-text">{room.likesCount || 0}</span>
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleBookmarkRoom(room.roomId); }} className="profile-room-bookmark-btn active"><Bookmark size={12} fill="currentColor" /></button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}

                          {!viewingUserProfile && profileTab === "activity" && (
                            <div className="profile-activity-list">
                              {activities.filter(a => String(a.username) === String(user?.username)).length === 0 ? (
                                <p className="profile-rooms-empty-text">No recent activity logged.</p>
                              ) : (
                                activities.filter(a => String(a.username) === String(user?.username)).slice(0, 10).map(act => (
                                  <div key={act._id} className="profile-activity-item">
                                    <span>You {act.action} room <strong>{act.roomTitle}</strong></span>
                                    <span className="profile-activity-time">{formatLastActive(act.timestamp)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          )}


          {/* SETTINGS SECTION */}
          {activeSection === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
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
                        <button className="settings-save-btn" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? "Saving..." : "Update Profile"}</button>
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
                            <div className="theme-preview dark">
                              <div className="preview-decor-sidebar" />
                              <div className="preview-decor-editor">
                                <div className="decor-line code-blue" style={{ width: "60%" }} />
                                <div className="decor-line code-purple" style={{ width: "40%" }} />
                                <div className="decor-line code-yellow" style={{ width: "75%" }} />
                                <div className="decor-line code-green" style={{ width: "50%" }} />
                              </div>
                              <div className="preview-decor-chat" />
                            </div>
                            <span>System Dark Mode</span>
                          </div>
                          <div
                            className={`appearance-theme-card ${activeTheme === "light" ? "active" : ""}`}
                            onClick={() => handleThemeChange("light")}
                          >
                            <div className="theme-preview light">
                              <div className="preview-decor-sidebar" />
                              <div className="preview-decor-editor">
                                <div className="decor-line code-blue" style={{ width: "60%" }} />
                                <div className="decor-line code-purple" style={{ width: "40%" }} />
                                <div className="decor-line code-yellow" style={{ width: "75%" }} />
                                <div className="decor-line code-green" style={{ width: "50%" }} />
                              </div>
                              <div className="preview-decor-chat" />
                            </div>
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

                        <div className="settings-form-row">
                          <div className="settings-form-field flex-1">
                            <label>AI IntelliSense Autocomplete</label>
                            <select value={dashEditorSuggestions} onChange={handleEditorSuggestionsChange}>
                              <option value="ai">AI-Powered (Smart Autocomplete) ✨</option>
                              <option value="standard">Standard Autocomplete</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          <div className="settings-form-field flex-1">
                            <label>Auto-Save Frequency</label>
                            <select value={dashEditorAutoSave} onChange={handleEditorAutoSaveChange}>
                              <option value="off">Manual Save Only</option>
                              <option value="5">Every 5 Seconds</option>
                              <option value="30">Every 30 Seconds</option>
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
                          {newPassword && (
                            <div className="password-strength-container">
                              <div className="strength-bar-track">
                                <div
                                  className="strength-bar-fill"
                                  style={{
                                    width: `${passwordStrength.percent}%`,
                                    backgroundColor: passwordStrength.color,
                                    boxShadow: `0 0 10px ${passwordStrength.color}55`
                                  }}
                                />
                              </div>
                              <span className="strength-label" style={{ color: passwordStrength.color }}>
                                Strength: <strong>{passwordStrength.label}</strong>
                              </span>
                            </div>
                          )}
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

                        <div className="settings-divider-horizontal" />

                        {/* Code-Expo CLI Connection Center */}
                        <div className="integration-card-wrapper cli-integration-card">
                          <div className="cli-header-row">
                            <Terminal size={18} className="cli-icon-neon" />
                            <div>
                              <h4>CODE-EXPO Command Line Interface (CLI)</h4>
                              <span className="integration-desc-small" style={{ display: "block", marginTop: "2px" }}>
                                Synchronize local folders, run compilers, and connect your terminal environment directly to workspaces.
                              </span>
                            </div>
                          </div>

                          <div className="cli-guideline-steps">
                            <div className="cli-step-item">
                              <div className="step-num-title-row">
                                <span className="step-badge">Step 1</span>
                                <span className="step-title">Install the CLI global runner</span>
                              </div>
                              <div className="terminal-code-block">
                                <code>npm install -g code-expo-cli</code>
                                <button
                                  type="button"
                                  className="cli-copy-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText("npm install -g code-expo-cli");
                                    addToast("CLI install command copied", "success");
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="cli-step-item">
                              <div className="step-num-title-row">
                                <span className="step-badge">Step 2</span>
                                <span className="step-title">Authenticate using an API key generated above</span>
                              </div>
                              <div className="terminal-code-block">
                                <code>code-expo login --token &lt;YOUR_API_KEY&gt;</code>
                                <button
                                  type="button"
                                  className="cli-copy-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText("code-expo login --token <YOUR_API_KEY>");
                                    addToast("CLI login command copied", "success");
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>

                            <div className="cli-step-item">
                              <div className="step-num-title-row">
                                <span className="step-badge">Step 3</span>
                                <span className="step-title">Sync local directory to a live coding session</span>
                              </div>
                              <div className="terminal-code-block">
                                <code>code-expo sync --room &lt;ROOM_ID&gt; --path ./src</code>
                                <button
                                  type="button"
                                  className="cli-copy-btn"
                                  onClick={() => {
                                    navigator.clipboard.writeText("code-expo sync --room <ROOM_ID> --path ./src");
                                    addToast("CLI sync command copied", "success");
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === "helpdesk" && (
            <motion.div
              key="helpdesk"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <HelpDesk />
            </motion.div>
          )}

          {(activeSection === "trust-safety" || activeSection === "feed-action") && (
            <motion.div
              key="trust-safety"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <TrustSafety user={user} addToast={addToast} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room Details Modal */}
        {selectedRoomDetails && createPortal(
          <div className="ce-modal-overlay" onClick={() => setSelectedRoomDetails(null)}>
            <button className="modal-close-btn-outside" onClick={(e) => { e.stopPropagation(); setSelectedRoomDetails(null); }} title="Close Details">
              <X size={18} />
            </button>
            <div className="ce-modal-card room-details-modal-card" onClick={(e) => e.stopPropagation()}>

              <div className="modal-header-new">
                <span className="modal-label-tag">Room Overview</span>
                <h3 className="modal-title-new">🚀 {selectedRoomDetails.title}</h3>
              </div>

              <div className="modal-details-grid">
                <div className="modal-detail-item">
                  <span className="modal-detail-label">
                    <Terminal size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Room ID
                  </span>
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
                  <span className="modal-detail-label">
                    <Code size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Language
                  </span>
                  <span className="modal-detail-value lang-badge-new">{selectedRoomDetails.language?.toUpperCase()}</span>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">
                    {selectedRoomDetails.isPrivate ? <Lock size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} /> : <Globe size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />} Visibility
                  </span>
                  <span className="modal-detail-value privacy-badge-new">
                    {selectedRoomDetails.isPrivate ? "Private Room" : "Public Room"}
                  </span>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">
                    <User size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Owner
                  </span>
                  <div className="modal-owner-badge">
                    {selectedRoomDetails.createdBy?.avatar ? (
                      <img
                        src={selectedRoomDetails.createdBy.avatar}
                        alt="Owner"
                        className="modal-owner-avatar-img"
                      />
                    ) : (
                      <div
                        className="modal-owner-avatar-placeholder"
                        style={{ backgroundColor: getAvatarColor(selectedRoomDetails.createdBy?.username || "Owner") }}
                      >
                        {(selectedRoomDetails.createdBy?.username || "O").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="owner-name-new">
                      {selectedRoomDetails.createdBy?.username || "Collaborator"}
                    </span>
                  </div>
                </div>

                <div className="modal-detail-item">
                  <span className="modal-detail-label">
                    <Clock size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} /> Last Active
                  </span>
                  <span className="modal-detail-value last-active-time">
                    {formatLastActive(selectedRoomDetails.lastActivity || selectedRoomDetails.updatedAt)}
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
                      const userObj = m.user && typeof m.user === 'object' ? m.user : null;
                      const uId = userObj ? userObj._id : (m.user || m._id || m);
                      const username = userObj ? userObj.username : (m.username || "Collaborator");
                      const avatar = userObj ? userObj.avatar : m.avatar;
                      const role = m.role || "MEMBER";

                      const isOnline = onlineUserIds.has(String(uId)) || (selectedRoomDetails.activeUsers || []).some(au => au.username === username);
                      const isOwner = String(uId) === String(selectedRoomDetails.createdBy?._id || selectedRoomDetails.createdBy);
                      const isSelf = String(uId) === String(user?.id);

                      return (
                        <div key={i} className="modal-member-card">
                          <div className="member-avatar-wrapper-mini">
                            {avatar ? (
                              <img src={avatar} alt={username} className="member-avatar-img-mini" />
                            ) : (
                              <div className="member-avatar-initials-mini" style={{ backgroundColor: getAvatarColor(username) }}>
                                {(username || "C").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className={`presence-indicator-dot-mini ${isOnline ? "online" : "offline"}`} />
                          </div>
                          <div className="modal-member-info">
                            <span className="modal-member-name">{username}</span>
                            <span className={`member-role-badge ${String(role).toLowerCase()}`}>
                              {role}
                            </span>
                          </div>
                          <span className={`presence-text-badge-mini ${isOnline ? "online" : "offline"}`}>
                            {isOnline ? "Online" : "Offline"}
                          </span>
                          {isCurrentUserOwner && !isOwner && !isSelf && (
                            <button
                              onClick={() => handleRemoveUser(selectedRoomDetails.roomId, uId, username)}
                              className="modal-kick-member-btn"
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
              <div className="modal-likes-section">
                <h4 className="modal-likes-title">
                  <Heart size={13} fill="var(--ce-danger, #f85149)" />
                  Liked By ({selectedRoomLikes.length})
                </h4>
                {isLoadingRoomLikes ? (
                  <div className="modal-likes-loader">Loading likes...</div>
                ) : selectedRoomLikes.length === 0 ? (
                  <p className="modal-likes-empty">No likes yet. Be the first to like this room!</p>
                ) : (
                  <div className="likes-list-scrollable">
                    {selectedRoomLikes.map((u, idx) => (
                      <div
                        key={idx}
                        className="modal-like-chip"
                        title={u.bio || u.email || `@${u.username}`}
                      >
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.username}
                            className="modal-like-avatar-img"
                          />
                        ) : (
                          <div
                            className="modal-like-avatar-placeholder"
                            style={{ backgroundColor: getAvatarColor(u.username || "D") }}
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
          </div>,
          document.body
        )}

        {/* Quick Create Room Modal */}
        {showQuickCreateModal && createPortal(
          <div className="ce-modal-overlay" onClick={() => !isCreatingRoom && setShowQuickCreateModal(false)}>
            <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn"
                onClick={() => !isCreatingRoom && setShowQuickCreateModal(false)}
                disabled={isCreatingRoom}
              >
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Quick Action</span>
                <h3 className="modal-title-new">Create Workspace Room</h3>
              </div>

              <form onSubmit={handleCreateRoom} className="compact-form modal-form-new">
                <div className="form-field">
                  <label>Workspace Title</label>
                  <input
                    type="text"
                    placeholder="e.g. DSA Practice Prep"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="modal-input-new"
                    disabled={isCreatingRoom}
                  />
                </div>

                <div className="form-field-row">
                  <div className="form-field flex-1">
                    <label>Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="modal-input-new select"
                      disabled={isCreatingRoom}
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
                      disabled={isCreatingRoom}
                    >
                      <option value="false">Public</option>
                      <option value="true">Private (Requires Approval)</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="modal-join-btn-new ce-mt-16" disabled={isCreatingRoom}>
                  {isCreatingRoom && <span className="btn-spinner"></span>}
                  {isCreatingRoom ? "Creating Workspace..." : "Create Room Workspace"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Quick Join Room Modal */}
        {showQuickJoinModal && createPortal(
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

                <button type="submit" onMouseEnter={prefetchEditor} className="modal-join-btn-new ce-btn-success ce-mt-16">
                  Join Workspace
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}


        {/* Kick Confirmation Modal */}
        {kickModalOpen && createPortal(
          <div className="ce-modal-overlay" onClick={() => setKickModalOpen(false)}>
            <div className="ce-modal-card confirm-modal-card warning-glow" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon-circle error">
                <UserMinus size={32} />
              </div>
              <h2 className="modal-confirm-title">Remove Participant?</h2>
              <p className="modal-confirm-desc">
                Are you sure you want to remove <strong>{kickTarget.username}</strong> from this workspace? They will be immediately disconnected.
              </p>
              <div className="modal-confirm-actions">
                <button
                  className="ce-btn-secondary"
                  type="button"
                  onClick={() => setKickModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="ce-btn-danger"
                  type="button"
                  onClick={confirmKickUser}
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Join Confirmation Modal */}
        {showJoinConfirmModal && joinTargetRoom && createPortal(
          <div className="ce-modal-overlay" onClick={() => {
            if (!isJoiningRoom) {
              setShowJoinConfirmModal(false);
              setJoinTargetRoom(null);
            }
          }}>
            <div className="ce-modal-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
              {!isJoiningRoom ? (
                <>
                  <div className="modal-icon-circle info">
                    <LogIn size={32} />
                  </div>
                  <h2 className="modal-confirm-title">Join Workspace?</h2>
                  <p className="modal-confirm-desc">
                    Are you sure you want to join <strong>{joinTargetRoom.title}</strong>? You will connect to this collaborative sandbox.
                  </p>
                  <div className="modal-confirm-actions">
                    <button
                      className="ce-btn-secondary"
                      type="button"
                      onClick={() => {
                        setShowJoinConfirmModal(false);
                        setJoinTargetRoom(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="ce-btn-primary"
                      type="button"
                      onClick={async () => {
                        setIsJoiningRoom(true);
                        const roomId = joinTargetRoom.roomId;
                        try {
                          await proceedJoinRoom(roomId);
                        } catch (error) {
                          console.error("Join room error:", error);
                        } finally {
                          setIsJoiningRoom(false);
                          setJoinTargetRoom(null);
                          setShowJoinConfirmModal(false);
                        }
                      }}
                    >
                      Yes, Join Room
                    </button>
                  </div>
                </>
              ) : (
                <div className="modal-loader-container">
                  <div className="modal-roller-spinner">
                    <div></div><div></div><div></div><div></div>
                    <div></div><div></div><div></div><div></div>
                  </div>
                  <h4 className="modal-loader-text">Connecting to Workspace...</h4>
                  <p className="modal-loader-subtext">Establishing secure collaborative synchronization channels</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

        {/* Followers modal */}
        {showFollowersModal && createPortal(
          <div className="ce-modal-overlay" onClick={() => setShowFollowersModal(false)}>
            <div className="ce-modal-card social-graph-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowFollowersModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Social Graph</span>
                <h3 className="modal-title-new">Followers ({targetFollowersList.length})</h3>
              </div>
              <div className="social-modal-members-section">
                <div className="social-members-list-scrollable">
                  {loadingModalData ? (
                    <p className="modal-empty-msg">Loading followers...</p>
                  ) : targetFollowersList.length === 0 ? (
                    <p className="modal-empty-msg">No followers yet.</p>
                  ) : (
                    targetFollowersList.map(item => {
                      const isSelf = String(item._id) === String(user?.id || user?._id);
                      const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                      return (
                        <div key={item._id} className="social-member-card">
                          <div
                            onClick={() => {
                              setShowFollowersModal(false);
                              handleViewUserProfile(item._id);
                            }}
                            className="social-member-info"
                          >
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.username} className="social-member-avatar-img" />
                            ) : (
                              <div className="social-member-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.username) }}>
                                {item.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="social-member-meta">
                              <span className="social-member-name">{item.username}</span>
                              <span className="social-member-bio">{item.bio || "No bio"}</span>
                            </div>
                          </div>
                          <div className="social-member-actions">
                            {!isSelf && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={() => {
                                    handleFollowToggle(item._id);
                                    const activeId = viewingUserProfile ? viewingUserProfile._id : user?.id || user?._id;
                                    if (activeId) {
                                      Promise.all([
                                        getFollowers(activeId).catch(() => ({ success: false, followers: [] })),
                                        viewingUserProfile ? getUserPublicProfile(viewingUserProfile._id).catch(() => ({ success: false })) : Promise.resolve(null)
                                      ]).then(([followersRes, profileRes]) => {
                                        if (followersRes?.success) setTargetFollowersList(followersRes.followers || []);
                                        if (profileRes?.success && profileRes.user) {
                                          setViewingUserProfile(profileRes.user);
                                          setViewingUserStats(profileRes.stats || null);
                                        }
                                      });
                                    }
                                  }}
                                  className={`ce-modal-follow-btn ${isFollowingUser ? "following" : "follow-back"}`}
                                >
                                  {isFollowingUser ? "Following" : "Follow Back"}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowFollowersModal(false);
                                    setPreselectedChatPartner({
                                      _id: item._id,
                                      username: item.username,
                                      avatar: item.avatar,
                                      bio: item.bio || "Developer"
                                    });
                                    navigate("/dashboard?tab=messages");
                                  }}
                                  className="ce-modal-follow-btn"
                                  style={{ background: "var(--ce-primary)", color: "#fff", border: "none" }}
                                >
                                  Message
                                </button>
                              </div>
                            )}
                            {!viewingUserProfile && (
                              <button
                                onClick={() => {
                                  handleRemoveFollower(item._id);
                                  const activeId = user?.id || user?._id;
                                  if (activeId) {
                                    getFollowers(activeId)
                                      .catch(() => ({ success: false, followers: [] }))
                                      .then(followersRes => {
                                        if (followersRes.success) setTargetFollowersList(followersRes.followers || []);
                                      });
                                  }
                                }}
                                className="ce-remove-follower-btn"
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
          </div>,
          document.body
        )}

        {/* Following modal */}
        {showFollowingModal && createPortal(
          <div className="ce-modal-overlay" onClick={() => setShowFollowingModal(false)}>
            <div className="ce-modal-card social-graph-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowFollowingModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Social Graph</span>
                <h3 className="modal-title-new">Following ({targetFollowingList.length})</h3>
              </div>
              <div className="social-modal-members-section">
                <div className="social-members-list-scrollable">
                  {loadingModalData ? (
                    <p className="modal-empty-msg">Loading following...</p>
                  ) : targetFollowingList.length === 0 ? (
                    <p className="modal-empty-msg">Not following anyone yet.</p>
                  ) : (
                    targetFollowingList.map(item => {
                      const isSelf = String(item._id) === String(user?.id || user?._id);
                      const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                      return (
                        <div key={item._id} className="social-member-card">
                          <div
                            onClick={() => {
                              setShowFollowingModal(false);
                              handleViewUserProfile(item._id);
                            }}
                            className="social-member-info"
                          >
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.username} className="social-member-avatar-img" />
                            ) : (
                              <div className="social-member-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.username) }}>
                                {item.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="social-member-meta">
                              <span className="social-member-name">{item.username}</span>
                              <span className="social-member-bio">{item.bio || "No bio"}</span>
                            </div>
                          </div>
                          {!isSelf && (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() => {
                                  handleFollowToggle(item._id);
                                  if (!viewingUserProfile) {
                                    setTargetFollowingList(prev => prev.filter(f => String(f._id || f) !== String(item._id)));
                                  }
                                  const activeId = viewingUserProfile ? viewingUserProfile._id : user?.id || user?._id;
                                  if (activeId) {
                                    Promise.all([
                                      getFollowing(activeId).catch(() => ({ success: false, following: [] })),
                                      viewingUserProfile ? getUserPublicProfile(viewingUserProfile._id).catch(() => ({ success: false })) : Promise.resolve(null)
                                    ]).then(([followingRes, profileRes]) => {
                                      if (followingRes?.success) setTargetFollowingList(followingRes.following || []);
                                      if (profileRes?.success && profileRes.user) {
                                        setViewingUserProfile(profileRes.user);
                                        setViewingUserStats(profileRes.stats || null);
                                      }
                                    });
                                  }
                                }}
                                className={`ce-modal-follow-btn ${isFollowingUser ? "following" : "follow"}`}
                              >
                                {isFollowingUser ? "Following" : "Follow"}
                              </button>
                              <button
                                onClick={() => {
                                  setShowFollowingModal(false);
                                  setPreselectedChatPartner({
                                    _id: item._id,
                                    username: item.username,
                                    avatar: item.avatar,
                                    bio: item.bio || "Developer"
                                  });
                                  navigate("/dashboard?tab=messages");
                                }}
                                className="ce-modal-follow-btn"
                                style={{ background: "var(--ce-primary)", color: "#fff", border: "none" }}
                              >
                                Message
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Pop-up Ad Modal Portal */}
        {currentPopupAd && createPortal(
          <div className="popup-ad-overlay">
            <div className="popup-ad-card animate-fade-in">
              <button className="popup-ad-close-btn" onClick={handleClosePopupAd} aria-label="Close Ad">
                <X size={18} />
              </button>

              <div className="popup-ad-content" onClick={handlePopupAdClick}>
                <div className="popup-ad-image-container">
                  <img
                    src={currentPopupAd.imageUrl}
                    alt={currentPopupAd.title}
                    className="popup-ad-image"
                  />
                  <span className="popup-ad-sponsored-tag">SPONSORED</span>
                </div>

                <div className="popup-ad-body">
                  <h3 className="popup-ad-title">{currentPopupAd.title}</h3>
                  {currentPopupAd.redirectUrl && (
                    <div className="popup-ad-action-btn-wrapper">
                      <button className="popup-ad-action-btn">
                        <span>Learn More</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}



        {likedUsersListModal && createPortal(
          <div className="ce-modal-overlay" onClick={() => setLikedUsersListModal(null)} style={{ zIndex: 100000 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="ce-modal-card"
              style={{ maxWidth: "380px", width: "90%", padding: "20px", background: "var(--ce-surface-card)", border: "1px solid var(--ce-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, color: "var(--ce-text-h)", fontSize: "1.1rem", fontWeight: "700" }}>Liked By</h3>
                <button 
                  onClick={() => setLikedUsersListModal(null)} 
                  style={{ background: "none", border: "none", color: "var(--ce-text-muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                {likedUsersListModal.map((liker, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(99, 102, 241, 0.04)", borderRadius: "8px", border: "1px solid var(--ce-border)" }}>
                    <div 
                      style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                      onClick={() => {
                        setLikedUsersListModal(null);
                        handleViewUserProfile(liker._id);
                      }}
                    >
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {liker.avatar ? (
                          <img src={liker.avatar} alt={liker.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff", fontSize: "0.8rem", fontWeight: "600" }}>
                            {(liker.username || "D").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--ce-text)" }}>@{liker.username}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>{liker.title || "Developer"}</span>
                      </div>
                    </div>

                    {liker._id !== (user?.id || user?._id) && (
                      <button
                        onClick={() => {
                          setLikedUsersListModal(null);
                          setPreselectedChatPartner({
                            _id: liker._id,
                            username: liker.username,
                            avatar: liker.avatar,
                            bio: liker.bio || "Developer"
                          });
                          navigate("/dashboard?tab=messages");
                        }}
                        style={{ padding: "4px 8px", background: "var(--ce-primary)", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer", fontWeight: "600" }}
                      >
                        Message
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        {selectedPostModal && (() => {
          const postImages = selectedPostModal.images && selectedPostModal.images.length > 0 ? selectedPostModal.images : (selectedPostModal.image ? [selectedPostModal.image] : []);
          const hasImage = postImages.length > 0;
          const codeDetails = extractCodeBlock(selectedPostModal.text);
          const hasCode = !!codeDetails;
          const isSplit = hasImage || hasCode;

          return createPortal(
            <div className="ce-modal-overlay" onClick={handleClosePostModal} style={{ zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: isSplit ? "880px" : "480px",
                  height: "600px",
                  maxHeight: "90vh",
                  maxWidth: "95vw",
                  background: "var(--ce-surface-card)",
                  borderRadius: "16px",
                  border: "1px solid var(--ce-border)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: isSplit ? "row" : "column",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
                  position: "relative"
                }}
              >
                <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: isSplit ? "row" : "column" }} className={selectedPostModal.isSensitive && !modalRevealedSensitive ? "sensitive-blur-active" : ""}>
                {/* Left Column: Image Carousel or Code Snippet */}
                {hasImage && (
                  <div style={{ flex: 1, height: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                    <div style={{ display: "flex", height: "100%", width: "100%", transition: "transform 0.3s ease", transform: `translateX(-${modalActiveImageIdx * 100}%)` }}>
                      {postImages.map((src, i) => (
                        <img 
                          key={i} 
                          src={src} 
                          alt={`Post media view ${i}`} 
                          style={{ width: "100%", height: "100%", flexShrink: 0, objectFit: "cover" }} 
                        />
                      ))}
                    </div>
                    {/* Carousel Arrow Controls */}
                    {postImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setModalActiveImageIdx(prev => (prev - 1 + postImages.length) % postImages.length)}
                          style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setModalActiveImageIdx(prev => (prev + 1) % postImages.length)}
                          style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}
                        >
                          <ChevronRight size={16} />
                        </button>

                        {/* Carousel Dots indicators */}
                        <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 5 }}>
                          {postImages.map((_, i) => (
                            <div
                              key={i}
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: modalActiveImageIdx === i ? "#fff" : "rgba(255,255,255,0.4)",
                                transition: "background 0.2s"
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {(!hasImage && hasCode) && (
                  <div style={{ flex: 1, height: "100%", background: "#09090f", display: "flex", flexDirection: "column", borderRight: "1px solid var(--ce-border)" }}>
                    {/* Mac style window header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#11111b", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" }} />
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" }} />
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#a5b4fc", fontFamily: "monospace", textTransform: "uppercase", fontWeight: "700" }}>
                        {codeDetails.lang}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(codeDetails.code);
                          addToast("Code copied to clipboard!", "success");
                        }}
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", padding: "4px 8px", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }}
                      >
                        Copy
                      </button>
                    </div>
                    
                    {/* Code Content */}
                    <div style={{ flex: 1, overflow: "auto", padding: "16px", margin: 0 }}>
                      <pre style={{ margin: 0, padding: 0, background: "none", border: "none", fontFamily: "'Fira Code', monospace", fontSize: "0.82rem", lineHeight: "1.5", color: "#e2e8f0", whiteSpace: "pre" }}>
                        <code dangerouslySetInnerHTML={{ __html: highlightCode(codeDetails.code) }} />
                      </pre>
                    </div>
                  </div>
                )}

                {/* Right/Main Column: Post Details */}
                <div style={{ width: isSplit ? "380px" : "100%", height: "100%", display: "flex", flexDirection: "column", background: "var(--ce-surface-card)" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: "1px solid var(--ce-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden" }}>
                      {selectedPostModal.author?.avatar ? (
                        <img src={selectedPostModal.author.avatar} alt={selectedPostModal.author.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff", fontSize: "0.8rem", fontWeight: "600" }}>
                          {(selectedPostModal.author?.username || "D").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--ce-text)" }}>@{selectedPostModal.author?.username || "developer"}</span>
                      <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>{selectedPostModal.author?.title || "Developer"}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleClosePostModal} 
                    style={{ background: "none", border: "none", color: "var(--ce-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content & Comments scroll section */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Post description text */}
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                      {selectedPostModal.author?.avatar ? (
                        <img src={selectedPostModal.author.avatar} alt="Author" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff", fontSize: "0.7rem" }}>
                          {(selectedPostModal.author?.username || "D").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.4", color: "var(--ce-text)", flex: 1 }}>
                      <strong style={{ color: "var(--ce-text-h)", marginRight: "6px" }}>@{selectedPostModal.author?.username}:</strong>
                      {parseMarkdown(hasCode ? getRightSideText(selectedPostModal.text) : selectedPostModal.text)}
                    </div>
                  </div>

                  {/* Divider line */}
                  <div style={{ borderBottom: "1px solid var(--ce-border)" }} />

                  {/* Comments list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {selectedPostModal.comments && selectedPostModal.comments.length > 0 ? (
                      selectedPostModal.comments.map((comment, index) => (
                        <div key={index} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                            {comment.avatar ? (
                              <img src={comment.avatar} alt={comment.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff", fontSize: "0.7rem" }}>
                                {(comment.username || "D").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: "1.4", color: "var(--ce-text)" }}>
                            <strong style={{ color: "var(--ce-text-h)", marginRight: "6px" }}>@{comment.username}:</strong>
                            {comment.text}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)", textAlign: "center", marginTop: "20px" }}>No comments yet. Be first to comment!</p>
                    )}
                  </div>
                </div>

                {/* Footer panel containing Like Action and Likes stack */}
                <div style={{ padding: "16px", borderTop: "1px solid var(--ce-border)", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Liking action - ONLY heart icon */}
                      <button
                        onClick={() => !selectedPostModal.likesDisabled && handleLikePostInModal()}
                        disabled={selectedPostModal.likesDisabled}
                        style={{ background: "none", border: "none", color: selectedPostModal.likes?.includes(user?.id || user?._id) ? "#ef4444" : "var(--ce-text)", cursor: selectedPostModal.likesDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", padding: 0, opacity: selectedPostModal.likesDisabled ? 0.45 : 1 }}
                        title={selectedPostModal.likesDisabled ? "Likes are disabled" : ""}
                      >
                        <Heart size={20} fill={selectedPostModal.likes?.includes(user?.id || user?._id) ? "#ef4444" : "none"} color={selectedPostModal.likes?.includes(user?.id || user?._id) ? "#ef4444" : "currentColor"} />
                      </button>
                      
                      {/* Likers Stack with Clickable More Option */}
                      {(() => {
                        const resolvedLikers = (selectedPostModal.likes || []).map(resolveLikedUser).filter(Boolean);
                        if (resolvedLikers.length === 0) return null;
                        return (
                          <div className="card-likes-avatars-stack" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              {resolvedLikers.slice(0, 3).map((u, i) => (
                                <div
                                  key={i}
                                  className="avatar-stack-item"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: "1px solid var(--ce-surface-card)",
                                    marginLeft: i > 0 ? "-6px" : "0",
                                    zIndex: 10 - i,
                                    cursor: "pointer"
                                  }}
                                  onClick={() => {
                                    handleClosePostModal();
                                    setLikedUsersListModal(resolvedLikers);
                                  }}
                                  title={`@${u.username}`}
                                >
                                  {u.avatar ? (
                                    <img src={u.avatar} alt={u.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <div className="avatar-fallback" style={{ width: "100%", height: "100%", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff" }}>
                                      {(u.username || "D").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleClosePostModal();
                                setLikedUsersListModal(resolvedLikers);
                              }}
                              style={{ background: "none", border: "none", color: "var(--ce-primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, padding: 0 }}
                            >
                              {resolvedLikers.length > 3 ? `+${resolvedLikers.length - 3} others` : `liked`}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Bookmark / Saved button */}
                      <button
                        onClick={() => {
                          setSavedPostIds(prev => {
                            const next = new Set(prev);
                            if (next.has(selectedPostModal._id)) {
                              next.delete(selectedPostModal._id);
                              addToast("Post removed from saved bookmarks", "success");
                            } else {
                              next.add(selectedPostModal._id);
                              addToast("Post saved to bookmarks", "success");
                            }
                            localStorage.setItem("codeexpo_bookmarked_post_ids", JSON.stringify(Array.from(next)));
                            return next;
                          });
                        }}
                        style={{ background: "none", border: "none", color: savedPostIds.has(selectedPostModal._id) ? "#3b82f6" : "var(--ce-text)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                        title="Bookmark post"
                      >
                        <Bookmark size={18} fill={savedPostIds.has(selectedPostModal._id) ? "#3b82f6" : "none"} />
                      </button>

                      {/* Share link button */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setModalShareOpen(!modalShareOpen)}
                          style={{ background: "none", border: "none", color: "var(--ce-text)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                          title="Share link"
                        >
                          <Share2 size={18} />
                        </button>
                        {modalShareOpen && (
                          <div className="share-dropdown-menu">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/post/${selectedPostModal._id}`);
                                addToast("Link copied to clipboard!", "success");
                                setModalShareOpen(false);
                              }}
                              style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
                            >
                              📋 Copy Link
                            </button>
                            <a 
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this post on CodeExpo: " + window.location.origin + "/post/" + selectedPostModal._id)}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={() => setModalShareOpen(false)}
                            >
                              💬 WhatsApp
                            </a>
                          </div>
                        )}
                      </div>

                      <span style={{ fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                        {new Date(selectedPostModal.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Comment form input */}
                  <form onSubmit={handleAddCommentInModal} style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                    <input 
                      type="text"
                      placeholder={selectedPostModal.commentsLocked ? "Comments are locked for this post." : "Add a comment..."}
                      value={modalCommentText}
                      onChange={(e) => setModalCommentText(e.target.value)}
                      disabled={selectedPostModal.commentsLocked}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", background: "var(--ce-surface-card-hover)", border: "1px solid var(--ce-border)", color: "var(--ce-text)", fontSize: "0.8rem", cursor: selectedPostModal.commentsLocked ? "not-allowed" : "text" }}
                    />
                    <button 
                      type="submit" 
                      disabled={selectedPostModal.commentsLocked}
                      style={{ padding: "6px 12px", background: "var(--ce-primary)", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", cursor: selectedPostModal.commentsLocked ? "not-allowed" : "pointer", fontWeight: 600, opacity: selectedPostModal.commentsLocked ? 0.5 : 1 }}
                    >
                      Post
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {selectedPostModal.isSensitive && !modalRevealedSensitive && (
              <div className="sensitive-shield-mask" style={{ borderRadius: "16px" }}>
                <h4 className="sensitive-shield-title">Sensitive Content</h4>
                <p className="sensitive-shield-desc">This post has been flagged as sensitive by the platform administrators.</p>
                <button
                  type="button"
                  className="btn-reveal-sensitive"
                  onClick={() => setModalRevealedSensitive(true)}
                >
                  Show Sensitive Content
                </button>
              </div>
            )}
          </motion.div>
          </div>,
          document.body
        );
      })()}



        {/* Real-time Toast Notifications stack overlay */}
        {createPortal(
          <div className="ce-toast-notifications-stack">
            {toasts.map(t => (
              <div key={t.id} className={`ce-toast-alert ${t.type}`}>
                <div className="toast-bullet" />
                <div className="toast-message-text">{t.message}</div>
              </div>
            ))}
          </div>,
          document.body
        )}

      </div>
    </MainLayout>
  );
}

export default Dashboard;

