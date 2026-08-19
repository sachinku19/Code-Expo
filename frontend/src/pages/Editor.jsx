import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import MonacoEditor, { DiffEditor } from "@monaco-editor/react";
import socket from "../socket/socket";

import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { getRoom, leaveRoom, deleteRoom, getRecentRooms, createRoom, removeUser, promoteUser, demoteUser, changeRole, kickUser, muteUser, sendWorkspaceInvites } from "../services/roomService";
import { getFollowers } from "../services/socialService";
import { runCode } from "../services/compilerService";
import { getMessage } from "../services/messageService";
import Whiteboard from "../components/Whiteboard";
import FileExplorer from "../components/FileExplorer";
import LivePreview from "../components/LivePreview";
import TaskPlanner from "../components/planner/TaskPlanner";
import ReportUserModal from "../components/social/ReportUserModal";
import SecurityDeleteRoomModal from "../components/modals/SecurityDeleteRoomModal";
import EditRoomModal from "../components/modals/EditRoomModal";
import AIAssistantPanel from "../components/ai/AIAssistantPanel";
import AIHistoryTab from "../components/ai/AIHistoryTab";
import * as workspaceService from "../services/workspaceService";
import * as collabService from "../services/collaborationService";
import pathAutocompleteService from "../services/pathAutocompleteService";
import MainLayout from "../layouts/MainLayout";
import GoogleMeetLobbyModal from "../components/meet/GoogleMeetLobbyModal";
import GoogleMeetStage from "../components/meet/GoogleMeetStage";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { logoutUser } from "../services/authService";
import toast from "react-hot-toast";
import {
  ShieldAlert,
  FolderOpen,
  Folder,
  BookOpen,
  Activity,
  History,
  Settings,
  SkipBack,
  SkipForward,
  Pause,
  Users,
  MessageSquare,
  Send,
  Play,
  Square,
  LogOut,
  Loader2,
  DoorOpen,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
  Terminal,
  Code2,
  Hash,
  Palette,
  FileCode,
  Sparkles,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  Bell,
  Layers,
  Copy,
  Plus,
  Minus,
  Check,
  X,
  Laptop,
  Download,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Eye,
  Edit2,
  FileText,
  UserPlus,
  UserMinus,
  Search,
  User,
  Sun,
  Moon,
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  MoreVertical,
  Maximize2,
  Minimize2,
  FolderKanban,
  FileClock,
  Lock,
  Scroll,
  ZoomIn,
  ZoomOut,
  ImageOff,
  Image as ImageIcon
} from "lucide-react";
import "./Editor.css";
import GateOverlay from "../components/GateOverlay";

const notificationAudio = new Audio("/code-Expo_notification_sound.mp3");
notificationAudio.load();

const playNotificationSound = () => {
  const soundEnabled = localStorage.getItem("notif_soundEnabled") !== "false";
  if (!soundEnabled) return;
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(err => console.log("Audio play blocked by browser policy:", err));
};

const MOCK_FILES = [
  { name: "index.js", size: "1.2 KB", type: "js" },
  { name: "styles.css", size: "3.4 KB", type: "css" },
  { name: "utils.js", size: "820 B", type: "js" },
  { name: "package.json", size: "450 B", type: "json" }
];

const optimizeSDP = (sdp) => {
  let lines = sdp.split("\r\n");
  lines = lines.map((line) => {
    if (line.includes("a=fmtp:") && line.includes("opus")) {
      if (!line.includes("maxaveragebitrate=")) {
        return line + ";maxaveragebitrate=48000;useinbandfec=1;stereo=1";
      }
    }
    return line;
  });
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    newLines.push(lines[i]);
    if (lines[i].startsWith("m=video")) {
      if (i + 1 < lines.length && !lines[i + 1].startsWith("b=AS:")) {
        newLines.push("b=AS:600");
      }
    }
  }
  return newLines.join("\r\n");
};

