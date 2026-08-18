import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation, useParams, Outlet } from "react-router-dom";
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
  kickUser,
  leaveRoom,
  deleteRoom,
  getAllPublicRooms,
  getMySentRequests,
  acceptWorkspaceInvite
} from "../services/roomService";
import socket from "../socket/socket";
import { useAuth } from "../context/AuthContext";
import { getUserProfile, changePassword, getPublicUserProfile } from "../services/authService";
import SecuritySettings from "../components/settings/SecuritySettings";
import AccountSettings from "../components/settings/AccountSettings";
import { getAvatarColor, getAvatarInitial } from "../utils/avatarUtils";

const DashboardGithubIcon = ({ size = 13 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const DashboardLinkedinIcon = ({ size = 13 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
import ReportUserModal from "../components/social/ReportUserModal";
import SecurityDeleteRoomModal from "../components/modals/SecurityDeleteRoomModal";
import EditRoomModal from "../components/modals/EditRoomModal";
import { getPersonalDashboard } from "../services/plannerService";
import {
  Plus, LogIn, History as HistoryIcon, User,
  Sun, Moon, Sparkles, Globe, Lock, Settings as SettingsIcon,
  Users, Clock, Terminal, Activity, FolderGit, Check, X, ShieldAlert, UserMinus,
  Search, SlidersHorizontal, BookOpen, ShieldCheck, Mail, Key, Eye, EyeOff, BellRing, Laptop,
  Palette, Bell, HelpCircle, Copy, Folder, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Code,
  Heart, Bookmark, UserPlus, UserCheck, ArrowLeft, Flame, Trophy, Calendar, Share2,
  Megaphone, Wrench, Award, Compass, MessageSquare, LayoutGrid, Image, Play, MapPin, MoreVertical, Trash2, Edit3,
  Volume2, VolumeX, Radio, GitPullRequest, Send, DoorOpen, FileText, Video
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
  getPostById,
  toggleLikePost,
  addCommentPost,
  toggleLikeCommentPost,
  deleteCommentPost,
  deletePost
} from "../services/socialService";
import { CommentTreeItem, InstaImageCarousel } from "../components/social/feed/FeedContent/PostCard";
import { updateUserProfile, getActiveAnnouncements, getActiveAds, uploadCoverBanner, deleteCoverBanner } from "../services/userService";
import { toggleLikeOptimistic, subscribeToLikes, isEntityLiked } from "../services/likeEngine";
import { optimizeCloudinaryUrl } from "../utils/imageOptimizer";

const ExpandableText = ({ children, text, lines = 3 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textStr = text || (typeof children === "string" ? children : "");
  const shouldShowButton = textStr && (textStr.length > 200 || textStr.split("\n").length > lines);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "-webkit-box",
          WebkitLineClamp: isExpanded ? "none" : lines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: "1.5",
          maxHeight: isExpanded ? "none" : `${lines * 1.5}em`
        }}
      >
        {children}
      </div>
      {shouldShowButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            padding: "2px 0",
            marginTop: "4px",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          {isExpanded ? "Read Less" : "Read More"}
        </button>
      )}
    </div>
  );
};
import { getTrustSafetyStatus } from "../services/trustSafetyService";
import "./Dashboard.css";
import MainLayout from "../layouts/MainLayout";
import { useTheme } from "../context/ThemeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import DirectMessages from "../components/chat/DirectMessages";
import StoriesSystem from "../components/social/StoriesSystem";
import DeveloperFeed from "../components/social/DeveloperFeed";
import NetworkSidebar from "../components/social/NetworkSidebar";
import LeftSidebar from "../components/social/LeftSidebar";
import TrustSafety from "../components/social/TrustSafety";
import NetworkAnalytics from "../components/social/NetworkAnalytics";
import UserProfileModal from "../components/social/UserProfileModal";
import SubscriptionPlans from "../components/social/SubscriptionPlans";
const HelpDesk = lazy(() => import("../components/helpdesk/HelpDesk"));
import { StatsSkeleton, RoomGridSkeleton, ActivityFeedSkeleton, UserListSkeleton, TrendingListSkeleton, AdSkeleton } from "../components/SkeletonLoader";
import { useGateTransition } from "../routes/AppRoutes";
import TaskPlanner from "../components/planner/TaskPlanner";
import CPDashboard from "../components/cp/CPDashboard";

const notificationAudio = new Audio("/code-Expo_notification_sound.mp3");
notificationAudio.load();

const playNotificationSound = () => {
  const soundEnabled = localStorage.getItem("notif_soundEnabled") !== "false";
  if (!soundEnabled) return;
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(err => console.log("Audio play blocked by browser policy:", err));
};

const getPostSnippet = (targetPost) => {
  if (!targetPost) return "post";
  const postText = targetPost.text || "";
  let plainText = postText.replace(/```[\s\S]*?```/g, "").replace(/\n/g, " ").trim();
  if (!plainText) plainText = postText;
  if (plainText.length > 30) {
    return plainText.slice(0, 30) + "...";
  }
  return plainText || "post";
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

const SafeUserAvatar = ({ userId, avatar, username, size = 28, className = "" }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setImgFailed(false);
  }, [avatar]);

  const isValidAvatar = avatar && typeof avatar === "string" && avatar.trim().length > 0 && !imgFailed && avatar !== "undefined" && avatar !== "null";

  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (userId) {
      if (window.handleGlobalProfileNav) {
        window.handleGlobalProfileNav(userId, username);
      } else {
        if (username) {
          navigate(`/u/${username}`);
        } else {
          navigate(`/dashboard/profile/${userId}`);
        }
      }
    }
  };

  if (isValidAvatar) {
    return (
      <img
        src={avatar}
        alt=""
        onError={() => setImgFailed(true)}
        className={className}
        onClick={handleAvatarClick}
        title={`View @${username}'s profile`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "4px",
          objectFit: "cover",
          display: "block",
          flexShrink: 0,
          cursor: "pointer"
        }}
      />
    );
  }

  return (
    <div
      className={className ? `${className}-initial` : "avatar-initial"}
      onClick={handleAvatarClick}
      title={`View @${username}'s profile`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: getAvatarColor(username),
        fontSize: size <= 28 ? "0.78rem" : "0.9rem",
        fontWeight: "600",
        color: "#fff",
        flexShrink: 0,
        cursor: "pointer"
      }}
    >
      {(username || "D").charAt(0).toUpperCase()}
    </div>
  );
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

const countAllComments = (comments) => {
  if (!comments || !Array.isArray(comments)) return 0;
  return comments.reduce((total, comment) => {
    return total + 1 + countAllComments(comment.replies || []);
  }, 0);
};

// Reusable styled ProfilePostCard component for the profile grid
const ProfilePostCard = ({ post, onOpen, user, onDelete, onReport }) => {
  const currentUserId = String(user?.id || user?._id || "");
  const likesArr = Array.isArray(post.likes) ? post.likes : [];
  const likesCount = likesArr.length || post.likesCount || 0;
  const isLiked = likesArr.some((id) => String(id._id || id || id?.id) === currentUserId);
  const totalCommentsCount = countAllComments(post.comments || []);

  const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
  const hasImage = postImages.length > 0;
  const hasVideo = !!post.video;
  const codeDetails = extractCodeBlock(post.text);
  const hasCode = !!codeDetails;

  const renderBadge = () => {
    if (hasCode) {
      const langName = (codeDetails.lang || "code").toUpperCase();
      return (
        <span className="profile-card-badge code">
          <Code size={11} className="profile-card-badge-icon" />
          <span>{langName}</span>
        </span>
      );
    }
    if (hasVideo) {
      return (
        <span className="profile-card-badge video">
          <Video size={11} className="profile-card-badge-icon" />
          <span>VIDEO</span>
        </span>
      );
    }
    if (hasImage) {
      return (
        <span className="profile-card-badge image">
          <Image size={11} className="profile-card-badge-icon" />
          <span>IMAGE</span>
        </span>
      );
    }
    return (
      <span className="profile-card-badge text">
        <FileText size={11} className="profile-card-badge-icon" />
        <span>POST</span>
      </span>
    );
  };

  const renderBody = () => {
    if (hasCode) {
      const cleanDesc = getRightSideText(post.text);
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="profile-card-code-preview">
            <div className="profile-card-code-header">
              <span>{codeDetails.lang || "code"}</span>
            </div>
            <pre className="profile-card-code-content">
              <code>{codeDetails.code.slice(0, 150)}{codeDetails.code.length > 150 ? "..." : ""}</code>
            </pre>
          </div>
          {cleanDesc && (
            <p className="profile-card-image-caption">{cleanDesc}</p>
          )}
        </div>
      );
    }

    if (hasImage) {
      const cleanDesc = hasCode ? getRightSideText(post.text) : post.text;
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div className="profile-card-image-wrapper">
            <img src={postImages[0]} alt="Post media preview" className="profile-card-image-preview" />
          </div>
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
    <div className="profile-post-card-item" onClick={onOpen} style={{ cursor: "pointer" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {renderBadge()}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e);
                }}
                className="profile-post-delete-btn"
                title="Delete Post"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "50%",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
            {onReport && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReport(e);
                }}
                className="profile-post-report-btn"
                title="Report Post"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#eab308",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "50%",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(234, 179, 8, 0.1)";
                  e.currentTarget.style.transform = "scale(1.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <ShieldAlert size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="profile-card-body">
          {renderBody()}
        </div>
      </div>

      {/* Footer */}
      <div className="profile-card-footer">
        <div className="profile-card-stats">
          <span className="profile-card-stat" style={{ color: isLiked ? "#ef4444" : "var(--ce-text-muted)" }}>
            <Heart size={14} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "currentColor"} /> {likesCount}
          </span>
          <span className="profile-card-stat">
            <MessageSquare size={14} /> {totalCommentsCount}
          </span>
        </div>

        <button className="profile-card-action-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
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
            aria-label="Select year for contribution heatmap"
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

const renderDashboardTaskItem = (task, isCompleted = false, onClick = null, isPending = false) => {
  const isRoom = task.type === "room";

  let themeClass = "green-theme";
  let badgeColor = "#10b981";
  let badgeBg = "rgba(16, 185, 129, 0.12)";

  if (isPending) {
    themeClass = "red-theme";
    badgeColor = "#ef4444";
    badgeBg = "rgba(239, 68, 68, 0.12)";
  } else if (!isRoom) {
    themeClass = "yellow-theme";
    badgeColor = "#eab308";
    badgeBg = "rgba(234, 179, 8, 0.12)";
  }

  const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "No due date";

  return (
    <div
      key={task._id}
      className={`ce-dashboard-task-card ${themeClass} ${onClick ? "task-card-clickable" : ""}`}
      onClick={() => onClick && onClick(task)}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", textAlign: "left" }}>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: "600",
            color: "var(--ce-text)",
            textDecoration: isCompleted ? "line-through" : "none",
            opacity: isCompleted ? 0.7 : 1
          }}
        >
          {task.title}
        </span>
        <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>
          {isCompleted ? `Completed` : `Due: ${dateStr}`}
        </span>
      </div>
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: "700",
          padding: "2px 6px",
          borderRadius: "4px",
          background: badgeBg,
          color: badgeColor
        }}
      >
        {isRoom ? "Room Task" : "Personal"}
      </span>
    </div>
  );
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

const INDIA_STATES = [
  { name: "J&K", d: "M 195,15 L 210,32 L 202,72 L 175,72 L 182,45 Z", labelX: 192, labelY: 42 },
  { name: "Rajasthan", d: "M 158,82 L 175,72 L 185,92 L 160,95 Z", labelX: 172, labelY: 86 },
  { name: "Gujarat", d: "M 138,122 L 142,108 L 160,95 L 160,112 L 152,125 Z", labelX: 147, labelY: 114 },
  { name: "Maharashtra", d: "M 152,125 L 160,112 L 175,130 L 182,145 L 168,145 Z", labelX: 168, labelY: 132 },
  { name: "Karnataka", d: "M 168,145 L 182,145 L 180,175 L 164,170 Z", labelX: 172, labelY: 160 },
  { name: "Kerala", d: "M 180,175 L 182,195 L 192,192 Z", labelX: 184, labelY: 186 },
  { name: "Tamil Nadu", d: "M 182,195 L 220,205 L 208,178 L 180,175 Z", labelX: 202, labelY: 190 },
  { name: "Andhra & TG", d: "M 180,175 L 208,178 L 212,145 L 182,145 Z", labelX: 198, labelY: 156 },
  { name: "Madhya Pradesh", d: "M 160,95 L 185,92 L 220,115 L 175,130 Z", labelX: 188, labelY: 112 },
  { name: "Uttar Pradesh", d: "M 175,72 L 198,45 L 225,92 L 185,92 Z", labelX: 204, labelY: 76 },
  { name: "West Bengal", d: "M 225,92 L 255,94 L 268,114 L 240,115 Z", labelX: 244, labelY: 104 },
  { name: "North East", d: "M 255,94 L 285,102 L 310,100 L 320,112 L 272,132 L 260,122 Z", labelX: 288, labelY: 112 }
];

const INDIA_CITIES = [
  { name: "Delhi", lat: 28.61, lon: 77.20, x: 195, y: 70 },
  { name: "Mumbai", lat: 19.07, lon: 72.87, x: 168, y: 135 },
  { name: "Bengaluru", lat: 12.97, lon: 77.59, x: 195, y: 172 },
  { name: "Hyderabad", lat: 17.38, lon: 78.48, x: 204, y: 142 },
  { name: "Chennai", lat: 13.08, lon: 80.27, x: 212, y: 178 },
  { name: "Kolkata", lat: 22.57, lon: 88.36, x: 268, y: 114 },
  { name: "Ahmedabad", lat: 23.02, lon: 72.57, x: 160, y: 112 },
  { name: "Pune", lat: 18.52, lon: 73.85, x: 172, y: 142 },
  { name: "Jaipur", lat: 26.91, lon: 75.78, x: 180, y: 92 },
  { name: "Kochi", lat: 9.93, lon: 76.26, x: 192, y: 192 },
  { name: "Guwahati", lat: 26.14, lon: 91.73, x: 295, y: 102 }
];

const findNearestCity = (lat, lon) => {
  let nearest = null;
  let minDist = Infinity;
  INDIA_CITIES.forEach(c => {
    const dist = Math.pow(c.lat - lat, 2) + Math.pow(c.lon - lon, 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  });
  return nearest;
};
const renderSubscriptionBadge = (profileUser) => {
  if (!profileUser?.subscription || profileUser.subscription.status !== "active") return null;

  const plan = profileUser.subscription.plan;
  if (plan === "Developer Pro") {
    return (
      <span
        title="Developer Pro Verified"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#10b981",
          color: "#fff",
          marginLeft: "6px",
          fontSize: "8px",
          fontWeight: "bold",
          verticalAlign: "middle",
          boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)",
          flexShrink: 0
        }}
      >
        ✓
      </span>
    );
  }
  if (plan === "Elite Sponsor") {
    return (
      <span
        title="Elite Sponsor Verified"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#f59e0b",
          color: "#fff",
          marginLeft: "6px",
          fontSize: "8px",
          fontWeight: "bold",
          verticalAlign: "middle",
          boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)",
          flexShrink: 0
        }}
      >
        ✓
      </span>
    );
  }
  return null;
};

const getPremiumLangIconConfig = (lang) => {
  const l = String(lang).toLowerCase();
  if (l === "javascript" || l === "js") {
    return { text: "JS", bg: "#f7df1e", color: "#000000", border: "#f7df1e" };
  }
  if (l === "python" || l === "py") {
    return { text: "PY", bg: "#387eb8", color: "#ffffff", border: "#387eb8" };
  }
  if (l === "cpp" || l === "c++") {
    return { text: "C++", bg: "#00599c", color: "#ffffff", border: "#00599c" };
  }
  if (l === "java") {
    return { text: "JAVA", bg: "#ea2d2e", color: "#ffffff", border: "#ea2d2e" };
  }
  return { text: l.toUpperCase() || "DEV", bg: "#4a5568", color: "#ffffff", border: "#4a5568" };
};

const DAILY_QUESTS = [
  { title: "Two Sum", difficulty: "Easy", diffClass: "easy", desc: "Find two numbers in an array that add up to a specific target.", lang: "javascript" },
  { title: "Rotate Image", difficulty: "Medium", diffClass: "medium", desc: "Rotate an n x n 2D matrix representing an image by 90 degrees clockwise in-place.", lang: "cpp" },
  { title: "Reverse Linked List", difficulty: "Easy", diffClass: "easy", desc: "Reverse a singly linked list and return its head.", lang: "python" },
  { title: "Longest Substring Without Repeating Characters", difficulty: "Medium", diffClass: "medium", desc: "Find the length of the longest substring without repeating characters.", lang: "javascript" },
  { title: "Merge k Sorted Lists", difficulty: "Hard", diffClass: "hard", desc: "Merge k sorted linked lists and return it as one sorted list.", lang: "cpp" },
  { title: "Valid Parentheses", difficulty: "Easy", diffClass: "easy", desc: "Determine if the input string containing brackets is valid.", lang: "java" },
  { title: "Edit Distance", difficulty: "Hard", diffClass: "hard", desc: "Find the minimum number of operations required to convert word1 to word2.", lang: "python" }
];

