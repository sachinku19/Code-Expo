import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/authService";
import {
  LayoutDashboard, Code2, DoorOpen, History, User, Settings,
  Pin, Search, Bell, Sun, Moon, LogOut, Terminal, Palette,
  Hash, Copy, Check, Share2, Layers, ChevronDown, Menu, X,
  FolderOpen, BookOpen, Activity, Phone, Video, Star, Shield, HelpCircle
} from "lucide-react";
import * as workspaceService from "../services/workspaceService";
import * as messageService from "../services/messageService";
import * as roomService from "../services/roomService";
import * as socialService from "../services/socialService";
import { submitWebsiteRating, getWebsiteRatingInfo } from "../services/websiteRatingService";
import "./MainLayout.css";
import Logo from "../components/shared/Logo";

export default function MainLayout({
  children,
  roomId,
  roomTitle,
  socketConnected,
  uniqueUsers = [],
  joinRequests = [],
  copyRoomId,
  copiedId,
  notifications = [],
  clearNotifications,
  onSearchSelect,
  inCall = false,
  callType = null,
  onJoinCall = null,
  onLeaveCall = null
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useAuth();

  // Sidebar state
  const [isPinned, setIsPinned] = useState(
    localStorage.getItem("ceSidebarPinned") === "true"
  );
  const [isHovered, setIsHovered] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("codeExpoHomeTheme") || "dark"
  );
  const [participantsDropdownOpen, setParticipantsDropdownOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

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

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Website Rating States
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingsList, setRatingsList] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchWebsiteRatingInfo = async () => {
    try {
      const data = await getWebsiteRatingInfo();
      if (data.success) {
        setAverageRating(data.averageRating || 0);
        setRatingsCount(data.ratingsCount || 0);
        setUserRating(data.userRating || 0);
        setRatingComment(data.userComment || "");
        setRatingsList(data.reviews || []);
      }
    } catch (err) {
      console.error("Error fetching website rating info:", err);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (userRating < 1 || userRating > 5) {
      alert("Please select a star rating between 1 and 5.");
      return;
    }
    setIsSubmittingRating(true);
    try {
      const data = await submitWebsiteRating(userRating, ratingComment);
      if (data.success) {
        setAverageRating(data.averageRating);
        setRatingsCount(data.ratingsCount);
        showToast("Website review submitted! Thank you!");
        await fetchWebsiteRatingInfo();
        setIsRatingModalOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (userId) {
      fetchWebsiteRatingInfo();
    }
  }, [user?.id, user?._id]);

  // --- GLOBAL SEARCH / COMMAND PALETTE STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [dashboardRooms, setDashboardRooms] = useState([]);
  const [loadingSearchData, setLoadingSearchData] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState([]);

  const searchInputRef = useRef(null);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() && (!roomId || roomId === "default")) {
        try {
          const res = await socialService.searchUsers(searchQuery);
          if (res.success) {
            setSearchedUsers(res.users || []);
          }
        } catch (err) {
          console.error("Search users error:", err);
        }
      } else {
        setSearchedUsers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, roomId]);

  const fetchSearchData = async () => {
    if (loadingSearchData) return;
    setLoadingSearchData(true);
    try {
      if (roomId && roomId !== "default") {
        const [treeData, messagesData] = await Promise.all([
          workspaceService.getWorkspaceTree(roomId).catch(() => ({ items: [] })),
          messageService.getMessage(roomId).catch(() => [])
        ]);
        setWorkspaceFiles(treeData.items || []);
        const msgs = messagesData.message || (Array.isArray(messagesData) ? messagesData : []);
        setChatMessages(msgs);
      } else {
        const [historyData, liveData] = await Promise.all([
          roomService.getUserRoomsHistory().catch(() => ({ rooms: [] })),
          roomService.getLiveRooms().catch(() => ({ rooms: [] }))
        ]);
        const historyList = historyData.rooms || [];
        const liveList = liveData.rooms || [];
        const combined = [...historyList];
        const combinedIds = new Set(combined.map(r => r.roomId));
        liveList.forEach(r => {
          if (!combinedIds.has(r.roomId)) {
            combined.push(r);
          }
        });
        setDashboardRooms(combined);
      }
    } catch (err) {
      console.error("Error fetching search data:", err);
    } finally {
      setLoadingSearchData(false);
    }
  };

  useEffect(() => {
    if (isSearchFocused) {
      fetchSearchData();
    }
  }, [isSearchFocused, roomId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + K focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape blur search
      if (e.key === "Escape") {
        searchInputRef.current?.blur();
        setIsSearchFocused(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getFilteredItems = () => {
    const q = searchQuery.toLowerCase().trim();
    const sections = [];

    if (roomId && roomId !== "default") {
      // --- IN ROOM ---
      // 1. Files
      if (q) {
        const matchingFiles = workspaceFiles
          .filter(f => f.type === "file" && f.name.toLowerCase().includes(q))
          .slice(0, 5)
          .map(f => ({
            id: `file-${f._id}`,
            title: f.name,
            subtitle: `In workspace ${f.isEntryPoint ? '[Entry Point]' : ''}`,
            icon: Code2,
            action: { type: "file", fileId: f._id }
          }));
        if (matchingFiles.length > 0) {
          sections.push({ title: "Workspace Files", items: matchingFiles });
        }
      }

      // 2. Room Commands (Filterable)
      const commands = [
        { label: "Run Compiler", action: { type: "action", action: "run-code" }, icon: Code2 },
        { label: "Copy Room invite ID", action: { type: "action", action: "copy-room-id" }, icon: Copy },
        { label: "Toggle Whiteboard split", action: { type: "action", action: "toggle-whiteboard" }, icon: Palette },
        { label: "Toggle Left Sidebar collapse", action: { type: "action", action: "toggle-sidebar" }, icon: Pin },
        { label: "Open Explorer tab", action: { type: "action", action: "switch-tab", tab: "files" }, icon: FolderOpen },
        { label: "Open Notes tab", action: { type: "action", action: "switch-tab", tab: "notes" }, icon: BookOpen },
        { label: "Open Activity tab", action: { type: "action", action: "switch-tab", tab: "activity" }, icon: Activity },
        { label: "Open Settings tab", action: { type: "action", action: "switch-tab", tab: "settings" }, icon: Settings },
        { label: "Leave Room Workspace", action: { type: "action", action: "leave-room" }, icon: LogOut }
      ];
      const matchedCommands = commands
        .filter(c => !q || c.label.toLowerCase().includes(q))
        .map(c => ({
          id: `cmd-${c.action.action}-${c.action.tab || ''}`,
          title: c.label,
          subtitle: "Quick Room Action",
          icon: c.icon,
          action: c.action
        }));
      if (matchedCommands.length > 0) {
        sections.push({ title: "Room Actions", items: matchedCommands });
      }

      // 3. Online Members
      const matchedUsers = uniqueUsers
        .filter(u => !q || u.username.toLowerCase().includes(q))
        .map(u => ({
          id: `user-${u.socketId}`,
          title: u.username,
          subtitle: "Collaborator (Online)",
          avatar: u.avatar,
          icon: User,
          action: { type: "user", username: u.username }
        }));
      if (matchedUsers.length > 0) {
        sections.push({ title: "Online Participants", items: matchedUsers });
      }

      // 4. Chat Messages
      if (q) {
        const matchedMsgs = chatMessages
          .filter(m => m.message && m.message.toLowerCase().includes(q))
          .slice(0, 4)
          .map(m => ({
            id: `msg-${m._id || Math.random()}`,
            title: m.message,
            subtitle: `Sent by ${m.username || 'Collaborator'}`,
            icon: Bell,
            action: { type: "chat", text: m.message }
          }));
        if (matchedMsgs.length > 0) {
          sections.push({ title: "Matching Messages", items: matchedMsgs });
        }
      }

    } else {
      // --- IN DASHBOARD ---
      // 1. Rooms
      const matchedRooms = dashboardRooms
        .filter(r => !q || r.title.toLowerCase().includes(q) || r.roomId.toLowerCase().includes(q))
        .slice(0, 6)
        .map(r => ({
          id: `room-${r.roomId}`,
          title: r.title,
          subtitle: `Room ID: ${r.roomId} • Language: ${r.language}`,
          icon: DoorOpen,
          badge: r.language,
          action: { type: "room", roomId: r.roomId }
        }));
      if (matchedRooms.length > 0) {
        sections.push({ title: "Rooms & Workspaces", items: matchedRooms });
      }

      // 2. Developers
      const matchedDevs = searchedUsers.map(u => ({
        id: `user-${u._id}`,
        title: u.username,
        subtitle: u.bio || "No bio yet",
        avatar: u.avatar,
        icon: User,
        action: { type: "view-profile", userId: u._id }
      }));
      if (matchedDevs.length > 0) {
        sections.push({ title: "Developers", items: matchedDevs });
      }

      // 3. Sandbox Shortcuts
      const sandboxes = [
        { lang: "javascript", label: "Create JavaScript Sandbox" },
        { lang: "python", label: "Create Python Sandbox" },
        { lang: "cpp", label: "Create C++ Sandbox" },
        { lang: "java", label: "Create Java Sandbox" }
      ];
      const matchedSandboxes = sandboxes
        .filter(s => !q || s.label.toLowerCase().includes(q))
        .map(s => ({
          id: `sandbox-${s.lang}`,
          title: s.label,
          subtitle: `Quick ${s.lang} workspace`,
          icon: Code2,
          action: { type: "sandbox", language: s.lang }
        }));
      if (matchedSandboxes.length > 0) {
        sections.push({ title: "Sandboxes", items: matchedSandboxes });
      }

      // 3. Navigation Shortcuts
      const navs = [
        { label: "Go to Dashboard", path: "/dashboard", tab: "dashboard", icon: LayoutDashboard },
        { label: "Go to Rooms", path: "/dashboard?tab=rooms", tab: "rooms", icon: DoorOpen },
        { label: "Go to History", path: "/dashboard?tab=history", tab: "history", icon: History },
        { label: "Go to Whiteboards", path: "/dashboard?tab=whiteboards", tab: "whiteboards", icon: Palette },
        { label: "Go to Notifications", path: "/dashboard?tab=notifications", tab: "notifications", icon: Bell },
        { label: "Go to Profile", path: "/dashboard?tab=profile", tab: "profile", icon: User },
        { label: "Go to Settings", path: "/dashboard?tab=settings", tab: "settings", icon: Settings }
      ];
      const matchedNavs = navs
        .filter(n => !q || n.label.toLowerCase().includes(q))
        .map(n => ({
          id: `nav-${n.tab}`,
          title: n.label,
          subtitle: "Navigation Shortcut",
          icon: n.icon,
          action: { type: "nav", path: n.path, tab: n.tab }
        }));
      if (matchedNavs.length > 0) {
        sections.push({ title: "Navigation Shortcuts", items: matchedNavs });
      }
    }

    const flatItems = [];
    sections.forEach(sec => {
      sec.items.forEach(item => {
        flatItems.push({
          ...item,
          sectionTitle: sec.title
        });
      });
    });

    return { sections, flatItems };
  };

  const handleSearchKeyDown = (e) => {
    const { flatItems } = getFilteredItems();
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedItem = flatItems[selectedIndex];
      if (selectedItem) {
        handleItemClick(selectedItem);
      }
    }
  };

  const handleItemClick = (item) => {
    setSearchQuery("");
    setIsSearchFocused(false);
    searchInputRef.current?.blur();

    if (item.action.type === "nav") {
      navigate(item.action.path);
    } else if (item.action.type === "room") {
      if (onSearchSelect) {
        onSearchSelect(item.action);
      } else {
        navigate(`/editor/${item.action.roomId}`);
      }
    } else {
      if (onSearchSelect) {
        onSearchSelect(item.action);
      }
    }
  };

  const { sections, flatItems } = getFilteredItems();

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("codeExpoHomeTheme", theme);
  }, [theme]);

  // Sync theme state if updated elsewhere (e.g. from Settings tab)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const currentTheme = document.documentElement.className;
          const cleanTheme = currentTheme.includes("light") ? "light" : "dark";
          setTheme(cleanTheme);
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Sync last active room ID
  useEffect(() => {
    if (roomId && roomId !== "default") {
      localStorage.setItem("ceLastActiveRoomId", roomId);
    }
  }, [roomId]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const handlePinToggle = (e) => {
    e.stopPropagation();
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    localStorage.setItem("ceSidebarPinned", String(nextPinned));
  };

  const handleLogout = () => {
    logoutUser().catch(err => console.error("Logout error:", err));
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const lastRoomId = localStorage.getItem("ceLastActiveRoomId") || "default";

  // Redesigned navigation items including Whiteboards & Notifications tabs
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "rooms", label: "Rooms", icon: DoorOpen, path: "/dashboard?tab=rooms" },
    { id: "history", label: "History", icon: History, path: "/dashboard?tab=history" },
    { id: "whiteboards", label: "Whiteboards", icon: Palette, path: "/dashboard?tab=whiteboards" },
    { id: "notifications", label: "Notifications", icon: Bell, path: "/dashboard?tab=notifications" },
    { id: "profile", label: "Profile", icon: User, path: "/dashboard?tab=profile" },
    { id: "settings", label: "Settings", icon: Settings, path: "/dashboard?tab=settings" },
    { id: "helpdesk", label: "Help Desk", icon: HelpCircle, path: "/dashboard?tab=helpdesk" },
  ];

  if (user && user.role === "admin") {
    menuItems.push({ id: "admin", label: "Admin Panel", icon: Shield, path: "/admin" });
  }

  const handleMenuClick = (item) => {
    if (item.id === "workspace" && location.pathname.startsWith("/editor/")) {
      return;
    }
    if (item.path.startsWith("/dashboard?tab=")) {
      const tab = item.path.split("=")[1];
      navigate(`/dashboard?tab=${tab}`);
    } else {
      navigate(item.path);
    }
  };

  const getActiveItem = () => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (location.pathname === "/dashboard") {
      if (tab) return tab;
      return "dashboard";
    }
    if (location.pathname.startsWith("/editor")) {
      return "workspace";
    }
    if (location.pathname === "/admin") {
      return "admin";
    }
    return "dashboard";
  };

  const activeItem = getActiveItem();
  const sidebarExpanded = isPinned || isHovered;

  const formatTime = (timeVal) => {
    if (!timeVal) return "";
    const date = new Date(timeVal);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCursorColor = (name) => {
    const colors = ["#58A6FF", "#38bdf8", "#4ade80", "#fb923c", "#c084fc", "#f87171", "#fbbf24"];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`ce-layout-wrapper ${theme} ${isFullscreen && roomId && roomId !== "default" ? "fullscreen-mode" : ""}`}>
      {/* TOP NAVIGATION BAR */}
      <header className="ce-topnav">
        <div className="topnav-left">
          <button className="drawer-hamburger-btn" onClick={() => setIsDrawerOpen(!isDrawerOpen)} title="Open navigation">
            <Menu size={18} />
          </button>

          <Logo size={28} showText={true} onClick={() => navigate("/dashboard")} className="ce-brand" />

          {roomId && roomId !== "default" && (
            <>
              <div className="ce-nav-divider" />
              <div className="ce-room-info">
                <span className="ce-room-title">{roomTitle || "Workspace"}</span>
                <div className="ce-nav-badge" onClick={copyRoomId} title="Copy Room ID">
                  <Hash size={12} />
                  <span>{roomId}</span>
                  {copiedId ? <Check size={12} className="text-success" style={{ marginLeft: "4px" }} /> : <Copy size={12} style={{ marginLeft: "4px" }} />}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Global Search and Editor search bar integration */}
        <div className="topnav-center">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={roomId && roomId !== "default" ? "Search room functions, chat, whiteboard..." : "Global search rooms, languages..."}
            />

            {/* Shortcut hint badge inside input */}
            {!searchQuery && !isSearchFocused && (
              <span className="search-shortcut-hint" style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.65rem", padding: "2px 6px", pointerEvents: "none" }}>
                Ctrl + K
              </span>
            )}

            {isSearchFocused && (
              <>
                <div className="search-dropdown-overlay" onClick={() => setIsSearchFocused(false)} />
                <div className="search-dropdown-panel">
                  {loadingSearchData ? (
                    <div className="dropdown-empty">Loading search items...</div>
                  ) : sections.length === 0 ? (
                    <div className="dropdown-empty">No results found for "{searchQuery}"</div>
                  ) : (
                    sections.map((section, secIdx) => (
                      <div key={secIdx} className="search-section">
                        <div className="search-section-header">{section.title}</div>
                        {section.items.map((item) => {
                          const Icon = item.icon || Code2;
                          const flatIndex = flatItems.findIndex(fi => fi.id === item.id);
                          const isSelected = flatIndex === selectedIndex;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={`search-result-item ${isSelected ? "selected" : ""}`}
                              onClick={() => handleItemClick(item)}
                              onMouseEnter={() => setSelectedIndex(flatIndex)}
                            >
                              {item.avatar !== undefined ? (
                                <div className="user-avatar-small" style={{ backgroundColor: item.avatar ? "transparent" : getCursorColor(item.title), flexShrink: 0 }}>
                                  {item.avatar ? (
                                    <img src={item.avatar} alt={item.title} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                                  ) : (
                                    item.title.charAt(0).toUpperCase()
                                  )}
                                </div>
                              ) : (
                                <span className="item-icon">
                                  <Icon size={14} />
                                </span>
                              )}
                              <div className="item-content">
                                <span className="item-title">{item.title}</span>
                                <span className="item-subtitle">{item.subtitle}</span>
                              </div>
                              {item.badge && <span className="item-badge">{item.badge}</span>}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="topnav-right">
          {roomId && roomId !== "default" && (
            <>
              <div className="ce-nav-status">
                <span className={`status-dot ${socketConnected ? "connected" : "disconnected"}`} />
                <span className="status-label">
                  {socketConnected ? "Connected" : "Offline"}
                </span>
              </div>

              <div className="ce-nav-avatar-group" style={{ position: "relative" }}>
                <div className="ce-avatar-stack">
                  {uniqueUsers.slice(0, 3).map((u) => (
                    <div
                      key={u.socketId}
                      className="ce-stacked-avatar"
                      style={{ backgroundColor: u.avatar ? "transparent" : getCursorColor(u.username) }}
                      title={u.username}
                    >
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        u.username.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                  {uniqueUsers.length > 3 && (
                    <div className="ce-stacked-avatar more-count">
                      +{uniqueUsers.length - 3}
                    </div>
                  )}
                </div>
                <button
                  className="ce-avatar-arrow-btn"
                  onClick={() => setParticipantsDropdownOpen(!participantsDropdownOpen)}
                >
                  <ChevronDown size={14} style={{ transform: participantsDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>

                {participantsDropdownOpen && (
                  <div className="ce-participants-dropdown">
                    <div className="dropdown-header">Online Participants</div>
                    <div className="dropdown-body" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {uniqueUsers.map((u) => (
                        <div key={u.socketId} className="dropdown-user-item">
                          <div className="user-avatar-small" style={{ backgroundColor: u.avatar ? "transparent" : getCursorColor(u.username) }}>
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
                              u.username.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="user-name" style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ce-text)" }}>
                            {u.username} {u.userId === user?.id ? "(you)" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {onJoinCall && (
                <>
                  <button
                    className={`ce-nav-action-btn ${inCall && callType === "audio" ? "active-call" : ""}`}
                    onClick={() => {
                      if (inCall) {
                        onLeaveCall();
                      } else {
                        onJoinCall("audio");
                      }
                    }}
                    title={inCall && callType === "audio" ? "Leave Audio Call" : "Start Audio Call"}
                  >
                    <Phone size={13} />
                    <span>{inCall && callType === "audio" ? "Leave" : "Audio"}</span>
                  </button>
                  <button
                    className={`ce-nav-action-btn ${inCall && callType === "video" ? "active-call" : ""}`}
                    onClick={() => {
                      if (inCall) {
                        onLeaveCall();
                      } else {
                        onJoinCall("video");
                      }
                    }}
                    title={inCall && callType === "video" ? "Leave Video Call" : "Start Video Call"}
                  >
                    <Video size={13} />
                    <span>{inCall && callType === "video" ? "Leave" : "Video"}</span>
                  </button>
                </>
              )}

              <button className="ce-nav-action-btn" onClick={copyRoomId} title="Share Room Invite">
                <Share2 size={13} />
                <span>Share</span>
              </button>

              {joinRequests.length > 0 && (
                <div className="topnav-btn warning-glow" title="Join Requests Pending" style={{ color: "var(--ce-danger)" }}>
                  <Layers size={15} />
                  <span className="notification-dot" />
                </div>
              )}
            </>
          )}

          <button className="topnav-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div
            className="topnav-bell-wrapper"
            onMouseEnter={() => setNotifDropdownOpen(true)}
            onMouseLeave={() => setNotifDropdownOpen(false)}
            style={{ position: "relative" }}
          >
            <button
              className="topnav-btn"
              onClick={() => {
                if (!roomId || roomId === "default") {
                  navigate("/dashboard?tab=notifications");
                } else {
                  setNotifDropdownOpen(!notifDropdownOpen);
                }
              }}
              title="Notifications"
            >
              <Bell size={15} />
              {notifications.length > 0 && <span className="notification-dot"></span>}
            </button>

            {notifDropdownOpen && (
              <div className="ce-notifications-dropdown">
                <div className="dropdown-header">
                  <span>Recent Notifications</span>
                  {notifications.length > 0 && clearNotifications && (
                    <button className="clear-all-btn" onClick={clearNotifications}>Clear</button>
                  )}
                </div>
                <div className="dropdown-body">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className="dropdown-notif-item">
                        <div className="notif-bullet" />
                        <div className="notif-content">
                          <p className="notif-text">{n.message}</p>
                          <span className="notif-time">{formatTime(n.time)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-notif-empty">
                      <Bell size={18} className="empty-bell-icon" />
                      <span>No new notifications</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-dropdown">
            <div className="user-profile-trigger">
              {user?.avatar ? (
                <img src={user.avatar} className="user-avatar-img" alt={user.username} />
              ) : (
                <span className="user-avatar-initial">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
              <span className="user-name-label">{user?.username || "Developer"}</span>
            </div>
            <div className="dropdown-menu">
              <div className="dropdown-user-info">
                <strong>{user?.username}</strong>
                <span>{user?.email}</span>
              </div>
              <hr />
              <button onClick={() => navigate("/dashboard?tab=profile")} className="dropdown-item">
                <User size={14} /> Profile
              </button>
              <button onClick={() => navigate("/dashboard?tab=settings")} className="dropdown-item">
                <Settings size={14} /> Settings
              </button>
              <hr />
              <button onClick={handleLogout} className="dropdown-item text-danger">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CORE BODY AREA */}
      <div className="ce-layout-body">
        {/* COLLAPSIBLE SIDEBAR */}
        <aside
          className={`ce-sidebar ${sidebarExpanded ? "expanded" : "collapsed"}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="sidebar-header-pin">
            <button className={`pin-btn ${isPinned ? "pinned" : ""}`} onClick={handlePinToggle} title="Pin Sidebar">
              <Pin size={13} />
            </button>
          </div>

          <nav className="sidebar-nav-menu">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className={`sidebar-nav-btn ${isActive ? "active" : ""}`}
                  title={!sidebarExpanded ? item.label : ""}
                >
                  <Icon size={16} className="sidebar-nav-icon" />
                  <span className="btn-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              className="sidebar-nav-btn"
              onClick={() => setIsRatingModalOpen(true)}
              title={!sidebarExpanded ? "Rate CodeExpo" : ""}
              style={{ color: "#f59e0b" }}
            >
              <Star size={16} className="sidebar-nav-icon" fill={userRating > 0 ? "#f59e0b" : "transparent"} />
              <span className="btn-label" style={{ fontWeight: 600 }}>Rate Us ★</span>
            </button>
            <button className="sidebar-nav-btn" onClick={handleLogout} title={!sidebarExpanded ? "Logout" : ""}>
              <LogOut size={16} className="sidebar-nav-icon" />
              <span className="btn-label">Logout</span>
            </button>
          </div>
        </aside>

        {/* PAGE CONTENT CONTAINER */}
        <main className={`ce-main-content ${isPinned ? "sidebar-expanded" : "sidebar-collapsed"}`}>
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="ce-mobile-bottom-nav">
        {menuItems.filter(item => ["dashboard", "rooms", "workspace", "profile"].includes(item.id)).map(item => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`mobile-nav-btn ${isActive ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TABLET/MOBILE SIDE DRAWER OVERLAY */}
      {isDrawerOpen && (
        <div className="ce-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* TABLET/MOBILE SIDE DRAWER */}
      <aside className={`ce-drawer-sidebar ${isDrawerOpen ? "open" : ""}`}>
        <div className="drawer-header-menu">
          <Logo size={28} showText={true} className="ce-brand" />
          <button className="drawer-close-menu-btn" onClick={() => setIsDrawerOpen(false)} title="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="drawer-nav-menu">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setIsDrawerOpen(false);
                  handleMenuClick(item);
                }}
                className={`drawer-nav-btn ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                <span className="btn-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="drawer-footer" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <button
            className="drawer-nav-btn"
            onClick={() => {
              setIsDrawerOpen(false);
              setIsRatingModalOpen(true);
            }}
            style={{ color: "#f59e0b" }}
          >
            <Star size={16} fill={userRating > 0 ? "#f59e0b" : "transparent"} />
            <span className="btn-label" style={{ fontWeight: 600 }}>Rate Us ★</span>
          </button>
          <button className="drawer-nav-btn" onClick={() => {
            setIsDrawerOpen(false);
            handleLogout();
          }}>
            <LogOut size={16} />
            <span className="btn-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* Website Rating & Review Modal */}
      {isRatingModalOpen && (
        <div className="ce-modal-overlay" style={{ zIndex: 99999 }}>
          <div className="ce-modal-card" style={{ maxWidth: "500px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--ce-bg-card)", border: "1px solid var(--ce-border)", color: "var(--ce-text)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--ce-border)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--ce-text)" }}>
                <Star size={16} style={{ color: "#f59e0b" }} fill="#f59e0b" />
                <span>Rate CodeExpo Platform</span>
              </h2>
              <button
                onClick={() => setIsRatingModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--ce-text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="rating-modal-scroll-body" style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
              {/* Average Score Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "rgba(255, 255, 255, 0.03)", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", border: "1px solid var(--ce-border)" }}>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b", lineHeight: 1 }}>
                  {averageRating > 0 ? averageRating : "N/A"}
                </div>
                <div>
                  <div style={{ display: "flex", gap: "2px", marginBottom: "2px" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} style={{ color: star <= Math.round(averageRating) ? "#f59e0b" : "var(--ce-text-muted)", fontSize: "1.1rem" }}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>
                    Overall rating ({ratingsCount} review{ratingsCount === 1 ? "" : "s"})
                  </div>
                </div>
              </div>

              {/* Submitting form */}
              <form onSubmit={handleSubmitRating} style={{ marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid var(--ce-border)" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px", color: "var(--ce-text)" }}>Your Review</h3>

                {/* Stars select */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "16px", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const fillStar = hoverRating ? star <= hoverRating : star <= userRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setUserRating(star)}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: "1.75rem",
                          cursor: "pointer",
                          padding: 0,
                          color: fillStar ? "#f59e0b" : "var(--ce-text-muted)",
                          transition: "transform 0.1s, color 0.1s"
                        }}
                      >
                        ★
                      </button>
                    );
                  })}
                  {userRating > 0 && (
                    <span style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)", marginLeft: "8px" }}>
                      ({userRating} out of 5 stars)
                    </span>
                  )}
                </div>

                <div className="setting-group" style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "6px", color: "var(--ce-text)" }}>Review Comment (Optional)</label>
                  <textarea
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    placeholder="Tell us what you like or how we can improve the platform..."
                    style={{
                      width: "100%",
                      height: "70px",
                      background: "rgba(0, 0, 0, 0.2)",
                      border: "1px solid var(--ce-border)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "var(--ce-text)",
                      fontSize: "0.85rem",
                      resize: "none",
                      fontFamily: "inherit"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="ce-btn-primary"
                  disabled={isSubmittingRating || userRating === 0}
                  style={{
                    width: "100%",
                    padding: "8px",
                    fontSize: "0.85rem",
                    background: "var(--ce-accent)",
                    color: "#000000",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: "6px",
                    cursor: userRating === 0 ? "not-allowed" : "pointer",
                    opacity: userRating === 0 ? 0.6 : 1
                  }}
                >
                  {isSubmittingRating ? "Submitting..." : "Submit Rating"}
                </button>
              </form>

              {/* Ratings list / Reviews */}
              <div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "12px", color: "var(--ce-text)" }}>
                  User Feedback ({ratingsList.length})
                </h3>

                {ratingsList.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {ratingsList.map((rev) => (
                      <div key={rev._id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", paddingBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ce-text)" }}>
                              {rev.user?.username || "Developer"}
                            </span>
                            <div style={{ display: "flex", gap: "1px" }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} style={{ color: star <= rev.rating ? "#f59e0b" : "var(--ce-text-muted)", fontSize: "0.75rem" }}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>
                            {new Date(rev.updatedAt || rev.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {rev.comment && (
                          <p style={{ fontSize: "0.8rem", color: "var(--ce-text-muted)", margin: "4px 0 0 0", lineHeight: "1.4" }}>
                            {rev.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px 0", color: "var(--ce-text-muted)", fontSize: "0.8rem" }}>
                    No reviews submitted yet for the platform.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Local layout Toast Alert */}
      {toastMessage && (
        <div className="ce-global-notification-toast" style={{ zIndex: 999999 }}>
          <Star size={14} className="toast-spark" style={{ color: "#f59e0b" }} fill="#f59e0b" />
          <span style={{ marginRight: "8px" }}>{toastMessage}</span>
          <button
            onClick={() => setToastMessage("")}
            className="toast-close-btn"
            title="Dismiss"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ce-text-muted)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