function Editor() {
  const navigate = useNavigate();
  const { user: authUser, setUser } = useAuth();
  const storedUser = authUser || JSON.parse(localStorage.getItem("user")) || { username: "Guest", _id: "guest" };
  const user = useMemo(() => ({
    ...storedUser,
    id: storedUser.id || storedUser._id || "guest"
  }), [storedUser?.id, storedUser?._id, storedUser?.username, storedUser?.avatar]);

  const { roomId } = useParams();

  // Mobile Screen & Tab State
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  const [mobileTab, setMobileTab] = useState("editor");

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);

  // Report user states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedTargetUser, setReportedTargetUser] = useState(null);
  const [reportEvidenceType, setReportEvidenceType] = useState("");
  const [reportEvidenceId, setReportEvidenceId] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  // Dropdown menu states
  const [activeWorkspaceMemberMenuId, setActiveWorkspaceMemberMenuId] = useState(null);
  const [activeWorkspaceMessageMenuId, setActiveWorkspaceMessageMenuId] = useState(null);

  const addToast = (message, type = "success") => {
    const notification = document.createElement("div");
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.backgroundColor = type === "success" ? "#10b981" : "#ef4444";
    notification.style.color = "#fff";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "8px";
    notification.style.zIndex = "999999";
    notification.style.fontSize = "0.85rem";
    notification.style.fontWeight = "600";
    notification.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const location = useLocation();
  const isPageRefresh = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const navs = window.performance?.getEntriesByType?.("navigation");
      if (navs && navs.length > 0) {
        return navs[0].type === "reload";
      }
      return window.performance?.navigation?.type === 1;
    } catch (e) {
      return false;
    }
  }, []);
  const fromTransition = location.state?.fromTransition && !isPageRefresh;
  const [showGateOpenAnimation, setShowGateOpenAnimation] = useState(!fromTransition);

  useEffect(() => {
    if (!fromTransition) {
      const timer = setTimeout(() => {
        setShowGateOpenAnimation(false);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [fromTransition]);



  // Core MERN Room State
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [notification, setNotification] = useState("");
  const [roomNotifications, setRoomNotifications] = useState([]);

  // Google Meet Call States
  const [showMeetLobby, setShowMeetLobby] = useState(false);
  const [inMeet, setInMeet] = useState(false);
  const [meetMicOn, setMeetMicOn] = useState(true);
  const [meetVideoOn, setMeetVideoOn] = useState(true);
  const [activeMeetUsers, setActiveMeetUsers] = useState([]);

  const handleOpenMeetLobby = () => {
    setShowMeetLobby(true);
  };

  const handleStartMeeting = ({ isMicOn, isVideoOn }) => {
    setMeetMicOn(isMicOn);
    setMeetVideoOn(isVideoOn);
    setShowMeetLobby(false);

    // Brief delay to let the browser cleanly release camera hardware from lobby preview
    setTimeout(() => {
      setInMeet(true);
      socket.emit("meet:join", {
        roomId,
        userId: user.id || user._id,
        username: user.username,
        avatar: user.avatar,
        isMicOn,
        isVideoOn
      });
      triggerNotification("Joined Google Meet Workspace Session");
    }, 350);
  };

  const handleLeaveMeeting = () => {
    setInMeet(false);
    setShowMeetLobby(false);
    socket.emit("meet:leave", {
      roomId,
      userId: user.id || user._id
    });
    triggerNotification("Left Google Meet Workspace Session");
    if (isMobileScreen) {
      setMobileTab("editor");
      changeLayoutMode("editor");
    }
  };

  // Socket listener for Google Meet users update
  useEffect(() => {
    if (!socket) return;
    const handleMeetUpdateUsers = (meetUsersList) => {
      setActiveMeetUsers(meetUsersList || []);
    };

    socket.on("meet:update-users", handleMeetUpdateUsers);

    return () => {
      socket.off("meet:update-users", handleMeetUpdateUsers);
    };
  }, [socket]);

  // Clean up meeting status on unmount or meeting leave
  useEffect(() => {
    return () => {
      if (inMeet && roomId && socket && userRef.current) {
        socket.emit("meet:leave", {
          roomId,
          userId: userRef.current.id || userRef.current._id
        });
      }
    };
  }, [inMeet, roomId, socket]);

  // Invite Followers Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [selectedFollowers, setSelectedFollowers] = useState(new Set());
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");

  const handleOpenInviteModal = async () => {
    setIsInviteModalOpen(true);
    setLoadingFollowers(true);
    setSelectedFollowers(new Set());
    setInviteSearchQuery("");
    try {
      const res = await getFollowers(user.id || user._id);
      if (res.success) {
        setFollowers(res.followers || []);
      }
    } catch (err) {
      console.error("Failed to fetch followers:", err);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const toggleSelectFollower = (followerId) => {
    setSelectedFollowers(prev => {
      const updated = new Set(prev);
      if (updated.has(followerId)) {
        updated.delete(followerId);
      } else {
        updated.add(followerId);
      }
      return updated;
    });
  };

  const handleSendInvites = async () => {
    if (selectedFollowers.size === 0) return;
    setSendingInvites(true);
    try {
      const res = await sendWorkspaceInvites(roomId, Array.from(selectedFollowers));
      if (res.success) {
        setIsInviteModalOpen(false);
        triggerNotification("Invitations sent successfully!");
      }
    } catch (err) {
      console.error("Failed to send invitations:", err);
      triggerNotification("Failed to send invites.");
    } finally {
      setSendingInvites(false);
    }
  };

  // Multi-file Workspace States
  const [tabs, setTabs] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [editorLanguage, setEditorLanguage] = useState("javascript");
  const [explorerPath, setExplorerPath] = useState([]);
  const [workspaceItems, setWorkspaceItems] = useState([]);
  const hasAutoSelectedRef = useRef(false);
  const isTabRestoredRef = useRef(false);

  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  // Synchronize path autocomplete cache index dynamically
  useEffect(() => {
    pathAutocompleteService.updateItems(workspaceItems, activeFileId);
  }, [workspaceItems, activeFileId]);

  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);
  const isApplyingYjsUpdateRef = useRef(false);

  const loadCollaborationState = async (targetRoomId, targetFileId) => {
    if (!targetRoomId) return;
    try {
      const [ownershipRes, versionsRes, activitiesRes] = await Promise.all([
        collabService.fetchLineOwnership(targetRoomId, targetFileId).catch(err => {
          console.error("Error fetching ownership:", err);
          return { ownership: [] };
        }),
        collabService.fetchVersionHistory(targetRoomId, targetFileId).catch(err => {
          console.error("Error fetching versions:", err);
          return { versions: [] };
        }),
        collabService.fetchEditActivities(targetRoomId, targetFileId).catch(err => {
          console.error("Error fetching activities:", err);
          return { activities: [] };
        })
      ]);

      setLineOwnership(ownershipRes.ownership || []);
      setVersions(versionsRes.versions || []);
      setCollabActivities(activitiesRes.activities || []);
    } catch (err) {
      console.error("Error loading collaboration state:", err);
    }
  };

  const getFileIconInfo = (name = "") => {
    const ext = name.split(".").pop().toLowerCase();
    let color = "#94a3b8"; // default slate gray
    let isImage = false;
    if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") color = "#f7df1e";
    else if (ext === "py" || ext === "pyw") color = "#38bdf8";
    else if (ext === "cpp" || ext === "h" || ext === "hpp" || ext === "c" || ext === "cc") color = "#00599c";
    else if (ext === "java") color = "#ea2d2e";
    else if (ext === "html" || ext === "htm") color = "#e34c26";
    else if (ext === "css") color = "#38bdf8";
    else if (ext === "json") color = "#fbbf24";
    else if (["png", "jpg", "jpeg", "webp", "gif", "svg", "ico"].includes(ext)) {
      color = "#22c55e";
      isImage = true;
    }
    return { color, isImage };
  };

  const handlePathChange = (path) => {
    setExplorerPath(path);
  };

  const handleFileSelect = async (fileId, fileInfo = null) => {
    if (!fileId) return;
    const strFileId = String(fileId);
    isTabRestoredRef.current = true;
    if (layoutMode !== "editor" && layoutMode !== "split") {
      changeLayoutMode("editor");
    }
    setLeftActiveTab("files");
    try {
      if (isMobileScreen) {
        setMobileTab("editor");
        setLeftSidebarCollapsed(true);
      }

      // 1. Save current code in tabs before switching away
      if (activeFileIdRef.current) {
        const curActiveId = String(activeFileIdRef.current);
        setTabs((prev) =>
          prev.map((t) =>
            String(t._id) === curActiveId ? { ...t, content: code } : t
          )
        );
      }

      // 2. Check if already open in tabs
      const existingTab = tabs.find((t) => String(t._id) === strFileId);
      if (existingTab) {
        setActiveFileId(existingTab._id);
        setCode(existingTab.content || "");
        setEditorLanguage(existingTab.language || "javascript");

        requestAnimationFrame(() => {
          if (editorRef.current) editorRef.current.layout();
        });

        // Load stats asynchronously
        loadCollaborationState(roomId, existingTab._id);
        return;
      }

      // 3. Not in tabs, but we have fileInfo
      if (fileInfo) {
        // Add optimistic tab safely
        setTabs((prev) => {
          const exists = prev.some((t) => String(t._id) === strFileId);
          if (exists) return prev;
          return [...prev, { ...fileInfo, content: fileInfo.content || "" }];
        });
        setActiveFileId(fileId);
        setEditorLanguage(fileInfo.language || "javascript");
        setCode(fileInfo.content || "");
      }

      // 4. Fetch content from the server
      const data = await workspaceService.getFileContent(fileId);
      const file = data.file;

      setTabs((prev) => {
        const exists = prev.some((t) => String(t._id) === String(file._id));
        if (exists) {
          return prev.map((t) => (String(t._id) === String(file._id) ? { ...t, ...file, content: file.content || "" } : t));
        }
        return [...prev, file];
      });

      // Update editor state if the user is still on this file
      if (String(activeFileIdRef.current) === String(file._id)) {
        setCode(file.content || "");
      }
      setEditorLanguage(file.language || "javascript");

      // Load collaboration history, versions, and blame info for the file
      loadCollaborationState(roomId, file._id);
    } catch (err) {
      console.error("Error opening file:", err);
    }
  };

  const handleCloseTab = (e, fileId) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    const strFileId = String(fileId);
    const nextTabs = tabs.filter((t) => String(t._id) !== strFileId);
    setTabs(nextTabs);

    if (String(activeFileId) === strFileId) {
      if (nextTabs.length > 0) {
        const lastTab = nextTabs[nextTabs.length - 1];
        handleFileSelect(lastTab._id, lastTab);
      } else {
        setActiveFileId(null);
        setCode("");
        setEditorLanguage("javascript");
      }
    }
  };

  const handleFileDelete = (deletedTarget) => {
    if (!deletedTarget) return;
    const deletedIds = Array.isArray(deletedTarget)
      ? new Set(deletedTarget.map(String))
      : deletedTarget instanceof Set
      ? deletedTarget
      : new Set([String(deletedTarget)]);

    setTabs((prev) => {
      const nextTabs = prev.filter((t) => !deletedIds.has(String(t._id)));

      if (activeFileId && deletedIds.has(String(activeFileId))) {
        if (nextTabs.length > 0) {
          const nextTab = nextTabs[nextTabs.length - 1];
          setTimeout(() => {
            handleFileSelect(nextTab._id, nextTab);
          }, 0);
        } else {
          setActiveFileId(null);
          setCode("");
          setEditorLanguage("javascript");
        }
      }
      return nextTabs;
    });

    setWorkspaceItems((prev) => prev.filter((i) => !deletedIds.has(String(i._id))));
  };

  // Fast Quick File/Folder Creation State & Handlers
  const [quickCreateModal, setQuickCreateModal] = useState(null); // { type: 'file' | 'folder' } | null
  const [quickCreateName, setQuickCreateName] = useState("");
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const quickCreateInputRef = useRef(null);

  const activeFileObj = useMemo(() => {
    if (!activeFileId) return null;
    return tabs.find((t) => String(t._id) === String(activeFileId)) || workspaceItems.find((t) => String(t._id) === String(activeFileId)) || null;
  }, [activeFileId, tabs, workspaceItems]);

  const isImageFile = useMemo(() => {
    if (!activeFileObj) return false;
    if (activeFileObj.fileType === "asset" || activeFileObj.language === "image") return true;
    const ext = (activeFileObj.name || "").split(".").pop().toLowerCase();
    return ["png", "jpg", "jpeg"].includes(ext);
  }, [activeFileObj]);

  const handleCreateFileFromWelcome = () => {
    setQuickCreateModal({ type: "file" });
    setQuickCreateName("");
    setTimeout(() => quickCreateInputRef.current?.focus(), 40);
  };

  const handleCreateFolderFromWelcome = () => {
    setQuickCreateModal({ type: "folder" });
    setQuickCreateName("");
    setTimeout(() => quickCreateInputRef.current?.focus(), 40);
  };

  const handleQuickCreateSubmit = async (e) => {
    if (e) e.preventDefault();
    const name = quickCreateName.trim();
    if (!name) {
      toast.error(`Please enter a valid ${quickCreateModal?.type || "item"} name`);
      return;
    }

    const type = quickCreateModal?.type || "file";

    try {
      setIsQuickCreating(true);

      const getLanguageByExtension = (filename) => {
        const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
        if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") return "javascript";
        if (ext === "py" || ext === "pyw") return "python";
        if (ext === "cpp" || ext === "cc" || ext === "cxx" || ext === "c" || ext === "h" || ext === "hpp") return "cpp";
        if (ext === "java") return "java";
        if (ext === "html" || ext === "htm") return "html";
        if (ext === "css") return "css";
        if (ext === "json") return "json";
        return room?.language || "javascript";
      };

      const lang = type === "file" ? getLanguageByExtension(name) : undefined;
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        name,
        type,
        null, // root
        lang
      );

      const createdItem = data.item;

      socket.emit(type === "file" ? "file-created" : "folder-created", {
        roomId,
        item: createdItem
      });

      toast.success(`${type === "file" ? "File" : "Folder"} "${name}" created!`);
      setQuickCreateModal(null);
      setQuickCreateName("");

      // Open left drawer to show new file in explorer
      setLeftSidebarCollapsed(false);
      setLeftActiveTab("files");

      if (type === "file") {
        await handleFileSelect(createdItem._id, createdItem);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${type}`);
    } finally {
      setIsQuickCreating(false);
    }
  };

  const triggerNotification = (message) => {
    if (!message) return;
    const msgStr = String(message);
    setNotification(msgStr);
    const newNotif = {
      id: Date.now() + Math.random(),
      message: msgStr,
      time: new Date()
    };
    setRoomNotifications((prev) => [newNotif, ...prev].slice(0, 20));

    // Auto-clear active toast notification after a timeout
    const timeout = msgStr.includes("auto-saved") ? 2500 : 3500;
    setTimeout(() => {
      setNotification((prev) => prev === msgStr ? "" : prev);
    }, timeout);
  };

  // Room Chat States
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatTab, setChatTab] = useState("room"); // 'room' | 'private'
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateMessages, setPrivateMessages] = useState([]);

  const privateRecipientRef = useRef(privateRecipient);
  useEffect(() => {
    privateRecipientRef.current = privateRecipient;
  }, [privateRecipient]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [roomTabUnread, setRoomTabUnread] = useState(false);
  const [privateTabUnread, setPrivateTabUnread] = useState(false);

  const chatMessagesContainerRef = useRef(null);
  const chatTabRef = useRef("room");
  const prevMessagesCountRef = useRef(0);
  const prevPrivateMessagesCountRef = useRef(0);

  // Keep chatTabRef in sync
  useEffect(() => {
    chatTabRef.current = chatTab;
  }, [chatTab]);

  const scrollToBottom = (behavior = "smooth") => {
    const container = chatMessagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
      setUnreadMessagesCount(0);
    }
  };

  const handleChatScroll = () => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 120;
    if (isAtBottom) {
      setUnreadMessagesCount(0);
    }
  };

  // Scroll to bottom and clear state on tab switch
  useEffect(() => {
    setTimeout(() => scrollToBottom("auto"), 50);
    setUnreadMessagesCount(0);
    if (chatTab === "room") {
      setRoomTabUnread(false);
    } else {
      setPrivateTabUnread(false);
    }
  }, [chatTab]);

  // Handle incoming public room messages scrolling/unread logic
  useEffect(() => {
    const prevRoomCount = prevMessagesCountRef.current;
    prevMessagesCountRef.current = messages.length;

    if (messages.length > prevRoomCount) {
      if (chatTabRef.current !== "room") {
        setRoomTabUnread(true);
      } else {
        const isInitialLoad = prevRoomCount === 0;
        const lastMsg = messages[messages.length - 1];
        const isMyMsg = lastMsg && (String(lastMsg.userId || lastMsg.sender?._id) === String(user.id || user._id) || lastMsg.username === user.username);
        const container = chatMessagesContainerRef.current;
        const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight <= 120) : true;
        if (isMyMsg || isAtBottom || isInitialLoad) {
          setTimeout(() => scrollToBottom(isInitialLoad ? "auto" : "smooth"), 50);
        } else {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      }
    }
  }, [messages]);

  // Handle incoming private messages scrolling/unread logic
  useEffect(() => {
    const prevPrivateCount = prevPrivateMessagesCountRef.current;
    prevPrivateMessagesCountRef.current = privateMessages.length;

    if (privateMessages.length > prevPrivateCount) {
      if (chatTabRef.current !== "private") {
        setPrivateTabUnread(true);
      } else {
        const isInitialLoad = prevPrivateCount === 0;
        const lastMsg = privateMessages[privateMessages.length - 1];
        const isMyMsg = lastMsg && (String(lastMsg.userId || lastMsg.sender?._id) === String(user.id || user._id) || lastMsg.username === user.username);
        const container = chatMessagesContainerRef.current;
        const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight <= 120) : true;
        if (isMyMsg || isAtBottom || isInitialLoad) {
          setTimeout(() => scrollToBottom(isInitialLoad ? "auto" : "smooth"), 50);
        } else {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      }
    }
  }, [privateMessages]);

  // Monaco Editor Ref & Collab Cursors
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [monacoInstance, setMonacoInstance] = useState(null);
  const decorationsRef = useRef([]);
  const hasJoinedRef = useRef(false);
  const [remoteCursors, setRemoteCursors] = useState({});

  // AI Copilot Suite States
  const [selectedCode, setSelectedCode] = useState("");
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);

  // AI Panel Draggable State
  const [aiPanelPos, setAiPanelPos] = useState({ x: 0, y: 0 });
  const [isAiDragging, setIsAiDragging] = useState(false);
  const aiDragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const handleAiHeaderMouseDown = (e) => {
    if (e.target.closest("button") || e.target.closest("input") || e.target.closest("select")) {
      return;
    }
    setIsAiDragging(true);
    aiDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: aiPanelPos.x,
      posY: aiPanelPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isAiDragging) return;
      const dx = e.clientX - aiDragStartRef.current.mouseX;
      const dy = e.clientY - aiDragStartRef.current.mouseY;
      setAiPanelPos({
        x: aiDragStartRef.current.posX + dx,
        y: aiDragStartRef.current.posY + dy
      });
    };

    const handleMouseUp = () => {
      if (isAiDragging) {
        setIsAiDragging(false);
      }
    };

    if (isAiDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isAiDragging]);

  const [previousCodeBeforeAI, setPreviousCodeBeforeAI] = useState(null);

  const handleReplaceSelection = (newCode) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    // Backup current code state before replacing
    setPreviousCodeBeforeAI(model.getValue());

    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      editor.executeEdits("expoai", [
        {
          range: selection,
          text: newCode,
          forceMoveMarkers: true
        }
      ]);
      triggerNotification("Selection replaced by ExpoAI solution!");
    } else {
      const fullRange = model.getFullModelRange();
      editor.executeEdits("expoai", [
        {
          range: fullRange,
          text: newCode,
          forceMoveMarkers: true
        }
      ]);
      triggerNotification("Workspace code updated by ExpoAI!");
    }

    // Immediately sync React state and persist to server database
    const updatedCode = model.getValue();
    handleEditorChange(updatedCode);
  };

  const handleInsertBelowSelection = (newCode) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    // Backup current code state before inserting
    setPreviousCodeBeforeAI(model.getValue());

    const selection = editor.getSelection();
    const position = editor.getPosition();
    const targetLine = selection ? selection.endLineNumber : (position ? position.lineNumber : 1);
    const lineContent = model.getLineContent(targetLine);
    editor.executeEdits("expoai", [
      {
        range: new monaco.Range(targetLine, lineContent.length + 1, targetLine, lineContent.length + 1),
        text: "\n" + newCode,
        forceMoveMarkers: true
      }
    ]);
    triggerNotification("Code inserted below selection!");

    // Immediately sync React state and persist to server database
    const updatedCode = model.getValue();
    handleEditorChange(updatedCode);
  };

  const handleUndoAIInsertion = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    // 1. Execute Monaco built-in undo command
    editor.trigger("expoai", "undo", null);

    // 2. If code wasn't completely reverted by Monaco undo, restore previousCodeBeforeAI snapshot
    if (previousCodeBeforeAI !== null) {
      setTimeout(() => {
        if (model.getValue() !== previousCodeBeforeAI) {
          const fullRange = model.getFullModelRange();
          editor.executeEdits("expoai-undo", [
            {
              range: fullRange,
              text: previousCodeBeforeAI,
              forceMoveMarkers: true
            }
          ]);
        }
        setPreviousCodeBeforeAI(null);
        handleEditorChange(model.getValue());
      }, 50);
    } else {
      handleEditorChange(model.getValue());
    }

    triggerNotification("AI code modification undone!");
  };

  // Collaboration Suite States
  const [lineOwnership, setLineOwnership] = useState([]);
  const [blameMode, setBlameMode] = useState(false);
  const [collabActivities, setCollabActivities] = useState([]);
  const [versions, setVersions] = useState([]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState(null);

  // Playback Mode States
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // 1.5s per step
  const playbackTimerRef = useRef(null);

  // Refs for Monaco callbacks to avoid closure traps
  const lineOwnershipRef = useRef([]);
  const blameModeRef = useRef(false);
  const versionsRef = useRef([]);

  useEffect(() => {
    lineOwnershipRef.current = lineOwnership;
  }, [lineOwnership]);

  useEffect(() => {
    blameModeRef.current = blameMode;
  }, [blameMode]);

  useEffect(() => {
    versionsRef.current = versions;
  }, [versions]);

  // Layout Resizing & Sidebars Toggle States
  const containerRef = useRef(null);
  const editorBodyRef = useRef(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [splitPercent, setSplitPercent] = useState(60); // Default to 60/40 split
  const [layoutMode, setLayoutMode] = useState("editor"); // Default hidden

  const changeLayoutMode = (mode) => {
    setLayoutMode(mode);
    if (mode === "editor") {
      setShowWhiteboard(false);
    } else {
      setShowWhiteboard(true);
    }
    if (mode === "editor" || mode === "split") {
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.layout();
      });
      setTimeout(() => {
        if (editorRef.current) editorRef.current.layout();
      }, 50);
    }
  };

  const toggleWhiteboard = () => {
    if (layoutMode === "editor") {
      changeLayoutMode("split");
      setSplitPercent(60);
    } else {
      changeLayoutMode("editor");
    }
  };
  const [consoleHeight, setConsoleHeight] = useState(220); // console panel height in pixels
  const [isConsoleOpen, setIsConsoleOpen] = useState(false); // closed by default
  const [consoleTab, setConsoleTab] = useState("output"); // 'input' | 'output' | 'console'
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalInputVal, setTerminalInputVal] = useState("");
  const [programInput, setProgramInput] = useState("");
  const [isTerminalExecuting, setIsTerminalExecuting] = useState(false);
  const [runCooldownSeconds, setRunCooldownSeconds] = useState(0);

  useEffect(() => {
    if (runCooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setRunCooldownSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [runCooldownSeconds]);
  const terminalEndRef = useRef(null);

  // WebRTC Call States
  const [inCall, setInCall] = useState(false);
  const [activeCallUsers, setActiveCallUsers] = useState([]);
  const [isCallPanelMinimized, setIsCallPanelMinimized] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' | 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: { stream, username } }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [callStats, setCallStats] = useState({});
  const [callLayoutMode, setCallLayoutMode] = useState("floating"); // 'floating' | 'docked' | 'fullscreen'
  const [activeVideoFilter, setActiveVideoFilter] = useState("none"); // 'none' | 'neon' | 'grayscale' | 'sepia' | 'matrix' | 'invert'
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const peerConnectionsRef = useRef({});
  const localStreamRef = useRef(null);
  const usersRef = useRef([]);
  const inCallRef = useRef(inCall);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const [incomingCall, setIncomingCall] = useState(null); // { username, mediaType, socketId }

  // --- WebRTC Calling Drag and State Management ---
  const [callPanelPos, setCallPanelPos] = useState({ x: window.innerWidth - 380, y: 80 });
  const [isDraggingCallPanel, setIsDraggingCallPanel] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    if (callLayoutMode !== "floating") return;
    setIsDraggingCallPanel(true);
    dragStartRef.current = {
      x: e.clientX - callPanelPos.x,
      y: e.clientY - callPanelPos.y
    };
  };

  const handleDragMove = (e) => {
    if (!isDraggingCallPanel) return;
    setCallPanelPos({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleDragEnd = () => {
    setIsDraggingCallPanel(false);
  };

  useEffect(() => {
    if (isDraggingCallPanel) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDraggingCallPanel]);

  const startLocalStream = async (type) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: type === "video" ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 15 }
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      triggerNotification("Could not access camera/microphone");
      throw err;
    }
  };

  const createPeerConnection = (targetSocketId, targetUsername, currentLocalStream) => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionsRef.current[targetSocketId] = pc;

    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams((prev) => ({
          ...prev,
          [targetSocketId]: {
            stream,
            username: targetUsername || "Participant",
            isMuted: false,
            isCameraOff: false
          }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        handleUserLeftCall({ socketId: targetSocketId });
      }
    };

    pc.oniceconnectionstatechange = async () => {
      if (pc.iceConnectionState === "failed") {
        console.warn(`ICE connection failed with peer ${targetSocketId}. Triggering ICE restart...`);
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          const optimizedOffer = new RTCSessionDescription({
            type: offer.type,
            sdp: optimizeSDP(offer.sdp)
          });
          await pc.setLocalDescription(optimizedOffer);
          socket.emit("webrtc-offer", {
            targetSocketId,
            offer: optimizedOffer
          });
        } catch (err) {
          console.error("ICE Restart negotiation failed:", err);
        }
      }
    };

    return pc;
  };

  const handleJoinCall = async (type) => {
    try {
      const myParticipant = room?.participants?.find(
        (p) => p.user && String(p.user._id || p.user) === String(user.id || user._id)
      );
      const myRole = myParticipant ? myParticipant.role : "MEMBER";
      const isMutedInRoom = myParticipant ? myParticipant.isMuted : false;

      if (myRole === "VIEWER" && isMutedInRoom) {
        triggerNotification("Muted viewers are not allowed to join audio/video calls.");
        return;
      }

      const stream = await startLocalStream(type);
      setInCall(true);
      setCallType(type);
      setIsCallPanelMinimized(false);
      setIsMuted(false);
      setIsCameraOff(false);

      socket.emit("join-call", {
        roomId,
        username: user.username,
        mediaType: type
      });

      triggerNotification(`Joined ${type} call`);
    } catch (err) {
      console.error("Failed to join call:", err);
    }
  };

  const handleUserLeftCall = ({ socketId, username }) => {
    const pc = peerConnectionsRef.current[socketId];
    if (pc) {
      try {
        pc.close();
      } catch (err) {
        console.error("Error closing peer connection:", err);
      }
      delete peerConnectionsRef.current[socketId];
    }

    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });

    setIncomingCall((prev) => {
      if (prev && prev.socketId === socketId) {
        return null;
      }
      return prev;
    });

    if (username) {
      triggerNotification(`${username} left the call`);
    }

    // If room is private and owner left, end call for everyone
    const currentRoom = roomRef.current;
    if (currentRoom && currentRoom.isPrivate) {
      const leftUserObj = usersRef.current.find((u) => u.socketId === socketId);
      const isLeftUserOwner = leftUserObj && leftUserObj.isOwner;
      if (isLeftUserOwner) {
        triggerNotification("Owner left the call. Call ended.");
        handleLeaveCall();
      }
    }
  };

  const handleLeaveCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);

    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      const pc = peerConnectionsRef.current[socketId];
      if (pc) {
        try {
          pc.close();
        } catch (err) {
          console.error("Error closing peer connection:", err);
        }
      }
    });
    peerConnectionsRef.current = {};
    setRemoteStreams({});

    setInCall(false);
    setCallType(null);
    setIsCallPanelMinimized(false);
    setIsMuted(false);
    setIsCameraOff(false);

    socket.emit("leave-call", { roomId });
    triggerNotification("You left the call");
  };

  const handleLeaveCallManual = async () => {
    const confirm = await window.showConfirm(
      "Are you sure you want to end or leave this call?",
      "Leave Call",
      "warning"
    );
    if (confirm) {
      handleLeaveCall();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        socket.emit("toggle-media", {
          roomId,
          isMuted: !audioTrack.enabled,
          isCameraOff,
          activeFilter: activeVideoFilter
        });
      }
    }
  };

  const toggleCamera = async () => {
    if (!localStreamRef.current) return;
    const currentTrack = localStreamRef.current.getVideoTracks()[0];
    const turningOff = isCameraOff ? false : (currentTrack && currentTrack.enabled);

    if (turningOff) {
      // Stop hardware camera sensor so laptop camera light turns OFF completely
      if (currentTrack) {
        currentTrack.stop();
        localStreamRef.current.removeTrack(currentTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      setIsCameraOff(true);
    } else {
      // Re-enable camera hardware: request fresh stream track
      try {
        const freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const freshTrack = freshStream.getVideoTracks()[0];
        if (freshTrack) {
          localStreamRef.current.addTrack(freshTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          Object.values(peerConnectionsRef.current).forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
            if (sender) sender.replaceTrack(freshTrack);
            else pc.addTrack(freshTrack, localStreamRef.current);
          });
        }
        setIsCameraOff(false);
      } catch (e) {
        console.warn("Could not restart hardware camera:", e);
      }
    }

    if (socket) {
      socket.emit("toggle-media", {
        roomId,
        isMuted,
        isCameraOff: turningOff,
        activeFilter: activeVideoFilter
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      const screenVideoTrack = stream.getVideoTracks()[0];

      screenVideoTrack.onended = () => {
        stopScreenShare();
      };

      Object.keys(peerConnectionsRef.current).forEach((socketId) => {
        const pc = peerConnectionsRef.current[socketId];
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(screenVideoTrack);
        }
      });

      const audioTrack = localStreamRef.current ? localStreamRef.current.getAudioTracks()[0] : null;
      const tracks = [screenVideoTrack];
      if (audioTrack) tracks.push(audioTrack);

      const combinedStream = new MediaStream(tracks);
      setLocalStream(combinedStream);

      triggerNotification("Screen sharing started");
    } catch (err) {
      console.error("Failed to start screen share:", err);
      triggerNotification("Failed to share screen");
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    if (localStreamRef.current) {
      const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];

      Object.keys(peerConnectionsRef.current).forEach((socketId) => {
        const pc = peerConnectionsRef.current[socketId];
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(cameraVideoTrack || null);
        }
      });

      setLocalStream(localStreamRef.current);
    }
    triggerNotification("Screen sharing stopped");
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const changeVideoFilter = (filterName) => {
    setActiveVideoFilter(filterName);
    setFilterMenuOpen(false);
    socket.emit("toggle-media", {
      roomId,
      isMuted,
      isCameraOff,
      activeFilter: filterName
    });
  };

  // Poll WebRTC stats for Call diagnostics
  useEffect(() => {
    if (!inCall) {
      setCallStats({});
      return;
    }
    const interval = setInterval(async () => {
      const statsObj = {};
      const peers = Object.entries(peerConnectionsRef.current);

      for (const [socketId, pc] of peers) {
        try {
          const stats = await pc.getStats();
          let rtt = 0;
          let packetLoss = 0;
          let resolution = "N/A";
          let fps = 0;

          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
            }
            if (report.type === "inbound-rtp" && report.kind === "video") {
              const packetsLost = report.packetsLost || 0;
              const packetsReceived = report.packetsReceived || 0;
              const total = packetsLost + packetsReceived;
              packetLoss = total > 0 ? Math.round((packetsLost / total) * 100) : 0;
              resolution = `${report.frameWidth || 0}x${report.frameHeight || 0}`;
              fps = Math.round(report.framesPerSecond || 0);
            }
          });

          statsObj[socketId] = { rtt, packetLoss, resolution, fps };
        } catch (e) {
          console.warn("Failed to get stats for peer:", socketId, e);
        }
      }
      setCallStats(statsObj);
    }, 2000);

    return () => clearInterval(interval);
  }, [inCall]);

  // Ensure media resources are cleaned up on component unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.keys(peerConnectionsRef.current).forEach((socketId) => {
        const pc = peerConnectionsRef.current[socketId];
        if (pc) {
          try {
            pc.close();
          } catch (e) { }
        }
      });
    };
  }, []);

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(() => localStorage.getItem("ce_editor_leftSidebarCollapsed") === "true");
  useEffect(() => {
    localStorage.setItem("ce_editor_leftSidebarCollapsed", leftSidebarCollapsed);
  }, [leftSidebarCollapsed]);
  const [leftActiveTab, setLeftActiveTab] = useState(() => localStorage.getItem("ce_editor_leftActiveTab") || "files");
  useEffect(() => {
    localStorage.setItem("ce_editor_leftActiveTab", leftActiveTab);
  }, [leftActiveTab]);

  const [roomHistory, setRoomHistory] = useState([]);
  const [roomHistoryLoading, setRoomHistoryLoading] = useState(false);

  const fetchRoomHistory = async () => {
    setRoomHistoryLoading(true);
    try {
      const res = await workspaceService.getRoomHistory(roomId);
      if (res.success) {
        setRoomHistory(res.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch room history:", err);
    } finally {
      setRoomHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (leftActiveTab === "history" && !leftSidebarCollapsed) {
      fetchRoomHistory();
    }
  }, [leftActiveTab, leftSidebarCollapsed]);

  const [sidebarWidth, setSidebarWidth] = useState(320); // Left sidebar width in pixels
  const [isResizing, setIsResizing] = useState(false); // Global resizing lock state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth <= 768) return true;
      const saved = localStorage.getItem("ce_editor_rightSidebarCollapsed");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const toggleRightSidebar = (forceState) => {
    setRightSidebarCollapsed((prev) => {
      const nextState = typeof forceState === "boolean" ? forceState : !prev;
      try {
        localStorage.setItem("ce_editor_rightSidebarCollapsed", String(nextState));
      } catch (e) { }

      // 60 FPS Continuous Monaco Layout Animation Loop during 280ms transition
      const startTime = performance.now();
      const duration = 280;

      const step = (now) => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
        if (now - startTime < duration) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);

      return nextState;
    });
  };

  // Collapsible Mock Notes Drawer State
  const [notesText, setNotesText] = useState(
    "## Meeting Notes & Tasks\n\n- Setup compiler endpoints\n- Draw schema database models on whiteboard\n- Refactor CSS tokens\n"
  );
  const [notesMode, setNotesMode] = useState("edit"); // 'edit' | 'preview'
  const [notesExportMenuOpen, setNotesExportMenuOpen] = useState(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const notesTextareaRef = useRef(null);
  const [editorTabSize, setEditorTabSize] = useState(
    Number(localStorage.getItem("editor_tabSize")) || 2
  );
  const [editorShowMinimap, setEditorShowMinimap] = useState(
    localStorage.getItem("editor_minimap") === "true"
  );
  const [editorWordWrap, setEditorWordWrap] = useState(
    localStorage.getItem("editor_wordWrap") || "on"
  );
  const [editorLineNumbers, setEditorLineNumbers] = useState(
    localStorage.getItem("editor_lineNumbers") || "on"
  );
  const [editorSuggestions, setEditorSuggestions] = useState(
    localStorage.getItem("editor_suggestions") || "standard"
  );
  const [editorAutoSave, setEditorAutoSave] = useState(
    localStorage.getItem("editor_autoSave") || "off"
  );
  const [editorFontFamily, setEditorFontFamily] = useState(
    localStorage.getItem("editor_fontFamily") || "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Source Code Pro', Consolas, monospace"
  );
  const [editorCursorBlinking, setEditorCursorBlinking] = useState(
    localStorage.getItem("editor_cursorBlinking") || "blink"
  );
  const [editorCursorStyle, setEditorCursorStyle] = useState(
    localStorage.getItem("editor_cursorStyle") || "line"
  );
  const [editorBracketColorization, setEditorBracketColorization] = useState(
    localStorage.getItem("editor_bracketColorization") !== "false"
  );
  const [participantsDropdownOpen, setParticipantsDropdownOpen] = useState(false);
  const [roomParticipantSearchOpen, setRoomParticipantSearchOpen] = useState(false);
  const [roomParticipantSearchQuery, setRoomParticipantSearchQuery] = useState("");
  const [roomParticipantsExpanded, setRoomParticipantsExpanded] = useState(false);
  const [mobileOnlineDropdownOpen, setMobileOnlineDropdownOpen] = useState(false);
  const [mobileConnectedSearchQuery, setMobileConnectedSearchQuery] = useState("");
  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [whiteboardActivities, setWhiteboardActivities] = useState([]);
  const [roomDeletedModalOpen, setRoomDeletedModalOpen] = useState(false);
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false);
  const [securityDeleteRoomTarget, setSecurityDeleteRoomTarget] = useState(null);
  const [isDeletingRoomTarget, setIsDeletingRoomTarget] = useState(false);
  const [duplicateSessionModalOpen, setDuplicateSessionModalOpen] = useState(false);
  const [kickMessage, setKickMessage] = useState("");
  const [kickModalOpen, setKickModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState({ userId: "", username: "" });
  const [isKickedFromRoom, setIsKickedFromRoom] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);

      // Auto-exit fullscreen when leaving the editor component
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (isCurrentlyFullscreen) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch((err) => console.log("Exit fullscreen error:", err));
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch((err) => console.log("Exit fullscreen error:", err));
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen().catch((err) => console.log("Exit fullscreen error:", err));
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen().catch((err) => console.log("Exit fullscreen error:", err));
        }
      }
    };
  }, []);

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => console.log(err));
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen().catch((err) => console.log(err));
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen().catch((err) => console.log(err));
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen().catch((err) => console.log(err));
    }
  };

  const toggleFullscreen = () => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      enterFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.log(err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch((err) => console.log(err));
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen().catch((err) => console.log(err));
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen().catch((err) => console.log(err));
      }
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleRoomUpdated = (data) => {
      if (data && String(data.roomId) === String(roomId)) {
        setRoom((prev) => (prev ? { ...prev, title: data.title, isPrivate: data.isPrivate, description: data.description } : prev));

        if (data.titleChanged) {
          showToastNotification(`✏️ Room renamed to "${data.title}"`);
        }
        if (data.privacyChanged) {
          showToastNotification(
            data.isPrivate ? "🔒 Room privacy changed to Private" : "🌍 Room is now Public"
          );
        }
        if (data.descriptionChanged) {
          showToastNotification(
            data.description ? "📝 Room description updated" : "📝 Room description removed"
          );
        }
      }
    };
    socket.on("room:updated", handleRoomUpdated);
    return () => {
      socket.off("room:updated", handleRoomUpdated);
    };
  }, [socket, roomId]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
    };
  }, []);

  useEffect(() => {
    if (editorAutoSave === "off" || !code) return;
    const delay = Number(editorAutoSave) * 1000;
    if (isNaN(delay) || delay <= 0) return;

    const timer = setTimeout(() => {
      if (activeFileIdRef.current) {
        socket.emit("save-file-content", {
          roomId,
          fileId: activeFileIdRef.current,
          content: code,
          userId: user.id,
          username: user.username
        });
        triggerNotification("Workspace auto-saved!");
      } else {
        socket.emit("save-code", { roomId, code });
        triggerNotification("Workspace auto-saved!");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [code, editorAutoSave, roomId, user.id, user.username]);

  const handleContextMenu = (e, participant) => {
    e.preventDefault();
    e.stopPropagation();
    const myParticipant = room?.participants?.find(
      (p) => p.user && String(p.user._id || p.user) === String(user.id || user._id)
    );
    const myRole = myParticipant ? myParticipant.role : "MEMBER";

    // Only OWNER can modify MODERATORS. MODERATORS can only modify MEMBERS and VIEWERS.
    const isTargetPrivileged = participant.role === "OWNER" || participant.role === "MODERATOR";
    const canIControlTarget = myRole === "OWNER" || (myRole === "MODERATOR" && !isTargetPrivileged);

    if (canIControlTarget && String(participant.user?._id || participant.user) !== String(user.id || user._id)) {
      const menuWidth = 200;
      const menuHeight = 240; // Approximate menu height with padding

      let x = e.clientX;
      let y = e.clientY;

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      setContextMenu({
        x: Math.max(10, x),
        y: Math.max(10, y),
        participant
      });
    }
  };

  const handleUserRowClick = (e, participant) => {
    const isSelf = String(participant.user?._id || participant.user) === String(user.id || user._id);

    if (!isSelf) {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 200;
      const menuHeight = 240; // Approximate menu height with padding

      // Align menu's right edge with clicked element's right edge
      let x = rect.right - menuWidth;
      let y = rect.bottom + 4;

      if (x < 10) {
        x = 10;
      }
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }

      // Flip menu upwards if it overflows viewport bottom
      if (y + menuHeight > window.innerHeight) {
        y = rect.top - menuHeight - 4;
      }
      if (y < 10) {
        y = 10;
      }

      setContextMenu({
        x,
        y,
        participant
      });
    }
  };

  const handleActionPromote = async (targetUserId) => {
    try {
      await promoteUser(roomId, targetUserId);
      triggerNotification("User promoted to Moderator successfully.");
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to promote user");
    }
  };

  const handleActionDemote = async (targetUserId) => {
    try {
      await demoteUser(roomId, targetUserId);
      triggerNotification("User demoted to Member successfully.");
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to demote user");
    }
  };

  const handleActionChangeRole = async (targetUserId, role) => {
    try {
      await changeRole(roomId, targetUserId, role);
      triggerNotification(`User role changed to ${role} successfully.`);
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change user role");
    }
  };

  const handleActionMute = async (targetUserId, mute) => {
    try {
      await muteUser(roomId, targetUserId, mute);
      triggerNotification(`User ${mute ? "muted" : "unmuted"} successfully.`);
      fetchRoom();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle user mute");
    }
  };

  const handleActionKick = async (targetUserId, targetUsername) => {
    if (!targetUserId) return;

    // 0ms optimistic removal on host UI
    setUsers((prev) => prev.filter((u) => String(u.userId || u._id || u.id) !== String(targetUserId)));
    setRoom((prev) => {
      if (!prev || !prev.participants) return prev;
      return {
        ...prev,
        participants: prev.participants.filter(
          (p) => String(p.user?._id || p.user?.id || p.user) !== String(targetUserId)
        )
      };
    });

    if (socket && socket.connected) {
      socket.emit("kick-user", { roomId, userId: targetUserId });
    }

    showToastNotification(`🚫 Removing ${targetUsername || "user"} from workspace...`);

    try {
      await kickUser(roomId, targetUserId);
      fetchRoom();
    } catch (err) {
      showToastNotification(err.response?.data?.message || "Failed to kick user", "error");
      fetchRoom();
    }
  };

  const confirmKickUser = async () => {
    const { userId, username } = kickTarget;
    setKickModalOpen(false);
    if (!userId) return;

    // 0ms optimistic removal on host UI
    setUsers((prev) => prev.filter((u) => String(u.userId || u._id || u.id) !== String(userId)));
    setRoom((prev) => {
      if (!prev || !prev.participants) return prev;
      return {
        ...prev,
        participants: prev.participants.filter(
          (p) => String(p.user?._id || p.user?.id || p.user) !== String(userId)
        )
      };
    });

    if (socket && socket.connected) {
      socket.emit("kick-user", { roomId, userId });
    }

    showToastNotification(`🚫 Removed ${username || "user"} from workspace.`);

    try {
      await kickUser(roomId, userId);
      fetchRoom();
    } catch (error) {
      showToastNotification(error.response?.data?.message || error.message || "Failed to kick user", "error");
      fetchRoom();
    }
  };

  const { resolvedTheme: editorTheme, setTheme: setGlobalTheme } = useTheme();
  const [editorFontSize, setEditorFontSize] = useState(() => {
    const saved = Number(localStorage.getItem("editor_fontSize"));
    return (saved && saved >= 10 && saved <= 18) ? saved : 13;
  });



  // Auto collapse sidebars on load for smaller laptop/tablet views
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
  }, []);

  const handleLogout = async () => {
    const confirm = await window.showConfirm(
      "Are you sure you want to log out? We will miss you and your code!",
      "Please don't go!",
      "logout"
    );
    if (!confirm) return;

    window.isLoggingOut = true;
    window.showLoader("Logging you out securely...");
    logoutUser().catch(err => console.error("Logout error:", err));

    // Preserve local preferences, read stories, and dismissed ads cache
    const preservedKeys = [];
    const prefixesToPreserve = [
      "codeexpo_read_stories",
      "ce_dismissed_ad",
      "editor_",
      "git_",
      "whiteboard_",
      "default_language",
      "notif_approvalAlerts",
      "notif_mentionAlerts",
      "notif_soundEnabled",
      "send_message_notification",
      "codeExpoHomeTheme",
      "ceSidebarPinned",
      "ce_editor_",
      "ce_profileTab",
      "ce_settingsTab",
      "ce_roomsTab",
      "ce_activeRoomsTab",
      "ce_adminActiveTab",
      "ce_tour_seen_",
      "ce_room_tour_seen_"
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixesToPreserve.some(prefix => key.startsWith(prefix))) {
        preservedKeys.push({ key, value: localStorage.getItem(key) });
      }
    }

    localStorage.clear();

    preservedKeys.forEach(item => {
      localStorage.setItem(item.key, item.value);
    });

    window.location.href = "/login";
  };

  const handleSaveCode = () => {
    if (activeFileIdRef.current) {
      socket.emit("save-file-content", {
        roomId,
        fileId: activeFileIdRef.current,
        content: code,
        userId: user.id,
        username: user.username
      });
      triggerNotification("Workspace file saved!");
    } else {
      socket.emit("save-code", { roomId, code });
      triggerNotification("Workspace changes saved!");
    }
  };

  // Playback & Version Timeline Handlers
  const handleSaveVersion = () => {
    if (!code) {
      toast.error("Cannot save an empty snapshot.");
      return;
    }
    socket.emit("version:create", {
      fileId: activeFileIdRef.current,
      code: code,
      userId: user.id,
      username: user.username
    });
    triggerNotification("Creating version snapshot...");
  };

  const startPlayback = () => {
    if (versions.length === 0) {
      toast.error("No version history available to replay.");
      return;
    }
    setIsPlaybackActive(true);
    setPlaybackIndex(versions.length - 1); // Play oldest first
    triggerNotification("Entered Playback Mode. Editor is locked.");
  };

  const stopPlayback = () => {
    setIsPlaybackActive(false);
    // Restore current code
    const activeFile = tabs.find((t) => t._id === activeFileIdRef.current);
    if (activeFile) {
      setCode(activeFile.content || "");
    } else {
      setCode(room?.code || "");
    }
    triggerNotification("Exited Playback Mode. Editor unlocked.");
  };

  const handlePlaybackNext = () => {
    if (playbackIndex > 0) {
      setPlaybackIndex(playbackIndex - 1);
    }
  };

  const handlePlaybackPrev = () => {
    if (playbackIndex < versions.length - 1) {
      setPlaybackIndex(playbackIndex + 1);
    }
  };

  // Playback timer loop
  const playbackModeActiveRef = useRef(false);
  useEffect(() => {
    playbackModeActiveRef.current = isPlaybackActive;
  }, [isPlaybackActive]);

  useEffect(() => {
    if (!isPlaybackActive) {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev <= 0) {
          clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
          setIsPlaybackActive(false);
          // Restore latest editor buffer
          const activeFile = tabs.find((t) => t._id === activeFileIdRef.current);
          if (activeFile) {
            setCode(activeFile.content || "");
          } else {
            setCode(room?.code || "");
          }
          triggerNotification("Finished replaying edit history.");
          return 0;
        }
        return prev - 1;
      });
    }, playbackSpeed);

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaybackActive, versions, playbackSpeed]);

  // Set code model based on active playback index
  useEffect(() => {
    if (isPlaybackActive && versions.length > 0) {
      const snap = versions[playbackIndex];
      if (snap) {
        setCode(snap.code);
      }
    }
  }, [playbackIndex, isPlaybackActive, versions]);

  // Unified Timeline activities list
  const getCombinedActivities = () => {
    const wActs = (whiteboardActivities || []).map((a) => ({
      id: a.id || `w-${a.time}`,
      username: a.username,
      action: a.action,
      time: a.time,
      isCode: false
    }));
    const cActs = (collabActivities || []).map((a) => ({
      id: `c-${a.timestamp || a.time}`,
      username: a.username,
      action: a.action,
      time: a.timestamp || a.time,
      isCode: true,
      lineNumber: a.lineNumber
    }));
    return [...wActs, ...cActs].sort((a, b) => new Date(b.time) - new Date(a.time));
  };

  const insertMarkdown = (syntax) => {
    const textarea = notesTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    switch (syntax) {
      case "bold":
        replacement = `**${selected || "bold text"}**`;
        cursorOffset = selected ? 0 : 2;
        break;
      case "italic":
        replacement = `*${selected || "italic text"}*`;
        cursorOffset = selected ? 0 : 1;
        break;
      case "heading":
        replacement = `### ${selected || "Heading"}`;
        cursorOffset = 0;
        break;
      case "code":
        replacement = `\`\`\`\n${selected || "code block"}\n\`\`\``;
        cursorOffset = selected ? 0 : 4;
        break;
      case "list":
        replacement = `\n- ${selected || "list item"}`;
        cursorOffset = 0;
        break;
      default:
        break;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setNotesText(newText);

    // Refocus and set cursor selection
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + replacement.length - cursorOffset;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const renderMarkdown = (text) => {
    if (!text) return "";

    // Escape HTML characters
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks
    html = html.replace(/```([\s\S]+?)```/g, (match, codePart) => {
      return `<pre class="md-code-block"><code>${codePart.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`\n]+?)`/g, '<code class="md-inline-code">$1</code>');

    // Headers
    html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

    // Bullet lists
    html = html.replace(/^\s*[-*]\s+(.*?)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");

    // Bold
    html = html.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    html = html.replace(/\*([\s\S]+?)\*/g, "<em>$1</em>");

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

    // Paragraphs
    const lines = html.split(/\n{2,}/);
    html = lines
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "";
        if (
          trimmed.startsWith("<h") ||
          trimmed.startsWith("<ul") ||
          trimmed.startsWith("<li") ||
          trimmed.startsWith("<pre")
        ) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");

    return html;
  };

  const downloadNotes = (format) => {
    let content = notesText;
    let filename = `${room?.title || "workspace"}-notes`;
    let type = "text/plain";

    if (format === "md") {
      filename += ".md";
      type = "text/markdown";
    } else if (format === "txt") {
      filename += ".txt";
      type = "text/plain";
    } else if (format === "html") {
      filename += ".html";
      type = "text/html";

      const isLightTheme = document.documentElement.className.includes("light");
      const bg = isLightTheme ? "#ffffff" : "#0d1117";
      const textColor = isLightTheme ? "#24292f" : "#c9d1d9";
      const border = isLightTheme ? "#d0d7de" : "#30363d";
      const font = "Inter, system-ui, -apple-system, sans-serif";

      content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${room?.title || "Workspace"} Notes</title>
  <style>
    body {
      background-color: ${bg};
      color: ${textColor};
      font-family: ${font};
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1, h2, h3 {
      border-bottom: 1px solid ${border};
      padding-bottom: 8px;
    }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    pre {
      background: ${isLightTheme ? "#f6f8fa" : "#161b22"};
      border: 1px solid ${border};
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      font-family: monospace;
      font-size: 0.9em;
    }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  ${renderMarkdown(notesText)}
</body>
</html>`;
    }

    const element = document.createElement("a");
    const file = new Blob([content], { type });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setNotesExportMenuOpen(false);
  };

  const copyNotesToClipboard = () => {
    navigator.clipboard.writeText(notesText).then(() => {
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
      setNotesExportMenuOpen(false);
    });
  };

  const getNotesStats = () => {
    const charCount = notesText.length;
    const wordCount = notesText.trim() === "" ? 0 : notesText.trim().split(/\s+/).length;
    return { charCount, wordCount };
  };



  const formatMessageTime = (timestamp) => {
    if (!timestamp) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  // Fetch Room Details
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const saveJoinedCodeToHistory = (code) => {
    if (!code || code === "default") return;
    try {
      let list = JSON.parse(localStorage.getItem("ce_recent_joined_codes") || "[]");
      list = list.filter((c) => c !== code);
      list.unshift(code);
      list = list.slice(0, 10);
      localStorage.setItem("ce_recent_joined_codes", JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoom = async () => {
    try {
      if (roomId === "default") {
        const recentRes = await getRecentRooms();
        const recent = recentRes.rooms || [];
        if (recent.length > 0) {
          navigate(`/editor/${recent[0].roomId}`, { replace: true });
        } else {
          const createRes = await createRoom("Personal Sandbox", "javascript", true);
          if (createRes && createRes.room) {
            navigate(`/editor/${createRes.room.roomId}`, { replace: true });
          } else {
            toast.error("Failed to initialize default workspace.");
            navigate("/dashboard");
          }
        }
        return;
      }

      const data = await getRoom(roomId);
      if (!data || !data.room) {
        toast.error("Room not found.");
        localStorage.removeItem("ceLastActiveRoomId");
        navigate("/dashboard");
        return;
      }

      // Privacy authorization check
      if (data.room.isPrivate) {
        const roomCreatorId = data.room.createdBy?._id || data.room.createdBy;
        const isOwner = String(roomCreatorId) === String(user.id || user._id);
        const isParticipant = data.room.participants?.some((p) => {
          const pUserId = p.user?._id || p.user;
          return String(pUserId) === String(user.id || user._id);
        });
        if (!isOwner && !isParticipant) {
          toast.error("You are not authorized to access this private room without approval.");
          localStorage.removeItem("ceLastActiveRoomId");
          navigate("/dashboard");
          return;
        }
      }

      setRoom(data.room);
      if (data.room.roomId) {
        saveJoinedCodeToHistory(data.room.roomId);
      }
      if (data.room.code) {
        setCode((prev) => prev || data.room.code);
      }
      // Load collaboration history, versions, and blame info for single-file mode
      await loadCollaborationState(roomId, null);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Failed to load room workspace. Returning to dashboard.");
      localStorage.removeItem("ceLastActiveRoomId");
      navigate("/dashboard");
    }
  };

  // Fetch Room Details
  useEffect(() => {
    if (!localStorage.getItem("token") || user.id === "guest") return;
    fetchRoom();
  }, [roomId, navigate, user.id]);

  // Persist open tabs and active file tab to localStorage per room ONLY AFTER session restoration!
  useEffect(() => {
    if (!roomId || roomId === "default" || !isTabRestoredRef.current) return;
    if (tabs.length > 0) {
      const openTabIds = tabs.map((t) => t._id);
      localStorage.setItem(`ce_open_tabs_${roomId}`, JSON.stringify(openTabIds));
    } else {
      localStorage.removeItem(`ce_open_tabs_${roomId}`);
    }
    if (activeFileId) {
      localStorage.setItem(`ce_active_tab_${roomId}`, activeFileId);
    }
  }, [tabs, activeFileId, roomId]);

  // Fetch workspace files on load and restore all open tabs (or auto-select entry point)
  useEffect(() => {
    const restoreWorkspaceSession = async () => {
      if (!roomId || roomId === "default" || hasAutoSelectedRef.current) return;
      hasAutoSelectedRef.current = true; // Set synchronously immediately to prevent race conditions!
      isTabRestoredRef.current = false;
      try {
        const data = await workspaceService.getWorkspaceTree(roomId);
        if (data && data.items) {
          const files = data.items.filter((item) => item.type === "file");
          if (files.length > 0) {
            // Check for saved open tabs in localStorage for this room
            let savedTabIds = [];
            let savedActiveId = null;
            try {
              const tabStr = localStorage.getItem(`ce_open_tabs_${roomId}`);
              if (tabStr) savedTabIds = JSON.parse(tabStr);
              savedActiveId = localStorage.getItem(`ce_active_tab_${roomId}`);
            } catch (e) { }

            // Match saved tab IDs in original order
            const validSavedFiles = (savedTabIds || [])
              .map((id) => files.find((f) => String(f._id) === String(id)))
              .filter(Boolean);

            if (validSavedFiles.length > 0) {
              // Fetch content for all saved open tabs in parallel
              const loadedTabs = await Promise.all(
                validSavedFiles.map(async (file) => {
                  try {
                    const contentData = await workspaceService.getFileContent(file._id);
                    return { ...file, content: contentData?.file?.content || "" };
                  } catch (err) {
                    return { ...file, content: "" };
                  }
                })
              );

              setTabs(loadedTabs);

              const targetActiveId = (savedActiveId && loadedTabs.some((t) => String(t._id) === String(savedActiveId)))
                ? savedActiveId
                : loadedTabs[0]._id;

              const targetTab = loadedTabs.find((t) => String(t._id) === String(targetActiveId));
              setActiveFileId(targetActiveId);
              setCode(targetTab?.content || "");
              setEditorLanguage(targetTab?.language || "javascript");
              loadCollaborationState(roomId, targetActiveId);
              isTabRestoredRef.current = true;
            } else {
              // Default to entry point or first file
              const entry = files.find((f) => f.isEntryPoint);
              const toSelect = entry || files[0];
              await handleFileSelect(toSelect._id, toSelect);
              isTabRestoredRef.current = true;
            }
          }
        }
      } catch (err) {
        console.error("Error restoring workspace session tabs:", err);
      }
    };

    if (room) {
      restoreWorkspaceSession();
    }
  }, [roomId, room]);

  // Join Room & Synchronize Socket.IO Connection (Mount & Reconnect Resilient)
  useEffect(() => {
    if (!room || !user || !roomId) return;

    const emitJoinRoom = () => {
      const roomCreatorId = room.createdBy?._id || room.createdBy;
      console.log(`[Socket] Emitting join-room for room: ${roomId} (user: ${user.username})`);
      socket.emit("join-room", {
        roomId,
        username: user.username,
        userId: user.id,
        isOwner: String(roomCreatorId) === String(user.id),
        avatar: user.avatar
      });
      hasJoinedRef.current = true;
    };

    // Emit initial join
    emitJoinRoom();

    const handleConnect = () => {
      console.log(`[Socket] Connected/Reconnected (socketId: ${socket.id}). Re-joining room: ${roomId}`);
      setSocketConnected(true);
      emitJoinRoom();
    };

    const handleDisconnect = (reason) => {
      console.warn(`[Socket] Disconnected (reason: ${reason}). Preserving presence state until re-sync.`);
      setSocketConnected(false);
      // Retain existing users list during temporary reconnects to prevent presence wiping
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [room, roomId, user]);

  // Leave Room ONLY when leaving workspace (unmount of Editor page or roomId change)
  useEffect(() => {
    return () => {
      if (roomId) {
        console.log(`[Socket] Leaving workspace room: ${roomId}`);
        socket.emit("leave-room", { roomId });
      }
      hasJoinedRef.current = false;
      hasAutoSelectedRef.current = false;
    };
  }, [roomId]);

  // Socket triggers
  useEffect(() => {
    const handleUserJoined = (data) => {
      triggerNotification(data.message);
      fetchRoom();
    };

    const handleRoomUsers = (usersList) => {
      console.log(`[Socket] Room users list received (${usersList?.length || 0} online users):`, usersList);
      setUsers(usersList);
      if (usersList && usersList.length > 0 && !privateRecipientRef.current) {
        const firstOther = usersList.find((u) => u.userId !== userRef.current.id);
        if (firstOther) setPrivateRecipient(firstOther.socketId);
      }
    };

    const handleReceiveCode = (newCode) => {
      setCode(newCode);
    };

    const handleUserAvatarUpdated = ({ userId, avatar }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const updatedParticipants = (prev.participants || []).map((p) => {
          if (String(p._id || p) === String(userId)) {
            return { ...p, avatar };
          }
          return p;
        });
        const updatedCreatedBy = prev.createdBy && String(prev.createdBy._id || prev.createdBy) === String(userId)
          ? { ...prev.createdBy, avatar }
          : prev.createdBy;
        return {
          ...prev,
          participants: updatedParticipants,
          createdBy: updatedCreatedBy
        };
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.sender && String(msg.sender._id || msg.sender) === String(userId)) {
            return {
              ...msg,
              sender: { ...msg.sender, avatar }
            };
          }
          return msg;
        })
      );
    };

    const handleReceiveMessage = (newMsg) => {
      const msgWithTime = {
        ...newMsg,
        createdAt: newMsg.createdAt || new Date().toISOString()
      };
      const getMsgId = (m) => String(m?._id || m?.id || "");
      const newId = getMsgId(newMsg);

      if (newMsg.isPrivate) {
        setPrivateMessages((prev) => {
          if (newId && prev.some((m) => getMsgId(m) === newId)) return prev;
          return [...prev, msgWithTime];
        });
      } else {
        setMessages((prev) => {
          if (newId && prev.some((m) => getMsgId(m) === newId)) return prev;
          return [...prev, msgWithTime];
        });
      }
    };

    const handleJoinRequest = (req) => {
      playNotificationSound();
      setJoinRequests((prev) => {
        if (prev.find((r) => r.userId === req.userId)) return prev;
        return [...prev, req];
      });
    };

    const handleUserLeft = (data) => {
      if (!data) return;
      triggerNotification(data.message || `${data.username || "A user"} left the room`);
      fetchRoom();

      // Cleanup cursor of left user
      if (data.username) {
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[data.username];
          return next;
        });
      }
    };

    const handleCodeCursorMove = (data) => {
      if (data.fileId !== activeFileIdRef.current || !data.position) {
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[data.username];
          return next;
        });
        return;
      }
      setRemoteCursors((prev) => ({
        ...prev,
        [data.username]: {
          username: data.username,
          position: data.position,
          color: data.color
        }
      }));
    };

    const handleCursorUpdate = (data) => {
      if (data.fileId !== activeFileIdRef.current || !data.line) {
        setRemoteCursors((prev) => {
          const next = { ...prev };
          delete next[data.socketId || data.username];
          return next;
        });
        return;
      }
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId || data.username]: {
          username: data.username,
          position: { lineNumber: data.line, column: data.column },
          color: data.color
        }
      }));
    };

    const handleCursorRemove = (data) => {
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[data.socketId || data.userId];
        return next;
      });
    };

    const handleLineOwnershipUpdate = (data) => {
      if (data.fileId === activeFileIdRef.current) {
        setLineOwnership(data.lines);
      }
    };

    const handleActivityAdd = (data) => {
      setCollabActivities((prev) => [data, ...prev].slice(0, 100));
    };

    const handleVersionCreate = (data) => {
      if (data.fileId === activeFileIdRef.current) {
        setVersions((prev) => [data, ...prev]);
      }
    };

    const handleUserJoin = (data) => {
      triggerNotification(`${data.username} joined the workspace.`);
    };

    const handleUserLeave = (data) => {
      triggerNotification(`${data.username || "A collaborator"} left the workspace.`);
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    const handleReceiveFileContent = ({ fileId, content }) => {
      if (fileId === activeFileIdRef.current) {
        setCode(content);
      }
      setTabs((prevTabs) =>
        prevTabs.map((t) => (t._id === fileId ? { ...t, content } : t))
      );
    };

    const handleWhiteboardActivity = (act) => {
      setWhiteboardActivities((prev) => [act, ...prev].slice(0, 10));
    };

    const handleRoomDeleted = () => {
      setRoomDeletedModalOpen(true);
    };

    const handleAlreadyOnline = () => {
      setKickMessage("You are already active in this room from another session.");
      setDuplicateSessionModalOpen(true);
    };

    const executeImmediateKickedExit = (reasonMessage) => {
      if (roomId && roomId !== "default") {
        saveJoinedCodeToHistory(roomId);
      }
      localStorage.removeItem("ceLastActiveRoomId");
      setKickMessage(reasonMessage || "You have been removed from this room by the owner or moderator.");
      setIsKickedFromRoom(true);

      if (inMeet) {
        setInMeet(false);
        setShowMeetLobby(false);
      }

      if (socket && socket.connected) {
        socket.emit("leave-room", { roomId, userId: userRef.current?.id || userRef.current?._id });
      }

      // Fast auto-redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);
    };

    const handleKicked = (data) => {
      executeImmediateKickedExit(data?.message || "You have been removed from this workspace by the host.");
    };

    const handleKickedReentryBlocked = (data) => {
      executeImmediateKickedExit(data?.message || "You were previously removed from this workspace. Access denied.");
    };

    const handleMeetError = ({ message }) => {
      showToastNotification(message);
      setInMeet(false);
      setShowMeetLobby(false);
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setPrivateMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    const cleanAnsi = (str) => {
      if (typeof str !== "string") return str;
      return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
    };

    const handleTerminalOutput = ({ text }) => {
      setTerminalOutput((prev) => prev + cleanAnsi(text || ""));
    };

    const handleTerminalExit = ({ code, message }) => {
      setTerminalOutput((prev) => prev + cleanAnsi(message || ""));
      setIsTerminalExecuting(false);
    };

    const handleRoleChanged = ({ userId, role }) => {
      fetchRoom();
      if (String(userId) === String(userRef.current.id)) {
        triggerNotification(`Your role has been changed to ${role}`);
      }
    };

    const handleMemberPromoted = ({ userId, username }) => {
      fetchRoom();
      triggerNotification(`${username || "User"} was promoted to Moderator`);
    };

    const handleMemberDemoted = ({ userId, username }) => {
      fetchRoom();
      triggerNotification(`${username || "User"} was demoted to Member`);
    };

    const handleUserKicked = ({ userId, username }) => {
      const currentUserId = String(userRef.current?.id || userRef.current?._id || "");
      if (String(userId) === currentUserId) {
        executeImmediateKickedExit("You have been removed from this workspace by the host.");
      } else {
        setUsers((prev) => prev.filter((u) => String(u.userId || u._id || u.id) !== String(userId)));
        setRoom((prev) => {
          if (!prev || !prev.participants) return prev;
          return {
            ...prev,
            participants: prev.participants.filter(
              (p) => String(p.user?._id || p.user?.id || p.user) !== String(userId)
            )
          };
        });
        showToastNotification(`🚫 ${username || "A participant"} was removed from the workspace.`);
      }
    };

    const handleMuteStatusChanged = async ({ userId, isMuted: targetIsMuted }) => {
      try {
        const data = await getRoom(roomId);
        if (data && data.room) {
          setRoom(data.room);

          if (String(userId) === String(userRef.current.id)) {
            triggerNotification(`You have been ${targetIsMuted ? "muted" : "unmuted"} in chat.`);

            const myParticipant = data.room.participants?.find(
              (p) => p.user && String(p.user._id || p.user) === String(userRef.current.id || userRef.current._id)
            );
            const myRole = myParticipant ? myParticipant.role : "MEMBER";

            if (targetIsMuted && myRole === "VIEWER" && inCallRef.current) {
              handleLeaveCall();
              triggerNotification("You have been removed from the WebRTC call because you were muted.");
            }
          }
        }
      } catch (err) {
        console.error("Error handling mute status change in call:", err);
        fetchRoom();
      }
    };

    const handleChatMutedAlert = ({ message }) => {
      triggerNotification(message);
    };

    // --- WebRTC signaling callbacks ---
    const handleUserJoinedCall = async ({ socketId, username, mediaType }) => {
      console.log("WebRTC: handleUserJoinedCall", { socketId, username });

      // If we are not in the call, show the incoming call popup invite
      if (!inCallRef.current) {
        setIncomingCall({ username, mediaType, socketId });
        return;
      }

      const pc = createPeerConnection(socketId, username, localStreamRef.current);
      try {
        const offer = await pc.createOffer();
        const optimizedOffer = new RTCSessionDescription({
          type: offer.type,
          sdp: optimizeSDP(offer.sdp)
        });
        await pc.setLocalDescription(optimizedOffer);
        socket.emit("webrtc-offer", {
          targetSocketId: socketId,
          offer: optimizedOffer
        });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    };

    const handleWebRtcOffer = async ({ senderSocketId, offer }) => {
      if (!inCallRef.current) return;
      console.log("WebRTC: handleWebRtcOffer from", senderSocketId);
      const peerUser = usersRef.current.find((u) => u.socketId === senderSocketId);
      const peerUsername = peerUser ? peerUser.username : "Participant";
      const pc = createPeerConnection(senderSocketId, peerUsername, localStreamRef.current);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        const optimizedAnswer = new RTCSessionDescription({
          type: answer.type,
          sdp: optimizeSDP(answer.sdp)
        });
        await pc.setLocalDescription(optimizedAnswer);
        socket.emit("webrtc-answer", {
          targetSocketId: senderSocketId,
          answer: optimizedAnswer
        });
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    };

    const handleWebRtcAnswer = async ({ senderSocketId, answer }) => {
      if (!inCallRef.current) return;
      console.log("WebRTC: handleWebRtcAnswer from", senderSocketId);
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote description from answer:", err);
        }
      }
    };

    const handleWebRtcIceCandidate = async ({ senderSocketId, candidate }) => {
      if (!inCallRef.current) return;
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    };

    const handleUserToggleMedia = ({ socketId, isMuted: peerMuted, isCameraOff: peerCameraOff, activeFilter }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            isMuted: peerMuted,
            isCameraOff: peerCameraOff,
            activeFilter: activeFilter || "none"
          }
        };
      });
    };

    const handleActiveCallUsers = (callUsersList) => {
      setActiveCallUsers(callUsersList || []);
    };

    const handleRemoteItemDeleted = (data) => {
      const deletedIds = data?.deletedIds || (Array.isArray(data) ? data : [data?.itemId || data]);
      handleFileDelete(deletedIds);
    };

    socket.off("user-joined");
    socket.on("user-joined", handleUserJoined);
    socket.off("room-users");
    socket.on("room-users", handleRoomUsers);
    socket.off("user-avatar-updated");
    socket.on("user-avatar-updated", handleUserAvatarUpdated);
    socket.off("receive-code");
    socket.on("receive-code", handleReceiveCode);
    socket.off("receive-file-content");
    socket.on("receive-file-content", handleReceiveFileContent);
    socket.off("file-deleted");
    socket.on("file-deleted", handleRemoteItemDeleted);
    socket.off("folder-deleted");
    socket.on("folder-deleted", handleRemoteItemDeleted);
    socket.off("Receive-Message");
    socket.on("Receive-Message", handleReceiveMessage);
    socket.off("join-request");
    socket.on("join-request", handleJoinRequest);
    socket.off("user-left");
    socket.on("user-left", handleUserLeft);
    socket.off("code-cursor-move");
    socket.on("code-cursor-move", handleCodeCursorMove);
    socket.off("whiteboard-activity");
    socket.on("whiteboard-activity", handleWhiteboardActivity);
    socket.off("room-deleted");
    socket.on("room-deleted", handleRoomDeleted);
    socket.off("already-online");
    socket.on("already-online", handleAlreadyOnline);
    socket.off("kicked");
    socket.on("kicked", handleKicked);
    socket.off("kicked-reentry-blocked");
    socket.on("kicked-reentry-blocked", handleKickedReentryBlocked);
    socket.off("meet:error");
    socket.on("meet:error", handleMeetError);
    socket.off("message-deleted");
    socket.on("message-deleted", handleMessageDeleted);
    socket.off("terminal-output");
    socket.on("terminal-output", handleTerminalOutput);
    socket.off("terminal-exit");
    socket.on("terminal-exit", handleTerminalExit);
    socket.off("role-changed");
    socket.on("role-changed", handleRoleChanged);
    socket.off("member-promoted");
    socket.on("member-promoted", handleMemberPromoted);
    socket.off("member-demoted");
    socket.on("member-demoted", handleMemberDemoted);
    socket.off("user-kicked");
    socket.on("user-kicked", handleUserKicked);
    socket.off("mute-status-changed");
    socket.on("mute-status-changed", handleMuteStatusChanged);
    socket.off("chat-muted-alert");
    socket.on("chat-muted-alert", handleChatMutedAlert);

    // Collaboration Socket Bindings
    socket.off("cursor:update");
    socket.on("cursor:update", handleCursorUpdate);
    socket.off("cursor:remove");
    socket.on("cursor:remove", handleCursorRemove);
    socket.off("line:ownership:update");
    socket.on("line:ownership:update", handleLineOwnershipUpdate);
    socket.off("activity:add");
    socket.on("activity:add", handleActivityAdd);
    socket.off("version:create");
    socket.on("version:create", handleVersionCreate);
    socket.off("user:join");
    socket.on("user:join", handleUserJoin);
    socket.off("user:leave");
    socket.on("user:leave", handleUserLeave);

    // WebRTC signaling listeners
    socket.off("user-joined-call");
    socket.on("user-joined-call", handleUserJoinedCall);
    socket.off("webrtc-offer");
    socket.on("webrtc-offer", handleWebRtcOffer);
    socket.off("webrtc-answer");
    socket.on("webrtc-answer", handleWebRtcAnswer);
    socket.off("webrtc-ice-candidate");
    socket.on("webrtc-ice-candidate", handleWebRtcIceCandidate);
    socket.off("user-toggle-media");
    socket.on("user-toggle-media", handleUserToggleMedia);
    socket.off("user-left-call");
    socket.on("user-left-call", handleUserLeftCall);
    socket.off("active-call-users");
    socket.on("active-call-users", handleActiveCallUsers);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("room-users", handleRoomUsers);
      socket.off("user-avatar-updated", handleUserAvatarUpdated);
      socket.off("receive-code", handleReceiveCode);
      socket.off("receive-file-content", handleReceiveFileContent);
      socket.off("file-deleted", handleRemoteItemDeleted);
      socket.off("folder-deleted", handleRemoteItemDeleted);
      socket.off("Receive-Message", handleReceiveMessage);
      socket.off("join-request", handleJoinRequest);
      socket.off("user-left", handleUserLeft);
      socket.off("code-cursor-move", handleCodeCursorMove);
      socket.off("whiteboard-activity", handleWhiteboardActivity);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("already-online", handleAlreadyOnline);
      socket.off("kicked", handleKicked);
      socket.off("meet:error", handleMeetError);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("terminal-output", handleTerminalOutput);
      socket.off("terminal-exit", handleTerminalExit);
      socket.off("role-changed", handleRoleChanged);
      socket.off("member-promoted", handleMemberPromoted);
      socket.off("member-demoted", handleMemberDemoted);
      socket.off("user-kicked", handleUserKicked);
      socket.off("mute-status-changed", handleMuteStatusChanged);
      socket.off("chat-muted-alert", handleChatMutedAlert);

      // Collaboration Socket Unbindings
      socket.off("cursor:update", handleCursorUpdate);
      socket.off("cursor:remove", handleCursorRemove);
      socket.off("line:ownership:update", handleLineOwnershipUpdate);
      socket.off("activity:add", handleActivityAdd);
      socket.off("version:create", handleVersionCreate);
      socket.off("user:join", handleUserJoin);
      socket.off("user:leave", handleUserLeave);

      // WebRTC signaling unsubscribe
      socket.off("user-joined-call", handleUserJoinedCall);
      socket.off("webrtc-offer", handleWebRtcOffer);
      socket.off("webrtc-answer", handleWebRtcAnswer);
      socket.off("webrtc-ice-candidate", handleWebRtcIceCandidate);
      socket.off("user-toggle-media", handleUserToggleMedia);
      socket.off("user-left-call", handleUserLeftCall);
      socket.off("active-call-users", handleActiveCallUsers);
    };
  }, [roomId, user.id]);

  // Fetch past messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getMessage(roomId);
        setMessages(data.message || []);
      } catch (error) {
        console.error(error.response?.data?.message || error.message);
      }
    };
    fetchMessages();
  }, [roomId]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalOutput]);

  // Save Code state debounced (workspace file or single buffer fallback)
  useEffect(() => {
    if (activeFileId) return; // Managed by Yjs sync on backend
    const timer = setTimeout(() => {
      socket.emit("save-code", { roomId, code });
    }, 2000);
    return () => clearTimeout(timer);
  }, [code, roomId, activeFileId]);

  // Helper functions for base64 conversions in the browser
  const base64ToUint8 = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const uint8ToBase64 = (uint8) => {
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return window.btoa(binary);
  };

  // Yjs Collaboration Engine Integration Hook
  useEffect(() => {
    const editor = editorInstance;
    const monaco = monacoInstance;
    if (!editor || !monaco || !activeFileId) {
      return;
    }

    let ydoc = null;
    let binding = null;
    let awareness = null;

    // Join Yjs room/file session
    socket.emit("yjs:join", { roomId, fileId: activeFileId });

    const handleYjsInit = ({ fileId, update }) => {
      if (fileId !== activeFileId) return;

      try {
        // Destroy any existing instances
        if (binding) binding.destroy();
        if (ydoc) ydoc.destroy();
        if (awareness) awareness.destroy();

        ydoc = new Y.Doc();
        const ytext = ydoc.getText("monaco");

        // Apply init state vector
        const initBuffer = base64ToUint8(update);
        isApplyingYjsUpdateRef.current = true;
        try {
          Y.applyUpdate(ydoc, initBuffer);
        } finally {
          isApplyingYjsUpdateRef.current = false;
        }

        // Update React code state
        setCode(ytext.toString());

        // Set up local text observer to keep React code state in sync
        ytext.observe(() => {
          setCode(ytext.toString());
        });

        // Initialize awareness for cursors & selections
        awareness = new awarenessProtocol.Awareness(ydoc);
        awareness.setLocalStateField("user", {
          name: user?.username || "Collaborator",
          color: getCursorColor(user?.username)
        });

        // Bind Yjs Text to Monaco Editor Model
        binding = new MonacoBinding(
          ytext,
          editor.getModel(),
          new Set([editor]),
          awareness
        );

        ydocRef.current = ydoc;
        bindingRef.current = binding;
        awarenessRef.current = awareness;

        // Local changes -> emit Yjs updates
        ydoc.on("update", (update, origin) => {
          if (origin !== socket) {
            const updateBase64 = uint8ToBase64(update);
            socket.emit("yjs:update", {
              roomId,
              fileId: activeFileId,
              update: updateBase64
            });
          }
        });

        // Local awareness changes -> emit awareness updates
        awareness.on("update", ({ added, updated, removed }) => {
          const localChanges = awarenessProtocol.encodeAwarenessUpdate(awareness, [ydoc.clientID]);
          socket.emit("yjs:awareness-update", {
            fileId: activeFileId,
            update: uint8ToBase64(localChanges)
          });
        });

        // Track user presence and render cursor styling dynamically
        const updateDynamicStyles = () => {
          const styles = [];
          awareness.getStates().forEach((state, clientID) => {
            if (state.user) {
              const { name, color } = state.user;
              styles.push(`
                .yRemoteSelection-${clientID} {
                  background-color: ${color}25 !important;
                }
                .yRemoteSelectionHead-${clientID} {
                  position: absolute;
                  border-left: 2px solid ${color} !important;
                  border-top: 2px solid ${color} !important;
                  border-bottom: 2px solid ${color} !important;
                  height: 100%;
                  box-sizing: border-box;
                }
                .yRemoteSelectionHead-${clientID}::after {
                  content: "${name}";
                  position: absolute;
                  top: -14px;
                  left: 0;
                  background: ${color};
                  color: white;
                  font-size: 9px;
                  font-family: 'Inter', sans-serif;
                  font-weight: bold;
                  padding: 1px 4px;
                  border-radius: 2px;
                  white-space: nowrap;
                  pointer-events: none;
                  opacity: 0.85;
                  z-index: 100;
                }
              `);
            }
          });

          let styleTag = document.getElementById("yjs-dynamic-styles");
          if (!styleTag) {
            styleTag = document.createElement("style");
            styleTag.id = "yjs-dynamic-styles";
            document.head.appendChild(styleTag);
          }
          styleTag.innerHTML = styles.join("\n");
        };

        awareness.on("change", updateDynamicStyles);
        updateDynamicStyles(); // initial call
      } catch (err) {
        console.error("Yjs Init error:", err);
      }
    };

    const handleYjsUpdate = ({ fileId, update }) => {
      if (fileId === activeFileId && ydoc) {
        const updateUint8 = base64ToUint8(update);
        isApplyingYjsUpdateRef.current = true;
        try {
          Y.applyUpdate(ydoc, updateUint8, socket);
        } finally {
          isApplyingYjsUpdateRef.current = false;
        }
      }
    };

    const handleYjsAwarenessUpdate = ({ fileId, update }) => {
      if (fileId === activeFileId && awareness) {
        const updateUint8 = base64ToUint8(update);
        awarenessProtocol.applyAwarenessUpdate(awareness, updateUint8, socket);
      }
    };

    socket.on("yjs:init", handleYjsInit);
    socket.on("yjs:update", handleYjsUpdate);
    socket.on("yjs:awareness-update", handleYjsAwarenessUpdate);

    return () => {
      // Clean up socket listeners
      socket.off("yjs:init", handleYjsInit);
      socket.off("yjs:update", handleYjsUpdate);
      socket.off("yjs:awareness-update", handleYjsAwarenessUpdate);

      // Notify leave
      socket.emit("yjs:leave", { fileId: activeFileId });

      // Clean up Yjs instances
      if (binding) binding.destroy();
      if (ydoc) ydoc.destroy();
      if (awareness) awareness.destroy();

      ydocRef.current = null;
      bindingRef.current = null;
      awarenessRef.current = null;

      // Clean up dynamic styles
      const styleTag = document.getElementById("yjs-dynamic-styles");
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, [activeFileId, editorInstance, monacoInstance]);

  // Handle Monaco Cursors delta decorations renderer
  useEffect(() => {
    const editor = editorInstance;
    const monaco = monacoInstance;
    if (!editor || !monaco) return;

    // Clear old cursor decorations
    if (!decorationsRef.current) decorationsRef.current = [];

    const newDecorations = Object.entries(remoteCursors).map(([id, cursor]) => {
      const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, "");
      const className = `monaco-collab-cursor-${sanitizedId}`;

      // Inject cursor style block dynamically
      let styleTag = document.getElementById(className);
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = className;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        .${className} {
          border-left: 1px solid ${cursor.color} !important;
          position: relative;
        }
        .${className}::after {
          content: "${cursor.username}";
          position: absolute;
          top: -16px;
          left: 0;
          background: ${cursor.color};
          color: #ffffff;
          font-size: 9px;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.85;
          z-index: 100;
        }
      `;

      return {
        range: new monaco.Range(
          cursor.position.lineNumber,
          cursor.position.column,
          cursor.position.lineNumber,
          cursor.position.column
        ),
        options: {
          className: className,
          hoverMessage: { value: `**${cursor.username}** typing...` }
        }
      };
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors, editorInstance, monacoInstance]);

  // Math helper for cursor colors (Curated professional developer palette)
  const getCursorColor = (name) => {
    const colors = ["#6366f1", "#06b6d4", "#10b981", "#8b5cf6", "#3b82f6", "#0284c7", "#f59e0b", "#14b8a6"];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Emit cursor movement & save file content inside Monaco Editor
  const handleEditorChange = (value) => {
    setCode(value);
    if (activeFileIdRef.current) {
      socket.emit("file-content-changed", {
        roomId,
        fileId: activeFileIdRef.current,
        content: value
      });
      socket.emit("save-file-content", {
        roomId,
        fileId: activeFileIdRef.current,
        content: value,
        userId: user?.id,
        username: user?.username
      });
    } else {
      socket.emit("code-change", { roomId, code: value });
      socket.emit("save-code", { roomId, code: value });
    }
  };

  const editorDisposablesRef = useRef([]);
  const recentDecorationsRef = useRef({});
  const blameDecorationsRef = useRef([]);

  const applyRecentEditDecoration = (startLine, addedCount) => {
    // Disabled edit line decorations per user request
    return;
  };

  const updateBlameDecorations = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!blameMode) {
      blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, []);
      return;
    }

    const timeAgo = (date) => {
      const seconds = Math.floor((new Date() - new Date(date)) / 1000);
      if (seconds < 5) return "just now";
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const newDecorations = lineOwnership.map((owner) => {
      const name = owner.editedBy.username;
      const time = timeAgo(owner.editedAt);
      const text = `  •  ${name} • ${time}`;

      return {
        range: new monaco.Range(owner.lineNumber, 1, owner.lineNumber, 1),
        options: {
          isWholeLine: false,
          after: {
            content: text,
            inlineClassName: "blame-inline-text"
          }
        }
      };
    });

    blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, newDecorations);
  };

  // Re-sync blame annotations when ownership metadata or toggle changes
  useEffect(() => {
    updateBlameDecorations();
  }, [blameMode, lineOwnership]);

  // Clean up hover providers on unmount
  useEffect(() => {
    return () => {
      editorDisposablesRef.current.forEach(d => d.dispose());
    };
  }, []);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorInstance(editor);
    setMonacoInstance(monaco);

    // Define custom premium themes matching page backgrounds exactly
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "d4d4d4" },
        { token: "invalid", foreground: "#f87171", background: "121218" },
        { token: "invalid.illegal", foreground: "#f87171", background: "121218" },
        { token: "keyword.directive", foreground: "#c586c0", fontStyle: "bold" },
        { token: "keyword.directive.include", foreground: "#c586c0", fontStyle: "bold" },
        { token: "meta.preprocessor", foreground: "#c586c0" },
        { token: "comment", foreground: "6a9955", fontStyle: "italic" },
        { token: "keyword", foreground: "569cd6", fontStyle: "bold" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "type", foreground: "4ec9b0" },
        { token: "function", foreground: "dcdcaa" },
      ],
      colors: {
        "editor.background": "#121218",
        "editor.foreground": "#d4d4d4",
        "editor.lineHighlightBackground": "rgba(255, 255, 255, 0.04)",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#569cd6",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "rgba(38, 79, 120, 0.5)",
        "editor.selectionHighlightBackground": "rgba(99, 102, 241, 0.25)",
        "editor.wordHighlightBackground": "rgba(99, 102, 241, 0.3)",
        "editor.wordHighlightStrongBackground": "rgba(99, 102, 241, 0.4)",
        "editorLineNumber.foreground": "#5a5a5a",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editorGutter.background": "#121218",
        "editorGutter.modifiedBackground": "#10b981",
        "editorGutter.addedBackground": "#3b82f6",
        "editorGutter.deletedBackground": "#ef4444"
      }
    });

    monaco.editor.defineTheme("custom-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "", foreground: "000000" },
        { token: "invalid", foreground: "#dc2626", background: "ffffff" },
        { token: "invalid.illegal", foreground: "#dc2626", background: "ffffff" },
        { token: "keyword.directive", foreground: "#af00db", fontStyle: "bold" },
        { token: "keyword.directive.include", foreground: "#af00db", fontStyle: "bold" },
        { token: "meta.preprocessor", foreground: "#af00db" },
        { token: "comment", foreground: "008000", fontStyle: "italic" },
        { token: "keyword", foreground: "0000ff", fontStyle: "bold" },
        { token: "string", foreground: "a31515" },
        { token: "number", foreground: "098658" },
        { token: "type", foreground: "267f99" },
        { token: "function", foreground: "795e26" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#000000",
        "editor.lineHighlightBackground": "rgba(0, 0, 0, 0.03)",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#0000ff",
        "editor.selectionBackground": "#add6ff",
        "editor.inactiveSelectionBackground": "rgba(173, 214, 255, 0.5)",
        "editor.selectionHighlightBackground": "rgba(99, 102, 241, 0.18)",
        "editor.wordHighlightBackground": "rgba(99, 102, 241, 0.22)",
        "editor.wordHighlightStrongBackground": "rgba(99, 102, 241, 0.3)",
        "editorLineNumber.foreground": "#237893",
        "editorLineNumber.activeForeground": "#0b216f",
        "editorGutter.background": "#ffffff",
        "editorGutter.modifiedBackground": "#059669",
        "editorGutter.addedBackground": "#2563eb",
        "editorGutter.deletedBackground": "#dc2626"
      }
    });

    // Set active theme
    monaco.editor.setTheme(editorTheme === "light" ? "custom-light" : "custom-dark");

    // Reset disposables list
    editorDisposablesRef.current.forEach(d => d.dispose());
    editorDisposablesRef.current = [];

    // 1. Monaco hover provider lookup
    const languages = ["javascript", "typescript", "python", "cpp", "java", "html", "css", "json", "plaintext"];
    const hoverDisposables = languages.map(lang =>
      monaco.languages.registerHoverProvider(lang, {
        provideHover: (model, position) => {
          const ownerInfo = lineOwnershipRef.current.find(l => l.lineNumber === position.lineNumber);
          if (!ownerInfo) return null;

          const timeAgo = (date) => {
            const seconds = Math.floor((new Date() - new Date(date)) / 1000);
            if (seconds < 5) return "just now";
            if (seconds < 60) return `${seconds}s ago`;
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
          };

          return {
            contents: [
              { value: `**Last Edited By:** ${ownerInfo.editedBy.username}` },
              { value: `⏰ ${timeAgo(ownerInfo.editedAt)}` }
            ]
          };
        }
      })
    );
    editorDisposablesRef.current.push(...hoverDisposables);

    // 1a. Dynamic Workspace Path Autocomplete Provider
    const pathAutocompleteLanguages = ["html", "css", "javascript"];
    const pathDisposables = pathAutocompleteLanguages.map(lang =>
      monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['"', "'", '/', '.', '@', '('],
        provideCompletionItems: (model, position) => {
          return pathAutocompleteService.provideSuggestions(model, position, monaco);
        }
      })
    );
    editorDisposablesRef.current.push(...pathDisposables);



    // 1b. Line limit check (Max 1000 lines)
    const lineLimitDisposable = editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (model) {
        const lineCount = model.getLineCount();
        if (lineCount > 1000) {
          addToast("Code exceeds the maximum limit of 1000 lines!", "error");
          editor.trigger("keyboard", "undo", null);
        }
      }
    });
    // ExpoAI: Cursor selection tracking for AI context
    editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && model && !selection.isEmpty()) {
        const text = model.getValueInRange(selection);
        setSelectedCode(text);
      } else {
        setSelectedCode("");
      }
    });

    // ExpoAI: Register Context Menu Actions inside Monaco Editor
    const registerAIAction = (id, label) => {
      editor.addAction({
        id: `expoai-${id}`,
        label: `🤖 ExpoAI: ${label}`,
        contextMenuGroupId: "1_modification",
        contextMenuOrder: 1.5,
        run: (ed) => {
          const sel = ed.getSelection();
          const mod = ed.getModel();
          if (sel && mod && !sel.isEmpty()) {
            const txt = mod.getValueInRange(sel);
            setSelectedCode(txt);
          }
          setRightTabMode("ai");
          setRightSidebarCollapsed(false);
        }
      });
    };

    registerAIAction("ask", "Ask AI");
    registerAIAction("explain", "Explain Code");
    registerAIAction("fix", "Fix Bug");
    registerAIAction("optimize", "Optimize Code");
    registerAIAction("review", "Review Code");
    registerAIAction("docs", "Generate Documentation");
    registerAIAction("tests", "Generate Test Cases");

    // 2. Cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      socket.emit("code-cursor-move", {
        roomId,
        username: user?.username,
        position: e.position,
        color: getCursorColor(user?.username),
        fileId: activeFileIdRef.current
      });

      socket.emit("cursor:update", {
        line: e.position.lineNumber,
        column: e.position.column,
        color: getCursorColor(user?.username),
        fileId: activeFileIdRef.current
      });
    });

    editor.onDidBlurEditorText(() => {
      socket.emit("code-cursor-move", {
        roomId,
        username: user?.username,
        position: null,
        color: getCursorColor(user?.username),
        fileId: activeFileIdRef.current
      });

      socket.emit("cursor:update", {
        line: null,
        column: null,
        color: getCursorColor(user?.username),
        fileId: activeFileIdRef.current
      });
    });

    editor.onDidFocusEditorText(() => {
      const position = editor.getPosition();
      if (position) {
        socket.emit("code-cursor-move", {
          roomId,
          username: user?.username,
          position,
          color: getCursorColor(user?.username),
          fileId: activeFileIdRef.current
        });

        socket.emit("cursor:update", {
          line: position.lineNumber,
          column: position.column,
          color: getCursorColor(user?.username),
          fileId: activeFileIdRef.current
        });
      }
    });

    // 3. Document edits listener
    const contentDisposable = editor.onDidChangeModelContent((event) => {
      if (playbackModeActiveRef.current) return;
      if (isApplyingYjsUpdateRef.current) return;

      event.changes.forEach((change) => {
        const startLineNumber = change.range.startLineNumber;
        const endLineNumber = change.range.endLineNumber;
        const text = change.text;

        const linesAdded = (text.match(/\n/g) || []).length;
        const linesDeleted = endLineNumber - startLineNumber;

        socket.emit("line:ownership:update", {
          fileId: activeFileIdRef.current,
          startLineNumber,
          endLineNumber,
          linesAdded,
          linesDeleted,
          userId: user.id,
          username: user.username
        });

        if (linesAdded > 0) {
          socket.emit("activity:add", {
            fileId: activeFileIdRef.current,
            action: `added ${linesAdded} line(s) starting at line ${startLineNumber}`,
            lineNumber: startLineNumber,
            username: user.username
          });
        } else if (linesDeleted > 0) {
          socket.emit("activity:add", {
            fileId: activeFileIdRef.current,
            action: `deleted line(s) from ${startLineNumber} to ${endLineNumber}`,
            lineNumber: startLineNumber,
            username: user.username
          });
        } else if (text.trim().length > 0) {
          socket.emit("activity:add", {
            fileId: activeFileIdRef.current,
            action: `edited line ${startLineNumber}`,
            lineNumber: startLineNumber,
            username: user.username
          });
        }

        applyRecentEditDecoration(startLineNumber, linesAdded);
      });
    });
    editorDisposablesRef.current.push(contentDisposable);
  };

  useEffect(() => {
    if (monacoInstance) {
      monacoInstance.editor.setTheme(editorTheme === "light" ? "custom-light" : "custom-dark");
    }
  }, [editorTheme, monacoInstance]);

  useEffect(() => {
    if (editorInstance) {
      editorInstance.updateOptions({
        fontSize: editorFontSize || 13,
        fontFamily: editorFontFamily || "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Source Code Pro', Consolas, monospace",
        fontLigatures: true,
        fontWeight: "400",
        lineHeight: 19,
        minimap: { enabled: editorShowMinimap },
        tabSize: editorTabSize,
        wordWrap: editorWordWrap,
        lineNumbers: editorLineNumbers,
        quickSuggestions: editorSuggestions === "disabled" ? false : { other: true, comments: true, strings: true },
        suggestOnTriggerCharacters: editorSuggestions !== "disabled",
        acceptSuggestionOnEnter: editorSuggestions === "ai" ? "on" : "smart",
        snippetSuggestions: editorSuggestions === "disabled" ? "none" : "inline",
        cursorBlinking: editorCursorBlinking,
        cursorStyle: editorCursorStyle,
        cursorWidth: editorCursorStyle === "line" ? 2 : undefined,
        bracketPairColorization: { enabled: editorBracketColorization }
      });
    }
  }, [
    editorFontSize,
    editorFontFamily,
    editorShowMinimap,
    editorTabSize,
    editorWordWrap,
    editorLineNumbers,
    editorSuggestions,
    editorCursorBlinking,
    editorCursorStyle,
    editorBracketColorization,
    editorInstance
  ]);

  // Compile runner handler
  const handleRunCode = () => {
    if (isTerminalExecuting || currentUserRole === "VIEWER") return;
    if (runCooldownSeconds > 0) {
      addToast(`Please wait ${runCooldownSeconds}s before running code again.`, "error");
      return;
    }
    setRunCooldownSeconds(5);
    setIsConsoleOpen(true);
    setConsoleTab("output");
    setTerminalOutput("");
    setIsTerminalExecuting(true);
    socket.emit("execute-code", {
      roomId,
      language: editorLanguage || room?.language || "javascript",
      activeFileId: activeFileIdRef.current || null,
      input: programInput
    });
  };

  const handleStopCodeExecution = () => {
    if (!isTerminalExecuting) return;
    socket.emit("stop-execute-code", { roomId });
    setIsTerminalExecuting(false);
    setTerminalOutput((prev) => prev + "\n\n❌ [Execution stopped by user]");
    triggerNotification("Code execution stopped.");
  };

  const handleConsoleTabClick = (tab) => {
    if (!isConsoleOpen) {
      setIsConsoleOpen(true);
      setConsoleTab(tab);
    } else if (consoleTab === tab) {
      setIsConsoleOpen(false);
    } else {
      setConsoleTab(tab);
    }
  };

  // Socket actions
  const handleApproveRequest = (request) => {
    socket.emit("approve-request", request);
    playNotificationSound();
    setJoinRequests((prev) => prev.filter((r) => r.userId !== request.userId));
  };

  const handleRejectRequest = (request) => {
    socket.emit("reject-request", {
      roomId: request.roomId,
      userId: request.userId,
      requesterSocketId: request.requesterSocketId
    });
    setJoinRequests((prev) => prev.filter((r) => r.userId !== request.userId));
  };

  const handleExitWorkspaceAction = async () => {
    const confirmExit = await window.showConfirm("Are you sure you want to exit this workspace? Any unsaved edits will be lost.", "Exit Workspace", "exit-workspace");
    if (!confirmExit) return;

    setIsExiting(true);
    try {
      socket.emit("leave-room", { roomId });
      localStorage.removeItem("ceLastActiveRoomId");
      setTimeout(() => {
        navigate("/dashboard");
      }, 550);
    } catch (error) {
      console.error(error.message);
      setIsExiting(false);
    }
  };

  const handleDeleteRoomAction = () => {
    setSecurityDeleteRoomTarget({ id: roomId, title: room?.title || "Workspace" });
  };

  const executeSecurityRoomDeleteInEditor = async () => {
    if (!securityDeleteRoomTarget) return;
    setIsDeletingRoomTarget(true);
    try {
      socket.emit("room-deleted", { roomId: securityDeleteRoomTarget.id });
      await deleteRoom(securityDeleteRoomTarget.id);
      localStorage.removeItem("ceLastActiveRoomId");
      setSecurityDeleteRoomTarget(null);
      setIsExiting(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 550);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsDeletingRoomTarget(false);
    }
  };

  const handleRemoveUser = (targetUserId, targetUsername) => {
    setKickTarget({ userId: targetUserId, username: targetUsername });
    setKickModalOpen(true);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    if (chatTab === "private") {
      const recipientUser = users.find((u) => u.socketId === privateRecipient);
      socket.emit("send-message", {
        roomId,
        message,
        userId: user.id || user._id,
        username: `${user.username} ➔ ${recipientUser?.username || "Direct Message"}`,
        senderAvatar: user.avatar,
        senderEmail: user.email,
        isPrivate: true,
        recipientSocketId: privateRecipient,
        createdAt: new Date().toISOString()
      });
    } else {
      socket.emit("send-message", {
        roomId,
        message,
        userId: user.id || user._id,
        username: user.username,
        senderAvatar: user.avatar,
        senderEmail: user.email,
        createdAt: new Date().toISOString()
      });
    }
    setMessage("");
  };

  const handleDeleteMessage = (messageId) => {
    if (!messageId) return;
    setDeleteConfirmMsgId(messageId);
  };

  const confirmDeleteMessage = () => {
    if (!deleteConfirmMsgId) return;
    socket.emit("delete-message", { roomId, messageId: deleteConfirmMsgId, userId: user.id });
    setDeleteConfirmMsgId(null);
  };

  // Copy Room ID
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Drag resizing for Monaco vs Whiteboard split
  const startWorkspaceResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resizing-workspace");
    const handleMouseMove = (moveEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(20, Math.min(80, newPercent)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resizing-workspace");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Drag resizing for bottom console height
  const startConsoleResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resizing-console");
    const handleMouseMove = (moveEvent) => {
      const newHeight = window.innerHeight - moveEvent.clientY;
      setConsoleHeight(Math.max(100, Math.min(window.innerHeight * 0.75, newHeight)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resizing-console");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Drag resizing for left sidebar width
  const startSidebarResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add("resizing-sidebar");
    const bodyLeft = editorBodyRef.current ? editorBodyRef.current.getBoundingClientRect().left : 0;
    const handleMouseMove = (moveEvent) => {
      const newWidth = moveEvent.clientX - bodyLeft;
      setSidebarWidth(Math.max(180, Math.min(600, newWidth)));
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove("resizing-sidebar");
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Filter & merge unique human participants from room participants and active socket clients
  const combinedUsersMap = new Map();
  const activeOnlineSet = new Set((users || []).map((u) => String(u.userId || u._id || u.id || "")));
  if (user?.id || user?._id) activeOnlineSet.add(String(user.id || user._id));

  if (room?.participants && room.participants.length > 0) {
    room.participants.forEach((p) => {
      const uObj = p.user || p;
      const uid = String(uObj._id || uObj.id || uObj.userId || "");
      if (uid && uObj.username && uObj.username !== "User" && uObj.username !== "Browser Previewer" && !uObj.isPreview) {
        combinedUsersMap.set(uid, {
          userId: uid,
          username: uObj.username,
          avatar: uObj.avatar,
          role: p.role || "MEMBER",
          isOnline: activeOnlineSet.has(uid)
        });
      }
    });
  }

  if (users && users.length > 0) {
    users.forEach((u) => {
      const uid = String(u.userId || u._id || u.id || "");
      if (uid && u.username && u.username !== "User" && u.username !== "Browser Previewer" && !u.isPreview) {
        const existing = combinedUsersMap.get(uid) || {};
        combinedUsersMap.set(uid, {
          ...existing,
          userId: uid,
          username: u.username || existing.username,
          avatar: u.avatar || existing.avatar,
          socketId: u.socketId,
          isOnline: true
        });
      }
    });
  }

  if (combinedUsersMap.size === 0 && user) {
    const uid = String(user.id || user._id || "");
    combinedUsersMap.set(uid, {
      userId: uid,
      username: user.username || user.name || "You",
      avatar: user.avatar,
      isOnline: true
    });
  }

  const uniqueUsers = Array.from(combinedUsersMap.values());

  if (roomId === "default") {
    return (
      <div className="ce-editor-page empty-workspace-page">
        <div className="empty-workspace-container">
          <div className="empty-workspace-card">
            <div className="empty-workspace-icon">
              <Code2 size={48} />
            </div>
            <h2 className="empty-workspace-title">Welcome to Workspace</h2>
            <p className="empty-workspace-desc">
              You do not have an active coding session right now. Launch a new space or connect to an existing room.
            </p>

            <div className="empty-workspace-actions">
              <button
                type="button"
                className="ce-btn-primary"
                onClick={async () => {
                  try {
                    const createRes = await createRoom("Personal Sandbox", "javascript", true);
                    if (createRes && createRes.room) {
                      navigate(`/editor/${createRes.room.roomId}`);
                    } else {
                      alert("Failed to create sandbox.");
                    }
                  } catch (err) {
                    alert("Error creating workspace.");
                  }
                }}
              >
                <Plus size={14} />
                <span>Create Sandbox Room</span>
              </button>

              <div className="action-divider">or</div>

              <form
                className="join-room-inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const joinRoomId = e.target.elements.joinRoomIdInput.value.trim();
                  if (joinRoomId) {
                    const confirm = await window.showConfirm(
                      "Are you sure you want to join this room?",
                      "Join Workspace",
                      "info"
                    );
                    if (confirm) {
                      navigate(`/editor/${joinRoomId}`);
                    }
                  }
                }}
              >
                <input
                  name="joinRoomIdInput"
                  type="text"
                  placeholder="Enter Room ID to Join..."
                  className="join-inline-input"
                  required
                />
                <button type="submit" className="join-inline-btn">
                  <span>Join Room</span>
                </button>
              </form>
            </div>

            <div className="back-to-dash-row">
              <button type="button" className="ce-btn-link" onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderUsername = (username, isPrivate) => {
    if (isPrivate && username && username.includes("➔")) {
      const parts = username.split("➔");
      return (
        <span className="bubble-username private-header">
          <span className="sender-name">{parts[0].trim()}</span>
          <span className="arrow-icon"> ➔ </span>
          <span className="recipient-name">{parts[1].trim()}</span>
        </span>
      );
    }
    return <span className="bubble-username">{username}</span>;
  };

  const handleSearchSelect = (item) => {
    if (item.type === "file") {
      handleFileSelect(item.fileId);
    } else if (item.type === "action") {
      switch (item.action) {
        case "run-code":
          handleRunCode();
          break;
        case "copy-room-id":
          copyRoomId();
          break;
        case "toggle-whiteboard":
          toggleWhiteboard();
          break;
        case "toggle-sidebar":
          setLeftSidebarCollapsed(prev => !prev);
          break;
        case "switch-tab":
          setLeftActiveTab(item.tab);
          setLeftSidebarCollapsed(false);
          break;
        case "leave-room":
          handleExitWorkspaceAction();
          break;
        default:
          break;
      }
    }
  };

  if (!room) {
    if (!fromTransition) {
      return (
        <div className="editor-simple-loading-screen">
          <div className="simple-loading-spinner"></div>
          <span className="simple-loading-text">Loading Workspace...</span>
        </div>
      );
    }

    return (
      <div className="editor-loading-screen">
        <div className="tech-grid-overlay"></div>
        <div className="hologram-container">
          <div className="hologram-ring ring-outer"></div>
          <div className="hologram-ring ring-middle"></div>
          <div className="hologram-ring ring-inner"></div>
          <div className="hologram-core"></div>
        </div>
        <h2 className="loading-status-text">Workspace is ready for you...</h2>

        <div className="loading-progress-container">
          <div className="loading-progress-bar">
            <div className="loading-progress-fill"></div>
          </div>
          <span className="loading-progress-percentage">BOOTING ENVIRONMENT</span>
        </div>

        {/* Animated Boot Logs Terminal Console */}
        <div className="tech-terminal-console">
          <div className="console-header">
            <span className="console-dot dot-red"></span>
            <span className="console-dot dot-yellow"></span>
            <span className="console-dot dot-green"></span>
            <span className="console-title">system_connection_terminal</span>
          </div>
          <div className="console-body">
            <div className="console-line line-1">&gt; INITIATING DEVI_ENVIRONMENT HANDSHAKE... SUCCESS</div>
            <div className="console-line line-2">&gt; SPINNING UP MONACO EDITOR CONTROLLER... ONLINE</div>
            <div className="console-line line-3">&gt; MOUNTING MULTI-USER DOCUMENT CONTEXT... ONLINE</div>
            <div className="console-line line-4">&gt; SYNCING COLLABORATION SOCKET PIPELINE... ESTABLISHED</div>
            <div className="console-line line-5">&gt; INITIALIZING WEBRTC AUDIO GRID ROUTING... READY</div>
          </div>
        </div>

        <p className="loading-substatus-text">Configuring real-time socket signals & WebRTC audio nodes...</p>
      </div>
    );
  }

  const isCurrentUserOwner = room && String(room.createdBy?._id || room.createdBy) === String(user.id);
  const currentUserParticipant = room?.participants?.find(
    (p) => p.user && String(p.user._id || p.user) === String(user.id || user._id)
  );
  const currentUserRole = currentUserParticipant ? currentUserParticipant.role : (isCurrentUserOwner ? "OWNER" : "MEMBER");
  const isMeetingInProgress = activeMeetUsers && activeMeetUsers.length > 0;
  const showCallButtons =
    !room?.isPrivate ||
    currentUserRole === "OWNER" ||
    currentUserRole === "MODERATOR" ||
    isMeetingInProgress;

  const activeFile = tabs.find((t) => t._id === activeFileId);
  const activeFileCreatedBy = activeFile?.createdBy?._id || activeFile?.createdBy;
  const isMemberReadOnly = currentUserRole === "MEMBER" && activeFileCreatedBy && String(activeFileCreatedBy) !== String(user.id || user._id);
  const isEditorReadOnly = isPlaybackActive || currentUserRole === "VIEWER" || isMemberReadOnly;
  const creatorUsername = activeFile?.createdBy?.username || "another member";

  return (
    <MainLayout
      roomId={roomId}
      roomTitle={room.title}
      isPrivate={room?.isPrivate}
      onEditRoom={() => setEditRoomModalOpen(true)}
      socketConnected={socketConnected}
      uniqueUsers={uniqueUsers}
      joinRequests={joinRequests}
      copyRoomId={copyRoomId}
      copiedId={copiedId}
      notifications={roomNotifications}
      clearNotifications={() => setRoomNotifications([])}
      onSearchSelect={handleSearchSelect}
      inCall={inMeet}
      callType="video"
      onJoinCall={showCallButtons ? handleOpenMeetLobby : null}
      onLeaveCall={handleLeaveMeeting}
      activeCallUsers={activeMeetUsers}
      onOpenInvite={handleOpenInviteModal}
      layoutMode={layoutMode}
      onTasksClick={() => changeLayoutMode(layoutMode === "planner" ? "editor" : "planner")}
      currentUserRole={currentUserRole}
      onExitRoom={handleExitWorkspaceAction}
      onDeleteRoom={handleDeleteRoomAction}
      isOwner={isCurrentUserOwner || currentUserRole === "OWNER"}
      tabs={tabs}
    >
      <div className={`ce-editor-page mobile-tab-${mobileTab}`}>
        {/* Main Core Body */}
        <div ref={editorBodyRef} className={`ce-editor-body ${isResizing ? "resizing" : ""}`}>

          {/* 2. LEFT SIDEBAR (Collapsible) */}
          <aside
            className={`ce-left-sidebar ${leftSidebarCollapsed ? "collapsed" : ""}`}
            style={{
              width: leftSidebarCollapsed ? "44px" : `${sidebarWidth}px`,
              transition: leftSidebarCollapsed ? "width 0.2s ease" : "none"
            }}
          >
            <div className="sidebar-tabs">
              <button
                className={`sidebar-tab-btn ${layoutMode !== "planner" && leftActiveTab === "files" ? "active" : ""}`}
                onClick={() => {
                  if (layoutMode === "planner") {
                    changeLayoutMode("editor");
                    setLeftActiveTab("files");
                    setLeftSidebarCollapsed(false);
                  } else if (leftActiveTab === "files") {
                    setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  } else {
                    setLeftActiveTab("files");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Explorer (Files)"
              >
                <FolderOpen size={20} />
              </button>

              {currentUserRole !== "VIEWER" && (
                <button
                  type="button"
                  className={`sidebar-tab-btn ${layoutMode === "planner" ? "active" : ""}`}
                  onClick={() => changeLayoutMode(layoutMode === "planner" ? "editor" : "planner")}
                  title="Task Planner / Kanban Board"
                >
                  <FileClock size={20} />
                </button>
              )}

              <button
                className={`sidebar-tab-btn ${layoutMode !== "planner" && leftActiveTab === "activity" ? "active" : ""}`}
                onClick={() => {
                  if (layoutMode === "planner") {
                    changeLayoutMode("editor");
                    setLeftActiveTab("activity");
                    setLeftSidebarCollapsed(false);
                  } else if (leftActiveTab === "activity") {
                    setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  } else {
                    setLeftActiveTab("activity");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Activity Feed"
              >
                <Activity size={20} />
              </button>

              {isCurrentUserOwner && (
                <button
                  className={`sidebar-tab-btn ${layoutMode !== "planner" && leftActiveTab === "history" ? "active" : ""}`}
                  onClick={() => {
                    if (layoutMode === "planner") {
                      changeLayoutMode("editor");
                      setLeftActiveTab("history");
                      setLeftSidebarCollapsed(false);
                    } else if (leftActiveTab === "history") {
                      setLeftSidebarCollapsed(!leftSidebarCollapsed);
                    } else {
                      setLeftActiveTab("history");
                      setLeftSidebarCollapsed(false);
                    }
                  }}
                  title="Room History"
                >
                  <Scroll size={20} />
                </button>
              )}
              <button
                className={`sidebar-tab-btn ${layoutMode !== "planner" && leftActiveTab === "settings" ? "active" : ""}`}
                onClick={() => {
                  if (layoutMode === "planner") {
                    changeLayoutMode("editor");
                    setLeftActiveTab("settings");
                    setLeftSidebarCollapsed(false);
                  } else if (leftActiveTab === "settings") {
                    setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  } else {
                    setLeftActiveTab("settings");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Settings"
              >
                <Settings size={20} />
              </button>

              {/* Explicit Expand / Collapse Arrow Toggle Button */}
              <button
                className="sidebar-tab-btn sidebar-expand-toggle-btn"
                onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
                title={leftSidebarCollapsed ? "Expand Left Sidebar (Files / Notes)" : "Collapse Left Sidebar"}
                style={{
                  marginTop: "auto",
                  marginBottom: "6px",
                  color: "var(--ce-accent, #818cf8)",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)"
                }}
              >
                {leftSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>

              {/* Exit Workspace Button (Placed Below Collapse Arrow) */}
              <button
                type="button"
                className="sidebar-tab-btn exit-workspace-sidebar-btn"
                onClick={handleExitWorkspaceAction}
                title="Exit Workspace"
                style={{
                  marginBottom: "10px",
                  color: "#ef4444",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)"
                }}
              >
                <DoorOpen size={18} />
              </button>
            </div>

            {/* Expanded Sidebar Drawer Panel */}
            <div className="sidebar-drawer">
              <div className="drawer-header">
                <span className="drawer-title">
                  {leftActiveTab === "files" && "Explorer"}
                  {leftActiveTab === "notes" && "Workspace Notes"}
                  {leftActiveTab === "activity" && "Activity Logs"}
                  {leftActiveTab === "versions" && "Version History"}
                  {leftActiveTab === "history" && "Room History"}
                  {leftActiveTab === "settings" && "Workspace Settings"}
                </span>
                <button
                  className="drawer-close-btn"
                  onClick={() => setLeftSidebarCollapsed(true)}
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="drawer-body">
                {leftActiveTab === "files" && (
                  <FileExplorer
                    roomId={roomId}
                    room={room}
                    roomLanguage={room?.language || "javascript"}
                    currentUser={user}
                    currentUserRole={currentUserRole}
                    activeFileId={activeFileId}
                    onFileSelect={handleFileSelect}
                    openTabs={tabs}
                    onFileDelete={handleFileDelete}
                    onPathChange={handlePathChange}
                    onItemsUpdate={(items) => setWorkspaceItems(items)}
                    isImportOpen={isImportModalOpen}
                    onOpenImport={() => setIsImportModalOpen(true)}
                    onCloseImport={() => setIsImportModalOpen(false)}
                  />
                )}



                {leftActiveTab === "activity" && (
                  <div className="activity-logs-pane">
                    <div className="activity-pane-header">
                      <Activity size={12} className="activity-header-icon" />
                      <span>Real-time Workspace Timeline</span>
                    </div>

                    <div className="logs-timeline-container">
                      {getCombinedActivities().length > 0 ? (
                        <div className="timeline-items">
                          {getCombinedActivities().map((act) => (
                            <div key={act.id} className="timeline-item">
                              <div className="timeline-badge-column">
                                <span className={`timeline-badge ${act.isCode ? "code-badge" : "whiteboard-badge"}`} />
                                <span className="timeline-connector" />
                              </div>
                              <div className="timeline-content-card">
                                <div className="timeline-header-row">
                                  <span className="timeline-username">{act.username}</span>
                                  <span className="timeline-time">
                                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                                <p className="timeline-action-text">{act.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="activity-empty-state">
                          <div className="empty-state-icon-wrapper">
                            <Activity size={24} />
                          </div>
                          <h4 className="empty-state-title">No activities yet</h4>
                          <p className="empty-state-desc">
                            Edits to code files or interactions on the whiteboard will generate real-time activity stream cards here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {leftActiveTab === "history" && (
                  <div className="room-history-timeline-pane" style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <div className="room-history-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Creator Audit Logs</span>
                      <button
                        onClick={fetchRoomHistory}
                        disabled={roomHistoryLoading}
                        style={{ background: "transparent", border: "none", color: "var(--ce-accent, #6366f1)", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        {roomHistoryLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>

                    {roomHistoryLoading ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "var(--ce-text-muted)", fontSize: "0.8rem" }}>
                        Loading audit logs...
                      </div>
                    ) : roomHistory.length > 0 ? (
                      <div className="room-history-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {roomHistory.map((item) => (
                          <div key={item._id} className="room-history-item-card">
                            <div className="room-history-meta">
                              <span className="room-history-user">@{item.username}</span>
                              <span className="room-history-time">{new Date(item.timestamp).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                            </div>
                            <div className="room-history-action">
                              {item.action}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="activity-empty-state" style={{ textAlign: "center", padding: "30px 10px" }}>
                        <div className="empty-state-icon-wrapper" style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                          <Scroll size={24} />
                        </div>
                        <h4 className="empty-state-title" style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 4px 0" }}>No history logs yet</h4>
                        <p className="empty-state-desc" style={{ fontSize: "0.75rem", margin: 0, color: "var(--ce-text-muted)" }}>
                          Workspace creation and modification logs will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {leftActiveTab === "settings" && (
                  <div className="settings-pane">
                    <div className="settings-section">
                      <span className="settings-section-title">Editor Appearance</span>

                      <div className="setting-group">
                        <label htmlFor="editor-theme-select">Interface Theme</label>
                        <select
                          id="editor-theme-select"
                          className="ce-select-box"
                          value={editorTheme}
                          onChange={(e) => {
                            setGlobalTheme(e.target.value);
                          }}
                        >
                          <option value="dark">GitHub Dark</option>
                          <option value="light">GitHub Light</option>
                        </select>
                      </div>

                      <div className="setting-group">
                        <label htmlFor="editor-fontfamily-select">Font Family</label>
                        <select
                          id="editor-fontfamily-select"
                          className="ce-select-box"
                          value={editorFontFamily}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorFontFamily(val);
                            localStorage.setItem("editor_fontFamily", val);
                          }}
                        >
                          <option value="Fira Code, JetBrains Mono, monospace">Fira Code</option>
                          <option value="JetBrains Mono, Fira Code, monospace">JetBrains Mono</option>
                          <option value="Source Code Pro, Fira Code, monospace">Source Code Pro</option>
                          <option value="Comic Mono, Courier New, monospace">Comic Mono</option>
                          <option value="Courier New, monospace">Courier New</option>
                          <option value="Consolas, Menlo, Monaco, monospace">System Default</option>
                        </select>
                      </div>

                      <div className="setting-group">
                        <label htmlFor="editor-fontsize-input">Font Size: <span className="val-text">{editorFontSize}px</span></label>
                        <div className="slider-wrapper">
                          <input
                            id="editor-fontsize-input"
                            type="range"
                            min="12"
                            max="24"
                            step="1"
                            value={editorFontSize}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setEditorFontSize(val);
                              localStorage.setItem("editor_fontSize", val);
                            }}
                            className="ce-range-slider"
                          />
                        </div>
                      </div>

                      <div className="setting-group">
                        <label htmlFor="editor-cursorstyle-select">Cursor Style</label>
                        <select
                          id="editor-cursorstyle-select"
                          className="ce-select-box"
                          value={editorCursorStyle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorCursorStyle(val);
                            localStorage.setItem("editor_cursorStyle", val);
                          }}
                        >
                          <option value="line">Line (Default)</option>
                          <option value="block">Block</option>
                          <option value="underline">Underline</option>
                          <option value="line-thin">Line Thin</option>
                          <option value="underline-thin">Underline Thin</option>
                        </select>
                      </div>

                      <div className="setting-group">
                        <label htmlFor="editor-cursorblinking-select">Cursor Blinking</label>
                        <select
                          id="editor-cursorblinking-select"
                          className="ce-select-box"
                          value={editorCursorBlinking}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorCursorBlinking(val);
                            localStorage.setItem("editor_cursorBlinking", val);
                          }}
                        >
                          <option value="blink">Blink</option>
                          <option value="smooth">Smooth</option>
                          <option value="phase">Phase</option>
                          <option value="expand">Expand</option>
                          <option value="solid">Solid</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-section">
                      <span className="settings-section-title">Code Formatting & IntelliSense</span>

                      <div className="setting-group">
                        <label htmlFor="editor-tabsize-select">Tab Size</label>
                        <select
                          id="editor-tabsize-select"
                          className="ce-select-box"
                          value={editorTabSize}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setEditorTabSize(val);
                            localStorage.setItem("editor_tabSize", val);
                          }}
                        >
                          <option value={2}>2 Spaces</option>
                          <option value={4}>4 Spaces</option>
                          <option value={8}>8 Spaces</option>
                        </select>
                      </div>

                      <div className="setting-group">
                        <label htmlFor="editor-suggestions-select">IntelliSense Autocomplete</label>
                        <select
                          id="editor-suggestions-select"
                          className="ce-select-box"
                          value={editorSuggestions}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorSuggestions(val);
                            localStorage.setItem("editor_suggestions", val);
                          }}
                        >
                          <option value="standard">Standard Autocomplete</option>
                          <option value="ai">AI IntelliSense (Tab-Complete)</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-section">
                      <span className="settings-section-title">Editor Features & Save</span>

                      <div className="setting-group">
                        <label htmlFor="editor-autosave-select">Auto-Save Frequency</label>
                        <select
                          id="editor-autosave-select"
                          className="ce-select-box"
                          value={editorAutoSave}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorAutoSave(val);
                            localStorage.setItem("editor_autoSave", val);
                          }}
                        >
                          <option value="off">Disabled (Manual Save)</option>
                          <option value="5">Every 5 Seconds</option>
                          <option value="10">Every 10 Seconds</option>
                          <option value="30">Every 30 Seconds</option>
                          <option value="60">Every 1 Minute</option>
                        </select>
                      </div>

                      <div className="setting-toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">Bracket Colorization</span>
                          <span className="toggle-desc">Colorize nested bracket pairs</span>
                        </div>
                        <label className="ce-switch">
                          <input
                            type="checkbox"
                            checked={editorBracketColorization}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setEditorBracketColorization(val);
                              localStorage.setItem("editor_bracketColorization", val);
                            }}
                          />
                          <span className="ce-switch-slider" />
                        </label>
                      </div>

                      <div className="setting-toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">Minimap Preview</span>
                          <span className="toggle-desc">Show mini outline of file</span>
                        </div>
                        <label className="ce-switch">
                          <input
                            type="checkbox"
                            checked={editorShowMinimap}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setEditorShowMinimap(val);
                              localStorage.setItem("editor_minimap", val);
                            }}
                          />
                          <span className="ce-switch-slider" />
                        </label>
                      </div>

                      <div className="setting-toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">Word Wrap</span>
                          <span className="toggle-desc">Wrap lines exceeding editor width</span>
                        </div>
                        <label className="ce-switch">
                          <input
                            type="checkbox"
                            checked={editorWordWrap === "on"}
                            onChange={(e) => {
                              const val = e.target.checked ? "on" : "off";
                              setEditorWordWrap(val);
                              localStorage.setItem("editor_wordWrap", val);
                            }}
                          />
                          <span className="ce-switch-slider" />
                        </label>
                      </div>

                      <div className="setting-toggle-row">
                        <div className="toggle-info">
                          <span className="toggle-label">Line Numbers</span>
                          <span className="toggle-desc">Show line numbering indicators</span>
                        </div>
                        <label className="ce-switch">
                          <input
                            type="checkbox"
                            checked={editorLineNumbers === "on"}
                            onChange={(e) => {
                              const val = e.target.checked ? "on" : "off";
                              setEditorLineNumbers(val);
                              localStorage.setItem("editor_lineNumbers", val);
                            }}
                          />
                          <span className="ce-switch-slider" />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
          {!leftSidebarCollapsed && (
            <div className="sidebar-drag-divider" onMouseDown={startSidebarResizing} />
          )}

          {/* 3. MAIN WORKSPACE CONTAINER */}
          <main className="ce-main-workspace" ref={containerRef}>

            {/* Editor Header / Toolbars */}
            <div className="workspace-editor-header">
              <div className="workspace-editor-tabs" role="tablist">
                {tabs.map((tab) => {
                  const isActive = layoutMode !== "planner" && String(tab._id) === String(activeFileId);
                  const iconInfo = getFileIconInfo(tab.name);
                  return (
                    <div
                      key={tab._id}
                      role="tab"
                      aria-selected={isActive}
                      className={`ce-editor-tab ${isActive ? "active" : ""}`}
                      onClick={() => handleFileSelect(tab._id, tab)}
                      onMouseDown={(e) => {
                        // Middle click (wheel click) closes tab like in VS Code
                        if (e.button === 1) {
                          e.preventDefault();
                          handleCloseTab(e, tab._id);
                        }
                      }}
                      title={`${tab.name} (Middle click to close)`}
                    >
                      {iconInfo.isImage ? (
                        <ImageIcon size={13} className="ce-tab-icon" style={{ color: iconInfo.color, flexShrink: 0 }} />
                      ) : (
                        <FileCode size={13} className="ce-tab-icon" style={{ color: iconInfo.color, flexShrink: 0 }} />
                      )}
                      <span className="ce-tab-name-text">
                        {tab.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCloseTab(e, tab._id)}
                        className="ce-tab-close-btn"
                        title="Close"
                        aria-label={`Close ${tab.name}`}
                      >
                        <X size={13} strokeWidth={2.2} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Editor Top Toolbar */}
              <div className="editor-controls-toolbar">
                {/* Layout Switcher */}
                <div className="layout-switcher-group">
                  <button
                    type="button"
                    className={`layout-switcher-btn ${layoutMode === "editor" ? "active" : ""}`}
                    onClick={() => changeLayoutMode("editor")}
                    title="Code Editor Fullscreen"
                  >
                    <Code2 size={12} />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    className={`layout-switcher-btn ${layoutMode === "split" ? "active" : ""}`}
                    onClick={() => changeLayoutMode("split")}
                    title={room?.language === "html" ? "Split view (Editor + Preview)" : "Split view (Editor + Board)"}
                  >
                    <Layers size={12} />
                    <span>Split</span>
                  </button>
                  {room?.language === "html" && (
                    <button
                      type="button"
                      className={`layout-switcher-btn ${layoutMode === "preview" ? "active" : ""}`}
                      onClick={() => changeLayoutMode("preview")}
                      title="Web Preview Fullscreen"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={`layout-switcher-btn ${layoutMode === "whiteboard" ? "active" : ""}`}
                    onClick={() => changeLayoutMode("whiteboard")}
                    title="Whiteboard Fullscreen"
                  >
                    <Palette size={12} />
                    <span>Board</span>
                  </button>

                </div>

                <button
                  className={`btn-fullscreen-toggle ${isFullscreen ? "active" : ""}`}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                {/* Top Header Toolbar Right Sidebar Collapse/Expand Button */}
                <button
                  type="button"
                  className={`btn-sidebar-toggle ${rightSidebarCollapsed ? "collapsed" : "active"}`}
                  onClick={() => toggleRightSidebar()}
                  title={rightSidebarCollapsed ? "Expand Chat & Participants Panel (◀)" : "Collapse Chat & Participants Panel (▶)"}
                  aria-label={rightSidebarCollapsed ? "Expand Right Sidebar" : "Collapse Right Sidebar"}
                >
                  {rightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>


              </div>
            </div>

            {/* Splittable Monaco & Whiteboard Drawing Space */}
            <div className="workspace-render-split">
              <div
                className="monaco-pane"
                style={{
                  width: layoutMode === "editor" ? "100%" : (layoutMode === "whiteboard" || layoutMode === "planner" || layoutMode === "preview") ? "0%" : `${splitPercent}%`,
                  display: (layoutMode === "whiteboard" || layoutMode === "planner" || layoutMode === "preview") ? "none" : "block"
                }}
              >
                <div className="ce-editor-pane-container" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  {activeFileId && explorerPath.length > 0 && (
                    <div className="ce-breadcrumbs-bar" style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="ce-breadcrumbs-room">{room?.title || "Workspace"}</span>
                        {explorerPath.map((item) => (
                          <span key={item._id} className="ce-breadcrumbs-item-wrapper" style={{ display: "inline-flex", alignItems: "center" }}>
                            <ChevronRight size={12} className="ce-breadcrumbs-separator" style={{ margin: "0 4px" }} />
                            <span className={`ce-breadcrumbs-item ${item.type === "folder" ? "is-folder" : "is-file"}`}>
                              {item.type === "folder" ? (
                                <FolderOpen size={12} className="ce-breadcrumbs-icon folder" style={{ color: "#fca035", marginRight: "4px" }} />
                              ) : (
                                <FileCode size={12} className="ce-breadcrumbs-icon file" style={{ color: getFileIconInfo(item.name).color, marginRight: "4px" }} />
                              )}
                              {item.name}
                            </span>
                          </span>
                        ))}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", paddingRight: "8px" }}>
                        {isMemberReadOnly && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.7rem", color: "#fca5a5", marginRight: "8px" }}>
                            <Lock size={12} /> Read-only (created by {creatorUsername})
                          </span>
                        )}


                      </div>
                    </div>
                  )}
                  {activeFileId ? (
                    isImageFile ? (
                      <ImagePreviewPane file={activeFileObj} roomId={roomId} />
                    ) : (
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <MonacoEditor
                          height="100%"
                          theme={editorTheme === "light" ? "custom-light" : "custom-dark"}
                          language={editorLanguage}
                          value={activeFileId ? undefined : code}
                          onChange={activeFileId ? undefined : handleEditorChange}
                          onMount={handleEditorMount}
                        loading={
                          <div className="ce-monaco-skeleton-loader">
                            <div className="ce-monaco-skeleton-line" style={{ width: "35%" }} />
                            <div className="ce-monaco-skeleton-line" style={{ width: "55%" }} />
                            <div className="ce-monaco-skeleton-line" style={{ width: "75%" }} />
                            <div className="ce-monaco-skeleton-line" style={{ width: "45%" }} />
                            <div className="ce-monaco-skeleton-line" style={{ width: "65%" }} />
                            <div className="ce-monaco-skeleton-line" style={{ width: "40%" }} />
                            <div className="ce-monaco-skeleton-spinner">
                              <div className="ce-monaco-spinner-dot" />
                              <span>Booting Monaco IDE...</span>
                            </div>
                          </div>
                        }
                        options={{
                          readOnly: isEditorReadOnly,
                          fontSize: isMobileScreen ? Math.min(editorFontSize || 13, 12) : (editorFontSize || 13),
                          fontFamily: editorFontFamily || "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Source Code Pro', Consolas, monospace",
                          fontLigatures: true,
                          fontWeight: "400",
                          lineHeight: 19,
                          mouseWheelZoom: true,
                          minimap: { enabled: !isMobileScreen && editorShowMinimap },
                          tabSize: editorTabSize,
                          wordWrap: isMobileScreen ? "on" : editorWordWrap,
                          lineNumbers: editorLineNumbers,
                          quickSuggestions: editorSuggestions === "disabled" ? false : { other: true, comments: true, strings: true },
                          suggestOnTriggerCharacters: editorSuggestions !== "disabled",
                          acceptSuggestionOnEnter: editorSuggestions === "ai" ? "on" : "smart",
                          snippetSuggestions: editorSuggestions === "disabled" ? "none" : "inline",
                          detectIndentation: false,
                          automaticLayout: true,
                          glyphMargin: false,
                          lineDecorationsWidth: 5,
                          lineNumbersMinChars: 3,
                          scrollbar: {
                            verticalScrollbarSize: 6,
                            horizontalScrollbarSize: 6
                          },
                          cursorBlinking: editorCursorBlinking,
                          cursorStyle: editorCursorStyle,
                          cursorWidth: editorCursorStyle === "line" ? 2 : undefined,
                          bracketPairColorization: { enabled: editorBracketColorization }
                        }}
                      />
                    </div>
                  )
                ) : (
                    <div className="vscode-welcome-screen" style={{ flex: 1 }}>
                      <div className="welcome-inner">
                        <div className="welcome-header">
                          <div className="welcome-logo">
                            <img src="/logo.png" alt="Logo" style={{ width: 40, height: 40, objectFit: "contain" }} />
                          </div>
                          <h1 className="welcome-title">CodeExpo Workspace</h1>
                          <p className="welcome-subtitle">A professional collaborative editor sandboxed in Docker</p>
                        </div>

                        <div className="welcome-sections-grid">
                          {room?.description && room.description.trim() ? (
                            <div className="welcome-section-card welcome-room-desc-card">
                              <h3 className="section-card-title">
                                <FileText size={14} style={{ marginRight: "6px", color: "var(--ce-accent, #818cf8)" }} /> Room Description
                              </h3>
                              <p className="welcome-room-desc-content">
                                {room.description}
                              </p>
                            </div>
                          ) : null}

                          <div className="welcome-section-card">
                            <h3 className="section-card-title">
                              <Sparkles size={14} style={{ marginRight: "6px" }} /> Start
                            </h3>
                            <ul className="welcome-actions-list">
                              <li onClick={handleCreateFileFromWelcome}>
                                <span className="action-icon"><FileCode size={14} /></span>
                                <span className="action-text">New File...</span>
                              </li>
                              <li onClick={handleCreateFolderFromWelcome}>
                                <span className="action-icon"><FolderOpen size={14} /></span>
                                <span className="action-text">New Folder...</span>
                              </li>
                              <li onClick={() => setIsImportModalOpen(true)}>
                                <span className="action-icon"><Upload size={14} /></span>
                                <span className="action-text">Import Files...</span>
                              </li>
                            </ul>
                          </div>

                          <div className="welcome-section-card">
                            <h3 className="section-card-title">
                              <Terminal size={14} style={{ marginRight: "6px" }} /> Workspace Status
                            </h3>
                            <div className="workspace-status-details">
                              <div className="status-row">
                                <span className="status-label">Room ID:</span>
                                <span className="status-value">{roomId}</span>
                              </div>
                              <div className="status-row">
                                <span className="status-label">Active Users:</span>
                                <span className="status-value">{users.length} connected</span>
                              </div>
                              <div className="status-row">
                                <span className="status-label">Sandbox:</span>
                                <span className="status-value secure-badge">Network Isolated, Read-only OS</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="welcome-help-footer">
                          <p>💡 Tip: Use the explorer on the left to add, rename, drag-and-drop, or delete files.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Draggable Divider Handle */}
              {layoutMode === "split" && (
                <div className="workspace-drag-divider" onMouseDown={startWorkspaceResizing}>
                  <div className="divider-line" />
                </div>
              )}

              {/* Collaborative Whiteboard Split Pane */}
              {(layoutMode !== "editor" && layoutMode !== "planner" || mobileTab === "whiteboard") && (
                <div
                  className={room?.language === "html" && (layoutMode === "split" || layoutMode === "preview") ? "preview-pane" : "whiteboard-pane"}
                  style={{ width: (layoutMode === "whiteboard" || layoutMode === "preview") ? "100%" : `${100 - splitPercent}%`, height: "100%" }}
                >
                  {room?.language === "html" && (layoutMode === "split" || layoutMode === "preview") ? (
                    <LivePreview
                      roomId={roomId}
                      workspaceItems={workspaceItems}
                      tabs={tabs}
                      activeCode={code}
                      activeFileId={activeFileId}
                    />
                  ) : (
                    <Whiteboard
                      roomId={roomId}
                      activeUsers={users}
                      currentUser={user}
                      room={room}
                    />
                  )}
                </div>
              )}

              {/* Collaborative Task Planner Pane */}
              {layoutMode === "planner" && (
                <div
                  className="planner-pane"
                  style={{ width: "100%", height: "100%", background: "#0b0b0e", overflowY: "auto" }}
                >
                  <TaskPlanner roomId={roomId} />
                </div>
              )}
            </div>

            {/* Drag Resize Handle for bottom panel */}
            {isConsoleOpen && (
              <div className="console-drag-handle" onMouseDown={startConsoleResizing} />
            )}

            {/* 6. BOTTOM CONSOLE PANEL */}
            <div className="ce-console-panel" style={{ height: isConsoleOpen ? `${consoleHeight}px` : "36px" }}>
              <div className="console-tab-header">
                <div className="console-tabs">
                  <button
                    className={`console-tab-btn tab-output ${consoleTab === "output" ? "active" : ""}`}
                    onClick={() => handleConsoleTabClick("output")}
                  >
                    <Laptop size={13} className="console-tab-icon tab-icon-output" />
                    <span>Output</span>
                  </button>
                  <button
                    className={`console-tab-btn tab-input ${consoleTab === "input" ? "active" : ""}`}
                    onClick={() => handleConsoleTabClick("input")}
                  >
                    <FileText size={13} className="console-tab-icon tab-icon-input" />
                    <span>Input</span>
                  </button>
                  <button
                    className={`console-tab-btn tab-logs ${consoleTab === "console" ? "active" : ""}`}
                    onClick={() => handleConsoleTabClick("console")}
                  >
                    <Activity size={13} className="console-tab-icon tab-icon-logs" />
                    <span>Execution Logs</span>
                  </button>
                  <button
                    className={`console-tab-btn tab-ai-history ${consoleTab === "ai-history" ? "active" : ""}`}
                    onClick={() => handleConsoleTabClick("ai-history")}
                  >
                    <History size={13} className="console-tab-icon tab-icon-history" />
                    <span>AI History</span>
                  </button>
                  <button
                    type="button"
                    className={`console-tab-btn ce-btn-ai-copilot-tab ${isAIPanelOpen ? "active" : ""}`}
                    onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                    title="Open ExpoAI Copilot Assistant"
                  >
                    <Sparkles size={13} className="sparkle-pulse tab-icon-copilot" />
                    <span>ExpoAI Copilot</span>
                  </button>
                </div>

                <div className="console-actions">
                  {currentUserRole !== "VIEWER" && (
                    <>
                      <button className="ce-btn-save" onClick={handleSaveCode} title="Save file content">
                        <Download size={13} />
                        <span>Save</span>
                      </button>
                      {isTerminalExecuting ? (
                        <button
                          type="button"
                          className="ce-btn-run running-stop-btn"
                          onClick={handleStopCodeExecution}
                          title="Click to Stop Code Execution"
                          style={{
                            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "#ffffff",
                            borderColor: "#b91c1c",
                            boxShadow: "0 0 12px rgba(239, 68, 68, 0.4)",
                            cursor: "pointer"
                          }}
                        >
                          <Square size={12} style={{ fill: "#ffffff" }} />
                          <span>Stop Execution</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`ce-btn-run ${runCooldownSeconds > 0 ? "cooldown" : ""}`}
                          onClick={handleRunCode}
                          disabled={runCooldownSeconds > 0}
                        >
                          <Play size={13} />
                          <span>
                            {runCooldownSeconds > 0
                              ? `Wait ${runCooldownSeconds}s`
                              : "Run Program"}
                          </span>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className={`ce-console-toggle-btn ${!isConsoleOpen ? "collapsed-pulse" : "expanded"}`}
                    onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                    title={isConsoleOpen ? "Collapse Panel" : "Expand Panel"}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="console-tab-body">

                {consoleTab === "output" && (
                  <div className="terminal-shell-container">
                    <pre className="terminal-output-pre">
                      {terminalOutput || "Output ready. Trigger 'Run Program' above to capture outputs."}
                    </pre>
                    <div ref={terminalEndRef} />
                  </div>
                )}

                {consoleTab === "input" && (
                  <div className="console-stdin-container">
                    <textarea
                      className="console-stdin-textarea"
                      value={programInput}
                      onChange={(e) => setProgramInput(e.target.value)}
                      placeholder="Type your program inputs here (one per line, e.g. for C++ cin or Python input)..."
                    />
                  </div>
                )}

                {consoleTab === "console" && (
                  <div className="execution-logs-view">
                    <div className="logs-list">
                      <div className="log-row success">
                        <span className="log-type-tag">SUCCESS</span>
                        <span className="log-text">Socket connection established. Listening to real-time events.</span>
                      </div>
                      <div className="log-row info">
                        <span className="log-type-tag">SYSTEM</span>
                        <span className="log-text">Monaco Editor loaded language definitions for {room.language}.</span>
                      </div>
                      {terminalOutput && (
                        <div className="log-row info">
                          <span className="log-type-tag">DIAG</span>
                          <span className="log-text">Interactive execution triggered. See Terminal Output.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {consoleTab === "ai-history" && (
                  <AIHistoryTab roomId={roomId} />
                )}
              </div>
            </div>
          </main>

          {/* Mobile Backdrop Overlay when Right Sidebar is Expanded on Phone Viewports */}
          {!rightSidebarCollapsed && isMobileScreen && (
            <div
              className="ce-right-sidebar-mobile-backdrop"
              onClick={() => toggleRightSidebar(true)}
            />
          )}

          {/* 5. RIGHT SIDEBAR WRAPPER */}
          <div className={`ce-right-sidebar-wrapper ${rightSidebarCollapsed ? "collapsed" : ""}`}>
            {/* 5. RIGHT SIDEBAR */}
            <aside className="ce-right-sidebar">
              <div className="right-sidebar-content">

                {/* Mobile Only Chat Top Header Bar: Connected status & User avatar dropdown */}
                <div className="ce-mobile-chat-header">
                  <div
                    className="ce-mobile-chat-status"
                    onClick={() => setMobileOnlineDropdownOpen(!mobileOnlineDropdownOpen)}
                    style={{ cursor: "pointer" }}
                    title={mobileOnlineDropdownOpen ? "Hide online connected users" : "View online connected users"}
                  >
                    <span className="ce-status-dot online" />
                    <span className="ce-status-text">Live</span>
                  </div>

                  <button
                    type="button"
                    className="ce-mobile-user-pill-btn"
                    onClick={() => setMobileOnlineDropdownOpen(!mobileOnlineDropdownOpen)}
                    title={mobileOnlineDropdownOpen ? "Hide online connected users" : "View online connected users"}
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.username} className="ce-user-pill-avatar" />
                    ) : (
                      <div className="ce-user-pill-initial" style={{ backgroundColor: getCursorColor(user?.username) }}>
                        {user?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <ChevronDown
                      size={14}
                      style={{
                        transform: mobileOnlineDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease"
                      }}
                    />
                  </button>
                </div>

                {/* Mobile Connected Users Dropdown (Phone Mode Only) */}
                {mobileOnlineDropdownOpen && (
                  <div className="participants-dropdown-container ce-mobile-connected-dropdown" style={{ margin: "0 10px 10px 10px", borderRadius: "10px", border: "1px solid var(--ce-border)" }}>
                    <div className="section-header-row" style={{ padding: "6px 10px", borderBottom: "1px solid var(--ce-border)" }}>
                      <div className="participants-title-group">
                        <span className="presence-badge online" style={{ width: "8px", height: "8px", position: "static", transform: "none", display: "inline-block" }} />
                        <h3 className="participants-heading" style={{ fontSize: "0.72rem" }}>ONLINE CONNECTED USERS</h3>
                        <span className="participants-count-pill">
                          {(room?.participants || []).filter((p) => p?.user && users.some((u) => String(u.userId) === String(p.user._id || p.user))).length}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="search-box-clear"
                        onClick={() => setMobileOnlineDropdownOpen(false)}
                        title="Close"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Integrated Search Input Bar */}
                    <div className="room-participant-search-box" style={{ margin: "8px" }}>
                      <Search size={13} className="search-box-icon" />
                      <input
                        type="text"
                        placeholder="Search online users..."
                        value={mobileConnectedSearchQuery}
                        onChange={(e) => setMobileConnectedSearchQuery(e.target.value)}
                        className="search-box-input"
                        autoFocus
                      />
                      {mobileConnectedSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMobileConnectedSearchQuery("")}
                          className="search-box-clear"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Detailed Online Connected Users List */}
                    <div className="users-list-pane" style={{ maxHeight: "200px", overflowY: "auto", padding: "0 8px 8px 8px" }}>
                      {(() => {
                        const allRoomParts = room?.participants || [];
                        const onlineFiltered = allRoomParts.filter((p) => {
                          if (!p || !p.user) return false;
                          const targetUserId = p.user._id || p.user;
                          const isOnline = users.some((u) => String(u.userId) === String(targetUserId));
                          const uname = (p.user.username || "").toLowerCase();
                          return isOnline && uname.includes(mobileConnectedSearchQuery.toLowerCase());
                        });

                        if (onlineFiltered.length === 0) {
                          return (
                            <div style={{ padding: "12px 8px", textAlign: "center", fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                              {mobileConnectedSearchQuery ? `No online users matching "${mobileConnectedSearchQuery}"` : "No connected users online"}
                            </div>
                          );
                        }

                        return onlineFiltered.map((p) => {
                          if (!p || !p.user) return null;
                          const targetUserId = p.user._id || p.user;
                          const isSelf = String(targetUserId) === String(user?.id || user?._id);
                          const isTargetPrivileged = p.role === "OWNER" || p.role === "MODERATOR";
                          const canIControlTarget = (currentUserRole === "OWNER" || currentUserRole === "MODERATOR") && !isTargetPrivileged && !isSelf;

                          return (
                            <div
                              key={p._id || targetUserId}
                              className={`user-pane-item ${canIControlTarget ? "manageable" : ""}`}
                              onContextMenu={(e) => handleContextMenu(e, p)}
                              onClick={(e) => handleUserRowClick(e, p)}
                              style={{ cursor: canIControlTarget ? "pointer" : "default" }}
                            >
                              <div className="user-avatar-wrapper">
                                {p.user.avatar ? (
                                  <img src={p.user.avatar} alt={p.user.username} className="user-pane-avatar" style={{ objectFit: "cover" }} />
                                ) : (
                                  <div className="user-pane-avatar" style={{ backgroundColor: getCursorColor(p.user.username) }}>
                                    {p.user.username?.charAt(0)?.toUpperCase() || "U"}
                                  </div>
                                )}
                                <span className="presence-badge online" title="Online" />
                              </div>

                              <div className="user-pane-info">
                                <div className="user-pane-row">
                                  <span className="username-text" title={p.user.username}>{p.user.username}</span>
                                  {isSelf && <span className="label-you">you</span>}
                                </div>
                                <div className="user-pane-row">
                                  {p.role === "OWNER" && <span className="role-badge owner-badge">👑 Owner</span>}
                                  {p.role === "MODERATOR" && <span className="role-badge moderator-badge">🛡️ Mod</span>}
                                  {p.role === "MEMBER" && <span className="role-badge member-badge">👤 Member</span>}
                                  {p.role === "VIEWER" && <span className="role-badge viewer-badge">👀 Viewer</span>}
                                </div>
                              </div>

                              <div className="user-pane-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {(p.isSpeaking || (!p.isMuted && p.isAudioActive)) && (
                                  <div className="ce-audio-wave-bars" title="Speaking">
                                    <span className="wave-bar" />
                                    <span className="wave-bar" />
                                    <span className="wave-bar" />
                                  </div>
                                )}
                                {p.isMuted && <MicOff size={12} className="muted-icon" title="Muted" />}
                                {canIControlTarget && (
                                  <button
                                    type="button"
                                    className="user-row-more-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContextMenu(e, p);
                                    }}
                                    title="User options"
                                  >
                                    <MoreVertical size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Section 1: Room Participants */}
                <section className="ce-right-section participants-section-card">
                  <div
                    className="section-header-row"
                    onClick={() => setRoomParticipantsExpanded(!roomParticipantsExpanded)}
                    style={{ cursor: "pointer" }}
                    title={roomParticipantsExpanded ? "Click to collapse online participants" : "Click to view online participants"}
                  >
                    <div className="participants-title-group">
                      <h3 className="participants-heading">PARTICIPANTS</h3>
                      <span className="participants-count-pill">{(room?.participants || []).length}</span>
                    </div>

                    <div className="participants-header-actions" onClick={(e) => e.stopPropagation()}>
                      {/* Overlapping 3-User Avatar Bubble Stack Toggle */}
                      <div
                        className={`room-avatar-stack-pill ${roomParticipantsExpanded ? "active" : ""}`}
                        onClick={() => setRoomParticipantsExpanded(!roomParticipantsExpanded)}
                        title={roomParticipantsExpanded ? "Click to collapse participant details" : "Click to view participant details"}
                      >
                        <div className="room-avatar-stack">
                          {(room?.participants || []).slice(0, 3).map((p, idx) => {
                            if (!p || !p.user) return null;
                            const uname = p.user.username || "U";
                            const letter = uname.charAt(0).toUpperCase();
                            const bgCol = getCursorColor(uname);

                            return (
                              <div
                                key={p._id || idx}
                                className="stack-avatar-circle"
                                style={{
                                  zIndex: 3 - idx,
                                  marginLeft: idx > 0 ? "-7px" : "0"
                                }}
                              >
                                {p.user.avatar ? (
                                  <img src={p.user.avatar} alt={uname} />
                                ) : (
                                  <div className="stack-avatar-initial" style={{ backgroundColor: bgCol }}>
                                    {letter}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(room?.participants || []).length > 3 && (
                            <div className="stack-avatar-circle count-badge" style={{ zIndex: 0, marginLeft: "-7px" }}>
                              +{(room?.participants || []).length - 3}
                            </div>
                          )}
                        </div>
                        <ChevronDown
                          size={12}
                          style={{
                            transform: roomParticipantsExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                            marginLeft: "3px",
                            color: "var(--ce-text-muted)"
                          }}
                        />
                      </div>

                      {/* Search Icon Toggle Button */}
                      <button
                        type="button"
                        className={`ce-btn-xs ${roomParticipantsExpanded ? "active-search-btn" : ""}`}
                        onClick={() => setRoomParticipantsExpanded(!roomParticipantsExpanded)}
                        title="Search Participants"
                        style={{ padding: "4px 7px" }}
                      >
                        <Search size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Participant Details (Search Bar + Participant Cards) */}
                  {roomParticipantsExpanded && (
                    <div className="participants-dropdown-container">
                      {/* Integrated Search Input Bar */}
                      <div className="room-participant-search-box">
                        <Search size={13} className="search-box-icon" />
                        <input
                          type="text"
                          placeholder="Search participants..."
                          value={roomParticipantSearchQuery}
                          onChange={(e) => setRoomParticipantSearchQuery(e.target.value)}
                          className="search-box-input"
                          autoFocus
                        />
                        {roomParticipantSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setRoomParticipantSearchQuery("")}
                            className="search-box-clear"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Detailed Participants List */}
                      <div className="users-list-pane">
                        {(() => {
                          const allRoomParts = room?.participants || [];
                          const filtered = allRoomParts.filter((p) => {
                            if (!p || !p.user) return false;
                            const uname = (p.user.username || "").toLowerCase();
                            return uname.includes(roomParticipantSearchQuery.toLowerCase());
                          });

                          if (filtered.length === 0) {
                            return (
                              <div style={{ padding: "12px 8px", textAlign: "center", fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                                No room participants found matching "{roomParticipantSearchQuery}"
                              </div>
                            );
                          }

                          return filtered.map((p) => {
                            if (!p || !p.user) return null;
                            const targetUserId = p.user._id || p.user;
                            const online = users.some(u => String(u.userId) === String(targetUserId));
                            const isSelf = String(targetUserId) === String(user?.id);

                            const isTargetPrivileged = p.role === "OWNER" || p.role === "MODERATOR";
                            const canIControlTarget = (currentUserRole === "OWNER" || currentUserRole === "MODERATOR") && !isTargetPrivileged && !isSelf;

                            return (
                              <div
                                key={p._id}
                                className={`user-pane-item ${canIControlTarget ? "manageable" : ""}`}
                                onContextMenu={(e) => handleContextMenu(e, p)}
                                onClick={(e) => handleUserRowClick(e, p)}
                                style={{ cursor: canIControlTarget ? "pointer" : "default" }}
                              >
                                {/* Left Column: Avatar & Presence Dot */}
                                <div className="user-avatar-wrapper">
                                  {p.user.avatar ? (
                                    <img src={p.user.avatar} alt={p.user.username} className="user-pane-avatar" style={{ objectFit: "cover" }} />
                                  ) : (
                                    <div className="user-pane-avatar" style={{ backgroundColor: getCursorColor(p.user.username) }}>
                                      {p.user.username?.charAt(0)?.toUpperCase() || "U"}
                                    </div>
                                  )}
                                  <span className={`presence-badge ${online ? "online" : "offline"}`} title={online ? "Online" : "Offline"} />
                                </div>

                                {/* Center Column: Name and Role stacked */}
                                <div className="user-pane-info">
                                  <div className="user-pane-row">
                                    <span className="username-text" title={p.user.username}>{p.user.username}</span>
                                    {isSelf && <span className="label-you">you</span>}
                                  </div>
                                  <div className="user-pane-row">
                                    {p.role === "OWNER" && <span className="role-badge owner-badge">👑 Owner</span>}
                                    {p.role === "MODERATOR" && <span className="role-badge moderator-badge">🛡️ Mod</span>}
                                    {p.role === "MEMBER" && <span className="role-badge member-badge">👤 Member</span>}
                                    {p.role === "VIEWER" && <span className="role-badge viewer-badge">👀 Viewer</span>}
                                  </div>
                                </div>

                                {/* Right Column: Actions, Speaking Animation, and Mute Status */}
                                <div className="user-pane-actions" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  {(p.isSpeaking || (!p.isMuted && online && p.isAudioActive)) && (
                                    <div className="ce-audio-wave-bars" title="Speaking">
                                      <span className="wave-bar" />
                                      <span className="wave-bar" />
                                      <span className="wave-bar" />
                                      <span className="wave-bar" />
                                    </div>
                                  )}
                                  {p.isMuted && (
                                    <span className="user-mute-status" title="Muted">
                                      <MicOff size={11} className="mute-icon-red" />
                                    </span>
                                  )}
                                  {!isSelf && (
                                    <button
                                      type="button"
                                      className="user-pane-more-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUserRowClick(e, p);
                                      }}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--ce-premium-muted)", marginRight: "10px" }}
                                      title="Options"
                                    >
                                      <MoreVertical size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </section>

                {/* Section 2: Join Requests */}
                {joinRequests.length > 0 && (
                  <section className="ce-right-section border-glow-warning">
                    <div className="section-header">
                      <h3 className="text-warning">JOIN REQUESTS ({joinRequests.length})</h3>
                    </div>
                    <div className="requests-container">
                      {joinRequests.map((req) => (
                        <div key={req.userId} className="request-pane-card">
                          <span className="request-username">{req.username}</span>
                          <div className="request-actions-row">
                            <button className="btn-accept ce-btn-xs" onClick={() => handleApproveRequest(req)}>
                              Accept
                            </button>
                            <button className="btn-reject ce-btn-xs" onClick={() => handleRejectRequest(req)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Section 3: Chat */}
                <section className="ce-right-section chat-section-wrapper">
                  {/* Scoped In-Box Delete Confirmation Overlay */}
                  {deleteConfirmMsgId && (
                    <div className="chat-inbox-delete-overlay">
                      <div className="chat-inbox-delete-card">
                        <div className="delete-card-header">
                          <Trash2 size={15} className="delete-card-icon" />
                          <span>Delete Chat Message?</span>
                        </div>
                        <p className="delete-card-desc">
                          Are you sure you want to delete this message? It will be removed from the chat history.
                        </p>
                        <div className="delete-card-actions">
                          <button
                            type="button"
                            className="delete-card-btn cancel"
                            onClick={() => setDeleteConfirmMsgId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="delete-card-btn confirm"
                            onClick={confirmDeleteMessage}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="chat-tabs-header">
                    <div className="chat-tab-triggers">
                      <button
                        className={`chat-tab-btn ${chatTab === "room" ? "active" : ""}`}
                        onClick={() => setChatTab("room")}
                      >
                        <span>Room</span>
                        {roomTabUnread && <span className="chat-tab-unread-dot" />}
                      </button>
                      <button
                        className={`chat-tab-btn ${chatTab === "private" ? "active" : ""}`}
                        onClick={() => setChatTab("private")}
                      >
                        <span>Direct Message</span>
                      </button>
                    </div>
                  </div>

                  {chatTab === "private" && (
                    <div className="private-recipient-selector">
                      <label htmlFor="private-recipient-select">To:</label>
                      <select
                        id="private-recipient-select"
                        className="ce-select-box sm"
                        value={privateRecipient}
                        onChange={(e) => setPrivateRecipient(e.target.value)}
                      >
                        {users
                          .filter((u) => u.userId !== user.id)
                          .map((u) => (
                            <option key={u.socketId} value={u.socketId}>
                              {u.username}
                            </option>
                          ))}
                        {users.filter((u) => u.userId !== user.id).length === 0 && (
                          <option value="">No other users online</option>
                        )}
                      </select>
                    </div>
                  )}

                  <div className="chat-messages-container" ref={chatMessagesContainerRef} onScroll={handleChatScroll}>
                    {chatTab === "room" ? (
                      messages.map((msg, idx) => {
                        const isSelf = String(msg.userId) === String(user.id) || msg.username === user.username;
                        const isPrivateMsg = msg.username && msg.username.includes("➔");
                        const canDelete = msg._id && (
                          String(msg.userId) === String(user.id) ||
                          msg.username === user.username ||
                          String(room?.createdBy?._id || room?.createdBy) === String(user.id)
                        );
                        return (
                          <div key={msg._id || idx} className={`chat-bubble-row ${isSelf ? "self" : ""}`}>
                            {!isSelf && (
                              <div className="chat-avatar-wrapper-circle">
                                {msg.sender?.avatar ? (
                                  <img src={msg.sender.avatar} alt={msg.username} className="chat-bubble-avatar-img" />
                                ) : (
                                  <div className="chat-bubble-avatar-initial" style={{ backgroundColor: getCursorColor(msg.username) }}>
                                    {(msg?.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="chat-bubble-content-wrapper">
                              {!isSelf && renderUsername(msg.username, isPrivateMsg)}
                              <div className="bubble-container-with-actions">
                                <div className={`bubble-content-box ${isPrivateMsg ? "private" : ""}`}>
                                  <span className="bubble-text">{msg.message}</span>
                                  <span className="bubble-time">{formatMessageTime(msg.createdAt)}</span>
                                </div>
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="msg-delete-btn"
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    title="Delete message"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                {!isSelf && (
                                  <div style={{ position: "relative" }}>
                                    <button
                                      type="button"
                                      className="msg-delete-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveWorkspaceMessageMenuId(activeWorkspaceMessageMenuId === msg._id ? null : msg._id);
                                      }}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--ce-premium-muted)" }}
                                      title="Options"
                                    >
                                      <MoreVertical size={12} />
                                    </button>
                                    {activeWorkspaceMessageMenuId === msg._id && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          right: 0,
                                          top: "100%",
                                          background: "#0d0d15",
                                          border: "1px solid var(--ce-border)",
                                          borderRadius: "6px",
                                          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                                          zIndex: 100,
                                          minWidth: "110px",
                                          display: "flex",
                                          flexDirection: "column",
                                          padding: "2px"
                                        }}
                                      >
                                        <button
                                          onClick={() => {
                                            setActiveWorkspaceMessageMenuId(null);
                                            const participantObj = room?.participants?.find(p => String(p.user?.username || p.username || "") === String(msg.username));
                                            const reportedUserObj = participantObj?.user || { _id: msg.userId, username: msg.username };
                                            setReportedTargetUser(reportedUserObj);
                                            setReportEvidenceType("MESSAGE");
                                            setReportEvidenceId(msg._id);
                                            setReportModalOpen(true);
                                          }}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ef4444",
                                            fontSize: "0.74rem",
                                            fontWeight: "600",
                                            padding: "6px 10px",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            width: "100%",
                                            borderRadius: "4px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px"
                                          }}
                                        >
                                          ⚠️ Report Msg
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {isSelf && (
                              <div className="chat-avatar-wrapper-circle">
                                {user?.avatar ? (
                                  <img src={user.avatar} alt="Me" className="chat-bubble-avatar-img" />
                                ) : (
                                  <div className="chat-bubble-avatar-initial self" style={{ backgroundColor: getCursorColor(user.username) }}>
                                    {(user?.username || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      privateMessages
                        .filter(
                          (msg) =>
                            msg.recipientSocketId === socket.id ||
                            msg.senderSocketId === socket.id ||
                            msg.recipientSocketId === privateRecipient
                        )
                        .map((msg, idx) => {
                          const isSelf = String(msg.userId) === String(user.id);
                          const isPrivateMsg = msg.username && msg.username.includes("➔");
                          const senderObject = room?.participants?.find((p) => String(p.user?._id || p.user) === String(msg.userId));
                          const canDelete = msg._id && (
                            String(msg.userId) === String(user.id) ||
                            msg.username === user.username ||
                            String(room?.createdBy?._id || room?.createdBy) === String(user.id)
                          );
                          return (
                            <div key={idx} className={`chat-bubble-row ${isSelf ? "self" : ""}`}>
                              {!isSelf && (
                                <div className="chat-avatar-wrapper-circle">
                                  {senderObject?.user?.avatar ? (
                                    <img src={senderObject.user.avatar} alt={msg.username} className="chat-bubble-avatar-img" />
                                  ) : (
                                    <div className="chat-bubble-avatar-initial" style={{ backgroundColor: getCursorColor(msg.username) }}>
                                      {(msg?.username || "U").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="chat-bubble-content-wrapper">
                                {!isSelf && renderUsername(msg.username, isPrivateMsg)}
                                <div className="bubble-container-with-actions">
                                  <div className="bubble-content-box private">
                                    <span className="bubble-text">{msg.message}</span>
                                    <span className="bubble-time">{formatMessageTime(msg.createdAt)}</span>
                                  </div>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      className="msg-delete-btn"
                                      onClick={() => handleDeleteMessage(msg._id)}
                                      title="Delete message"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                  {!isSelf && (
                                    <div style={{ position: "relative" }}>
                                      <button
                                        type="button"
                                        className="msg-delete-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveWorkspaceMessageMenuId(activeWorkspaceMessageMenuId === msg._id ? null : msg._id);
                                        }}
                                        style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "none", cursor: "pointer", color: "var(--ce-premium-muted)" }}
                                        title="Options"
                                      >
                                        <MoreVertical size={12} />
                                      </button>
                                      {activeWorkspaceMessageMenuId === msg._id && (
                                        <div
                                          style={{
                                            position: "absolute",
                                            right: 0,
                                            top: "calc(100% + 4px)",
                                            background: "rgba(10, 10, 18, 0.96)",
                                            backdropFilter: "blur(16px)",
                                            border: "1px solid var(--ce-border)",
                                            borderRadius: "6px",
                                            boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                                            zIndex: 1000,
                                            minWidth: "125px",
                                            width: "max-content",
                                            whiteSpace: "nowrap",
                                            display: "flex",
                                            flexDirection: "column",
                                            padding: "4px"
                                          }}
                                        >
                                          <button
                                            onClick={() => {
                                              setActiveWorkspaceMessageMenuId(null);
                                              const participantObj = room?.participants?.find(p => String(p.user?.username || p.username || "") === String(msg.username));
                                              const reportedUserObj = participantObj?.user || { _id: msg.userId, username: msg.username };
                                              setReportedTargetUser(reportedUserObj);
                                              setReportEvidenceType("MESSAGE");
                                              setReportEvidenceId(msg._id);
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
                                            ⚠️ Report Msg
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSelf && (
                                <div className="chat-avatar-wrapper-circle">
                                  {user?.avatar ? (
                                    <img src={user.avatar} alt="Me" className="chat-bubble-avatar-img" />
                                  ) : (
                                    <div className="chat-bubble-avatar-initial self" style={{ backgroundColor: getCursorColor(user.username) }}>
                                      {(user?.username || "U").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>

                  {unreadMessagesCount > 0 && (
                    <button
                      type="button"
                      className="chat-unread-messages-badge"
                      onClick={() => scrollToBottom("smooth")}
                    >
                      <ChevronDown size={14} />
                      <span>{unreadMessagesCount} new messages</span>
                    </button>
                  )}

                  <div className="chat-sticky-footer">
                    <input
                      type="text"
                      className="chat-input-box"
                      placeholder={chatTab === "private" ? "Type direct message..." : "Message room..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                      }}
                    />
                    <button className="chat-send-btn" onClick={sendMessage}>
                      <Send size={14} />
                    </button>
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>

        {/* Floating ExpoAI Assistant Drawer Widget */}
        {isAIPanelOpen && (
          <div
            className="floating-ai-assistant-drawer"
            style={{
              position: "fixed",
              bottom: isMobileScreen ? "56px" : "55px",
              right: isMobileScreen ? "0px" : "20px",
              top: isMobileScreen ? "52px" : "auto",
              left: isMobileScreen ? "0px" : "auto",
              width: isMobileScreen ? "100vw" : "390px",
              height: isMobileScreen ? "auto" : "560px",
              maxHeight: isMobileScreen ? "calc(100vh - 108px)" : "calc(100vh - 90px)",
              zIndex: 99999,
              borderRadius: isMobileScreen ? "0px" : "10px",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), 0 6px 20px rgba(0, 0, 0, 0.4)",
              border: isMobileScreen ? "none" : "1px solid rgba(255, 255, 255, 0.1)",
              overflow: "hidden",
              background: "#0d0d14",
              transform: isMobileScreen ? "none" : `translate(${aiPanelPos.x}px, ${aiPanelPos.y}px)`,
              transition: isAiDragging ? "none" : "transform 0.1s ease-out"
            }}
          >
            <AIAssistantPanel
              roomId={roomId}
              username={user?.username || "Developer"}
              selectedCode={selectedCode}
              fullCode={code}
              activeFileName={activeFile?.name || "active file"}
              language={room?.language || "javascript"}
              onReplaceCode={handleReplaceSelection}
              onInsertBelow={handleInsertBelowSelection}
              onUndoCode={handleUndoAIInsertion}
              isCollapsed={false}
              onToggleCollapse={() => setIsAIPanelOpen(false)}
              onClose={() => setIsAIPanelOpen(false)}
              onHeaderMouseDown={handleAiHeaderMouseDown}
              isDragging={isAiDragging}
            />
          </div>
        )}

        {/* Render notifications toast */}
        {notification && (
          <div className="ce-global-notification-toast">
            <Sparkles size={14} className="toast-spark" />
            <span style={{ marginRight: "8px" }}>{notification}</span>
            <button
              onClick={() => setNotification("")}
              className="toast-close-btn"
              title="Dismiss notification"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ce-text-muted)",
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                borderRadius: "4px",
                transition: "color 0.2s"
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Security Delete Room Modal */}
        <SecurityDeleteRoomModal
          isOpen={!!securityDeleteRoomTarget}
          onClose={() => setSecurityDeleteRoomTarget(null)}
          onConfirmDelete={executeSecurityRoomDeleteInEditor}
          roomTitle={securityDeleteRoomTarget?.title || room?.title || "Workspace"}
          roomId={securityDeleteRoomTarget?.id || roomId}
          isDeleting={isDeletingRoomTarget}
        />

        {/* Edit Room Modal */}
        <EditRoomModal
          isOpen={editRoomModalOpen}
          onClose={() => setEditRoomModalOpen(false)}
          room={room}
          onRoomUpdated={(updatedRoom) => {
            setRoom((prev) => (prev ? { ...prev, title: updatedRoom.title, isPrivate: updatedRoom.isPrivate, description: updatedRoom.description } : prev));
          }}
        />

        {/* Room Deleted Modal */}
        {roomDeletedModalOpen && createPortal(
          <div className="ce-modal-overlay">
            <div className="ce-modal-card warning-glow">
              <div className="modal-icon warning" style={{ width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245, 158, 11, 0.1)", color: "#fb923c", marginBottom: "8px" }}>
                <Trash2 size={32} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--ce-text)", marginBottom: "4px" }}>Room Deleted</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ce-text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>This room has been deleted by the owner.</p>
              <button className="ce-btn-primary" onClick={() => {
                localStorage.removeItem("ceLastActiveRoomId");
                navigate("/dashboard");
              }} style={{ background: "var(--ce-accent)", color: "#000000", border: "none", borderRadius: "6px", padding: "10px 20px", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem", width: "100%" }}>
                Return to Dashboard
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Immediate Kicked Exit Modal */}
        {isKickedFromRoom && createPortal(
          <div className="ce-modal-overlay" style={{ position: "fixed", inset: 0, zIndex: 9999999, background: "rgba(8, 9, 15, 0.94)", backdropFilter: "blur(30px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div className="ce-modal-card warning-glow" style={{ position: "relative", width: "440px", maxWidth: "92vw", padding: "36px 28px", borderRadius: "24px", background: "var(--ce-surface, #12121a)", border: "1px solid rgba(239, 68, 68, 0.3)", boxShadow: "0 25px 80px rgba(239, 68, 68, 0.25)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: "68px", height: "68px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.15)", border: "2px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", marginBottom: "18px", boxShadow: "0 0 30px rgba(239, 68, 68, 0.3)" }}>
                <UserMinus size={34} />
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", marginBottom: "8px" }}>Workspace Access Revoked</h2>
              <p style={{ fontSize: "0.88rem", color: "#9ca3af", marginBottom: "24px", lineHeight: "1.5" }}>{kickMessage || "You have been removed from this room by the owner or moderator."}</p>
              <button
                className="ce-btn-primary"
                onClick={() => {
                  localStorage.removeItem("ceLastActiveRoomId");
                  navigate("/dashboard", { replace: true });
                }}
                style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#ffffff", border: "none", borderRadius: "12px", padding: "12px 24px", fontWeight: "700", cursor: "pointer", fontSize: "0.9rem", width: "100%", boxShadow: "0 4px 20px rgba(239, 68, 68, 0.4)" }}
              >
                Return to Dashboard Now
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Duplicate Session Modal */}
        {duplicateSessionModalOpen && createPortal(
          <div className="ce-modal-overlay">
            <div className="ce-modal-card warning-glow">
              <div className="modal-icon error" style={{ width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", marginBottom: "8px" }}>
                <X size={32} />
              </div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--ce-text)", marginBottom: "4px" }}>Session Disconnected</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--ce-text-muted)", marginBottom: "16px", lineHeight: "1.4" }}>{kickMessage || "You have been disconnected from this session."}</p>
              <button className="ce-btn-primary" onClick={() => {
                localStorage.removeItem("ceLastActiveRoomId");
                navigate("/dashboard");
              }} style={{ background: "var(--ce-accent)", color: "#000000", border: "none", borderRadius: "6px", padding: "10px 20px", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem", width: "100%" }}>
                Return to Dashboard
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Kick Confirmation Modal */}
        {kickModalOpen && createPortal(
          <div className="ce-modal-overlay" onClick={() => setKickModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0, 0, 0, 0.78)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyCenter: "center", padding: "20px" }}>
            <div className="ce-modal-card confirm-modal-card warning-glow" onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "420px", maxWidth: "90vw", padding: "32px 24px", borderRadius: "24px", background: "var(--ce-surface, #12121a)", border: "1px solid var(--ce-border, rgba(255,255,255,0.12))", boxShadow: "0 25px 70px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", margin: "auto" }}>
              <div className="modal-icon-circle error" style={{ width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239, 68, 68, 0.15)", border: "2px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", marginBottom: "16px", boxShadow: "0 0 25px rgba(239, 68, 68, 0.3)" }}>
                <UserMinus size={30} />
              </div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "var(--ce-text, #ffffff)", marginBottom: "8px" }}>Remove Participant?</h2>
              <p style={{ fontSize: "0.86rem", color: "var(--ce-text-muted, #9ca3af)", marginBottom: "24px", lineHeight: "1.5" }}>
                Are you sure you want to remove <strong style={{ color: "var(--ce-text, #ffffff)" }}>{kickTarget?.username}</strong> from this workspace? They will be immediately disconnected.
              </p>
              <div style={{ display: "flex", gap: "12px", width: "100%" }}>
                <button
                  type="button"
                  className="ce-btn-secondary"
                  onClick={() => setKickModalOpen(false)}
                  style={{ flex: 1, padding: "12px", fontWeight: "700", borderRadius: "12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e4e4e7", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ce-btn-danger"
                  onClick={confirmKickUser}
                  style={{ flex: 1, padding: "12px", fontWeight: "700", borderRadius: "12px", background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", color: "#ffffff", border: "none", cursor: "pointer", fontSize: "0.9rem", boxShadow: "0 4px 20px rgba(239,68,68,0.4)" }}
                >
                  Remove User
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Incoming Call Invite Banner */}
        {incomingCall && (
          <div className="ce-incoming-call-banner">
            <div className="incoming-call-info">
              <div
                className="incoming-call-avatar"
                style={{ backgroundColor: getCursorColor(incomingCall.username) }}
              >
                {(incomingCall?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div className="incoming-call-text">
                <span className="incoming-call-user">{incomingCall.username}</span>
                <span className="incoming-call-type">
                  Inviting you to a {incomingCall.mediaType === "video" ? "Video" : "Audio"} Call...
                </span>
              </div>
            </div>
            <div className="incoming-call-actions">
              <button
                className="incoming-btn accept"
                onClick={() => {
                  handleJoinCall(incomingCall.mediaType);
                  setIncomingCall(null);
                }}
              >
                <Phone size={14} />
                <span>Join</span>
              </button>
              <button
                className="incoming-btn decline"
                onClick={() => setIncomingCall(null)}
              >
                <X size={14} />
                <span>Ignore</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Draggable WebRTC Call Panel */}
        {inCall && createPortal(
          <div
            className={`ce-floating-call-panel mode-${callLayoutMode} ${isCallPanelMinimized ? "minimized-hidden" : ""}`}
            style={callLayoutMode === "floating" ? {
              left: `${callPanelPos.x}px`,
              top: `${callPanelPos.y}px`,
              position: "fixed",
              zIndex: 9999
            } : {}}
          >
            <div className="call-panel-header" onMouseDown={handleDragStart}>
              <div className="call-panel-title">
                <span className="live-badge">LIVE</span>
                <span>{callType === "video" ? "Video Call" : "Audio Call"}</span>
              </div>
              <div className="call-panel-header-actions">
                <button
                  className="call-header-action-btn"
                  onClick={() => setIsCallPanelMinimized(true)}
                  title="Minimize Call Panel"
                >
                  <Minus size={13} />
                </button>
                <button
                  className={`call-header-action-btn ${callLayoutMode === "floating" ? "active" : ""}`}
                  onClick={() => setCallLayoutMode("floating")}
                  title="Mini Floating Panel"
                >
                  <Minimize2 size={13} />
                </button>
                <button
                  className={`call-header-action-btn ${callLayoutMode === "docked" ? "active" : ""}`}
                  onClick={() => setCallLayoutMode("docked")}
                  title="Half-Screen Right Dock"
                >
                  <Layers size={13} />
                </button>
                <button
                  className={`call-header-action-btn ${callLayoutMode === "fullscreen" ? "active" : ""}`}
                  onClick={() => setCallLayoutMode("fullscreen")}
                  title="Full-Screen Theater Mode"
                >
                  <Maximize2 size={13} />
                </button>
                <button className="call-panel-close-btn" onClick={handleLeaveCallManual} title="Leave Call">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={`call-participants-grid grid-count-${Object.keys(remoteStreams).length + 1}`}>
              {/* Local Stream Card */}
              <CallParticipantCard
                id={socket.id}
                username={user.username}
                stream={localStream}
                isLocal={true}
                isMuted={isMuted}
                isCameraOff={isCameraOff || callType === "audio"}
                avatar={user.avatar}
                getCursorColor={getCursorColor}
                videoFilter={activeVideoFilter}
              />

              {/* Remote Stream Cards */}
              {Object.entries(remoteStreams).map(([socketId, peerObj]) => {
                const peerUser = users.find((u) => u.socketId === socketId);
                return (
                  <CallParticipantCard
                    key={socketId}
                    id={socketId}
                    username={peerObj.username}
                    stream={peerObj.stream}
                    isLocal={false}
                    isMuted={peerObj.isMuted}
                    isCameraOff={peerObj.isCameraOff || callType === "audio"}
                    avatar={peerUser?.avatar}
                    getCursorColor={getCursorColor}
                    videoFilter={peerObj.activeFilter || "none"}
                  />
                );
              })}
            </div>

            {/* Real-Time Call Diagnostics Sub-Panel */}
            {showDiagnostics && (
              <div className="call-diagnostics-panel">
                <div className="diagnostics-title">
                  <span>CALL HEALTH MONITOR</span>
                  <span className="live-dot" />
                </div>
                <div className="diagnostics-rows">
                  {Object.entries(callStats).map(([socketId, stats]) => {
                    const peerObj = remoteStreams[socketId];
                    return (
                      <div key={socketId} className="diagnostics-peer-row">
                        <div className="peer-row-name">{peerObj?.username || "Participant"}</div>
                        <div className="peer-row-metrics">
                          <div className="metric-item">
                            <span className="metric-label">RTT:</span>
                            <span className={`metric-value ${stats.rtt > 150 ? "warning" : "good"}`}>{stats.rtt}ms</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Loss:</span>
                            <span className={`metric-value ${stats.packetLoss > 2 ? "danger" : "good"}`}>{stats.packetLoss}%</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">Res:</span>
                            <span className="metric-value">{stats.resolution}</span>
                          </div>
                          <div className="metric-item">
                            <span className="metric-label">FPS:</span>
                            <span className="metric-value">{stats.fps}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(callStats).length === 0 && (
                    <div className="diagnostics-no-peers">Establishing secure peer tunnels...</div>
                  )}
                </div>
              </div>
            )}

            <div className="call-panel-footer">
              <button
                className={`call-action-btn ${isMuted ? "muted" : ""}`}
                onClick={toggleMute}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {callType === "video" && (
                <button
                  className={`call-action-btn ${isCameraOff ? "camera-off" : ""}`}
                  onClick={toggleCamera}
                  title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
              )}

              {callType === "video" && (
                <div className="filter-dropdown-container">
                  <button
                    className={`call-action-btn filter-toggle-btn ${activeVideoFilter !== "none" ? "active" : ""}`}
                    onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                    title="Camera Video Filters"
                  >
                    <Palette size={18} />
                  </button>
                  {filterMenuOpen && (
                    <div className="call-filter-menu">
                      <div className="filter-menu-title">Camera Filters</div>
                      {[
                        { name: "none", label: "Normal" },
                        { name: "neon", label: "Cyberpunk" },
                        { name: "grayscale", label: "Grayscale" },
                        { name: "sepia", label: "Sepia" },
                        { name: "matrix", label: "Matrix Green" },
                        { name: "invert", label: "Inverted" }
                      ].map((f) => (
                        <button
                          key={f.name}
                          className={`filter-menu-item ${activeVideoFilter === f.name ? "active" : ""}`}
                          onClick={() => changeVideoFilter(f.name)}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {callType === "video" && (
                <button
                  className={`call-action-btn screenshare ${isScreenSharing ? "active" : ""}`}
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                >
                  <Laptop size={18} />
                </button>
              )}

              <button
                className={`call-action-btn diagnostics-btn ${showDiagnostics ? "active" : ""}`}
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                title="Connection Diagnostics"
              >
                <Activity size={18} />
              </button>

              <button
                className="call-action-btn hangup"
                onClick={handleLeaveCallManual}
                title="End Call"
              >
                <Phone size={18} style={{ transform: "rotate(135deg)" }} />
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Minimized Call Floating Pill Portal Overlay */}
        {inCall && isCallPanelMinimized && createPortal(
          <div className="ce-minimized-call-pill">
            <div className="minimized-call-indicator" onClick={() => setIsCallPanelMinimized(false)} style={{ cursor: "pointer" }}>
              <span className="live-pulse-dot" />
              <Phone size={14} className="minimized-phone-icon" />
              <span className="minimized-call-label">Call Active ({Object.keys(remoteStreams).length + 1})</span>
            </div>
            <div className="minimized-call-actions">
              <button
                className="minimized-action-btn restore"
                onClick={() => setIsCallPanelMinimized(false)}
                title="Restore Call Panel"
              >
                <Maximize2 size={12} />
              </button>
              <button
                className="minimized-action-btn leave"
                onClick={handleLeaveCallManual}
                title="Leave Call"
              >
                <X size={12} />
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Playback Controls Overlay */}
        {isPlaybackActive && (
          <div className="playback-controls-container">
            <button
              className="playback-controls-btn"
              onClick={handlePlaybackPrev}
              disabled={playbackIndex >= versions.length - 1}
              title="Previous Snapshot"
            >
              <SkipBack size={16} />
            </button>

            <button
              className="playback-controls-btn active"
              onClick={() => setIsPlaybackActive(false)}
              title="Pause Playback"
            >
              <Pause size={16} />
            </button>

            <button
              className="playback-controls-btn"
              onClick={handlePlaybackNext}
              disabled={playbackIndex <= 0}
              title="Next Snapshot"
            >
              <SkipForward size={16} />
            </button>

            <div className="playback-status-info">
              <span className="playback-status-title">
                Replaying version {versions.length - playbackIndex} / {versions.length}
              </span>
              <span className="playback-status-sub">
                Modified by: {versions[playbackIndex]?.editedBy.username || "Unknown"}
              </span>
            </div>

            <button
              className="playback-controls-btn active"
              onClick={stopPlayback}
              title="Exit Playback Mode"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Diff Comparison Modal */}
        {isDiffModalOpen && diffVersion && (
          <div className="diff-modal-overlay">
            <div className="diff-modal-container">
              <div className="diff-modal-header">
                <h3 className="diff-modal-title">
                  <History size={18} />
                  <span>Compare Snapshot {diffVersion.versionId} ({new Date(diffVersion.timestamp).toLocaleString()})</span>
                </h3>
                <button className="diff-modal-close" onClick={() => { setIsDiffModalOpen(false); setDiffVersion(null); }}>
                  <X size={18} />
                </button>
              </div>

              <div className="diff-modal-body">
                <DiffEditor
                  height="100%"
                  theme={editorTheme === "light" ? "custom-light" : "custom-dark"}
                  language={editorLanguage}
                  original={diffVersion.code}
                  modified={code}
                  options={{
                    readOnly: true,
                    originalEditable: false,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    glyphMargin: false,
                    lineDecorationsWidth: 5,
                    lineNumbersMinChars: 3
                  }}
                />
              </div>

              <div className="diff-modal-footer">
                <button
                  className="diff-footer-btn cancel"
                  onClick={() => { setIsDiffModalOpen(false); setDiffVersion(null); }}
                >
                  Close
                </button>
                <button
                  className="diff-footer-btn restore"
                  onClick={async () => {
                    const confirmRestore = await window.showConfirm("Are you sure you want to restore the file to this version snapshot?", "Restore Snapshot", "warning");
                    if (confirmRestore) {
                      try {
                        await collabService.restoreVersion(roomId, activeFileIdRef.current, diffVersion.versionId);
                        setIsDiffModalOpen(false);
                        setDiffVersion(null);
                        toast.success("Snapshot restored successfully.");
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Failed to restore version.");
                      }
                    }
                  }}
                >
                  Restore Snapshot
                </button>
              </div>
            </div>
          </div>
        )}
        {contextMenu && createPortal(
          <div
            className="ce-context-menu"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
              position: "fixed",
              zIndex: 10000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-menu-header">
              <span className="context-menu-title">{contextMenu.participant.user.username}</span>
              <span className="context-menu-subtitle">Current Role: {contextMenu.participant.role}</span>
            </div>
            <div className="context-menu-options">
              {currentUserRole === "OWNER" && (
                <>
                  {contextMenu.participant.role === "MODERATOR" ? (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionDemote(contextMenu.participant.user._id || contextMenu.participant.user);
                        setContextMenu(null);
                      }}
                    >
                      <UserMinus size={14} />
                      <span>Demote to Member</span>
                    </button>
                  ) : (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionPromote(contextMenu.participant.user._id || contextMenu.participant.user);
                        setContextMenu(null);
                      }}
                    >
                      <UserPlus size={14} />
                      <span>Promote to Moderator</span>
                    </button>
                  )}

                  {contextMenu.participant.role !== "MEMBER" && (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionChangeRole(contextMenu.participant.user._id || contextMenu.participant.user, "MEMBER");
                        setContextMenu(null);
                      }}
                    >
                      <User size={14} />
                      <span>Set as Member</span>
                    </button>
                  )}

                  {contextMenu.participant.role !== "VIEWER" && (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionChangeRole(contextMenu.participant.user._id || contextMenu.participant.user, "VIEWER");
                        setContextMenu(null);
                      }}
                    >
                      <Eye size={14} />
                      <span>Set as Viewer</span>
                    </button>
                  )}
                </>
              )}

              {currentUserRole === "MODERATOR" && (
                <>
                  {contextMenu.participant.role === "MEMBER" && (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionChangeRole(contextMenu.participant.user._id || contextMenu.participant.user, "VIEWER");
                        setContextMenu(null);
                      }}
                    >
                      <Eye size={14} />
                      <span>Set as Viewer</span>
                    </button>
                  )}
                  {contextMenu.participant.role === "VIEWER" && (
                    <button
                      className="context-menu-item"
                      onClick={() => {
                        handleActionChangeRole(contextMenu.participant.user._id || contextMenu.participant.user, "MEMBER");
                        setContextMenu(null);
                      }}
                    >
                      <User size={14} />
                      <span>Set as Member</span>
                    </button>
                  )}
                </>
              )}

              {(() => {
                const targetUser = contextMenu.participant;
                const isTargetPrivileged = targetUser.role === "OWNER" || targetUser.role === "MODERATOR";
                const canIControlTarget = currentUserRole === "OWNER" || (currentUserRole === "MODERATOR" && !isTargetPrivileged);
                return canIControlTarget && (
                  <>
                    <button
                      className={`context-menu-item ${targetUser.isMuted ? "unmute" : "mute"}`}
                      onClick={() => {
                        handleActionMute(targetUser.user._id || targetUser.user, !targetUser.isMuted);
                        setContextMenu(null);
                      }}
                    >
                      <MicOff size={14} />
                      <span>{targetUser.isMuted ? "Unmute Chat" : "Mute Chat"}</span>
                    </button>

                    <button
                      className="context-menu-item danger"
                      onClick={() => {
                        handleRemoveUser(targetUser.user._id || targetUser.user, targetUser.user.username);
                        setContextMenu(null);
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Kick from Room</span>
                    </button>
                  </>
                );
              })()}

              <button
                className="context-menu-item danger"
                onClick={() => {
                  setReportedTargetUser(contextMenu.participant.user);
                  setReportEvidenceType("ROOM");
                  setReportEvidenceId(room?._id || room?.roomId);
                  setReportModalOpen(true);
                  setContextMenu(null);
                }}
              >
                <ShieldAlert size={14} />
                <span>Report User</span>
              </button>
            </div>
          </div>,
          document.body
        )}
        {/* Futuristic Exit Gate Animation Overlay */}
        {showGateOpenAnimation && (
          <GateOverlay exiting statusText="Decryption Complete" />
        )}

        {/* Invite Followers Modal */}
        {isInviteModalOpen && (
          <div className="ce-invite-modal-overlay">
            <div className="ce-invite-card">
              <div className="ce-invite-modal-header">
                <h3>Invite Followers</h3>
                <button type="button" className="ce-invite-close-btn" onClick={() => setIsInviteModalOpen(false)}>×</button>
              </div>

              <div className="ce-invite-search-bar">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search followers..."
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                />
              </div>

              <div className="ce-invite-candidates-list">
                {loadingFollowers ? (
                  <div className="candidates-loading" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", fontSize: "0.8rem", color: "var(--ce-text-muted)", gap: "10px" }}>
                    <div className="loading-spinner-small" />
                    <span>Loading followers...</span>
                  </div>
                ) : followers.length === 0 ? (
                  <div className="candidates-empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", textAlign: "center", fontSize: "0.8rem", color: "var(--ce-text-muted)" }}>
                    <User size={24} style={{ opacity: 0.3, marginBottom: "8px", alignSelf: "center" }} />
                    <span>You don't have any followers yet</span>
                  </div>
                ) : followers.filter(f => f.username.toLowerCase().includes(inviteSearchQuery.toLowerCase())).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ce-text-muted)", fontSize: "0.85rem" }}>
                    No followers matching search query.
                  </div>
                ) : (
                  followers
                    .filter(f => f.username.toLowerCase().includes(inviteSearchQuery.toLowerCase()))
                    .map((follower) => {
                      const isAlreadyInRoom = room?.participants?.some(p => {
                        const pUserId = p.user?._id || p.user;
                        return String(pUserId) === String(follower._id);
                      }) || (room && String(room.createdBy?._id || room.createdBy) === String(follower._id));

                      const isSelected = selectedFollowers.has(follower._id);
                      return (
                        <div
                          key={follower._id}
                          className={`ce-invite-candidate-item ${isSelected ? "selected" : ""} ${isAlreadyInRoom ? "already-in-room" : ""}`}
                          onClick={() => {
                            if (!isAlreadyInRoom) {
                              toggleSelectFollower(follower._id);
                            }
                          }}
                          style={{
                            opacity: isAlreadyInRoom ? 0.6 : 1,
                            cursor: isAlreadyInRoom ? "not-allowed" : "pointer"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAlreadyInRoom ? true : isSelected}
                            disabled={isAlreadyInRoom}
                            onChange={() => { }} // Row onClick triggers it
                            style={{ marginRight: "12px", cursor: isAlreadyInRoom ? "not-allowed" : "pointer", accentColor: "var(--ce-primary)" }}
                          />
                          {follower.avatar ? (
                            <img src={follower.avatar} alt={follower.username} className="candidate-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", marginRight: "12px", border: "1px solid var(--ce-border)" }} />
                          ) : (
                            <div className="candidate-avatar-placeholder" style={{ width: "32px", height: "32px", borderRadius: "50%", marginRight: "12px", background: "var(--ce-primary)", color: "#fff", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: "0.85rem" }}>
                              {(follower?.username || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="candidate-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                            <span className="cand-name" style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--ce-text)", marginRight: "8px" }}>{follower.username}</span>
                            {isAlreadyInRoom && (
                              <span style={{ fontSize: "0.68rem", color: "var(--ce-success)", background: "rgba(16, 185, 129, 0.1)", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>Joined</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--ce-border)", display: "flex", justifyContent: "flex-end", gap: "10px", background: editorTheme === "light" ? "rgba(0, 0, 0, 0.02)" : "rgba(0, 0, 0, 0.1)" }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{
                    background: editorTheme === "light" ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--ce-border)",
                    borderRadius: "6px",
                    color: "var(--ce-text-muted)",
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={selectedFollowers.size === 0 || sendingInvites}
                  style={{
                    background: selectedFollowers.size > 0
                      ? "var(--ce-primary)"
                      : (editorTheme === "light" ? "rgba(139, 92, 246, 0.25)" : "rgba(170, 59, 255, 0.3)"),
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 16px",
                    fontSize: "0.75rem",
                    fontWeight: "750",
                    cursor: selectedFollowers.size > 0 ? "pointer" : "not-allowed"
                  }}
                >
                  {sendingInvites ? "Sending..." : `Send Invites (${selectedFollowers.size})`}
                </button>
              </div>
            </div>
          </div>
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
          evidenceId={reportEvidenceId}
          addToast={addToast}
        />

        {/* Google Meet Pre-Join Lobby Modal */}
        <GoogleMeetLobbyModal
          isOpen={showMeetLobby}
          onClose={() => {
            setShowMeetLobby(false);
            if (isMobileScreen) {
              setMobileTab("editor");
              changeLayoutMode("editor");
            }
          }}
          onJoinMeeting={handleStartMeeting}
          roomTitle={room?.title}
          currentUser={user}
          initialMicOn={meetMicOn}
          initialVideoOn={meetVideoOn}
        />

        {/* Google Meet Dynamic In-Call Grid Stage */}
        <GoogleMeetStage
          isOpen={inMeet}
          onLeaveMeeting={handleLeaveMeeting}
          roomId={roomId}
          roomTitle={room?.title}
          currentUser={user}
          participants={activeMeetUsers}
          initialMicOn={meetMicOn}
          initialVideoOn={meetVideoOn}
          socket={socket}
        />

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        {isMobileScreen && (
          <nav className="ce-mobile-nav">
            <button
              type="button"
              className={`mobile-nav-btn ${mobileTab === "editor" ? "active" : ""}`}
              onClick={() => {
                setMobileTab("editor");
                changeLayoutMode("editor");
                setLeftSidebarCollapsed(true);
                setIsConsoleOpen(false);
              }}
            >
              <Code2 size={18} />
              <span>Code</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${mobileTab === "files" ? "active" : ""}`}
              onClick={() => {
                setMobileTab("files");
                setLeftActiveTab("files");
                setLeftSidebarCollapsed(false);
                setIsConsoleOpen(false);
              }}
            >
              <FolderOpen size={18} />
              <span>Files</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${mobileTab === "console" ? "active" : ""}`}
              onClick={() => {
                setMobileTab("console");
                setIsConsoleOpen(true);
                setConsoleTab("output");
                setLeftSidebarCollapsed(true);
              }}
            >
              <Terminal size={18} />
              <span>Console</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${mobileTab === "chat" ? "active" : ""}`}
              onClick={() => {
                setMobileTab("chat");
                setRightSidebarCollapsed(false);
                setLeftSidebarCollapsed(true);
                setIsConsoleOpen(false);
                setRoomParticipantsExpanded(true);
              }}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </button>
            <button
              type="button"
              className={`mobile-nav-btn ${mobileTab === "whiteboard" ? "active" : ""}`}
              onClick={() => {
                setMobileTab("whiteboard");
                changeLayoutMode("whiteboard");
                setLeftSidebarCollapsed(true);
                setIsConsoleOpen(false);
              }}
            >
              <Palette size={18} />
              <span>Board</span>
            </button>
            {showCallButtons && (
              <button
                type="button"
                className={`mobile-nav-btn ${mobileTab === "meeting" ? "active" : ""}`}
                onClick={() => {
                  setMobileTab("meeting");
                  handleOpenMeetLobby();
                }}
              >
                <Video size={18} />
                <span>Meeting</span>
              </button>
            )}
          </nav>
        )}

        {/* MOBILE FLOATING RUN ACTION BUTTON */}
        {isMobileScreen && mobileTab === "editor" && (
          <button
            type="button"
            className="ce-mobile-fab-run"
            onClick={() => {
              handleRunCode();
              setMobileTab("console");
              setIsConsoleOpen(true);
              setConsoleTab("output");
            }}
            disabled={isTerminalExecuting}
            title="Run Code"
          >
            {isTerminalExecuting ? <Loader2 size={18} className="ce-spin" /> : <Play size={18} />}
            <span>Run</span>
          </button>
        )}

        {/* Fast Quick File / Folder Creation Modal */}
        {quickCreateModal && (
          <div className="ce-quick-create-overlay" onClick={() => setQuickCreateModal(null)}>
            <div className="ce-quick-create-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ce-quick-create-header">
                <div className="ce-quick-create-title-box">
                  {quickCreateModal.type === "file" ? (
                    <FileCode size={16} className="ce-quick-create-icon" />
                  ) : (
                    <FolderOpen size={16} className="ce-quick-create-icon folder" />
                  )}
                  <h3>Create New {quickCreateModal.type === "file" ? "File" : "Folder"}</h3>
                </div>
                <button
                  type="button"
                  className="ce-quick-create-close"
                  onClick={() => setQuickCreateModal(null)}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleQuickCreateSubmit} className="ce-quick-create-form">
                <div className="ce-quick-create-input-wrapper">
                  <input
                    ref={quickCreateInputRef}
                    type="text"
                    className="ce-quick-create-input"
                    placeholder={
                      quickCreateModal.type === "file"
                        ? (room?.language === "python" ? "main.py" : room?.language === "cpp" ? "main.cpp" : room?.language === "java" ? "Main.java" : room?.language === "html" ? "index.html" : "index.js")
                        : "components"
                    }
                    value={quickCreateName}
                    onChange={(e) => setQuickCreateName(e.target.value)}
                    autoFocus
                  />
                </div>

                {quickCreateModal.type === "file" && (
                  <div className="ce-quick-create-pills">
                    <span className="ce-quick-pills-label">Quick extension:</span>
                    {((room?.language === "python" && [".py", ".json", ".txt"]) ||
                      (room?.language === "cpp" && [".cpp", ".h", ".hpp"]) ||
                      (room?.language === "java" && [".java", ".properties", ".xml"]) ||
                      (room?.language === "html" && [".html", ".css", ".js"]) ||
                      [".js", ".jsx", ".json", ".css"]
                    ).map((ext) => (
                      <button
                        type="button"
                        key={ext}
                        className="ce-quick-pill-btn"
                        onClick={() => {
                          const base = quickCreateName.includes(".")
                            ? quickCreateName.split(".")[0]
                            : quickCreateName.trim();
                          setQuickCreateName((base || "index") + ext);
                          quickCreateInputRef.current?.focus();
                        }}
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                )}

                <div className="ce-quick-create-actions">
                  <button
                    type="button"
                    className="ce-quick-create-btn cancel"
                    onClick={() => setQuickCreateModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ce-quick-create-btn submit"
                    disabled={isQuickCreating || !quickCreateName.trim()}
                  >
                    {isQuickCreating ? (
                      <>
                        <Loader2 size={13} className="ce-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Create {quickCreateModal.type === "file" ? "File" : "Folder"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isExiting && (
          <div className="ce-exit-transition-overlay">
            <div className="ce-exit-transition-content">
              <div className="loading-spinner-portal" />
              <span>Returning to Dashboard...</span>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// --- CallParticipantCard Subcomponent for speaking indicator and stream binding ---
function CallParticipantCard({ id, username, stream, isLocal, isMuted, isCameraOff, avatar, getCursorColor, videoFilter }) {
  const videoRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!stream || isMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioCtxRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let values = 0;
        const length = dataArray.length;
        for (let i = 0; i < length; i++) {
          values += dataArray[i];
        }
        const average = values / length;

        setIsSpeaking(average > 10);

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("AudioContext speaking level check failed:", e);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { });
      }
    };
  }, [stream, isMuted]);

  const fallbackColor = getCursorColor ? getCursorColor(username) : "#58A6FF";

  return (
    <div className={`ce-call-participant-card ${isSpeaking ? "speaking" : ""}`}>
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`participant-video-feed video-filter-${videoFilter || "none"}`}
          style={{ display: !isCameraOff ? "block" : "none" }}
        />
      )}

      {(!stream || isCameraOff) && (
        <div className="participant-avatar-container">
          <div
            className={`participant-avatar-large ${isSpeaking ? "pulse-speaking" : ""}`}
            style={{ backgroundColor: avatar ? "transparent" : fallbackColor }}
          >
            {avatar ? (
              <img src={avatar} alt={username} />
            ) : (
              (username || "U").charAt(0).toUpperCase()
            )}
          </div>
        </div>
      )}

      <div className="participant-info-badge">
        <span className="participant-name">
          {username} {isLocal ? "(You)" : ""}
        </span>
        <div className="participant-status-icons">
          {isMuted && <MicOff size={12} className="status-icon-muted" />}
          {isCameraOff && <VideoOff size={12} className="status-icon-camera-off" />}
        </div>
      </div>
    </div>
  );
}

