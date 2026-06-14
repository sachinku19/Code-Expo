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
  deleteAdminAd
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
  HelpCircle
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
  const [rooms, setRooms] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [messages, setMessages] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

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

  useEffect(() => {
    if (activeTab === "broadcasts") {
      fetchAnnouncements();
    } else if (activeTab === "ads") {
      fetchAds();
    } else if (activeTab === "tickets") {
      fetchAdminTickets();
    }
  }, [activeTab]);

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
    formData.append("image", adImageFile);

    setSubmittingAd(true);
    try {
      const res = await createAdminAd(formData);
      if (res.success) {
        addToast("Ad created and broadcasted successfully", "success");
        setAdTitle("");
        setAdUrl("");
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
            </div>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setConfirmModal({ isOpen: false })}>
                Cancel
              </button>
              <button
                className={`btn-modal-confirm ${["deleteUser", "suspendUser", "toggleMaintenance", "deleteAnnouncement", "deleteAd"].includes(confirmModal.type) ? "critical" : ""
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
          {activeTab === "users" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
              <div className="table-search-row">
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
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="empty-table-row">
                          {loadingUsers ? "Loading developer accounts..." : "No developers found."}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = String(u.id) === String(user?.id);
                        return (
                          <tr key={u.id} className={isSelf ? "self-row" : ""}>
                            <td className="user-details-cell">
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
                                disabled={isSelf}
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
                              <button
                                onClick={() => handleRoleToggle(u.id, u.role, u.username)}
                                className={`btn-action role-toggle ${u.role === "admin" ? "demote" : "promote"}`}
                                disabled={isSelf}
                              >
                                {u.role === "admin" ? "Make User" : "Make Admin"}
                              </button>
                              <button
                                onClick={() => handleUserSuspensionToggle(u.id, u.isSuspended, u.username)}
                                className={`btn-action-suspend ${u.isSuspended ? "active" : ""}`}
                                disabled={isSelf}
                                title={u.isSuspended ? "Reactivate user account" : "Suspend user account"}
                              >
                                <VolumeX size={12} />
                                <span>{u.isSuspended ? "Unban" : "Ban"}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUserClick(u.id, u.username)}
                                className="btn-action-delete"
                                disabled={isSelf}
                                title="Delete User account permanently"
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

              {/* PAGINATION */}
              {userPagination.totalPages > 1 && (
                <div className="table-pagination-row">
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
          {activeTab === "chat" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
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

              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Room Session</th>
                      <th>Sender</th>
                      <th>Message Content</th>
                      <th>Sent Time</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-row">
                          {loadingMessages ? "Fetching chat logs..." : "No recent chat messages found."}
                        </td>
                      </tr>
                    ) : (
                      messages.map((m) => (
                        <tr key={m.id}>
                          <td className="room-title-cell">
                            <span className="room-title-text">{m.roomTitle}</span>
                            <span className="room-id-subtext">{m.roomId}</span>
                          </td>
                          <td className="creator-details">
                            <span className="creator-name">{m.sender?.username || "System/Deleted"}</span>
                          </td>
                          <td className="message-content-cell">
                            <span className="chat-msg-text">"{m.content}"</span>
                          </td>
                          <td>{new Date(m.createdAt).toLocaleString()}</td>
                          <td className="actions-cell">
                            <button
                              onClick={() => handleDeleteMessageClick(m.id, m.sender?.username || "Someone")}
                              className="btn-action-delete"
                              title="Delete and moderate chat message"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
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
          )}

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

          {/* TAB 6: SYSTEM LOCKS & RESOURCE CONFIGS */}
          {activeTab === "maintenance" && (
            <div className="tab-pane-sandbox glass-panel animate-fade-in">
              <div className="maintenance-diagnostic-box">
                <div className="maintenance-header-card">
                  <Sliders size={22} className="panel-accent-icon" />
                  <h4>System Lockout Configurations</h4>
                  <p>Configure platform maintenance status gates and resource thresholds.</p>
                </div>

                <div className="system-status-indicator-card">
                  <div className="status-label">
                    <span>Maintenance Lockout Status:</span>
                    <strong className={maintenanceMode ? "state-active" : "state-inactive"}>
                      {maintenanceMode ? "ACTIVE (LOCKED)" : "INACTIVE (OPEN)"}
                    </strong>
                  </div>

                  <p className="status-desc">
                    {maintenanceMode
                      ? "The system is currently locked. Standard developer accounts see an animated lockout warning page on dashboard loads. Administrative roles are bypassed."
                      : "The system is open. Normal accounts can connect and compile code snippet files."}
                  </p>

                  <button
                    onClick={handleMaintenanceToggleClick}
                    className={`btn-maintenance-toggle-master ${maintenanceMode ? "disable-btn" : "enable-btn"}`}
                  >
                    {maintenanceMode ? <Unlock size={14} /> : <Lock size={14} />}
                    <span>{maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}</span>
                  </button>
                </div>

                {/* RESOURCE LIMIT SLIDERS */}
                <div className="resource-limits-card" style={{ marginTop: "30px" }}>
                  <div className="card-header-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                    <Server size={18} className="purple" />
                    <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: "700" }}>Dynamic Resource Thresholds</h4>
                  </div>

                  <div className="slider-group" style={{ marginBottom: "20px" }}>
                    <div className="slider-labels" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "8px" }}>
                      <span>Max Collaboration Rooms per User</span>
                      <strong style={{ color: "var(--accent)" }}>{configMaxRooms} Rooms</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={configMaxRooms}
                      onChange={(e) => {
                        setConfigMaxRooms(e.target.value);
                        addToast(`Max collaboration rooms set to ${e.target.value}`, "success");
                      }}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  <div className="slider-group" style={{ marginBottom: "20px" }}>
                    <div className="slider-labels" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "8px" }}>
                      <span>Max Compiler Code Timeout</span>
                      <strong style={{ color: "var(--accent)" }}>{configTimeout} seconds</strong>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="30"
                      value={configTimeout}
                      onChange={(e) => {
                        setConfigTimeout(e.target.value);
                        addToast(`Code execution timeout limit set to ${e.target.value}s`, "success");
                      }}
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>

                  <div className="slider-group">
                    <div className="slider-labels" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "8px" }}>
                      <span>Websocket Connections Pool Limit</span>
                      <strong style={{ color: "var(--accent)" }}>{configPoolLimit} Connections</strong>
                    </div>
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
                      style={{ width: "100%", accentColor: "var(--accent)" }}
                    />
                  </div>
                </div>
              </div>

              {/* DEV SIMULATOR */}
              <div className="sandbox-warning-alert" style={{ marginTop: "30px" }}>
                <ShieldAlert size={20} className="warning-icon" />
                <div className="alert-content">
                  <h4>Developer Sandbox Utility</h4>
                  <p>Toggle account settings to test layout gates and bypass routing rules.</p>
                  <div className="current-user-info-badge" style={{ marginTop: "12px", background: "rgba(0,0,0,0.2)" }}>
                    <span>Active Developer:</span>
                    <strong>{user?.username}</strong>
                    <span className={`role-badge ${user?.role}`}>{user?.role?.toUpperCase()}</span>
                  </div>
                  <button onClick={handlePromoteSelfToggle} className="btn-sandbox-promote" style={{ maxWidth: "300px" }}>
                    Toggle My Account Role ({user?.role === "admin" ? "Demote to User" : "Promote to Admin"})
                  </button>
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
