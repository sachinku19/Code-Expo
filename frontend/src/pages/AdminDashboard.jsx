import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAdminStats,
  getAdminUsers,
  deleteUser,
  updateUserRole,
  getAdminRooms,
  deleteRoom,
  getAdminRatings,
  deleteRating,
  promoteSelf,
  toggleUserSuspension,
  getRecentMessages,
  deleteChatMessage,
  getMaintenanceStatus,
  toggleMaintenanceMode,
  updateUserTitle,
  getAdminAnnouncements,
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAds,
  createAdminAd,
  toggleAdminAd,
  deleteAdminAd,
  getAdminPosts,
  deleteAdminPost,
  deleteAdminPostComment,
  updateAdminPostStatus,
  getAdminLoginLogs,
  getAdminStories,
  deleteAdminStory
} from "../services/adminService";
import {
  Users,
  Terminal,
  MessageSquare,
  Star,
  Trash2,
  Shield,
  Search,
  RefreshCw,
  FolderCode,
  Calendar,
  Eye,
  Mail,
  User as UserIcon,
  ShieldAlert,
  Loader,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sliders,
  LogOut,
  AppWindow,
  Lock,
  Unlock,
  VolumeX,
  FileCode2,
  Settings,
  Activity,
  Server,
  Zap,
  Globe,
  Sun,
  Moon,
  Menu,
  X,
  Megaphone,
  HelpCircle,
  Sparkles
} from "lucide-react";
import Logo from "../components/shared/Logo";
import {
  adminGetAllTickets,
  adminUpdateTicketStatus,
  addTicketMessage,
  getTicketDetails
} from "../services/ticketService";
import "./AdminDashboard.css";

// Radial SVG Resource Gauge Component
const AdminRadialGauge = ({ value, label, maxVal = 100, colorClass }) => {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, maxVal) / maxVal) * circumference;

  return (
    <div className="radial-gauge-card glass-panel">
      <div className="gauge-svg-wrapper">
        <svg width="110" height="110" viewBox="0 0 110 110" className={`radial-gauge gauge-${colorClass}`}>
          <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--admin-border)" strokeWidth="8" />
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke={`var(--chart-${colorClass}-color, #8b5cf6)`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            className="gauge-progress-arc"
          />
          <text x="55" y="61" textAnchor="middle" className="gauge-text-val" fill="var(--admin-text-h)">
            {value}%
          </text>
        </svg>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
};

