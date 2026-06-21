import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import MonacoEditor, { DiffEditor } from "@monaco-editor/react";
import socket from "../socket/socket";
import { getRoom, leaveRoom, deleteRoom, getRecentRooms, createRoom, removeUser, promoteUser, demoteUser, changeRole, kickUser, muteUser } from "../services/roomService";
import { runCode } from "../services/compilerService";
import { getMessage } from "../services/messageService";
import Whiteboard from "../components/Whiteboard";
import FileExplorer from "../components/FileExplorer";
import * as workspaceService from "../services/workspaceService";
import * as collabService from "../services/collaborationService";
import MainLayout from "../layouts/MainLayout";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/authService";
import {
  FolderOpen,
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
  LogOut,
  Trash2,
  Terminal,
  Code2,
  Hash,
  Palette,
  FileCode,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Share2,
  Bell,
  Layers,
  Copy,
  Plus,
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
  Minimize2
} from "lucide-react";
import "./Editor.css";

const playNotificationSound = () => {
  const audio = new Audio("/mixkit-software-interface-start-2574.wav");
  audio.play().catch(err => console.log("Audio play blocked by browser policy:", err));
};

const MOCK_FILES = [
  { name: "index.js", size: "1.2 KB", type: "js" },
  { name: "styles.css", size: "3.4 KB", type: "css" },
  { name: "utils.js", size: "820 B", type: "js" },
  { name: "package.json", size: "450 B", type: "json" }
];