function Dashboard() {
  const navigate = useNavigate();
  const todayQuest = useMemo(() => {
    const day = new Date().getDay(); // 0 (Sun) to 6 (Sat)
    return DAILY_QUESTS[day];
  }, []);
  const handleTaskClick = useCallback((task) => {
    const path = "/dashboard/planner";
    const params = new URLSearchParams();
    params.set("taskId", task._id);
    if (task.roomId) {
      params.set("roomId", task.roomId);
      params.set("plannerTab", "room_board");
    } else {
      params.set("type", "personal");
      params.set("plannerTab", "personal_tasks");
    }
    navigate(`${path}?${params.toString()}`);
  }, [navigate]);
  const location = useLocation();
  const { user, setUser } = useAuth();
  const { triggerGateTransition } = useGateTransition();
  const pendingLikesRef = useRef(new Set());
  const pendingFollowsRef = useRef(new Set());
  const pendingBookmarksRef = useRef(new Set());
  const followingSearchInputRef = useRef(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedTargetUser, setReportedTargetUser] = useState(null);
  const [reportEvidenceType, setReportEvidenceType] = useState("");
  const [reportEvidenceId, setReportEvidenceId] = useState("");
  const [activeRoomMemberMenuId, setActiveRoomMemberMenuId] = useState(null);
  const [postToDeleteFromProfile, setPostToDeleteFromProfile] = useState(null);
  const [isDeletingProfilePost, setIsDeletingProfilePost] = useState(false);
  const [securityDeleteRoomTarget, setSecurityDeleteRoomTarget] = useState(null);
  const [isDeletingRoomTarget, setIsDeletingRoomTarget] = useState(false);
  const [editingRoomTarget, setEditingRoomTarget] = useState(null);
  const [showMobileCreateModal, setShowMobileCreateModal] = useState(false);
  const [showMobileJoinModal, setShowMobileJoinModal] = useState(false);

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

  const [plannerTasks, setPlannerTasks] = useState(() => loadFromCache("ce_cache_plannerTasks", { todayTasks: [], upcomingTasks: [], overdueTasks: [], recentlyCompleted: [] }));
  const [historyRooms, setHistoryRooms] = useState(() => loadFromCache("ce_cache_historyRooms", []));
  const [visibleJoinedRooms, setVisibleJoinedRooms] = useState(4);
  const [visibleActiveRooms, setVisibleActiveRooms] = useState(4);
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
  const [isFetchingData, setIsFetchingData] = useState(true);
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
  const [onlineFilterTab, setOnlineFilterTab] = useState("all");
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [showAllTrending, setShowAllTrending] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const [feedActivities, setFeedActivities] = useState(() => loadFromCache("ce_cache_feedActivities", []));
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [followersList, setFollowersList] = useState(() => loadFromCache("ce_cache_followersList", []));
  const [followingList, setFollowingList] = useState(() => loadFromCache("ce_cache_followingList", []));
  const [createdRoomsExpanded, setCreatedRoomsExpanded] = useState(false);
  const [likedRoomsExpanded, setLikedRoomsExpanded] = useState(false);
  const [savedRoomsExpanded, setSavedRoomsExpanded] = useState(false);

  const onlineFollowersList = useMemo(() => {
    return (followersList || []).filter(f => f && (f.isOnline === "true" || f.isOnline === true || f.isOnline === "online" || f.online === true || f.status === "online"));
  }, [followersList]);

  const onlineFollowingList = useMemo(() => {
    return (followingList || []).filter(f => f && (f.isOnline === "true" || f.isOnline === true || f.isOnline === "online" || f.online === true || f.status === "online"));
  }, [followingList]);

  const allOnlineList = useMemo(() => {
    const combined = [...(onlineFollows || []), ...onlineFollowersList, ...onlineFollowingList];
    const map = new Map();
    combined.forEach(u => {
      if (u && (u._id || u.id) && !map.has(String(u._id || u.id))) {
        map.set(String(u._id || u.id), u);
      }
    });
    return Array.from(map.values());
  }, [onlineFollows, onlineFollowersList, onlineFollowingList]);

  const displayedOnlineList = useMemo(() => {
    if (onlineFilterTab === "followers") return onlineFollowersList;
    if (onlineFilterTab === "following") return onlineFollowingList;
    return allOnlineList.length > 0 ? allOnlineList : onlineFollows;
  }, [onlineFilterTab, onlineFollowersList, onlineFollowingList, allOnlineList, onlineFollows]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [socialSubTab, setSocialSubTab] = useState("explore");
  const [visibleFollowingCount, setVisibleFollowingCount] = useState(6);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [langsInput, setLangsInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState(() => localStorage.getItem("ce_profileTab") || "rooms");
  useEffect(() => {
    localStorage.setItem("ce_profileTab", profileTab);
  }, [profileTab]);
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
  }, []);

  const [modalActiveImageIdx, setModalActiveImageIdx] = useState(0);
  const [modalShareOpen, setModalShareOpen] = useState(false);

  const isClosingPostModalRef = useRef(false);

  const handleOpenPostModal = (postToOpen) => {
    if (!postToOpen) return;
    isClosingPostModalRef.current = false;
    setSelectedPostModal(postToOpen);
    setModalShareOpen(false);
    if (postToOpen._id) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set("post", postToOpen._id);
      const newUrl = `${location.pathname}?${searchParams.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleClosePostModal = () => {
    isClosingPostModalRef.current = true;
    setSelectedPostModal(null);
    setModalShareOpen(false);
    if (location.pathname.startsWith("/post/")) {
      navigate("/dashboard", { replace: true });
    } else {
      const searchParams = new URLSearchParams(location.search);
      searchParams.delete("post");
      const newSearch = searchParams.toString();
      const targetUrl = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
      window.history.replaceState(null, "", targetUrl);
    }
  };

  useEffect(() => {
    const pathMatch = location.pathname.match(/^\/post\/([a-zA-Z0-9_]+)/);
    const searchParams = new URLSearchParams(location.search);
    const postId = (pathMatch ? pathMatch[1] : null) || searchParams.get("post");

    if (!postId) {
      isClosingPostModalRef.current = false;
      return;
    }

    if (isClosingPostModalRef.current) {
      return;
    }

    if (postId) {
      const matchedPost = allFeedPosts.find(p => p._id === postId);
      if (matchedPost) {
        setSelectedPostModal(matchedPost);
      } else {
        const fetchPostDirectly = async () => {
          try {
            const res = await getPostById(postId);
            if (res.success && res.post) {
              setSelectedPostModal(res.post);
            }
          } catch (err) {
            console.error("Error fetching single post by url query:", err);
          }
        };
        fetchPostDirectly();
      }
    }
  }, [location.pathname, location.search, allFeedPosts]);

  const handleReturnToMyProfile = () => {
    setViewingUserProfile(null);
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete("user");
    searchParams.delete("username");
    searchParams.delete("userId");
    searchParams.delete("avatar");
    searchParams.set("tab", "profile");

    const newSearch = searchParams.toString();
    const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search;

    if (newSearch === currentSearch) {
      return;
    }

    navigate(`/dashboard?${newSearch}`, { replace: false });
  };

  useEffect(() => {
    setModalActiveImageIdx(0);
  }, [selectedPostModal]);

  const [modalCommentText, setModalCommentText] = useState("");
  const [modalRevealedSensitive, setModalRevealedSensitive] = useState(false);

  useEffect(() => {
    setModalRevealedSensitive(false);
  }, [selectedPostModal]);

  const handleLikePostInModal = async () => {
    if (!selectedPostModal || !user) return;
    const postId = selectedPostModal._id || selectedPostModal.id;
    await toggleLikeOptimistic({
      entityType: "POST",
      entityId: postId,
      currentUser: user,
      currentLikes: selectedPostModal.likes || [],
      apiCall: () => toggleLikePost(postId),
      onStateUpdate: ({ likes, likesCount }) => {
        const updateFn = p => (p._id === postId || p.id === postId) ? { ...p, likes, likesCount } : p;
        setSelectedPostModal(prev => prev && (prev._id === postId || prev.id === postId) ? { ...prev, likes, likesCount } : prev);
        setAllFeedPosts(prev => prev.map(updateFn));
        setProfilePosts(prev => prev.map(updateFn));
      },
      onError: (err) => {
        addToast(err.response?.data?.message || err.message || "Failed to update like", "error");
      }
    });
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
  const [settingsTab, setSettingsTab] = useState(() => localStorage.getItem("ce_settingsTab") || "account");
  useEffect(() => {
    localStorage.setItem("ce_settingsTab", settingsTab);
  }, [settingsTab]);

  // Theme synchronization state
  const { theme: currentThemeMode, resolvedTheme: activeTheme, setTheme: setGlobalTheme } = useTheme();

  const handleThemeChange = (newTheme) => {
    setGlobalTheme(newTheme);
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
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(
    localStorage.getItem("notif_soundEnabled") !== "false"
  );
  const [isSoundTesting, setIsSoundTesting] = useState(false);
  const [sendMessageNotification, setSendMessageNotification] = useState(
    localStorage.getItem("send_message_notification") !== "false"
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

  const handleSoundEnabledChange = (e) => {
    const val = e.target.checked;
    setNotifSoundEnabled(val);
    localStorage.setItem("notif_soundEnabled", val);
    addToast(`Notification sounds ${val ? "enabled" : "disabled"}`, "success");
    if (val) {
      setIsSoundTesting(true);
      notificationAudio.currentTime = 0;
      notificationAudio.onended = () => setIsSoundTesting(false);
      notificationAudio.onerror = () => setIsSoundTesting(false);
      notificationAudio.play().catch(err => {
        console.log("Audio play blocked by browser policy:", err);
        setIsSoundTesting(false);
      });
    }
  };

  const handleTestSound = () => {
    setIsSoundTesting(true);
    notificationAudio.currentTime = 0;
    notificationAudio.onended = () => setIsSoundTesting(false);
    notificationAudio.onerror = () => setIsSoundTesting(false);
    notificationAudio.play().catch(err => {
      console.log("Audio play blocked by browser policy:", err);
      setIsSoundTesting(false);
    });
  };

  const handleSendMessageNotificationChange = (e) => {
    const val = e.target.checked;
    setSendMessageNotification(val);
    localStorage.setItem("send_message_notification", val);
    addToast(`Message sound effects ${val ? "enabled" : "disabled"}`, "success");
    if (val) {
      const audio = new Audio("/send_message_notification.mp3");
      audio.play().catch(() => { });
    }
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
  const activeSection = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/u/")) {
      return "profile";
    }
    const searchParams = new URLSearchParams(location.search);
    let urlTab = searchParams.get("tab");
    if (urlTab) {
      if (urlTab === "feed-action") urlTab = "trust-safety";
      if (urlTab === "live-rooms") urlTab = "liverooms";
      if (urlTab === "myrooms") urlTab = "myrooms";
      return urlTab;
    }
    if (path.startsWith("/dashboard/")) {
      const section = path.substring("/dashboard/".length);
      if (!section) return "dashboard";
      if (section === "live-rooms") return "liverooms";
      if (section === "my-rooms") return "myrooms";
      if (section === "trust-safety" || section === "feed-action") return "trust-safety";
      if (section.startsWith("profile")) return "profile";
      return section;
    }
    return "dashboard";
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (activeSection === "feed") {
      document.documentElement.classList.add("feed-layout-active-body");
      document.body.classList.add("feed-layout-active-body");
    } else {
      document.documentElement.classList.remove("feed-layout-active-body");
      document.body.classList.remove("feed-layout-active-body");
    }
    return () => {
      document.documentElement.classList.remove("feed-layout-active-body");
      document.body.classList.remove("feed-layout-active-body");
    };
  }, [activeSection]);

  const setActiveSection = useCallback((newSection) => {
    let segment = newSection;
    if (newSection === "liverooms") segment = "live-rooms";
    if (newSection === "myrooms") segment = "my-rooms";
    if (newSection === "trust-safety") segment = "trust-safety";

    let path = "/dashboard";
    if (newSection !== "dashboard") {
      path = `/dashboard/${segment}`;
    }

    const params = new URLSearchParams(location.search);
    params.delete("tab");
    if (newSection !== "profile") {
      params.delete("user");
      params.delete("username");
      params.delete("userId");
      params.delete("avatar");
    }

    const searchStr = params.toString();
    navigate(searchStr ? `${path}?${searchStr}` : path, { replace: false });
  }, [location.search, navigate]);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [selectedRoomLikes, setSelectedRoomLikes] = useState([]);
  const [isLoadingRoomLikes, setIsLoadingRoomLikes] = useState(false);

  useEffect(() => {
    if (selectedRoomDetails?.roomId || selectedRoomDetails?._id) {
      const targetId = selectedRoomDetails.roomId || selectedRoomDetails._id;
      const fetchLikes = async () => {
        setIsLoadingRoomLikes(true);
        try {
          const res = await getRoomSocialStats(targetId);
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
  }, [selectedRoomDetails?.roomId, selectedRoomDetails?._id]);

  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [showQuickJoinModal, setShowQuickJoinModal] = useState(false);
  const [recentJoinedCodes, setRecentJoinedCodes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ce_recent_joined_codes") || "[]");
    } catch {
      return [];
    }
  });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [activeDropdownCardId, setActiveDropdownCardId] = useState(null);

  // Search and view state for split lists
  const [continueCodingSearch, setContinueCodingSearch] = useState("");
  const [showAllActiveContinueCoding, setShowAllActiveContinueCoding] = useState(false);
  const [showAllOfflineContinueCoding, setShowAllOfflineContinueCoding] = useState(false);

  const [publicRooms, setPublicRooms] = useState(() => loadFromCache("ce_cache_publicRooms", []));
  const [publicRoomsSearch, setPublicRoomsSearch] = useState("");
  const [showAllPublicRooms, setShowAllPublicRooms] = useState(false);
  const [roomsTab, setRoomsTab] = useState(() => localStorage.getItem("ce_roomsTab") || "public");
  useEffect(() => {
    localStorage.setItem("ce_roomsTab", roomsTab);
  }, [roomsTab]);
  const [activeRoomsTab, setActiveRoomsTab] = useState(() => localStorage.getItem("ce_activeRoomsTab") || "my-active");
  useEffect(() => {
    localStorage.setItem("ce_activeRoomsTab", activeRoomsTab);
  }, [activeRoomsTab]);
  const [myRoomsTabSearch, setMyRoomsTabSearch] = useState("");
  const [roomRequestsTab, setRoomRequestsTab] = useState("myrooms");
  const [roomRequestsSearch, setRoomRequestsSearch] = useState("");
  const [roomRequestsFilter, setRoomRequestsFilter] = useState("all");
  const [manageRequestsRoomId, setManageRequestsRoomId] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [manageRequestSearch, setManageRequestSearch] = useState("");
  const [manageRequestSort, setManageRequestSort] = useState("newest");
  const [manageRequestLimit, setManageRequestLimit] = useState(10);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [followingSearch, setFollowingSearch] = useState("");
  const filteredFollowing = useMemo(() => {
    return (followingList || []).filter(dev => {
      if (!dev) return false;
      const term = (followingSearch || "").toLowerCase();
      const username = (dev.username || "").toLowerCase();
      const bio = (dev.bio || "").toLowerCase();
      return username.includes(term) || bio.includes(term);
    });
  }, [followingList, followingSearch]);
  const [showAllActiveMyRoomsTab, setShowAllActiveMyRoomsTab] = useState(false);
  const [showAllOfflineMyRoomsTab, setShowAllOfflineMyRoomsTab] = useState(false);
  const [achievementFilter, setAchievementFilter] = useState("all");
  const [expandedAchievementId, setExpandedAchievementId] = useState(null);

  const targetUserIdFromUrl = useMemo(() => {
    const path = location.pathname;

    // 1. Try matching /u/:username
    const uMatch = path.match(/^\/u\/([a-zA-Z0-9_-]+)/);
    if (uMatch && uMatch[1]) {
      const target = uMatch[1];
      if (target && target.toLowerCase() !== user?.username?.toLowerCase() && target !== user?._id && target !== user?.id) {
        return target;
      }
    }

    // 2. Try matching /dashboard/profile/:userId
    if (path.startsWith("/dashboard/profile/")) {
      const target = path.substring("/dashboard/profile/".length);
      if (target && target.toLowerCase() !== user?.username?.toLowerCase() && target !== user?._id && target !== user?.id) {
        return target;
      }
    }

    // 3. Fallback to search query parameters
    const params = new URLSearchParams(location.search);
    const target = params.get("user") || params.get("username") || params.get("userId");
    if (target && target.toLowerCase() !== user?.username?.toLowerCase() && target !== user?._id && target !== user?.id) {
      return target;
    }

    return null;
  }, [location.pathname, location.search, user]);

  const isViewingPublicProfile = activeSection === "profile" && !!targetUserIdFromUrl;

  const isPublicProfileLoading = isViewingPublicProfile && (
    !viewingUserProfile ||
    (
      String(viewingUserProfile._id) !== String(targetUserIdFromUrl) &&
      String(viewingUserProfile.username) !== String(targetUserIdFromUrl) &&
      String(viewingUserProfile.id) !== String(targetUserIdFromUrl)
    )
  );

  // Gate Opening Portal Animation State
  const [resumingHistoryRoomId, setResumingHistoryRoomId] = useState(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [kickModalOpen, setKickModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState({ roomId: "", userId: "", username: "" });
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  const [joinTargetRoom, setJoinTargetRoom] = useState(null);

  const confirmKickUser = async () => {
    const { roomId: targetRoomId, userId, username } = kickTarget;
    setKickModalOpen(false);
    if (!targetRoomId || !userId) return;

    // 0ms Optimistic UI update in selectedRoomDetails modal
    setSelectedRoomDetails((prev) => {
      if (!prev || (prev.roomId !== targetRoomId && prev._id !== targetRoomId)) return prev;
      return {
        ...prev,
        participants: (prev.participants || []).filter(
          (p) => String(p.user?._id || p.user?.id || p.user || p._id || p) !== String(userId)
        )
      };
    });

    // 0ms Socket broadcast
    if (socket && socket.connected) {
      socket.emit("kick-user", { roomId: targetRoomId, userId });
    }

    addToast(`🚫 Removed ${username || "user"} from room`, "success");

    try {
      await kickUser(targetRoomId, userId);
      fetchDashboardData();
    } catch (error) {
      addToast(error.response?.data?.message || error.message || "Failed to kick user", "error");
      fetchDashboardData();
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



  // Sync section with query tab or /u/:username handle URL
  useEffect(() => {
    const handleMatch = location.pathname.match(/^\/u\/([a-zA-Z0-9_]+)/);
    if (handleMatch && handleMatch[1]) {
      const routeHandle = handleMatch[1].toLowerCase();
      const isOwnProfile = user && user.username && user.username.toLowerCase() === routeHandle;
      if (isOwnProfile) {
        setViewingUserProfile(null);
        setViewingUserStats(null);
        fetchProfilePosts(user.id || user._id);
      } else if (!viewingUserProfile || viewingUserProfile.username?.toLowerCase() !== routeHandle) {
        handleViewUserProfile(routeHandle);
      }
      return;
    }

    if (location.pathname.startsWith("/dashboard/profile")) {
      let userId = null;
      if (location.pathname.startsWith("/dashboard/profile/")) {
        userId = location.pathname.substring("/dashboard/profile/".length);
      }

      if (userId) {
        const isOwnProfile = user && (String(userId) === String(user.id) || String(userId) === String(user._id) || (user.username && user.username.toLowerCase() === String(userId).toLowerCase()));
        if (isOwnProfile) {
          setViewingUserProfile(null);
          setViewingUserStats(null);
          fetchProfilePosts(user.id || user._id);
          if (user.username) {
            navigate(`/u/${user.username}`, { replace: true });
          }
        } else if (!viewingUserProfile || (String(viewingUserProfile._id) !== String(userId) && String(viewingUserProfile.id) !== String(userId) && viewingUserProfile.username?.toLowerCase() !== String(userId).toLowerCase())) {
          handleViewUserProfile(userId);
        }
      } else {
        setViewingUserProfile(null);
        setViewingUserStats(null);
        if (user) {
          fetchProfilePosts(user.id || user._id);
          if (user.username) {
            navigate(`/u/${user.username}`, { replace: true });
          }
        }
      }
      return;
    }

    // Redirect legacy ?tab= query params to clean URL pathnames
    const searchParams = new URLSearchParams(location.search);
    let tab = searchParams.get("tab");
    if (tab) {
      let sectionSegment = tab;
      if (tab === "feed-action") sectionSegment = "trust-safety";
      if (tab === "liverooms") sectionSegment = "live-rooms";
      if (tab === "myrooms") sectionSegment = "my-rooms";

      const targetPath = sectionSegment === "dashboard" ? "/dashboard" : `/dashboard/${sectionSegment}`;
      searchParams.delete("tab");
      const remainingSearch = searchParams.toString();
      const finalUrl = remainingSearch ? `${targetPath}?${remainingSearch}` : targetPath;

      navigate(finalUrl, { replace: true });
      return;
    }

    // Default: not profile, clear profile states
    setViewingUserProfile(null);
    setViewingUserStats(null);
  }, [location.pathname, location.search, user?.id, user?._id, user?.username]);

  // Load preselected chat partner from URL query param if present on /dashboard/messages
  useEffect(() => {
    if (activeSection === "messages") {
      const searchParams = new URLSearchParams(location.search);
      const chatUserVal = searchParams.get("user") || searchParams.get("userId");
      if (chatUserVal && (!preselectedChatPartner || String(preselectedChatPartner._id || preselectedChatPartner.id) !== String(chatUserVal))) {
        // Fetch public profile to populate the preselected user details
        getUserPublicProfile(chatUserVal)
          .then(res => {
            if (res.success && res.user) {
              setPreselectedChatPartner(res.user);
              // Cleanly remove preselection query parameters from URL to avoid sticky behavior
              const cleanParams = new URLSearchParams(location.search);
              cleanParams.delete("user");
              cleanParams.delete("userId");
              const cleanSearch = cleanParams.toString();
              const newUrl = cleanSearch ? `${location.pathname}?${cleanSearch}` : location.pathname;
              navigate(newUrl, { replace: true });
            }
          })
          .catch(err => console.error("Error preselecting chat partner from URL:", err));
      }
    }
  }, [activeSection, location.search, preselectedChatPartner, navigate, location.pathname]);

  // Admin redirect logic
  useEffect(() => {
    if (user && user.role === "admin" && !localStorage.getItem("ceBypassAdminRedirect")) {
      navigate("/admin");
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    setIsFetchingData(true);
    try {
      const [historyData, recentData, liveData, requestsData, activityData, statsData, publicData, sentRequestsData, plannerDashboardData] = await Promise.all([
        getUserRoomsHistory(),
        getRecentRooms(),
        getLiveRooms(),
        getPendingRequests(),
        getActivityFeed(),
        getActivityStats(),
        getAllPublicRooms(),
        getMySentRequests().catch(() => ({ success: false, requests: [] })),
        getPersonalDashboard().catch(() => ({ success: false, stats: null }))
      ]);

      const history = historyData.rooms || [];
      const recent = recentData.rooms || [];
      const live = liveData.rooms || [];
      const requests = requestsData.requests || [];
      const activityList = activityData.activities || [];
      const dbStats = statsData.stats || { codingHours: 0, executions: 0, heatmap: [] };
      const publicR = publicData.rooms || [];
      const sentRequests = sentRequestsData?.requests || [];
      const plannerStats = plannerDashboardData?.stats || { todayTasks: [], upcomingTasks: [], overdueTasks: [], recentlyCompleted: [] };

      setHistoryRooms(history);
      localStorage.setItem("ce_cache_historyRooms", JSON.stringify(history));
      setRecentRooms(recent);
      localStorage.setItem("ce_cache_recentRooms", JSON.stringify(recent));
      setPlannerTasks(plannerStats);
      localStorage.setItem("ce_cache_plannerTasks", JSON.stringify(plannerStats));
      setLiveRooms(live);
      localStorage.setItem("ce_cache_liveRooms", JSON.stringify(live));

      // Auto-switch active rooms tab based on contents to prevent empty dashboard views
      const myActive = live.filter(room => {
        const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
        const isParticipant = room.participants?.some(p => String(p.user?._id || p.user || p._id || p) === String(user?.id || user?._id));
        return isOwner || isParticipant;
      });
      const otherActive = live.filter(room => {
        const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
        const isParticipant = room.participants?.some(p => String(p.user?._id || p.user || p._id || p) === String(user?.id || user?._id));
        return !(isOwner || isParticipant);
      });
      if (myActive.length === 0 && otherActive.length > 0) {
        setActiveRoomsTab("other-active");
      } else {
        setActiveRoomsTab("my-active");
      }
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
      setIsFetchingData(false);
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
        getNotifications(1, 20).catch(() => ({ success: false, notifications: [], unreadCount: 0 })),
        getUserProfile().catch(() => ({ success: false }))
      ]);

      if (sugRes.success) {
        setSuggestions(sugRes.suggestions || []);
        localStorage.setItem("ce_cache_suggestions", JSON.stringify(sugRes.suggestions || []));
      }
      if (trendRes.success) {
        setTrendingRooms(prev => {
          const newRooms = trendRes.rooms || [];
          const updated = newRooms.map(n => {
            const existing = prev.find(p => p.roomId === n.roomId || p._id === n._id);
            return existing ? { ...existing, ...n } : n;
          });
          localStorage.setItem("ce_cache_trendingRooms", JSON.stringify(updated));
          return updated;
        });
      }
      if (followRes.success) {
        const following = followRes.following || [];
        setFollowingList(following);
        localStorage.setItem("ce_cache_followingList", JSON.stringify(following));
        const online = following.filter(f => f && (f.isOnline === "true" || f.isOnline === true || f.isOnline === "online" || f.online === true || f.status === "online"));
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
      const notifRes = await getNotifications(nextPage, 20);
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
        const next = prev.map(s => {
          if (String(s._id || s.id || s) === String(candidateId)) {
            return { ...s, isFollowing: true };
          }
          return s;
        });
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

  const handleDeleteProfilePost = (postId) => {
    setPostToDeleteFromProfile(postId);
  };

  const confirmDeleteProfilePost = async () => {
    if (!postToDeleteFromProfile) return;
    setIsDeletingProfilePost(true);
    try {
      const res = await deletePost(postToDeleteFromProfile);
      if (res.success) {
        addToast(res.message || "Post deleted successfully.", "success");
        setProfilePosts(prev => prev.filter(p => p._id !== postToDeleteFromProfile && p.id !== postToDeleteFromProfile));
        setAllFeedPosts(prev => prev.filter(p => p._id !== postToDeleteFromProfile && p.id !== postToDeleteFromProfile));
      } else {
        addToast(res.message || "Failed to delete post.", "error");
      }
    } catch (err) {
      console.error("Delete post error:", err);
      addToast(err.response?.data?.message || "Failed to delete post", "error");
    } finally {
      setIsDeletingProfilePost(false);
      setPostToDeleteFromProfile(null);
    }
  };

  const handleLikeRoom = async (roomId) => {
    if (!user) return;

    setAnimatingLikes(prev => ({ ...prev, [roomId]: true }));
    setTimeout(() => {
      setAnimatingLikes(prev => ({ ...prev, [roomId]: false }));
    }, 600);

    const currentRoom = historyRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      trendingRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      publicRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      liveRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      recentRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      savedRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
      likedRooms.find(r => r && (r.roomId === roomId || r._id === roomId));

    const currentLikes = currentRoom ? (currentRoom.likes || currentRoom.likedBy || []) : [];

    await toggleLikeOptimistic({
      entityType: "ROOM",
      entityId: roomId,
      currentUser: user,
      currentLikes,
      apiCall: () => toggleLikeRoom(roomId),
      onStateUpdate: ({ likes, likesCount }) => {
        const updateRoomFn = r => {
          if (r && (r.roomId === roomId || r._id === roomId)) {
            return {
              ...r,
              likes,
              likesCount,
              likedBy: likes
            };
          }
          return r;
        };

        setTrendingRooms(prev => prev.map(updateRoomFn));
        setHistoryRooms(prev => prev.map(updateRoomFn));
        setPublicRooms(prev => prev.map(updateRoomFn));
        setLiveRooms(prev => prev.map(updateRoomFn));
        setRecentRooms(prev => prev.map(updateRoomFn));
        setViewingUserRooms(prev => prev.map(updateRoomFn));
        setSavedRooms(prev => prev.map(updateRoomFn));
        setLikedRooms(prev => {
          const isUserLiked = isEntityLiked(likes, user);
          if (isUserLiked) {
            const exists = prev.some(r => r && (r.roomId === roomId || r._id === roomId));
            if (!exists && currentRoom) {
              return [...prev, { ...currentRoom, likes, likesCount, likedBy: likes }];
            }
            return prev.map(updateRoomFn);
          } else {
            return prev.filter(r => r && r.roomId !== roomId && r._id !== roomId);
          }
        });
      },
      onError: (err) => {
        addToast(err.response?.data?.message || err.message || "Failed to update like status", "error");
      }
    });
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

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported by your browser", "error");
      return;
    }
    addToast("Locating your device...", "info");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb;
          const state = data.address?.state;
          let formatted = "";
          if (city && state) {
            formatted = `${city}, ${state}`;
          } else {
            const nearest = findNearestCity(latitude, longitude);
            formatted = nearest ? `${nearest.name}, India` : "Bengaluru, India";
          }
          setLocationInput(formatted);
          addToast(`Located: ${formatted}`, "success");
        } catch (err) {
          const nearest = findNearestCity(position.coords.latitude, position.coords.longitude);
          const formatted = nearest ? `${nearest.name}, India` : "Bengaluru, India";
          setLocationInput(formatted);
          addToast(`Located (nearest hub): ${formatted}`, "success");
        }
      },
      (error) => {
        addToast("Permission denied or failed to locate: " + error.message, "error");
      }
    );
  };

  const startEditingProfile = () => {
    setBioInput(user?.bio || "");
    setLangsInput((user?.programmingLanguages || []).join(", "));
    setLocationInput(user?.location || "");
    setTitleInput(user?.title || "");
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile({
        bio: bioInput,
        programmingLanguages: langsInput,
        location: locationInput,
        title: titleInput
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
    if (user && (String(targetUserId) === String(user.id) || String(targetUserId) === String(user._id) || String(targetUserId).toLowerCase() === user.username?.toLowerCase())) {
      setViewingUserProfile(null);
      setViewingUserRooms([]);
      setViewingUserLikedRooms([]);
      setViewingUserStats(null);
      setProfileTab("rooms");
      fetchProfilePosts(user.id || user._id);
      if (user?.username) {
        navigate(`/u/${user.username}`);
      } else {
        navigate("/dashboard/profile");
      }
      return;
    }

    // Clear previous profile to avoid flashing old data
    setViewingUserProfile(null);
    setViewingUserRooms([]);
    setViewingUserLikedRooms([]);
    setViewingUserStats(null);

    // Always transition to profile section tab
    setProfileTab("rooms");

    // Update URL to point to this target user's public profile
    let expectedPath = `/dashboard/profile/${targetUserId}`;
    if (location.pathname.startsWith("/u/")) {
      expectedPath = location.pathname;
    }
    if (location.pathname !== expectedPath) {
      navigate(expectedPath);
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

        // Auto-sync/redirect to vanity u/:username URL
        if (res.user.username) {
          const expectedVanityPath = `/u/${res.user.username}`;
          if (location.pathname !== expectedVanityPath) {
            navigate(expectedVanityPath, { replace: true });
          }
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      setActiveSection("dashboard");
      navigate("/dashboard");
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Global Profile Navigation Handler with self-click scroll & refresh support
  useEffect(() => {
    window.handleGlobalProfileNav = (targetUserId, targetUsername) => {
      // 1. If own profile
      const isOwnProfile = user && (String(targetUserId) === String(user.id) || String(targetUserId) === String(user._id) || (targetUsername && targetUsername.toLowerCase() === user.username?.toLowerCase()));
      if (isOwnProfile) {
        const isCurrentOwnPath = location.pathname === "/dashboard/profile" || (user?.username && location.pathname.toLowerCase() === `/u/${user.username.toLowerCase()}`);
        if (isCurrentOwnPath) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          const scrollEl = document.querySelector(".ce-dashboard-main-content") || document.querySelector(".ce-dashboard-container");
          if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "smooth" });
          fetchProfilePosts(user.id || user._id);
          fetchDashboardData();
          return;
        }
        navigate("/dashboard/profile");
        return;
      }

      // 2. If already viewing this public profile
      const isAlreadyViewing = viewingUserProfile && (String(targetUserId) === String(viewingUserProfile._id) || String(targetUserId) === String(viewingUserProfile.id) || (targetUsername && targetUsername.toLowerCase() === viewingUserProfile.username?.toLowerCase()));
      if (isAlreadyViewing) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const scrollEl = document.querySelector(".ce-dashboard-main-content") || document.querySelector(".ce-dashboard-container");
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "smooth" });
        handleViewUserProfile(targetUserId);
        return;
      }

      // 3. Otherwise navigate to profile
      if (targetUsername) {
        navigate(`/u/${targetUsername}`);
      } else {
        navigate(`/dashboard/profile/${targetUserId}`);
      }
    };

    return () => {
      delete window.handleGlobalProfileNav;
    };
  }, [user, location.pathname, viewingUserProfile, navigate, fetchProfilePosts, fetchDashboardData, handleViewUserProfile]);

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
    const prevCount = unreadNotificationsCount;
    const prevList = notificationsList;

    // Optimistic Update
    setUnreadNotificationsCount(0);
    setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));

    try {
      const res = await markNotificationsRead();
      if (!res.success) {
        // Rollback on failure
        setUnreadNotificationsCount(prevCount);
        setNotificationsList(prevList);
        window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
        addToast?.("Failed to mark notifications as read on server.", "error");
      }
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
      // Rollback on connection error
      setUnreadNotificationsCount(prevCount);
      setNotificationsList(prevList);
      window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
      addToast?.("Connection error. Could not sync read status.", "error");
    }
  };

  const handleMarkOneNotificationRead = async (notifId) => {
    const prevCount = unreadNotificationsCount;
    const prevList = notificationsList;

    // Optimistic Update
    setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true } : n));
    window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));

    try {
      const res = await markNotificationsRead(notifId);
      if (!res.success) {
        // Rollback
        setUnreadNotificationsCount(prevCount);
        setNotificationsList(prevList);
        window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
      // Rollback
      setUnreadNotificationsCount(prevCount);
      setNotificationsList(prevList);
      window.dispatchEvent(new CustomEvent("ce-unread-notifications-update"));
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
      setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true, isUsed: true } : n));
      navigate(`/editor/${targetRoomId}`);
    } catch (err) {
      console.error("Failed to accept workspace invite:", err);
    }
  };

  const handleIgnoreInvite = async (notifId) => {
    try {
      await markNotificationsRead(notifId);
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      setNotificationsList(prev => prev.map(n => n._id === notifId ? { ...n, isRead: true, isUsed: true } : n));
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
    }
  }, [user?.id, user?._id, fetchTrustStatus]);

  useEffect(() => {
    const handlePostCreated = (newPost) => {
      setAllFeedPosts(prev => {
        if (prev.some(p => p._id === newPost._id || p.id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostDeleted = ({ postId }) => {
      setAllFeedPosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
      setProfilePosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
      setSelectedPostModal(prev => {
        if (prev && (prev._id === postId || prev.id === postId)) {
          return null;
        }
        return prev;
      });
    };

    const handlePostLiked = ({ postId, likes }) => {
      const updateFn = p => {
        if (p._id === postId || p.id === postId) {
          return { ...p, likes };
        }
        return p;
      };
      setAllFeedPosts(prev => prev.map(updateFn));
      setProfilePosts(prev => prev.map(updateFn));
      setSelectedPostModal(prev => {
        if (prev && (prev._id === postId || prev.id === postId)) {
          return { ...prev, likes };
        }
        return prev;
      });
    };

    const handlePostCommented = ({ postId, comments }) => {
      const updateFn = p => {
        if (p._id === postId || p.id === postId) {
          return { ...p, comments };
        }
        return p;
      };
      setAllFeedPosts(prev => prev.map(updateFn));
      setProfilePosts(prev => prev.map(updateFn));
      setSelectedPostModal(prev => {
        if (prev && (prev._id === postId || prev.id === postId)) {
          return { ...prev, comments };
        }
        return prev;
      });
    };

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

    socket.on("post:created", handlePostCreated);
    socket.on("post:deleted", handlePostDeleted);
    socket.on("post:liked", handlePostLiked);
    socket.on("post:commented", handlePostCommented);
    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("admin-user-action", handleAdminUserAction);

    return () => {
      socket.off("post:created", handlePostCreated);
      socket.off("post:deleted", handlePostDeleted);
      socket.off("post:liked", handlePostLiked);
      socket.off("post:commented", handlePostCommented);
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("admin-user-action", handleAdminUserAction);
    };
  }, [user, addToast, fetchTrustStatus]);

  useEffect(() => {
    const unsubRoom = subscribeToLikes("ROOM", (data) => {
      const roomId = data.entityId;
      const roomDbId = data.roomDbId;
      const updateRoomFn = r => {
        if (r && (r.roomId === roomId || r._id === roomId || (roomDbId && String(r._id) === roomDbId))) {
          return {
            ...r,
            likes: data.likes,
            likesCount: data.likesCount !== undefined ? data.likesCount : (data.likes ? data.likes.length : r.likesCount),
            likedBy: data.likes || r.likedBy
          };
        }
        return r;
      };

      setTrendingRooms(prev => prev.map(updateRoomFn));
      setHistoryRooms(prev => prev.map(updateRoomFn));
      setPublicRooms(prev => prev.map(updateRoomFn));
      setLiveRooms(prev => prev.map(updateRoomFn));
      setRecentRooms(prev => prev.map(updateRoomFn));
      setViewingUserRooms(prev => prev.map(updateRoomFn));
      setSavedRooms(prev => prev.map(updateRoomFn));
      setLikedRooms(prev => {
        const isUserLiked = isEntityLiked(data.likes, user);
        if (isUserLiked) {
          const exists = prev.some(r => r && (r.roomId === roomId || r._id === roomId || (roomDbId && String(r._id) === roomDbId)));
          if (!exists) {
            const matched = liveRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
              trendingRooms.find(r => r && (r.roomId === roomId || r._id === roomId));
            if (matched) return [...prev, { ...matched, likes: data.likes, likesCount: data.likesCount, likedBy: data.likes }];
          }
          return prev.map(updateRoomFn);
        } else {
          return prev.filter(r => r && r.roomId !== roomId && r._id !== roomId && (!roomDbId || String(r._id) !== roomDbId));
        }
      });

      setSelectedRoomDetails(prevDetails => {
        if (prevDetails && (prevDetails.roomId === roomId || prevDetails._id === roomId || (roomDbId && String(prevDetails._id) === roomDbId))) {
          setSelectedRoomLikes(data.likes || []);
        }
        return prevDetails;
      });
    });

    const unsubPost = subscribeToLikes("POST", (data) => {
      const postId = data.entityId;
      const updatePostFn = p => (p._id === postId || p.id === postId) ? { ...p, likes: data.likes, likesCount: data.likesCount } : p;
      setAllFeedPosts(prev => prev.map(updatePostFn));
      setProfilePosts(prev => prev.map(updatePostFn));
      setSelectedPostModal(prev => (prev && (prev._id === postId || prev.id === postId)) ? { ...prev, likes: data.likes, likesCount: data.likesCount } : prev);
    });

    return () => {
      unsubRoom();
      unsubPost();
    };
  }, [user]);

  useEffect(() => {
    if (activeAds.length > 0 && !hasShownPopup) {
      const popupAd = activeAds.find(ad => ad.format === "POPUP");
      if (popupAd) {
        const userKey = user?.id || user?._id || "guest";
        const isDismissed = localStorage.getItem(`ce_dismissed_ad_${userKey}_${popupAd._id}`);
        if (!isDismissed) {
          setCurrentPopupAd(popupAd);
          setHasShownPopup(true);
        }
      }
    }
  }, [activeAds, hasShownPopup, user]);

  const handleClosePopupAd = () => {
    if (currentPopupAd) {
      const userKey = user?.id || user?._id || "guest";
      localStorage.setItem(`ce_dismissed_ad_${userKey}_${currentPopupAd._id}`, "true");
    }
    setCurrentPopupAd(null);
  };

  const handlePopupAdClick = () => {
    if (currentPopupAd) {
      const userKey = user?.id || user?._id || "guest";
      localStorage.setItem(`ce_dismissed_ad_${userKey}_${currentPopupAd._id}`, "true");
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
      setTitleInput(user.title || "");
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
    if (activeSection === "leaderboard" || activeSection === "dashboard") {
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
      if (!data) return;

      const newReq = {
        requestId: data.requestId || (Date.now() + Math.random()),
        roomId: data.roomId,
        roomTitle: data.roomTitle || data.title || "Workspace Room",
        user: {
          _id: data.userId,
          username: data.username,
          avatar: data.avatar
        },
        createdAt: data.createdAt || new Date()
      };

      setJoinRequests((prev) => {
        const filtered = (prev || []).filter(r => !(r.roomId === data.roomId && (r.user?._id || r.user) === data.userId));
        const updated = [newReq, ...filtered];
        localStorage.setItem("ce_cache_joinRequests", JSON.stringify(updated));
        return updated;
      });

      addToast(`🔔 ${data.username || "Developer"} requested to join "${data.roomTitle || "Workspace"}"`, "info");
    };

    const handleRealtimeNotification = (notif) => {
      playNotificationSound();
      setNotificationsList(prev => [notif, ...prev]);
      setUnreadNotificationsCount(prev => prev + 1);

      let actionText = "";
      if (notif.type === "FOLLOW") actionText = "followed you";
      else if (notif.type === "LIKE") {
        if (notif.targetPost) {
          actionText = `liked your post "${getPostSnippet(notif.targetPost)}"`;
        } else {
          actionText = `liked your room "${notif.targetRoom?.title || "workspace"}"`;
        }
      }
      else if (notif.type === "BOOKMARK") actionText = `bookmarked your room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN") actionText = `wants to join "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "COMMENT") actionText = `commented on your post "${getPostSnippet(notif.targetPost)}"`;
      else if (notif.type === "INVITE") actionText = `invited you to join workspace "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN_APPROVED") actionText = `approved your join request to "${notif.targetRoom?.title || "workspace"}"`;
      else actionText = "sent you a notification";

      const msg = `${notif.sender?.username || "Someone"} ${actionText}`;
      addToast(msg, "info");
    };

    const handleJoinApproved = (data) => {
      if (data && String(data.userId) === String(user?.id || user?._id)) {
        addToast("Your join request has been approved! You can now join this workspace whenever you want.", "success");
        fetchDashboardData();
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

    const handleUserPresenceChange = ({ userId, isOnline }) => {
      setFollowingList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(userId)) {
            return { ...f, isOnline: isOnline ? "true" : "false" };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
        return next;
      });

      setOnlineFollows(prev => {
        if (isOnline) {
          if (prev.some(f => String(f._id || f) === String(userId))) return prev;
          let follows = [];
          try {
            const cached = localStorage.getItem("ce_cache_followingList");
            if (cached) follows = JSON.parse(cached) || [];
          } catch (e) { }
          if (follows.length === 0) follows = followingList;

          const userObj = follows.find(f => String(f._id || f) === String(userId));
          if (userObj) {
            const next = [...prev, { ...userObj, isOnline: "true" }];
            localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
            return next;
          }
          return prev;
        } else {
          const next = prev.filter(f => String(f._id || f) !== String(userId));
          localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
          return next;
        }
      });
    };

    const handleUserCustomStatusChange = ({ userId, status }) => {
      setFollowingList(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(userId)) {
            return { ...f, status };
          }
          return f;
        });
        localStorage.setItem("ce_cache_followingList", JSON.stringify(next));
        return next;
      });

      setOnlineFollows(prev => {
        const next = prev.map(f => {
          if (String(f._id || f) === String(userId)) {
            return { ...f, status };
          }
          return f;
        });
        localStorage.setItem("ce_cache_onlineFollows", JSON.stringify(next));
        return next;
      });
    };

    let debounceTimer = null;
    const handleLiveRoomsUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        getLiveRooms().then(res => {
          if (res.success) {
            setLiveRooms(res.rooms || []);
            localStorage.setItem("ce_cache_liveRooms", JSON.stringify(res.rooms || []));
          }
        }).catch(err => console.error("Error updating live rooms:", err));
      }, 400);
    };

    socket.on("live-rooms-update", handleLiveRoomsUpdate);
    socket.on("room:bookmark-update", handleRoomBookmarkUpdate);
    socket.on("user:follow-update", handleUserFollowUpdate);
    socket.on("user:followers-update", handleUserFollowersUpdate);
    socket.on("follow-success", handleFollowSuccess);
    socket.on("new-follower", handleNewFollower);
    socket.on("follow-count-updated", handleFollowCountUpdated);
    socket.on("suggestion-refresh", handleSuggestionRefresh);
    socket.on("user:status", handleUserPresenceChange);
    socket.on("user:status-update", handleUserCustomStatusChange);

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
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off("live-rooms-update", handleLiveRoomsUpdate);
      socket.off("room:bookmark-update", handleRoomBookmarkUpdate);
      socket.off("user:follow-update", handleUserFollowUpdate);
      socket.off("user:followers-update", handleUserFollowersUpdate);
      socket.off("follow-success", handleFollowSuccess);
      socket.off("new-follower", handleNewFollower);
      socket.off("follow-count-updated", handleFollowCountUpdated);
      socket.off("suggestion-refresh", handleSuggestionRefresh);
      socket.off("user:status", handleUserPresenceChange);
      socket.off("user:status-update", handleUserCustomStatusChange);

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

  const saveJoinedCodeToHistory = (code) => {
    if (!code) return;
    try {
      let list = JSON.parse(localStorage.getItem("ce_recent_joined_codes") || "[]");
      list = list.filter(c => c !== code);
      list.unshift(code);
      list = list.slice(0, 10);
      localStorage.setItem("ce_recent_joined_codes", JSON.stringify(list));
      setRecentJoinedCodes(list);
    } catch (e) {
      console.error(e);
    }
  };

  const proceedJoinRoom = async (targetRoomId) => {
    if (!targetRoomId) return;
    const id = typeof targetRoomId === "object" ? targetRoomId.roomId : targetRoomId;
    saveJoinedCodeToHistory(id);

    try {
      const data = await joinRoom(id);
      if (data.requiresApproval) {
        socket.emit("join-request", {
          roomId: id,
          userId: user?.id || user?._id,
          username: user?.username,
        });
        playNotificationSound();
        addToast("Join request sent to room owner for approval", "success");
        fetchDashboardData();
        return;
      }
      triggerGateAndNavigate(id);
    } catch (error) {
      addToast(error.response?.data?.message || error.message, "error");
    }
  };

  const handleJoinRoomDirect = (targetRoomId) => {
    if (!targetRoomId) return;
    const id = typeof targetRoomId === "object" ? targetRoomId.roomId : targetRoomId;
    const title = typeof targetRoomId === "object" ? (targetRoomId.title || targetRoomId.name || "Workspace Room") : "Workspace Room";

    saveJoinedCodeToHistory(id);

    const room = (liveRooms && liveRooms.find(r => r && (r.roomId === id || r._id === id))) ||
      (historyRooms && historyRooms.find(r => r && (r.roomId === id || r._id === id))) ||
      (publicRooms && publicRooms.find(r => r && (r.roomId === id || r._id === id))) ||
      (recentRooms && recentRooms.find(r => r && (r.roomId === id || r._id === id))) ||
      (typeof targetRoomId === "object" ? targetRoomId : { roomId: id, title });

    setJoinTargetRoom(room);
    setShowJoinConfirmModal(true);
  };
  const handleRespondRequest = async (roomId, requesterId, action) => {
    // 1. Optimistic UI update: immediately remove from state and cache
    setJoinRequests(prev => {
      const updated = prev.filter(req => !(req.roomId === roomId && (req.user?._id || req.user) === requesterId));
      localStorage.setItem("ce_cache_joinRequests", JSON.stringify(updated));
      return updated;
    });

    addToast(action === "accept" ? "Accepting request..." : "Rejecting request...", "info");

    try {
      if (action === "accept") {
        socket.emit("approve-request", { roomId, userId: requesterId });
        playNotificationSound();
      } else {
        socket.emit("reject-request", { roomId, userId: requesterId });
      }

      respondToJoinRequest(roomId, requesterId, action)
        .then(() => {
          addToast(`Request ${action}ed successfully`, "success");
          fetchDashboardData();
        })
        .catch(error => {
          console.error("Error responding to join request:", error);
          addToast(error.response?.data?.message || error.message, "error");
          fetchDashboardData(); // Restore correct state on failure
        });
    } catch (error) {
      addToast(error.message, "error");
      fetchDashboardData();
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

  const isRoomOwner = (room) => {
    if (!user || !room) return false;
    const creatorId = String(room.createdBy?._id || room.createdBy?.id || room.createdBy || "");
    const currentUserId = String(user._id || user.id || "");
    const creatorName = (room.createdBy?.username || "").toLowerCase();
    const currentUserName = (user.username || "").toLowerCase();
    return (creatorId && currentUserId && creatorId === currentUserId) || (creatorName && currentUserName && creatorName === currentUserName);
  };

  const handleDeleteRoomClick = (targetRoomId, targetRoomTitle = "Workspace") => {
    setSecurityDeleteRoomTarget({ id: targetRoomId, title: targetRoomTitle });
  };

  const executeSecurityRoomDelete = async () => {
    if (!securityDeleteRoomTarget) return;
    setIsDeletingRoomTarget(true);
    try {
      socket.emit("room-deleted", { roomId: securityDeleteRoomTarget.id });
      await deleteRoom(securityDeleteRoomTarget.id);
      addToast("Workspace permanently deleted", "success");
      setSecurityDeleteRoomTarget(null);
      fetchDashboardData();
    } catch (error) {
      addToast(error.response?.data?.message || error.message, "error");
    } finally {
      setIsDeletingRoomTarget(false);
    }
  };

  const handleDeleteRoom = (targetRoomId, targetRoomTitle = "Workspace") => {
    handleDeleteRoomClick(targetRoomId, targetRoomTitle);
  };

  useEffect(() => {
    const handleRoomUpdated = (data) => {
      if (!data || !data.roomId) return;
      const updateRoomFn = (r) => {
        if (r && (r.roomId === data.roomId || r._id === data.roomId)) {
          return {
            ...r,
            title: data.title,
            isPrivate: data.isPrivate
          };
        }
        return r;
      };

      setHistoryRooms((prev) => prev.map(updateRoomFn));
      setSavedRooms((prev) => prev.map(updateRoomFn));
      setLikedRooms((prev) => prev.map(updateRoomFn));

      setPublicRooms((prev) => {
        if (data.isPrivate) {
          return prev.filter((r) => r.roomId !== data.roomId && r._id !== data.roomId);
        } else {
          const exists = prev.some((r) => r.roomId === data.roomId || r._id === data.roomId);
          if (exists) {
            return prev.map(updateRoomFn);
          }
          return prev;
        }
      });
    };

    socket.on("room:updated", handleRoomUpdated);
    return () => {
      socket.off("room:updated", handleRoomUpdated);
    };
  }, []);

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
      const matchesSearch = (room.title || "").toLowerCase().includes((historySearch || "").toLowerCase()) || (room.roomId || "").includes(historySearch);
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


  const renderRoomCard = (room) => {
    const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
    const ownerName = isOwner ? "You" : (room.createdBy?.displayName || room.createdBy?.username || "Developer");
    const activeCount = room.activeUsersCount || 0;
    const isBookmarked = savedRooms.some(r => r && (r.roomId === room.roomId || r._id === room._id || r._id === room.roomId));

    // Get all joined members (owner + participants)
    const allMembers = [];
    const memberIds = new Set();

    if (room.createdBy) {
      const ownerId = room.createdBy._id || room.createdBy;
      allMembers.push({
        _id: String(ownerId),
        displayName: room.createdBy.displayName || room.createdBy.username || "Owner",
        username: room.createdBy.username || "owner",
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
          const displayName = userObj ? (userObj.displayName || userObj.username) : (p.displayName || p.username || "Collaborator");
          const username = userObj ? userObj.username : (p.username || "collaborator");
          const avatar = userObj ? userObj.avatar : p.avatar;
          const role = p.role || "MEMBER";
          allMembers.push({
            _id: String(pId),
            displayName: displayName,
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
                      zIndex: 3 - idx,
                      cursor: "pointer"
                    }}
                    title={`${m.username} (${m.isOnline ? 'Online' : 'Offline'})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.handleGlobalProfileNav) {
                        window.handleGlobalProfileNav(m._id || m.id, m.username);
                      } else {
                        handleViewUserProfile(m._id || m.id);
                      }
                    }}
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
                    <div
                      key={idx}
                      className="drawer-member-pill online"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.handleGlobalProfileNav) {
                          window.handleGlobalProfileNav(m._id || m.id, m.username);
                        } else {
                          handleViewUserProfile(m._id || m.id);
                        }
                      }}
                    >
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
                    <div
                      key={idx}
                      className="drawer-member-pill offline"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.handleGlobalProfileNav) {
                          window.handleGlobalProfileNav(m._id || m.id, m.username);
                        } else {
                          handleViewUserProfile(m._id || m.id);
                        }
                      }}
                    >
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
                    <div
                      key={idx}
                      className="drawer-member-pill owner"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.handleGlobalProfileNav) {
                          window.handleGlobalProfileNav(m._id || m.id, m.username);
                        } else {
                          handleViewUserProfile(m._id || m.id);
                        }
                      }}
                    >
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
              <div
                className="room-card-owner-profile"
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (room.createdBy) {
                    const oId = room.createdBy._id || room.createdBy;
                    if (window.handleGlobalProfileNav) {
                      window.handleGlobalProfileNav(oId, room.createdBy.username);
                    } else {
                      handleViewUserProfile(oId);
                    }
                  }
                }}
              >
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
      else if (notif.type === "LIKE") {
        if (notif.targetPost) {
          actionText = `liked your post "${getPostSnippet(notif.targetPost)}"`;
        } else {
          actionText = `liked room "${notif.targetRoom?.title || "workspace"}"`;
        }
      }
      else if (notif.type === "BOOKMARK") actionText = `bookmarked room "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN") actionText = `wants to join "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "INVITE") actionText = `invited you to join workspace "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "JOIN_APPROVED") actionText = `approved your join request to "${notif.targetRoom?.title || "workspace"}"`;
      else if (notif.type === "COMMENT") actionText = `commented on your post "${getPostSnippet(notif.targetPost)}"`;
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
      <div className="maintenance-lockout-overlay">
        <div className="maintenance-lockout-card glass-panel">
          <div className="lockout-pulse-icon">
            <Lock size={28} />
          </div>
          <h2 className="maintenance-lockout-title">System Under Maintenance</h2>
          <p className="maintenance-lockout-desc">
            CodeExpo is currently undergoing scheduled platform diagnostics and service optimization.
          </p>
          <div className="maintenance-lockout-footer">
            Please check back in a few minutes. We apologize for the inconvenience.
          </div>
        </div>
      </div>
    );
  }



  return (
    <MainLayout
      activeTab={activeSection}
      notifications={dashboardNotifications}
      clearNotifications={handleMarkAllNotificationsRead}
      onSearchSelect={handleSearchSelect}
      joinRequests={joinRequests}
    >
      <div className={`ce-dashboard-container ${activeSection === "feed" ? "feed-layout-active" : ""} ${activeSection === "messages" ? "messages-layout-active" : ""}`}>
        <AnimatePresence mode="wait">
          {activeSection === "cp" && (
            <motion.div
              key="cp"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <CPDashboard user={user} />
            </motion.div>
          )}

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

                      {/* Card 5: MyVerse Points */}
                      <div className="compact-stat-card myverse-points-card">
                        <div className="stat-card-icon-wrapper amber-theme-wrapper">
                          <Flame size={18} />
                        </div>
                        <div className="stat-card-info">
                          <span className="stat-card-label">MyVerse Points</span>
                          <span className="stat-card-val" style={{ color: "#f59e0b" }}>
                            {(stats.totalPoints || 0).toLocaleString()} <span style={{ fontSize: "0.72rem", fontWeight: "600" }}>XP</span>
                          </span>
                          <span className="stat-card-subtitle">{rank.title} Rank</span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TWO COLUMN GRID */}
                  <div className="ce-dashboard-columns">

                    {/* LEFT COLUMN */}
                    <div className="ce-column-left">

                      {/* QUICK ACTIONS */}
                      <div className="quick-actions-cards-container">

                        {/* Create Room Card */}
                        <div
                          className="quick-action-card create-room-card"
                          onClick={() => setShowQuickCreateModal(true)}
                        >
                          <div className="quick-action-icon-wrapper purple-bg">
                            <Plus size={18} className="quick-action-icon" />
                          </div>
                          <div className="quick-action-details">
                            <h4 className="quick-action-title">Create Room</h4>
                            <p className="quick-action-description">Start a new coding session</p>
                            <p className="quick-action-sub-description">Choose language, privacy and more</p>
                          </div>
                          <ChevronRight size={16} className="quick-action-arrow" />
                        </div>

                        {/* Join Room Card */}
                        <div
                          className="quick-action-card join-room-card"
                          onClick={() => setShowQuickJoinModal(true)}
                        >
                          <div className="quick-action-icon-wrapper blue-bg">
                            <LogIn size={18} className="quick-action-icon" />
                          </div>
                          <div className="quick-action-details">
                            <h4 className="quick-action-title">Join Room</h4>
                            <p className="quick-action-description">Join with room ID or invite link</p>
                            <p className="quick-action-sub-description">Quickly enter an active room</p>
                          </div>
                          <ChevronRight size={16} className="quick-action-arrow" />
                        </div>

                      </div>

                      {/* SPLIT FEED AND RECENT JOINED ROOMS GRID */}
                      <div className="ce-dashboard-split-grid">

                        {/* COLUMN 1: ACTIVE ROOMS */}
                        <section className="ce-dashboard-section active-rooms-section" style={{ marginBottom: 0 }}>
                          <div className="section-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Radio size={16} className="brand-logo ce-pulse-active" style={{ color: "var(--ce-primary)" }} />
                              <h3 className="section-title">Active Rooms</h3>
                            </div>
                          </div>

                          {isLoadingDashboard && liveRooms.length === 0 ? (
                            <ActivityFeedSkeleton count={3} />
                          ) : (() => {
                            const activeLive = liveRooms || [];

                            if (activeLive.length === 0) {
                              return (
                                <div className="empty-state-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                  <Radio size={18} className="empty-state-icon" style={{ color: "var(--ce-text-muted)" }} />
                                  <p>No active rooms right now. Host a room to start a live session!</p>
                                </div>
                              );
                            }

                            return (
                              <div className="recent-joined-list">
                                {activeLive.map(room => {
                                  const activeCount = room.activeUsersCount || 0;
                                  const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
                                  const maxParticipants = Math.max(room.participants?.length || 6, activeCount <= 1 ? 6 : activeCount + (activeCount % 3 === 0 ? 3 : 2));
                                  const isFull = activeCount >= maxParticipants;

                                  return (
                                    <div
                                      key={room._id}
                                      className="recent-joined-card"
                                      onMouseEnter={prefetchEditor}
                                    >
                                      <div className="joined-card-top-content">
                                        <div className="joined-card-logo-area">
                                          {renderLanguageLogo(room.language, room.title)}
                                        </div>
                                        <div className="joined-card-info-area">
                                          <h4 className="joined-room-title" title={room.title}>{room.title}</h4>
                                          <span className="joined-room-owner">
                                            @{room.createdBy?.username || "developer"}
                                          </span>
                                        </div>
                                        <div className="joined-card-top-right-meta">
                                          <span className={`room-visibility-badge-flat ${room.isPrivate ? "private" : "public"}`}>
                                            {room.isPrivate ? "Private" : "Public"}
                                          </span>
                                          <span className="joined-status-online-text">
                                            {activeCount} / {maxParticipants} Active
                                          </span>
                                        </div>
                                      </div>

                                      <hr className="joined-card-divider" />

                                      <div className="joined-card-footer-layout">
                                        <button
                                          className="joined-detail-btn-new"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRoomDetails(room);
                                          }}
                                        >
                                          Details
                                        </button>
                                        <div className="joined-card-actions" onClick={(e) => e.stopPropagation()}>
                                          {isOwner ? (
                                            <button
                                              className="joined-action-btn-flat resume"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Resume
                                            </button>
                                          ) : isFull ? (
                                            <button
                                              className="joined-action-btn-flat watch"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Watch
                                            </button>
                                          ) : (
                                            <button
                                              className="joined-action-btn-flat join"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Join
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            className="ce-column-scroll-down-btn"
                            onClick={() => {
                              const listEl = document.querySelector('.active-rooms-section .recent-joined-list');
                              if (listEl) {
                                listEl.scrollBy({ top: 180, behavior: 'smooth' });
                              }
                            }}
                            title="Scroll Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </section>

                        {/* COLUMN 2: DEVELOPER ACTIVITY */}
                        <section className="ce-dashboard-section social-feed-section" style={{ marginBottom: 0 }}>
                          <div className="section-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Activity size={16} className="brand-logo" />
                              <h3 className="section-title">Developer Activity</h3>
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
                              {feedActivities.map(act => {
                                const sanitizedAction = (() => {
                                  if (!act.action) return "";
                                  let clean = String(act.action).split("\n")[0].trim();
                                  clean = clean.replace(/created file "([^"]+)"/gi, (match, fileName) => {
                                    let fn = fileName.trim();
                                    if (fn.includes("//") || fn.includes("Welcome") || fn.includes("include") || fn.length > 30) {
                                      fn = fn.split(" ")[0].trim();
                                      if (!fn || fn.length > 25 || fn.includes("//")) fn = "main.cpp";
                                    }
                                    return `created file "${fn}"`;
                                  });
                                  if (clean.length > 70) return clean.substring(0, 70) + "...";
                                  return clean;
                                })();

                                return (
                                  <div key={act._id} className="social-activity-card">
                                    <div className="social-activity-header">
                                      <div className="social-activity-actor-info">
                                        <SafeUserAvatar
                                          userId={act.user?._id || act.user?.id}
                                          avatar={act.user?.avatar}
                                          username={act.user?.username}
                                          size={38}
                                          className="actor-avatar"
                                        />
                                        <div className="actor-meta">
                                          <span
                                            className="actor-username"
                                            style={{ cursor: "pointer" }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (act.user) {
                                                if (window.handleGlobalProfileNav) {
                                                  window.handleGlobalProfileNav(act.user._id || act.user.id, act.user.username);
                                                } else {
                                                  handleViewUserProfile(act.user._id || act.user.id);
                                                }
                                              }
                                            }}
                                          >
                                            <strong>{act.user?.username || "Someone"}</strong>
                                          </span>
                                          <span className="activity-action-text">
                                            {sanitizedAction} {act.roomTitle ? (
                                              <strong className="clickable-room" onClick={() => act.room?.roomId && handleJoinRoomDirect(act.room.roomId)}>
                                                {act.roomTitle}
                                              </strong>
                                            ) : act.targetUser ? (
                                              <strong
                                                className="activity-target-user"
                                                style={{ cursor: "pointer" }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (window.handleGlobalProfileNav) {
                                                    window.handleGlobalProfileNav(act.targetUser._id || act.targetUser.id, act.targetUser.username);
                                                  } else {
                                                    handleViewUserProfile(act.targetUser._id || act.targetUser.id);
                                                  }
                                                }}
                                              >
                                                {act.targetUser.username}
                                              </strong>
                                            ) : ""}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="activity-timestamp">
                                        {formatLastActive(act.timestamp)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <button
                            type="button"
                            className="ce-column-scroll-down-btn"
                            onClick={() => {
                              const listEl = document.querySelector('.social-feed-section .social-activities-list');
                              if (listEl) {
                                listEl.scrollBy({ top: 180, behavior: 'smooth' });
                              }
                            }}
                            title="Scroll Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </section>

                        {/* COLUMN 3: RECENT JOINED ROOMS */}
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
                            const joinedRooms = historyRooms;

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
                                {joinedRooms.map(room => {
                                  const activeCount = room.activeUsersCount || 0;
                                  const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id;
                                  const maxParticipants = Math.max(room.participants?.length || 6, activeCount <= 1 ? 6 : activeCount + (activeCount % 3 === 0 ? 3 : 2));
                                  const isFull = activeCount >= maxParticipants;

                                  return (
                                    <div
                                      key={room._id}
                                      className="recent-joined-card"
                                      onMouseEnter={prefetchEditor}
                                    >
                                      <div className="joined-card-top-content">
                                        <div className="joined-card-logo-area">
                                          {renderLanguageLogo(room.language, room.title)}
                                        </div>
                                        <div className="joined-card-info-area">
                                          <h4 className="joined-room-title" title={room.title}>{room.title}</h4>
                                          <span className="joined-room-owner">
                                            @{room.createdBy?.username || "developer"}
                                          </span>
                                        </div>
                                        <div className="joined-card-top-right-meta">
                                          <span className={`room-visibility-badge-flat ${room.isPrivate ? "private" : "public"}`}>
                                            {room.isPrivate ? "Private" : "Public"}
                                          </span>
                                          <span className="joined-status-online-text">
                                            {activeCount} / {maxParticipants} Active
                                          </span>
                                        </div>
                                      </div>

                                      <hr className="joined-card-divider" />

                                      <div className="joined-card-footer-layout">
                                        <button
                                          className="joined-detail-btn-new"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRoomDetails(room);
                                          }}
                                        >
                                          Details
                                        </button>
                                        <div className="joined-card-actions" onClick={(e) => e.stopPropagation()}>
                                          {isOwner ? (
                                            <button
                                              className="joined-action-btn-flat resume"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Resume
                                            </button>
                                          ) : isFull ? (
                                            <button
                                              className="joined-action-btn-flat watch"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Watch
                                            </button>
                                          ) : (
                                            <button
                                              className="joined-action-btn-flat join"
                                              onClick={() => handleJoinRoomDirect(room.roomId)}
                                            >
                                              Join
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            className="ce-column-scroll-down-btn"
                            onClick={() => {
                              const listEl = document.querySelector('.recent-joined-section .recent-joined-list');
                              if (listEl) {
                                listEl.scrollBy({ top: 180, behavior: 'smooth' });
                              }
                            }}
                            title="Scroll Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </section>

                        {/* COLUMN 1, ROW 2: PENDING TASKS */}
                        <section className="ce-dashboard-section pending-tasks-section" style={{ marginBottom: 0 }}>
                          <div
                            className="section-header clickable-header"
                            onClick={() => navigate("/dashboard/planner?plannerTab=personal_tasks")}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <FolderGit size={16} style={{ color: "#ef4444", display: "inline-flex", alignItems: "center" }} />
                              <h3 className="section-title" style={{ margin: 0, padding: 0, display: "inline-flex", alignItems: "center", lineHeight: "1" }}>Pending & Overdue</h3>
                            </div>
                            <span className="box-count-badge count-pending" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", lineHeight: "1" }}>
                              {plannerTasks.overdueTasks?.length || 0}
                            </span>
                          </div>

                          <div
                            className="recent-joined-list"
                            style={{
                              height: "180px",
                              overflowY: "auto",
                              paddingRight: "4px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px"
                            }}
                          >
                            {(!plannerTasks.overdueTasks || plannerTasks.overdueTasks.length === 0) ? (
                              <div className="empty-state-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <p style={{ fontSize: "0.76rem", color: "var(--ce-text-muted)" }}>No pending or overdue tasks! 🎉</p>
                              </div>
                            ) : (
                              plannerTasks.overdueTasks.map(task => renderDashboardTaskItem(task, false, handleTaskClick, true))
                            )}
                          </div>
                          <button
                            type="button"
                            className="ce-column-scroll-down-btn"
                            onClick={() => {
                              const listEl = document.querySelector('.pending-tasks-section .recent-joined-list');
                              if (listEl) {
                                listEl.scrollBy({ top: 180, behavior: 'smooth' });
                              }
                            }}
                            title="Scroll Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </section>

                        {/* COLUMN 2, ROW 2: TODAY & FUTURE TASKS */}
                        <section className="ce-dashboard-section today-tasks-section" style={{ marginBottom: 0 }}>
                          <div
                            className="section-header clickable-header"
                            onClick={() => navigate("/dashboard/planner?plannerTab=personal_tasks")}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Calendar size={16} style={{ color: "var(--ce-primary)", display: "inline-flex", alignItems: "center" }} />
                              <h3 className="section-title" style={{ margin: 0, padding: 0, display: "inline-flex", alignItems: "center", lineHeight: "1" }}>Assigned Today & Future</h3>
                            </div>
                            <span className="box-count-badge count-assigned" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(168, 85, 247, 0.15)", color: "var(--ce-primary)", fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", lineHeight: "1" }}>
                              {(plannerTasks.todayTasks?.length || 0) + (plannerTasks.upcomingTasks?.length || 0)}
                            </span>
                          </div>

                          <div
                            className="recent-joined-list"
                            style={{
                              height: "180px",
                              overflowY: "auto",
                              paddingRight: "4px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px"
                            }}
                          >
                            {((!plannerTasks.todayTasks || plannerTasks.todayTasks.length === 0) &&
                              (!plannerTasks.upcomingTasks || plannerTasks.upcomingTasks.length === 0)) ? (
                              <div className="empty-state-card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <p style={{ fontSize: "0.76rem", color: "var(--ce-text-muted)" }}>No tasks assigned for today or future.</p>
                              </div>
                            ) : (
                              [...(plannerTasks.todayTasks || []), ...(plannerTasks.upcomingTasks || [])].map(task => renderDashboardTaskItem(task, false, handleTaskClick, false))
                            )}
                          </div>
                          <button
                            type="button"
                            className="ce-column-scroll-down-btn"
                            onClick={() => {
                              const listEl = document.querySelector('.today-tasks-section .recent-joined-list');
                              if (listEl) {
                                listEl.scrollBy({ top: 180, behavior: 'smooth' });
                              }
                            }}
                            title="Scroll Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </section>



                      </div>

                      {/* PREMIUM BOTTOM HIGHLIGHTS */}
                      <section className="ce-dashboard-section ce-bottom-quest-insights-section">
                        <div className="ce-bottom-highlights-layout">
                          {/* LEFT COLUMN: DAILY CODING QUEST */}
                          <div className="bottom-highlight-card daily-quest-card">
                            <div className="highlight-card-header">
                              <Sparkles size={16} className="quest-sparkle-icon" style={{ color: "#a855f7" }} />
                              <h4>Daily Coding Quest</h4>
                            </div>
                            <div className="quest-content">
                              <div className="quest-info">
                                <h5 className="quest-title">{todayQuest.title}</h5>
                                <span className={`quest-difficulty ${todayQuest.diffClass}`}>{todayQuest.difficulty}</span>
                                <p className="quest-desc">{todayQuest.desc}</p>
                              </div>
                              <div className="quest-solving-banner">
                                <BookOpen size={14} className="banner-icon" style={{ color: "#c084fc" }} />
                                <span>You should solve this challenge!</span>
                              </div>
                            </div>
                          </div>

                          {/* MIDDLE COLUMN: WEEKLY CHAMPIONS PODIUM */}
                          <div
                            className="bottom-highlight-card leaderboard-podium-card"
                            onClick={() => setActiveSection("leaderboard")}
                            style={{ cursor: "pointer" }}
                            title="Click to view full leaderboard"
                          >
                            <div className="highlight-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Trophy size={16} className="leaderboard-trophy-icon" style={{ color: "#eab308" }} />
                                <h4>Weekly Champions</h4>
                              </div>
                              <ChevronRight size={14} style={{ color: "var(--ce-text-muted)", opacity: 0.7 }} />
                            </div>
                            <div className="ce-bottom-podium-container">
                              {/* 2nd Place */}
                              <div
                                className="ce-bottom-podium-step step-second"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (leaderboardData[1]?.userId) {
                                    handleViewUserProfile(leaderboardData[1].userId);
                                  } else {
                                    setActiveSection("leaderboard");
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                              >
                                <div className="ce-bottom-podium-avatar-wrapper">
                                  {leaderboardData[1] ? (
                                    leaderboardData[1].avatar ? (
                                      <img src={leaderboardData[1].avatar} alt={leaderboardData[1].username} />
                                    ) : (
                                      <div className="ce-bottom-podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[1].username) }}>
                                        {(leaderboardData[1].username || "D").charAt(0).toUpperCase()}
                                      </div>
                                    )
                                  ) : (
                                    <div className="ce-bottom-podium-avatar-fallback">?</div>
                                  )}
                                </div>
                                <span className="ce-bottom-podium-name">
                                  {leaderboardData[1] ? `@${leaderboardData[1].username}` : "@loader"}
                                </span>
                                <div className="ce-bottom-podium-bar">2nd</div>
                              </div>

                              {/* 1st Place */}
                              <div
                                className="ce-bottom-podium-step step-first"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (leaderboardData[0]?.userId) {
                                    handleViewUserProfile(leaderboardData[0].userId);
                                  } else {
                                    setActiveSection("leaderboard");
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                              >
                                <div className="ce-bottom-podium-avatar-wrapper gold-ring">
                                  {leaderboardData[0] ? (
                                    leaderboardData[0].avatar ? (
                                      <img src={leaderboardData[0].avatar} alt={leaderboardData[0].username} />
                                    ) : (
                                      <div className="ce-bottom-podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[0].username) }}>
                                        {(leaderboardData[0].username || "D").charAt(0).toUpperCase()}
                                      </div>
                                    )
                                  ) : (
                                    <div className="ce-bottom-podium-avatar-fallback">?</div>
                                  )}
                                </div>
                                <span className="ce-bottom-podium-name">
                                  {leaderboardData[0] ? `@${leaderboardData[0].username}` : "@loader"}
                                </span>
                                <div className="ce-bottom-podium-bar">1st</div>
                              </div>

                              {/* 3rd Place */}
                              <div
                                className="ce-bottom-podium-step step-third"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (leaderboardData[2]?.userId) {
                                    handleViewUserProfile(leaderboardData[2].userId);
                                  } else {
                                    setActiveSection("leaderboard");
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                              >
                                <div className="ce-bottom-podium-avatar-wrapper">
                                  {leaderboardData[2] ? (
                                    leaderboardData[2].avatar ? (
                                      <img src={leaderboardData[2].avatar} alt={leaderboardData[2].username} />
                                    ) : (
                                      <div className="ce-bottom-podium-avatar-fallback" style={{ backgroundColor: getAvatarColor(leaderboardData[2].username) }}>
                                        {(leaderboardData[2].username || "D").charAt(0).toUpperCase()}
                                      </div>
                                    )
                                  ) : (
                                    <div className="ce-bottom-podium-avatar-fallback">?</div>
                                  )}
                                </div>
                                <span className="ce-bottom-podium-name">
                                  {leaderboardData[2] ? `@${leaderboardData[2].username}` : "@loader"}
                                </span>
                                <div className="ce-bottom-podium-bar">3rd</div>
                              </div>
                            </div>
                          </div>

                          {/* RIGHT COLUMN: DEVELOPER DNA / LANGUAGE MASTERY */}
                          <div className="bottom-highlight-card coding-dna-card">
                            <div className="highlight-card-header">
                              <Activity size={16} className="dna-activity-icon" style={{ color: "#3b82f6" }} />
                              <h4>Developer DNA</h4>
                            </div>
                            <div className="dna-content">
                              <div className="dna-bar-group">
                                <div className="dna-label-row">
                                  <span>JavaScript / React</span>
                                  <span>45%</span>
                                </div>
                                <div className="dna-progress-track">
                                  <div className="dna-progress-bar js-bar" style={{ width: "45%" }} />
                                </div>
                              </div>
                              <div className="dna-bar-group">
                                <div className="dna-label-row">
                                  <span>C++ / Algorithms</span>
                                  <span>30%</span>
                                </div>
                                <div className="dna-progress-track">
                                  <div className="dna-progress-bar cpp-bar" style={{ width: "30%" }} />
                                </div>
                              </div>
                              <div className="dna-bar-group">
                                <div className="dna-label-row">
                                  <span>Python / Scripting</span>
                                  <span>25%</span>
                                </div>
                                <div className="dna-progress-track">
                                  <div className="dna-progress-bar py-bar" style={{ width: "25%" }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="ce-column-right">

                      {/* REDESIGNED ONLINE NETWORK CARD MATCHING TARGET REFERENCE */}
                      <section className="ce-dashboard-section online-network-card">
                        {/* Top Filter Tabs */}
                        <div className="online-filter-tabs-bar">
                          <button
                            type="button"
                            className={`online-filter-tab-btn ${onlineFilterTab === "all" ? "active" : ""}`}
                            onClick={() => setOnlineFilterTab("all")}
                          >
                            All ({allOnlineList.length || onlineFollows.length})
                          </button>
                          <button
                            type="button"
                            className={`online-filter-tab-btn ${onlineFilterTab === "followers" ? "active" : ""}`}
                            onClick={() => setOnlineFilterTab("followers")}
                          >
                            Followers ({onlineFollowersList.length})
                          </button>
                          <button
                            type="button"
                            className={`online-filter-tab-btn ${onlineFilterTab === "following" ? "active" : ""}`}
                            onClick={() => setOnlineFilterTab("following")}
                          >
                            Following ({onlineFollowingList.length})
                          </button>
                        </div>

                        {/* List Rows */}
                        {isLoadingDashboard && displayedOnlineList.length === 0 ? (
                          <UserListSkeleton count={3} />
                        ) : displayedOnlineList.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No developers online in this category.</p>
                          </div>
                        ) : (
                          <div className="online-developers-rows">
                            {displayedOnlineList.slice(0, showAllOnline ? undefined : 3).map(dev => (
                              <div key={dev._id || dev.id} className="online-developer-row-card" onClick={() => handleViewUserProfile(dev._id || dev.id)}>
                                <div className="dev-avatar-container">
                                  <SafeUserAvatar userId={dev._id || dev.id} avatar={dev.avatar} username={dev.username} size={36} className="dev-avatar-img" />
                                  <span className="dev-online-status-badge" />
                                </div>

                                <div className="dev-meta-column" style={{ minWidth: 0, overflow: "hidden" }}>
                                  <span className="dev-name-text" title={dev.username} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dev.username}</span>
                                  <span className="dev-bio-text" title={dev.bio || "No bio yet"} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dev.bio || "No bio yet"}</span>
                                </div>

                                <span className="dev-far-right-online-dot" title="Online now" />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bottom Overlapping Avatar Stack & Remaining Count Button */}
                        {displayedOnlineList.length > 3 && (
                          <div
                            className="online-footer-stack-bar"
                            onClick={() => setShowAllOnline(prev => !prev)}
                            style={{ cursor: "pointer" }}
                            title={showAllOnline ? "Show less" : `Show all ${displayedOnlineList.length} online developers`}
                          >
                            <div className="online-avatar-bubbles">
                              {displayedOnlineList.slice(3, 8).map((u, i) => (
                                <div key={i} className="online-bubble-avatar">
                                  <SafeUserAvatar userId={u._id || u.id} avatar={u.avatar} username={u.username} size={22} />
                                </div>
                              ))}
                              <div className="online-bubble-count">
                                +{displayedOnlineList.length - 3}
                              </div>
                            </div>
                            <span className="online-footer-more-text">
                              {showAllOnline ? "Show less" : `and ${displayedOnlineList.length - 3} more online`}
                            </span>
                          </div>
                        )}
                      </section>

                      {/* PEOPLE YOU MAY KNOW */}
                      <section className="ce-dashboard-section">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h3 className="section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={14} style={{ color: "var(--ce-accent)" }} /> People You May Know
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowSuggestionsModal(true)}
                            className="ce-view-all-btn"
                          >
                            View all →
                          </button>
                        </div>
                        {isLoadingDashboard && suggestions.length === 0 ? (
                          <UserListSkeleton count={3} showButton={true} />
                        ) : suggestions.length === 0 ? (
                          <div className="empty-state-card compact">
                            <p>No suggestions available.</p>
                          </div>
                        ) : (
                          <>
                            <div className="suggestions-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {suggestions.slice(0, 5).map(s => (
                                <div key={s._id} className="suggestion-item">
                                  <div onClick={() => handleViewUserProfile(s._id)} style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, cursor: "pointer", minWidth: 0 }}>
                                    <div className="suggestion-avatar" style={{ width: "28px", height: "28px", flexShrink: 0, position: "relative" }}>
                                      {s.avatar ? (
                                        <img src={s.avatar} alt={s.username} style={{ width: "100%", height: "100%", borderRadius: "4px", objectFit: "cover" }} />
                                      ) : (
                                        <div className="suggestion-avatar-initial" style={{ width: "100%", height: "100%", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(s.username), fontSize: "0.78rem", fontWeight: "600", color: "#fff" }}>
                                          {(s.username || "D").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      {s.isOnline && (
                                        <span className="online-badge-dot" style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "8px", height: "8px", borderRadius: "4px", backgroundColor: "#10b981", border: "1.5px solid var(--ce-bg)" }} />
                                      )}
                                    </div>
                                    <div className="suggestion-details" style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                      <span className="suggestion-name" style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.username}</span>
                                      {(() => {
                                        const targetFollowers = s.followers || [];
                                        const targetFollowing = s.following || [];
                                        const realMutuals = followingList.filter(f => {
                                          const fId = String(f._id || f);
                                          return targetFollowers.some(id => String(id) === fId) || targetFollowing.some(id => String(id) === fId);
                                        });
                                        if (realMutuals.length > 0) {
                                          const displayList = realMutuals.slice(0, 2);
                                          const remainingCount = realMutuals.length - displayList.length;
                                          return (
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                              <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                                {displayList.map((mUser, mIdx) => {
                                                  const username = mUser.username || "Developer";
                                                  return (
                                                    <div
                                                      key={mUser._id || mIdx}
                                                      style={{
                                                        width: "16px",
                                                        height: "16px",
                                                        borderRadius: "50%",
                                                        overflow: "hidden",
                                                        border: "1px solid var(--ce-surface-card)",
                                                        background: mUser.avatar ? "transparent" : getAvatarColor(username),
                                                        marginLeft: mIdx === 0 ? 0 : "-5px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "0.5rem",
                                                        fontWeight: "700",
                                                        color: "#fff",
                                                        zIndex: 4 - mIdx
                                                      }}
                                                      title={`@${username}`}
                                                    >
                                                      {mUser.avatar ? (
                                                        <img src={mUser.avatar} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                      ) : (
                                                        (username || "D").charAt(0).toUpperCase()
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                                {remainingCount > 0 && (
                                                  <div
                                                    style={{
                                                      width: "14px",
                                                      height: "14px",
                                                      borderRadius: "50%",
                                                      background: "var(--ce-hover)",
                                                      border: "1px solid var(--ce-surface-card)",
                                                      display: "flex",
                                                      alignItems: "center",
                                                      justifyContent: "center",
                                                      fontSize: "0.45rem",
                                                      fontWeight: "750",
                                                      color: "var(--ce-primary)",
                                                      marginLeft: "-4px",
                                                      zIndex: 0
                                                    }}
                                                  >
                                                    +{remainingCount}
                                                  </div>
                                                )}
                                              </div>
                                              <span className="suggestion-reason" style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {realMutuals.length} mutual{realMutuals.length > 1 ? "s" : ""}
                                              </span>
                                            </div>
                                          );
                                        }
                                        return (
                                          <span className="suggestion-reason" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {s.programmingLanguages && s.programmingLanguages.length > 0 ? `Tags: ${s.programmingLanguages.slice(0, 2).join(", ")}` : "Recommended"}
                                          </span>
                                        );
                                      })()}
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
                          </>
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
                          <>
                            <div className="trending-rooms-list">
                              {trendingRooms.slice(0, 5).map((room, index) => {
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
                                            (creatorName || "D").charAt(0).toUpperCase()
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
                          </>
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
                    if (!room) return false;
                    const term = (myRoomsTabSearch || "").toLowerCase();
                    const title = (room.title || "").toLowerCase();
                    const roomId = (room.roomId || "").toLowerCase();
                    return title.includes(term) || roomId.includes(term);
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

          {/* ROOM REQUESTS & MY ROOMS SECTION */}
          {activeSection === "room-requests" && (() => {
            const ownedRooms = historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id);

            // Filtering for My Created Rooms tab
            const filteredOwnedRooms = ownedRooms.filter(room => {
              if (!room) return false;
              const term = (roomRequestsSearch || "").toLowerCase();
              const title = (room.title || "").toLowerCase();
              const roomId = (room.roomId || "").toLowerCase();
              const lang = (room.language || "").toLowerCase();
              const matchesSearch = title.includes(term) || roomId.includes(term) || lang.includes(term);

              if (!matchesSearch) return false;

              if (roomRequestsFilter === "pending") {
                const roomReqs = joinRequests.filter(req => req.roomId === room.roomId);
                return roomReqs.length > 0;
              }
              if (roomRequestsFilter === "private") return !!room.isPrivate;
              if (roomRequestsFilter === "public") return !room.isPrivate;
              return true;
            });

            return (
              <motion.div
                key="room-requests"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                style={{ width: "100%", height: "100%" }}
              >
                <div className="room-requests-section-container" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>


                  {/* Stats Header for Rooms - Redesigned as Hanging Lamps (No shadows/glows) */}
                  <div className="ce-lamp-hanger-container" style={{ position: "relative", width: "100%", padding: "6px 0 30px 0", marginBottom: "24px", display: "flex", justifyContent: "center", gap: "40px", flexWrap: "wrap", zIndex: 10 }}>
                    {/* The horizontal stick support */}
                    <div className="ce-lamp-support-stick" style={{
                      position: "absolute",
                      top: "0px",
                      left: "0%",
                      width: "100%",
                      height: "6px",
                      background: "linear-gradient(to right, #2d3748, #4a5568, #718096, #4a5568, #2d3748)",
                      borderRadius: "0px",
                      boxShadow: "none",
                      zIndex: 1
                    }} />

                    {/* Lamp 1: My Workspaces */}
                    <div className="ce-hanging-lamp-card-wrapper">
                      <div className="ce-lamp-rope" style={{
                        width: "3px",
                        height: "40px",
                        background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                        boxShadow: "none"
                      }} />
                      <div className="ce-lamp-cap" style={{
                        width: "20px",
                        height: "8px",
                        background: "#4a5568",
                        borderRadius: "4px 4px 0 0",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "none",
                        marginBottom: "-1px"
                      }} />
                      <div className="ce-hanging-lamp-card purple-lamp">
                        <div className="stat-card-icon-wrapper purple-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                          <FolderGit size={18} />
                        </div>
                        <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>My Workspaces</span>
                        <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#a78bfa", marginTop: "4px", zIndex: 1 }}>{ownedRooms.length}</span>
                        <span className="stat-card-subtitle" style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", marginTop: "6px", textAlign: "center", opacity: 0.85, zIndex: 1 }}>Total workspaces created by you</span>
                      </div>
                    </div>

                    {/* Lamp 2: Pending Access Requests */}
                    <div className="ce-hanging-lamp-card-wrapper">
                      <div className="ce-lamp-rope" style={{
                        width: "3px",
                        height: "40px",
                        background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                        boxShadow: "none"
                      }} />
                      <div className="ce-lamp-cap" style={{
                        width: "20px",
                        height: "8px",
                        background: "#4a5568",
                        borderRadius: "4px 4px 0 0",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "none",
                        marginBottom: "-1px"
                      }} />
                      <div className="ce-hanging-lamp-card yellow-lamp">
                        <div className="stat-card-icon-wrapper amber-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                          <ShieldAlert size={18} />
                        </div>
                        <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Pending Requests</span>
                        <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px", zIndex: 1 }}>{joinRequests.length}</span>
                        <span className="stat-card-subtitle" style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", marginTop: "6px", textAlign: "center", opacity: 0.85, zIndex: 1 }}>Requests waiting for your approval</span>
                      </div>
                    </div>

                    {/* Lamp 3: Private Rooms */}
                    <div className="ce-hanging-lamp-card-wrapper">
                      <div className="ce-lamp-rope" style={{
                        width: "3px",
                        height: "40px",
                        background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                        boxShadow: "none"
                      }} />
                      <div className="ce-lamp-cap" style={{
                        width: "20px",
                        height: "8px",
                        background: "#4a5568",
                        borderRadius: "4px 4px 0 0",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "none",
                        marginBottom: "-1px"
                      }} />
                      <div className="ce-hanging-lamp-card purple-lamp" style={{ borderColor: "rgba(168, 85, 247, 0.25)" }}>
                        <div className="stat-card-icon-wrapper purple-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                          <Lock size={18} />
                        </div>
                        <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Private Rooms</span>
                        <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#c084fc", marginTop: "4px", zIndex: 1 }}>{ownedRooms.filter(r => r.isPrivate).length}</span>
                        <span className="stat-card-subtitle" style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", marginTop: "6px", textAlign: "center", opacity: 0.85, zIndex: 1 }}>Private rooms created by you</span>
                      </div>
                    </div>

                    {/* Lamp 4: Live Active Rooms */}
                    <div className="ce-hanging-lamp-card-wrapper">
                      <div className="ce-lamp-rope" style={{
                        width: "3px",
                        height: "40px",
                        background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                        boxShadow: "none"
                      }} />
                      <div className="ce-lamp-cap" style={{
                        width: "20px",
                        height: "8px",
                        background: "#4a5568",
                        borderRadius: "4px 4px 0 0",
                        border: "1px solid rgba(255,255,255,0.1)",
                        boxShadow: "none",
                        marginBottom: "-1px"
                      }} />
                      <div className="ce-hanging-lamp-card green-lamp">
                        <div className="stat-card-icon-wrapper green-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                          <Radio size={18} />
                        </div>
                        <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Live Active Rooms</span>
                        <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#34d399", marginTop: "4px", zIndex: 1 }}>{ownedRooms.filter(r => liveRooms.some(lr => lr.roomId === r.roomId && (lr.activeUsersCount || 0) > 0)).length}</span>
                        <span className="stat-card-subtitle" style={{ fontSize: "0.65rem", color: "var(--ce-text-muted)", marginTop: "6px", textAlign: "center", opacity: 0.85, zIndex: 1 }}>Rooms currently live and active</span>
                      </div>
                    </div>
                  </div>

                  {/* Tab Navigation Pill Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--ce-border)", paddingBottom: "16px", marginBottom: "16px" }}>
                    <div className="ce-segmented-control" style={{ display: "flex", gap: "6px", background: activeTheme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.03)", border: "1px solid var(--ce-border)", padding: "4px", borderRadius: "12px" }}>
                      <button
                        className={`ce-pill-btn ${roomRequestsTab === "myrooms" ? "active" : ""}`}
                        onClick={() => setRoomRequestsTab("myrooms")}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "10px",
                          border: "none",
                          background: roomRequestsTab === "myrooms" ? "linear-gradient(135deg, var(--ce-primary) 0%, #7c3aed 100%)" : "transparent",
                          color: roomRequestsTab === "myrooms" ? "#fff" : "var(--ce-text-muted)",
                          boxShadow: roomRequestsTab === "myrooms" ? "0 4px 12px var(--ce-primary-glow)" : "none",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <FolderGit size={14} /> My Created Rooms ({ownedRooms.length})
                      </button>
                      <button
                        className={`ce-pill-btn ${roomRequestsTab === "incoming" ? "active" : ""}`}
                        onClick={() => setRoomRequestsTab("incoming")}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "10px",
                          border: "none",
                          background: roomRequestsTab === "incoming" ? "linear-gradient(135deg, var(--ce-primary) 0%, #7c3aed 100%)" : "transparent",
                          color: roomRequestsTab === "incoming" ? "#fff" : "var(--ce-text-muted)",
                          boxShadow: roomRequestsTab === "incoming" ? "0 4px 12px var(--ce-primary-glow)" : "none",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <ShieldAlert size={14} /> Incoming Requests ({joinRequests.length})
                        {joinRequests.length > 0 && (
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                        )}
                      </button>
                      <button
                        className={`ce-pill-btn ${roomRequestsTab === "sent" ? "active" : ""}`}
                        onClick={() => setRoomRequestsTab("sent")}
                        style={{
                          padding: "8px 18px",
                          borderRadius: "10px",
                          border: "none",
                          background: roomRequestsTab === "sent" ? "linear-gradient(135deg, var(--ce-primary) 0%, #7c3aed 100%)" : "transparent",
                          color: roomRequestsTab === "sent" ? "#fff" : "var(--ce-text-muted)",
                          boxShadow: roomRequestsTab === "sent" ? "0 4px 12px var(--ce-primary-glow)" : "none",
                          fontWeight: "700",
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <Send size={14} /> Sent Requests ({mySentRequests.length})
                      </button>
                    </div>

                    {roomRequestsTab === "myrooms" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="section-search-container" style={{ minWidth: "240px", marginBottom: 0, padding: "6px 14px", borderRadius: "9999px" }}>
                          <Search size={14} className="section-search-icon" />
                          <input
                            type="text"
                            placeholder="Search my rooms..."
                            value={roomRequestsSearch}
                            onChange={(e) => setRoomRequestsSearch(e.target.value)}
                            className="section-search-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TAB CONTENT: MY CREATED ROOMS */}
                  {roomRequestsTab === "myrooms" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                      {/* Filter Quick Pills */}
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--ce-text-muted)", marginRight: "4px" }}>Filter:</span>
                        {[
                          { id: "all", label: "All Rooms" },
                          { id: "pending", label: `Pending Requests (${joinRequests.length})` },
                          { id: "private", label: "Private Only" },
                          { id: "public", label: "Public Only" }
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => setRoomRequestsFilter(f.id)}
                            style={{
                              padding: "4px 12px",
                              borderRadius: "16px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              border: roomRequestsFilter === f.id ? "1px solid var(--ce-primary)" : "1px solid var(--ce-border)",
                              background: roomRequestsFilter === f.id ? "rgba(139, 92, 246, 0.15)" : "transparent",
                              color: roomRequestsFilter === f.id ? "var(--ce-primary)" : "var(--ce-text-muted)",
                              cursor: "pointer"
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {ownedRooms.length === 0 ? (
                        <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center" }}>
                          <FolderGit size={36} className="empty-state-icon" style={{ color: "var(--ce-primary)", marginBottom: "16px" }} />
                          <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)", fontSize: "1.1rem" }}>No Workspaces Created Yet</h3>
                          <p style={{ margin: "0 0 20px 0", color: "var(--ce-text-muted)", fontSize: "0.85rem" }}>
                            Create your first collaborative code room to start inviting developers and receiving join requests!
                          </p>
                          <button
                            className="ce-btn-primary"
                            style={{ margin: "0 auto", padding: "10px 20px" }}
                            onClick={() => {
                              setFormData({ title: "", language: "javascript", isPrivate: false });
                              setShowQuickCreateModal(true);
                            }}
                          >
                            <Plus size={16} /> Create Your First Workspace
                          </button>
                        </div>
                      ) : filteredOwnedRooms.length === 0 ? (
                        <div className="empty-state-card" style={{ padding: "32px", textAlign: "center" }}>
                          <Search size={24} className="empty-state-icon" style={{ marginBottom: "8px" }} />
                          <p style={{ color: "var(--ce-text-muted)", margin: 0 }}>No rooms match your filter or search criteria.</p>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
                          {filteredOwnedRooms.map(room => {
                            const roomPendingRequests = joinRequests.filter(req => req.roomId === room.roomId);
                            const liveRoomObj = liveRooms.find(lr => lr.roomId === room.roomId);
                            const isLive = liveRoomObj && (liveRoomObj.activeUsersCount || 0) > 0;
                            const activeCount = liveRoomObj ? (liveRoomObj.activeUsersCount || 0) : 0;

                            const lang = (room.language || "javascript").toLowerCase();
                            const isJS = lang === "javascript" || lang === "js";
                            const isPy = lang === "python";
                            const isCpp = lang === "cpp" || lang === "c++";
                            const isJava = lang === "java";
                            const isHtml = lang === "html";

                            const langColor = isJS ? "#f59e0b" : isPy ? "#3b82f6" : isCpp ? "#06b6d4" : isJava ? "#ef4444" : isHtml ? "#f97316" : "var(--ce-primary)";
                            const langBg = isJS ? "rgba(245, 158, 11, 0.12)" : isPy ? "rgba(59, 130, 246, 0.12)" : isCpp ? "rgba(6, 182, 212, 0.12)" : isJava ? "rgba(239, 68, 68, 0.12)" : isHtml ? "rgba(249, 115, 22, 0.12)" : "rgba(139, 92, 246, 0.12)";
                            const langBorder = isJS ? "1px solid rgba(245, 158, 11, 0.25)" : isPy ? "1px solid rgba(59, 130, 246, 0.25)" : isCpp ? "1px solid rgba(6, 182, 212, 0.25)" : isJava ? "1px solid rgba(239, 68, 68, 0.25)" : isHtml ? "1px solid rgba(249, 115, 22, 0.25)" : "1px solid rgba(139, 92, 246, 0.25)";

                            return (
                              <div
                                key={room.roomId || room._id}
                                className="ce-my-room-card"
                                style={{
                                  background: activeTheme === "light"
                                    ? "linear-gradient(135deg, #ffffff 0%, rgba(245, 245, 255, 0.4) 100%)"
                                    : "linear-gradient(135deg, var(--ce-surface-card) 0%, rgba(255, 255, 255, 0.01) 100%)",
                                  border: roomPendingRequests.length > 0 ? "1.5px solid #f59e0b" : "1px solid var(--ce-border)",
                                  borderRadius: "14px",
                                  padding: "20px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "16px",
                                  position: "relative",
                                  boxShadow: roomPendingRequests.length > 0 ? "0 8px 24px rgba(245, 158, 11, 0.12)" : "0 4px 15px rgba(0,0,0,0.06)",
                                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-4px)";
                                  e.currentTarget.style.boxShadow = roomPendingRequests.length > 0
                                    ? "0 12px 30px rgba(245, 158, 11, 0.22)"
                                    : "0 12px 30px rgba(139, 92, 246, 0.12)";
                                  if (roomPendingRequests.length === 0) {
                                    e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.45)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.boxShadow = roomPendingRequests.length > 0
                                    ? "0 8px 24px rgba(245, 158, 11, 0.12)"
                                    : "0 4px 15px rgba(0,0,0,0.06)";
                                  e.currentTarget.style.borderColor = roomPendingRequests.length > 0 ? "#f59e0b" : "var(--ce-border)";
                                }}
                              >
                                {/* Card Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                                  <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                                      <h3 style={{ fontSize: "1.08rem", fontWeight: "800", color: "var(--ce-text-h)", margin: 0 }}>
                                        {room.title}
                                      </h3>
                                      <span style={{ fontSize: "0.68rem", fontWeight: "700", textTransform: "uppercase", padding: "2px 8px", borderRadius: "6px", background: langBg, color: langColor, border: langBorder }}>
                                        {room.language || "javascript"}
                                      </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                                      <span>ID: <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: "4px", color: "var(--ce-text)" }}>{room.roomId}</code></span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(room.roomId);
                                          addToast("Room ID copied to clipboard!", "success");
                                        }}
                                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ce-primary)", display: "flex", alignItems: "center" }}
                                        title="Copy Room ID"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                                    {room.isPrivate ? (
                                      <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "3px 8px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.22)", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Lock size={11} /> Private
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "3px 8px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.22)", display: "flex", alignItems: "center", gap: "4px" }}>
                                        <Globe size={11} /> Public
                                      </span>
                                    )}

                                    <span style={{ fontSize: "0.72rem", fontWeight: "600", color: isLive ? "#10b981" : "var(--ce-text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isLive ? "#10b981" : "#9ca3af" }} />
                                      {isLive ? `${activeCount} Online` : "Idle"}
                                    </span>
                                  </div>
                                </div>

                                {/* Room Code Info for Private Rooms */}
                                {room.isPrivate && room.joinCode && (
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(139, 92, 246, 0.04)", border: "1px dashed rgba(139, 92, 246, 0.25)", borderRadius: "8px", padding: "8px 12px" }}>
                                    <span style={{ fontSize: "0.75rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Private Join Code:</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                      <code style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--ce-primary)", letterSpacing: "1px" }}>{room.joinCode}</code>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(room.joinCode);
                                          addToast("Private code copied!", "success");
                                        }}
                                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--ce-primary)", display: "flex" }}
                                        title="Copy Join Code"
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons Footer */}
                                <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "6px" }}>
                                  <button
                                    onClick={() => proceedJoinRoom(room.roomId)}
                                    style={{
                                      flex: 1,
                                      padding: "8px 14px",
                                      borderRadius: "8px",
                                      background: "linear-gradient(135deg, var(--ce-primary) 0%, #7c3aed 100%)",
                                      color: "#fff",
                                      border: "none",
                                      fontSize: "0.82rem",
                                      fontWeight: "750",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "6px",
                                      boxShadow: "0 4px 12px var(--ce-primary-glow)",
                                      transition: "transform 0.15s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                  >
                                    <DoorOpen size={14} /> Enter Room
                                  </button>
                                  {room.isPrivate && (
                                    <button
                                      onClick={() => {
                                        setManageRequestsRoomId(room.roomId);
                                        setRoomRequestsTab("incoming");
                                      }}
                                      style={{
                                        padding: "8px 12px",
                                        borderRadius: "8px",
                                        background: roomPendingRequests.length > 0 ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(139, 92, 246, 0.06)",
                                        color: roomPendingRequests.length > 0 ? "#fff" : "var(--ce-text)",
                                        border: roomPendingRequests.length > 0 ? "none" : "1px solid var(--ce-border)",
                                        boxShadow: roomPendingRequests.length > 0 ? "0 4px 12px rgba(245, 158, 11, 0.25)" : "none",
                                        fontSize: "0.8rem",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        transition: "all 0.15s ease"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                      title="Manage Pending Access Requests"
                                    >
                                      <ShieldAlert size={14} /> Requests ({roomPendingRequests.length})
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setSelectedRoomDetails(room)}
                                    style={{
                                      padding: "8px 12px",
                                      borderRadius: "8px",
                                      background: activeTheme === "light" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)",
                                      color: "var(--ce-text)",
                                      border: "1px solid var(--ce-border)",
                                      fontSize: "0.8rem",
                                      fontWeight: "600",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      transition: "all 0.15s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                    title="View Members & Details"
                                  >
                                    <SettingsIcon size={14} /> Manage
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT: INCOMING REQUESTS */}
                  {roomRequestsTab === "incoming" && (() => {
                    const filteredRequests = joinRequests
                      .filter(req => {
                        if (manageRequestsRoomId && req.roomId !== manageRequestsRoomId) return false;
                        const term = (manageRequestSearch || "").toLowerCase();
                        const uname = (req.username || req.user?.username || "").toLowerCase();
                        const rtitle = (req.roomTitle || "").toLowerCase();
                        return uname.includes(term) || rtitle.includes(term);
                      })
                      .sort((a, b) => {
                        const tA = new Date(a.createdAt || 0).getTime();
                        const tB = new Date(b.createdAt || 0).getTime();
                        return manageRequestSort === "newest" ? tB - tA : tA - tB;
                      });

                    const activeRequest = filteredRequests.find(r => r.requestId === selectedRequestId) || filteredRequests[0];

                    const handleAcceptAll = async () => {
                      if (filteredRequests.length === 0) return;
                      addToast(`Approving ${filteredRequests.length} join requests...`, "info");
                      for (const req of filteredRequests) {
                        await handleRespondRequest(req.roomId, req.user?._id || req.user, "accept");
                      }
                      addToast(`Approved all requests!`, "success");
                    };

                    const handleRejectAll = async () => {
                      if (filteredRequests.length === 0) return;
                      addToast(`Declining ${filteredRequests.length} join requests...`, "info");
                      for (const req of filteredRequests) {
                        await handleRespondRequest(req.roomId, req.user?._id || req.user, "reject");
                      }
                      addToast(`Declined all requests.`, "success");
                    };

                    const getMockIP = (userId) => {
                      if (!userId) return "192.168.1.12";
                      let codeSum = 0;
                      for (let i = 0; i < userId.length; i++) codeSum += userId.charCodeAt(i);
                      return `192.168.1.${(codeSum % 250) + 2}`;
                    };

                    const getMockDevice = (userId) => {
                      if (!userId) return "Windows • Chrome";
                      const platforms = ["Windows • Chrome", "macOS • Safari", "Linux • Firefox", "iOS • Safari App", "Android • Chrome Mobile"];
                      let codeSum = 0;
                      for (let i = 0; i < userId.length; i++) codeSum += userId.charCodeAt(i);
                      return platforms[codeSum % platforms.length];
                    };

                    const getMockMemberSince = (reqUser) => {
                      const regDateStr = reqUser?.createdAt || reqUser?.user?.createdAt;
                      if (regDateStr) {
                        return new Date(regDateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
                      }
                      return "May 10, 2025";
                    };

                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                        {/* Go Back Link if viewing room requests for a specific room */}
                        {manageRequestsRoomId && (
                          <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "4px", marginBottom: "10px" }}>
                            <button
                              onClick={() => {
                                setManageRequestsRoomId(null);
                                setRoomRequestsTab("myrooms");
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "none",
                                border: "none",
                                color: "var(--ce-primary)",
                                fontWeight: "700",
                                fontSize: "0.85rem",
                                cursor: "pointer",
                                padding: 0,
                                transition: "color 0.2s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--ce-text-h)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--ce-primary)"}
                            >
                              <ArrowLeft size={16} /> Back to My Workspaces
                            </button>
                          </div>
                        )}

                        {/* Banner Card Header */}
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "16px",
                          background: activeTheme === "light"
                            ? "linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(139, 92, 246, 0.01) 100%)"
                            : "linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(139, 92, 246, 0.01) 100%)",
                          border: "1px solid var(--ce-border)",
                          borderRadius: "14px",
                          padding: "18px 24px",
                          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ce-primary)", boxShadow: "0 0 10px rgba(139, 92, 246, 0.15)" }}>
                              <ShieldAlert size={20} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "var(--ce-text-h)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                Pending Access Requests
                                <span style={{ fontSize: "0.78rem", fontWeight: "750", background: "var(--ce-primary)", color: "#fff", padding: "2px 8px", borderRadius: "12px", boxShadow: "0 2px 6px var(--ce-primary-glow)" }}>
                                  {filteredRequests.length}
                                </span>
                              </h3>
                              <p style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)", margin: "2px 0 0 0" }}>
                                Manage and review developers who want to join your workspace sessions.
                              </p>
                            </div>
                          </div>

                          {filteredRequests.length > 0 && (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={handleRejectAll}
                                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                              >
                                <X size={14} /> Decline All
                              </button>
                              <button
                                onClick={handleAcceptAll}
                                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: "var(--ce-primary)", color: "#fff", border: "none", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                              >
                                <Check size={14} /> Approve All
                              </button>
                            </div>
                          )}
                        </div>

                        {joinRequests.length === 0 ? (
                          <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center" }}>
                            <Check size={32} className="empty-state-icon" style={{ color: "#10b981", marginBottom: "12px" }} />
                            <h3 style={{ margin: "0 0 6px 0", color: "var(--ce-text-h)" }}>No Pending Join Requests</h3>
                            <p style={{ margin: 0, color: "var(--ce-text-muted)", fontSize: "0.84rem" }}>
                              All access requests for your private rooms have been processed!
                            </p>
                          </div>
                        ) : filteredRequests.length === 0 ? (
                          <div className="empty-state-card" style={{ padding: "32px", textAlign: "center" }}>
                            <Search size={24} className="empty-state-icon" style={{ marginBottom: "8px" }} />
                            <p style={{ color: "var(--ce-text-muted)", margin: 0 }}>No pending requests match your search filter.</p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                            {/* Search and Sort Toolbar */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                <div className="section-search-container" style={{ minWidth: "240px", marginBottom: 0, padding: "6px 12px" }}>
                                  <Search size={14} className="section-search-icon" />
                                  <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={manageRequestSearch}
                                    onChange={(e) => {
                                      setManageRequestSearch(e.target.value);
                                      setManageRequestLimit(10);
                                    }}
                                    className="section-search-input"
                                    aria-label="Search users by username"
                                  />
                                </div>
                                <select
                                  value={manageRequestSort}
                                  onChange={(e) => setManageRequestSort(e.target.value)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "9999px",
                                    border: "1px solid var(--ce-border)",
                                    background: activeTheme === "light" ? "#fff" : "var(--ce-surface-card)",
                                    color: "var(--ce-text)",
                                    fontSize: "0.78rem",
                                    outline: "none",
                                    cursor: "pointer"
                                  }}
                                  aria-label="Sort join requests list"
                                >
                                  <option value="newest">Newest First</option>
                                  <option value="oldest">Oldest First</option>
                                </select>
                              </div>

                              <div style={{ fontSize: "0.82rem", color: "var(--ce-text-muted)" }}>
                                Showing 1-{Math.min(manageRequestLimit, filteredRequests.length)} of {filteredRequests.length} requests
                              </div>
                            </div>

                            {/* Split Layout: Left List vs Right Detail Panel */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "24px" }} className="manage-requests-split-layout">

                              {/* Left Column: Requests Cards List */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {filteredRequests.slice(0, manageRequestLimit).map(req => {
                                  const isActive = activeRequest && String(req.requestId) === String(activeRequest.requestId);
                                  return (
                                    <div
                                      key={req.requestId}
                                      onClick={() => setSelectedRequestId(req.requestId)}
                                      style={{
                                        background: isActive
                                          ? (activeTheme === "light" ? "rgba(139, 92, 246, 0.05)" : "rgba(139, 92, 246, 0.08)")
                                          : (activeTheme === "light" ? "#fff" : "var(--ce-surface-card)"),
                                        border: isActive ? "1.5px solid var(--ce-primary)" : "1px solid var(--ce-border)",
                                        borderLeft: isActive ? "4px solid var(--ce-primary)" : "1px solid var(--ce-border)",
                                        borderRadius: "12px",
                                        padding: "16px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        cursor: "pointer",
                                        boxShadow: isActive ? "0 4px 16px rgba(139, 92, 246, 0.12)" : "none",
                                        transform: isActive ? "translateX(4px)" : "none",
                                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", background: req.user?.avatar ? "transparent" : getAvatarColor(req.username || req.user?.username || "D"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "700", fontSize: "0.95rem" }}>
                                          {req.user?.avatar ? (
                                            <img src={req.user.avatar} alt={req.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                          ) : (
                                            (req.username || req.user?.username || "D").charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--ce-text-h)" }}>
                                            {req.username || req.user?.username}
                                          </span>
                                          <span style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)" }}>
                                            Room: <strong>{req.roomTitle}</strong>
                                          </span>
                                          <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>
                                            Requested {timeAgo(req.createdAt)}
                                          </span>
                                        </div>
                                      </div>

                                      <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleRespondRequest(req.roomId, req.user?._id || req.user, "accept")}
                                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.15s ease" }}
                                          title="Accept Request"
                                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleRespondRequest(req.roomId, req.user?._id || req.user, "reject")}
                                          style={{ width: "30px", height: "30px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "transform 0.15s ease" }}
                                          title="Reject Request"
                                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08)"}
                                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Load More Pagination Controls */}
                                {filteredRequests.length > manageRequestLimit && (
                                  <button
                                    onClick={() => setManageRequestLimit(prev => prev + 10)}
                                    style={{
                                      width: "100%",
                                      padding: "12px",
                                      borderRadius: "10px",
                                      background: "transparent",
                                      border: "1px dashed var(--ce-border)",
                                      color: "var(--ce-primary)",
                                      fontWeight: "600",
                                      fontSize: "0.82rem",
                                      cursor: "pointer",
                                      textAlign: "center",
                                      marginTop: "4px",
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    Load More Requests ↓
                                  </button>
                                )}
                              </div>

                              {/* Right Column: Requester Detailed Info Inspector Card */}
                              <div>
                                {activeRequest ? (
                                  <div
                                    style={{
                                      background: activeTheme === "light" ? "#fff" : "var(--ce-surface-card)",
                                      border: "1px solid var(--ce-border)",
                                      borderRadius: "14px",
                                      padding: "24px",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "20px",
                                      position: "sticky",
                                      top: "20px",
                                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.05)"
                                    }}
                                  >
                                    {/* Big Header Avatar Stack */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                      <div style={{ position: "relative" }}>
                                        <div style={{ width: "64px", height: "64px", borderRadius: "50%", overflow: "hidden", background: activeRequest.user?.avatar ? "transparent" : getAvatarColor(activeRequest.username || activeRequest.user?.username || "D"), display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.6rem", fontWeight: "700" }}>
                                          {activeRequest.user?.avatar ? (
                                            <img src={activeRequest.user.avatar} alt={activeRequest.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                          ) : (
                                            (activeRequest.username || activeRequest.user?.username || "D").charAt(0).toUpperCase()
                                          )}
                                        </div>
                                        <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", border: "2px solid var(--ce-surface-card)", position: "absolute", bottom: "2px", right: "2px" }} />
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--ce-text-h)" }}>
                                          {activeRequest.username || activeRequest.user?.username}
                                        </span>
                                        <span style={{ fontSize: "0.85rem", color: "var(--ce-text-muted)" }}>
                                          {activeRequest.user?.email || `${activeRequest.username || "developer"}@codeexpo.com`}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Detailed Properties Grid */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: activeTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", padding: "18px", borderRadius: "10px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Code size={14} style={{ color: "var(--ce-primary)" }} />
                                          <span>Requested Room</span>
                                        </div>
                                        <span style={{ fontWeight: "700", color: "var(--ce-text-h)" }}>{activeRequest.roomTitle}</span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Clock size={14} style={{ color: "#3b82f6" }} />
                                          <span>Requested At</span>
                                        </div>
                                        <span style={{ fontWeight: "600", color: "var(--ce-text-h)" }}>
                                          {timeAgo(activeRequest.createdAt)}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Activity size={14} style={{ color: "#10b981" }} />
                                          <span>User Status</span>
                                        </div>
                                        <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", textTransform: "uppercase" }}>Online</span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <User size={14} style={{ color: "#f59e0b" }} />
                                          <span>User Role</span>
                                        </div>
                                        <span style={{ fontSize: "0.72rem", fontWeight: "700", padding: "2px 8px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", textTransform: "uppercase" }}>User</span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Globe size={14} style={{ color: "#06b6d4" }} />
                                          <span>IP Address</span>
                                        </div>
                                        <span style={{ fontWeight: "600", color: "var(--ce-text-h)" }}>{getMockIP(activeRequest.user?._id || activeRequest.user)}</span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Laptop size={14} style={{ color: "#8b5cf6" }} />
                                          <span>Device</span>
                                        </div>
                                        <span style={{ fontWeight: "600", color: "var(--ce-text-h)" }}>{getMockDevice(activeRequest.user?._id || activeRequest.user)}</span>
                                      </div>

                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text-muted)" }}>
                                          <Calendar size={14} style={{ color: "#ec4899" }} />
                                          <span>Member Since</span>
                                        </div>
                                        <span style={{ fontWeight: "600", color: "var(--ce-text-h)" }}>{getMockMemberSince(activeRequest.user)}</span>
                                      </div>
                                    </div>

                                    {/* Additional Info Section */}
                                    <div style={{ borderTop: "1px solid var(--ce-border)", paddingTop: "12px" }}>
                                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--ce-text-muted)", textTransform: "uppercase" }}>Additional Info</span>
                                      <p style={{ fontSize: "0.82rem", color: "var(--ce-text)", margin: "4px 0 0 0", fontStyle: "italic" }}>
                                        No additional information available for this user request.
                                      </p>
                                    </div>

                                    {/* Action Buttons Footer inside inspector */}
                                    <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                                      <button
                                        onClick={() => handleRespondRequest(activeRequest.roomId, activeRequest.user?._id || activeRequest.user, "accept")}
                                        style={{ flex: 1, padding: "12px 18px", borderRadius: "10px", background: "#10b981", color: "#fff", border: "none", fontWeight: "700", fontSize: "0.84rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)", transition: "transform 0.15s ease" }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                      >
                                        <Check size={16} /> Accept Request
                                      </button>
                                      <button
                                        onClick={() => handleRespondRequest(activeRequest.roomId, activeRequest.user?._id || activeRequest.user, "reject")}
                                        style={{ flex: 1, padding: "12px 18px", borderRadius: "10px", background: "#ef4444", color: "#fff", border: "none", fontWeight: "700", fontSize: "0.84rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)", transition: "transform 0.15s ease" }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                                      >
                                        <X size={16} /> Reject Request
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "240px", border: "1px dashed var(--ce-border)", borderRadius: "12px", padding: "32px", color: "var(--ce-text-muted)" }}>
                                    <ShieldAlert size={28} style={{ marginBottom: "8px" }} />
                                    <p style={{ margin: 0, fontSize: "0.82rem", textAlign: "center" }}>Select an incoming request to view detailed profile metadata</p>
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* TAB CONTENT: SENT REQUESTS */}
                  {roomRequestsTab === "sent" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {mySentRequests.length === 0 ? (
                        <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center" }}>
                          <Send size={32} className="empty-state-icon" style={{ color: "var(--ce-primary)", marginBottom: "12px" }} />
                          <h3 style={{ margin: "0 0 6px 0", color: "var(--ce-text-h)" }}>No Sent Access Requests</h3>
                          <p style={{ margin: 0, color: "var(--ce-text-muted)", fontSize: "0.84rem" }}>
                            You haven't submitted join requests to any private workspaces recently.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {mySentRequests.map(req => (
                            <div
                              key={req.roomId}
                              style={{
                                background: activeTheme === "light" ? "#fff" : "var(--ce-surface-card)",
                                border: "1px solid var(--ce-border)",
                                borderRadius: "10px",
                                padding: "16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "16px"
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--ce-text-h)" }}>{req.title}</span>
                                  <span style={{ fontSize: "0.68rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(139, 92, 246, 0.12)", color: "var(--ce-primary)", fontWeight: "700", textTransform: "uppercase" }}>{req.language}</span>
                                </div>
                                <span style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)" }}>
                                  Room Owner: <strong>{req.createdBy?.username || "Owner"}</strong> ({req.createdBy?.email})
                                </span>
                              </div>

                              <div>
                                {req.status === "pending" && (
                                  <span style={{ fontSize: "0.78rem", fontWeight: "700", padding: "6px 14px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "16px" }}>
                                    ⏳ Pending Approval
                                  </span>
                                )}
                                {req.status === "rejected" && (
                                  <span style={{ fontSize: "0.78rem", fontWeight: "700", padding: "6px 14px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "16px" }}>
                                    ❌ Request Declined
                                  </span>
                                )}
                                {req.status === "accepted" && (
                                  <button
                                    onClick={() => proceedJoinRoom(req.roomId)}
                                    style={{ padding: "6px 16px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer" }}
                                  >
                                    Enter Approved Room
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            );
          })()}

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
                {/* Stats Header for Live Rooms - Redesigned as Hanging Lamps (No shadows/glows) */}
                <div className="ce-lamp-hanger-container" style={{ position: "relative", width: "100%", padding: "6px 0 30px 0", marginBottom: "24px", display: "flex", justifyContent: "center", gap: "50px", flexWrap: "wrap", zIndex: 10 }}>

                  {/* The horizontal wooden/metallic stick support */}
                  <div className="ce-lamp-support-stick" style={{
                    position: "absolute",
                    top: "0px",
                    left: "0%",
                    width: "100%",
                    height: "6px",
                    background: "linear-gradient(to right, #2d3748, #4a5568, #718096, #4a5568, #2d3748)",
                    borderRadius: "0px",
                    boxShadow: "none",
                    zIndex: 1
                  }} />

                  {/* Lamp 1: Active Live Rooms */}
                  <div className="ce-hanging-lamp-card-wrapper">
                    {/* The rope */}
                    <div className="ce-lamp-rope" style={{
                      width: "3px",
                      height: "40px",
                      background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                      boxShadow: "none"
                    }} />
                    {/* The metal fixture/cap at the top of the lamp */}
                    <div className="ce-lamp-cap" style={{
                      width: "20px",
                      height: "8px",
                      background: "#4a5568",
                      borderRadius: "4px 4px 0 0",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "none",
                      marginBottom: "-1px"
                    }} />
                    {/* The card body (lamp itself) */}
                    <div className="ce-hanging-lamp-card green-lamp">
                      <div className="stat-card-icon-wrapper green-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                        <Activity size={18} />
                      </div>
                      <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Active Rooms</span>
                      <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#34d399", marginTop: "4px", zIndex: 1 }}>{liveRooms.length}</span>
                    </div>
                  </div>

                  {/* Lamp 2: Active Developers Online */}
                  <div className="ce-hanging-lamp-card-wrapper">
                    {/* The rope */}
                    <div className="ce-lamp-rope" style={{
                      width: "3px",
                      height: "40px",
                      background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                      boxShadow: "none"
                    }} />
                    {/* The metal fixture/cap at the top of the lamp */}
                    <div className="ce-lamp-cap" style={{
                      width: "20px",
                      height: "8px",
                      background: "#4a5568",
                      borderRadius: "4px 4px 0 0",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "none",
                      marginBottom: "-1px"
                    }} />
                    {/* The card body (lamp itself) */}
                    <div className="ce-hanging-lamp-card yellow-lamp">
                      <div className="stat-card-icon-wrapper amber-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                        <Users size={18} />
                      </div>
                      <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Active Developers</span>
                      <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px", zIndex: 1 }}>
                        {liveRooms.reduce((acc, r) => acc + (r.activeUsersCount || 0), 0)}
                      </span>
                    </div>
                  </div>

                  {/* Lamp 3: Total Rooms Created */}
                  <div className="ce-hanging-lamp-card-wrapper">
                    {/* The rope */}
                    <div className="ce-lamp-rope" style={{
                      width: "3px",
                      height: "40px",
                      background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                      boxShadow: "none"
                    }} />
                    {/* The metal fixture/cap at the top of the lamp */}
                    <div className="ce-lamp-cap" style={{
                      width: "20px",
                      height: "8px",
                      background: "#4a5568",
                      borderRadius: "4px 4px 0 0",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow: "none",
                      marginBottom: "-1px"
                    }} />
                    {/* The card body (lamp itself) */}
                    <div className="ce-hanging-lamp-card purple-lamp">
                      <div className="stat-card-icon-wrapper purple-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                        <FolderGit size={18} />
                      </div>
                      <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Total Rooms Created</span>
                      <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#a78bfa", marginTop: "4px", zIndex: 1 }}>
                        {historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "12px", flexWrap: "wrap", marginBottom: "0px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 className="section-title" style={{ color: "#10b981", fontSize: "1.1rem", fontWeight: "600", margin: "0 0 -4px" }}>Live Workspace</h3>
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
                  <div className="ce-empty-workspace-card">
                    <div className="ce-radar-container">
                      <div className="ce-radar-ring ring-1" />
                      <div className="ce-radar-ring ring-2" />
                      <div className="ce-radar-ring ring-3" />
                      <div className="ce-radar-center">
                        <Terminal size={28} className="ce-radar-icon" />
                      </div>
                    </div>

                    <h3 className="ce-empty-title">No Active Workspaces Found</h3>


                    <button
                      className="ce-premium-create-room-btn"
                      onClick={() => {
                        setFormData({ title: "", language: "javascript", isPrivate: false });
                        setShowQuickCreateModal(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Launch Your Room</span>
                    </button>
                  </div>
                ) : (() => {
                  const filteredLive = (liveRooms || []).filter(room => {
                    if (!room) return false;
                    const term = (publicRoomsSearch || "").toLowerCase();
                    const title = (room.title || "").toLowerCase();
                    const roomId = (room.roomId || "").toLowerCase();
                    return title.includes(term) || roomId.includes(term);
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
                      onClick={() => navigate("/dashboard/rooms?subtab=explore")}
                    >
                      <Globe size={14} /> Explore Rooms
                    </button>
                  </div>
                ) : (() => {
                  const filteredBookmarks = (savedRooms || []).filter(room => {
                    if (!room) return false;
                    const term = (bookmarkSearch || "").toLowerCase();
                    const title = (room.title || "").toLowerCase();
                    const roomId = (room.roomId || "").toLowerCase();
                    return title.includes(term) || roomId.includes(term);
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
              <DeveloperFeed
                user={user}
                addToast={addToast}
                followingList={followingList}
                handleFollowToggle={handleFollowToggle}
                onViewProfile={handleViewUserProfile}
                suggestions={suggestions}
                onOpenPost={handleOpenPostModal}
                onlineUsers={onlineFollows}
              />
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
                    <NetworkAnalytics addToast={addToast} user={user} />
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
                                            <img
                                              src={dev.avatar}
                                              alt={dev.username}
                                              className="dev-card-avatar"
                                              style={{ cursor: "pointer" }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.handleGlobalProfileNav) {
                                                  window.handleGlobalProfileNav(dev._id || dev.id, dev.username);
                                                } else {
                                                  handleViewUserProfile(dev._id || dev.id);
                                                }
                                              }}
                                              title={`View @${dev.username}'s profile`}
                                            />
                                          ) : (
                                            <div
                                              className="dev-card-avatar-fallback"
                                              style={{ backgroundColor: getAvatarColor(dev.username), cursor: "pointer" }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.handleGlobalProfileNav) {
                                                  window.handleGlobalProfileNav(dev._id || dev.id, dev.username);
                                                } else {
                                                  handleViewUserProfile(dev._id || dev.id);
                                                }
                                              }}
                                              title={`View @${dev.username}'s profile`}
                                            >
                                              {(dev.username || "D").charAt(0).toUpperCase()}
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
                                          <span className="dev-card-title" style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{dev.title || "Developer"}</span>
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
                                              navigate("/dashboard/messages");
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
                                          {(dev.username || "D").charAt(0).toUpperCase()}
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
              <div className="ce-lamp-hanger-container" style={{ position: "relative", width: "100%", padding: "6px 0 30px 0", marginBottom: "24px", display: "flex", justifyContent: "center", gap: "50px", flexWrap: "wrap", zIndex: 10 }}>
                {/* The horizontal wooden/metallic stick support */}
                <div className="ce-lamp-support-stick" style={{
                  position: "absolute",
                  top: "0px",
                  left: "0%",
                  width: "100%",
                  height: "6px",
                  background: "linear-gradient(to right, #2d3748, #4a5568, #718096, #4a5568, #2d3748)",
                  borderRadius: "0px",
                  boxShadow: "none",
                  zIndex: 1
                }} />

                {/* Lamp 1: Platform Developers */}
                <div className="ce-hanging-lamp-card-wrapper">
                  {/* The rope */}
                  <div className="ce-lamp-rope" style={{
                    width: "3px",
                    height: "40px",
                    background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                    boxShadow: "none"
                  }} />
                  {/* The metal fixture/cap at the top of the lamp */}
                  <div className="ce-lamp-cap" style={{
                    width: "20px",
                    height: "8px",
                    background: "#4a5568",
                    borderRadius: "4px 4px 0 0",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "none",
                    marginBottom: "-1px"
                  }} />
                  {/* The card body (lamp itself) */}
                  <div className="ce-hanging-lamp-card green-lamp">
                    <div className="stat-card-icon-wrapper green-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                      <Users size={18} />
                    </div>
                    <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Platform Developers</span>
                    <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#34d399", marginTop: "4px", zIndex: 1 }}>{leaderboardData.length}</span>
                  </div>
                </div>

                {/* Lamp 2: Your Global Rank */}
                <div className="ce-hanging-lamp-card-wrapper">
                  {/* The rope */}
                  <div className="ce-lamp-rope" style={{
                    width: "3px",
                    height: "40px",
                    background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                    boxShadow: "none"
                  }} />
                  {/* The metal fixture/cap at the top of the lamp */}
                  <div className="ce-lamp-cap" style={{
                    width: "20px",
                    height: "8px",
                    background: "#4a5568",
                    borderRadius: "4px 4px 0 0",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "none",
                    marginBottom: "-1px"
                  }} />
                  {/* The card body (lamp itself) */}
                  <div className="ce-hanging-lamp-card yellow-lamp">
                    <div className="stat-card-icon-wrapper amber-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                      <Trophy size={18} />
                    </div>
                    <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Your Global Rank</span>
                    <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#fbbf24", marginTop: "4px", zIndex: 1 }}>
                      {(() => {
                        const myIndex = leaderboardData.findIndex(item => String(item.userId) === String(user?.id || user?._id));
                        return myIndex !== -1 ? `#${myIndex + 1}` : "N/A";
                      })()}
                    </span>
                  </div>
                </div>

                {/* Lamp 3: Highest Score */}
                <div className="ce-hanging-lamp-card-wrapper">
                  {/* The rope */}
                  <div className="ce-lamp-rope" style={{
                    width: "3px",
                    height: "40px",
                    background: "linear-gradient(to bottom, #4a5568, #1a202c, #718096)",
                    boxShadow: "none"
                  }} />
                  {/* The metal fixture/cap at the top of the lamp */}
                  <div className="ce-lamp-cap" style={{
                    width: "20px",
                    height: "8px",
                    background: "#4a5568",
                    borderRadius: "4px 4px 0 0",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "none",
                    marginBottom: "-1px"
                  }} />
                  {/* The card body (lamp itself) */}
                  <div className="ce-hanging-lamp-card purple-lamp">
                    <div className="stat-card-icon-wrapper purple-theme-wrapper" style={{ marginBottom: "12px", zIndex: 1 }}>
                      <Flame size={18} style={{ color: "#ff7b00" }} />
                    </div>
                    <span className="stat-card-label" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--ce-text-muted)", zIndex: 1 }}>Highest Score</span>
                    <span className="stat-card-val" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#a78bfa", marginTop: "4px", zIndex: 1 }}>
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
                            {(leaderboardData[1].username || "D").charAt(0).toUpperCase()}
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
                            {(leaderboardData[0].username || "D").charAt(0).toUpperCase()}
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
                            {(leaderboardData[2].username || "D").charAt(0).toUpperCase()}
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
                                        {(item.username || "D").charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontWeight: "700", color: "var(--ce-text-h)" }}>{item.username} {isCurrentUser ? "(you)" : ""}</span>
                                      <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title || "Developer"}</span>
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
                {/* Mobile Action Buttons (Visible only on Mobile < 768px) */}
                <div className="mobile-explore-actions-bar">
                  <button
                    type="button"
                    className="mobile-action-trigger-btn create-btn"
                    onClick={() => setShowMobileCreateModal(true)}
                  >
                    <Plus size={16} /> Create Room
                  </button>
                  <button
                    type="button"
                    className="mobile-action-trigger-btn join-btn"
                    onClick={() => setShowMobileJoinModal(true)}
                  >
                    <LogIn size={16} /> Join Room
                  </button>
                </div>

                <div className="rooms-split-layout">
                  {/* Left Side: Actions (Desktop Inline Forms) */}
                  <div className="rooms-actions-sidebar">
                    {/* CREATE WORKSPACE */}
                    <div className="action-form-card">
                      <div className="form-card-header">
                        <Plus size={18} className="form-icon" />
                        <h3>Create Workspace Room</h3>
                      </div>
                      <form onSubmit={handleCreateRoom} className="compact-form">
                        <div className="form-field">
                          <label htmlFor="create-room-title-1">Workspace Title</label>
                          <input
                            id="create-room-title-1"
                            type="text"
                            placeholder="e.g. DSA Practice Prep"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            disabled={isCreatingRoom}
                          />
                        </div>

                        <div className="form-field">
                          <label htmlFor="create-room-lang-1">Language</label>
                          <select
                            id="create-room-lang-1"
                            value={formData.language}
                            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                            disabled={isCreatingRoom}
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="cpp">C++</option>
                            <option value="java">Java</option>
                            <option value="html">HTML, CSS & JavaScript</option>
                          </select>
                        </div>

                        <div className="form-field">
                          <label htmlFor="create-room-privacy-1">Privacy Type</label>
                          <select
                            id="create-room-privacy-1"
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

                        {recentJoinedCodes && recentJoinedCodes.length > 0 && (
                          <div className="recent-rooms-history-container">
                            <span className="recent-history-label">Recent Room IDs</span>
                            <div className="recent-history-chips">
                              {recentJoinedCodes.map((code) => (
                                <button
                                  key={code}
                                  type="button"
                                  className="recent-history-chip"
                                  onClick={() => setRoomId(code)}
                                  title={`Use recent ID: ${code}`}
                                >
                                  {code}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button type="submit" className="form-submit-btn secondary" style={{ marginTop: "6px" }}>
                          Join Workspace Session
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* MOBILE CREATE ROOM POPUP MODAL */}
                  {showMobileCreateModal && (
                    <div className="mobile-popup-overlay" onClick={() => setShowMobileCreateModal(false)}>
                      <div className="mobile-popup-card glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-popup-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Plus size={18} style={{ color: "#aa3bff" }} />
                            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ce-text-h)" }}>Create Workspace Room</h3>
                          </div>
                          <button type="button" className="mobile-popup-close" onClick={() => setShowMobileCreateModal(false)}>
                            <X size={18} />
                          </button>
                        </div>

                        <form onSubmit={(e) => { handleCreateRoom(e); setShowMobileCreateModal(false); }} className="compact-form" style={{ marginTop: "14px" }}>
                          <div className="form-field">
                            <label htmlFor="create-room-title-2">Workspace Title</label>
                            <input
                              id="create-room-title-2"
                              type="text"
                              placeholder="e.g. DSA Practice Prep"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              required
                              disabled={isCreatingRoom}
                            />
                          </div>

                          <div className="form-field">
                            <label htmlFor="create-room-lang-2">Language</label>
                            <select
                              id="create-room-lang-2"
                              value={formData.language}
                              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                              disabled={isCreatingRoom}
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                              <option value="java">Java</option>
                              <option value="html">HTML, CSS & JavaScript</option>
                            </select>
                          </div>

                          <div className="form-field">
                            <label htmlFor="create-room-privacy-2">Privacy Type</label>
                            <select
                              id="create-room-privacy-2"
                              value={formData.isPrivate}
                              onChange={(e) => setFormData({ ...formData, isPrivate: e.target.value === "true" })}
                              disabled={isCreatingRoom}
                            >
                              <option value="false">Public</option>
                              <option value="true">Private (Requires Approval)</option>
                            </select>
                          </div>

                          <button type="submit" className="form-submit-btn" style={{ marginTop: "12px", width: "100%" }} disabled={isCreatingRoom}>
                            {isCreatingRoom && <span className="btn-spinner"></span>}
                            {isCreatingRoom ? "Creating Workspace..." : "Create Room Workspace"}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* MOBILE JOIN ROOM POPUP MODAL */}
                  {showMobileJoinModal && (
                    <div className="mobile-popup-overlay" onClick={() => setShowMobileJoinModal(false)}>
                      <div className="mobile-popup-card glass-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="mobile-popup-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <LogIn size={18} style={{ color: "#3b82f6" }} />
                            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--ce-text-h)" }}>Join Room Workspace</h3>
                          </div>
                          <button type="button" className="mobile-popup-close" onClick={() => setShowMobileJoinModal(false)}>
                            <X size={18} />
                          </button>
                        </div>

                        <form onSubmit={(e) => { handleJoinRoom(e); setShowMobileJoinModal(false); }} className="compact-form" style={{ marginTop: "14px" }}>
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

                          <button type="submit" className="form-submit-btn secondary" style={{ marginTop: "12px", width: "100%" }}>
                            Join Workspace Session
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Right Side: Explorer tabs */}
                  <div className="rooms-explorer-content">
                    {/* Segmented Pill Switcher with Round Sliding Background & Tab Actions */}
                    <div className="ce-pill-switcher-container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
                      <div className="ce-pill-switcher" style={{ maxWidth: "780px", flexShrink: 0 }}>
                        <div
                          className="ce-pill-bg-slide"
                          style={{
                            width: "calc(25% - 2px)",
                            transform: `translateX(${(roomsTab === "public" ? 0 : roomsTab === "myrooms" ? 1 : roomsTab === "requests" ? 2 : 3) * 100}%)`
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
                        <button
                          type="button"
                          className={`ce-pill-btn ${roomsTab === "history" ? "active" : ""}`}
                          onClick={() => setRoomsTab("history")}
                        >
                          Room History ({historyRooms.length})
                        </button>
                      </div>

                      {/* Dynamic Tab Controls (Search / Filters) aligned on the right */}
                      <div className="tab-level-controls" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        {roomsTab === "public" && publicRooms.length > 0 && (
                          <div className="section-search-container" style={{ margin: 0 }}>
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

                        {roomsTab === "myrooms" && historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id).length > 0 && (
                          <div className="section-search-container" style={{ margin: 0 }}>
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

                        {roomsTab === "history" && historyRooms.length > 0 && (
                          <div className="history-table-controls" style={{ margin: 0, background: "none", border: "none", padding: 0, display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <div className="search-bar-container" style={{ margin: 0 }}>
                              <Search size={14} className="control-search-icon" />
                              <input
                                type="text"
                                placeholder="Search room name or ID..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                aria-label="Search history room name or ID"
                              />
                            </div>

                            <select
                              value={historyFilterLang}
                              onChange={(e) => setHistoryFilterLang(e.target.value)}
                              style={{ background: activeTheme === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", height: "36px" }}
                              aria-label="Filter history list by language"
                            >
                              <option value="all">All Languages</option>
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                              <option value="java">Java</option>
                              <option value="html">HTML/CSS/JS</option>
                            </select>

                            <select
                              value={historySortBy}
                              onChange={(e) => setHistorySortBy(e.target.value)}
                              style={{ background: activeTheme === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", height: "36px" }}
                              aria-label="Sort history items"
                            >
                              <option value="recent">Sort by: Recent</option>
                              <option value="name">Sort by: Name</option>
                              <option value="created">Sort by: Date Created</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {roomsTab === "public" && (
                      <div className="rooms-explorer-tab-content-wrapper" style={{ marginTop: "8px" }}>

                        {isFetchingData ? (
                          <div className="modal-loader-container" style={{ minHeight: "200px" }}>
                            <div className="modal-roller-spinner">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                            <p style={{ color: "var(--ce-text-muted)", fontSize: "0.88rem" }}>Loading public workspaces...</p>
                          </div>
                        ) : publicRooms.length === 0 ? (
                          <div className="empty-state-card">
                            <Globe size={18} className="empty-state-icon" />
                            <p>No public workspaces found. Be the first to create one!</p>
                          </div>
                        ) : (() => {
                          const filteredPublic = publicRooms.filter(room => {
                            const term = publicRoomsSearch.toLowerCase();
                            return (room.title || "").toLowerCase().includes(term) || (room.roomId || "").toLowerCase().includes(term);
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
                            <div className="public-rooms-scroll-wrapper">
                              <div className="rooms-grid-explore">
                                {filteredPublic
                                  .slice(0, showAllPublicRooms ? undefined : 6)
                                  .map(room => renderRoomCard(room))}
                              </div>
                              {filteredPublic.length > 6 && (
                                <div style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "16px" }}>
                                  <button
                                    onClick={() => setShowAllPublicRooms(!showAllPublicRooms)}
                                    className="split-column-toggle-btn"
                                    style={{ margin: "0 auto" }}
                                  >
                                    <span>{showAllPublicRooms ? "Show Less" : "Show All"}</span>
                                    <ChevronDown size={14} style={{ transform: showAllPublicRooms ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {roomsTab === "myrooms" && (
                      <div className="rooms-explorer-tab-content-wrapper" style={{ marginTop: "8px" }}>

                        {isFetchingData ? (
                          <div className="modal-loader-container" style={{ minHeight: "200px" }}>
                            <div className="modal-roller-spinner">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                            <p style={{ color: "var(--ce-text-muted)", fontSize: "0.88rem" }}>Loading owned workspaces...</p>
                          </div>
                        ) : (() => {
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
                            return (room.title || "").toLowerCase().includes(term) || (room.roomId || "").toLowerCase().includes(term);
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
                      <div className="rooms-explorer-tab-content-wrapper" style={{ marginTop: "8px" }}>

                        {isFetchingData ? (
                          <div className="modal-loader-container" style={{ minHeight: "200px" }}>
                            <div className="modal-roller-spinner">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                            <p style={{ color: "var(--ce-text-muted)", fontSize: "0.88rem" }}>Loading requests...</p>
                          </div>
                        ) : mySentRequests.length === 0 ? (
                          <div className="empty-state-card">
                            <Terminal size={18} className="empty-state-icon" />
                            <p>You haven't requested to join any private rooms yet.</p>
                          </div>
                        ) : (
                          <div className="rooms-requests-list-container" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {mySentRequests.map((req) => (
                              <div
                                key={req.roomId}
                                className="social-activity-card"
                                style={{
                                  padding: "16px",
                                  background: activeTheme === "light" ? "var(--ce-surface-card)" : "rgba(255, 255, 255, 0.02)",
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
                                    <span className="lang-badge" style={{ fontSize: "0.65rem", padding: "2px 6px", background: activeTheme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)", borderRadius: "4px", textTransform: "uppercase", color: "var(--ce-text-muted)" }}>
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

                    {roomsTab === "history" && (
                      <div className="rooms-explorer-tab-content-wrapper" style={{ marginTop: "8px" }}>

                        {isFetchingData ? (
                          <div className="modal-loader-container" style={{ minHeight: "200px" }}>
                            <div className="modal-roller-spinner">
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                            <p style={{ color: "var(--ce-text-muted)", fontSize: "0.88rem" }}>Loading workspace history...</p>
                          </div>
                        ) : (
                          <div className="history-table-wrapper" style={{ overflowX: "auto", background: activeTheme === "light" ? "var(--ce-surface-card)" : "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "12px" }}>
                            <table className="history-data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--ce-border)", background: "rgba(255,255,255,0.02)" }}>
                                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Room Workspace</th>
                                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Language</th>
                                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Participants</th>
                                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Owner</th>
                                  <th style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Last Activity</th>
                                  <th style={{ padding: "14px 16px", textAlign: "right", fontSize: "0.8rem", fontWeight: "600", color: "var(--ce-text-muted)" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredHistory.length === 0 ? (
                                  <tr>
                                    <td colSpan="6" style={{ padding: "32px", textAlign: "center", color: "var(--ce-text-muted)", fontSize: "0.85rem" }}>No rooms match your filter.</td>
                                  </tr>
                                ) : (
                                  filteredHistory.map(room => {
                                    const isOwner = room.createdBy?._id === user?.id || room.createdBy === user?.id || room.createdBy?._id === user?._id || room.createdBy === user?._id;
                                    return (
                                      <tr key={room.roomId} style={{ borderBottom: "1px solid var(--ce-border)", transition: "background 0.2s" }} className="table-row-hover">
                                        <td style={{ padding: "14px 16px" }}>
                                          <div style={{ fontWeight: "700", fontSize: "0.92rem", color: "var(--ce-text)", display: "flex", alignItems: "center", gap: "6px" }}><Terminal size={14} style={{ color: "var(--ce-accent)" }} /> {room.title}</div>
                                          <div style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", marginTop: "2px" }}>{room.roomId}</div>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                          <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", textTransform: "uppercase", fontWeight: "600", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                          <span style={{ fontSize: "0.8rem", color: "var(--ce-text)" }}>{room.participants?.length || 1} online</span>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                          <span style={{ fontSize: "0.8rem", color: "var(--ce-text)" }}>{isOwner ? "You" : room.createdBy?.username || "Collaborator"}</span>
                                        </td>
                                        <td style={{ padding: "14px 16px" }}>
                                          <span style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)" }}>{new Date(room.updatedAt).toLocaleDateString()}</span>
                                        </td>
                                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                                          <button
                                            onClick={() => handleJoinRoomDirect(room.roomId)}
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
                      aria-label="Search workspace rooms history"
                    />
                  </div>

                  <div className="filter-controls">
                    <SlidersHorizontal size={14} />
                    <select value={historyFilterLang} onChange={(e) => setHistoryFilterLang(e.target.value)} aria-label="Filter history list by language">
                      <option value="all">All Languages</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="html">HTML/CSS/JS</option>
                    </select>

                    <select value={historySortBy} onChange={(e) => setHistorySortBy(e.target.value)} aria-label="Sort history list items">
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
                                <div className="table-room-title"><Terminal size={13} style={{ marginRight: "6px", color: "var(--ce-accent)", verticalAlign: "middle" }} />{room.title}</div>
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
                addToast={addToast}
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
                            if (notif.targetPost) {
                              notifIcon = <Heart size={14} style={{ color: "var(--ce-primary)" }} />;
                              actionText = `liked your post "${getPostSnippet(notif.targetPost)}"`;
                              typeClass = "notif-type-like";
                            } else {
                              notifIcon = <Heart size={14} style={{ color: "#10b981" }} />;
                              actionText = `liked your room "${roomTitle}"`;
                              typeClass = "notif-type-room-like";
                            }
                          } else if (notif.type === "COMMENT") {
                            notifIcon = <MessageSquare size={14} style={{ color: "var(--ce-accent)" }} />;
                            actionText = `commented on your post "${getPostSnippet(notif.targetPost)}"`;
                            typeClass = "notif-type-comment";
                          } else if (notif.type === "BOOKMARK") {
                            notifIcon = <Bookmark size={14} style={{ color: "#10b981" }} />;
                            actionText = `bookmarked your room "${roomTitle}"`;
                            typeClass = "notif-type-bookmark";
                          } else if (notif.type === "JOIN") {
                            notifIcon = <ShieldAlert size={14} style={{ color: "#10b981" }} />;
                            actionText = `wants to join "${roomTitle}"`;
                            typeClass = "notif-type-join";
                          } else if (notif.type === "INVITE") {
                            notifIcon = <Mail size={14} style={{ color: "#10b981" }} />;
                            actionText = `invited you to join workspace "${roomTitle}"`;
                            typeClass = "notif-type-invite";
                          } else if (notif.type === "JOIN_APPROVED") {
                            notifIcon = <ShieldCheck size={14} style={{ color: "#10b981" }} />;
                            actionText = `approved your join request to "${roomTitle}"`;
                            typeClass = "notif-type-invite";
                          } else if (notif.type === "MODERATION_ACTION") {
                            notifIcon = <ShieldAlert size={14} style={{ color: "#ef4444" }} />;
                            actionText = notif.message || "sent you a moderation alert";
                            typeClass = "notif-type-moderation";
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
                                <div
                                  className="notif-sender-avatar-container"
                                  style={{ backgroundColor: senderAvatar ? "transparent" : getAvatarColor(senderName), cursor: "pointer" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const senderId = notif.sender?._id || notif.sender?.id;
                                    if (senderId) handleViewUserProfile(senderId);
                                  }}
                                >
                                  {senderAvatar ? (
                                    <img src={senderAvatar} alt={senderName} className="notif-sender-img" />
                                  ) : (
                                    <span className="notif-sender-initial">{(senderName || "D").charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="notif-main-info">
                                  <div className="notif-text-message">
                                    {notif.type === "MODERATION_ACTION" ? (
                                      <span>{notif.message}</span>
                                    ) : (
                                      <>
                                        <strong
                                          className="notif-sender-name-link"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const senderId = notif.sender?._id || notif.sender?.id;
                                            if (senderId) handleViewUserProfile(senderId);
                                          }}
                                        >
                                          {senderName}
                                        </strong> {actionText}
                                      </>
                                    )}
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
                                      {!notif.isUsed ? (
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

                                  {notif.type === "JOIN_APPROVED" && (
                                    <div style={{ marginTop: "4px" }}>
                                      {!notif.isUsed ? (
                                        <div style={{ display: "flex", gap: "8px" }}>
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                await proceedJoinRoom(roomLink);
                                                // Mark locally as used/read
                                                setNotificationsList(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true, isUsed: true } : n));
                                              } catch (err) {
                                                console.error(err);
                                              }
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
                                        </div>
                                      ) : (
                                        <span className="notif-action-status-label" style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>
                                          Request processed
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
                                {roomLink && notif.type !== "JOIN" && !notif.isUsed && (
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
                            ? `url(${optimizeCloudinaryUrl(viewingUserProfile ? viewingUserProfile.coverBanner : user.coverBanner, { quality: "best", width: 1200 })}) center/cover no-repeat`
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
                        {viewingUserProfile ? (
                          <button
                            onClick={handleReturnToMyProfile}
                            style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              background: "rgba(15, 23, 42, 0.88)",
                              backdropFilter: "blur(8px)",
                              color: "#ffffff",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              borderRadius: "20px",
                              padding: "6px 14px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              zIndex: 10,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                            }}
                          >
                            <User size={13} />
                            <span>Return to My Profile</span>
                          </button>
                        ) : (
                          <>
                            <div className="banner-edit-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s ease", color: "#fff", fontSize: "0.7rem", fontWeight: "600" }}>
                              Change Banner
                            </div>
                            {user?.coverBanner && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCoverBannerDelete();
                                }}
                                style={{
                                  position: "absolute",
                                  top: "10px",
                                  right: "10px",
                                  background: "rgba(239, 68, 68, 0.9)",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "28px",
                                  height: "28px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  zIndex: 11,
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                                  transition: "all 0.2s ease"
                                }}
                                title="Delete cover banner"
                                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1.0)"}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
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
                            <div
                              onClick={() => {
                                if (window.showAvatarPreview) {
                                  window.showAvatarPreview(viewingUserProfile.avatar || "", viewingUserProfile.username);
                                }
                              }}
                              title={`View @${viewingUserProfile.username}'s profile`}
                              style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: viewingUserProfile.avatar ? "transparent" : getAvatarColor(viewingUserProfile.username), fontSize: "1.8rem", color: "#fff", fontWeight: "600", border: "4px solid var(--ce-surface-card)", cursor: "pointer" }}
                            >
                              {viewingUserProfile.avatar ? (
                                <img src={optimizeCloudinaryUrl(viewingUserProfile.avatar, { quality: "best", width: 160, height: 160, crop: "fill" })} alt={viewingUserProfile.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                (viewingUserProfile.username || "D").charAt(0).toUpperCase()
                              )}
                            </div>
                          ) : (
                            <div>
                              <ProfileAvatar />
                            </div>
                          )}
                        </div>

                        <h2 style={{ display: "inline-flex", alignItems: "center" }}>
                          {viewingUserProfile ? viewingUserProfile.username : user?.username}
                          {renderSubscriptionBadge(viewingUserProfile || user)}
                        </h2>
                        <span className="profile-email">{!viewingUserProfile ? user?.email : ""}</span>
                        {(viewingUserProfile ? viewingUserProfile.location : user?.location) && (
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--ce-text-muted)", marginTop: "4px", marginBottom: "4px" }}>
                            <MapPin size={12} style={{ color: "var(--ce-accent)" }} />
                            <span>{viewingUserProfile ? viewingUserProfile.location : user?.location}</span>
                          </div>
                        )}
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
                              <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Professional Title</label>
                              <input
                                type="text"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                placeholder="e.g. Full Stack Developer, UI Designer"
                                className="profile-edit-input"
                                style={{ width: "100%", background: "var(--ce-surface-card)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem" }}
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
                            <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Location</label>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                  type="text"
                                  value={locationInput}
                                  onChange={(e) => setLocationInput(e.target.value)}
                                  placeholder="e.g. Bengaluru, Karnataka"
                                  className="profile-edit-input"
                                  style={{ flex: 1, minWidth: 0, background: "var(--ce-surface-card)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem" }}
                                />
                                <button
                                  type="button"
                                  onClick={handleAutoLocate}
                                  style={{
                                    padding: "8px 12px",
                                    background: "var(--ce-accent)",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.72rem",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    flexShrink: 0
                                  }}
                                >
                                  <MapPin size={12} /> Locate
                                </button>
                              </div>
                              {/* Interactive SVG India Picker Map with State Borders and names */}
                              <div style={{ position: "relative", width: "100%", height: "180px", background: activeTheme === "light" ? "rgba(0,0,0,0.01)" : "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "4px", overflow: "hidden", marginTop: "4px" }}>
                                <span style={{ position: "absolute", top: "4px", left: "6px", fontSize: "0.55rem", fontWeight: "750", color: "var(--ce-text-muted)" }}>
                                  CLICK A HUB ON INDIA MAP
                                </span>
                                <svg viewBox="120 10 220 200" style={{ width: "100%", height: "100%" }}>
                                  {/* Indian States with Borders */}
                                  {INDIA_STATES.map((state) => (
                                    <path
                                      key={state.name}
                                      d={state.d}
                                      fill={activeTheme === "light" ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.02)"}
                                      stroke={activeTheme === "light" ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.12)"}
                                      strokeWidth="0.8"
                                    />
                                  ))}
                                  {/* Indian States Labels */}
                                  {INDIA_STATES.map((state) => (
                                    <text
                                      key={state.name}
                                      x={state.labelX}
                                      y={state.labelY}
                                      fill={activeTheme === "light" ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.25)"}
                                      fontSize="5"
                                      fontWeight="650"
                                      textAnchor="middle"
                                      pointerEvents="none"
                                    >
                                      {state.name}
                                    </text>
                                  ))}
                                  {/* Cities */}
                                  {INDIA_CITIES.map(city => {
                                    const isSelected = locationInput.toLowerCase().includes(city.name.toLowerCase());
                                    return (
                                      <g key={city.name} style={{ cursor: "pointer" }} onClick={() => setLocationInput(`${city.name}, India`)}>
                                        <circle
                                          cx={city.x}
                                          cy={city.y}
                                          r={isSelected ? "5" : "3"}
                                          fill={isSelected ? "var(--ce-accent)" : (activeTheme === "light" ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.4)")}
                                          style={{ transition: "all 0.2s" }}
                                        />
                                        {isSelected && (
                                          <circle cx={city.x} cy={city.y} r="10" fill="var(--ce-accent)" opacity="0.2">
                                            <animate attributeName="r" values="5;11" dur="1.2s" repeatCount="indefinite" />
                                            <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" />
                                          </circle>
                                        )}
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>
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

                            {/* Social / Professional Links */}
                            {Boolean(
                              (viewingUserProfile ? viewingUserProfile.githubUrl : user?.githubUrl) ||
                              (viewingUserProfile ? viewingUserProfile.linkedinUrl : user?.linkedinUrl) ||
                              (viewingUserProfile ? viewingUserProfile.portfolioUrl : user?.portfolioUrl)
                            ) && (
                                <div className="profile-socials-row" style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                                  {(viewingUserProfile ? viewingUserProfile.githubUrl : user?.githubUrl) && (
                                    <a
                                      href={viewingUserProfile ? viewingUserProfile.githubUrl : user.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="profile-social-badge"
                                      title="GitHub Profile"
                                    >
                                      <DashboardGithubIcon size={12} />
                                      <span>GitHub</span>
                                    </a>
                                  )}
                                  {(viewingUserProfile ? viewingUserProfile.linkedinUrl : user?.linkedinUrl) && (
                                    <a
                                      href={viewingUserProfile ? viewingUserProfile.linkedinUrl : user.linkedinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="profile-social-badge"
                                      title="LinkedIn Profile"
                                    >
                                      <DashboardLinkedinIcon size={12} />
                                      <span>LinkedIn</span>
                                    </a>
                                  )}
                                  {(viewingUserProfile ? viewingUserProfile.portfolioUrl : user?.portfolioUrl) && (
                                    <a
                                      href={viewingUserProfile ? viewingUserProfile.portfolioUrl : user.portfolioUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="profile-social-badge"
                                      title="Portfolio Website"
                                    >
                                      <Globe size={12} />
                                      <span>Portfolio</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            {viewingUserProfile && String(viewingUserProfile._id) !== String(user?.id || user?._id) && (() => {
                              const targetFollowers = viewingUserProfile.followers || [];
                              const targetFollowing = viewingUserProfile.following || [];
                              const realMutuals = followingList.filter(f => {
                                const fId = String(f._id || f);
                                return targetFollowers.some(id => String(id) === fId) || targetFollowing.some(id => String(id) === fId);
                              });
                              if (realMutuals.length === 0) return null;
                              const displayList = realMutuals.slice(0, 3);
                              const remainingCount = realMutuals.length - displayList.length;
                              return (
                                <div className="profile-mutual-connections-container" style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", marginTop: "16px", padding: "10px", background: "rgba(139, 92, 246, 0.03)", border: "1px solid var(--ce-border)", borderRadius: "4px" }}>
                                  <span style={{ fontSize: "0.68rem", fontWeight: "750", color: "var(--ce-primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Mutual Connections</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", position: "relative", flexShrink: 0 }}>
                                      {displayList.map((mUser, mIdx) => {
                                        const username = mUser.username || "Developer";
                                        return (
                                          <div
                                            key={mUser._id || mIdx}
                                            style={{
                                              width: "22px",
                                              height: "22px",
                                              borderRadius: "50%",
                                              overflow: "hidden",
                                              border: "1.5px solid var(--ce-surface-card)",
                                              background: mUser.avatar ? "transparent" : getAvatarColor(username),
                                              marginLeft: mIdx === 0 ? 0 : "-8px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "0.62rem",
                                              fontWeight: "700",
                                              color: "#fff",
                                              zIndex: 4 - mIdx
                                            }}
                                            title={`@${username}`}
                                          >
                                            {mUser.avatar ? (
                                              <img src={mUser.avatar} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                            ) : (
                                              username.charAt(0).toUpperCase()
                                            )}
                                          </div>
                                        );
                                      })}
                                      {remainingCount > 0 && (
                                        <div
                                          style={{
                                            width: "22px",
                                            height: "22px",
                                            borderRadius: "50%",
                                            background: "var(--ce-hover)",
                                            border: "1.5px solid var(--ce-surface-card)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.62rem",
                                            fontWeight: "750",
                                            color: "var(--ce-primary)",
                                            marginLeft: "-8px",
                                            zIndex: 0
                                          }}
                                        >
                                          +{remainingCount}
                                        </div>
                                      )}
                                    </div>
                                    <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", lineHeight: "1.3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={realMutuals.map(m => `@${m.username}`).join(", ")}>
                                      Followed by{" "}
                                      <strong>
                                        {displayList.map(m => `@${m.username}`).join(", ")}
                                      </strong>
                                      {remainingCount > 0 ? ` and ${remainingCount} others` : ""}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
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
                                        navigate("/dashboard/messages");
                                      }}
                                      style={{ flex: 1 }}
                                    >
                                      <MessageSquare size={14} /> Message
                                    </button>
                                  </div>
                                )}
                                <button
                                  className="profile-back-btn"
                                  onClick={() => navigate(user?.username ? `/u/${user.username}` : "/dashboard/profile")}
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
                              <Laptop size={14} style={{ color: "var(--ce-primary)" }} /> Rooms Hub
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

                              const getTabIcon = (id, active) => {
                                switch (id) {
                                  case "rooms": return <LayoutGrid size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px" }} />;
                                  case "liked": return <Heart size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px", fill: active ? "currentColor" : "none" }} />;
                                  case "saved": return <Bookmark size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px", fill: active ? "currentColor" : "none" }} />;
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
                                        {getTabIcon(tab.id, profileTab === tab.id)} {tab.label} {tab.count !== null ? `(${tab.count})` : ""}
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
                              <Megaphone size={14} style={{ color: "var(--ce-primary)" }} /> Feed & Social
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

                              const getTabIcon = (id, active) => {
                                switch (id) {
                                  case "posts": return <Image size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px" }} />;
                                  case "saved_posts": return <Bookmark size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px", fill: active ? "currentColor" : "none" }} />;
                                  case "activity": return <Activity size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px" }} />;
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
                                        {getTabIcon(tab.id, profileTab === tab.id)} {tab.label} {tab.count !== null ? `(${tab.count})` : ""}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                        </div>

                        <div className="profile-tab-content">
                          {profileTab === "rooms" && (() => {
                            const filteredCreatedRooms = (viewingUserProfile ? viewingUserRooms : historyRooms.filter(r => r.createdBy?._id === user?.id || r.createdBy === user?.id || r.createdBy?._id === user?._id || r.createdBy === user?._id));
                            const displayedCreatedRooms = createdRoomsExpanded ? filteredCreatedRooms : filteredCreatedRooms.slice(0, 9);
                            return (
                              <>
                                <div className="profile-rooms-grid">
                                  {displayedCreatedRooms.length === 0 ? (
                                    <p className="profile-rooms-empty-text">No rooms created yet.</p>
                                  ) : (
                                    displayedCreatedRooms.map(room => {
                                      const langConfig = getPremiumLangIconConfig(room.language);
                                      return (
                                        <div key={room.roomId} className="premium-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                          {/* Header Premium */}
                                          <div className="profile-room-card-header-premium">
                                            <div className="profile-room-card-header-left">
                                              <div className="premium-lang-icon-box" style={{ backgroundColor: langConfig.bg, color: langConfig.color, borderColor: langConfig.border, borderWidth: "1px", borderStyle: "solid" }}>
                                                {langConfig.text}
                                              </div>
                                              <div className="premium-room-title-wrapper">
                                                <h4 className="profile-room-card-title">{room.title}</h4>
                                              </div>
                                            </div>

                                            <div className="premium-room-card-header-right" onClick={e => e.stopPropagation()}>
                                              <div className={`premium-privacy-badge ${room.isPrivate ? "private" : "public"}`}>
                                                {room.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                                                <span>{room.isPrivate ? "Private" : "Public"}</span>
                                              </div>
                                              {isRoomOwner(room) && (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="premium-card-edit-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingRoomTarget(room);
                                                    }}
                                                    title="Edit Workspace"
                                                  >
                                                    <Edit3 size={13} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="premium-card-delete-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRoomClick(room.roomId || room._id, room.title);
                                                    }}
                                                    title="Delete Workspace"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {/* Card Body Premium */}
                                          <div className="profile-room-card-body-premium">
                                            <div className="profile-room-card-tag-row">
                                              <span className={`room-lang-badge ${room.language?.toLowerCase()}`}>{room.language?.toUpperCase()}</span>
                                            </div>
                                            <p className="profile-room-card-id">ID: {room.roomId}</p>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Creator Info */}
                                          <div className="premium-card-creator-row">
                                            <div className="premium-creator-avatar-wrapper">
                                              {room.createdBy?.avatar ? (
                                                <img src={room.createdBy.avatar} alt={room.createdBy.username} className="premium-creator-avatar" />
                                              ) : (
                                                <div className="premium-creator-avatar-fallback" style={{ backgroundColor: getAvatarColor(room.createdBy?.username || "D") }}>
                                                  {(room.createdBy?.username || "D").charAt(0).toUpperCase()}
                                                </div>
                                              )}
                                            </div>
                                            <div className="premium-creator-text">
                                              <p className="premium-creator-name">Created by <span>{room.createdBy?.username || "Developer"}</span></p>
                                              <p className="premium-creator-date">{new Date(room.createdAt).toLocaleDateString()}</p>
                                            </div>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Footer Premium */}
                                          <div className="profile-room-card-footer-premium" onClick={e => e.stopPropagation()}>

                                            <div className="premium-footer-actions">
                                              {/* Likes count button/pill */}
                                              <button
                                                type="button"
                                                className={`premium-action-pill like-pill ${isRoomLiked(room.roomId || room._id) ? "liked" : ""}`}
                                                onClick={() => handleLikeRoom(room.roomId || room._id)}
                                                title="Like Room"
                                              >
                                                <Heart size={13} fill={isRoomLiked(room.roomId || room._id) ? "currentColor" : "transparent"} />
                                                <span>{room.likesCount || 0}</span>
                                              </button>

                                              {/* Participants count pill */}
                                              <div className="premium-action-pill participants-pill" title="Active Participants">
                                                <Users size={13} />
                                                <span>{room.participants?.length || 1}</span>
                                              </div>

                                              {/* Details button */}
                                              <button
                                                type="button"
                                                className="premium-action-btn details-btn"
                                                onClick={() => setSelectedRoomDetails(room)}
                                                title="View Details"
                                              >
                                                Details
                                              </button>

                                              {/* Bookmark button */}
                                              <button
                                                type="button"
                                                className={`premium-action-pill bookmark-pill ${savedRooms && savedRooms.some(r => r.roomId === room.roomId) ? "active" : ""}`}
                                                onClick={() => handleBookmarkRoom(room.roomId)}
                                                title="Bookmark Room"
                                              >
                                                <Bookmark size={13} fill={savedRooms && savedRooms.some(r => r.roomId === room.roomId) ? "currentColor" : "transparent"} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                                {filteredCreatedRooms.length > 9 && (
                                  <div className="premium-expand-btn-wrapper">
                                    <button
                                      type="button"
                                      className="premium-expand-grid-btn"
                                      onClick={() => setCreatedRoomsExpanded(!createdRoomsExpanded)}
                                    >
                                      {createdRoomsExpanded ? "Show Less" : `View All (${filteredCreatedRooms.length})`}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {profileTab === "posts" && (
                            <div style={{ width: "100%" }}>
                              {isProfilePostsLoading ? (
                                <p className="profile-rooms-empty-text">Loading posts...</p>
                              ) : profilePosts.length === 0 ? (
                                <p className="profile-rooms-empty-text">No posts shared yet.</p>
                              ) : (
                                <div className="profile-post-card-grid">
                                  {profilePosts.map(post => {
                                    const postAuthorId = post.author?._id || post.author?.id || post.author || viewingUserProfile?._id || viewingUserProfile?.id || user?._id || user?.id;
                                    const isMyPost = String(postAuthorId) === String(user?._id || user?.id);
                                    const showDelete = isMyPost || user?.role === "admin" || user?.role === "moderator";
                                    return (
                                      <ProfilePostCard
                                        key={post._id}
                                        post={post}
                                        onOpen={() => handleOpenPostModal(post)}
                                        user={viewingUserProfile || user}
                                        onDelete={showDelete ? (e) => {
                                          e.stopPropagation();
                                          handleDeleteProfilePost(post._id);
                                        } : null}
                                        onReport={!isMyPost ? () => {
                                          setReportedTargetUser({
                                            _id: postAuthorId,
                                            username: post.author?.username || viewingUserProfile?.username || "developer"
                                          });
                                          setReportEvidenceType("POST");
                                          setReportEvidenceId(post._id);
                                          setReportModalOpen(true);
                                        } : null}
                                      />
                                    );
                                  })}
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
                                    {savedPostsList.map(post => {
                                      const postAuthorId = post.author?._id || post.author?.id || post.author;
                                      const isMyPost = String(postAuthorId) === String(user?._id || user?.id);
                                      const showDelete = isMyPost || user?.role === "admin" || user?.role === "moderator";
                                      return (
                                        <ProfilePostCard
                                          key={post._id}
                                          post={post}
                                          onOpen={() => handleOpenPostModal(post)}
                                          user={post.author}
                                          onDelete={showDelete ? (e) => {
                                            e.stopPropagation();
                                            handleDeleteProfilePost(post._id);
                                          } : null}
                                          onReport={!isMyPost ? () => {
                                            setReportedTargetUser({
                                              _id: postAuthorId,
                                              username: post.author?.username || "developer"
                                            });
                                            setReportEvidenceType("POST");
                                            setReportEvidenceId(post._id);
                                            setReportModalOpen(true);
                                          } : null}
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {profileTab === "liked" && (() => {
                            const filteredLikedRooms = (viewingUserProfile ? viewingUserLikedRooms : likedRooms);
                            const displayedLikedRooms = likedRoomsExpanded ? filteredLikedRooms : filteredLikedRooms.slice(0, 9);
                            return (
                              <>
                                <div className="profile-rooms-grid">
                                  {displayedLikedRooms.length === 0 ? (
                                    <p className="profile-rooms-empty-text">No liked rooms.</p>
                                  ) : (
                                    displayedLikedRooms.map(room => {
                                      const langConfig = getPremiumLangIconConfig(room.language);
                                      return (
                                        <div key={room.roomId} className="premium-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                          {/* Header Premium */}
                                          <div className="profile-room-card-header-premium">
                                            <div className="profile-room-card-header-left">
                                              <div className="premium-lang-icon-box" style={{ backgroundColor: langConfig.bg, color: langConfig.color, borderColor: langConfig.border, borderWidth: "1px", borderStyle: "solid" }}>
                                                {langConfig.text}
                                              </div>
                                              <div className="premium-room-title-wrapper">
                                                <h4 className="profile-room-card-title">{room.title}</h4>
                                              </div>
                                            </div>

                                            <div className="premium-room-card-header-right" onClick={e => e.stopPropagation()}>
                                              <div className={`premium-privacy-badge ${room.isPrivate ? "private" : "public"}`}>
                                                {room.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                                                <span>{room.isPrivate ? "Private" : "Public"}</span>
                                              </div>
                                              {isRoomOwner(room) && (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="premium-card-edit-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingRoomTarget(room);
                                                    }}
                                                    title="Edit Workspace"
                                                  >
                                                    <Edit3 size={13} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="premium-card-delete-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRoomClick(room.roomId || room._id, room.title);
                                                    }}
                                                    title="Delete Workspace"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {/* Card Body Premium */}
                                          <div className="profile-room-card-body-premium">
                                            <div className="profile-room-card-tag-row">
                                              <span className={`room-lang-badge ${room.language?.toLowerCase()}`}>{room.language?.toUpperCase()}</span>
                                            </div>
                                            <p className="profile-room-card-id">ID: {room.roomId}</p>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Creator Info */}
                                          <div className="premium-card-creator-row">
                                            <div className="premium-creator-avatar-wrapper">
                                              {room.createdBy?.avatar ? (
                                                <img src={room.createdBy.avatar} alt={room.createdBy.username} className="premium-creator-avatar" />
                                              ) : (
                                                <div className="premium-creator-avatar-fallback" style={{ backgroundColor: getAvatarColor(room.createdBy?.username || "D") }}>
                                                  {(room.createdBy?.username || "D").charAt(0).toUpperCase()}
                                                </div>
                                              )}
                                            </div>
                                            <div className="premium-creator-text">
                                              <p className="premium-creator-name">Created by <span>{room.createdBy?.username || "Developer"}</span></p>
                                              <p className="premium-creator-date">{new Date(room.createdAt).toLocaleDateString()}</p>
                                            </div>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Footer Premium */}
                                          <div className="profile-room-card-footer-premium" onClick={e => e.stopPropagation()}>

                                            <div className="premium-footer-actions">
                                              {/* Likes count button/pill */}
                                              <button
                                                type="button"
                                                className={`premium-action-pill like-pill ${isRoomLiked(room.roomId || room._id) ? "liked" : ""}`}
                                                onClick={() => handleLikeRoom(room.roomId || room._id)}
                                                title="Like Room"
                                              >
                                                <Heart size={13} fill={isRoomLiked(room.roomId || room._id) ? "currentColor" : "transparent"} />
                                                <span>{room.likesCount || 0}</span>
                                              </button>

                                              {/* Participants count pill */}
                                              <div className="premium-action-pill participants-pill" title="Active Participants">
                                                <Users size={13} />
                                                <span>{room.participants?.length || 1}</span>
                                              </div>

                                              {/* Details button */}
                                              <button
                                                type="button"
                                                className="premium-action-btn details-btn"
                                                onClick={() => setSelectedRoomDetails(room)}
                                                title="View Details"
                                              >
                                                Details
                                              </button>

                                              {/* Bookmark button */}
                                              <button
                                                type="button"
                                                className={`premium-action-pill bookmark-pill ${savedRooms && savedRooms.some(r => r.roomId === room.roomId) ? "active" : ""}`}
                                                onClick={() => handleBookmarkRoom(room.roomId)}
                                                title="Bookmark Room"
                                              >
                                                <Bookmark size={13} fill={savedRooms && savedRooms.some(r => r.roomId === room.roomId) ? "currentColor" : "transparent"} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                                {filteredLikedRooms.length > 9 && (
                                  <div className="premium-expand-btn-wrapper">
                                    <button
                                      type="button"
                                      className="premium-expand-grid-btn"
                                      onClick={() => setLikedRoomsExpanded(!likedRoomsExpanded)}
                                    >
                                      {likedRoomsExpanded ? "Show Less" : `View All (${filteredLikedRooms.length})`}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {!viewingUserProfile && profileTab === "saved" && (() => {
                            const filteredSavedRooms = savedRooms;
                            const displayedSavedRooms = savedRoomsExpanded ? filteredSavedRooms : filteredSavedRooms.slice(0, 9);
                            return (
                              <>
                                <div className="profile-rooms-grid">
                                  {displayedSavedRooms.length === 0 ? (
                                    <p className="profile-rooms-empty-text">No bookmarked rooms.</p>
                                  ) : (
                                    displayedSavedRooms.map(room => {
                                      const langConfig = getPremiumLangIconConfig(room.language);
                                      return (
                                        <div key={room.roomId} className="premium-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                                          {/* Header Premium */}
                                          <div className="profile-room-card-header-premium">
                                            <div className="profile-room-card-header-left">
                                              <div className="premium-lang-icon-box" style={{ backgroundColor: langConfig.bg, color: langConfig.color, borderColor: langConfig.border, borderWidth: "1px", borderStyle: "solid" }}>
                                                {langConfig.text}
                                              </div>
                                              <div className="premium-room-title-wrapper">
                                                <h4 className="profile-room-card-title">{room.title}</h4>
                                              </div>
                                            </div>

                                            <div className="premium-room-card-header-right" onClick={e => e.stopPropagation()}>
                                              <div className={`premium-privacy-badge ${room.isPrivate ? "private" : "public"}`}>
                                                {room.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                                                <span>{room.isPrivate ? "Private" : "Public"}</span>
                                              </div>
                                              {isRoomOwner(room) && (
                                                <>
                                                  <button
                                                    type="button"
                                                    className="premium-card-edit-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingRoomTarget(room);
                                                    }}
                                                    title="Edit Workspace"
                                                  >
                                                    <Edit3 size={13} />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="premium-card-delete-icon-btn"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteRoomClick(room.roomId || room._id, room.title);
                                                    }}
                                                    title="Delete Workspace"
                                                  >
                                                    <Trash2 size={13} />
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          {/* Card Body Premium */}
                                          <div className="profile-room-card-body-premium">
                                            <div className="profile-room-card-tag-row">
                                              <span className={`room-lang-badge ${room.language?.toLowerCase()}`}>{room.language?.toUpperCase()}</span>
                                            </div>
                                            <p className="profile-room-card-id">ID: {room.roomId}</p>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Creator Info */}
                                          <div className="premium-card-creator-row">
                                            <div className="premium-creator-avatar-wrapper">
                                              {room.createdBy?.avatar ? (
                                                <img src={room.createdBy.avatar} alt={room.createdBy.username} className="premium-creator-avatar" />
                                              ) : (
                                                <div className="premium-creator-avatar-fallback" style={{ backgroundColor: getAvatarColor(room.createdBy?.username || "D") }}>
                                                  {(room.createdBy?.username || "D").charAt(0).toUpperCase()}
                                                </div>
                                              )}
                                            </div>
                                            <div className="premium-creator-text">
                                              <p className="premium-creator-name">Created by <span>{room.createdBy?.username || "Developer"}</span></p>
                                              <p className="premium-creator-date">{new Date(room.createdAt).toLocaleDateString()}</p>
                                            </div>
                                          </div>

                                          <hr className="premium-card-divider" />

                                          {/* Footer Premium */}
                                          <div className="profile-room-card-footer-premium" onClick={e => e.stopPropagation()}>

                                            <div className="premium-footer-actions">
                                              {/* Likes count button/pill */}
                                              <button
                                                type="button"
                                                className={`premium-action-pill like-pill ${isRoomLiked(room.roomId || room._id) ? "liked" : ""}`}
                                                onClick={() => handleLikeRoom(room.roomId || room._id)}
                                                title="Like Room"
                                              >
                                                <Heart size={13} fill={isRoomLiked(room.roomId || room._id) ? "currentColor" : "transparent"} />
                                                <span>{room.likesCount || 0}</span>
                                              </button>

                                              {/* Participants count pill */}
                                              <div className="premium-action-pill participants-pill" title="Active Participants">
                                                <Users size={13} />
                                                <span>{room.participants?.length || 1}</span>
                                              </div>

                                              {/* Details button */}
                                              <button
                                                type="button"
                                                className="premium-action-btn details-btn"
                                                onClick={() => setSelectedRoomDetails(room)}
                                                title="View Details"
                                              >
                                                Details
                                              </button>

                                              {/* Bookmark button */}
                                              <button
                                                type="button"
                                                className="premium-action-pill bookmark-pill active"
                                                onClick={() => handleBookmarkRoom(room.roomId)}
                                                title="Bookmark Room"
                                              >
                                                <Bookmark size={13} fill="currentColor" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                                {filteredSavedRooms.length > 9 && (
                                  <div className="premium-expand-btn-wrapper">
                                    <button
                                      type="button"
                                      className="premium-expand-grid-btn"
                                      onClick={() => setSavedRoomsExpanded(!savedRoomsExpanded)}
                                    >
                                      {savedRoomsExpanded ? "Show Less" : `View All (${filteredSavedRooms.length})`}
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}

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
                      <AccountSettings user={user} setUser={setUser} addToast={addToast} />
                    )}

                    {settingsTab === "appearance" && (
                      <div className="settings-pane-form">
                        <h3>Theme & Appearance</h3>
                        <p>Customize the look and feel of your workspace.</p>
                        <div className="appearance-themes-grid">
                          <div
                            className={`appearance-theme-card ${(currentThemeMode === "system" || (!currentThemeMode && activeTheme === "system")) ? "active" : ""}`}
                            onClick={() => handleThemeChange("system")}
                          >
                            <div className="theme-preview system">
                              <div className="theme-preview-half dark-half">
                                <div className="preview-decor-sidebar" />
                                <div className="preview-decor-editor">
                                  <div className="decor-line code-blue" style={{ width: "65%" }} />
                                  <div className="decor-line code-purple" style={{ width: "45%" }} />
                                </div>
                              </div>
                              <div className="theme-preview-half light-half">
                                <div className="preview-decor-editor">
                                  <div className="decor-line code-yellow" style={{ width: "70%" }} />
                                  <div className="decor-line code-green" style={{ width: "50%" }} />
                                </div>
                                <div className="preview-decor-chat" />
                              </div>
                            </div>
                            <span>System Default</span>
                          </div>

                          <div
                            className={`appearance-theme-card ${currentThemeMode === "dark" ? "active" : ""}`}
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
                            <span>Dark Mode</span>
                          </div>

                          <div
                            className={`appearance-theme-card ${currentThemeMode === "light" ? "active" : ""}`}
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
                            <span>Light Mode</span>
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
                            <label htmlFor="pref-editor-fontsize">Font Size (px)</label>
                            <input id="pref-editor-fontsize" type="number" value={dashEditorFontSize} onChange={handleEditorFontSizeChange} min="12" max="24" />
                          </div>
                          <div className="settings-form-field flex-1">
                            <label htmlFor="pref-editor-tabsize">Tab Size</label>
                            <select id="pref-editor-tabsize" value={dashEditorTabSize} onChange={handleEditorTabSizeChange}>
                              <option value={2}>2 spaces</option>
                              <option value={4}>4 spaces</option>
                              <option value={8}>8 spaces</option>
                            </select>
                          </div>
                        </div>

                        <div className="settings-form-row">
                          <div className="settings-form-field flex-1">
                            <label htmlFor="pref-editor-roomlang">Default Room Language</label>
                            <select id="pref-editor-roomlang" value={dashDefaultLanguage} onChange={handleDefaultLanguageChange}>
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="cpp">C++</option>
                              <option value="java">Java</option>
                              <option value="html">HTML, CSS & JavaScript</option>
                            </select>
                          </div>
                          <div className="settings-form-field flex-1">
                            <label htmlFor="pref-editor-wbgrid">Default Whiteboard Grid</label>
                            <select id="pref-editor-wbgrid" value={dashWhiteboardGrid} onChange={handleWhiteboardGridChange}>
                              <option value="dots">Dots</option>
                              <option value="lines">Grid Lines</option>
                              <option value="none">None</option>
                            </select>
                          </div>
                        </div>

                        <div className="settings-form-row">
                          <div className="settings-form-field flex-1">
                            <label htmlFor="pref-editor-autocomplete">AI IntelliSense Autocomplete</label>
                            <select id="pref-editor-autocomplete" value={dashEditorSuggestions} onChange={handleEditorSuggestionsChange}>
                              <option value="ai">AI-Powered (Smart Autocomplete) ✨</option>
                              <option value="standard">Standard Autocomplete</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          <div className="settings-form-field flex-1">
                            <label htmlFor="pref-editor-autosave">Auto-Save Frequency</label>
                            <select id="pref-editor-autosave" value={dashEditorAutoSave} onChange={handleEditorAutoSaveChange}>
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

                        <div className="settings-toggle-row">
                          <div className="toggle-info">
                            <div className="toggle-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {notifSoundEnabled ? (
                                <Volume2 className={`toggle-icon-audio ${isSoundTesting ? "audio-pulse" : ""}`} size={18} style={{ color: "var(--ce-accent, #aa3bff)" }} />
                              ) : (
                                <VolumeX className="toggle-icon-audio muted" size={18} style={{ color: "var(--ce-text-muted, #9ca3af)" }} />
                              )}
                              <span className="toggle-label" style={{ margin: 0 }}>Notification Sound Effects</span>
                            </div>
                            <span className="toggle-desc">Play the signature Code-Expo alert sound for notifications and room join requests</span>
                          </div>
                          <div className="toggle-actions-wrapper" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            {notifSoundEnabled && (
                              <button
                                className={`ce-sound-test-btn ${isSoundTesting ? "playing" : ""}`}
                                onClick={handleTestSound}
                                title="Play Test Sound"
                                type="button"
                              >
                                {isSoundTesting ? (
                                  <div className="soundwave-container">
                                    <span className="stroke"></span>
                                    <span className="stroke"></span>
                                    <span className="stroke"></span>
                                    <span className="stroke"></span>
                                  </div>
                                ) : (
                                  <Play size={10} fill="currentColor" style={{ marginRight: "2px" }} />
                                )}
                                <span>{isSoundTesting ? "Testing" : "Test"}</span>
                              </button>
                            )}
                            <label className="ce-switch">
                              <input type="checkbox" checked={notifSoundEnabled} onChange={handleSoundEnabledChange} />
                              <span className="ce-switch-slider" />
                            </label>
                          </div>
                        </div>

                        <div className="settings-toggle-row">
                          <div className="toggle-info">
                            <div className="toggle-title-with-icon" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {sendMessageNotification ? (
                                <Volume2 className="toggle-icon-audio" size={18} style={{ color: "var(--ce-accent, #aa3bff)" }} />
                              ) : (
                                <VolumeX className="toggle-icon-audio muted" size={18} style={{ color: "var(--ce-text-muted, #9ca3af)" }} />
                              )}
                              <span className="toggle-label" style={{ margin: 0 }}>Message Sound Effects</span>
                            </div>
                            <span className="toggle-desc">Play satisfying audio tones when sending or receiving direct chat messages</span>
                          </div>
                          <label className="ce-switch">
                            <input type="checkbox" checked={sendMessageNotification} onChange={handleSendMessageNotificationChange} />
                            <span className="ce-switch-slider" />
                          </label>
                        </div>
                      </div>
                    )}

                    {settingsTab === "security" && (
                      <SecuritySettings user={user} addToast={addToast} />
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

          {activeSection === "planner" && (
            <motion.div
              key="planner"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <TaskPlanner />
            </motion.div>
          )}

          {activeSection === "subscription" && (
            <motion.div
              key="subscription"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              <SubscriptionPlans user={user} addToast={addToast} />
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
            <button className="modal-close-btn-outside" onClick={(e) => { e.stopPropagation(); setSelectedRoomDetails(null); }} title="Close Details" aria-label="Close details modal">
              <X size={18} />
            </button>
            <div className="ce-modal-card room-details-modal-card" onClick={(e) => e.stopPropagation()}>

              <div className="modal-header-new">
                <span className="modal-label-tag">Room Overview</span>
                <h3 className="modal-title-new"><Terminal size={18} style={{ marginRight: "8px", color: "var(--ce-accent)", verticalAlign: "middle" }} />{selectedRoomDetails.title}</h3>
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
                      aria-label="Copy Room ID"
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
                          {!isSelf && (
                            <div style={{ position: "relative", marginLeft: "6px" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRoomMemberMenuId(activeRoomMemberMenuId === uId ? null : uId);
                                }}
                                className="modal-kick-member-btn"
                                style={{ background: "none", border: "1px solid var(--ce-border)", color: "var(--ce-text-muted)", padding: "2px 6px", display: "flex", alignItems: "center" }}
                                title="Options"
                              >
                                <MoreVertical size={12} />
                              </button>
                              {activeRoomMemberMenuId === uId && (
                                <div
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "calc(100% + 4px)",
                                    background: "rgba(10, 10, 18, 0.96)",
                                    backdropFilter: "blur(16px)",
                                    border: "1px solid var(--ce-border)",
                                    borderRadius: "4px",
                                    boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                                    zIndex: 1000,
                                    minWidth: "135px",
                                    width: "max-content",
                                    whiteSpace: "nowrap",
                                    display: "flex",
                                    flexDirection: "column",
                                    padding: "4px",
                                    gap: "2px"
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setActiveRoomMemberMenuId(null);
                                      setReportedTargetUser({ _id: uId, username });
                                      setReportEvidenceType("ROOM");
                                      setReportEvidenceId(selectedRoomDetails._id || selectedRoomDetails.roomId);
                                      setReportModalOpen(true);
                                    }}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      color: "#ef4444",
                                      fontSize: "0.74rem",
                                      fontWeight: "600",
                                      padding: "8px 12px",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      width: "100%",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      transition: "background 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                  >
                                    ⚠️ Report User
                                  </button>
                                </div>
                              )}
                            </div>
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
                  <Heart size={13} fill="var(--ce-danger, #f85149)" color="var(--ce-danger, #f85149)" />
                  Liked By ({selectedRoomLikes.length})
                </h4>
                {isLoadingRoomLikes ? (
                  <div className="modal-likes-loader">Loading likes...</div>
                ) : selectedRoomLikes.length === 0 ? (
                  <p className="modal-likes-empty">No likes yet. Be the first to like this room!</p>
                ) : (
                  <div className="likes-list-scrollable">
                    {selectedRoomLikes.map((u, idx) => {
                      const userObj = typeof u === "object" ? u : {};
                      const username = userObj.username || "Collaborator";
                      const avatar = userObj.avatar;
                      const uId = userObj._id || idx;

                      return (
                        <div key={uId} className="modal-like-card">
                          <div className="modal-like-user-info">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={username}
                                className="member-avatar-img-mini"
                              />
                            ) : (
                              <div
                                className="member-avatar-initials-mini"
                                style={{ backgroundColor: getAvatarColor(username) }}
                              >
                                {username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="modal-like-details">
                              <span className="modal-member-name">{username}</span>
                              {userObj.bio ? (
                                <span className="modal-like-subtext">{userObj.bio}</span>
                              ) : userObj.email ? (
                                <span className="modal-like-subtext">{userObj.email}</span>
                              ) : null}
                            </div>
                          </div>
                          <Heart size={12} fill="var(--ce-danger, #f85149)" color="var(--ce-danger, #f85149)" style={{ opacity: 0.85 }} />
                        </div>
                      );
                    })}
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
                aria-label="Close create workspace dialog"
              >
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Quick Action</span>
                <h3 className="modal-title-new">Create Workspace Room</h3>
              </div>

              <form onSubmit={handleCreateRoom} className="compact-form modal-form-new">
                <div className="form-field">
                  <label htmlFor="create-room-title-modal">Workspace Title</label>
                  <input
                    id="create-room-title-modal"
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
                    <label htmlFor="create-room-lang-modal">Language</label>
                    <select
                      id="create-room-lang-modal"
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="modal-input-new select"
                      disabled={isCreatingRoom}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="html">HTML, CSS & JavaScript</option>
                    </select>
                  </div>

                  <div className="form-field flex-1">
                    <label htmlFor="create-room-privacy-modal">Privacy Type</label>
                    <select
                      id="create-room-privacy-modal"
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

                {recentJoinedCodes && recentJoinedCodes.length > 0 && (
                  <div className="recent-rooms-history-container modal-version">
                    <span className="recent-history-label">Recent Room IDs</span>
                    <div className="recent-history-chips">
                      {recentJoinedCodes.map((code) => (
                        <button
                          key={code}
                          type="button"
                          className="recent-history-chip"
                          onClick={() => setRoomId(code)}
                          title={`Use recent ID: ${code}`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
          <div className="ce-modal-overlay" onClick={() => setKickModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0, 0, 0, 0.78)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="ce-modal-card confirm-modal-card warning-glow" onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "420px", maxWidth: "90vw", padding: "32px 24px", borderRadius: "4px", background: "var(--ce-surface, #12121a)", border: "1px solid var(--ce-border, rgba(255,255,255,0.12))", boxShadow: "0 25px 70px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", margin: "auto" }}>
              <div className="modal-icon-circle error" style={{ width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.15)", border: "2px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", marginBottom: "16px", boxShadow: "0 0 25px rgba(239, 68, 68, 0.3)" }}>
                <UserMinus size={30} />
              </div>
              <h2 className="modal-confirm-title" style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--ce-text, #ffffff)", marginBottom: "8px" }}>Remove Participant?</h2>
              <p className="modal-confirm-desc" style={{ fontSize: "0.86rem", color: "var(--ce-text-muted, #9ca3af)", marginBottom: "24px", lineHeight: "1.5" }}>
                Are you sure you want to remove <strong style={{ color: "var(--ce-text, #ffffff)" }}>{kickTarget?.username}</strong> from this workspace? They will be immediately disconnected.
              </p>
              <div className="modal-confirm-actions" style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button
                  className="ce-btn-secondary"
                  type="button"
                  onClick={() => setKickModalOpen(false)}
                  style={{ flex: 1, padding: "12px", fontWeight: "700", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e4e4e7", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Cancel
                </button>
                <button
                  className="ce-btn-danger"
                  type="button"
                  onClick={confirmKickUser}
                  style={{ flex: 1, padding: "12px", fontWeight: "700", borderRadius: "4px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#ffffff", border: "none", cursor: "pointer", fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(239,68,68,0.4)" }}
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

        {/* Suggested developers modal */}
        {showSuggestionsModal && createPortal(
          <div className="ce-modal-overlay" onClick={() => setShowSuggestionsModal(false)}>
            <div className="ce-modal-card social-graph-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={() => setShowSuggestionsModal(false)}>
                <X size={18} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Network suggestions</span>
                <h3 className="modal-title-new">Suggested Developers ({suggestions.length})</h3>
              </div>
              <div className="social-modal-members-section">
                <div className="social-members-list-scrollable">
                  {suggestions.length === 0 ? (
                    <p className="modal-empty-msg">No suggestions available.</p>
                  ) : (
                    suggestions.map(item => {
                      const isSelf = String(item._id) === String(user?.id || user?._id);
                      const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                      return (
                        <div key={item._id} className="social-member-card">
                          <div
                            onClick={() => {
                              setShowSuggestionsModal(false);
                              handleViewUserProfile(item._id);
                            }}
                            className="social-member-info"
                            style={{ cursor: "pointer" }}
                          >
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.username} className="social-member-avatar-img" style={{ borderRadius: "4px" }} />
                            ) : (
                              <div className="social-member-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.username), borderRadius: "4px" }}>
                                {(item.username || "D").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="social-member-meta">
                              <span className="social-member-name">{item.username}</span>
                              {(() => {
                                const targetFollowers = item.followers || [];
                                const targetFollowing = item.following || [];
                                const realMutuals = followingList.filter(f => {
                                  const fId = String(f._id || f);
                                  return targetFollowers.some(id => String(id) === fId) || targetFollowing.some(id => String(id) === fId);
                                });
                                if (realMutuals.length > 0) {
                                  const displayList = realMutuals.slice(0, 3);
                                  const remainingCount = realMutuals.length - displayList.length;
                                  return (
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                        {displayList.map((mUser, mIdx) => {
                                          const username = mUser.username || "Developer";
                                          return (
                                            <div
                                              key={mUser._id || mIdx}
                                              style={{
                                                width: "16px",
                                                height: "16px",
                                                borderRadius: "50%",
                                                overflow: "hidden",
                                                border: "1px solid var(--ce-surface-card)",
                                                background: mUser.avatar ? "transparent" : getAvatarColor(username),
                                                marginLeft: mIdx === 0 ? 0 : "-5px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "0.5rem",
                                                fontWeight: "700",
                                                color: "#fff",
                                                zIndex: 3 - mIdx
                                              }}
                                              title={`@${username}`}
                                            >
                                              {mUser.avatar ? (
                                                <img src={mUser.avatar} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                              ) : (
                                                username.charAt(0).toUpperCase()
                                              )}
                                            </div>
                                          );
                                        })}
                                        {remainingCount > 0 && (
                                          <div
                                            style={{
                                              width: "16px",
                                              height: "16px",
                                              borderRadius: "50%",
                                              background: "var(--ce-hover)",
                                              border: "1px solid var(--ce-surface-card)",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              fontSize: "0.5rem",
                                              fontWeight: "750",
                                              color: "var(--ce-primary)",
                                              marginLeft: "-5px",
                                              zIndex: 0
                                            }}
                                          >
                                            +{remainingCount}
                                          </div>
                                        )}
                                      </div>
                                      <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>
                                        {realMutuals.length} mutual connection{realMutuals.length > 1 ? "s" : ""}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="social-member-bio">{item.bio || "No bio"}</span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="social-member-actions">
                            {!isSelf && (
                              <button
                                onClick={() => handleFollowToggle(item._id)}
                                className={`social-member-follow-btn ${isFollowingUser ? "following" : ""}`}
                              >
                                {isFollowingUser ? "Following" : "Follow"}
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
                                {(item.username || "D").charAt(0).toUpperCase()}
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
                                    navigate("/dashboard/messages");
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
                                {(item.username || "D").charAt(0).toUpperCase()}
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
                                  navigate("/dashboard/messages");
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
                          navigate("/dashboard/messages");
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
          const addReplyToTreeRecursively = (tree, targetId, newReply) => {
            return tree.map((node) => {
              if (String(node._id || node.id) === String(targetId)) {
                return {
                  ...node,
                  replies: [...(node.replies || []), newReply]
                };
              }
              if (node.replies && node.replies.length > 0) {
                return {
                  ...node,
                  replies: addReplyToTreeRecursively(node.replies, targetId, newReply)
                };
              }
              return node;
            });
          };

          const deleteCommentFromTreeRecursively = (tree, targetId) => {
            return tree
              .filter((node) => String(node._id || node.id) !== String(targetId))
              .map((node) => {
                if (node.replies && node.replies.length > 0) {
                  return {
                    ...node,
                    replies: deleteCommentFromTreeRecursively(node.replies, targetId)
                  };
                }
                return node;
              });
          };

          const toggleLikeCommentInTreeRecursively = (tree, targetId, userId) => {
            return tree.map((node) => {
              if (String(node._id || node.id) === String(targetId)) {
                const likes = Array.isArray(node.likes) ? node.likes : [];
                const hasLiked = likes.some(id => String(id._id || id || id?.id) === String(userId));
                const updatedLikes = hasLiked
                  ? likes.filter(id => String(id._id || id || id?.id) !== String(userId))
                  : [...likes, userId];
                return {
                  ...node,
                  likes: updatedLikes,
                  likesCount: updatedLikes.length
                };
              }
              if (node.replies && node.replies.length > 0) {
                return {
                  ...node,
                  replies: toggleLikeCommentInTreeRecursively(node.replies, targetId, userId)
                };
              }
              return node;
            });
          };

          const postImages = selectedPostModal.images && selectedPostModal.images.length > 0 ? selectedPostModal.images : (selectedPostModal.image ? [selectedPostModal.image] : []);
          const hasImage = postImages.length > 0;
          const hasVideo = !!selectedPostModal.video;
          const codeDetails = extractCodeBlock(selectedPostModal.text);
          const hasCode = !!codeDetails;
          const isSplit = hasImage || hasCode || hasVideo;

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
                  {/* Left Column: Video, Image Carousel or Code Snippet */}
                  {hasVideo && (
                    <div style={{ flex: 1, height: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      <video
                        src={selectedPostModal.video}
                        controls
                        autoPlay
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                  )}

                  {(!hasVideo && hasImage) && (
                    <div style={{ flex: 1, height: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      <InstaImageCarousel images={postImages} height="100%" />
                    </div>
                  )}

                  {(!hasVideo && !hasImage && hasCode) && (
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
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {selectedPostModal.author && String(selectedPostModal.author._id || selectedPostModal.author.id || selectedPostModal.author) !== String(user?.id || user?._id) && (
                          <button
                            onClick={() => {
                              setReportedTargetUser({
                                _id: selectedPostModal.author?._id || selectedPostModal.author.id || selectedPostModal.author,
                                username: selectedPostModal.author?.username || "developer"
                              });
                              setReportEvidenceType("POST");
                              setReportEvidenceId(selectedPostModal._id);
                              setReportModalOpen(true);
                            }}
                            title="Report Post"
                            style={{
                              background: "none",
                              border: "none",
                              color: "#eab308",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: "12px",
                              transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = "scale(1.08)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <ShieldAlert size={18} />
                          </button>
                        )}
                        <button
                          onClick={handleClosePostModal}
                          style={{ background: "none", border: "none", color: "var(--ce-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <X size={18} />
                        </button>
                      </div>
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
                          <ExpandableText lines={3} text={selectedPostModal.text}>
                            <strong style={{ color: "var(--ce-text-h)", marginRight: "6px" }}>@{selectedPostModal.author?.username}:</strong>
                            {parseMarkdown(hasCode ? getRightSideText(selectedPostModal.text) : selectedPostModal.text)}
                          </ExpandableText>
                        </div>
                      </div>

                      {/* Divider line */}
                      <div style={{ borderBottom: "1px solid var(--ce-border)" }} />

                      {/* Comments list with YouTube-style tree layout */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {selectedPostModal.comments && selectedPostModal.comments.length > 0 ? (
                          selectedPostModal.comments.map((comment, index) => (
                            <CommentTreeItem
                              key={comment._id || index}
                              comment={comment}
                              user={user}
                              isPostOwner={String(selectedPostModal.author?._id || selectedPostModal.author?.id || selectedPostModal.author) === String(user?.id || user?._id)}
                              onLikeComment={async (commentId) => {
                                const currentUserId = user?.id || user?._id;
                                setSelectedPostModal(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    comments: toggleLikeCommentInTreeRecursively(prev.comments || [], commentId, currentUserId)
                                  };
                                });
                                try {
                                  const res = await toggleLikeCommentPost(selectedPostModal._id, commentId);
                                  if (res && res.success && res.comments) {
                                    setSelectedPostModal(prev => prev ? { ...prev, comments: res.comments } : null);
                                  }
                                } catch (err) {
                                  console.error("Failed to toggle comment like:", err);
                                }
                              }}
                              onReplyComment={async (commentId, replyText) => {
                                const tempReplyId = "temp_" + Date.now();
                                const optimisticReply = {
                                  _id: tempReplyId,
                                  user: {
                                    _id: user?.id || user?._id,
                                    username: user?.username || "you",
                                    avatar: user?.avatar
                                  },
                                  text: replyText,
                                  likes: [],
                                  createdAt: new Date().toISOString(),
                                  replies: []
                                };
                                setSelectedPostModal(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    comments: addReplyToTreeRecursively(prev.comments || [], commentId, optimisticReply)
                                  };
                                });
                                try {
                                  const res = await addCommentPost(selectedPostModal._id, replyText, commentId);
                                  if (res && res.success && res.comments) {
                                    setSelectedPostModal(prev => prev ? { ...prev, comments: res.comments } : null);
                                  }
                                } catch (err) {
                                  console.error("Failed to submit reply comment:", err);
                                }
                              }}
                              onDeleteComment={async (commentId) => {
                                setSelectedPostModal(prev => {
                                  if (!prev) return null;
                                  return {
                                    ...prev,
                                    comments: deleteCommentFromTreeRecursively(prev.comments || [], commentId)
                                  };
                                });
                                addToast("Comment deleted", "success");
                                try {
                                  const res = await deleteCommentPost(selectedPostModal._id, commentId);
                                  if (res && res.success && res.comments) {
                                    setSelectedPostModal(prev => prev ? { ...prev, comments: res.comments } : null);
                                  }
                                } catch (err) {
                                  console.error("Failed to delete comment:", err);
                                }
                              }}
                            />
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
                            style={{ background: "none", border: "none", color: isEntityLiked(selectedPostModal.likes, user) ? "#ef4444" : "var(--ce-text)", cursor: selectedPostModal.likesDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", padding: 0, opacity: selectedPostModal.likesDisabled ? 0.45 : 1 }}
                            title={selectedPostModal.likesDisabled ? "Likes are disabled" : ""}
                          >
                            <Heart size={20} fill={isEntityLiked(selectedPostModal.likes, user) ? "#ef4444" : "none"} color={isEntityLiked(selectedPostModal.likes, user) ? "#ef4444" : "currentColor"} />
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
                                  <Copy size={13} style={{ color: "var(--ce-text)", flexShrink: 0 }} className="share-dropdown-icon" /> Copy Link
                                </button>
                                <a
                                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this post on CodeExpo: " + window.location.origin + "/post/" + selectedPostModal._id)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setModalShareOpen(false)}
                                >
                                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "13px", height: "13px", color: "var(--ce-text)", flexShrink: 0 }} className="share-dropdown-icon">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                  </svg> WhatsApp
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

        {/* Report User Modal */}
        <ReportUserModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setReportedTargetUser(null);
            setReportEvidenceType("");
            setReportEvidenceId("");
          }}
          reportedUser={reportedTargetUser}
          evidenceType={reportEvidenceType}
          evidenceId={reportEvidenceId}
          addToast={addToast}
        />

        {/* Profile Post Delete Confirmation Modal */}
        {createPortal(
          <AnimatePresence>
            {postToDeleteFromProfile && (
              <div
                className="ce-confirm-modal-overlay"
                onClick={() => setPostToDeleteFromProfile(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="ce-confirm-modal-card delete-card"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="ce-confirm-modal-badge delete-badge">
                    <Trash2 size={26} color="#ef4444" />
                  </div>

                  <div>
                    <h3 className="ce-confirm-modal-title">Delete Activity?</h3>
                    <p className="ce-confirm-modal-text">
                      Are you sure you want to delete this activity? This will permanently remove it from the global feed.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "4px" }}>
                    <button
                      type="button"
                      className="ce-confirm-btn-cancel"
                      onClick={() => setPostToDeleteFromProfile(null)}
                      disabled={isDeletingProfilePost}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ce-confirm-btn-delete"
                      onClick={confirmDeleteProfilePost}
                      disabled={isDeletingProfilePost}
                    >
                      {isDeletingProfilePost ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

        {/* High-Security Workspace Deletion Modal */}
        <SecurityDeleteRoomModal
          isOpen={!!securityDeleteRoomTarget}
          onClose={() => setSecurityDeleteRoomTarget(null)}
          onConfirmDelete={executeSecurityRoomDelete}
          roomTitle={securityDeleteRoomTarget?.title || "Workspace"}
          roomId={securityDeleteRoomTarget?.id || ""}
          isDeleting={isDeletingRoomTarget}
        />

        {/* Edit Room Modal */}
        <EditRoomModal
          isOpen={!!editingRoomTarget}
          onClose={() => setEditingRoomTarget(null)}
          room={editingRoomTarget}
        />

      </div>
      <Outlet />
    </MainLayout>
  );
}

export default Dashboard;