// --- Dedicated Image Asset Preview Component for HTML/CSS/JS Workspaces ---
function ImagePreviewPane({ file, roomId }) {
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imgSrc = useMemo(() => {
    if (!file) return "";
    if (file.content && file.content.startsWith("data:")) return file.content;
    if (file.assetUrl) return file.assetUrl;
    if (file._id && roomId) return `/api/workspace/${roomId}/assets/${file._id}`;
    return "";
  }, [file, roomId]);

  const ext = file?.name ? file.name.split(".").pop().toUpperCase() : "IMG";
  const formattedSize = useMemo(() => {
    const bytes = file?.size || (file?.content ? Math.round((file.content.length * 3) / 4) : 0);
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  const handleImageLoad = (e) => {
    setNaturalDimensions({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
    setLoading(false);
  };

  return (
    <div className="ce-image-preview-pane">
      {/* Top Toolbar */}
      <div className="ce-image-preview-toolbar">
        <div className="ce-image-meta-pills">
          <span className="ce-image-badge format">{ext}</span>
          {naturalDimensions.width > 0 && (
            <span className="ce-image-badge dim">
              {naturalDimensions.width} × {naturalDimensions.height} px
            </span>
          )}
          <span className="ce-image-badge size">{formattedSize}</span>
        </div>

        <div className="ce-image-zoom-controls">
          <button
            type="button"
            className="ce-img-btn"
            onClick={() => setZoom((z) => Math.max(0.25, Number((z - 0.25).toFixed(2))))}
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="ce-img-zoom-val">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            className="ce-img-btn"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.25).toFixed(2))))}
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            className="ce-img-btn reset"
            onClick={() => setZoom(1)}
            title="Reset to 100%"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="ce-image-canvas">
        {loading && (
          <div className="ce-image-loading-state">
            <div className="loading-spinner-small" />
            <span>Loading image asset...</span>
          </div>
        )}
        {error ? (
          <div className="ce-image-error-state">
            <ImageOff size={32} />
            <span>Failed to load image asset</span>
          </div>
        ) : (
          <div className="ce-image-viewport">
            <img
              src={imgSrc}
              alt={file?.name || "Image Preview"}
              className="ce-preview-img"
              style={{ transform: `scale(${zoom})` }}
              onLoad={handleImageLoad}
              onError={() => { setLoading(false); setError(true); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