function Editor() {
  const navigate = useNavigate();
  const { user: authUser, setUser } = useAuth();
  const storedUser = authUser || JSON.parse(localStorage.getItem("user")) || { username: "Guest", _id: "guest" };
  const user = {
    ...storedUser,
    id: storedUser.id || storedUser._id || "guest"
  };
  const { roomId } = useParams();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [showGateOpenAnimation, setShowGateOpenAnimation] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGateOpenAnimation(false);
    }, 550);
    return () => clearTimeout(timer);
  }, []);

  // Core MERN Room State
  const [room, setRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [joinRequests, setJoinRequests] = useState([]);
  const [notification, setNotification] = useState("");
  const [roomNotifications, setRoomNotifications] = useState([]);

  // Multi-file Workspace States
  const [tabs, setTabs] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [editorLanguage, setEditorLanguage] = useState("javascript");
  const hasAutoSelectedRef = useRef(false);

  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  const loadCollaborationState = async (targetRoomId, targetFileId) => {
    if (!targetRoomId) return;
    try {
      const ownershipRes = await collabService.fetchLineOwnership(targetRoomId, targetFileId);
      setLineOwnership(ownershipRes.ownership || []);

      const versionsRes = await collabService.fetchVersionHistory(targetRoomId, targetFileId);
      setVersions(versionsRes.versions || []);

      const activitiesRes = await collabService.fetchEditActivities(targetRoomId, targetFileId);
      setCollabActivities(activitiesRes.activities || []);
    } catch (err) {
      console.error("Error loading collaboration state:", err);
    }
  };

  const handleFileSelect = async (fileId) => {
    try {
      const data = await workspaceService.getFileContent(fileId);
      const file = data.file;

      setTabs((prev) => {
        const exists = prev.some((t) => t._id === file._id);
        if (exists) return prev;
        return [...prev, file];
      });

      setActiveFileId(file._id);
      setCode(file.content || "");
      setEditorLanguage(file.language || "javascript");

      // Load collaboration history, versions, and blame info for the file
      await loadCollaborationState(roomId, file._id);
    } catch (err) {
      console.error("Error opening file:", err);
    }
  };

  const handleCloseTab = (e, fileId) => {
    e.stopPropagation();
    const nextTabs = tabs.filter((t) => t._id !== fileId);
    setTabs(nextTabs);

    if (activeFileId === fileId) {
      if (nextTabs.length > 0) {
        const lastTab = nextTabs[nextTabs.length - 1];
        handleFileSelect(lastTab._id);
      } else {
        setActiveFileId(null);
        setCode("");
        setEditorLanguage("javascript");
      }
    }
  };

  const handleFileDelete = (fileId) => {
    const nextTabs = tabs.filter((t) => t._id !== fileId);
    setTabs(nextTabs);

    if (activeFileId === fileId) {
      if (nextTabs.length > 0) {
        const lastTab = nextTabs[nextTabs.length - 1];
        handleFileSelect(lastTab._id);
      } else {
        setActiveFileId(null);
        setCode("");
        setEditorLanguage("javascript");
      }
    }
  };

  const handleCreateFileFromWelcome = async () => {
    const filename = prompt("Enter new file name (e.g. index.js, script.py, main.cpp):");
    if (!filename || !filename.trim()) return;

    try {
      const getLanguageByExtension = (name) => {
        const ext = name.split(".").pop().toLowerCase();
        if (ext === "js") return "javascript";
        if (ext === "py") return "python";
        if (ext === "cpp" || ext === "h" || ext === "hpp") return "cpp";
        if (ext === "java") return "java";
        if (ext === "html") return "html";
        if (ext === "css") return "css";
        if (ext === "json") return "json";
        return "plaintext";
      };

      const lang = getLanguageByExtension(filename.trim());
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        filename.trim(),
        "file",
        null, // root
        lang
      );

      const createdItem = data.item;

      socket.emit("file-created", {
        roomId,
        item: createdItem
      });

      await handleFileSelect(createdItem._id);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create file.");
    }
  };

  const handleCreateFolderFromWelcome = async () => {
    const foldername = prompt("Enter new folder name:");
    if (!foldername || !foldername.trim()) return;

    try {
      const data = await workspaceService.createWorkspaceItem(
        roomId,
        foldername.trim(),
        "folder",
        null, // root
        "plaintext"
      );

      const createdItem = data.item;

      socket.emit("folder-created", {
        roomId,
        item: createdItem
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create folder.");
    }
  };

  const triggerNotification = (message) => {
    setNotification(message);
    const newNotif = {
      id: Date.now() + Math.random(),
      message,
      time: new Date()
    };
    setRoomNotifications((prev) => [newNotif, ...prev].slice(0, 10));

    // Auto-clear active toast notification after a timeout
    const timeout = message.includes("auto-saved") ? 2500 : 3500;
    setTimeout(() => {
      setNotification((prev) => prev === message ? "" : prev);
    }, timeout);
  };

  // Room Chat States
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatTab, setChatTab] = useState("room"); // 'room' | 'private'
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateMessages, setPrivateMessages] = useState([]);

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
        const lastMsg = messages[messages.length - 1];
        const isMyMsg = lastMsg && (String(lastMsg.userId || lastMsg.sender?._id) === String(user.id || user._id) || lastMsg.username === user.username);
        const container = chatMessagesContainerRef.current;
        const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight <= 120) : true;
        if (isMyMsg || isAtBottom) {
          setTimeout(() => scrollToBottom("smooth"), 50);
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
        const lastMsg = privateMessages[privateMessages.length - 1];
        const isMyMsg = lastMsg && (String(lastMsg.userId || lastMsg.sender?._id) === String(user.id || user._id) || lastMsg.username === user.username);
        const container = chatMessagesContainerRef.current;
        const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight <= 120) : true;
        if (isMyMsg || isAtBottom) {
          setTimeout(() => scrollToBottom("smooth"), 50);
        } else {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      }
    }
  }, [privateMessages]);

  // Monaco Editor Ref & Collab Cursors
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const hasJoinedRef = useRef(false);
  const [remoteCursors, setRemoteCursors] = useState({});

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

  const changeLayoutMode = (mode, emit = true) => {
    setLayoutMode(mode);
    if (mode === "editor") {
      setShowWhiteboard(false);
    } else {
      setShowWhiteboard(true);
    }
    if (emit) {
      socket.emit("layout-change", { roomId, layoutMode: mode });
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
  const [consoleTab, setConsoleTab] = useState("output"); // 'input' | 'output' | 'console'
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalInputVal, setTerminalInputVal] = useState("");
  const [programInput, setProgramInput] = useState("");
  const [isTerminalExecuting, setIsTerminalExecuting] = useState(false);
  const terminalEndRef = useRef(null);

  // WebRTC Call States
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' | 'video'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { [socketId]: { stream, username } }
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

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
        audio: true,
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
    setIsMuted(false);
    setIsCameraOff(false);

    socket.emit("leave-call", { roomId });
    triggerNotification("You left the call");
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
          isCameraOff
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        socket.emit("toggle-media", {
          roomId,
          isMuted,
          isCameraOff: !videoTrack.enabled
        });
      }
    }
  };

  // Ensure media resources are cleaned up on component unmount
  useEffect(() => {
    return () => {
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

  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [leftActiveTab, setLeftActiveTab] = useState("files"); // 'files' | 'notes' | 'activity' | 'settings'
  const [sidebarWidth, setSidebarWidth] = useState(320); // Left sidebar width in pixels
  const [isResizing, setIsResizing] = useState(false); // Global resizing lock state
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

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
    localStorage.getItem("editor_fontFamily") || "Fira Code, JetBrains Mono, monospace"
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
  const [copiedId, setCopiedId] = useState(false);
  const [whiteboardActivities, setWhiteboardActivities] = useState([]);
  const [roomDeletedModalOpen, setRoomDeletedModalOpen] = useState(false);
  const [duplicateSessionModalOpen, setDuplicateSessionModalOpen] = useState(false);
  const [kickMessage, setKickMessage] = useState("");
  const [kickModalOpen, setKickModalOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState({ userId: "", username: "" });
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
    const myParticipant = room?.participants?.find(
      (p) => p.user && String(p.user._id || p.user) === String(user.id || user._id)
    );
    const myRole = myParticipant ? myParticipant.role : "MEMBER";

    const isTargetPrivileged = participant.role === "OWNER" || participant.role === "MODERATOR";
    const canIControlTarget = myRole === "OWNER" || (myRole === "MODERATOR" && !isTargetPrivileged);

    if (canIControlTarget && String(participant.user?._id || participant.user) !== String(user.id || user._id)) {
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
      alert(err.response?.data?.message || "Failed to promote user");
    }
  };

  const handleActionDemote = async (targetUserId) => {
    try {
      await demoteUser(roomId, targetUserId);
      triggerNotification("User demoted to Member successfully.");
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to demote user");
    }
  };

  const handleActionChangeRole = async (targetUserId, role) => {
    try {
      await changeRole(roomId, targetUserId, role);
      triggerNotification(`User role changed to ${role} successfully.`);
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to change user role");
    }
  };

  const handleActionMute = async (targetUserId, mute) => {
    try {
      await muteUser(roomId, targetUserId, mute);
      triggerNotification(`User ${mute ? "muted" : "unmuted"} successfully.`);
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle user mute");
    }
  };

  const handleActionKick = async (targetUserId) => {
    try {
      await kickUser(roomId, targetUserId);
      triggerNotification("User kicked successfully.");
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to kick user");
    }
  };

  const confirmKickUser = async () => {
    const { userId } = kickTarget;
    setKickModalOpen(false);
    try {
      await kickUser(roomId, userId);
      fetchRoom();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  // Mobile tab select state
  const [mobileTab, setMobileTab] = useState("editor"); // 'editor' | 'whiteboard' | 'chat' | 'console' | 'participants'

  const [editorTheme, setEditorTheme] = useState(
    localStorage.getItem("codeExpoHomeTheme") || "dark"
  );
  const [editorFontSize, setEditorFontSize] = useState(
    Number(localStorage.getItem("editor_fontSize")) || 14
  );

  // Auto collapse sidebars on load for smaller laptop/tablet views
  useEffect(() => {
    if (window.innerWidth <= 1024) {
      setLeftSidebarCollapsed(true);
      setRightSidebarCollapsed(true);
    }
  }, []);



  const handleThemeChange = (e) => {
    const selectedTheme = e.target.value;
    const newTheme = selectedTheme === "vs-light" ? "light" : "dark";
    document.documentElement.className = newTheme;
    localStorage.setItem("codeExpoHomeTheme", newTheme);
    setEditorTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = editorTheme === "dark" ? "light" : "dark";
    document.documentElement.className = nextTheme;
    localStorage.setItem("codeExpoHomeTheme", nextTheme);
    setEditorTheme(nextTheme);
  };

  const handleLogout = () => {
    logoutUser().catch(err => console.error("Logout error:", err));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("ceLastActiveRoomId");
    if (typeof setUser === "function") {
      setUser(null);
    }
    navigate("/login");
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
      alert("Cannot save an empty snapshot.");
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
      alert("No version history available to replay.");
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

  useEffect(() => {
    const handleStorageChange = () => {
      setEditorTheme(localStorage.getItem("codeExpoHomeTheme") || "dark");
    };
    window.addEventListener("storage", handleStorageChange);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const currentTheme = document.documentElement.className;
          setEditorTheme(currentTheme.includes("light") ? "light" : "dark");
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      observer.disconnect();
    };
  }, []);

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
            alert("Failed to initialize default workspace.");
            navigate("/dashboard");
          }
        }
        return;
      }

      const data = await getRoom(roomId);
      if (!data || !data.room) {
        alert("Room not found.");
        localStorage.removeItem("ceLastActiveRoomId");
        navigate("/dashboard");
        return;
      }

      // Privacy authorization check
      if (data.room.isPrivate) {
        const roomCreatorId = data.room.createdBy?._id || data.room.createdBy;
        const isOwner = String(roomCreatorId) === String(user.id);
        const isParticipant = data.room.participants?.some((p) => {
          const pId = p._id || p;
          return String(pId) === String(user.id);
        });
        if (!isOwner && !isParticipant) {
          alert("You are not authorized to access this private room without approval.");
          localStorage.removeItem("ceLastActiveRoomId");
          navigate("/dashboard");
          return;
        }
      }

      setRoom(data.room);
      if (data.room.code) {
        setCode((prev) => prev || data.room.code);
      }
      // Load collaboration history, versions, and blame info for single-file mode
      await loadCollaborationState(roomId, null);
    } catch (error) {
      console.error(error.response?.data?.message || error.message);
      alert(error.response?.data?.message || "Failed to load room workspace. Returning to dashboard.");
      localStorage.removeItem("ceLastActiveRoomId");
      navigate("/dashboard");
    }
  };

  // Fetch Room Details
  useEffect(() => {
    fetchRoom();
  }, [roomId, navigate, user.id]);

  // Fetch workspace files on load and auto-select entry point file
  useEffect(() => {
    const autoSelectEntryPoint = async () => {
      if (!roomId || roomId === "default" || hasAutoSelectedRef.current) return;
      try {
        const data = await workspaceService.getWorkspaceTree(roomId);
        if (data && data.items) {
          const files = data.items.filter(item => item.type === "file");
          if (files.length > 0) {
            hasAutoSelectedRef.current = true;
            const entry = files.find(f => f.isEntryPoint);
            const toSelect = entry || files[0];
            await handleFileSelect(toSelect._id);
          }
        }
      } catch (err) {
        console.error("Error auto-selecting entry point file:", err);
      }
    };

    if (room) {
      autoSelectEntryPoint();
    }
  }, [roomId, room]);

  // Join Room via Socket.IO
  useEffect(() => {
    if (!room || !user || hasJoinedRef.current) return;
    const roomCreatorId = room.createdBy?._id || room.createdBy;
    socket.emit("join-room", {
      roomId,
      username: user.username,
      userId: user.id,
      isOwner: String(roomCreatorId) === String(user.id),
      avatar: user.avatar
    });
    hasJoinedRef.current = true;
  }, [room, roomId]);

  // Leave Room on unmount or roomId change
  useEffect(() => {
    return () => {
      socket.emit("leave-room", { roomId });
      hasJoinedRef.current = false;
      hasAutoSelectedRef.current = false;
    };
  }, [roomId]);

  // Monitor socket connectivity
  useEffect(() => {
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => {
      setSocketConnected(false);
      setUsers([]);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  // Socket triggers
  useEffect(() => {
    const handleUserJoined = (data) => {
      triggerNotification(data.message);
      fetchRoom();
    };

    const handleRoomUsers = (usersList) => {
      setUsers(usersList);
      if (usersList.length > 0 && !privateRecipient) {
        const firstOther = usersList.find((u) => u.userId !== user.id);
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
      if (newMsg.isPrivate) {
        setPrivateMessages((prev) => [...prev, msgWithTime]);
      } else {
        setMessages((prev) => [...prev, msgWithTime]);
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
      triggerNotification(data.message);
      fetchRoom();

      // Cleanup cursor of left user
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[data.username];
        return next;
      });
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

    const handleKicked = (data) => {
      setKickMessage(data?.message || "You have been removed from this room by the owner.");
      setDuplicateSessionModalOpen(true);
    };

    const handleLayoutChange = (data) => {
      if (data.layoutMode) {
        changeLayoutMode(data.layoutMode, false);
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setPrivateMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    const handleTerminalOutput = ({ text }) => {
      setTerminalOutput((prev) => prev + text);
    };

    const handleTerminalExit = ({ code, message }) => {
      setTerminalOutput((prev) => prev + message);
      setIsTerminalExecuting(false);
    };

    const handleRoleChanged = ({ userId, role }) => {
      fetchRoom();
      if (String(userId) === String(user.id)) {
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

    const handleUserKicked = ({ userId }) => {
      fetchRoom();
      if (String(userId) === String(user.id)) {
        setKickMessage("You have been kicked from the room.");
        setDuplicateSessionModalOpen(true);
      }
    };

    const handleMuteStatusChanged = async ({ userId, isMuted: targetIsMuted }) => {
      try {
        const data = await getRoom(roomId);
        if (data && data.room) {
          setRoom(data.room);
          
          if (String(userId) === String(user.id)) {
            triggerNotification(`You have been ${targetIsMuted ? "muted" : "unmuted"} in chat.`);
            
            const myParticipant = data.room.participants?.find(
              (p) => p.user && String(p.user._id || p.user) === String(user.id || user._id)
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
        await pc.setLocalDescription(offer);
        socket.emit("webrtc-offer", {
          targetSocketId: socketId,
          offer
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
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", {
          targetSocketId: senderSocketId,
          answer
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

    const handleUserToggleMedia = ({ socketId, isMuted: peerMuted, isCameraOff: peerCameraOff }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            isMuted: peerMuted,
            isCameraOff: peerCameraOff
          }
        };
      });
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("room-users", handleRoomUsers);
    socket.on("user-avatar-updated", handleUserAvatarUpdated);
    socket.on("receive-code", handleReceiveCode);
    socket.on("receive-file-content", handleReceiveFileContent);
    socket.on("Receive-Message", handleReceiveMessage);
    socket.on("join-request", handleJoinRequest);
    socket.on("user-left", handleUserLeft);
    socket.on("code-cursor-move", handleCodeCursorMove);
    socket.on("whiteboard-activity", handleWhiteboardActivity);
    socket.on("room-deleted", handleRoomDeleted);
    socket.on("already-online", handleAlreadyOnline);
    socket.on("kicked", handleKicked);
    socket.on("layout-change", handleLayoutChange);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("terminal-output", handleTerminalOutput);
    socket.on("terminal-exit", handleTerminalExit);
    socket.on("role-changed", handleRoleChanged);
    socket.on("member-promoted", handleMemberPromoted);
    socket.on("member-demoted", handleMemberDemoted);
    socket.on("user-kicked", handleUserKicked);
    socket.on("mute-status-changed", handleMuteStatusChanged);
    socket.on("chat-muted-alert", handleChatMutedAlert);

    // Collaboration Socket Bindings
    socket.on("cursor:update", handleCursorUpdate);
    socket.on("cursor:remove", handleCursorRemove);
    socket.on("line:ownership:update", handleLineOwnershipUpdate);
    socket.on("activity:add", handleActivityAdd);
    socket.on("version:create", handleVersionCreate);
    socket.on("user:join", handleUserJoin);
    socket.on("user:leave", handleUserLeave);

    // WebRTC signaling listeners
    socket.on("user-joined-call", handleUserJoinedCall);
    socket.on("webrtc-offer", handleWebRtcOffer);
    socket.on("webrtc-answer", handleWebRtcAnswer);
    socket.on("webrtc-ice-candidate", handleWebRtcIceCandidate);
    socket.on("user-toggle-media", handleUserToggleMedia);
    socket.on("user-left-call", handleUserLeftCall);

    return () => {
      socket.off("user-joined", handleUserJoined);
      socket.off("room-users", handleRoomUsers);
      socket.off("user-avatar-updated", handleUserAvatarUpdated);
      socket.off("receive-code", handleReceiveCode);
      socket.off("receive-file-content", handleReceiveFileContent);
      socket.off("Receive-Message", handleReceiveMessage);
      socket.off("join-request", handleJoinRequest);
      socket.off("user-left", handleUserLeft);
      socket.off("code-cursor-move", handleCodeCursorMove);
      socket.off("whiteboard-activity", handleWhiteboardActivity);
      socket.off("room-deleted", handleRoomDeleted);
      socket.off("already-online", handleAlreadyOnline);
      socket.off("kicked", handleKicked);
      socket.off("layout-change", handleLayoutChange);
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
    };
  }, [privateRecipient, user.id, roomId, layoutMode, activeFileId]);

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
    const timer = setTimeout(() => {
      if (activeFileId) {
        socket.emit("save-file-content", {
          roomId,
          fileId: activeFileId,
          content: code,
          userId: user.id,
          username: user.username
        });
      } else {
        socket.emit("save-code", { roomId, code });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [code, roomId, activeFileId]);

  // Handle Monaco Cursors delta decorations renderer
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
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
  }, [remoteCursors]);

  // Math helper for cursor colors
  const getCursorColor = (name) => {
    const colors = ["#58A6FF", "#58a6ff", "#38bdf8", "#4ade80", "#fb923c", "#c084fc", "#f87171", "#fbbf24"];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Emit cursor movement inside Monaco Editor
  const handleEditorChange = (value) => {
    setCode(value);
    if (activeFileIdRef.current) {
      socket.emit("file-content-changed", {
        roomId,
        fileId: activeFileIdRef.current,
        content: value
      });
    } else {
      socket.emit("code-change", { roomId, code: value });
    }
  };

  const editorDisposablesRef = useRef([]);
  const recentDecorationsRef = useRef({});
  const blameDecorationsRef = useRef([]);

  const applyRecentEditDecoration = (startLine, addedCount) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const color = getCursorColor(user?.username);
    const sanitizedId = (user.id || "guest").replace(/[^a-zA-Z0-9]/g, "");
    const className = `line-recent-edited-${sanitizedId}`;

    // Inject dynamic stylesheet style tag for custom colors
    let styleTag = document.getElementById(className);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = className;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      .${className} {
        border-left: 3px solid ${color} !important;
        background-color: ${color}0d !important;
      }
    `;

    const endLine = startLine + addedCount;
    const newDecorations = [];
    for (let l = startLine; l <= endLine; l++) {
      newDecorations.push({
        range: new monaco.Range(l, 1, l, 1),
        options: {
          isWholeLine: true,
          className: `${className} line-recent-edited-decoration`
        }
      });
    }

    const oldDecs = recentDecorationsRef.current[startLine] || [];
    const decIds = editor.deltaDecorations(oldDecs, newDecorations);
    recentDecorationsRef.current[startLine] = decIds;

    // Remove decoration after 8 seconds fade effect
    setTimeout(() => {
      if (editorRef.current && editorRef.current.getModel()) {
        editorRef.current.deltaDecorations(decIds, []);
        delete recentDecorationsRef.current[startLine];
      }
    }, 8000);
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

    // Define custom premium themes matching page backgrounds exactly
    monaco.editor.defineTheme("custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6a737d", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
      ],
      colors: {
        "editor.background": "#0b0f17",
        "editor.lineHighlightBackground": "#1e293b40",
        "editorCursor.foreground": "#ffa116",
        "editor.inactiveSelectionBackground": "#388bfd15",
        "editor.selectionBackground": "#388bfd30",
        "editor.lineHighlightBorder": "#00000000"
      }
    });

    monaco.editor.defineTheme("custom-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "57606a", fontStyle: "italic" },
        { token: "keyword", foreground: "cf222e" },
        { token: "string", foreground: "0a3069" },
      ],
      colors: {
        "editor.background": "#f6f8fa",
        "editor.lineHighlightBackground": "#eaeef250",
        "editorCursor.foreground": "#0969da",
        "editor.inactiveSelectionBackground": "#add6ff30",
        "editor.selectionBackground": "#add6ff",
        "editor.lineHighlightBorder": "#00000000"
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
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(editorTheme === "light" ? "custom-light" : "custom-dark");
    }
  }, [editorTheme]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorFontSize,
        fontFamily: editorFontFamily,
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
    editorBracketColorization
  ]);

  // Compile runner handler
  const handleRunCode = () => {
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

  const handleLeaveRoomAction = async () => {
    const confirmLeave = window.confirm("Are you sure you want to leave this room?");
    if (!confirmLeave) return;
    try {
      socket.emit("leave-room", { roomId });
      await leaveRoom(roomId);
      localStorage.removeItem("ceLastActiveRoomId");
      navigate("/dashboard");
    } catch (error) {
      console.error(error.message);
    }
  };

  const handleDeleteRoomAction = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this room?");
    if (!confirmDelete) return;
    try {
      socket.emit("room-deleted", { roomId });
      await deleteRoom(roomId);
      localStorage.removeItem("ceLastActiveRoomId");
      navigate("/dashboard");
    } catch (error) {
      console.error(error.message);
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
    const confirmDelete = window.confirm("Are you sure you want to delete this message?");
    if (!confirmDelete) return;
    socket.emit("delete-message", { roomId, messageId, userId: user.id });
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

  // Filter unique participants
  const uniqueUsers = users.filter(
    (u, index, self) => index === self.findIndex((el) => el.userId === u.userId)
  );

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
                onSubmit={(e) => {
                  e.preventDefault();
                  const joinRoomId = e.target.elements.joinRoomIdInput.value.trim();
                  if (joinRoomId) {
                    navigate(`/editor/${joinRoomId}`);
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
          handleLeaveRoomAction();
          break;
        default:
          break;
      }
    }
  };

  if (!room) {
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
  const showCallButtons = !room?.isPrivate || isCurrentUserOwner;

  return (
    <MainLayout
      roomId={roomId}
      roomTitle={room.title}
      socketConnected={socketConnected}
      uniqueUsers={uniqueUsers}
      joinRequests={joinRequests}
      copyRoomId={copyRoomId}
      copiedId={copiedId}
      notifications={roomNotifications}
      clearNotifications={() => setRoomNotifications([])}
      onSearchSelect={handleSearchSelect}
      inCall={inCall}
      callType={callType}
      onJoinCall={showCallButtons ? handleJoinCall : null}
      onLeaveCall={handleLeaveCall}
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
                className={`sidebar-tab-btn ${leftActiveTab === "files" && !leftSidebarCollapsed ? "active" : ""}`}
                onClick={() => {
                  if (leftActiveTab === "files") setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  else {
                    setLeftActiveTab("files");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Explorer (Files)"
              >
                <FolderOpen size={20} />
              </button>
              <button
                className={`sidebar-tab-btn ${leftActiveTab === "notes" && !leftSidebarCollapsed ? "active" : ""}`}
                onClick={() => {
                  if (leftActiveTab === "notes") setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  else {
                    setLeftActiveTab("notes");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Notes"
              >
                <BookOpen size={20} />
              </button>
              <button
                className={`sidebar-tab-btn ${layoutMode !== "editor" ? "active" : ""}`}
                onClick={toggleWhiteboard}
                title="Toggle Whiteboard Split"
              >
                <Palette size={20} />
              </button>
              <button
                className={`sidebar-tab-btn ${leftActiveTab === "activity" && !leftSidebarCollapsed ? "active" : ""}`}
                onClick={() => {
                  if (leftActiveTab === "activity") setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  else {
                    setLeftActiveTab("activity");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Activity Feed"
              >
                <Activity size={20} />
              </button>
              <button
                className={`sidebar-tab-btn ${leftActiveTab === "versions" && !leftSidebarCollapsed ? "active" : ""}`}
                onClick={() => {
                  if (leftActiveTab === "versions") setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  else {
                    setLeftActiveTab("versions");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Version Timeline"
              >
                <History size={20} />
              </button>
              <button
                className={`sidebar-tab-btn ${leftActiveTab === "settings" && !leftSidebarCollapsed ? "active" : ""}`}
                onClick={() => {
                  if (leftActiveTab === "settings") setLeftSidebarCollapsed(!leftSidebarCollapsed);
                  else {
                    setLeftActiveTab("settings");
                    setLeftSidebarCollapsed(false);
                  }
                }}
                title="Settings"
              >
                <Settings size={20} />
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
                    currentUser={user}
                    activeFileId={activeFileId}
                    onFileSelect={handleFileSelect}
                    openTabs={tabs}
                    onFileDelete={handleFileDelete}
                  />
                )}

                {leftActiveTab === "notes" && (
                  <div className="notes-pane">
                    {/* Top Mode Header / Tabs */}
                    <div className="notes-mode-header">
                      <div className="notes-mode-tabs">
                        <button
                          type="button"
                          className={`notes-mode-btn ${notesMode === "edit" ? "active" : ""}`}
                          onClick={() => setNotesMode("edit")}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className={`notes-mode-btn ${notesMode === "preview" ? "active" : ""}`}
                          onClick={() => setNotesMode("preview")}
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                      </div>

                      <div className="notes-export-wrapper">
                        <button
                          type="button"
                          className="notes-export-trigger-btn"
                          onClick={() => setNotesExportMenuOpen(!notesExportMenuOpen)}
                          title="Export Notes"
                        >
                          <Download size={12} />
                          <span>Export</span>
                          <ChevronDown size={10} />
                        </button>

                        {notesExportMenuOpen && (
                          <>
                            <div className="notes-export-overlay" onClick={() => setNotesExportMenuOpen(false)} />
                            <div className="notes-export-dropdown">
                              <button type="button" className="export-item" onClick={() => downloadNotes("md")}>
                                <FileText size={12} />
                                <span>Save as Markdown (.md)</span>
                              </button>
                              <button type="button" className="export-item" onClick={() => downloadNotes("txt")}>
                                <FileText size={12} />
                                <span>Save as Text (.txt)</span>
                              </button>
                              <button type="button" className="export-item" onClick={() => downloadNotes("html")}>
                                <FileText size={12} />
                                <span>Save as Styled HTML (.html)</span>
                              </button>
                              <div className="export-divider" />
                              <button type="button" className="export-item" onClick={copyNotesToClipboard}>
                                {copiedNotes ? <Check size={12} style={{ color: "#2ea043" }} /> : <Copy size={12} />}
                                <span>{copiedNotes ? "Copied!" : "Copy to Clipboard"}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Formatting Toolbar - Only visible in Edit Mode */}
                    {notesMode === "edit" && (
                      <div className="notes-formatting-toolbar">
                        <button type="button" className="format-btn" onClick={() => insertMarkdown("bold")} title="Bold text">
                          <Bold size={12} />
                        </button>
                        <button type="button" className="format-btn" onClick={() => insertMarkdown("italic")} title="Italic text">
                          <Italic size={12} />
                        </button>
                        <button type="button" className="format-btn" onClick={() => insertMarkdown("heading")} title="Heading">
                          <Heading size={12} />
                        </button>
                        <span className="format-divider" />
                        <button type="button" className="format-btn" onClick={() => insertMarkdown("list")} title="Bullet List">
                          <List size={12} />
                        </button>
                        <button type="button" className="format-btn" onClick={() => insertMarkdown("code")} title="Code Block">
                          <Code size={12} />
                        </button>
                      </div>
                    )}

                    {/* Main Content Area */}
                    {notesMode === "edit" ? (
                      <textarea
                        ref={notesTextareaRef}
                        className="notes-textarea"
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Capture thoughts or copy paste reference documents..."
                      />
                    ) : (
                      <div
                        className="notes-preview"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(notesText) || '<p style="color: var(--ce-text-muted); font-style: italic;">No notes content yet.</p>' }}
                      />
                    )}

                    {/* Footer Stats */}
                    <div className="notes-footer-status">
                      <span>Auto-saved to workspace</span>
                      <span className="notes-stats">
                        {getNotesStats().wordCount} W | {getNotesStats().charCount} C
                      </span>
                    </div>
                  </div>
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

                {leftActiveTab === "versions" && (
                  <div className="version-timeline-pane">
                    <div className="version-timeline-header">
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Workspace Snapshots</span>
                      {currentUserRole !== "VIEWER" && (
                        <button className="version-save-btn" onClick={handleSaveVersion}>
                          <Plus size={12} />
                          <span>Snapshot</span>
                        </button>
                      )}
                    </div>

                    {versions.length > 0 ? (
                      <>
                        <button
                          className="ce-btn-primary"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "8px",
                            fontSize: "0.8rem"
                          }}
                          onClick={startPlayback}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>Replay Workspace History</span>
                        </button>

                        <div className="versions-list">
                          {versions.map((ver) => (
                            <div key={ver.versionId} className="version-card">
                              <div className="version-card-meta">
                                <span className="version-tag">{ver.versionId}</span>
                                <span className="version-time">
                                  {new Date(ver.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div className="version-author">
                                <User size={12} style={{ color: "var(--ce-accent)" }} />
                                <span>{ver.editedBy.username}</span>
                              </div>
                              <div className="version-card-actions">
                                <button
                                  className="version-action-btn"
                                  onClick={() => {
                                    setDiffVersion(ver);
                                    setIsDiffModalOpen(true);
                                  }}
                                >
                                  Compare
                                </button>
                                <button
                                  className="version-action-btn restore"
                                  onClick={async () => {
                                    const confirmRestore = window.confirm("Are you sure you want to restore the file to this version snapshot?");
                                    if (confirmRestore) {
                                      try {
                                        await collabService.restoreVersion(roomId, activeFileIdRef.current, ver.versionId);
                                        triggerNotification("Snapshot restored successfully.");
                                      } catch (err) {
                                        alert(err.response?.data?.message || "Failed to restore version.");
                                      }
                                    }
                                  }}
                                >
                                  Restore
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="activity-empty-state">
                        <div className="empty-state-icon-wrapper">
                          <History size={24} />
                        </div>
                        <h4 className="empty-state-title">No snapshots yet</h4>
                        <p className="empty-state-desc">
                          Click "Snapshot" above to capture a point-in-time state of your code to compare and restore later.
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
                            const newTheme = e.target.value;
                            document.documentElement.className = newTheme;
                            localStorage.setItem("codeExpoHomeTheme", newTheme);
                            setEditorTheme(newTheme);
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
              <div className="workspace-editor-tabs" style={{ display: "flex", gap: "2px", overflowX: "auto", maxWidth: "calc(100% - 240px)" }}>
                {tabs.map((tab) => {
                  const isActive = tab._id === activeFileId;
                  return (
                    <div
                      key={tab._id}
                      className={`editor-tab ${isActive ? "active" : ""}`}
                      onClick={() => handleFileSelect(tab._id)}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <FileCode size={13} className="editor-tab-icon" />
                      <span className="tab-name-text" style={{ whiteSpace: "nowrap" }}>
                        {tab.name}
                      </span>
                      <button
                        onClick={(e) => handleCloseTab(e, tab._id)}
                        className="tab-close-btn"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--ce-text-muted)",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          borderRadius: "4px"
                        }}
                      >
                        <X size={10} />
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
                    title="Split view (Editor + Board)"
                  >
                    <Layers size={12} />
                    <span>Split</span>
                  </button>
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

                <select className="ce-select-box" value={editorLanguage} disabled>
                  <option value={editorLanguage}>{editorLanguage.toUpperCase()}</option>
                </select>

                <button
                  className={`btn-save-code ce-btn-icon ${blameMode ? "active" : ""}`}
                  onClick={() => setBlameMode(!blameMode)}
                  title="Toggle Code Ownership (Git Blame)"
                  style={{
                    backgroundColor: blameMode ? "rgba(88, 166, 255, 0.15)" : "transparent",
                    borderColor: blameMode ? "#58a6ff" : "var(--ce-border)",
                    color: blameMode ? "#58a6ff" : "#e6edf3",
                    marginRight: "8px"
                  }}
                >
                  <Users size={12} style={{ marginRight: "4px" }} />
                  <span>Blame</span>
                </button>

                <button
                  className={`btn-save-code ce-btn-icon ${isFullscreen ? "active" : ""}`}
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  style={{
                    backgroundColor: isFullscreen ? "rgba(255, 161, 22, 0.15)" : "transparent",
                    borderColor: isFullscreen ? "#ffa116" : "var(--ce-border)",
                    color: isFullscreen ? "#ffa116" : "#e6edf3",
                    marginRight: "8px"
                  }}
                >
                  {isFullscreen ? <Minimize2 size={12} style={{ marginRight: "4px" }} /> : <Maximize2 size={12} style={{ marginRight: "4px" }} />}
                  <span>{isFullscreen ? "Window" : "Full Screen"}</span>
                </button>

                {currentUserRole !== "VIEWER" && (
                  <button className="btn-save-code ce-btn-icon" onClick={handleSaveCode} title="Save file state" style={{ marginRight: "8px" }}>
                    <span>Save</span>
                  </button>
                )}
              </div>
            </div>

            {/* Splittable Monaco & Whiteboard Drawing Space */}
            <div className="workspace-render-split">
              <div
                className="monaco-pane"
                style={{
                  width: layoutMode === "editor" ? "100%" : layoutMode === "whiteboard" ? "0%" : `${splitPercent}%`,
                  display: layoutMode === "whiteboard" ? "none" : "block"
                }}
              >
                {activeFileId ? (
                  <MonacoEditor
                    height="100%"
                    theme={editorTheme === "light" ? "custom-light" : "custom-dark"}
                    language={editorLanguage}
                    value={code}
                    onChange={handleEditorChange}
                    onMount={handleEditorMount}
                    options={{
                      readOnly: isPlaybackActive || currentUserRole === "VIEWER",
                      fontSize: editorFontSize,
                      fontFamily: editorFontFamily,
                      minimap: { enabled: editorShowMinimap },
                      tabSize: editorTabSize,
                      wordWrap: editorWordWrap,
                      lineNumbers: editorLineNumbers,
                      quickSuggestions: editorSuggestions === "disabled" ? false : { other: true, comments: true, strings: true },
                      suggestOnTriggerCharacters: editorSuggestions !== "disabled",
                      acceptSuggestionOnEnter: editorSuggestions === "ai" ? "on" : "smart",
                      snippetSuggestions: editorSuggestions === "disabled" ? "none" : "inline",
                      detectIndentation: false,
                      automaticLayout: true,
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
                ) : (
                  <div className="vscode-welcome-screen">
                    <div className="welcome-inner">
                      <div className="welcome-header">
                        <div className="welcome-logo">
                          <Code2 size={40} className="logo-spark" />
                        </div>
                        <h1 className="welcome-title">CodeExpo Workspace</h1>
                        <p className="welcome-subtitle">A professional collaborative editor sandboxed in Docker</p>
                      </div>

                      <div className="welcome-sections-grid">
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
                <button
                  className={`floating-whiteboard-btn ${layoutMode !== "editor" ? "active" : ""}`}
                  onClick={toggleWhiteboard}
                  title={layoutMode === "editor" ? "Open Whiteboard Split (60% Editor / 40% Whiteboard)" : "Close Whiteboard Split"}
                >
                  <Palette size={18} />
                </button>
              </div>

              {/* Draggable Divider Handle */}
              {layoutMode === "split" && (
                <div className="workspace-drag-divider" onMouseDown={startWorkspaceResizing}>
                  <div className="divider-line" />
                </div>
              )}

              {/* Collaborative Whiteboard Split Pane */}
              {layoutMode !== "editor" && (
                <div
                  className="whiteboard-pane"
                  style={{ width: layoutMode === "whiteboard" ? "100%" : `${100 - splitPercent}%` }}
                >
                  <Whiteboard
                    roomId={roomId}
                    activeUsers={users}
                    currentUser={user}
                    room={room}
                  />
                </div>
              )}
            </div>

            {/* Drag Resize Handle for bottom panel */}
            <div className="console-drag-handle" onMouseDown={startConsoleResizing} />

            {/* 6. BOTTOM CONSOLE PANEL */}
            <div className="ce-console-panel" style={{ height: `${consoleHeight}px` }}>
              <div className="console-tab-header">
                <div className="console-tabs">
                  <button
                    className={`console-tab-btn ${consoleTab === "output" ? "active" : ""}`}
                    onClick={() => setConsoleTab("output")}
                  >
                    <Laptop size={14} />
                    <span>Terminal Output</span>
                  </button>
                  <button
                    className={`console-tab-btn ${consoleTab === "input" ? "active" : ""}`}
                    onClick={() => setConsoleTab("input")}
                  >
                    <FileText size={14} />
                    <span>Program Input (stdin)</span>
                  </button>
                  <button
                    className={`console-tab-btn ${consoleTab === "console" ? "active" : ""}`}
                    onClick={() => setConsoleTab("console")}
                  >
                    <Activity size={14} />
                    <span>Execution Logs</span>
                  </button>
                </div>

                {currentUserRole !== "VIEWER" && (
                  <div className="console-actions">
                    <button className="ce-btn-run" onClick={handleRunCode}>
                      <Play size={13} />
                      <span>Run Program</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="console-tab-body">

                {consoleTab === "output" && (
                  <div
                    className="terminal-shell-container"
                    onClick={() => {
                      const inputEl = document.querySelector(".terminal-interactive-input");
                      if (inputEl) inputEl.focus();
                    }}
                  >
                    <pre className="terminal-output-pre">
                      {terminalOutput || "Terminal ready. Trigger 'Run Program' above to capture outputs."}
                    </pre>
                    {isTerminalExecuting && (
                      <form
                        className="terminal-input-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = terminalInputVal;
                          socket.emit("terminal-input", { input: val });
                          setTerminalInputVal("");
                        }}
                      >
                        <span className="terminal-prompt-prefix">❯</span>
                        <input
                          type="text"
                          className="terminal-interactive-input"
                          value={terminalInputVal}
                          onChange={(e) => setTerminalInputVal(e.target.value)}
                          placeholder="Type input here and press Enter..."
                          autoFocus
                        />
                      </form>
                    )}
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
              </div>
            </div>
          </main>

          {/* 5. RIGHT SIDEBAR WRAPPER */}
          <div className={`ce-right-sidebar-wrapper ${rightSidebarCollapsed ? "collapsed" : ""}`}>
            {/* Toggle Button */}
            <button
              type="button"
              className={`right-sidebar-toggle-btn ${rightSidebarCollapsed ? "collapsed" : ""}`}
              onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
              title={rightSidebarCollapsed ? "Expand Right Panel" : "Collapse Right Panel"}
            >
              {rightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* 5. RIGHT SIDEBAR */}
            <aside className="ce-right-sidebar">

              <div className="right-sidebar-content">

                {/* Section 1: Participants */}
                <section className="ce-right-section">
                  <div className="section-header">
                    <h3>PARTICIPANTS ({(room?.participants || []).length})</h3>
                    <button type="button" className="ce-btn-xs" onClick={copyRoomId} title="Copy Room Invite Link">
                      <UserPlus size={11} />
                      <span>Invite</span>
                    </button>
                  </div>

                  <div className="users-list-pane">
                    {(room?.participants || []).map((p) => {
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

                          {/* Right Column: Actions and Mute Status */}
                          <div className="user-pane-actions">
                            {p.isMuted && (
                              <span className="user-mute-status" title="Muted">
                                <MicOff size={11} className="mute-icon-red" />
                              </span>
                            )}
                            {canIControlTarget && (
                              <button
                                type="button"
                                className="user-pane-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserRowClick(e, p);
                                }}
                                title="Manage User"
                              >
                                <MoreVertical size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  <div className="chat-tabs-header">
                    <button
                      className={`chat-tab-btn ${chatTab === "room" ? "active" : ""}`}
                      onClick={() => setChatTab("room")}
                    >
                      Room
                      {roomTabUnread && <span className="chat-tab-unread-dot" />}
                    </button>
                    <button
                      className={`chat-tab-btn ${chatTab === "private" ? "active" : ""}`}
                      onClick={() => setChatTab("private")}
                    >
                      Direct Message
                      {privateTabUnread && <span className="chat-tab-unread-dot" />}
                    </button>
                  </div>

                  {chatTab === "private" && (
                    <div className="private-recipient-selector">
                      <label>To:</label>
                      <select
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
                                    {msg.username?.charAt(0).toUpperCase()}
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
                              </div>
                            </div>
                            {isSelf && (
                              <div className="chat-avatar-wrapper-circle">
                                {user?.avatar ? (
                                  <img src={user.avatar} alt="Me" className="chat-bubble-avatar-img" />
                                ) : (
                                  <div className="chat-bubble-avatar-initial self" style={{ backgroundColor: getCursorColor(user.username) }}>
                                    {user.username?.charAt(0).toUpperCase()}
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
                                      {msg.username?.charAt(0).toUpperCase()}
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
                                </div>
                              </div>
                              {isSelf && (
                                <div className="chat-avatar-wrapper-circle">
                                  {user?.avatar ? (
                                    <img src={user.avatar} alt="Me" className="chat-bubble-avatar-img" />
                                  ) : (
                                    <div className="chat-bubble-avatar-initial self" style={{ backgroundColor: getCursorColor(user.username) }}>
                                      {user.username?.charAt(0).toUpperCase()}
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

                {/* Room Deletion & Leave Section */}
                <div className="workspace-danger-footer">
                  {String(room.createdBy?._id || room.createdBy) === String(user?.id) && (
                    <button className="ce-btn-danger ce-btn-block" onClick={handleDeleteRoomAction}>
                      <Trash2 size={14} />
                      <span>Delete Room</span>
                    </button>
                  )}
                  <button className="ce-btn-secondary ce-btn-block" onClick={handleLeaveRoomAction}>
                    <LogOut size={14} />
                    <span>Leave Workspace</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* 8. MOBILE VIEW NAVIGATION TABS */}
        <footer className="ce-mobile-tabs-nav">
          <button className={`mobile-tab-btn ${mobileTab === "editor" ? "active" : ""}`} onClick={() => setMobileTab("editor")}>
            <Code2 size={16} />
            <span>Editor</span>
          </button>
          <button className={`mobile-tab-btn ${mobileTab === "whiteboard" ? "active" : ""}`} onClick={() => setMobileTab("whiteboard")}>
            <Palette size={16} />
            <span>Board</span>
          </button>
          <button className={`mobile-tab-btn ${mobileTab === "chat" ? "active" : ""}`} onClick={() => setMobileTab("chat")}>
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
          <button className={`mobile-tab-btn ${mobileTab === "console" ? "active" : ""}`} onClick={() => setMobileTab("console")}>
            <Terminal size={16} />
            <span>Console</span>
          </button>
          <button className={`mobile-tab-btn ${mobileTab === "participants" ? "active" : ""}`} onClick={() => setMobileTab("participants")}>
            <Users size={16} />
            <span>Users</span>
          </button>
        </footer>

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
          <div className="ce-modal-overlay">
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
                  onClick={() => setKickModalOpen(false)}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  className="ce-btn-danger"
                  onClick={confirmKickUser}
                  style={{ flex: 1, padding: "10px 0", fontWeight: "600", borderRadius: "6px", cursor: "pointer", background: "var(--ce-danger, #f85149)", color: "#ffffff", border: "none" }}
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
                {incomingCall.username.charAt(0).toUpperCase()}
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
        {inCall && (
          <div
            className="ce-floating-call-panel"
            style={{
              left: `${callPanelPos.x}px`,
              top: `${callPanelPos.y}px`,
              position: "fixed",
              zIndex: 9999
            }}
          >
            <div className="call-panel-header" onMouseDown={handleDragStart}>
              <div className="call-panel-title">
                <span className="live-badge">LIVE</span>
                <span>{callType === "video" ? "Video Call" : "Audio Call"}</span>
              </div>
              <button className="call-panel-close-btn" onClick={handleLeaveCall}>
                <X size={16} />
              </button>
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
                  />
                );
              })}
            </div>

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

              <button
                className="call-action-btn hangup"
                onClick={handleLeaveCall}
                title="End Call"
              >
                <Phone size={18} style={{ transform: "rotate(135deg)" }} />
              </button>
            </div>
          </div>
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
                    automaticLayout: true
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
                    const confirmRestore = window.confirm("Are you sure you want to restore the file to this version snapshot?");
                    if (confirmRestore) {
                      try {
                        await collabService.restoreVersion(roomId, activeFileIdRef.current, diffVersion.versionId);
                        setIsDiffModalOpen(false);
                        setDiffVersion(null);
                        triggerNotification("Snapshot restored successfully.");
                      } catch (err) {
                        alert(err.response?.data?.message || "Failed to restore version.");
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

              <button
                className={`context-menu-item ${contextMenu.participant.isMuted ? "unmute" : "mute"}`}
                onClick={() => {
                  handleActionMute(contextMenu.participant.user._id || contextMenu.participant.user, !contextMenu.participant.isMuted);
                  setContextMenu(null);
                }}
              >
                <MicOff size={14} />
                <span>{contextMenu.participant.isMuted ? "Unmute Chat" : "Mute Chat"}</span>
              </button>

              <button
                className="context-menu-item danger"
                onClick={() => {
                  handleRemoveUser(contextMenu.participant.user._id || contextMenu.participant.user, contextMenu.participant.user.username);
                  setContextMenu(null);
                }}
              >
                <Trash2 size={14} />
                <span>Kick from Room</span>
              </button>
            </div>
          </div>,
          document.body
        )}
        {/* Futuristic Exit Gate Animation Overlay */}
        {showGateOpenAnimation && (
          <div className="ce-gate-overlay exiting">
            <div className="gate-door gate-door-left exiting" />
            <div className="gate-door gate-door-right exiting" />
            <div className="gate-core-portal exiting">
              <div className="gate-portal-glow exiting" />
              <h2 className="gate-portal-text exiting">Workspace Synced</h2>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// --- CallParticipantCard Subcomponent for speaking indicator and stream binding ---
function CallParticipantCard({ id, username, stream, isLocal, isMuted, isCameraOff, avatar, getCursorColor }) {
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
          className="participant-video-feed"
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
              username.charAt(0).toUpperCase()
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

export default Editor;
