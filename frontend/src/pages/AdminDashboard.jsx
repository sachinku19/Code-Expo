import React, { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
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
  deleteAdminStory,
  adminIssueUserAction,
  bulkDeletePosts,
  bulkHidePosts,
  bulkFeaturePosts,
  updateAdminStoryStatus,
  toggleAdminStoryFeature
} from "../services/adminService";
import socket from "../socket/socket";
import { adminGetAppeals, adminResolveAppeal } from "../services/trustSafetyService";
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
  Sparkles,
  Link,
  BarChart2,
  FileText
} from "lucide-react";
import Logo from "../components/shared/Logo";
import { Pin, Heart, Edit, EyeOff } from "lucide-react";
import {
  adminGetAllTickets,
  adminUpdateTicketStatus,
  addTicketMessage,
  getTicketDetails
} from "../services/ticketService";
import "./AdminDashboard.css";

// Reusable styled CodeBlock component with line numbers, syntax highlighting, and copy button
const CodeBlock = ({ lang, code, addToast }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = code.split(/\r?\n/);
  const totalLines = lines.length;
  const isLong = totalLines > 30;

  const visibleLines = isLong && !isExpanded ? lines.slice(0, 22) : lines;
  const remainingLines = totalLines - visibleLines.length;
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
  return (
    <div
      className="premium-code-window"
      style={{
        background: "#09090f",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        overflow: "hidden",
        margin: "12px 0",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "#11111b",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", gap: "5px", marginRight: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <span style={{ fontSize: "0.72rem", color: "#a5b4fc", fontFamily: "monospace", textTransform: "uppercase", fontWeight: "700" }}>
            {lang || "code"}
          </span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            if (addToast) addToast("Code copied to clipboard!", "success");
          }}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#e2e8f0",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.7rem",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.2s"
          }}
        >
          Copy
        </button>
      </div>

      <div
        style={{
          display: "flex",
          overflow: "auto",
          maxHeight: isLong && !isExpanded ? "380px" : "600px",
          position: "relative",
          background: "#09090f"
        }}
      >
        <div
          style={{
            padding: "16px 12px",
            borderRight: "1px solid rgba(255, 255, 255, 0.05)",
            background: "#07070c",
            textAlign: "right",
            userSelect: "none",
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.8rem",
            color: "#475569",
            lineHeight: "1.5",
            minWidth: "35px"
          }}
        >
          {visibleLines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 16px",
            flex: 1,
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.8rem",
            lineHeight: "1.5",
            color: "#e2e8f0",
            whiteSpace: "pre",
            overflowX: "auto"
          }}
        >
          {visibleLines.map((line, idx) => (
            <div
              key={idx}
              dangerouslySetInnerHTML={{ __html: highlightCode(line) }}
            />
          ))}
        </div>

        {isLong && !isExpanded && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "80px",
              background: "linear-gradient(to top, #09090f 20%, transparent 100%)",
              pointerEvents: "none"
            }}
          />
        )}
      </div>

      {isLong && (
        <div
          style={{
            padding: "12px",
            background: "#11111b",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 5
          }}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#a5b4fc",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {isExpanded
              ? "Show Less"
              : `${remainingLines} more lines... View Full Code`
            }
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable ExpandableText component for post descriptions to clamp long text
const ExpandableText = ({ htmlContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      setShouldShowButton(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [htmlContent]);

  return (
    <div style={{ position: "relative", marginBottom: "8px" }}>
      <div
        ref={textRef}
        style={{
          maxHeight: !isExpanded ? "120px" : "none",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          position: "relative"
        }}
      >
        {htmlContent}
        {!isExpanded && shouldShowButton && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "24px",
              background: "linear-gradient(to top, var(--admin-bg) 10%, transparent 100%)",
              pointerEvents: "none"
            }}
          />
        )}
      </div>
      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            fontSize: "0.8rem",
            fontWeight: "700",
            cursor: "pointer",
            padding: "4px 0",
            marginTop: "4px",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

const parseMarkdownOnly = (text) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0; color:#fff;">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0; color:#fff;">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0; color:#fff;">$1</h2>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`\r\n]+)`/g, '<code style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-family:monospace; color:#fb7185;">$1</code>');
  html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span style="color:#8b5cf6; font-weight:600; cursor:pointer;">#$1</span>');
  html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color:#06b6d4; font-weight:600; cursor:pointer;">@$1</span>');
  html = html.replace(/\n/g, "<br />");

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const renderPostContent = (text, addToast) => {
  if (!text) return null;

  const parts = text.split(/(```[a-zA-Z0-9]*(?:\r?\n)[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const match = part.match(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/);
      if (match) {
        const lang = match[1] || "code";
        const code = match[2];
        return (
          <CodeBlock
            key={index}
            lang={lang}
            code={code}
            addToast={addToast}
          />
        );
      }
    }

    return (
      <ExpandableText
        key={index}
        htmlContent={parseMarkdownOnly(part)}
      />
    );
  });
};

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
  const { resolvedTheme: theme, toggleTheme } = useTheme();
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
  const [expandedUserLogs, setExpandedUserLogs] = useState({});
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
  const [expandedModalPostLegal, setExpandedModalPostLegal] = useState({});

  // Feed Moderation states
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [expandedPostLegal, setExpandedPostLegal] = useState({});
  const [savingCompliance, setSavingCompliance] = useState({});
  const [selectedPostsBulk, setSelectedPostsBulk] = useState([]);
  const [selectedPostAnalytics, setSelectedPostAnalytics] = useState(null);
  const [storySearch, setStorySearch] = useState("");
  const [storyStatusFilter, setStoryStatusFilter] = useState("all");

  // Appeals State
  const [appeals, setAppeals] = useState([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [selectedAppealForReview, setSelectedAppealForReview] = useState(null);
  const [appealAdminNotes, setAppealAdminNotes] = useState("");
  const [resolvingAppeal, setResolvingAppeal] = useState(false);

  // Manual User Penalty Form State
  const [issueActionType, setIssueActionType] = useState("Warning Issued");
  const [issueReason, setIssueReason] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [submittingUserAction, setSubmittingUserAction] = useState(false);

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
  const [editingPostId, setEditingPostId] = useState(null);
  const [editingPostText, setEditingPostText] = useState("");
  const [expandedPosts, setExpandedPosts] = useState({});
  const [feedStats, setFeedStats] = useState({ totalPosts: 0, flaggedPosts: 0, hiddenPosts: 0, totalComments: 0 });

  // Grouped Feed states
  const [feedUsers, setFeedUsers] = useState([]);
  const [feedSearch, setFeedSearch] = useState("");
  const [feedPage, setFeedPage] = useState(1);
  const [feedPagination, setFeedPagination] = useState({ totalPages: 1, totalUsers: 0 });
  const [expandedUserFeed, setExpandedUserFeed] = useState({});
  const [expandedUserSubTab, setExpandedUserSubTab] = useState({});



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

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    const handlePostCreated = (newPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost._id || p.id === newPost.id)) return prev;
        const formattedPost = {
          id: newPost._id,
          text: newPost.text,
          techStack: newPost.techStack || [],
          image: newPost.image || "",
          images: newPost.images || [],
          likesCount: newPost.likes ? newPost.likes.length : 0,
          comments: newPost.comments || [],
          status: newPost.status || "active",
          legalCase: newPost.legalCase || {
            caseId: "",
            infringementType: "None",
            caseStatus: "Resolved",
            notes: "",
            actionTakenBy: "",
            actionDate: null
          },
          createdAt: newPost.createdAt,
          author: newPost.author ? {
            id: newPost.author._id || newPost.author.id,
            username: newPost.author.username,
            email: newPost.author.email,
            avatar: newPost.author.avatar,
            title: newPost.author.title
          } : { username: "Unknown / Deleted User" }
        };
        return [formattedPost, ...prev];
      });
      setFeedStats((prev) => ({
        ...prev,
        totalPosts: prev.totalPosts + 1
      }));
    };

    const handlePostDeleted = ({ postId }) => {
      let deletedPost = null;
      setPosts((prev) => {
        deletedPost = prev.find((p) => p.id === postId || p._id === postId);
        return prev.filter((p) => p.id !== postId && p._id !== postId);
      });
      if (deletedPost) {
        setFeedStats((prev) => {
          const next = { ...prev };
          next.totalPosts = Math.max(0, next.totalPosts - 1);
          if (deletedPost.status === "flagged") next.flaggedPosts = Math.max(0, next.flaggedPosts - 1);
          if (deletedPost.status === "hidden") next.hiddenPosts = Math.max(0, next.hiddenPosts - 1);
          next.totalComments = Math.max(0, next.totalComments - (deletedPost.comments ? deletedPost.comments.length : 0));
          return next;
        });
      }
    };

    const handlePostLiked = ({ postId, likes, likesCount }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId || p._id === postId) {
            return {
              ...p,
              likesCount: likesCount !== undefined ? likesCount : (likes ? likes.length : p.likesCount)
            };
          }
          return p;
        })
      );
    };

    const handlePostCommented = ({ postId, comments, commentsCount }) => {
      let commentDiff = 0;
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId || p._id === postId) {
            const oldCommentsCount = p.comments ? p.comments.length : 0;
            const newCommentsCount = comments ? comments.length : (commentsCount || 0);
            commentDiff = newCommentsCount - oldCommentsCount;
            return { ...p, comments: comments || [] };
          }
          return p;
        })
      );
      if (commentDiff !== 0) {
        setFeedStats((prev) => ({
          ...prev,
          totalComments: Math.max(0, prev.totalComments + commentDiff)
        }));
      }
    };

    const handleAdminPostAction = ({ postId, post: updatedPost }) => {
      let oldStatus = "";
      let newStatus = "";
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId || p._id === postId) {
            oldStatus = p.status || "active";
            newStatus = updatedPost.status || oldStatus;
            return {
              ...p,
              ...updatedPost,
              id: postId,
              author: p.author
            };
          }
          return p;
        })
      );
      if (oldStatus && newStatus && oldStatus !== newStatus) {
        setFeedStats((prev) => {
          const next = { ...prev };
          if (oldStatus === "flagged") next.flaggedPosts = Math.max(0, next.flaggedPosts - 1);
          if (oldStatus === "hidden") next.hiddenPosts = Math.max(0, next.hiddenPosts - 1);
          if (newStatus === "flagged") next.flaggedPosts += 1;
          if (newStatus === "hidden") next.hiddenPosts += 1;
          return next;
        });
      }
    };

    const handleUserStatus = ({ userId, isOnline }) => {
      setStats((prev) => {
        if (!prev) return prev;
        const updatedOnlineCount = isOnline
          ? Math.min(prev.totalUsers || 100, (prev.onlineUsers || 0) + 1)
          : Math.max(0, (prev.onlineUsers || 0) - 1);

        setNetworkStats(Math.min(100, Math.max(10, 20 + updatedOnlineCount * 8)));

        let updatedList = prev.onlineUsersList || [];
        if (!isOnline) {
          updatedList = updatedList.filter((u) => u.id !== userId && u._id !== userId);
        }
        return {
          ...prev,
          onlineUsers: updatedOnlineCount,
          onlineUsersList: updatedList
        };
      });
    };

    socket.on("post:created", handlePostCreated);
    socket.on("post:deleted", handlePostDeleted);
    socket.on("post:liked", handlePostLiked);
    socket.on("post:commented", handlePostCommented);
    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("user:status", handleUserStatus);

    return () => {
      socket.off("post:created", handlePostCreated);
      socket.off("post:deleted", handlePostDeleted);
      socket.off("post:liked", handlePostLiked);
      socket.off("post:commented", handlePostCommented);
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("user:status", handleUserStatus);
    };
  }, []);



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
        setLoginLogs(data.users || []);
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

  const fetchFeedContent = async () => {
    setLoadingPosts(true);
    setLoadingStories(true);
    try {
      const data = await getAdminPosts(feedPage, 10, feedSearch, "all", "", true);
      if (data.success) {
        setFeedUsers(data.users || []);
        setFeedPagination(data.pagination);
        if (data.stats) {
          setFeedStats(data.stats);
        }
      }
    } catch (err) {
      addToast("Failed to fetch grouped feed content", "error");
    } finally {
      setLoadingPosts(false);
      setLoadingStories(false);
    }
  };

  const fetchPosts = async () => {
    await fetchFeedContent();
  };

  const fetchStories = async () => {
    await fetchFeedContent();
  };

  const handleSaveCompliance = async (postId, status, legalData) => {
    setSavingCompliance(prev => ({ ...prev, [postId]: true }));
    try {
      const res = await updateAdminPostStatus(postId, status, legalData);
      if (res.success) {
        addToast("Legal compliance details saved successfully", "success");
        let oldStatus = "active";
        setPosts(prev => prev.map(p => {
          if (p.id === postId || p._id === postId) {
            oldStatus = p.status || "active";
            return { ...p, status, legalCase: res.post.legalCase };
          }
          return p;
        }));

        // Update stats locally
        setFeedStats(prev => {
          const next = { ...prev };
          if (oldStatus === "flagged") next.flaggedPosts = Math.max(0, next.flaggedPosts - 1);
          if (oldStatus === "hidden") next.hiddenPosts = Math.max(0, next.hiddenPosts - 1);

          if (status === "flagged") next.flaggedPosts += 1;
          if (status === "hidden") next.hiddenPosts += 1;

          return next;
        });
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
        let oldStatus = "active";
        setPosts(prev => prev.map(p => {
          if (p.id === postId || p._id === postId) {
            oldStatus = p.status || "active";
            return { ...p, status };
          }
          return p;
        }));

        // Update stats locally
        setFeedStats(prev => {
          const next = { ...prev };
          if (oldStatus === "flagged") next.flaggedPosts = Math.max(0, next.flaggedPosts - 1);
          if (oldStatus === "hidden") next.hiddenPosts = Math.max(0, next.hiddenPosts - 1);

          if (status === "flagged") next.flaggedPosts += 1;
          if (status === "hidden") next.hiddenPosts += 1;

          return next;
        });
        return true;
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Failed to update status", "error");
    }
    return false;
  };

  const handleTogglePin = async (post) => {
    try {
      const targetId = post.id || post._id;
      const nextVal = !post.isPinned;
      const res = await updateAdminPostStatus(targetId, post.status, { isPinned: nextVal });
      if (res.success) {
        addToast(nextVal ? "Post pinned successfully" : "Post unpinned successfully", "success");
        setPosts(prev => prev.map(p => (p.id === targetId || p._id === targetId) ? { ...p, isPinned: nextVal } : p));
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleFeature = async (post) => {
    try {
      const targetId = post.id || post._id;
      const nextVal = !post.isFeatured;
      const res = await updateAdminPostStatus(targetId, post.status, { isFeatured: nextVal });
      if (res.success) {
        addToast(nextVal ? "Post featured successfully" : "Post unfeatured successfully", "success");
        setPosts(prev => prev.map(p => (p.id === targetId || p._id === targetId) ? { ...p, isFeatured: nextVal } : p));
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleCommentsLock = async (post) => {
    try {
      const targetId = post.id || post._id;
      const nextVal = !post.commentsLocked;
      const res = await updateAdminPostStatus(targetId, post.status, { commentsLocked: nextVal });
      if (res.success) {
        addToast(nextVal ? "Comments locked successfully" : "Comments unlocked successfully", "success");
        setPosts(prev => prev.map(p => (p.id === targetId || p._id === targetId) ? { ...p, commentsLocked: nextVal } : p));
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleLikesDisabled = async (post) => {
    try {
      const targetId = post.id || post._id;
      const nextVal = !post.likesDisabled;
      const res = await updateAdminPostStatus(targetId, post.status, { likesDisabled: nextVal });
      if (res.success) {
        addToast(nextVal ? "Likes disabled successfully" : "Likes enabled successfully", "success");
        setPosts(prev => prev.map(p => (p.id === targetId || p._id === targetId) ? { ...p, likesDisabled: nextVal } : p));
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleSensitive = async (post) => {
    try {
      const targetId = post.id || post._id;
      const nextVal = !post.isSensitive;
      const res = await updateAdminPostStatus(targetId, post.status, { isSensitive: nextVal });
      if (res.success) {
        addToast(nextVal ? "Post marked as sensitive" : "Sensitive flag removed", "success");
        setPosts(prev => prev.map(p => (p.id === targetId || p._id === targetId) ? { ...p, isSensitive: nextVal } : p));
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleSaveEditedText = async (postId, text, currentStatus) => {
    try {
      const res = await updateAdminPostStatus(postId, currentStatus || "active", { text });
      if (res.success) {
        addToast("Post content updated successfully", "success");
        setPosts(prev => prev.map(p => (p.id === postId || p._id === postId) ? { ...p, text } : p));
        setEditingPostId(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  // Parsing Helpers for Markdown, Code, Polls, Repos, and Events
  const parseMarkdown = (text) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold/Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code block (with vertical scroll if it exceeds 180px)
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

  const parsePollBlock = (postId, text) => {
    if (!text || !text.includes("[POLL_QUESTION]")) return null;
    const matchQ = text.match(/\[POLL_QUESTION\] (.*)/);
    const matchO = text.match(/\[POLL_OPTS\] (.*)/);
    if (!matchQ || !matchO) return null;

    const question = matchQ[1].split("\n")[0];
    const opts = matchO[1].split(",").map(o => o.trim());

    return (
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px", margin: "10px 0" }}>
        <h5 style={{ margin: "0 0 8px 0", color: "var(--accent)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
          📊 Developer Poll (Moderation)
        </h5>
        <p style={{ margin: "0 0 10px 0", color: "var(--admin-text-h)", fontSize: "0.78rem", fontWeight: "600" }}>{question}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {opts.map((opt, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "var(--admin-text)",
                padding: "8px 10px",
                borderRadius: "6px",
                fontSize: "0.74rem"
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const parseRepoBlock = (text) => {
    if (!text || !text.includes("[REPO]")) return null;
    const match = text.match(/\[REPO\] (.*)/);
    if (!match) return null;
    const repoName = match[1].split("\n")[0].trim();

    return (
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          padding: "12px",
          margin: "10px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#fbbf24", fontSize: "0.9rem" }}>⭐</span>
          <div>
            <h6 style={{ margin: 0, color: "#60a5fa", fontSize: "0.78rem", fontWeight: "750" }}>{repoName}</h6>
            <span style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Linked GitHub Repository</span>
          </div>
        </div>
      </div>
    );
  };

  const parseEventBlock = (text) => {
    if (!text || !text.includes("[EVENT]")) return null;
    const match = text.match(/\[EVENT\] (.*)/);
    if (!match) return null;
    const parts = match[1].split("\n")[0].split("&").map(p => p.trim());
    const title = parts[0];
    const date = parts[1] || "Upcoming Date";

    return (
      <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "12px", margin: "10px 0", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ color: "#818cf8", fontSize: "0.9rem" }}>📅</span>
        <div>
          <h6 style={{ margin: 0, color: "var(--admin-text-h)", fontSize: "0.78rem", fontWeight: "750" }}>{title}</h6>
          <span style={{ fontSize: "0.68rem", color: "#a5b4fc" }}>Event Date: {date}</span>
        </div>
      </div>
    );
  };

  const renderPostImages = (post) => {
    const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
    if (postImages.length === 0) return null;

    return (
      <div style={{ display: "grid", gridTemplateColumns: postImages.length > 1 ? "repeat(auto-fit, minmax(120px, 1fr))" : "1fr", gap: "8px", marginTop: "10px", borderRadius: "8px", overflow: "hidden" }}>
        {postImages.map((src, idx) => (
          <div key={idx} style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid var(--admin-border-subtle)", position: "relative", paddingBottom: "66.6%", height: 0 }}>
            <img src={src} alt={`Attachment ${idx}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ))}
      </div>
    );
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
    } else if (activeTab === "appeals") {
      fetchAppealsList();
    }
  }, [activeTab, feedSubTab]);

  useEffect(() => {
    if (activeTab === "feed") {
      fetchFeedContent();
    }
  }, [activeTab, feedPage, feedSearch]);

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
          let deletedPost = null;
          setPosts(prev => {
            deletedPost = prev.find(p => p.id === targetId || p._id === targetId);
            return prev.filter(p => p.id !== targetId && p._id !== targetId);
          });
          if (deletedPost) {
            setFeedStats(prev => {
              const next = { ...prev };
              next.totalPosts = Math.max(0, next.totalPosts - 1);
              if (deletedPost.status === "flagged") next.flaggedPosts = Math.max(0, next.flaggedPosts - 1);
              if (deletedPost.status === "hidden") next.hiddenPosts = Math.max(0, next.hiddenPosts - 1);
              next.totalComments = Math.max(0, next.totalComments - (deletedPost.comments ? deletedPost.comments.length : 0));
              return next;
            });
          }
        }
      } else if (type === "bulkDeletePosts") {
        const res = await bulkDeletePosts(extraData);
        if (res.success) {
          addToast(res.message, "success");
          setSelectedPostsBulk([]);
          fetchPosts();
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
          fetchPosts();
        }
      }
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      addToast(err.response?.data?.message || err.message || "Action failed", "error");
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedPostsBulk.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: "bulkDeletePosts",
      targetId: "bulk",
      targetName: `${selectedPostsBulk.length} selected posts`,
      extraData: selectedPostsBulk
    });
  };

  const handleBulkHide = async (hide) => {
    if (selectedPostsBulk.length === 0) return;
    try {
      const res = await bulkHidePosts(selectedPostsBulk, hide);
      if (res.success) {
        addToast(res.message, "success");
        setSelectedPostsBulk([]);
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleBulkFeature = async (feature) => {
    if (selectedPostsBulk.length === 0) return;
    try {
      const res = await bulkFeaturePosts(selectedPostsBulk, feature);
      if (res.success) {
        addToast(res.message, "success");
        setSelectedPostsBulk([]);
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleStoryHide = async (storyId, currentStatus) => {
    try {
      const nextStatus = currentStatus === "hidden" ? "active" : "hidden";
      const res = await updateAdminStoryStatus(storyId, nextStatus);
      if (res.success) {
        addToast(res.message, "success");
        fetchStories();
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleToggleStoryFeature = async (storyId, currentFeature) => {
    try {
      const nextFeature = !currentFeature;
      const res = await toggleAdminStoryFeature(storyId, nextFeature);
      if (res.success) {
        addToast(res.message, "success");
        fetchStories();
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleCopyPostLink = (postId) => {
    const url = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(url);
    addToast("Post link copied to clipboard", "success");
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
    const theme = localStorage.getItem("codeExpoHomeTheme");

    // Preserve read stories cache for all users
    const readStoriesKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("codeexpo_read_stories")) {
        readStoriesKeys.push({ key, value: localStorage.getItem(key) });
      }
    }

    localStorage.clear();

    if (theme) {
      localStorage.setItem("codeExpoHomeTheme", theme);
    }
    readStoriesKeys.forEach(item => {
      localStorage.setItem(item.key, item.value);
    });

    window.location.href = "/login";
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

  const handleUpdateTicketStatus = async (ticketId, status, assignedTo) => {
    try {
      const res = await adminUpdateTicketStatus(ticketId, status, assignedTo);
      if (res.success) {
        setSelectedAdminTicket(res.ticket);
        addToast("Ticket details updated successfully", "success");
        fetchAdminTickets();
      }
    } catch (err) {
      addToast("Failed to update ticket", "error");
    }
  };

  const fetchAppealsList = async () => {
    setLoadingAppeals(true);
    try {
      const res = await adminGetAppeals();
      if (res.success) {
        setAppeals(res.appeals || []);
      }
    } catch (err) {
      addToast("Failed to fetch appeals", "error");
    } finally {
      setLoadingAppeals(false);
    }
  };

  const handleResolveAppealDecision = async (appealId, status) => {
    if (!appealAdminNotes.trim()) {
      addToast("Please provide administrative response explanation notes.", "warning");
      return;
    }
    setResolvingAppeal(true);
    try {
      const res = await adminResolveAppeal(appealId, status, appealAdminNotes);
      if (res.success) {
        addToast(`Appeal has been successfully ${status.toLowerCase()}.`, "success");
        setSelectedAppealForReview(null);
        setAppealAdminNotes("");
        fetchAppealsList();
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to resolve appeal.", "error");
    } finally {
      setResolvingAppeal(false);
    }
  };

  const handleIssueUserAction = async (e) => {
    e.preventDefault();
    if (!selectedUserLogs) return;
    if (!issueReason.trim()) {
      addToast("Please provide a reason for this administrative action.", "warning");
      return;
    }
    setSubmittingUserAction(true);
    try {
      const res = await adminIssueUserAction(
        selectedUserLogs._id || selectedUserLogs.id,
        issueActionType,
        issueReason,
        issueNotes
      );
      if (res.success) {
        addToast(`Successfully issued ${issueActionType} action penalty.`, "success");
        setIssueReason("");
        setIssueNotes("");
        setSelectedUserLogs(null);
        fetchUsers();
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to issue user action.", "error");
    } finally {
      setSubmittingUserAction(false);
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

                {/* Manual Moderation Compliance Action Panel */}
                <form onSubmit={handleIssueUserAction} style={{ width: "100%", borderTop: "1px solid var(--admin-border)", padding: "15px 0 0", marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
                  <h5 style={{ margin: "0 0 5px", fontSize: "0.82rem", color: "var(--admin-text-h)" }}>Issue Moderation Penalty</h5>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Action Type</label>
                    <select
                      value={issueActionType}
                      onChange={(e) => setIssueActionType(e.target.value)}
                      style={{ background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--admin-border)", borderRadius: "4px", padding: "6px 8px", fontSize: "0.75rem" }}
                    >
                      <option value="Warning Issued">Warning</option>
                      <option value="Temporary Restriction">Restricted Standing</option>
                      <option value="Suspension">Suspension</option>
                      <option value="Ban">Permanent Ban</option>
                      <option value="Account Reactivated">Lift Restrictions / Reactivate (Active)</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Reason *</label>
                    <input
                      type="text"
                      value={issueReason}
                      onChange={(e) => setIssueReason(e.target.value)}
                      required
                      placeholder="e.g. Terms of Service violation..."
                      style={{ background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--admin-border)", borderRadius: "4px", padding: "6px 8px", fontSize: "0.75rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Private Notes (Optional)</label>
                    <input
                      type="text"
                      value={issueNotes}
                      onChange={(e) => setIssueNotes(e.target.value)}
                      placeholder="Admin notes..."
                      style={{ background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--admin-border)", borderRadius: "4px", padding: "6px 8px", fontSize: "0.75rem" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingUserAction}
                    style={{ background: "var(--admin-accent)", border: "none", color: "#fff", padding: "8px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: "650", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {submittingUserAction ? "Issuing..." : "Submit Penalty Action"}
                  </button>
                </form>
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
                  <div className="admin-modal-scrollable-list">
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
                  <div className="admin-modal-scrollable-list" style={{ gap: "12px" }}>
                    {loadingModalPosts ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", flex: 1 }}>
                        <Loader className="spinner" size={20} />
                      </div>
                    ) : userPostsForModal.length === 0 ? (
                      <div style={{ textAlign: "center", color: "var(--admin-text-muted)", fontStyle: "italic", padding: "40px 0" }}>No posts found for this user.</div>
                    ) : (
                      userPostsForModal.map((p) => (
                        <div key={p.id} style={{ borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <span style={{ fontSize: "0.74rem", color: "var(--admin-text-muted)" }}>{new Date(p.createdAt).toLocaleString()}</span>
                              <span className={`post-status-badge status-${p.status}`} style={{ fontSize: "0.6rem", padding: "1px 4px", borderRadius: "3px" }}>
                                {p.status.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <select
                                value={p.status || "active"}
                                onChange={async (e) => {
                                  const success = await handleStatusChange(p.id, e.target.value);
                                  if (success) {
                                    const postData = await getAdminPosts(1, 20, "", "all", selectedUserLogs.id);
                                    if (postData.success) setUserPostsForModal(postData.posts);
                                  }
                                }}
                                style={{ background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", fontSize: "0.7rem", color: "var(--admin-text-h)", padding: "2px 6px", outline: "none" }}
                              >
                                <option value="active">Active</option>
                                <option value="flagged">Flagged</option>
                                <option value="hidden">Hidden</option>
                              </select>

                              <button
                                onClick={() => {
                                  setExpandedModalPostLegal(prev => ({
                                    ...prev,
                                    [p.id]: !prev[p.id]
                                  }));
                                }}
                                className={`btn-compliance-action ${expandedModalPostLegal[p.id] ? "active" : ""}`}
                                title="Manage legal case file & compliance notes"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: expandedModalPostLegal[p.id] ? "var(--admin-btn-active-bg)" : "var(--admin-btn-secondary-bg)",
                                  border: `1px solid ${expandedModalPostLegal[p.id] ? "var(--admin-btn-active-border)" : "var(--admin-border)"}`,
                                  color: expandedModalPostLegal[p.id] ? "var(--accent)" : "var(--admin-text-muted)",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.7rem",
                                  fontWeight: "700",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <ShieldAlert size={10} />
                                <span>Legal File</span>
                              </button>

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

                          {renderPostContent(p.text, addToast)}
                          {parsePollBlock(p.id, p.text)}
                          {parseRepoBlock(p.text)}
                          {parseEventBlock(p.text)}

                          {p.techStack && p.techStack.length > 0 && (
                            <div className="post-tech-tags" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                              {p.techStack.map((tech, idx) => (
                                <span key={idx} className="tech-tag-pill" style={{ fontSize: "0.68rem", padding: "1px 6px", background: "var(--admin-btn-active-bg)", border: "1px solid var(--admin-border-subtle)", borderRadius: "4px", color: "var(--admin-text)" }}>{tech}</span>
                              ))}
                            </div>
                          )}

                          {renderPostImages(p)}

                          {expandedModalPostLegal[p.id] && (
                            <div className="post-legal-compliance-section animate-slide-down" style={{
                              background: "rgba(170, 59, 255, 0.03)",
                              border: "1px solid rgba(170, 59, 255, 0.15)",
                              borderRadius: "8px",
                              padding: "12px",
                              marginTop: "10px"
                            }}>
                              <h5 style={{ margin: "0 0 8px 0", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent)" }}>
                                Compliance File & Legal Claims
                              </h5>

                              <form onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.target;
                                const infringementType = form.infringementType.value;
                                const caseStatus = form.caseStatus.value;
                                const notes = form.notes.value;
                                const caseId = form.caseId.value;

                                await handleSaveCompliance(p.id, p.status, {
                                  caseId,
                                  infringementType,
                                  caseStatus,
                                  notes
                                });

                                const postData = await getAdminPosts(1, 20, "", "all", selectedUserLogs.id);
                                if (postData.success) setUserPostsForModal(postData.posts);
                              }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                  <div>
                                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Case ID</label>
                                    <input type="text" name="caseId" defaultValue={p.legalCase?.caseId || ""} style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-h)" }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Infringement Type</label>
                                    <select name="infringementType" defaultValue={p.legalCase?.infringementType || "None"} style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-h)" }}>
                                      <option value="None">None</option>
                                      <option value="Copyright">Copyright</option>
                                      <option value="Plagiarism">Plagiarism</option>
                                      <option value="Harassment">Harassment</option>
                                      <option value="Terms Violation">Terms Violation</option>
                                    </select>
                                  </div>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                  <div>
                                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Case Status</label>
                                    <select name="caseStatus" defaultValue={p.legalCase?.caseStatus || "Resolved"} style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-h)" }}>
                                      <option value="Pending">Pending</option>
                                      <option value="Under Review">Under Review</option>
                                      <option value="Resolved">Resolved</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Action Taken By</label>
                                    <input type="text" readOnly value={p.legalCase?.actionTakenBy || "System Admin"} style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "rgba(0,0,0,0.1)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-muted)" }} />
                                  </div>
                                </div>
                                <div style={{ marginBottom: "8px" }}>
                                  <label style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>Compliance Notes</label>
                                  <textarea name="notes" defaultValue={p.legalCase?.notes || ""} rows={2} style={{ width: "100%", padding: "4px", fontSize: "0.7rem", background: "var(--admin-input-bg)", border: "1px solid var(--admin-border)", borderRadius: "4px", color: "var(--admin-text-h)", resize: "none" }} />
                                </div>
                                <button type="submit" style={{ padding: "4px 8px", background: "var(--accent)", border: "none", borderRadius: "4px", color: "#fff", fontSize: "0.7rem", cursor: "pointer", fontWeight: "700" }}>
                                  Save Compliance File
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 3: STORIES */}
                {modalActiveTab === "stories" && (
                  <div className="admin-modal-scrollable-list" style={{ gap: "12px" }}>
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

          <button
            onClick={() => { setActiveTab("appeals"); setIsMobileSidebarOpen(false); }}
            className={`sidebar-nav-item-btn ${activeTab === "appeals" ? "active" : ""}`}
          >
            <ShieldAlert size={16} />
            <span>Appeals Review</span>
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
                      <th>Designation</th>
                      <th>Total Sessions</th>
                      <th style={{ textAlign: "right", paddingRight: "24px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-row">
                          {loadingLoginLogs ? "Loading session history..." : "No authentication logs found."}
                        </td>
                      </tr>
                    ) : (
                      loginLogs.map((developer) => {
                        const isExpanded = !!expandedUserLogs[developer.id];
                        return (
                          <Fragment key={developer.id}>
                            <tr 
                              className={`developer-log-row ${isExpanded ? 'row-expanded' : ''}`}
                              onClick={() => {
                                setExpandedUserLogs(prev => ({
                                  ...prev,
                                  [developer.id]: !prev[developer.id]
                                }));
                              }}
                            >
                              <td className="user-details-cell">
                                <div className="user-avatar-wrapper">
                                  {developer.avatar ? (
                                    <img src={developer.avatar} alt={developer.username} className="avatar-img" />
                                  ) : (
                                    <div className="avatar-placeholder">{developer.username.substring(0, 2).toUpperCase()}</div>
                                  )}
                                </div>
                                <span className="username-text">{developer.username}</span>
                                {developer.isOnline && (
                                  <span className="online-badge-dot" />
                                )}
                              </td>
                              <td>
                                <div className="email-flex">
                                  <Mail size={12} className="muted-icon" />
                                  <span>{developer.email}</span>
                                </div>
                              </td>
                              <td className="developer-designation-cell">
                                {developer.title || "Developer"}
                              </td>
                              <td>
                                <span className="session-count-badge">
                                  {developer.loginHistory?.length || 0} Sessions
                                </span>
                              </td>
                              <td className="expand-action-cell">
                                <button
                                  className="btn-expand-logs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedUserLogs(prev => ({
                                      ...prev,
                                      [developer.id]: !prev[developer.id]
                                    }));
                                  }}
                                >
                                  {isExpanded ? "Hide Logs" : "View Logs"}
                                </button>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr className="expanded-logs-subrow">
                                <td colSpan="5">
                                  <div className="nested-logs-container animate-fade-in">
                                    <table className="admin-data-table nested-table">
                                      <thead>
                                        <tr>
                                          <th>Login Date/Time</th>
                                          <th>Logout Date/Time</th>
                                          <th>Duration</th>
                                          <th>IP Address</th>
                                          <th>Client Info</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(!developer.loginHistory || developer.loginHistory.length === 0) ? (
                                          <tr>
                                            <td colSpan="5" className="empty-nested-row">No history entries found.</td>
                                          </tr>
                                        ) : (
                                          developer.loginHistory.map((log) => {
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
                                                <td className={`monospaced-text ${!log.logoutTime ? "active-session-duration" : ""}`}>
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
                                </td>
                              </tr>
                            )}
                          </Fragment>
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
              {/* OVERVIEW STATS CARDS */}
              <div className="feed-stats-overview-grid">
                <div className="feed-stat-card glass-panel blue">
                  <div className="stat-icon"><FileText size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Total Posts</span>
                    <span className="stat-count">{feedStats.totalPosts}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel indigo">
                  <div className="stat-icon"><Sparkles size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Total Stories</span>
                    <span className="stat-count">{feedStats.totalStories || 0}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel yellow">
                  <div className="stat-icon"><EyeOff size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Hidden Posts</span>
                    <span className="stat-count">{feedStats.hiddenPosts}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel orange">
                  <div className="stat-icon"><VolumeX size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Hidden Stories</span>
                    <span className="stat-count">{feedStats.hiddenStories || 0}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel purple">
                  <div className="stat-icon"><Star size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Featured Posts</span>
                    <span className="stat-count">{feedStats.featuredPosts || 0}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel teal">
                  <div className="stat-icon"><Pin size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Pinned Posts</span>
                    <span className="stat-count">{feedStats.pinnedPosts || 0}</span>
                  </div>
                </div>
                <div className="feed-stat-card glass-panel red">
                  <div className="stat-icon"><AlertTriangle size={18} /></div>
                  <div className="stat-details">
                    <span className="stat-title">Recent Reports</span>
                    <span className="stat-count">{feedStats.flaggedPosts}</span>
                  </div>
                </div>
              </div>

              {/* FEED CONTENT SEARCH BAR */}
              <div className="feed-filters-bar glass-panel" style={{ marginBottom: "20px", marginTop: "10px" }}>
                <div className="search-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search creators by username or email..."
                    value={feedSearch}
                    onChange={(e) => {
                      setFeedSearch(e.target.value);
                      setFeedPage(1);
                    }}
                  />
                  {loadingPosts && <Loader className="spinner" size={14} />}
                </div>
              </div>

              {/* DEVELOPERS GRID TABLE */}
              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Developer</th>
                      <th>Email</th>
                      <th>Designation</th>
                      <th>Platform Content</th>
                      <th style={{ textAlign: "right", paddingRight: "24px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feedUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-table-row">
                          {loadingPosts ? "Loading content creators..." : "No developers found with feed posts or stories."}
                        </td>
                      </tr>
                    ) : (
                      feedUsers.map((developer) => {
                        const isExpanded = !!expandedUserFeed[developer.id];
                        const activeSubTab = expandedUserSubTab[developer.id] || "posts";
                        
                        return (
                          <Fragment key={developer.id}>
                            <tr 
                              className={`developer-log-row ${isExpanded ? 'row-expanded' : ''}`}
                              onClick={() => {
                                setExpandedUserFeed(prev => ({
                                  ...prev,
                                  [developer.id]: !prev[developer.id]
                                }));
                              }}
                            >
                              <td className="user-details-cell">
                                <div className="user-avatar-wrapper">
                                  {developer.avatar ? (
                                    <img src={developer.avatar} alt={developer.username} className="avatar-img" />
                                  ) : (
                                    <div className="avatar-placeholder">{developer.username.substring(0, 2).toUpperCase()}</div>
                                  )}
                                </div>
                                <span className="username-text">{developer.username}</span>
                                {developer.isOnline && (
                                  <span className="online-badge-dot" />
                                )}
                              </td>
                              <td>
                                <div className="email-flex">
                                  <Mail size={12} className="muted-icon" />
                                  <span>{developer.email}</span>
                                </div>
                              </td>
                              <td className="developer-designation-cell">
                                {developer.title || "Developer"}
                              </td>
                              <td>
                                <span className="session-count-badge">
                                  {developer.posts?.length || 0} Posts / {developer.stories?.length || 0} Stories
                                </span>
                              </td>
                              <td className="expand-action-cell">
                                <button
                                  className="btn-expand-logs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedUserFeed(prev => ({
                                      ...prev,
                                      [developer.id]: !prev[developer.id]
                                    }));
                                  }}
                                >
                                  {isExpanded ? "Hide Feed" : "View Feed"}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr className="expanded-logs-subrow">
                                <td colSpan="5">
                                  <div className="nested-logs-container animate-fade-in" style={{ padding: "20px" }}>
                                    {/* Sub-tab selection */}
                                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                                      <button
                                        onClick={() => setExpandedUserSubTab(prev => ({ ...prev, [developer.id]: "posts" }))}
                                        className={`feed-subtab-btn ${activeSubTab === "posts" ? "active" : ""}`}
                                        style={{
                                          background: activeSubTab === "posts" ? "var(--admin-btn-active-bg)" : "none",
                                          border: `1px solid ${activeSubTab === "posts" ? "var(--admin-btn-active-border)" : "rgba(255,255,255,0.05)"}`,
                                          color: activeSubTab === "posts" ? "var(--accent)" : "var(--admin-text-muted)",
                                          padding: "6px 12px",
                                          borderRadius: "6px",
                                          cursor: "pointer",
                                          fontSize: "0.8rem",
                                          fontWeight: "600"
                                        }}
                                      >
                                        Posts ({developer.posts?.length || 0})
                                      </button>
                                      <button
                                        onClick={() => setExpandedUserSubTab(prev => ({ ...prev, [developer.id]: "stories" }))}
                                        className={`feed-subtab-btn ${activeSubTab === "stories" ? "active" : ""}`}
                                        style={{
                                          background: activeSubTab === "stories" ? "var(--admin-btn-active-bg)" : "none",
                                          border: `1px solid ${activeSubTab === "stories" ? "var(--admin-btn-active-border)" : "rgba(255,255,255,0.05)"}`,
                                          color: activeSubTab === "stories" ? "var(--accent)" : "var(--admin-text-muted)",
                                          padding: "6px 12px",
                                          borderRadius: "6px",
                                          cursor: "pointer",
                                          fontSize: "0.8rem",
                                          fontWeight: "600"
                                        }}
                                      >
                                        Stories ({developer.stories?.length || 0})
                                      </button>
                                    </div>

                                    {/* Active Tab View */}
                                    {activeSubTab === "posts" ? (
                                      <div className="admin-posts-list">
                                        {(!developer.posts || developer.posts.length === 0) ? (
                                          <div style={{ textAlign: "center", fontStyle: "italic", padding: "20px", color: "var(--admin-text-muted)" }}>
                                            No posts created by this developer yet.
                                          </div>
                                        ) : (
                                          developer.posts.map((post) => {
                                            const postType = post.video ? "video" : post.images && post.images.length > 0 ? "image" : "text";
                                            return (
                                              <div key={post.id || post._id} className={`admin-post-card-premium glass-panel ${post.status}`} style={{ margin: "10px 0" }}>
                                                <div className="card-main-content" style={{ width: "100%", paddingLeft: "10px" }}>
                                                  {/* Post Header */}
                                                  <div className="post-header-row">
                                                    <div className="post-author-info">
                                                      {developer.avatar ? (
                                                        <img src={developer.avatar} alt={developer.username} className="author-avatar" />
                                                      ) : (
                                                        <div className="author-avatar-placeholder">
                                                          {developer.username.substring(0, 2).toUpperCase()}
                                                        </div>
                                                      )}
                                                      <div className="author-meta">
                                                        <span className="author-name">{developer.username}</span>
                                                        <span className="post-date">{new Date(post.createdAt).toLocaleString()}</span>
                                                      </div>
                                                    </div>
                                                    <div className="post-badges">
                                                      {post.isPinned && <span className="badge badge-pinned"><Pin size={10} fill="#818cf8" /> Pinned</span>}
                                                      {post.isFeatured && <span className="badge badge-featured"><Sparkles size={10} fill="#c084fc" /> Featured</span>}
                                                      <span className="badge badge-type">{postType.toUpperCase()}</span>
                                                      <span className={`badge badge-status ${post.status}`}>{post.status.toUpperCase()}</span>
                                                    </div>
                                                  </div>
                                                  {/* Post Body */}
                                                  <div className="post-body-row">
                                                    {editingPostId === (post.id || post._id) ? (
                                                      <div className="edit-post-inline">
                                                        <textarea
                                                          value={editingPostText}
                                                          onChange={(e) => setEditingPostText(e.target.value)}
                                                          className="edit-textarea"
                                                        />
                                                        <div className="edit-actions">
                                                          <button onClick={() => handleSaveEditedText(post.id || post._id, editingPostText, post.status)} className="btn-save">Save</button>
                                                          <button onClick={() => setEditingPostId(null)} className="btn-cancel">Cancel</button>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="post-text-snippet">
                                                        {renderPostContent(post.text, addToast)}
                                                      </div>
                                                    )}
                                                    {post.techStack && post.techStack.length > 0 && (
                                                      <div className="post-tags">
                                                        {post.techStack.map((tech, idx) => (
                                                          <span key={idx} className="tech-tag">{tech}</span>
                                                        ))}
                                                      </div>
                                                    )}
                                                    {(post.image || (post.images && post.images.length > 0) || post.video) && (
                                                      <div className="post-media-preview-row">
                                                        {post.video ? (
                                                          <video src={post.video} className="media-preview-thumb" muted />
                                                        ) : (
                                                          <img src={post.image || post.images[0]} alt="Preview" className="media-preview-thumb" />
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                  {/* Post Footer */}
                                                  <div className="post-footer-row">
                                                    <div className="post-metrics">
                                                      <span className="metric-item" title="Views"><Eye size={12} /> {post.viewsCount || 0}</span>
                                                      <span className="metric-item" title="Likes"><Heart size={12} /> {post.likesCount}</span>
                                                      <span className="metric-item" title="Comments"><MessageSquare size={12} /> {post.comments?.length || 0}</span>
                                                    </div>
                                                    <div className="post-actions-group">
                                                      <button onClick={() => window.open(`/post/${post.id || post._id}`, "_blank")} className="btn-post-action" title="View Post"><Eye size={12}/></button>
                                                      <button onClick={() => { setEditingPostId(post.id || post._id); setEditingPostText(post.text); }} className="btn-post-action" title="Edit Post"><Edit size={12}/></button>
                                                      <button onClick={() => handleStatusChange(post.id || post._id, post.status === "hidden" ? "active" : "hidden")} className="btn-post-action" title={post.status === "hidden" ? "Unhide" : "Hide"}><EyeOff size={12} style={{ color: post.status === "hidden" ? "#10b981" : "inherit" }} /></button>
                                                      <button onClick={() => handleTogglePin(post)} className="btn-post-action" title={post.isPinned ? "Unpin" : "Pin"}><Pin size={12} style={{ color: post.isPinned ? "#818cf8" : "inherit" }} /></button>
                                                      <button onClick={() => handleToggleFeature(post)} className="btn-post-action" title={post.isFeatured ? "Unfeature" : "Feature"}><Sparkles size={12} style={{ color: post.isFeatured ? "#c084fc" : "inherit" }} /></button>
                                                      <button onClick={() => handleCopyPostLink(post.id || post._id)} className="btn-post-action" title="Copy Link"><Link size={12}/></button>
                                                      <button onClick={() => setSelectedPostAnalytics(post)} className="btn-post-action" title="View Analytics"><BarChart2 size={12}/></button>
                                                      <button onClick={() => handleDeletePostClick(post.id || post._id, developer.username)} className="btn-post-action btn-delete" title="Delete Post"><Trash2 size={12}/></button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    ) : (
                                      <div className="admin-stories-grid-premium" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                                        {(!developer.stories || developer.stories.length === 0) ? (
                                          <div style={{ gridColumn: "1 / -1", textAlign: "center", fontStyle: "italic", padding: "20px", color: "var(--admin-text-muted)" }}>
                                            No stories uploaded by this developer yet.
                                          </div>
                                        ) : (
                                          developer.stories.map((story) => {
                                            const storyType = story.mediaUrl && (story.mediaUrl.match(/\.(mp4|mov|avi|webm)/i) || story.mediaUrl.includes("video")) ? "video" : story.mediaUrl ? "image" : "text";
                                            const expiryDate = new Date(new Date(story.createdAt).getTime() + 24 * 60 * 60 * 1000);
                                            const hoursRemaining = Math.max(0, Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)));
                                            
                                            return (
                                              <div key={story.id} className={`admin-story-card-premium glass-panel ${story.status || "active"}`}>
                                                <div className="story-card-header">
                                                  <div className="story-author-info">
                                                    {developer.avatar ? (
                                                      <img src={developer.avatar} alt={developer.username} className="story-avatar" />
                                                    ) : (
                                                      <div className="story-avatar-placeholder">
                                                        {developer.username.substring(0, 2).toUpperCase()}
                                                      </div>
                                                    )}
                                                    <div className="story-author-meta">
                                                      <span className="story-author-name">{developer.username}</span>
                                                      <span className="story-expiry-time">Expires in {hoursRemaining}h</span>
                                                    </div>
                                                  </div>
                                                  <div className="story-badges">
                                                    {story.isFeatured && <span className="badge badge-featured"><Sparkles size={8} fill="#c084fc" /> Featured</span>}
                                                    <span className="badge badge-type">{storyType.toUpperCase()}</span>
                                                    <span className={`badge badge-status ${story.status || "active"}`}>{story.status || "active"}</span>
                                                  </div>
                                                </div>
                                                <div className="story-card-body">
                                                  {story.text && <p className="story-text-preview">{story.text}</p>}
                                                  {story.mediaUrl && (
                                                    <div className="story-media-frame">
                                                      {storyType === "video" ? (
                                                        <video src={story.mediaUrl} controls className="story-media-thumb" />
                                                      ) : (
                                                        <img src={story.mediaUrl} alt="Story Media" className="story-media-thumb" />
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="story-card-footer">
                                                  <div className="story-metrics">
                                                    <span className="metric-item"><Eye size={10} /> {story.viewsCount || 0}</span>
                                                    <span className="metric-item"><Heart size={10} /> {story.likesCount || 0}</span>
                                                  </div>
                                                  <div className="story-actions">
                                                    <button onClick={() => handleToggleStoryHide(story.id, story.status)} className="btn-story-action" title={story.status === "hidden" ? "Unhide" : "Hide"}><EyeOff size={12} style={{ color: story.status === "hidden" ? "#10b981" : "inherit" }} /></button>
                                                    <button onClick={() => handleToggleStoryFeature(story.id, story.isFeatured)} className="btn-story-action" title={story.isFeatured ? "Unfeature" : "Feature"}><Sparkles size={12} style={{ color: story.isFeatured ? "#c084fc" : "inherit" }} /></button>
                                                    <button onClick={() => handleDeleteStoryClick(story.id, developer.username)} className="btn-story-action btn-delete" title="Delete"><Trash2 size={12} /></button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION PANEL */}
              {feedPagination.totalPages > 1 && (
                <div className="table-pagination-row" style={{ marginTop: "24px" }}>
                  <button
                    disabled={feedPage <= 1}
                    onClick={() => setFeedPage((prev) => Math.max(1, prev - 1))}
                    className="btn-page-nav"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>
                  <span className="page-indicator">
                    Page <strong>{feedPage}</strong> of <strong>{feedPagination.totalPages}</strong> ({feedPagination.totalUsers} content creators)
                  </span>
                  <button
                    disabled={feedPage >= feedPagination.totalPages}
                    onClick={() => setFeedPage((prev) => Math.min(feedPagination.totalPages, prev + 1))}
                    className="btn-page-nav"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* POST ANALYTICS MODAL */}
              {selectedPostAnalytics && (
                <div className="analytics-modal-overlay animate-fade-in" onClick={() => setSelectedPostAnalytics(null)}>
                  <div className="analytics-modal-content glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h3>Post Engagement Metrics</h3>
                      <button onClick={() => setSelectedPostAnalytics(null)} className="btn-close-modal"><X size={16} /></button>
                    </div>
                    <div className="modal-body">
                      <div className="analytics-metrics-grid">
                        <div className="metric-box">
                          <span className="metric-label">Views</span>
                          <span className="metric-val">{selectedPostAnalytics.viewsCount || 0}</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-label">Likes</span>
                          <span className="metric-val">{selectedPostAnalytics.likesCount}</span>
                        </div>
                        <div className="metric-box">
                          <span className="metric-label">Comments</span>
                          <span className="metric-val">{selectedPostAnalytics.comments?.length || 0}</span>
                        </div>
                        <div className="metric-box highlighted">
                          <span className="metric-label">Engagement Rate</span>
                          <span className="metric-val">
                            {((selectedPostAnalytics.likesCount + (selectedPostAnalytics.comments?.length || 0)) / Math.max(1, selectedPostAnalytics.viewsCount || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="analytics-tip">Engagement rate is calculated as total interactions (likes + comments) divided by views.</p>
                    </div>
                  </div>
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

                      {/* Assignee select */}
                      <select
                        value={selectedAdminTicket.assignedTo?._id || selectedAdminTicket.assignedTo || ""}
                        onChange={(e) => handleUpdateTicketStatus(selectedAdminTicket._id, selectedAdminTicket.status, e.target.value || null)}
                        className="admin-title-select"
                        style={{ padding: "6px 12px", fontSize: "0.78rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--admin-border)", borderRadius: "4px" }}
                      >
                        <option value="">Unassigned Staff</option>
                        {admins.map(adm => (
                          <option key={adm._id || adm.id} value={adm._id || adm.id}>{adm.username}</option>
                        ))}
                      </select>

                      {/* Expanded Status select */}
                      <select
                        value={selectedAdminTicket.status}
                        onChange={(e) => handleUpdateTicketStatus(selectedAdminTicket._id, e.target.value, selectedAdminTicket.assignedTo?._id || selectedAdminTicket.assignedTo)}
                        className="admin-title-select"
                        style={{ padding: "6px 12px", fontSize: "0.78rem", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--admin-border)", borderRadius: "4px" }}
                      >
                        <option value="open">Open</option>
                        <option value="under-review">Under Review</option>
                        <option value="waiting-for-user">Waiting for User</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
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

          {activeTab === "appeals" && (
            <div className="tab-pane-table glass-panel animate-fade-in">
              <div className="table-search-row">
                <h4 style={{ margin: "0", fontSize: "0.95rem", fontWeight: "750", color: "var(--admin-text-h)" }}>User Appeals Review</h4>
                {loadingAppeals && <Loader className="spinner table-inline-loader" size={14} />}
              </div>

              <div className="table-wrapper-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Violation / Action</th>
                      <th>Reason for Appeal</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                      <th className="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appeals.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-table-row">
                          {loadingAppeals ? "Loading appeals list..." : "No appeals found."}
                        </td>
                      </tr>
                    ) : (
                      appeals.map((app) => (
                        <tr key={app._id}>
                          <td className="user-details-cell">
                            <div className="user-avatar-wrapper">
                              {app.user?.avatar ? (
                                <img src={app.user.avatar} alt={app.user.username} className="avatar-img" />
                              ) : (
                                <div className="avatar-placeholder">{(app.user?.username || "U").substring(0, 2).toUpperCase()}</div>
                              )}
                            </div>
                            <span className="username-text">
                              {app.user?.username || "Deleted User"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: "600", color: "var(--admin-text-h)" }}>
                              {app.moderationAction?.actionType}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)" }}>
                              Original Reason: {app.moderationAction?.reason}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.82rem", color: "var(--admin-text-h)", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {app.reason}
                            </div>
                            {app.notes && (
                              <div style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>
                                Notes: {app.notes}
                              </div>
                            )}
                            {app.attachment && (
                              <div style={{ marginTop: "4px" }}>
                                <a href={app.attachment} target="_blank" rel="noreferrer" style={{ fontSize: "0.68rem", color: "var(--admin-accent)", textDecoration: "underline" }}>View Attachment</a>
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`role-badge ${app.status === "Approved" ? "user" : app.status === "Pending" ? "demote" : "suspended"}`}
                              style={{
                                background: app.status === "Approved" ? "rgba(16, 185, 129, 0.1)" : app.status === "Pending" ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                color: app.status === "Approved" ? "#10b981" : app.status === "Pending" ? "#f59e0b" : "#ef4444",
                                border: app.status === "Approved" ? "1px solid rgba(16, 185, 129, 0.2)" : app.status === "Pending" ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)"
                              }}
                            >
                              {app.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(app.submittedDate || app.createdAt).toLocaleString()}</td>
                          <td className="actions-cell">
                            {app.status === "Pending" ? (
                              <button
                                onClick={() => setSelectedAppealForReview(app)}
                                className="btn-action promote"
                              >
                                Review Appeal
                              </button>
                            ) : (
                              <div style={{ fontSize: "0.72rem", color: "var(--admin-text-muted)", maxWidth: "150px", whiteSpace: "normal" }}>
                                <strong>Response:</strong> {app.adminResponse || "No comment."}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Quick Post Text Editor Modal */}
      {editingPostId && (
        <div className="ce-modal-overlay" onClick={() => setEditingPostId(null)} style={{ zIndex: 10000000, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "500px",
              background: "#0d0d15",
              border: "1px solid var(--admin-border)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <h4 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Edit Post Content</h4>
            <textarea
              value={editingPostText}
              onChange={(e) => setEditingPostText(e.target.value)}
              style={{
                width: "100%",
                height: "150px",
                background: "#06060a",
                border: "1px solid var(--admin-border)",
                borderRadius: "8px",
                padding: "10px",
                color: "#e2e8f0",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                resize: "none"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setEditingPostId(null)}
                style={{ padding: "6px 14px", background: "none", border: "1px solid var(--admin-border)", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetPost = posts.find(p => p.id === editingPostId || p._id === editingPostId);
                  handleSaveEditedText(editingPostId, editingPostText, targetPost?.status);
                }}
                style={{ padding: "6px 14px", background: "var(--accent)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Appeal Review Decision Modal */}
      {selectedAppealForReview && (
        <div className="ce-modal-overlay" onClick={() => setSelectedAppealForReview(null)} style={{ zIndex: 10000000, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "500px",
              background: "#0d0d15",
              border: "1px solid var(--admin-border)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <h4 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Review Compliance Appeal</h4>
            <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "8px", fontSize: "0.75rem", color: "var(--admin-text-muted)", display: "flex", flexDirection: "column", gap: "4px", textAlign: "left" }}>
              <span><strong>User:</strong> {selectedAppealForReview.user?.username}</span>
              <span><strong>Action:</strong> {selectedAppealForReview.moderationAction?.actionType}</span>
              <span><strong>User Reason:</strong> {selectedAppealForReview.reason}</span>
              {selectedAppealForReview.notes && <span><strong>Notes:</strong> {selectedAppealForReview.notes}</span>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Administrative Explanation Response Notes *</label>
              <textarea
                value={appealAdminNotes}
                onChange={(e) => setAppealAdminNotes(e.target.value)}
                required
                placeholder="Explain the approval/rejection justification decision..."
                style={{
                  width: "100%",
                  height: "100px",
                  background: "#06060a",
                  border: "1px solid var(--admin-border)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "#e2e8f0",
                  fontSize: "0.85rem",
                  resize: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setSelectedAppealForReview(null)}
                style={{ padding: "6px 14px", background: "none", border: "1px solid var(--admin-border)", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveAppealDecision(selectedAppealForReview._id, "Rejected")}
                disabled={resolvingAppeal}
                style={{ padding: "6px 14px", background: "#ef4444", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                Reject Appeal
              </button>
              <button
                onClick={() => handleResolveAppealDecision(selectedAppealForReview._id, "Approved")}
                disabled={resolvingAppeal}
                style={{ padding: "6px 14px", background: "#10b981", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                Approve & Reverse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
