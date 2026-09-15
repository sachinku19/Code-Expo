import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Share2,
  MoreVertical,
  Users,
  Package,
  Globe,
  Lock,
  Code,
  User,
  Clock,
  Calendar,
  FileText,
  Edit3,
  Plus,
  Heart,
  LogIn,
  Copy,
  Check,
  UserMinus,
  ShieldAlert,
  ChevronDown,
  Loader2,
  X
} from "lucide-react";
import { getAvatarColor } from "../../utils/avatarUtils";
import { getRoomSocialStats } from "../../services/socialService";
import { updateRoomDetails } from "../../services/roomService";
import { useTheme } from "../../context/ThemeContext";
import "./RoomDetailsModal.css";

// Helper for language badge & color
const getLanguageDisplay = (lang) => {
  const l = String(lang || "").toLowerCase().trim();
  if (l === "javascript" || l === "js") {
    return { code: "JS", name: "JavaScript", bg: "#f7df1e", color: "#000000" };
  }
  if (l === "python" || l === "py") {
    return { code: "PY", name: "Python", bg: "#3776ab", color: "#ffffff" };
  }
  if (l === "cpp" || l === "c++") {
    return { code: "C++", name: "C++", bg: "#00599c", color: "#ffffff" };
  }
  if (l === "java") {
    return { code: "JAVA", name: "Java", bg: "#ea2d2e", color: "#ffffff" };
  }
  if (l === "typescript" || l === "ts") {
    return { code: "TS", name: "TypeScript", bg: "#3178c6", color: "#ffffff" };
  }
  if (l === "html" || l === "html5") {
    return { code: "HTML", name: "HTML", bg: "#e34f26", color: "#ffffff" };
  }
  if (l === "css" || l === "css3") {
    return { code: "CSS", name: "CSS", bg: "#1572b6", color: "#ffffff" };
  }
  if (l === "node" || l === "nodejs" || l === "node.js") {
    return { code: "NODE", name: "Node.js", bg: "#68a063", color: "#ffffff" };
  }
  if (l === "rust" || l === "rs") {
    return { code: "RS", name: "Rust", bg: "#dea584", color: "#000000" };
  }
  if (l === "go" || l === "golang") {
    return { code: "GO", name: "Go", bg: "#00add8", color: "#ffffff" };
  }
  return {
    code: (l || "CODE").toUpperCase().slice(0, 4),
    name: lang ? lang.charAt(0).toUpperCase() + lang.slice(1) : "General Code",
    bg: "#f59e0b",
    color: "#000000"
  };
};