// Custom Line/Area SVG Chart component
const AdminSVGChart = ({ data = [], label, colorClass, labels = [] }) => {
  const maxVal = Math.max(...data, 1) * 1.2;
  const chartWidth = 500;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = data.map((val, index) => {
    const x = paddingX + (index / Math.max(1, data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (val / maxVal) * (chartHeight - paddingY * 2);
    return { x, y, value: val };
  });

  const pathD = points.reduce((acc, p, index) => {
    return acc + `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "");

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : "";

  return (
    <div className="svg-chart-card glass-panel">
      <h4 className="chart-title">{label}</h4>
      <div className="svg-wrapper">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={`svg-chart ${colorClass}`}>
          <defs>
            <linearGradient id={`grad-${colorClass}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--chart-${colorClass}-color, #8b5cf6)`} stopOpacity="0.4" />
              <stop offset="100%" stopColor={`var(--chart-${colorClass}-color, #8b5cf6)`} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="var(--admin-border)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="var(--admin-border)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="var(--admin-border)" />

          {/* Paths */}
          {areaD && <path d={areaD} fill={`url(#grad-${colorClass})`} className="chart-area-path" />}
          {pathD && <path d={pathD} fill="none" stroke={`var(--chart-${colorClass}-color, #8b5cf6)`} strokeWidth="3" className="chart-line-path" />}

          {/* Points */}
          {points.map((p, index) => (
            <g key={index} className="chart-dot-group">
              <circle cx={p.x} cy={p.y} r="5" fill="var(--admin-panel-bg)" stroke={`var(--chart-${colorClass}-color, #8b5cf6)`} strokeWidth="3" className="chart-dot" />

              <rect x={p.x - 16} y={p.y - 28} width="32" height="16" rx="3" fill="var(--admin-text-h)" className="chart-tooltip-bg" />
              <text x={p.x} y={p.y - 17} textAnchor="middle" className="chart-text-value" fill="var(--admin-bg)">
                {p.value}
              </text>

              {labels[index] && (
                <text x={p.x} y={chartHeight - 8} textAnchor="middle" className="chart-axis-label" fill="var(--admin-text)">
                  {labels[index]}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

// Custom inline SVG sparkline graph
const renderDiagnosticSparkline = (data = [], isGreen) => {
  const width = 100;
  const height = 35;
  const paddingY = 3;

  if (data.length === 0) return null;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const valRange = maxVal - minVal;

  const points = data.map((val, index) => {
    const x = (index / Math.max(1, data.length - 1)) * width;
    const y = valRange === 0
      ? height / 2
      : height - paddingY - ((val - minVal) / valRange) * (height - paddingY * 2);
    return { x, y };
  });

  const pathD = points.reduce((acc, p, index) => {
    return acc + `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const strokeColor = isGreen ? "#10b981" : "#ef4444";
  const gradId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;
  const filterId = `sparkline-glow-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={strokeColor}
          stroke="var(--admin-panel-bg)"
          strokeWidth="1"
        />
      )}
    </svg>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const isSuperAdmin = user?.email === "adminsachin@gmail.com";
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState(localStorage.getItem("codeExpoHomeTheme") || "dark");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Login Logs State
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingLoginLogs, setLoadingLoginLogs] = useState(true);
  const [loginLogSearch, setLoginLogSearch] = useState("");
  const [loginLogPage, setLoginLogPage] = useState(1);
  const [loginLogPagination, setLoginLogPagination] = useState({ totalPages: 1, totalLogs: 0 });

  // Stories State
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyPage, setStoryPage] = useState(1);
  const [storyPagination, setStoryPagination] = useState({ totalPages: 1, totalStories: 0 });
  const [feedSubTab, setFeedSubTab] = useState("posts");

  // Developer Profile & Auth logs modal states
  const [selectedUserLogs, setSelectedUserLogs] = useState(null);
  const [userLogsForModal, setUserLogsForModal] = useState([]);
  const [loadingModalLogs, setLoadingModalLogs] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState("sessions");
  const [userPostsForModal, setUserPostsForModal] = useState([]);
  const [userStoriesForModal, setUserStoriesForModal] = useState([]);
  const [loadingModalPosts, setLoadingModalPosts] = useState(false);
  const [loadingModalStories, setLoadingModalStories] = useState(false);

  // Feed Moderation states
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [expandedPostLegal, setExpandedPostLegal] = useState({});
  const [savingCompliance, setSavingCompliance] = useState({});

  // Radial metrics state (simulated real-time pings oscillation)
  const [cpuUsage, setCpuUsage] = useState(24);
  const [memoryUsage, setMemoryUsage] = useState(48);
  const [networkStats, setNetworkStats] = useState(98);

  // Live Terminal Logs state
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: "23:18:01", type: "SYSTEM", text: "Secure back-office control connection pool initialized." },
    { id: 2, time: "23:18:02", type: "DB", text: "MongoDB cluster synchronization verified. Latency: 12ms." },
    { id: 3, time: "23:18:05", type: "DOCKER", text: "Docker compiler instance pool active: 4 sandboxes ready." }
  ]);
  const consoleBodyRef = useRef(null);

  // Config Sliders state
  const [configMaxRooms, setConfigMaxRooms] = useState(5);
  const [configTimeout, setConfigTimeout] = useState(8);
  const [configPoolLimit, setConfigPoolLimit] = useState(150);

  // Search & Pagination states
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState({ totalPages: 1, totalUsers: 0 });

  const [roomSearch, setRoomSearch] = useState("");
  const [roomPage, setRoomPage] = useState(1);
  const [roomPagination, setRoomPagination] = useState({ totalPages: 1, totalRooms: 0 });

  const [messageSearch, setMessageSearch] = useState("");
  const [messagePage, setMessagePage] = useState(1);
  const [messagePagination, setMessagePagination] = useState({ totalPages: 1, totalMessages: 0 });
  const [expandedRooms, setExpandedRooms] = useState({});

  // Confirmation Modals
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: "", // "deleteUser", "deleteRoom", "deleteRating", "changeRole", "suspendUser", "deleteMessage", "toggleMaintenance", "deleteAd"
    targetId: null,
    targetName: "",
    extraData: null
  });

  // Toasts Alert
  const [toasts, setToasts] = useState([]);

  // Announcements Broadcast states
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState("ANNOUNCEMENT");
  const [annSeverity, setAnnSeverity] = useState("INFO");

  // Ads Management states
  const [ads, setAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adTitle, setAdTitle] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adFormat, setAdFormat] = useState("SIDEBAR");
  const [adImageFile, setAdImageFile] = useState(null);
  const [adImagePreview, setAdImagePreview] = useState("");

  // Help Desk states
  const [adminTickets, setAdminTickets] = useState([]);
  const [loadingAdminTickets, setLoadingAdminTickets] = useState(false);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState(null);
  const [loadingAdminTicketDetails, setLoadingAdminTicketDetails] = useState(false);
  const [adminReplyMessage, setAdminReplyMessage] = useState("");
  const [sendingAdminReply, setSendingAdminReply] = useState(false);

  // Loading states for dynamic spinner buttons
  const [submittingAd, setSubmittingAd] = useState(false);
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState(false);

  // Feed Moderation states
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postSearch, setPostSearch] = useState("");
  const [postPage, setPostPage] = useState(1);
  const [postPagination, setPostPagination] = useState({ totalPages: 1, totalPosts: 0 });
  const [expandedPosts, setExpandedPosts] = useState({});
  const [feedStats, setFeedStats] = useState({ totalPosts: 0, flaggedPosts: 0, hiddenPosts: 0, totalComments: 0 });



  const addToast = (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Clear bypass redirection on load so that future returns are gated
  useEffect(() => {
    localStorage.removeItem("ceBypassAdminRedirect");
  }, []);

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("codeExpoHomeTheme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // CPU/RAM Live simulation oscillations
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const offset = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.min(100, Math.max(5, prev + offset));
      });
      setMemoryUsage((prev) => {
        const offset = Math.floor(Math.random() * 3) - 1; // -1 to +1
        return Math.min(100, Math.max(10, prev + offset));
      });
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // System Logger simulation intervals
  useEffect(() => {
    const logTemplates = [
      { type: "SYSTEM", text: "Secure socket cluster handshake verified for user channel." },
      { type: "DB", text: "MongoDB connection latency validated: 14ms." },
      { type: "DOCKER", text: "Sandbox compilation sandbox cache hit for: javascript." },
      { type: "SECURITY", text: "Audit: JWT token signature validation successful." },
      { type: "COMPILER", text: "Cleaned docker execution memory workspace folder." },
      { type: "INFO", text: "Public stats aggregation completed in 4ms." }
    ];

    const interval = setInterval(() => {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];

      setTerminalLogs((prev) => {
        const nextLogs = [
          ...prev,
          { id: Date.now(), time: timeStr, type: template.type, text: template.text }
        ];
        return nextLogs.slice(-20); // Cap logs list size
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll console terminal logger
  useEffect(() => {
    if (activeTab === "overview" && consoleBodyRef.current) {
      const el = consoleBodyRef.current;
      const timer = setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [terminalLogs, activeTab]);

  // Sync Diagnostics
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getAdminStats();
      if (data.success) {
        setStats(data.stats);
        if (data.stats.onlineUsers !== undefined) {
          // Update sockets indicator gauge based on online users
          setNetworkStats(Math.min(100, Math.max(10, 20 + data.stats.onlineUsers * 8)));
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load statistics.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getAdminUsers(userPage, 10, userSearch);
      if (data.success) {
        setUsers(data.users);
        setAdmins(data.admins || []);
        setUserPagination(data.pagination);
      }
    } catch (err) {
      addToast("Failed to fetch user list", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await getAdminRooms(roomPage, 10, roomSearch);
      if (data.success) {
        setRooms(data.rooms);
        setRoomPagination(data.pagination);
      }
    } catch (err) {
      addToast("Failed to fetch collaboration rooms", "error");
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchRatings = async () => {
    setLoadingRatings(true);
    try {
      const data = await getAdminRatings();
      if (data.success) {
        setRatings(data.ratings);
      }
    } catch (err) {
      addToast("Failed to fetch ratings feedback", "error");
    } finally {
      setLoadingRatings(false);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const data = await getRecentMessages(messagePage, 12, messageSearch);
      if (data.success) {
        setMessages(data.messages);
        setMessagePagination(data.pagination);
      }
    } catch (err) {
      addToast("Failed to fetch chat logs", "error");
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchLoginLogs = async () => {
    setLoadingLoginLogs(true);
    try {
      const data = await getAdminLoginLogs(loginLogPage, 10, loginLogSearch);
      if (data.success) {
        setLoginLogs(data.logs);
        setLoginLogPagination(data.pagination);
      }
    } catch (err) {
      addToast("Failed to fetch login logs", "error");
    } finally {
      setLoadingLoginLogs(false);
    }
  };

  const handleViewUserLogs = async (targetUser) => {
    setSelectedUserLogs(targetUser);
    setLoadingModalLogs(true);
    setLoadingModalPosts(true);
    setLoadingModalStories(true);
    setUserLogsForModal([]);
    setUserPostsForModal([]);
    setUserStoriesForModal([]);
    setModalActiveTab("sessions");
    try {
      const data = await getAdminLoginLogs(1, 10, "", targetUser.id);
      if (data.success) {
        setUserLogsForModal(data.logs);
      }
    } catch (err) {
      addToast("Failed to load developer session history", "error");
    } finally {
      setLoadingModalLogs(false);
    }
    try {
      const postData = await getAdminPosts(1, 20, "", "all", targetUser.id);
      if (postData.success) {
        setUserPostsForModal(postData.posts);
      }
    } catch (err) {
      addToast("Failed to load developer posts", "error");
    } finally {
      setLoadingModalPosts(false);
    }
    try {
      const storyData = await getAdminStories(1, 20, targetUser.id);
      if (storyData.success) {
        setUserStoriesForModal(storyData.stories);
      }
    } catch (err) {
      addToast("Failed to load developer stories", "error");
    } finally {
      setLoadingModalStories(false);
    }
  };

  const fetchMaintenanceMode = async () => {
    try {
      const data = await getMaintenanceStatus();
      if (data.success) {
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (err) {
      addToast("Failed to check maintenance status", "error");
    }
  };

  const fetchAnnouncements = async () => {
    setLoadingAnnouncements(true);
    try {
      const data = await getAdminAnnouncements();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (err) {
      addToast("Failed to fetch system announcements", "error");
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      addToast("Title and message content are required", "error");
      return;
    }
    setSubmittingAnnouncement(true);
    try {
      const data = await createAdminAnnouncement({
        title: annTitle,
        content: annContent,
        type: annType,
        severity: annSeverity
      });
      if (data.success) {
        addToast("Broadcast announcement posted successfully", "success");
        setAnnTitle("");
        setAnnContent("");
        setAnnType("ANNOUNCEMENT");
        setAnnSeverity("INFO");
        fetchAnnouncements();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to post announcement", "error");
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncementClick = (annId, title) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteAnnouncement",
      targetId: annId,
      targetName: title
    });
  };

  const fetchAds = async () => {
    setLoadingAds(true);
    try {
      const data = await getAdminAds();
      if (data.success) {
        setAds(data.ads || []);
      }
    } catch (err) {
      addToast("Failed to fetch advertisements", "error");
    } finally {
      setLoadingAds(false);
    }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await getAdminPosts(postPage, 10, postSearch, postStatusFilter);
      if (data.success) {
        setPosts(data.posts);
        setPostPagination(data.pagination);
        if (data.stats) {
          setFeedStats(data.stats);
        }
      }
    } catch (err) {
      addToast("Failed to fetch feed posts", "error");
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const data = await getAdminStories(storyPage, 12);
      if (data.success) {
        setStories(data.stories);
        setStoryPagination(data.pagination);
      }
    } catch (err) {
      addToast("Failed to fetch user stories", "error");
    } finally {
      setLoadingStories(false);
    }
  };

  const handleSaveCompliance = async (postId, status, legalData) => {
    setSavingCompliance(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await updateAdminPostStatus(postId, status, legalData);
      if (res.success) {
        addToast("Legal compliance details saved successfully", "success");
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status, legalCase: res.post.legalCase } : p));
        fetchPosts(); // Refresh stats banner
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to update compliance details", "error");
    } finally {
      setSavingCompliance(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleStatusChange = async (postId, status) => {
    try {
      const res = await updateAdminPostStatus(postId, status);
      if (res.success) {
        addToast(res.message, "success");
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p));
        fetchPosts(); // Refresh stats banner
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to update status", "error");
    }
  };

  useEffect(() => {
    if (activeTab === "broadcasts") {
      fetchAnnouncements();
    } else if (activeTab === "ads") {
      fetchAds();
    } else if (activeTab === "tickets") {
      fetchAdminTickets();
    } else if (activeTab === "feed") {
      if (feedSubTab === "posts") {
        fetchPosts();
      } else {
        fetchStories();
      }
    } else if (activeTab === "loginLogs") {
      fetchLoginLogs();
    }
  }, [activeTab, feedSubTab]);

  useEffect(() => {
    if (activeTab === "feed" && feedSubTab === "posts") {
      fetchPosts();
    }
  }, [postPage, postSearch, postStatusFilter]);

  useEffect(() => {
    if (activeTab === "feed" && feedSubTab === "stories") {
      fetchStories();
    }
  }, [storyPage]);

  useEffect(() => {
    if (activeTab === "loginLogs") {
      fetchLoginLogs();
    }
  }, [loginLogPage, loginLogSearch]);

  // Initial runs
  useEffect(() => {
    fetchStats();
    fetchRatings();
    fetchMaintenanceMode();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [userPage, userSearch]);

  useEffect(() => {
    fetchRooms();
  }, [roomPage, roomSearch]);

  useEffect(() => {
    fetchMessages();
  }, [messagePage, messageSearch]);

  // Actions confirmations
  const handleRoleToggle = (userId, currentRole, username) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    setConfirmModal({
      isOpen: true,
      type: "changeRole",
      targetId: userId,
      targetName: username,
      extraData: nextRole
    });
  };

  const handleUserSuspensionToggle = (userId, isSuspended, username) => {
    setConfirmModal({
      isOpen: true,
      type: "suspendUser",
      targetId: userId,
      targetName: username,
      extraData: !isSuspended
    });
  };

  const handleDeleteUserClick = (userId, username) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteUser",
      targetId: userId,
      targetName: username
    });
  };

  const handleDeleteRoomClick = (roomId, roomTitle) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteRoom",
      targetId: roomId,
      targetName: roomTitle
    });
  };

  const handleDeleteRatingClick = (ratingId, username) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteRating",
      targetId: ratingId,
      targetName: username
    });
  };

  const handleDeleteMessageClick = (msgId, senderName) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteMessage",
      targetId: msgId,
      targetName: senderName
    });
  };

  const handleDeletePostClick = (postId, authorName) => {
    setConfirmModal({
      isOpen: true,
      type: "deletePost",
      targetId: postId,
      targetName: authorName
    });
  };

  const handleDeleteCommentClick = (postId, commentId, commenterName) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteComment",
      targetId: postId,
      targetName: commenterName,
      extraData: commentId
    });
  };

  const handleDeleteStoryClick = (storyId, username) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteStory",
      targetId: storyId,
      targetName: username
    });
  };

  const handleMaintenanceToggleClick = () => {
    setConfirmModal({
      isOpen: true,
      type: "toggleMaintenance",
      targetId: null,
      targetName: maintenanceMode ? "DISABLE" : "ENABLE",
      extraData: !maintenanceMode
    });
  };

  // Execute confirmation handler
  const executeConfirmation = async () => {
    const { type, targetId, extraData } = confirmModal;
    setConfirmingAction(true);

    try {
      if (type === "changeRole") {
        const res = await updateUserRole(targetId, extraData);
        if (res.success) {
          addToast(res.message, "success");
          fetchUsers();
          fetchStats();
        }
      } else if (type === "suspendUser") {
        const res = await toggleUserSuspension(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchUsers();
          fetchStats();
        }
      } else if (type === "deleteUser") {
        const res = await deleteUser(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchUsers();
          fetchStats();
        }
      } else if (type === "deleteRoom") {
        const res = await deleteRoom(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchRooms();
          fetchStats();
        }
      } else if (type === "deleteRating") {
        const res = await deleteRating(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchRatings();
          fetchStats();
        }
      } else if (type === "deleteMessage") {
        const res = await deleteChatMessage(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchMessages();
          fetchStats();
        }
      } else if (type === "toggleMaintenance") {
        const res = await toggleMaintenanceMode(extraData);
        if (res.success) {
          addToast(res.message, "success");
          setMaintenanceMode(res.maintenanceMode);
        }
      } else if (type === "deleteAnnouncement") {
        const res = await deleteAdminAnnouncement(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchAnnouncements();
        }
      } else if (type === "deleteAd") {
        const res = await deleteAdminAd(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchAds();
        }
      } else if (type === "deletePost") {
        const res = await deleteAdminPost(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchPosts();
          fetchStats();
        }
      } else if (type === "deleteComment") {
        const res = await deleteAdminPostComment(targetId, extraData);
        if (res.success) {
          addToast(res.message, "success");
          setPosts(prev => prev.map(p => p.id === targetId ? { ...p, comments: res.comments } : p));
        }
      } else if (type === "deleteStory") {
        const res = await deleteAdminStory(targetId);
        if (res.success) {
          addToast(res.message, "success");
          fetchStories();
          fetchStats();
        }
      }
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Action failed", "error");
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleDeleteAdClick = (adId, title) => {
    setConfirmModal({
      isOpen: true,
      type: "deleteAd",
      targetId: adId,
      targetName: title
    });
  };

  const handleToggleAdStatus = async (adId) => {
    try {
      const res = await toggleAdminAd(adId);
      if (res.success) {
        addToast(res.message, "success");
        fetchAds();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to toggle status", "error");
    }
  };

  const handleCreateAdSubmit = async (e) => {
    e.preventDefault();
    if (!adTitle.trim()) {
      addToast("Ad title is required", "error");
      return;
    }
    if (!adImageFile) {
      addToast("Banner image is required", "error");
      return;
    }

    const formData = new FormData();
    formData.append("title", adTitle.trim());
    formData.append("redirectUrl", adUrl.trim());
    formData.append("format", adFormat);
    formData.append("image", adImageFile);

    setSubmittingAd(true);
    try {
      const res = await createAdminAd(formData);
      if (res.success) {
        addToast("Ad created and broadcasted successfully", "success");
        setAdTitle("");
        setAdUrl("");
        setAdFormat("SIDEBAR");
        setAdImageFile(null);
        setAdImagePreview("");
        fetchAds();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to create ad", "error");
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleTitleChange = async (userId, newTitle, username) => {
    try {
      const res = await updateUserTitle(userId, newTitle);
      if (res.success) {
        addToast(`User ${username} title updated to '${newTitle}'`, "success");
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to update title", "error");
    }
  };

  const handlePromoteSelfToggle = async () => {
    try {
      const res = await promoteSelf();
      if (res.success) {
        addToast(res.message, "success");
        localStorage.setItem("user", JSON.stringify(res.user));
        setUser(res.user);
        if (res.user.role !== "admin") {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      addToast("Promotion toggle failed", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const handleBypassAndGoToUserSite = () => {
    localStorage.setItem("ceBypassAdminRedirect", "true");
    navigate("/dashboard");
  };

  const fetchAdminTickets = async () => {
    setLoadingAdminTickets(true);
    try {
      const res = await adminGetAllTickets();
      if (res.success) {
        setAdminTickets(res.tickets || []);
      }
    } catch (err) {
      addToast("Failed to fetch tickets list", "error");
    } finally {
      setLoadingAdminTickets(false);
    }
  };

  const handleSelectAdminTicket = async (ticketId) => {
    setLoadingAdminTicketDetails(true);
    try {
      const res = await getTicketDetails(ticketId);
      if (res.success) {
        setSelectedAdminTicket(res.ticket);
      }
    } catch (err) {
      addToast("Failed to load ticket details", "error");
    } finally {
      setLoadingAdminTicketDetails(false);
    }
  };

  const handleAdminReplySubmit = async (e) => {
    e.preventDefault();
    if (!adminReplyMessage.trim() || !selectedAdminTicket) return;

    setSendingAdminReply(true);
    try {
      const res = await addTicketMessage(selectedAdminTicket._id, adminReplyMessage.trim());
      if (res.success) {
        setAdminReplyMessage("");
        setSelectedAdminTicket(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: res.status,
            messages: res.messages
          };
        });
        addToast("Reply sent successfully", "success");
        fetchAdminTickets();
      }
    } catch (err) {
      addToast("Failed to send reply", "error");
    } finally {
      setSendingAdminReply(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      const res = await adminUpdateTicketStatus(ticketId, status);
      if (res.success) {
        setSelectedAdminTicket(prev => {
          if (!prev || prev._id !== ticketId) return prev;
          return { ...prev, status };
        });
        addToast(`Ticket status updated to '${status}'`, "success");
        fetchAdminTickets();
      }
    } catch (err) {
      addToast("Failed to update status", "error");
    }
  };

  // Helper rating stars
  const renderStars = (rating) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Star key={i} size={14} className="star-icon filled" fill="#f59e0b" color="#f59e0b" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<Star key={i} size={14} className="star-icon half" fill="#f59e0b" color="#f59e0b" style={{ opacity: 0.6 }} />);
      } else {
        stars.push(<Star key={i} size={14} className="star-icon empty" color="var(--border)" />);
      }
    }
    return <div className="stars-wrapper">{stars}</div>;
  };

  // Helper date formatting
  const getPastDates = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    }
    return dates;
  };

  // Mock graphs arrays
  const mockRegistrationTrends = stats
    ? [Math.max(1, stats.totalUsers - 5), Math.max(1, stats.totalUsers - 4), Math.max(1, stats.totalUsers - 3), Math.max(1, stats.totalUsers - 2), Math.max(1, stats.totalUsers - 2), Math.max(1, stats.totalUsers - 1), stats.totalUsers]
    : [2, 4, 5, 8, 10, 11, 12];

  const mockExecutionTrends = stats
    ? [Math.max(0, stats.recentExecutions * 0.4), Math.max(0, stats.recentExecutions * 0.6), Math.max(0, stats.recentExecutions * 0.8), Math.max(0, stats.recentExecutions * 0.7), Math.max(0, stats.recentExecutions * 1.1), Math.max(0, stats.recentExecutions * 0.9), stats.recentExecutions]
    : [15, 22, 10, 31, 25, 40, 42];

  const userSparklineData = stats
    ? [
      Math.max(1, stats.totalUsers - 6),
      Math.max(1, stats.totalUsers - 5),
      Math.max(1, stats.totalUsers - 4),
      Math.max(1, stats.totalUsers - 3),
      Math.max(1, stats.totalUsers - 2),
      Math.max(1, stats.totalUsers - 1),
      stats.totalUsers
    ]
    : [2, 4, 5, 8, 10, 11, 12];

  const roomSparklineData = stats
    ? [
      Math.max(0, stats.totalRooms - 5),
      Math.max(0, stats.totalRooms - 4),
      Math.max(0, stats.totalRooms - 3),
      Math.max(0, stats.totalRooms - 2),
      Math.max(0, stats.totalRooms - 1),
      Math.max(0, stats.totalRooms - 1),
      stats.totalRooms
    ]
    : [1, 2, 2, 3, 3, 4, 4];

  const executionSparklineData = stats
    ? [
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 1.2)),
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 0.9)),
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 0.7)),
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 0.5)),
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 0.3)),
      Math.max(0, Math.round(stats.totalExecutions - stats.recentExecutions * 0.1)),
      stats.totalExecutions
    ]
    : [15, 22, 10, 31, 25, 40, 42];

  const messageSparklineData = stats
    ? [
      Math.max(0, stats.totalMessages - 12),
      Math.max(0, stats.totalMessages - 10),
      Math.max(0, stats.totalMessages - 8),
      Math.max(0, stats.totalMessages - 6),
      Math.max(0, stats.totalMessages - 4),
      Math.max(0, stats.totalMessages - 2),
      stats.totalMessages
    ]
    : [5, 8, 12, 15, 18, 22, 25];

  if (!localStorage.getItem("token")) {
    return null;
  }

  return (
    <div className={`admin-backoffice-layout ${theme}`}>
      {/* Dynamic Toasts Banners */}
      <div className="admin-toasts-container">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast-card ${t.type}`}>
            <span className="toast-icon">{t.type === "error" ? "⚠️" : "✨"}</span>
            <span className="toast-text">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Confirmation Overlays Modals */}
      {confirmModal.isOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="modal-header">
              <AlertTriangle className="warning-icon" size={22} />
              <h3>Confirm Admin Command</h3>
            </div>
            <div className="modal-body">
              {confirmModal.type === "changeRole" && (
                <p>
                  Are you sure you want to change user <strong>{confirmModal.targetName}</strong> to role{" "}
                  <span className="glow-text">{confirmModal.extraData.toUpperCase()}</span>?
                </p>
              )}
              {confirmModal.type === "suspendUser" && (
                <p>
                  Are you sure you want to {confirmModal.extraData ? <strong>SUSPEND (BAN)</strong> : <strong>REACTIVATE</strong>} user account{" "}
                  <strong>{confirmModal.targetName}</strong>?<br />
                  {confirmModal.extraData && "Suspended users are immediately booted from active sessions and blocked from logging in."}
                </p>
              )}
              {confirmModal.type === "deleteUser" && (
                <p>
                  <strong>CRITICAL DATABASE PURGE:</strong> You are deleting user account <strong>{confirmModal.targetName}</strong>.<br />
                  This cascade-deletes all associated workspaces, chat messages, bookmarks, and follow activity. This is irreversible!
                </p>
              )}
              {confirmModal.type === "deleteRoom" && (
                <p>
                  Are you sure you want to dismantle room <strong>"{confirmModal.targetName}"</strong>?<br />
                  This immediately deletes all room file synchronization configurations and chat feeds.
                </p>
              )}
              {confirmModal.type === "deleteRating" && (
                <p>
                  Are you sure you want to delete this rating submitted by <strong>{confirmModal.targetName}</strong>?
                </p>
              )}
              {confirmModal.type === "deleteMessage" && (
                <p>
                  Are you sure you want to delete and moderate this chat message sent by <strong>{confirmModal.targetName}</strong>?
                </p>
              )}
              {confirmModal.type === "toggleMaintenance" && (
                <p>
                  Are you sure you want to {confirmModal.extraData ? <strong>ENABLE SYSTEM MAINTENANCE</strong> : <strong>DISABLE SYSTEM MAINTENANCE</strong>}?<br />
                  {confirmModal.extraData ? "Normal user accounts will be blocked with a lockout splash. Only admins can bypass." : "Normal users will instantly regain system-wide dashboard access."}
                </p>
              )}
              {confirmModal.type === "deleteAnnouncement" && (
                <p>
                  Are you sure you want to delete and unbroadcast system announcement <strong>"{confirmModal.targetName}"</strong>?<br />
                  This alert will be permanently removed from all user feeds.
                </p>
              )}
              {confirmModal.type === "deleteAd" && (
                <p>
                  Are you sure you want to delete and unbroadcast sponsored promotion <strong>"{confirmModal.targetName}"</strong>?<br />
                  This advertisement and its banner will be permanently removed.
                </p>
              )}
              {confirmModal.type === "deletePost" && (
                <p>
                  <strong>CRITICAL CONTENT MODERATION:</strong> Are you sure you want to delete this post by <strong>{confirmModal.targetName}</strong>?<br />
                  This will permanently delete the post content, associated media files, and all comments on it.
                </p>
              )}
              {confirmModal.type === "deleteStory" && (
                <p>
                  <strong>CRITICAL CONTENT MODERATION:</strong> Are you sure you want to delete this story by <strong>{confirmModal.targetName}</strong>?<br />
                  This will permanently delete the story and its associated media files from storage.
                </p>
              )}
              {confirmModal.type === "deleteComment" && (
                <p>
                  Are you sure you want to delete this comment by <strong>{confirmModal.targetName}</strong>?<br />
                  This comment will be permanently removed from the post feed.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal({ isOpen: false })}>
                Cancel
              </button>
              <button
                className={`btn-modal-confirm ${["deleteUser", "suspendUser", "toggleMaintenance", "deleteAnnouncement", "deleteAd", "deletePost", "deleteComment"].includes(confirmModal.type) ? "critical" : ""
                  }`}
                onClick={executeConfirmation}
                disabled={confirmingAction}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", minWidth: "90px" }}
              >
                {confirmingAction && <Loader className="spinner" size={12} />}
                <span>{confirmingAction ? "Processing..." : "Proceed"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Developer Profile & Auth Logs Modal Overlay */}
      {selectedUserLogs && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card profile-details-modal" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <Users className="warning-icon" size={22} style={{ color: "var(--accent)" }} />
              <h3>Developer Profile & Auth Logs</h3>
              <button className="btn-modal-close-x" onClick={() => setSelectedUserLogs(null)} style={{ background: "none", border: "none", color: "var(--admin-text-muted)", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center" }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body user-profile-logs-layout" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "15px" }}>
              {/* Profile details panel */}
              <div className="profile-overview-card glass-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", textAlign: "center" }}>
                <div className="profile-large-avatar" style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: "2px solid var(--accent)", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-btn-active-bg)" }}>
                  {selectedUserLogs.avatar ? (
                    <img src={selectedUserLogs.avatar} alt={selectedUserLogs.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "2rem", fontWeight: "800", color: "var(--accent)" }}>{selectedUserLogs.username.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                
                <h4 style={{ margin: "5px 0", color: "var(--admin-text-h)" }}>{selectedUserLogs.username}</h4>
                <p style={{ margin: "2px 0 15px", fontSize: "0.85rem", color: "var(--admin-text-muted)" }}>{selectedUserLogs.email}</p>
                
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <span className={`role-badge ${selectedUserLogs.role}`}>
                    {selectedUserLogs.role.toUpperCase()}
                  </span>
                  <span className={`status-badge-dot ${selectedUserLogs.isOnline ? "online" : "offline"}`}>
                    <span className="dot"></span>
                    <span className="label" style={{ fontSize: "0.75rem" }}>{selectedUserLogs.isOnline ? "Online" : "Offline"}</span>
                  </span>
                </div>
                
                <div style={{ width: "100%", borderTop: "1px solid var(--admin-border)", padding: "15px 0 0", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--admin-text-muted)", flex: "1" }}>Developer Rank:</span>
                    <span style={{ color: "var(--admin-text-h)", fontWeight: "600" }}>{selectedUserLogs.title || "Developer"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--admin-text-muted)", flex: "1" }}>Compiler Runs:</span>
                    <span style={{ color: "var(--admin-text-h)", fontWeight: "600" }}>{selectedUserLogs.executionsCount || 0} runs</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--admin-text-muted)", flex: "1" }}>Registered Date:</span>
                    <span style={{ color: "var(--admin-text-h)", fontWeight: "600" }}>{new Date(selectedUserLogs.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Tabbed panel for Sessions, Posts, and Stories */}
              <div className="sessions-list-panel glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", minHeight: "380px", flex: 1 }}>
                {/* Modal Tab Headers */}
                <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--admin-border)", paddingBottom: "10px", marginBottom: "15px" }}>
                  <button
                    onClick={() => setModalActiveTab("sessions")}
                    className={`feed-subtab-btn ${modalActiveTab === "sessions" ? "active" : ""}`}
                    style={{
                      background: modalActiveTab === "sessions" ? "var(--admin-btn-active-bg)" : "none",
                      border: `1px solid ${modalActiveTab === "sessions" ? "var(--admin-btn-active-border)" : "transparent"}`,
                      color: modalActiveTab === "sessions" ? "var(--accent)" : "var(--admin-text-muted)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: "700"
                    }}
                  >
                    Sessions ({userLogsForModal.length})
                  </button>
                  <button
                    onClick={() => setModalActiveTab("posts")}
                    className={`feed-subtab-btn ${modalActiveTab === "posts" ? "active" : ""}`}
                    style={{
                      background: modalActiveTab === "posts" ? "var(--admin-btn-active-bg)" : "none",
                      border: `1px solid ${modalActiveTab === "posts" ? "var(--admin-btn-active-border)" : "transparent"}`,
                      color: modalActiveTab === "posts" ? "var(--accent)" : "var(--admin-text-muted)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: "700"
                    }}
                  >
                    Posts ({userPostsForModal.length})
                  </button>
                  <button
                    onClick={() => setModalActiveTab("stories")}
                    className={`feed-subtab-btn ${modalActiveTab === "stories" ? "active" : ""}`}
                    style={{
                      background: modalActiveTab === "stories" ? "var(--admin-btn-active-bg)" : "none",
                      border: `1px solid ${modalActiveTab === "stories" ? "var(--admin-btn-active-border)" : "transparent"}`,
                      color: modalActiveTab === "stories" ? "var(--accent)" : "var(--admin-text-muted)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      fontWeight: "700"
                    }}
                  >
                    Stories ({userStoriesForModal.length})
                  </button>
                </div>

                {/* TAB 1: SESSIONS */}
                {modalActiveTab === "sessions" && (
                  <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: "300px", flex: 1 }}>
                    {loadingModalLogs ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", flex: 1 }}>
                        <Loader className="spinner" size={20} />
                      </div>
                    ) : userLogsForModal.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--admin-text-muted)", fontStyle: "italic", padding: "40px 0" }}>No session logs found.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {userLogsForModal.map((log, index) => {
                          let durationStr = "Running...";
                          if (log.logoutTime) {
                            const durationMs = new Date(log.logoutTime) - new Date(log.loginTime);
                            if (durationMs > 0) {
                              const secs = Math.floor(durationMs / 1000);
                              const mins = Math.floor(secs / 60);
                              const hours = Math.floor(mins / 60);
                              if (hours > 0) durationStr = `${hours}h ${mins % 60}m`;
                              else if (mins > 0) durationStr = `${mins}m ${secs % 60}s`;
                              else durationStr = `${secs}s`;
                            } else {
                              durationStr = "0s";
                            }
                          }
                          
                          return (
                            <div key={log.id || index} style={{ borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                                <span style={{ fontWeight: "700", color: "var(--accent)" }}>Session #{index + 1}</span>
                                <span style={{ fontFamily: "monospace", color: "var(--admin-text-muted)" }}>{log.ipAddress || "Unknown IP"}</span>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "0.78rem", color: "var(--admin-text)" }}>
                                <div style={{ display: "flex" }}><span style={{ width: "60px", color: "var(--admin-text-muted)" }}>Login:</span> <span>{new Date(log.loginTime).toLocaleString()}</span></div>
                                <div style={{ display: "flex" }}><span style={{ width: "60px", color: "var(--admin-text-muted)" }}>Logout:</span> <span>{log.logoutTime ? new Date(log.logoutTime).toLocaleString() : <span style={{ color: "var(--chart-green-color, #10b981)", fontWeight: "600" }}>Active Session</span>}</span></div>
                                <div style={{ display: "flex" }}><span style={{ width: "60px", color: "var(--admin-text-muted)" }}>Duration:</span> <span style={{ fontWeight: !log.logoutTime ? "600" : "normal" }}>{durationStr}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: POSTS */}
                {modalActiveTab === "posts" && (
                  <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: "300px", flex: 1, gap: "12px" }}>
                    {loadingModalPosts ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", flex: 1 }}>
                        <Loader className="spinner" size={20} />
                      </div>
                    ) : userPostsForModal.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--admin-text-muted)", fontStyle: "italic", padding: "40px 0" }}>No posts found for this user.</div>
                    ) : (
                      userPostsForModal.map((p) => (
                        <div key={p.id} style={{ borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <span style={{ fontSize: "0.74rem", color: "var(--admin-text-muted)" }}>{new Date(p.createdAt).toLocaleString()}</span>
                             <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                               <select
                                 value={p.status || "active"}
                                 onChange={async (e) => {
                                   await handleStatusChange(p.id, e.target.value);
                                   const postData = await getAdminPosts(1, 20, "", "all", selectedUserLogs.id);
                                   if (postData.success) setUserPostsForModal(postData.posts);
                                 }}
                                 style={{ background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", fontSize: "0.7rem", color: "var(--admin-text-h)", padding: "2px 6px", outline: "none" }}
                               >
                                 <option value="active">Active</option>
                                 <option value="flagged">Flagged</option>
                                 <option value="hidden">Hidden</option>
                               </select>
                               <button
                                 onClick={async () => {
                                   if (window.confirm("Are you sure you want to delete this post?")) {
                                     const res = await deleteAdminPost(p.id);
                                     if (res.success) {
                                       addToast(res.message, "success");
                                       const postData = await getAdminPosts(1, 20, "", "all", selectedUserLogs.id);
                                       if (postData.success) setUserPostsForModal(postData.posts);
                                       fetchPosts();
                                     }
                                   }
                                 }}
                                 style={{ background: "none", border: "none", color: "var(--admin-text-muted)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                               >
                                 <Trash2 size={12} />
                               </button>
                             </div>
                           </div>
                           <p style={{ margin: "0", fontSize: "0.8rem", color: "var(--admin-text-h)", whiteSpace: "pre-wrap" }}>{p.text}</p>
                           {p.image && (
                             <div style={{ width: "60px", height: "45px", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--admin-border-subtle)" }}>
                               <img src={p.image} alt="Attached Media" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                             </div>
                           )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: STORIES */}
                {modalActiveTab === "stories" && (
                  <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: "300px", flex: 1, gap: "12px" }}>
                    {loadingModalStories ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", flex: 1 }}>
                        <Loader className="spinner" size={20} />
                      </div>
                    ) : userStoriesForModal.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--admin-text-muted)", fontStyle: "italic", padding: "40px 0" }}>No stories found for this user.</div>
                    ) : (
                      userStoriesForModal.map((s) => (
                        <div key={s.id} style={{ borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                             <span style={{ fontSize: "0.74rem", color: "var(--admin-text-muted)" }}>{new Date(s.createdAt).toLocaleString()}</span>
                             <button
                               onClick={async () => {
                                 if (window.confirm("Are you sure you want to delete this story?")) {
                                   const res = await deleteAdminStory(s.id);
                                   if (res.success) {
                                     addToast(res.message, "success");
                                     const storyData = await getAdminStories(1, 20, selectedUserLogs.id);
                                     if (storyData.success) setUserStoriesForModal(storyData.stories);
                                     fetchStories();
                                   }
                                 }
                               }}
                               style={{ background: "none", border: "none", color: "var(--admin-text-muted)", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                             >
                               <Trash2 size={12} />
                             </button>
                           </div>
                           {s.text && <p style={{ margin: "0", fontSize: "0.8rem", color: "var(--admin-text-h)" }}>{s.text}</p>}
                           {s.mediaUrl && (
                             <div style={{ width: "60px", height: "60px", borderRadius: "4px", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
                               {s.mediaUrl.match(/\.(mp4|mov|avi|webm)/i) || s.mediaUrl.includes("video") ? (
                                 <video src={s.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                               ) : (
                                 <img src={s.mediaUrl} alt="Story Media" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                               )}
                             </div>
                           )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions" style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-modal-cancel" onClick={() => setSelectedUserLogs(null)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED INDEPENDENT SIDEBAR */}
      <aside className={`admin-backoffice-sidebar ${isMobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-branding">
          <div className="branding-header-row">
            <Logo size={28} showText={true} />
            <button className="btn-mobile-sidebar-close" onClick={() => setIsMobileSidebarOpen(false)} aria-label="Close Sidebar">
              <X size={18} />
            </button>
          </div>
          <span className="branding-badge">CONTROL ROOM</span>
        </div>

        <nav className="sidebar-nav-links">
          <button
            onClick={() => { setActiveTab("overview"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "overview" ? "active" : ""}`}
          >
            <TrendingUp size={16} />
            <span>Diagnostics Overview</span>
          </button>

          <button
            onClick={() => { setActiveTab("users"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "users" ? "active" : ""}`}
          >
            <Users size={16} />
            <span>Developers Accounts</span>
          </button>

          <button
            onClick={() => { setActiveTab("loginLogs"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "loginLogs" ? "active" : ""}`}
          >
            <Activity size={16} />
            <span>Login History</span>
          </button>

          <button
            onClick={() => { setActiveTab("rooms"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "rooms" ? "active" : ""}`}
          >
            <FolderCode size={16} />
            <span>Rooms Moderation</span>
          </button>

          <button
            onClick={() => { setActiveTab("chat"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "chat" ? "active" : ""}`}
          >
            <MessageSquare size={16} />
            <span>Chat Moderation</span>
          </button>

          <button
            onClick={() => { setActiveTab("feed"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "feed" ? "active" : ""}`}
          >
            <Zap size={16} />
            <span>Network Feed</span>
          </button>

          <button
            onClick={() => { setActiveTab("ratings"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "ratings" ? "active" : ""}`}
          >
            <Star size={16} />
            <span>User Reviews</span>
          </button>

          <button
            onClick={() => { setActiveTab("maintenance"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "maintenance" ? "active" : ""}`}
          >
            <Sliders size={16} />
            <span>System Locks</span>
          </button>

          <button
            onClick={() => { setActiveTab("broadcasts"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "broadcasts" ? "active" : ""}`}
          >
            <Megaphone size={16} />
            <span>System Broadcasts</span>
          </button>

          <button
            onClick={() => { setActiveTab("ads"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "ads" ? "active" : ""}`}
          >
            <AppWindow size={16} />
            <span>Ad Manager</span>
          </button>

          <button
            onClick={() => { setActiveTab("tickets"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "tickets" ? "active" : ""}`}
          >
            <HelpCircle size={16} />
            <span>Help Desk</span>
          </button>
        </nav>

        <div className="sidebar-footer-controls">
          <button onClick={handleBypassAndGoToUserSite} className="sidebar-nav-item-btn back-site">
            <AppWindow size={16} />
            <span>User Site View</span>
          </button>
          <button onClick={handleLogout} className="sidebar-nav-item-btn logout">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay backdrop when sidebar is open */}
      {isMobileSidebarOpen && (
        <div className="admin-sidebar-overlay-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* CORE DISPLAY WINDOW */}
      <main className="admin-backoffice-main">
        {/* Top diagnostics bar */}
        <header className="admin-backoffice-topnav">
          <div className="topnav-left-path">
            <button className="btn-mobile-sidebar-open" onClick={() => setIsMobileSidebarOpen(true)} aria-label="Open Sidebar">
              <Menu size={18} />
            </button>
            <Server size={14} className="muted-icon" />
            <span className="path-parent">CodeExpo Control Room</span>
            <span className="path-separator">/</span>
            <span className="path-current">{activeTab.toUpperCase()}</span>
          </div>

          <div className="topnav-right-profile">
            {maintenanceMode && (
              <span className="topnav-maintenance-warning">
                <Lock size={12} />
                <span>Maintenance Active</span>
              </span>
            )}

            <button
              onClick={toggleTheme}
              className="btn-topnav-theme-toggle"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              onClick={() => {
                fetchStats();
                fetchUsers();
                fetchRooms();
                fetchRatings();
                fetchMessages();
                fetchLoginLogs();
                addToast("Diagnostics synchronized successfully", "success");
              }}
              className="btn-topnav-refresh"
              title="Synchronize Diagnostics"
            >
              <RefreshCw size={13} />
            </button>

            <div className="admin-profile-box">
              <div className="profile-details-text">
                <span className="name">{user?.username}</span>
                <span className="role-tag">SYSTEM ADMIN</span>
              </div>
              <div className="profile-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.username} className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">{(user?.username || "A").substring(0, 2).toUpperCase()}</div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="admin-backoffice-content">
          {/* TAB 1: DIAGNOSTICS & PLOTS */}
          {activeTab === "overview" && (
            <div className="tab-pane-overview animate-fade-in">
              {loadingStats ? (
                <div className="diag-loader-container">
                  <Loader className="spinner" size={30} />
                  <span>Loading platform diagnostics...</span>
                </div>
              ) : error ? (
                <div className="diag-error-container">
                  <AlertTriangle size={24} />
                  <span>{error}</span>
                </div>
              ) : (
                <>
                  {/* ANIMAED RADIAL GAUGES */}
                  <div className="radial-gauges-grid">
                    <AdminRadialGauge value={cpuUsage} label="CPU Core Load" colorClass="purple" />
                    <AdminRadialGauge value={memoryUsage} label="Memory Load" colorClass="blue" />
                    <AdminRadialGauge value={networkStats} label="Socket Pool Capacity" colorClass="green" />
                  </div>

                  {/* METRICS GRID */}
                  <div className="diag-stats-grid">
                    <div className="diag-card glass-panel">
                      <div className="diag-card-left">
                        <div className="card-top">
                          <Users size={18} className="diag-icon purple" />
                          <span className="card-label">Registered Developers</span>
                        </div>
                        <div className="card-val">{stats.totalUsers}</div>
                        <div className="card-footer-info">
                          <span className="online-pulse"></span>
                          <span className="subtext">{stats.onlineUsers} online now</span>
                        </div>
                      </div>
                      <div className="diag-card-right">
                        <div className="sparkline-wrapper">
                          {renderDiagnosticSparkline(userSparklineData, stats.onlineUsers > 0)}
                        </div>
                        <span className={`sparkline-indicator ${stats.onlineUsers > 0 ? "active" : "slow"}`}>
                          {stats.onlineUsers > 0 ? "▲ ACTIVE" : "▼ SLOW"}
                        </span>
                      </div>
                    </div>

                    <div className="diag-card glass-panel">
                      <div className="diag-card-left">
                        <div className="card-top">
                          <FolderCode size={18} className="diag-icon green" />
                          <span className="card-label">Active Workspaces</span>
                        </div>
                        <div className="card-val">{stats.totalRooms}</div>
                        <div className="card-footer-info">
                          <span className="subtext">+{stats.recentRoomsCreated} new rooms in 24h</span>
                        </div>
                      </div>
                      <div className="diag-card-right">
                        <div className="sparkline-wrapper">
                          {renderDiagnosticSparkline(roomSparklineData, stats.recentRoomsCreated > 0)}
                        </div>
                        <span className={`sparkline-indicator ${stats.recentRoomsCreated > 0 ? "active" : "slow"}`}>
                          {stats.recentRoomsCreated > 0 ? "▲ ACTIVE" : "▼ SLOW"}
                        </span>
                      </div>
                    </div>

                    <div className="diag-card glass-panel">
                      <div className="diag-card-left">
                        <div className="card-top">
                          <Terminal size={18} className="diag-icon blue" />
                          <span className="card-label">Compiler Runs</span>
                        </div>
                        <div className="card-val">{stats.totalExecutions.toLocaleString()}</div>
                        <div className="card-footer-info">
                          <span className="subtext">+{stats.recentExecutions} runs in 24h</span>
                        </div>
                      </div>
                      <div className="diag-card-right">
                        <div className="sparkline-wrapper">
                          {renderDiagnosticSparkline(executionSparklineData, stats.recentExecutions > 0)}
                        </div>
                        <span className={`sparkline-indicator ${stats.recentExecutions > 0 ? "active" : "slow"}`}>
                          {stats.recentExecutions > 0 ? "▲ ACTIVE" : "▼ SLOW"}
                        </span>
                      </div>
                    </div>

                    <div className="diag-card glass-panel">
                      <div className="diag-card-left">
                        <div className="card-top">
                          <MessageSquare size={18} className="diag-icon yellow" />
                          <span className="card-label">Global Messages</span>
                        </div>
                        <div className="card-val">{stats.totalMessages.toLocaleString()}</div>
                        <div className="card-footer-info">
                          <span className="subtext">Across all rooms</span>
                        </div>
                      </div>
                      <div className="diag-card-right">
                        <div className="sparkline-wrapper">
                          {renderDiagnosticSparkline(messageSparklineData, stats.recentExecutions > 0 || stats.onlineUsers > 0)}
                        </div>
                        <span className={`sparkline-indicator ${(stats.recentExecutions > 0 || stats.onlineUsers > 0) ? "active" : "slow"}`}>
                          {(stats.recentExecutions > 0 || stats.onlineUsers > 0) ? "▲ ACTIVE" : "▼ SLOW"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SVG LINE PLOTS */}
                  <div className="admin-charts-grid">
                    <AdminSVGChart
                      data={mockRegistrationTrends}
                      label="Developer Registrations Growth"
                      colorClass="purple"
                      labels={getPastDates()}
                    />
                    <AdminSVGChart
                      data={mockExecutionTrends}
                      label="Code Executions Timelines"
                      colorClass="blue"
                      labels={getPastDates()}
                    />
                  </div>

                  {/* LIVE PRESENCE & TRACKING PANEL */}
                  <div className="live-presence-card glass-panel" style={{ marginTop: "24px", marginBottom: "24px" }}>
                    <div className="console-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px", marginBottom: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="online-pulse-live" style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }}></span>
                        <h4 style={{ margin: "0", fontSize: "0.95rem", fontWeight: "750", color: "var(--admin-text-h)" }}>Live Presence & Session Tracking (Come & Go)</h4>
                      </div>
                      <span style={{ fontSize: "0.74rem", color: "var(--admin-text-muted)", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                        {stats.onlineUsersList ? stats.onlineUsersList.length : 0} Developers Online
                      </span>
                    </div>

                    <div className="live-presence-body">
                      {(!stats.onlineUsersList || stats.onlineUsersList.length === 0) ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--admin-text-muted)", fontStyle: "italic" }}>
                          No developers are currently active on the platform.
                        </div>
                      ) : (
                        <div className="live-presence-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                          {stats.onlineUsersList.map((onlineUser) => {
                            // Calculate online duration
                            let activeSince = "Just now";
                            if (onlineUser.lastSeene) {
                              const diffMs = Date.now() - new Date(onlineUser.lastSeene);
                              const diffMins = Math.floor(diffMs / 60000);
                              if (diffMins > 60) {
                                const hours = Math.floor(diffMins / 60);
                                activeSince = `Active for ${hours}h ${diffMins % 60}m`;
                              } else if (diffMins > 0) {
                                activeSince = `Active for ${diffMins}m`;
                              } else {
                                activeSince = "Active for < 1m";
                              }
                            }
                            return (
                              <div key={onlineUser.id} className="live-user-session-card glass-panel" style={{ display: "flex", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--admin-border-subtle)", borderRadius: "10px", transition: "transform 0.2s ease, border-color 0.2s ease" }}>
                                <div className="user-avatar-wrapper" style={{ width: "40px", height: "40px", position: "relative" }}>
                                  {onlineUser.avatar ? (
                                    <img src={onlineUser.avatar} alt={onlineUser.username} className="avatar-img" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                                  ) : (
                                    <div className="avatar-placeholder" style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-btn-active-bg)", color: "var(--accent)", fontWeight: "700" }}>{onlineUser.username.substring(0, 2).toUpperCase()}</div>
                                  )}
                                  <span style={{ position: "absolute", bottom: "0", right: "0", width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", border: "2px solid var(--admin-panel-bg)" }}></span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                                  <span style={{ fontWeight: "700", color: "var(--admin-text-h)", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{onlineUser.username}</span>
                                  <span style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{onlineUser.email}</span>
                                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                                    <span style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "var(--admin-btn-active-bg)", padding: "1px 6px", borderRadius: "4px", color: "var(--admin-text)" }}>{onlineUser.ipAddress}</span>
                                    <span style={{ fontSize: "0.68rem", color: "var(--chart-green-color, #10b981)" }}>{activeSince}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SYSTEM LOGS TERMINAL LOGGER */}
                  <div className="console-terminal-card glass-panel">
                    <div className="console-header">
                      <div className="console-indicators">
                        <span className="dot red"></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                      </div>
                      <span className="console-title">platform-logs-stream.sh</span>
                      <button onClick={() => setTerminalLogs([])} className="btn-console-clear">
                        Clear Logs
                      </button>
                    </div>
                    <div className="console-body" ref={consoleBodyRef}>
                      {terminalLogs.length === 0 ? (
                        <div className="console-empty">Logs buffer empty. Stream awaiting platform activities...</div>
                      ) : (
                        terminalLogs.map((log) => (
                          <div key={log.id} className="console-log-row">
                            <span className="log-time">[{log.time}]</span>
                            <span className={`log-type ${log.type.toLowerCase()}`}>[{log.type}]</span>
                            <span className="log-text">{log.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: DEVELOPERS ACCOUNTS */}
          {activeTab === "users" && (() => {
            const adminUsers = admins;
            const regularUsers = users;

            const renderUserTable = (userList, emptyMessage) => (
              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Developer</th>
                      <th>Email</th>
                      <th>System Role</th>
                      <th>Developer Rank</th>
                      <th>Status</th>
                      <th>Compiler Runs</th>
                      <th>Registered</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-table-row">
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : (
                      userList.map((u) => {
                        const isSelf = String(u.id) === String(user?.id);
                        return (
                          <tr key={u.id} className={isSelf ? "self-row" : ""}>
                            <td className="user-details-cell clickable-cell" onClick={() => handleViewUserLogs(u)} style={{ cursor: "pointer" }} title="Click to view profile & authentication history">
                              <div className="user-avatar-wrapper">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.username} className="avatar-img" />
                                ) : (
                                  <div className="avatar-placeholder">{u.username.substring(0, 2).toUpperCase()}</div>
                                )}
                              </div>
                              <span className="username-text">
                                {u.username} {isSelf && <span className="self-tag">(You)</span>}
                              </span>
                            </td>
                            <td>
                              <div className="email-flex">
                                <Mail size={12} className="muted-icon" />
                                <span>{u.email}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`role-badge ${u.role}`}>
                                {u.role === "admin" ? <Shield size={10} /> : <UserIcon size={10} />}
                                {u.role.toUpperCase()}
                              </span>
                              {u.isSuspended && <span className="role-badge suspended">BANNED</span>}
                            </td>
                            <td>
                              <select
                                value={u.title || "Developer"}
                                onChange={(e) => handleTitleChange(u.id, e.target.value, u.username)}
                                className="admin-title-select"
                                disabled={isSelf || (!isSuperAdmin && (u.role === "admin" || u.email === "adminsachin@gmail.com"))}
                              >
                                <option value="Developer">Developer</option>
                                <option value="Senior Developer">Senior Developer</option>
                                <option value="Elite Developer">Elite Developer</option>
                                <option value="Lead Architect">Lead Architect</option>
                                <option value="Legendary Developer">Legendary Developer</option>
                                <option value="System Admin">System Admin</option>
                              </select>
                            </td>
                            <td>
                              <span className={`status-badge-dot ${u.isOnline ? "online" : "offline"}`}>
                                <span className="dot"></span>
                                <span className="label">{u.isOnline ? "Online" : "Offline"}</span>
                              </span>
                            </td>
                            <td className="monospaced-text">{u.executionsCount} runs</td>
                            <td>
                              <div className="date-flex">
                                <Calendar size={12} className="muted-icon" />
                                <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="actions-cell">
                              {u.email !== "adminsachin@gmail.com" && (
                                <button
                                  onClick={() => handleRoleToggle(u.id, u.role, u.username)}
                                  className={`btn-action role-toggle ${u.role === "admin" ? "demote" : "promote"}`}
                                  disabled={isSelf || !isSuperAdmin}
                                  title={
                                    isSelf
                                      ? "You cannot modify your own role"
                                      : !isSuperAdmin
                                        ? "Only the super admin can modify roles"
                                        : ""
                                  }
                                >
                                  {u.role === "admin" ? "Make User" : "Make Admin"}
                                </button>
                              )}
                              <button
                                onClick={() => handleUserSuspensionToggle(u.id, u.isSuspended, u.username)}
                                className={`btn-action-suspend ${u.isSuspended ? "active" : ""}`}
                                disabled={isSelf || (!isSuperAdmin && (u.role === "admin" || u.email === "adminsachin@gmail.com"))}
                                title={
                                  isSelf
                                    ? "You cannot suspend your own account"
                                    : (!isSuperAdmin && (u.role === "admin" || u.email === "adminsachin@gmail.com"))
                                      ? "Only the super admin can suspend administrators"
                                      : u.isSuspended ? "Reactivate user account" : "Suspend user account"
                                }
                              >
                                <VolumeX size={12} />
                                <span>{u.isSuspended ? "Unban" : "Ban"}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUserClick(u.id, u.username)}
                                className="btn-action-delete"
                                disabled={isSelf || (!isSuperAdmin && (u.role === "admin" || u.email === "adminsachin@gmail.com"))}
                                title={
                                  isSelf
                                    ? "You cannot delete your own account"
                                    : (!isSuperAdmin && (u.role === "admin" || u.email === "adminsachin@gmail.com"))
                                      ? "Only the super admin can delete administrators"
                                      : "Delete User account permanently"
                                }
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );

            return (
              <div className="tab-pane-developers-layout animate-fade-in">
                <div className="table-search-row glass-panel" style={{ marginBottom: "20px" }}>
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search developers by name or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      className="table-search-input"
                    />
                  </div>
                  {loadingUsers && <Loader className="spinner table-inline-loader" size={14} />}
                </div>

                {/* Box 1: Administrators */}
                <div className="developer-box-section glass-panel" style={{ marginBottom: "24px" }}>
                  <div className="section-box-header">
                    <Shield size={18} className="purple-accent-glow" />
                    <h4>System Administrators ({adminUsers.length})</h4>
                  </div>
                  {renderUserTable(adminUsers, "No administrators found on this page.")}
                </div>

                {/* Box 2: Regular Developers */}
                <div className="developer-box-section glass-panel">
                  <div className="section-box-header">
                    <UserIcon size={18} className="blue-accent-glow" />
                    <h4>Registered Developers ({regularUsers.length})</h4>
                  </div>
                  {renderUserTable(regularUsers, "No regular developers found on this page.")}
                </div>

                {/* PAGINATION */}
                {userPagination.totalPages > 1 && (
                  <div className="table-pagination-row" style={{ marginTop: "24px" }}>
                    <button
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                      className="btn-page-nav"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>
                    <span className="page-indicator">
                      Page <strong>{userPage}</strong> of <strong>{userPagination.totalPages}</strong> ({userPagination.totalUsers} developers)
                    </span>
                    <button
                      disabled={userPage >= userPagination.totalPages}
                      onClick={() => setUserPage((prev) => Math.min(userPagination.totalPages, prev + 1))}
                      className="btn-page-nav"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB: LOGIN/LOGOUT LOGS */}
          {activeTab === "loginLogs" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
              <div className="table-search-row">
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search logs by developer name or email..."
                    value={loginLogSearch}
                    onChange={(e) => {
                      setLoginLogSearch(e.target.value);
                      setLoginLogPage(1);
                    }}
                    className="table-search-input"
                  />
                </div>
                {loadingLoginLogs && <Loader className="spinner table-inline-loader" size={14} />}
              </div>

              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Developer</th>
                      <th>Email</th>
                      <th>Login Date/Time</th>
                      <th>Logout Date/Time</th>
                      <th>Session Duration</th>
                      <th>IP Address</th>
                      <th>Client Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-table-row">
                          {loadingLoginLogs ? "Loading session history..." : "No authentication logs found."}
                        </td>
                      </tr>
                    ) : (
                      loginLogs.map((log) => {
                        // Calculate duration
                        let durationStr = "Running...";
                        if (log.logoutTime) {
                          const durationMs = new Date(log.logoutTime) - new Date(log.loginTime);
                          if (durationMs > 0) {
                            const secs = Math.floor(durationMs / 1000);
                            const mins = Math.floor(secs / 60);
                            const hours = Math.floor(mins / 60);
                            
                            if (hours > 0) {
                              durationStr = `${hours}h ${mins % 60}m`;
                            } else if (mins > 0) {
                              durationStr = `${mins}m ${secs % 60}s`;
                            } else {
                              durationStr = `${secs}s`;
                            }
                          } else {
                            durationStr = "0s";
                          }
                        }

                        // Parse simple user agent description
                        let deviceStr = "Unknown Browser";
                        const ua = log.userAgent;
                        if (ua) {
                          if (ua.includes("Chrome") && !ua.includes("Edg")) deviceStr = "Google Chrome";
                          else if (ua.includes("Safari") && !ua.includes("Chrome")) deviceStr = "Safari";
                          else if (ua.includes("Firefox")) deviceStr = "Mozilla Firefox";
                          else if (ua.includes("Edg")) deviceStr = "Microsoft Edge";
                          else if (ua.includes("Postman")) deviceStr = "Postman Runtime";
                          else deviceStr = ua.split(" ")[0] || "Browser Client";
                          
                          if (ua.includes("Windows")) deviceStr += " (Windows)";
                          else if (ua.includes("Macintosh")) deviceStr += " (macOS)";
                          else if (ua.includes("Linux")) deviceStr += " (Linux)";
                          else if (ua.includes("Android")) deviceStr += " (Android)";
                          else if (ua.includes("iPhone")) deviceStr += " (iPhone)";
                        }

                        return (
                          <tr key={log.id}>
                            <td className="user-details-cell clickable-cell" onClick={() => log.user && handleViewUserLogs(log.user)} style={{ cursor: log.user ? "pointer" : "default" }} title={log.user ? "Click to view profile & authentication history" : ""}>
                              <div className="user-avatar-wrapper">
                                {log.user?.avatar ? (
                                  <img src={log.user.avatar} alt={log.username} className="avatar-img" />
                                ) : (
                                  <div className="avatar-placeholder">{log.username.substring(0, 2).toUpperCase()}</div>
                                )}
                              </div>
                              <span className="username-text">{log.username}</span>
                            </td>
                            <td>
                              <div className="email-flex">
                                <Mail size={12} className="muted-icon" />
                                <span>{log.email}</span>
                              </div>
                            </td>
                            <td>
                              <div className="date-flex">
                                <Calendar size={12} className="muted-icon" />
                                <span>{new Date(log.loginTime).toLocaleString()}</span>
                              </div>
                            </td>
                            <td>
                              {log.logoutTime ? (
                                <div className="date-flex">
                                  <Calendar size={12} className="muted-icon" />
                                  <span>{new Date(log.logoutTime).toLocaleString()}</span>
                                </div>
                              ) : (
                                <span className="status-badge-dot online">
                                  <span className="dot"></span>
                                  <span className="label">Active Session</span>
                                </span>
                              )}
                            </td>
                            <td className="monospaced-text" style={{ fontWeight: !log.logoutTime ? "600" : "normal", color: !log.logoutTime ? "var(--chart-green-color, #10b981)" : "inherit" }}>
                              {durationStr}
                            </td>
                            <td className="monospaced-text">{log.ipAddress || "N/A"}</td>
                            <td className="client-info-cell" title={ua}>
                              {deviceStr}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {loginLogPagination.totalPages > 1 && (
                <div className="table-pagination-row" style={{ marginTop: "24px" }}>
                  <button
                    disabled={loginLogPage <= 1}
                    onClick={() => setLoginLogPage((prev) => Math.max(1, prev - 1))}
                    className="btn-page-nav"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span className="page-indicator">
                    Page <strong>{loginLogPage}</strong> of <strong>{loginLogPagination.totalPages}</strong> ({loginLogPagination.totalLogs} logs)
                  </span>
                  <button
                    disabled={loginLogPage >= loginLogPagination.totalPages}
                    onClick={() => setLoginLogPage((prev) => Math.min(loginLogPagination.totalPages, prev + 1))}
                    className="btn-page-nav"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ROOM MODERATION */}
          {activeTab === "rooms" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
              <div className="table-search-row">
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search rooms by title, ID, or language environment..."
                    value={roomSearch}
                    onChange={(e) => {
                      setRoomSearch(e.target.value);
                      setRoomPage(1);
                    }}
                    className="table-search-input"
                  />
                </div>
                {loadingRooms && <Loader className="spinner table-inline-loader" size={14} />}
              </div>

              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Room Title / ID</th>
                      <th>Environment</th>
                      <th>Privacy</th>
                      <th>Creator</th>
                      <th>Active Members</th>
                      <th>Last Updated</th>
                      <th className="actions-header">Moderate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-table-row">
                          {loadingRooms ? "Loading rooms..." : "No collaboration rooms found."}
                        </td>
                      </tr>
                    ) : (
                      rooms.map((r) => (
                        <tr key={r.id}>
                          <td className="room-title-cell">
                            <span className="room-title-text">{r.title}</span>
                            <span className="room-id-subtext">{r.roomId}</span>
                          </td>
                          <td>
                            <span className={`lang-pill ${r.language.toLowerCase()}`}>{r.language.toUpperCase()}</span>
                          </td>
                          <td>
                            <span className={`privacy-badge ${r.isPrivate ? "private" : "public"}`}>
                              {r.isPrivate ? "Private" : "Public"}
                            </span>
                          </td>
                          <td>
                            <span className="creator-name">{r.createdBy?.username || "Deleted User"}</span>
                          </td>
                          <td className="monospaced-text">{r.participantsCount} connected</td>
                          <td>{new Date(r.lastActivity || r.createdAt).toLocaleString()}</td>
                          <td className="actions-cell">
                            <button
                              onClick={() => handleDeleteRoomClick(r.id, r.title)}
                              className="btn-action-delete"
                              title="Teardown collaboration room resources"
                            >
                              <Trash2 size={13} />
                              <span>Teardown</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {roomPagination.totalPages > 1 && (
                <div className="table-pagination-row">
                  <button
                    disabled={roomPage <= 1}
                    onClick={() => setRoomPage((prev) => Math.max(1, prev - 1))}
                    className="btn-page-nav"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span className="page-indicator">
                    Page <strong>{roomPage}</strong> of <strong>{roomPagination.totalPages}</strong> ({roomPagination.totalRooms} rooms)
                  </span>
                  <button
                    disabled={roomPage >= roomPagination.totalPages}
                    onClick={() => setRoomPage((prev) => Math.min(roomPagination.totalPages, prev + 1))}
                    className="btn-page-nav"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CHAT MODERATION TIMELINE */}
          {activeTab === "chat" && (() => {
            const groupedRooms = {};
            messages.forEach(m => {
              if (!groupedRooms[m.roomId]) {
                groupedRooms[m.roomId] = {
                  roomId: m.roomId,
                  roomTitle: m.roomTitle,
                  messages: []
                };
              }
              groupedRooms[m.roomId].messages.push(m);
            });
            const groupedRoomsArray = Object.values(groupedRooms);

            return (
              <div className="tab-pane-chat-moderation animate-fade-in">
                <div className="table-search-row">
                  <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search chat message contents..."
                      value={messageSearch}
                      onChange={(e) => {
                        setMessageSearch(e.target.value);
                        setMessagePage(1);
                      }}
                      className="table-search-input"
                    />
                  </div>
                  {loadingMessages && <Loader className="spinner table-inline-loader" size={14} />}
                </div>

                <div className="chat-cabinets-grid">
                  {groupedRoomsArray.length === 0 ? (
                    <div className="empty-cabinets-state glass-panel">
                      {loadingMessages ? "Fetching chat logs..." : "No recent chat messages found."}
                    </div>
                  ) : (
                    groupedRoomsArray.map((room) => {
                      const isExpanded = !!expandedRooms[room.roomId] || !!messageSearch;
                      return (
                        <div key={room.roomId} className={`room-chat-cabinet glass-panel ${isExpanded ? "expanded" : ""}`}>
                          <div className="cabinet-header">
                            <div className="cabinet-room-info">
                              <span className="room-title-label">{room.roomTitle}</span>
                              <span className="room-id-subtext">{room.roomId}</span>
                            </div>
                            <div className="cabinet-actions">
                              <span className="message-count-indicator">
                                {room.messages.length} {room.messages.length === 1 ? "Message" : "Messages"}
                              </span>
                              <button
                                onClick={() => {
                                  setExpandedRooms(prev => ({
                                    ...prev,
                                    [room.roomId]: !prev[room.roomId]
                                  }));
                                }}
                                className="btn-toggle-cabinet"
                              >
                                {isExpanded ? "Hide Chats" : "View Chats"}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="cabinet-content-wrapper animate-slide-down">
                              <div className="cabinet-messages-list">
                                {room.messages.map((m) => (
                                  <div key={m.id} className="cabinet-message-row animate-fade-in">
                                    <div className="message-bubble-header">
                                      <div className="sender-avatar-meta">
                                        {m.sender?.avatar ? (
                                          <img src={m.sender.avatar} alt={m.sender?.username} className="message-sender-avatar" />
                                        ) : (
                                          <div className="message-sender-placeholder">
                                            {(m.sender?.username || "U").substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                        <span className="message-sender-name">{m.sender?.username || "System/Deleted"}</span>
                                      </div>
                                      <span className="message-time">
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div className="message-bubble-body">
                                      <p className="message-text-content">"{m.content}"</p>
                                      <button
                                        onClick={() => handleDeleteMessageClick(m.id, m.sender?.username || "Someone")}
                                        className="btn-message-moderate"
                                        title="Delete and moderate chat message"
                                      >
                                        <Trash2 size={12} />
                                        <span>Moderate</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* PAGINATION */}
                {messagePagination.totalPages > 1 && (
                  <div className="table-pagination-row">
                    <button
                      disabled={messagePage <= 1}
                      onClick={() => setMessagePage((prev) => Math.max(1, prev - 1))}
                      className="btn-page-nav"
                    >
                      <ChevronLeft size={14} />
                      <span>Previous</span>
                    </button>
                    <span className="page-indicator">
                      Page <strong>{messagePage}</strong> of <strong>{messagePagination.totalPages}</strong> ({messagePagination.totalMessages} messages)
                    </span>
                    <button
                      disabled={messagePage >= messagePagination.totalPages}
                      onClick={() => setMessagePage((prev) => Math.min(messagePagination.totalPages, prev + 1))}
                      className="btn-page-nav"
                    >
                      <span>Next</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 5: FEEDBACK REVIEWS */}
          {activeTab === "ratings" && (
            <div className="tab-pane-reviews animate-fade-in">
              {loadingRatings ? (
                <div className="reviews-loader">
                  <Loader className="spinner" size={24} />
                  <span>Loading feedback timeline...</span>
                </div>
              ) : ratings.length === 0 ? (
                <div className="reviews-empty glass-panel">
                  <Star size={30} color="var(--border)" />
                  <p>No user reviews or comments submitted yet.</p>
                </div>
              ) : (
                <div className="reviews-timeline-grid">
                  {ratings.map((r) => (
                    <div key={r.id} className="review-timeline-card glass-panel">
                      <div className="card-top-row">
                        <div className="user-info-box">
                          <div className="user-avatar">
                            {r.user?.avatar ? (
                              <img src={r.user.avatar} alt={r.user.username} className="avatar-img" />
                            ) : (
                              <div className="avatar-placeholder">
                                {(r.user?.username || "U").substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="user-labels">
                            <span className="username">{r.user?.username || "Deleted User"}</span>
                            <span className="email">{r.user?.email || ""}</span>
                          </div>
                        </div>

                        <div className="delete-btn-box">
                          <button
                            onClick={() => handleDeleteRatingClick(r.id, r.user?.username || "Someone")}
                            className="btn-review-delete"
                            title="Delete review feedback"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="rating-metrics-row">
                        {renderStars(r.rating)}
                        <span className="score-num">{r.rating}.0 / 5</span>
                      </div>

                      <div className="review-comment-body">
                        {r.comment ? (
                          <p className="comment-text">"{r.comment}"</p>
                        ) : (
                          <p className="comment-text empty-comment">No written feedback comment provided.</p>
                        )}
                      </div>

                      <div className="review-date-footer">
                        <span>Submitted on {new Date(r.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4.5: NETWORK FEED MODERATION */}
          {activeTab === "feed" && (
            <div className="tab-pane-feed-moderation animate-fade-in">
              {/* FEED TYPE TOGGLE */}
              <div className="feed-type-toggle-row" style={{ display: "flex", gap: "12px", marginBottom: "20px", borderBottom: "1px solid var(--admin-border)", paddingBottom: "12px" }}>
                <button
                  onClick={() => setFeedSubTab("posts")}
                  className={`feed-subtab-btn ${feedSubTab === "posts" ? "active" : ""}`}
                  style={{
                    background: feedSubTab === "posts" ? "var(--admin-btn-active-bg)" : "none",
                    border: `1px solid ${feedSubTab === "posts" ? "var(--admin-btn-active-border)" : "transparent"}`,
                    color: feedSubTab === "posts" ? "var(--accent)" : "var(--admin-text-muted)",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "750",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Zap size={14} />
                  <span>User Feed Posts</span>
                </button>
                <button
                  onClick={() => setFeedSubTab("stories")}
                  className={`feed-subtab-btn ${feedSubTab === "stories" ? "active" : ""}`}
                  style={{
                    background: feedSubTab === "stories" ? "var(--admin-btn-active-bg)" : "none",
                    border: `1px solid ${feedSubTab === "stories" ? "var(--admin-btn-active-border)" : "transparent"}`,
                    color: feedSubTab === "stories" ? "var(--accent)" : "var(--admin-text-muted)",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "750",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Sparkles size={14} />
                  <span>Developer Stories</span>
                </button>
              </div>

              {feedSubTab === "posts" && (
                <>
                  {/* FEED STATS BANNER */}
                  <div className="feed-stats-dashboard-row animate-fade-in">
                <div className="feed-stat-card glass-panel purple">
                  <div className="stat-icon-wrapper"><Megaphone size={18} /></div>
                  <div className="stat-info">
                    <span className="stat-label">Total Posts</span>
                    <span className="stat-value">{feedStats.totalPosts}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel yellow">
                  <div className="stat-icon-wrapper"><AlertTriangle size={18} /></div>
                  <div className="stat-info">
                    <span className="stat-label">Flagged Posts</span>
                    <span className="stat-value">{feedStats.flaggedPosts}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel red">
                  <div className="stat-icon-wrapper"><VolumeX size={18} /></div>
                  <div className="stat-info">
                    <span className="stat-label">Hidden Posts</span>
                    <span className="stat-value">{feedStats.hiddenPosts}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel blue">
                  <div className="stat-icon-wrapper"><MessageSquare size={18} /></div>
                  <div className="stat-info">
                    <span className="stat-label">Total Comments</span>
                    <span className="stat-value">{feedStats.totalComments}</span>
                  </div>
                </div>
              </div>

              {/* SEARCH BAR */}
              <div className="table-search-row glass-panel" style={{ marginBottom: "20px" }}>
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search posts by content, tech stack, or author..."
                    value={postSearch}
                    onChange={(e) => {
                      setPostSearch(e.target.value);
                      setPostPage(1);
                    }}
                    className="table-search-input"
                  />
                </div>
                {loadingPosts && <Loader className="spinner table-inline-loader" size={14} />}
              </div>

              {/* STATUS FILTER CHIPS */}
              <div className="feed-filter-chips-row" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                <button
                  onClick={() => { setPostStatusFilter("all"); setPostPage(1); }}
                  className={`feed-filter-chip ${postStatusFilter === "all" ? "active" : ""}`}
                  style={{
                    background: postStatusFilter === "all" ? "var(--accent)" : "var(--admin-btn-secondary-bg)",
                    border: `1px solid ${postStatusFilter === "all" ? "var(--accent)" : "var(--admin-border)"}`,
                    color: postStatusFilter === "all" ? "#fff" : "var(--admin-text)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "750",
                    transition: "all 0.2s ease"
                  }}
                >
                  All Posts ({feedStats.totalPosts})
                </button>
                <button
                  onClick={() => { setPostStatusFilter("active"); setPostPage(1); }}
                  className={`feed-filter-chip ${postStatusFilter === "active" ? "active" : ""}`}
                  style={{
                    background: postStatusFilter === "active" ? "rgba(16, 185, 129, 0.15)" : "var(--admin-btn-secondary-bg)",
                    border: `1px solid ${postStatusFilter === "active" ? "#10b981" : "var(--admin-border)"}`,
                    color: postStatusFilter === "active" ? "#10b981" : "var(--admin-text)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "750",
                    transition: "all 0.2s ease"
                  }}
                >
                  🟢 Active ({feedStats.totalPosts - feedStats.flaggedPosts - feedStats.hiddenPosts})
                </button>
                <button
                  onClick={() => { setPostStatusFilter("flagged"); setPostPage(1); }}
                  className={`feed-filter-chip ${postStatusFilter === "flagged" ? "active" : ""}`}
                  style={{
                    background: postStatusFilter === "flagged" ? "rgba(245, 158, 11, 0.15)" : "var(--admin-btn-secondary-bg)",
                    border: `1px solid ${postStatusFilter === "flagged" ? "#f59e0b" : "var(--admin-border)"}`,
                    color: postStatusFilter === "flagged" ? "#f59e0b" : "var(--admin-text)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "750",
                    transition: "all 0.2s ease"
                  }}
                >
                  🟡 Flagged ({feedStats.flaggedPosts})
                </button>
                <button
                  onClick={() => { setPostStatusFilter("hidden"); setPostPage(1); }}
                  className={`feed-filter-chip ${postStatusFilter === "hidden" ? "active" : ""}`}
                  style={{
                    background: postStatusFilter === "hidden" ? "rgba(239, 68, 68, 0.15)" : "var(--admin-btn-secondary-bg)",
                    border: `1px solid ${postStatusFilter === "hidden" ? "#ef4444" : "var(--admin-border)"}`,
                    color: postStatusFilter === "hidden" ? "#ef4444" : "var(--admin-text)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: "750",
                    transition: "all 0.2s ease"
                  }}
                >
                  🔴 Hidden ({feedStats.hiddenPosts})
                </button>
              </div>

              {/* POSTS LISTING */}
              <div className="admin-posts-grid">
                {posts.length === 0 ? (
                  <div className="empty-posts-state glass-panel">
                    {loadingPosts ? "Fetching feed posts..." : "No posts found in the network feed."}
                  </div>
                ) : (
                  posts.map((post) => {
                    const isExpanded = !!expandedPosts[post.id];
                    return (
                      <div key={post.id} className={`admin-post-card glass-panel border-${post.status}`}>
                        <div className="post-card-header">
                          <div className="post-author-info">
                            <div className="author-avatar-wrapper" onClick={() => post.author && handleViewUserLogs(post.author)} style={{ cursor: post.author ? "pointer" : "default" }} title={post.author ? "View Developer Profile & Moderation" : ""}>
                              {post.author?.avatar ? (
                                <img src={post.author.avatar} alt={post.author.username} className="avatar-img" />
                              ) : (
                                <div className="avatar-placeholder">
                                  {(post.author?.username || "U").substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="author-meta">
                              <div className="author-username-row" onClick={() => post.author && handleViewUserLogs(post.author)} style={{ cursor: post.author ? "pointer" : "default" }} title={post.author ? "View Developer Profile & Moderation" : ""}>
                                <span className="author-username">{post.author?.username || "Deleted User"}</span>
                                <span className={`post-status-badge status-${post.status}`}>
                                  {post.status.toUpperCase()}
                                </span>
                              </div>
                              <span className="author-email">{post.author?.email || ""}</span>
                              {post.author?.title && <span className="author-title-badge">{post.author.title}</span>}
                            </div>
                          </div>

                          <div className="post-card-actions-wrapper">
                             <div className="post-moderation-controls" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                               <select
                                 value={post.status || "active"}
                                 onChange={(e) => handleStatusChange(post.id, e.target.value)}
                                 className="admin-post-status-select"
                               >
                                 <option value="active">Active (Visible)</option>
                                 <option value="flagged">Flagged (Warning)</option>
                                 <option value="hidden">Hidden (Moderated)</option>
                               </select>
                               
                               <button
                                 onClick={() => {
                                   setExpandedPostLegal(prev => ({
                                     ...prev,
                                     [post.id]: !prev[post.id]
                                   }));
                                 }}
                                 className={`btn-compliance-action ${expandedPostLegal[post.id] ? "active" : ""}`}
                                 title="Manage legal case file & compliance notes"
                                 style={{
                                   display: "inline-flex",
                                   alignItems: "center",
                                   gap: "4px",
                                   background: expandedPostLegal[post.id] ? "var(--admin-btn-active-bg)" : "var(--admin-btn-secondary-bg)",
                                   border: `1px solid ${expandedPostLegal[post.id] ? "var(--admin-btn-active-border)" : "var(--admin-border)"}`,
                                   color: expandedPostLegal[post.id] ? "var(--accent)" : "var(--admin-text-muted)",
                                   padding: "5px 10px",
                                   borderRadius: "6px",
                                   cursor: "pointer",
                                   fontSize: "0.72rem",
                                   fontWeight: "700",
                                   transition: "all 0.15s ease"
                                 }}
                               >
                                 <ShieldAlert size={12} />
                                 <span>Legal File</span>
                               </button>

                               <button
                                 onClick={() => handleDeletePostClick(post.id, post.author?.username || "Someone")}
                                 className="btn-action-delete"
                                 title="Delete post permanently"
                               >
                                 <Trash2 size={13} />
                               </button>
                             </div>
                           </div>
                        </div>

                        <div className="post-card-body">
                          <p className="post-text-content">{post.text}</p>
                          
                          {post.techStack && post.techStack.length > 0 && (
                            <div className="post-tech-tags">
                              {post.techStack.map((tech, idx) => (
                                <span key={idx} className="tech-tag-pill">{tech}</span>
                              ))}
                            </div>
                          )}

                          {post.image && (
                            <div className="post-media-preview">
                              <img src={post.image} alt="Post Attachment" className="post-preview-img" />
                            </div>
                          )}
                        </div>

                        <div className="post-card-footer">
                          <div className="post-stats-row">
                            <span className="stat-pill">👍 {post.likesCount} Likes</span>
                            <span className="stat-pill">💬 {post.comments ? post.comments.length : 0} Comments</span>
                          </div>
                          <button
                            onClick={() => {
                              setExpandedPosts(prev => ({
                                ...prev,
                                [post.id]: !prev[post.id]
                              }));
                            }}
                            className="btn-toggle-comments"
                          >
                            {isExpanded ? "Hide Comments" : `Manage Comments (${post.comments ? post.comments.length : 0})`}
                          </button>
                        </div>

                        {expandedPostLegal[post.id] && (
                          <div className="post-legal-compliance-section animate-slide-down" style={{
                            background: "rgba(170, 59, 255, 0.03)",
                            border: "1px solid rgba(170, 59, 255, 0.15)",
                            borderRadius: "8px",
                            padding: "16px",
                            margin: "0 20px 20px 20px"
                          }}>
                            <h5 style={{ margin: "0 0 12px 0", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent)" }}>
                              Compliance File & Legal Claims
                            </h5>
                            
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.target;
                              const infringementType = form.infringementType.value;
                              const caseStatus = form.caseStatus.value;
                              const notes = form.notes.value;
                              const caseId = form.caseId.value;
                              
                              handleSaveCompliance(post.id, post.status, {
                                caseId,
                                infringementType,
                                caseStatus,
                                notes
                              });
                            }} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--admin-text-muted)", marginBottom: "4px", fontWeight: "700" }}>Legal Case ID</label>
                                  <input
                                    type="text"
                                    name="caseId"
                                    defaultValue={post.legalCase?.caseId || `CE-LEGAL-${Math.floor(1000 + Math.random() * 9000)}`}
                                    className="table-search-input"
                                    placeholder="Case ID (e.g. CE-DMCA-2026)"
                                    style={{ width: "100%", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8rem", color: "var(--admin-text-h)" }}
                                  />
                                </div>
                                
                                <div>
                                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--admin-text-muted)", marginBottom: "4px", fontWeight: "700" }}>Infringement Classification</label>
                                  <select
                                    name="infringementType"
                                    defaultValue={post.legalCase?.infringementType || "None"}
                                    style={{ width: "100%", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8rem", color: "var(--admin-text-h)" }}
                                  >
                                    <option value="None">None (General Clean)</option>
                                    <option value="DMCA Takedown Request">DMCA Takedown Request</option>
                                    <option value="Copyright Infringement">Copyright Infringement</option>
                                    <option value="TOS Violation">TOS Violation</option>
                                    <option value="Hate Speech / Harassment">Hate Speech / Harassment</option>
                                    <option value="Other Legal Claim">Other Legal Claim</option>
                                  </select>
                                </div>
                              </div>
                              
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--admin-text-muted)", marginBottom: "4px", fontWeight: "700" }}>Case Moderation Status</label>
                                  <select
                                    name="caseStatus"
                                    defaultValue={post.legalCase?.caseStatus || "Resolved"}
                                    style={{ width: "100%", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", padding: "6px 10px", borderRadius: "6px", fontSize: "0.8rem", color: "var(--admin-text-h)" }}
                                  >
                                    <option value="Open">Open Case</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Compliance Action Taken">Compliance Action Taken</option>
                                    <option value="Dismissed">Dismissed Case</option>
                                    <option value="Resolved">Resolved (No Claim)</option>
                                  </select>
                                </div>
                                
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                  {post.legalCase?.actionTakenBy && (
                                    <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--accent)", paddingLeft: "6px" }}>
                                      Last audited by <strong>{post.legalCase.actionTakenBy}</strong>
                                      {post.legalCase.actionDate && ` on ${new Date(post.legalCase.actionDate).toLocaleDateString()}`}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--admin-text-muted)", marginBottom: "4px", fontWeight: "700" }}>Audit compliance notes / log</label>
                                <textarea
                                  name="notes"
                                  defaultValue={post.legalCase?.notes || ""}
                                  placeholder="Write notes about legal notices received, DMCA takedown correspondence or reason for flagging..."
                                  style={{ width: "100%", height: "80px", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.8rem", color: "var(--admin-text-h)", resize: "none", outline: "none", boxSizing: "border-box" }}
                                />
                              </div>
                              
                              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                <button
                                  type="submit"
                                  className="btn-action"
                                  disabled={savingCompliance[post.id]}
                                  style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                >
                                  {savingCompliance[post.id] && <Loader className="spinner" size={10} />}
                                  <span>{savingCompliance[post.id] ? "Saving..." : "Save Case Details"}</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {isExpanded && (
                          <div className="post-comments-section animate-slide-down">
                            <h5>Comments Moderation</h5>
                            {(!post.comments || post.comments.length === 0) ? (
                              <p className="no-comments-text">No comments on this post.</p>
                            ) : (
                              <div className="admin-comments-list">
                                {post.comments.map((comment) => (
                                  <div key={comment._id} className="admin-comment-row">
                                    <div className="comment-left-col">
                                      <div className="commenter-avatar">
                                        {comment.avatar ? (
                                          <img src={comment.avatar} alt={comment.username} className="avatar-img" />
                                        ) : (
                                          <div className="avatar-placeholder">
                                            {(comment.username || "U").substring(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div className="comment-text-details">
                                        <div className="commenter-meta">
                                          <span className="commenter-name">{comment.username}</span>
                                          <span className="comment-time">
                                            {new Date(comment.createdAt).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="comment-content-text">"{comment.text}"</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDeleteCommentClick(post.id, comment._id, comment.username)}
                                      className="btn-comment-delete"
                                      title="Delete and moderate comment"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* PAGINATION */}
              {postPagination.totalPages > 1 && (
                <div className="table-pagination-row" style={{ marginTop: "24px" }}>
                  <button
                    disabled={postPage <= 1}
                    onClick={() => setPostPage((prev) => Math.max(1, prev - 1))}
                    className="btn-page-nav"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span className="page-indicator">
                    Page <strong>{postPage}</strong> of <strong>{postPagination.totalPages}</strong> ({postPagination.totalPosts} posts)
                  </span>
                  <button
                    disabled={postPage >= postPagination.totalPages}
                    onClick={() => setPostPage((prev) => Math.min(postPagination.totalPages, prev + 1))}
                    className="btn-page-nav"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
              </>)}

              {feedSubTab === "stories" && (
                <div className="admin-stories-moderation-pane animate-fade-in">
                  <div className="table-search-row glass-panel" style={{ marginBottom: "20px" }}>
                    <h4 style={{ margin: "0", fontSize: "0.95rem", fontWeight: "750", color: "var(--admin-text-h)" }}>Developer Stories Moderation</h4>
                    {loadingStories && <Loader className="spinner table-inline-loader" size={14} />}
                  </div>

                  <div className="admin-stories-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                    {stories.length === 0 ? (
                      <div className="empty-posts-state glass-panel" style={{ gridColumn: "1 / -1" }}>
                        {loadingStories ? "Fetching developer stories..." : "No active developer stories found."}
                      </div>
                    ) : (
                      stories.map((story) => (
                        <div key={story.id} className="admin-post-card glass-panel" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                          <div>
                            <div className="post-card-header" style={{ paddingBottom: "10px", borderBottom: "1px solid var(--admin-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div className="post-author-info">
                                <div className="author-avatar-wrapper" onClick={() => story.user && handleViewUserLogs(story.user)} style={{ cursor: story.user ? "pointer" : "default" }} title={story.user ? "View Developer Profile & Moderation" : ""}>
                                  {story.user?.avatar ? (
                                    <img src={story.user.avatar} alt={story.user.username} className="avatar-img" />
                                  ) : (
                                    <div className="avatar-placeholder">
                                      {(story.user?.username || story.username || "U").substring(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="author-meta">
                                  <span className="author-username" onClick={() => story.user && handleViewUserLogs(story.user)} style={{ color: "var(--admin-text-h)", fontWeight: "600", cursor: story.user ? "pointer" : "default" }} title={story.user ? "View Developer Profile & Moderation" : ""}>{story.user?.username || story.username}</span>
                                  {story.user?.email && <span className="author-email" style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>{story.user.email}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteStoryClick(story.id, story.user?.username || story.username)}
                                className="btn-action-delete"
                                title="Delete story permanently"
                                style={{ padding: "6px", background: "none", border: "none", color: "var(--admin-text-muted)", cursor: "pointer" }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div className="post-card-body" style={{ padding: "12px 0" }}>
                              {story.text && <p className="post-text-content" style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--admin-text-h)" }}>{story.text}</p>}
                              
                              {story.mediaUrl && (
                                <div className="story-media-preview-frame" style={{ borderRadius: "6px", overflow: "hidden", maxHeight: "200px", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "center" }}>
                                  {story.mediaUrl.match(/\.(mp4|mov|avi|webm)/i) || story.mediaUrl.includes("video") ? (
                                    <video src={story.mediaUrl} controls style={{ width: "100%", maxHeight: "200px", objectFit: "contain" }} />
                                  ) : (
                                    <img src={story.mediaUrl} alt="Story Media" style={{ width: "100%", maxHeight: "200px", objectFit: "contain" }} />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="post-card-footer" style={{ borderTop: "1px solid var(--admin-border-subtle)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                            <span>❤️ {story.likesCount} Likes | 💬 {story.commentsCount} Comments</span>
                            <span>{new Date(story.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* STORIES PAGINATION */}
                  {storyPagination.totalPages > 1 && (
                    <div className="table-pagination-row" style={{ marginTop: "24px" }}>
                      <button
                        disabled={storyPage <= 1}
                        onClick={() => setStoryPage((prev) => Math.max(1, prev - 1))}
                        className="btn-page-nav"
                      >
                        <ChevronLeft size={14} />
                        <span>Previous</span>
                      </button>
                      <span className="page-indicator">
                        Page <strong>{storyPage}</strong> of <strong>{storyPagination.totalPages}</strong> ({storyPagination.totalStories} stories)
                      </span>
                      <button
                        disabled={storyPage >= storyPagination.totalPages}
                        onClick={() => setStoryPage((prev) => Math.min(storyPagination.totalPages, prev + 1))}
                        className="btn-page-nav"
                      >
                        <span>Next</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SYSTEM LOCKS & RESOURCE CONFIGS */}
          {activeTab === "maintenance" && (
            <div className="tab-pane-maintenance animate-fade-in">
              <div className="maintenance-header-row">
                <div className="header-title-area">
                  <Sliders size={26} className="panel-accent-icon glow-accent-icon" />
                  <div>
                    <h4>System Lockout Configurations</h4>
                    <p>Configure platform maintenance status gates and resource thresholds.</p>
                  </div>
                </div>
                {/* Active user diagnostic indicator */}
                <div className="active-dev-indicator glass-pill">
                  <ShieldAlert size={14} className="shield-pulse-icon" />
                  <span>Session: <strong>{user?.username}</strong></span>
                  <span className="role-tag-sub">ADMIN</span>
                </div>
              </div>

              <div className="maintenance-grid-container">
                {/* Left Card: Lockout Control */}
                <div className={`maintenance-control-card glass-panel ${maintenanceMode ? "system-locked" : "system-open"}`}>
                  <div className="card-badge">GATE CONTROLLER</div>
                  
                  <div className="pulse-indicator-wrapper">
                    <div className="pulse-ring"></div>
                    <div className="pulse-core"></div>
                  </div>

                  <div className="status-title-group">
                    <span className="status-label-text">Lockout Gate Status</span>
                    <h3 className="status-value-text">
                      {maintenanceMode ? "ACTIVE (LOCKED)" : "INACTIVE (OPEN)"}
                    </h3>
                  </div>

                  <p className="status-description-paragraph">
                    {maintenanceMode
                      ? "The system is currently locked. Standard developer accounts will see a maintenance lockout splash page upon loading the dashboard. Only administrator roles bypass this gate."
                      : "The system is open. All developer accounts can connect to active workspaces, compile code snippet files, and chat in real-time."}
                  </p>

                  <button
                    onClick={handleMaintenanceToggleClick}
                    className="btn-maintenance-glow-toggle"
                  >
                    {maintenanceMode ? <Unlock size={16} /> : <Lock size={16} />}
                    <span>{maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}</span>
                  </button>
                </div>

                {/* Right Card: Resource Limits */}
                <div className="resource-threshold-card glass-panel">
                  <div className="card-badge">RESOURCE LIMITS</div>

                  <div className="threshold-card-header">
                    <Server size={18} className="threshold-icon" />
                    <h4>Platform Constraints</h4>
                  </div>

                  <div className="sliders-container">
                    <div className="modern-slider-group">
                      <div className="slider-header-row">
                        <span className="slider-label">Max Collaboration Rooms / User</span>
                        <span className="slider-value-badge">{configMaxRooms} Rooms</span>
                      </div>
                      <div className="slider-track-wrapper">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={configMaxRooms}
                          onChange={(e) => {
                            setConfigMaxRooms(e.target.value);
                            addToast(`Max collaboration rooms set to ${e.target.value}`, "success");
                          }}
                          className="modern-range-slider"
                        />
                      </div>
                    </div>

                    <div className="modern-slider-group">
                      <div className="slider-header-row">
                        <span className="slider-label">Max Compiler Execution Timeout</span>
                        <span className="slider-value-badge">{configTimeout}s</span>
                      </div>
                      <div className="slider-track-wrapper">
                        <input
                          type="range"
                          min="2"
                          max="30"
                          value={configTimeout}
                          onChange={(e) => {
                            setConfigTimeout(e.target.value);
                            addToast(`Code execution timeout limit set to ${e.target.value}s`, "success");
                          }}
                          className="modern-range-slider"
                        />
                      </div>
                    </div>

                    <div className="modern-slider-group">
                      <div className="slider-header-row">
                        <span className="slider-label">Websocket Pool Connection Limit</span>
                        <span className="slider-value-badge">{configPoolLimit} Connections</span>
                      </div>
                      <div className="slider-track-wrapper">
                        <input
                          type="range"
                          min="50"
                          max="500"
                          step="10"
                          value={configPoolLimit}
                          onChange={(e) => {
                            setConfigPoolLimit(e.target.value);
                            addToast(`Websocket capacity pool adjusted to ${e.target.value}`, "success");
                          }}
                          className="modern-range-slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SYSTEM BROADCASTS & NEWS ALERTS */}
          {activeTab === "broadcasts" && (
            <div className="tab-pane-broadcasts animate-fade-in">
              <div className="broadcast-grid-layout">
                {/* Composing Center Form */}
                <div className="broadcast-composer-card glass-panel">
                  <div className="composer-header">
                    <Megaphone className="composer-icon" size={20} />
                    <h4>System Announcement Composer</h4>
                  </div>
                  <p className="composer-desc">
                    Publish platform-wide alert messages, updates, or maintenance notices visible to all developer dashboards.
                  </p>

                  <form onSubmit={handleCreateAnnouncement} className="composer-form">
                    <div className="form-group">
                      <label className="composer-label">Announcement Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Planned Database Migration"
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        className="composer-input"
                        required
                      />
                    </div>

                    <div className="form-group-row">
                      <div className="form-group half-width">
                        <label className="composer-label">Category Type</label>
                        <select
                          value={annType}
                          onChange={(e) => setAnnType(e.target.value)}
                          className="composer-select"
                        >
                          <option value="ANNOUNCEMENT">Announcement</option>
                          <option value="UPDATE">Update / News</option>
                          <option value="FEATURE">New Feature</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </div>

                      <div className="form-group half-width">
                        <label className="composer-label">Alert Severity / Color</label>
                        <select
                          value={annSeverity}
                          onChange={(e) => setAnnSeverity(e.target.value)}
                          className="composer-select"
                        >
                          <option value="INFO">Info (Blue Theme)</option>
                          <option value="SUCCESS">Success (Green Theme)</option>
                          <option value="WARNING">Warning (Yellow Theme)</option>
                          <option value="CRITICAL">Critical (Red Theme)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="composer-label">Broadcast Message Body</label>
                      <textarea
                        placeholder="Write message content detail here..."
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        className="composer-textarea"
                        rows="4"
                        required
                      />
                    </div>

                    <button type="submit" className="btn-broadcast-submit" disabled={submittingAnnouncement}>
                      {submittingAnnouncement && <Loader className="spinner" size={14} style={{ marginRight: "8px" }} />}
                      <span>{submittingAnnouncement ? "Launching Broadcast..." : "Launch Broadcast Alert"}</span>
                    </button>
                  </form>
                </div>

                {/* Listing of Broadcasts Feed */}
                <div className="broadcasts-feed-card glass-panel">
                  <h4 className="feed-header-title">Active System Broadcasts</h4>
                  {loadingAnnouncements ? (
                    <div className="broadcasts-loader">
                      <Loader className="spinner" size={20} />
                      <span>Loading broadcasts...</span>
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="broadcasts-empty">
                      <Megaphone size={24} className="muted-icon" style={{ marginBottom: "10px" }} />
                      <p>No active announcements broadcasted yet.</p>
                    </div>
                  ) : (
                    <div className="broadcasts-timeline-list">
                      {announcements.map((ann) => (
                        <div key={ann._id} className={`broadcast-timeline-item border-${ann.severity.toLowerCase()}`}>
                          <div className="item-top-row">
                            <div className="item-badge-group">
                              <span className={`badge-type ${ann.type.toLowerCase()}`}>{ann.type}</span>
                              <span className={`badge-severity severity-${ann.severity.toLowerCase()}`}>
                                {ann.severity}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncementClick(ann._id, ann.title)}
                              className="btn-broadcast-delete"
                              title="Delete Announcement"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <h5 className="item-title">{ann.title}</h5>
                          <p className="item-content">{ann.content}</p>

                          <div className="item-footer">
                            <span>By: {ann.createdBy?.username || "Admin"}</span>
                            <span>{new Date(ann.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: AD MANAGER */}
          {activeTab === "ads" && (
            <div className="tab-pane-ads animate-fade-in">
              <div className="broadcast-grid-layout">
                {/* Ad Composer Form */}
                <div className="broadcast-composer-card glass-panel">
                  <div className="composer-header">
                    <AppWindow className="composer-icon" size={20} />
                    <h4>Ad Center Campaign Composer</h4>
                  </div>
                  <p className="composer-desc">
                    Deploy platform-wide advertisements and promotional banner campaigns. Upload high-res images and associate target links.
                  </p>

                  <form onSubmit={handleCreateAdSubmit} className="composer-form">
                    <div className="form-group">
                      <label className="composer-label">Ad Title / Headline</label>
                      <input
                        type="text"
                        placeholder="e.g. Join the Elite Python Bootcamp Today!"
                        value={adTitle}
                        onChange={(e) => setAdTitle(e.target.value)}
                        className="composer-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="composer-label">Destination Redirect URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/bootcamp"
                        value={adUrl}
                        onChange={(e) => setAdUrl(e.target.value)}
                        className="composer-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="composer-label">Ad Format / Display Location</label>
                      <select
                        value={adFormat}
                        onChange={(e) => setAdFormat(e.target.value)}
                        className="composer-select"
                      >
                        <option value="SIDEBAR">Sidebar (Sponsored Widget)</option>
                        <option value="POPUP">Pop-up (Dashboard Entry Modal)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="composer-label">Banner Image Upload</label>
                      <div className="ad-upload-dropzone" style={{ border: "2px dashed var(--admin-border)", padding: "20px", borderRadius: "8px", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.1)", position: "relative" }}>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setAdImageFile(file);
                              setAdImagePreview(URL.createObjectURL(file));
                            }
                          }}
                          className="ad-file-input"
                          id="ad-file-input"
                          required
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                        />
                        <label htmlFor="ad-file-input" className="ad-file-label" style={{ cursor: "pointer" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--admin-text)" }}>
                            {adImageFile ? `Selected: ${adImageFile.name}` : "Click to select banner image (PNG/JPG)"}
                          </span>
                        </label>
                      </div>
                    </div>

                    {adImagePreview && (
                      <div className="form-group">
                        <label className="composer-label">Live Image Preview</label>
                        <div className="ad-preview-container-box" style={{ position: "relative", width: "100%", height: "140px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--admin-border)" }}>
                          <img src={adImagePreview} alt="Live Ad Preview" className="ad-composer-live-img" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <span className="sponsored-tag-preview" style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "rgba(0, 0, 0, 0.75)",
                            color: "#f59e0b",
                            fontSize: "0.58rem",
                            fontWeight: "800",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            letterSpacing: "1px"
                          }}>
                            SPONSORED
                          </span>
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn-broadcast-submit ad-btn" disabled={submittingAd}>
                      {submittingAd && <Loader className="spinner" size={14} style={{ marginRight: "8px" }} />}
                      <span>{submittingAd ? "Deploying & Broadcasting..." : "Deploy & Broadcast Ad Campaign"}</span>
                    </button>
                  </form>
                </div>

                {/* Ads Inventory / Listing */}
                <div className="broadcasts-feed-card glass-panel">
                  <h4 className="feed-header-title">Ad Inventory & Campaigns</h4>
                  {loadingAds ? (
                    <div className="broadcasts-loader">
                      <Loader className="spinner" size={20} />
                      <span>Loading active campaigns...</span>
                    </div>
                  ) : ads.length === 0 ? (
                    <div className="broadcasts-empty">
                      <AppWindow size={24} className="muted-icon" style={{ marginBottom: "10px" }} />
                      <p>No active ad campaigns initialized.</p>
                    </div>
                  ) : (
                    <div className="broadcasts-timeline-list">
                      {ads.map((ad) => (
                        <div key={ad._id} className={`broadcast-timeline-item border-${ad.isActive ? "success" : "warning"}`}>
                          <div className="item-top-row">
                            <div className="item-badge-group">
                              <span className={`badge-type ${ad.isActive ? "update" : "maintenance"}`}>
                                {ad.isActive ? "ACTIVE" : "PAUSED"}
                              </span>
                              <span className={`badge-severity severity-${ad.format === "POPUP" ? "warning" : "info"}`} style={{ textTransform: "uppercase" }}>
                                {ad.format === "POPUP" ? "POP-UP" : "SIDEBAR"}
                              </span>
                            </div>
                            <div className="ad-actions-top" style={{ display: "flex", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleAdStatus(ad._id)}
                                className={`btn-ad-toggle ${ad.isActive ? "active" : "paused"}`}
                                title={ad.isActive ? "Pause Ad Campaign" : "Activate Ad Campaign"}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: ad.isActive ? "#ef4444" : "#10b981",
                                  cursor: "pointer",
                                  marginRight: "10px",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center"
                                }}
                              >
                                {ad.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAdClick(ad._id, ad.title)}
                                className="btn-broadcast-delete"
                                title="Delete Ad Campaign"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <h5 className="item-title">{ad.title}</h5>
                          {ad.redirectUrl && (
                            <div className="item-ad-link" style={{ fontSize: "0.74rem", color: "var(--admin-accent)", wordBreak: "break-all", margin: "4px 0" }}>
                              🔗 <a href={ad.redirectUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--admin-accent)", textDecoration: "underline" }}>{ad.redirectUrl}</a>
                            </div>
                          )}

                          <div className="ad-banner-preview-frame" style={{ margin: "10px 0", borderRadius: "8px", overflow: "hidden", height: "100px", background: "rgba(0,0,0,0.3)" }}>
                            <img src={ad.imageUrl} alt={ad.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>

                          <div className="item-footer">
                            <span>By: {ad.createdBy?.username || "Admin"}</span>
                            <span>{new Date(ad.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: HELP DESK */}
          {activeTab === "tickets" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
              {selectedAdminTicket ? (
                <div className="admin-ticket-detail-view" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div className="ticket-detail-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border)", paddingBottom: "16px", marginBottom: "16px" }}>
                    <button onClick={() => setSelectedAdminTicket(null)} className="btn-page-nav" style={{ padding: "6px 12px" }}>
                      <ChevronLeft size={14} /> <span>Back to Tickets</span>
                    </button>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span className="ticket-id-label" style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", fontFamily: "monospace" }}>ID: {selectedAdminTicket._id}</span>
                      <select
                        value={selectedAdminTicket.status}
                        onChange={(e) => handleUpdateTicketStatus(selectedAdminTicket._id, e.target.value)}
                        className="admin-title-select"
                        style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  {loadingAdminTicketDetails ? (
                    <div className="helpdesk-details-loader" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "40px" }}>
                      <Loader className="spinner" size={24} />
                      <span>Loading ticket details...</span>
                    </div>
                  ) : (
                    <>
                      <div className="ticket-origin-info-box" style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--admin-border)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                          <div className="user-avatar-wrapper" style={{ width: "32px", height: "32px" }}>
                            {selectedAdminTicket.user?.avatar ? (
                              <img src={selectedAdminTicket.user.avatar} alt={selectedAdminTicket.user.username} className="avatar-img" />
                            ) : (
                              <div className="avatar-placeholder">{(selectedAdminTicket.user?.username || "U").substring(0, 2).toUpperCase()}</div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: "1.3" }}>
                            <strong style={{ color: "var(--admin-text-h)", fontSize: "0.86rem" }}>{selectedAdminTicket.user?.username}</strong>
                            <span style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)" }}>{selectedAdminTicket.user?.email}</span>
                          </div>
                        </div>
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "1.05rem", color: "var(--admin-text-h)", textAlign: "left" }}>{selectedAdminTicket.subject}</h3>
                        <p style={{ margin: "0", fontSize: "0.82rem", color: "var(--admin-text)", whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left" }}>{selectedAdminTicket.description}</p>
                      </div>

                      <div className="admin-chat-messages-log" style={{ height: "300px", overflowY: "auto", padding: "16px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--admin-border)", borderRadius: "8px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        {selectedAdminTicket.messages.length === 0 ? (
                          <div style={{ margin: "auto", fontSize: "0.78rem", color: "var(--admin-text-muted)", fontStyle: "italic" }}>No message logs yet. Send a response below to start conversation.</div>
                        ) : (
                          selectedAdminTicket.messages.map((m, idx) => {
                            const isUser = String(m.sender?._id || m.sender) === String(selectedAdminTicket.user?._id || selectedAdminTicket.user);
                            const isAdmin = m.sender?.role === "admin";
                            const senderName = m.sender?.username || (isUser ? "User" : "Admin");
                            const avatar = m.sender?.avatar;

                            return (
                              <div
                                key={m._id || idx}
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  maxWidth: "80%",
                                  alignSelf: isAdmin ? "flex-end" : "flex-start",
                                  flexDirection: isAdmin ? "row-reverse" : "row"
                                }}
                              >
                                <div className="user-avatar-wrapper" style={{ width: "24px", height: "24px", flexShrink: 0 }}>
                                  {avatar ? (
                                    <img src={avatar} alt={senderName} className="avatar-img" />
                                  ) : (
                                    <div className="avatar-placeholder" style={{ fontSize: "0.55rem" }}>{senderName.substring(0, 2).toUpperCase()}</div>
                                  )}
                                </div>
                                <div
                                  style={{
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    background: isAdmin ? "var(--accent)" : "rgba(255,255,255,0.03)",
                                    border: isAdmin ? "none" : "1px solid var(--admin-border)",
                                    color: isAdmin ? "#fff" : "var(--admin-text)"
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.64rem", opacity: "0.8", marginBottom: "4px" }}>
                                    <strong>{senderName}</strong>
                                    {isAdmin && <span style={{ background: "rgba(255,255,255,0.2)", padding: "1px 4px", borderRadius: "3px", fontSize: "0.55rem" }}>SUPPORT</span>}
                                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p style={{ margin: "0", fontSize: "0.78rem", whiteSpace: "pre-wrap", wordBreak: "break-all", textAlign: "left" }}>{m.message}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <form onSubmit={handleAdminReplySubmit} style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
                        <textarea
                          placeholder="Type reply to user..."
                          value={adminReplyMessage}
                          onChange={(e) => setAdminReplyMessage(e.target.value)}
                          required
                          className="composer-textarea"
                          style={{ flex: 1, minHeight: "45px", height: "45px", resize: "none", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", color: "var(--admin-text-h)", padding: "10px 12px", borderRadius: "8px", fontSize: "0.8rem", outline: "none" }}
                        />
                        <button
                          type="submit"
                          disabled={sendingAdminReply || !adminReplyMessage.trim()}
                          className="btn-broadcast-submit"
                          style={{ padding: "0 20px", height: "45px" }}
                        >
                          {sendingAdminReply ? <Loader className="spinner" size={14} /> : "Send Reply"}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="table-search-row">
                    <h4 style={{ margin: "0", fontSize: "0.95rem", fontWeight: "750", color: "var(--admin-text-h)" }}>Support Tickets</h4>
                    {loadingAdminTickets && <Loader className="spinner table-inline-loader" size={14} />}
                  </div>

                  <div className="table-wrapper-responsive">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Subject</th>
                          <th>Status</th>
                          <th>Last Updated</th>
                          <th className="actions-header">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTickets.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="empty-table-row">
                              {loadingAdminTickets ? "Loading system tickets..." : "No support tickets found."}
                            </td>
                          </tr>
                        ) : (
                          adminTickets.map((t) => (
                            <tr key={t._id}>
                              <td className="user-details-cell">
                                <div className="user-avatar-wrapper">
                                  {t.user?.avatar ? (
                                    <img src={t.user.avatar} alt={t.user.username} className="avatar-img" />
                                  ) : (
                                    <div className="avatar-placeholder">{(t.user?.username || "U").substring(0, 2).toUpperCase()}</div>
                                  )}
                                </div>
                                <span className="username-text">
                                  {t.user?.username || "Deleted User"}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: "600", color: "var(--admin-text-h)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{t.subject}</div>
                                <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{t.description}</div>
                              </td>
                              <td>
                                <span className={`role-badge ${t.status === "resolved" ? "user" : t.status === "in-progress" ? "demote" : "suspended"}`} style={{
                                  background: t.status === "resolved" ? "rgba(16, 185, 129, 0.1)" : t.status === "in-progress" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                  color: t.status === "resolved" ? "#10b981" : t.status === "in-progress" ? "#f59e0b" : "#ef4444",
                                  border: t.status === "resolved" ? "1px solid rgba(16, 185, 129, 0.2)" : t.status === "in-progress" ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
                                }}>
                                  {t.status.toUpperCase()}
                                </span>
                              </td>
                              <td>{new Date(t.updatedAt).toLocaleString()}</td>
                              <td className="actions-cell">
                                <button
                                  onClick={() => handleSelectAdminTicket(t._id)}
                                  className="btn-action promote"
                                >
                                  Open Ticket
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