// Formats date as M/D/YYYY
const formatCalendarDate = (dateVal) => {
  if (!dateVal) return new Date().toLocaleDateString();
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

// Relative time calculation
const formatRelativeAgo = (dateVal) => {
  if (!dateVal) return "Recently";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Recently";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} mo ago`;
};

const RoomDetailsModal = ({
  isOpen = true,
  room,
  currentUser,
  onClose,
  onEnterWorkspace,
  onEditRoom,
  onRoomUpdated,
  onKickMember,
  onReportMember,
  onReportRoom,
  likesList: initialLikesList = null,
  isLoadingLikes: initialIsLoadingLikes = false,
  onToast
}) => {
  const themeContext = useTheme ? useTheme() : null;
  const isLightMode = Boolean(
    themeContext?.resolvedTheme === "light" ||
    themeContext?.theme === "light" ||
    (typeof document !== "undefined" && (
      document.documentElement.classList.contains("light") ||
      document.body.classList.contains("light") ||
      document.documentElement.getAttribute("data-theme-mode") === "light"
    ))
  );

  const [currentRoom, setCurrentRoom] = useState(room || {});
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [activeMemberMenuId, setActiveMemberMenuId] = useState(null);
  const [likes, setLikes] = useState(initialLikesList || []);
  const [loadingLikes, setLoadingLikes] = useState(initialIsLoadingLikes);

  // In-place description editor state
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(room?.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [descError, setDescError] = useState("");

  const topMenuRef = useRef(null);
  const descTextareaRef = useRef(null);

  // Sync current room if prop changes
  useEffect(() => {
    if (room) {
      setCurrentRoom(room);
      setDescDraft(room.description || "");
    }
  }, [room]);

  const roomId = currentRoom?.roomId || currentRoom?._id || "";
  const currentUserId = String(currentUser?._id || currentUser?.id || "");
  const ownerId = String(currentRoom?.createdBy?._id || currentRoom?.createdBy || "");
  const isOwner = Boolean(currentUserId && ownerId && currentUserId === ownerId);

  // Auto-focus textarea when opening in-place editor
  useEffect(() => {
    if (isEditingDesc && descTextareaRef.current) {
      descTextareaRef.current.focus();
      const length = descTextareaRef.current.value.length;
      descTextareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditingDesc]);

  // Fetch likes if not provided
  useEffect(() => {
    if (initialLikesList !== null) {
      setLikes(initialLikesList);
      setLoadingLikes(initialIsLoadingLikes);
      return;
    }

    if (roomId) {
      let isMounted = true;
      setLoadingLikes(true);
      getRoomSocialStats(roomId)
        .then((res) => {
          if (isMounted && res?.success) {
            setLikes(res.likedBy || []);
          }
        })
        .catch((err) => {
          console.error("Failed to load room likes:", err);
          if (isMounted) setLikes([]);
        })
        .finally(() => {
          if (isMounted) setLoadingLikes(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [roomId, initialLikesList, initialIsLoadingLikes]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isEditingDesc) {
          setIsEditingDesc(false);
          setDescDraft(currentRoom.description || "");
          setDescError("");
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditingDesc, currentRoom.description]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (topMenuRef.current && !topMenuRef.current.contains(e.target)) {
        setShowTopMenu(false);
      }
      setActiveMemberMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const triggerToast = useCallback(
    (message, type = "success") => {
      if (onToast) {
        onToast(message, type);
      } else {
        // Fallback custom event for Code-Expo toast system
        window.dispatchEvent(
          new CustomEvent("ce:toast", {
            detail: { message, type }
          })
        );
      }
    },
    [onToast]
  );

  const handleCopyId = (e) => {
    e?.stopPropagation();
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopiedId(true);
      triggerToast("Room ID copied to clipboard!", "success");
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleShareRoom = (e) => {
    e?.stopPropagation();
    setShowTopMenu(false);
    if (!roomId) return;

    const shareUrl = `${window.location.origin}/join/${roomId}`;
    if (navigator.share) {
      navigator
        .share({
          title: currentRoom.title || "Code-Expo Room",
          text: `Join my collaborative workspace on Code-Expo!`,
          url: shareUrl
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            navigator.clipboard.writeText(shareUrl).then(() => {
              setCopiedLink(true);
              triggerToast("Room share link copied to clipboard!", "success");
              setTimeout(() => setCopiedLink(false), 2000);
            });
          }
        });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        triggerToast("Room share link copied to clipboard!", "success");
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const handleInvite = (e) => {
    e?.stopPropagation();
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      triggerToast("Room invite link copied! Share with collaborators.", "success");
    });
  };

  const handleEnter = (e) => {
    e?.stopPropagation();
    if (onEnterWorkspace) {
      onEnterWorkspace(roomId);
    }
    onClose?.();
  };

  const handleFullEditModal = (e) => {
    e?.stopPropagation();
    setShowTopMenu(false);
    if (onEditRoom) {
      onEditRoom(currentRoom);
    }
    onClose?.();
  };

  const handleStartEditDesc = (e) => {
    e?.stopPropagation();
    setDescDraft(currentRoom.description || "");
    setDescError("");
    setIsEditingDesc(true);
  };

  const handleSaveDescription = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isSavingDesc) return;

    const trimmed = descDraft.trim();
    if (trimmed.length > 1000) {
      setDescError("Description cannot exceed 1000 characters");
      return;
    }

    setIsSavingDesc(true);
    setDescError("");

    try {
      const res = await updateRoomDetails(roomId, { description: trimmed });
      if (res && res.success) {
        const updated = {
          ...currentRoom,
          description: trimmed
        };
        setCurrentRoom(updated);
        setIsEditingDesc(false);
        triggerToast("Room description updated successfully!", "success");
        if (onRoomUpdated) {
          onRoomUpdated(res.room || updated);
        }
      } else {
        setDescError(res?.message || "Failed to update description");
      }
    } catch (err) {
      setDescError(err.response?.data?.message || err.message || "Failed to save description");
    } finally {
      setIsSavingDesc(false);
    }
  };

  const handleKickUser = (e, uId, username) => {
    e?.stopPropagation();
    if (onKickMember) {
      onKickMember(roomId, uId, username);
    }
  };

  const handleReportUser = (e, uId, username) => {
    e?.stopPropagation();
    setActiveMemberMenuId(null);
    if (onReportMember) {
      onReportMember(uId, username, currentRoom);
    }
  };

  const handleReportCurrentRoom = (e) => {
    e?.stopPropagation();
    setShowTopMenu(false);
    if (onReportRoom) {
      onReportRoom(currentRoom);
    }
  };

  if (!isOpen || !room) return null;

  const langInfo = getLanguageDisplay(currentRoom.language);
  const ownerUsername = currentRoom.createdBy?.username || "Collaborator";
  const ownerAvatar = currentRoom.createdBy?.avatar;
  const lastActiveDate = currentRoom.lastActivity || currentRoom.updatedAt || currentRoom.createdAt;
  const formattedDate = formatCalendarDate(lastActiveDate);
  const relativeTime = formatRelativeAgo(lastActiveDate);

  // Derive tags from room data or fallback topics
  const defaultTags = ["coding", (currentRoom.language || "javascript").toLowerCase(), "webdev", "learning", "projects", "collaboration"];
  const tagsList =
    Array.isArray(currentRoom.tags) && currentRoom.tags.length > 0
      ? currentRoom.tags
      : defaultTags;

  const onlineUserIds = new Set(
    (currentRoom.activeUsers || []).map((u) => String(u.userId || u._id || u))
  );

  const participants = Array.isArray(currentRoom.participants) && currentRoom.participants.length > 0
    ? currentRoom.participants
    : [
        {
          user: currentRoom.createdBy,
          role: "OWNER"
        }
      ];

  const hasDescription = Boolean(currentRoom.description && currentRoom.description.trim());

  return createPortal(
    <div
      className={`ce-modal-overlay rdm-modal-overlay ${isLightMode ? "light light-mode" : "dark dark-mode"}`}
      data-theme={isLightMode ? "light" : "dark"}
      data-theme-mode={isLightMode ? "light" : "dark"}
      onClick={onClose}
    >
      <div
        className={`rdm-dialog-card ${isLightMode ? "light light-mode" : "dark dark-mode"}`}
        data-theme={isLightMode ? "light" : "dark"}
        data-theme-mode={isLightMode ? "light" : "dark"}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Room details overview"
      >
        {/* 1. TOP HEADER BAR */}
        <div className="rdm-top-bar">
          <button className="rdm-back-btn" onClick={onClose} aria-label="Go back">
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="rdm-top-actions">
            {/* Top 3-dots Menu */}
            <div className="rdm-menu-wrapper" ref={topMenuRef}>
              <button
                className="rdm-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopMenu((prev) => !prev);
                }}
                title="Options"
                aria-label="Room options"
              >
                <MoreVertical size={16} />
              </button>
              {showTopMenu && (
                <div className="rdm-dropdown-menu">
                  <button onClick={handleShareRoom}>
                    <Share2 size={13} />
                    <span>Copy Share Link</span>
                  </button>
                  <button onClick={handleCopyId}>
                    <Copy size={13} />
                    <span>Copy Room ID</span>
                  </button>
                  {isOwner && (
                    <button onClick={handleFullEditModal}>
                      <Edit3 size={13} />
                      <span>Edit Workspace Settings</span>
                    </button>
                  )}
                  <button className="rdm-menu-danger" onClick={handleReportCurrentRoom}>
                    <ShieldAlert size={13} />
                    <span>Report Room</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share Room CTA Button */}
            <button className="rdm-share-room-btn" onClick={handleShareRoom} title="Share Room Link">
              <Share2 size={15} />
              <span>{copiedLink ? "Copied Link!" : "Share Room"}</span>
            </button>
          </div>
        </div>

        {/* 2. HERO HEADER */}
        <div className="rdm-hero-section">
          <div className="rdm-hero-left">
            <span className="rdm-badge-pill">Room Overview</span>
            <div className="rdm-title-row">
              <span className="rdm-terminal-prompt">&gt;_</span>
              <h2 className="rdm-room-title">{currentRoom.title || "Untitled Workspace"}</h2>
            </div>
            <p className="rdm-hero-subtitle">
              Collaborate, code, and build something amazing together.
            </p>
          </div>
          <div className="rdm-hero-right">
            <div className="rdm-hero-visual-stack">
              <div className="rdm-stack-layer rdm-layer-1" />
              <div className="rdm-stack-layer rdm-layer-2" />
              <div className="rdm-stack-layer rdm-layer-3" />
              <div className="rdm-glowing-gold-card">
                <Users size={32} className="rdm-gold-users-icon" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. 2x2 GRID SECTION */}
        <div className="rdm-2x2-grid">
          {/* CARD 1: ROOM DETAILS */}
          <div className="rdm-card rdm-details-card">
            <div className="rdm-card-header">
              <div className="rdm-card-title">
                <Package size={16} className="rdm-icon-gold" />
                <span>Room Details</span>
              </div>
            </div>

            <div className="rdm-details-subgrid">
              {/* Subcard 1: ROOM ID */}
              <div className="rdm-subbox">
                <span className="rdm-subbox-label">
                  <span className="rdm-hash">#</span> ROOM ID
                </span>
                <div className="rdm-subbox-value-row">
                  <span className="rdm-subbox-value mono">{roomId}</span>
                  <button
                    className="rdm-mini-copy-btn"
                    onClick={handleCopyId}
                    title="Copy Room ID"
                    aria-label="Copy Room ID"
                  >
                    {copiedId ? (
                      <Check size={13} style={{ color: "var(--ce-success, #10b981)" }} />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              </div>

              {/* Subcard 2: VISIBILITY */}
              <div className="rdm-subbox">
                <span className="rdm-subbox-label">
                  {currentRoom.isPrivate ? <Lock size={12} /> : <Globe size={12} />} VISIBILITY
                </span>
                <div className="rdm-subbox-value-row">
                  <span className="rdm-subbox-value">
                    {currentRoom.isPrivate ? "Private Room" : "Public Room"}
                  </span>
                  <ChevronDown size={14} className="rdm-chevron-muted" />
                </div>
              </div>

              {/* Subcard 3: LANGUAGE */}
              <div className="rdm-subbox">
                <span className="rdm-subbox-label">
                  <Code size={12} /> LANGUAGE
                </span>
                <div className="rdm-subbox-value-row">
                  <div className="rdm-lang-badge-group">
                    <span
                      className="rdm-lang-tag"
                      style={{ background: langInfo.bg, color: langInfo.color }}
                    >
                      {langInfo.code}
                    </span>
                    <span className="rdm-lang-name">{langInfo.name}</span>
                  </div>
                  <ChevronDown size={14} className="rdm-chevron-muted" />
                </div>
              </div>

              {/* Subcard 4: OWNER */}
              <div className="rdm-subbox">
                <span className="rdm-subbox-label">
                  <User size={12} /> OWNER
                </span>
                <div className="rdm-subbox-value-row">
                  <div className="rdm-owner-info">
                    {ownerAvatar ? (
                      <img src={ownerAvatar} alt={ownerUsername} className="rdm-owner-avatar" />
                    ) : (
                      <div
                        className="rdm-owner-avatar-fallback"
                        style={{ backgroundColor: getAvatarColor(ownerUsername) }}
                      >
                        {ownerUsername.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="rdm-owner-name">{ownerUsername}</span>
                  </div>
                </div>
              </div>

              {/* Subcard 5: LAST ACTIVE */}
              <div className="rdm-subbox">
                <span className="rdm-subbox-label">
                  <Clock size={12} /> LAST ACTIVE
                </span>
                <div className="rdm-subbox-value-column">
                  <div className="rdm-date-row">
                    <Calendar size={13} className="rdm-calendar-icon" />
                    <span className="rdm-date-text">{formattedDate}</span>
                  </div>
                  <span className="rdm-relative-time">{relativeTime}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: ROOM DESCRIPTION */}
          <div className="rdm-card rdm-description-card">
            <div className="rdm-card-header">
              <div className="rdm-card-title">
                <FileText size={16} className="rdm-icon-gold" />
                <span>Room Description</span>
              </div>
              {isOwner && !isEditingDesc && hasDescription && (
                <button
                  type="button"
                  className="rdm-edit-btn"
                  onClick={handleStartEditDesc}
                  title="Edit Description"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>
              )}
            </div>

            <div className="rdm-description-body">
              {isEditingDesc ? (
                <form onSubmit={handleSaveDescription} className="rdm-inline-desc-form">
                  <textarea
                    ref={descTextareaRef}
                    className="rdm-inline-desc-textarea"
                    value={descDraft}
                    onChange={(e) => {
                      setDescDraft(e.target.value);
                      if (descError) setDescError("");
                    }}
                    placeholder="Describe your workspace, project goals, tech stack, or guidelines for collaborators..."
                    maxLength={1000}
                    rows={4}
                    disabled={isSavingDesc}
                  />
                  {descError && <span className="rdm-desc-error-msg">{descError}</span>}
                  <div className="rdm-inline-desc-actions">
                    <span className="rdm-desc-char-counter">
                      {descDraft.length}/1000
                    </span>
                    <div className="rdm-inline-desc-btn-group">
                      <button
                        type="button"
                        className="rdm-inline-cancel-btn"
                        onClick={() => {
                          setIsEditingDesc(false);
                          setDescDraft(currentRoom.description || "");
                          setDescError("");
                        }}
                        disabled={isSavingDesc}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rdm-inline-save-btn"
                        disabled={isSavingDesc || descDraft.length > 1000}
                      >
                        {isSavingDesc ? (
                          <>
                            <Loader2 size={13} className="rdm-spin-icon" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              ) : hasDescription ? (
                <p className="rdm-description-text">
                  {currentRoom.description}
                </p>
              ) : isOwner ? (
                <div className="rdm-empty-description-owner">
                  <p className="rdm-empty-desc-text">
                    No description has been added for this room yet.
                  </p>
                  <button
                    type="button"
                    className="rdm-add-description-btn"
                    onClick={handleStartEditDesc}
                    title="Add Room Description"
                  >
                    <Plus size={13} />
                    <span>Add Description</span>
                  </button>
                </div>
              ) : (
                <p className="rdm-description-text rdm-description-fallback">
                  This room is created for practicing and building projects together. We can discuss ideas, share code snippets, solve problems, and learn with each other. Everyone is welcome to join and contribute!
                </p>
              )}
            </div>

            <div className="rdm-tags-footer">
              {tagsList.map((tag, idx) => (
                <span key={idx} className="rdm-tag-pill">
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          </div>

          {/* CARD 3: MEMBERS */}
          <div className="rdm-card rdm-members-card">
            <div className="rdm-card-header">
              <div className="rdm-card-title">
                <Users size={16} className="rdm-icon-gold" />
                <span>Members ({participants.length})</span>
              </div>
              <button className="rdm-invite-btn" onClick={handleInvite} title="Invite Collaborators">
                <Plus size={13} />
                <span>Invite</span>
              </button>
            </div>

            <div className="rdm-members-list-scrollable">
              {participants.map((m, idx) => {
                const userObj = m.user && typeof m.user === "object" ? m.user : null;
                const uId = userObj ? userObj._id : m.user || m._id || m;
                const username = userObj ? userObj.username : m.username || "Collaborator";
                const avatar = userObj ? userObj.avatar : m.avatar;
                const role = m.role || (String(uId) === ownerId ? "OWNER" : "MEMBER");

                const isOnline =
                  onlineUserIds.has(String(uId)) ||
                  (currentRoom.activeUsers || []).some((au) => au.username === username);
                const isParticipantOwner = String(uId) === ownerId || role === "OWNER";
                const isSelf = String(uId) === currentUserId;

                return (
                  <div key={idx} className="rdm-member-row">
                    <div className="rdm-member-avatar-wrap">
                      {avatar ? (
                        <img src={avatar} alt={username} className="rdm-member-avatar" />
                      ) : (
                        <div
                          className="rdm-member-avatar-initials"
                          style={{ backgroundColor: getAvatarColor(username) }}
                        >
                          {username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`rdm-presence-dot ${isOnline ? "online" : "offline"}`} />
                    </div>

                    <div className="rdm-member-identity">
                      <span className="rdm-member-username">{username}</span>
                      <span className={`rdm-role-badge ${isParticipantOwner ? "owner" : "member"}`}>
                        {isParticipantOwner ? "OWNER" : "MEMBER"}
                      </span>
                    </div>

                    <div className="rdm-presence-indicator">
                      <span className={`rdm-status-dot ${isOnline ? "online" : "offline"}`} />
                      <span className="rdm-status-label">{isOnline ? "Online" : "Offline"}</span>
                    </div>

                    <div className="rdm-member-actions">
                      {isOwner && !isParticipantOwner && !isSelf ? (
                        <button
                          className="rdm-kick-btn"
                          onClick={(e) => handleKickUser(e, uId, username)}
                          title="Kick user from room"
                        >
                          <UserMinus size={13} />
                          <span>Kick</span>
                        </button>
                      ) : (
                        <span className="rdm-status-pill">{isOnline ? "Online" : "Offline"}</span>
                      )}

                      {!isSelf && (
                        <div className="rdm-member-menu-rel">
                          <button
                            className="rdm-member-more-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMemberMenuId(activeMemberMenuId === uId ? null : uId);
                            }}
                            title="Member options"
                          >
                            <MoreVertical size={13} />
                          </button>
                          {activeMemberMenuId === uId && (
                            <div className="rdm-member-dropdown">
                              <button onClick={(e) => handleReportUser(e, uId, username)}>
                                <ShieldAlert size={12} color="#ef4444" />
                                <span>Report User</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 4: LIKED BY */}
          <div className="rdm-card rdm-liked-card">
            <div className="rdm-card-header">
              <div className="rdm-card-title">
                <Heart size={16} className="rdm-icon-red" fill="#ef4444" color="#ef4444" />
                <span>Liked By ({likes.length})</span>
              </div>
            </div>

            <div className="rdm-likes-list-scrollable">
              {loadingLikes ? (
                <div className="rdm-likes-loading">Loading likes...</div>
              ) : likes.length === 0 ? (
                <div className="rdm-likes-empty">
                  <span>No likes yet. Be the first to like this room!</span>
                </div>
              ) : (
                likes.map((u, idx) => {
                  const userObj = typeof u === "object" ? u : {};
                  const username = userObj.username || "Collaborator";
                  const avatar = userObj.avatar;
                  const uId = userObj._id || idx;
                  const subtext = userObj.email || userObj.bio || "Active collaborator";

                  return (
                    <div key={uId} className="rdm-like-row">
                      <div className="rdm-like-left">
                        {avatar ? (
                          <img src={avatar} alt={username} className="rdm-like-avatar" />
                        ) : (
                          <div
                            className="rdm-like-avatar-initials"
                            style={{ backgroundColor: getAvatarColor(username) }}
                          >
                            {username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="rdm-like-info">
                          <span className="rdm-like-username">{username}</span>
                          <span className="rdm-like-subtext">{subtext}</span>
                        </div>
                      </div>
                      <div className="rdm-like-right">
                        <Heart size={15} fill="#ef4444" color="#ef4444" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 4. BOTTOM ACTION & COLLABORATION PROMPT */}
        <div className="rdm-bottom-action-container">
          <button className="rdm-enter-workspace-btn" onClick={handleEnter}>
            <LogIn size={18} />
            <span>Enter Workspace</span>
          </button>
          <div className="rdm-bottom-subtext">
            <span className="rdm-subtext-line" />
            <span className="rdm-subtext-label">Jump into the room and start collaborating</span>
            <span className="rdm-subtext-line" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RoomDetailsModal;
