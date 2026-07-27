import React, { useState, useEffect, useRef } from "react";
import { useCall } from "../../context/CallContext";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Minimize2, Maximize2, User, Hand,
  MessageSquare, Users, Signal,
  Search, Send, X, Check, Pin, PinOff,
  MoreVertical, Shield, Maximize, Grid, Info, Plus,
  UserPlus, SlidersHorizontal, ChevronRight, ChevronDown,
  Trash2, LogOut, AlertTriangle, Paperclip, Code2, AtSign,
  Smile
} from "lucide-react";
import "./CallOverlay.css";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const getCurrentFormattedTime = () => {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Animated Audio Waves component
function AudioEqualizer() {
  return (
    <div className="gm-audio-waves" title="Speaking actively">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

// ----------------------------------------------------------------------
// PRE-CALL SETUP MODAL
// ----------------------------------------------------------------------
function PreCallSetupModal() {
  const { preCallModal, closePreCallModal, handleStartCall } = useCall();
  const [callType, setCallType] = useState("audio");
  const [micPreview, setMicPreview] = useState(true);
  const [camPreview, setCamPreview] = useState(true);

  useEffect(() => {
    if (preCallModal?.selectedType) {
      setCallType(preCallModal.selectedType);
    }
  }, [preCallModal]);

  if (!preCallModal) return null;

  const partner = preCallModal.partner;
  const partnerName = partner.isGroup ? partner.name : (partner.username || "Developer");
  const partnerAvatar = partner.avatar;
  const isVideoLocked = preCallModal.selectedType === "video";

  const handleStart = () => {
    handleStartCall(callType, partner);
    closePreCallModal();
  };

  return (
    <div className="gm-modal-overlay" onClick={closePreCallModal}>
      <div className="gm-precall-card glassmorphic-modal" onClick={(e) => e.stopPropagation()}>
        <button className="gm-close-btn" onClick={closePreCallModal} title="Cancel">
          <X size={18} />
        </button>

        <div className="gm-precall-header">
          <div className="gm-avatar-wrapper">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="gm-avatar-img" />
            ) : (
              <div className="gm-avatar-placeholder">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="gm-online-indicator" title="Online & Ready" />
          </div>

          <h2 className="gm-participant-title">{partnerName}</h2>
          <div className="gm-network-badge">
            <Signal size={12} className="gm-signal-icon" />
            <span>Excellent Connection • 24ms</span>
          </div>
        </div>

        {/* Call Type Selection Cards */}
        <div className="gm-type-selection">
          {!isVideoLocked && (
            <div
              className={`gm-type-card ${callType === "audio" ? "selected" : ""}`}
              onClick={() => setCallType("audio")}
            >
              <div className="gm-type-icon-box">
                <Mic size={22} />
              </div>
              <div className="gm-type-info">
                <span className="gm-type-title">🎤 Audio Call</span>
                <span className="gm-type-subtitle">Voice-only HD stream</span>
              </div>
              {callType === "audio" && <Check size={18} className="gm-check-icon" />}
            </div>
          )}

          <div
            className={`gm-type-card ${callType === "video" ? "selected" : ""} ${isVideoLocked ? "locked" : ""}`}
            onClick={() => setCallType("video")}
          >
            <div className="gm-type-icon-box">
              <Video size={22} />
            </div>
            <div className="gm-type-info">
              <span className="gm-type-title">📹 Video Call</span>
              <span className="gm-type-subtitle">High definition 60FPS video {isVideoLocked ? "(Selected Mode)" : ""}</span>
            </div>
            {callType === "video" && <Check size={18} className="gm-check-icon" />}
          </div>
        </div>

        {/* Pre-Call Hardware Quick Toggles */}
        <div className="gm-precall-toggles">
          <button
            type="button"
            className={`gm-toggle-chip ${micPreview ? "active" : "disabled"}`}
            onClick={() => setMicPreview(!micPreview)}
          >
            {micPreview ? <Mic size={14} /> : <MicOff size={14} />}
            <span>{micPreview ? "Microphone On" : "Muted"}</span>
          </button>

          {callType === "video" && (
            <button
              type="button"
              className={`gm-toggle-chip ${camPreview ? "active" : "disabled"}`}
              onClick={() => setCamPreview(!camPreview)}
            >
              {camPreview ? <Video size={14} /> : <VideoOff size={14} />}
              <span>{camPreview ? "Camera On" : "Camera Off"}</span>
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="gm-precall-actions">
          <button type="button" className="gm-btn-secondary" onClick={closePreCallModal}>
            Cancel
          </button>
          <button type="button" className="gm-btn-primary" onClick={handleStart}>
            {callType === "video" ? <Video size={16} /> : <Phone size={16} />}
            <span>{callType === "video" ? "Join Video Call" : "Start Audio Call"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// INDIVIDUAL VIDEO TILE COMPONENT
// ----------------------------------------------------------------------
function ParticipantVideoTile({ feed, isLocal, isSpeaking, isPinned, onTogglePin }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && feed?.stream) {
      videoRef.current.srcObject = feed.stream;
    }
  }, [feed?.stream]);

  useEffect(() => {
    if (audioRef.current && feed?.stream && !isLocal) {
      audioRef.current.srcObject = feed.stream;
    }
  }, [feed?.stream, isLocal]);

  const username = isLocal ? "You (Local)" : (feed?.username || "Participant");
  const isMuted = feed?.isMuted;
  const isCameraOff = feed?.isCameraOff;

  return (
    <div className={`gm-video-tile ${isSpeaking ? "active-speaker" : ""} ${isPinned ? "pinned-tile" : ""} ${isCameraOff ? "cam-off" : ""}`}>
      {!isLocal && <audio ref={audioRef} autoPlay style={{ display: "none" }} />}

      {isCameraOff ? (
        <div className="gm-tile-avatar-container">
          <div className={`gm-avatar-pulse-ring ${isSpeaking ? "speaking" : ""}`} />
          <div className="gm-tile-avatar">
            <User size={36} />
          </div>
          <span className="gm-avatar-subtext">Camera Off</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="gm-video-element"
        />
      )}

      {/* Top Bar: Hand Raised & Pin Button */}
      <div className="gm-tile-top-bar">
        {feed?.handRaised && (
          <div className="gm-hand-badge" title="Hand Raised">
            <Hand size={13} />
            <span>Hand Raised</span>
          </div>
        )}

        <button
          type="button"
          className={`gm-pin-btn ${isPinned ? "pinned" : ""}`}
          onClick={onTogglePin}
          title={isPinned ? "Unpin from main screen" : "Pin to main screen"}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      {/* Bottom Name & Audio Status Overlay */}
      <div className="gm-tile-bottom-bar">
        <div className="gm-tile-name-tag">
          {isSpeaking ? (
            <AudioEqualizer />
          ) : isMuted ? (
            <MicOff size={13} className="gm-mic-icon muted" />
          ) : (
            <Mic size={13} className="gm-mic-icon active" />
          )}
          <span className="gm-tile-username">{username}</span>
          {isLocal && <span className="gm-you-pill">YOU</span>}
        </div>

        <div className="gm-tile-signal" title="Signal Strength">
          <Signal size={12} className="gm-signal-ok" />
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HIGH-POWERED UNIFIED SIDE PANEL (WITH SEARCH & TAB SWITCHER)
// ----------------------------------------------------------------------
function UnifiedSidePanel({ onClose, pinnedId, setPinnedId }) {
  const {
    remoteStreams,
    isMuted,
    isVideoOff,
    isHandRaised,
    inCallMessages,
    sendInCallMessage,
    setUnreadCount,
    handleEndCall
  } = useCall();

  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [text, setText] = useState("");
  const [chatTab, setChatTab] = useState("room"); // 'room' | 'direct'
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setUnreadCount(0);
  }, [setUnreadCount]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inCallMessages]);

  const remoteList = Object.keys(remoteStreams || {}).map((sId, index) => ({
    id: sId,
    socketId: sId,
    username: remoteStreams[sId].username || `Developer ${index + 1}`,
    handle: `@dev_${index + 1}`,
    role: index === 0 ? "MEMBER" : index === 1 ? "VIEWER" : "MEMBER",
    isSpeaking: index === 0,
    ...remoteStreams[sId]
  }));

  const allMembers = [
    {
      id: "local",
      username: "Sachin Kumar",
      handle: "@sachin_kumar",
      role: "OWNER",
      isMuted,
      isCameraOff: isVideoOff,
      handRaised: isHandRaised,
      isLocal: true,
      isSpeaking: !isMuted
    },
    {
      id: "user_raviraj",
      username: "RAVIRAJ KUMAR",
      handle: "@raviraj_kumar",
      role: "OWNER",
      isMuted: false,
      isCameraOff: false,
      isSpeaking: false
    },
    {
      id: "user_rohit",
      username: "Rohit Sharma",
      handle: "@rohit_sharma",
      role: "MEMBER",
      isMuted: false,
      isCameraOff: false,
      isSpeaking: true
    },
    {
      id: "user_sachin2",
      username: "sachin kumar",
      handle: "@sachin_k",
      role: "MEMBER",
      isMuted: true,
      isCameraOff: false,
      isSpeaking: false
    },
    ...remoteList
  ].filter((m) =>
    m.username.toLowerCase().includes(search.toLowerCase()) ||
    m.handle.toLowerCase().includes(search.toLowerCase())
  );

  const displayedMembers = showAllParticipants ? allMembers : allMembers.slice(0, 4);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendInCallMessage(text);
    setText("");
  };

  return (
    <div className="gm-unified-side-panel glassmorphism">
      <div className="panel-scroll-content">

        {/* =================================================================== */}
        {/* 1. PARTICIPANTS SECTION WITH SEARCH BUTTON & FILTER */}
        {/* =================================================================== */}
        <div className="gm-panel-section card-box">
          <div className="section-header">
            <div className="section-title">
              <Users size={16} className="title-icon" />
              <h3>PARTICIPANTS ({allMembers.length})</h3>
            </div>
            <button type="button" className="invite-btn">
              <UserPlus size={13} />
              <span>+ Invite</span>
            </button>
          </div>

          {/* Dedicated Search Input Bar with Filter */}
          <div className="section-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search participants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="clear-search-btn" onClick={() => setSearch("")}>
                <X size={12} />
              </button>
            )}
            <button type="button" className="filter-btn" title="Search & Filter">
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Member Card Rows */}
          <div className="participants-card-list">
            {displayedMembers.map((member) => {
              const isPinned = pinnedId === member.id;
              return (
                <div key={member.id} className={`member-card-row ${member.isLocal ? "highlight-local" : ""}`}>
                  <div className="member-avatar-box">
                    <div className="avatar-img-circle">
                      {member.username.charAt(0)}
                    </div>
                    <span className={`status-dot ${member.isMuted ? "offline" : "online"}`} />
                  </div>

                  <div className="member-details">
                    <div className="name-line">
                      <span className="member-name">{member.username}</span>
                      {member.isLocal && <span className="you-pill">YOU</span>}
                    </div>
                  </div>

                  <div className="member-controls">
                    {member.isSpeaking && <AudioEqualizer />}

                    {/* Role Pill Badge */}
                    <span className={`role-badge ${member.role.toLowerCase()}`}>
                      {member.role === "OWNER" && "👑 "}
                      {member.role}
                    </span>

                    <div className="options-menu-anchor" style={{ position: "relative" }}>
                      <button
                        type="button"
                        className="three-dots-btn"
                        onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenuId === member.id && (
                        <div className="gm-menu-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="gm-dropdown-item"
                            onClick={() => {
                              setPinnedId(isPinned ? null : member.id);
                              setActiveMenuId(null);
                            }}
                          >
                            <Pin size={13} />
                            <span>{isPinned ? "Unpin from screen" : "Pin to main screen"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {allMembers.length > 4 && (
            <button
              type="button"
              className="view-all-link"
              onClick={() => setShowAllParticipants(!showAllParticipants)}
            >
              <span>{showAllParticipants ? "Show fewer" : "View all participants"}</span>
              <ChevronRight size={14} className={showAllParticipants ? "rotate-90" : ""} />
            </button>
          )}
        </div>

        {/* =================================================================== */}
        {/* 2. ROOM & DIRECT MESSAGE CHAT PANEL (MATCHING IMAGE 2 TAB SWITCHER) */}
        {/* =================================================================== */}
        <div className="gm-panel-section card-box margin-top">

          {/* Segmented Tab Switcher: Room vs Direct Message */}
          <div className="chat-tab-switcher">
            <button
              type="button"
              className={`tab-pill ${chatTab === "room" ? "active" : ""}`}
              onClick={() => setChatTab("room")}
            >
              Room
            </button>
            <button
              type="button"
              className={`tab-pill ${chatTab === "direct" ? "active" : ""}`}
              onClick={() => setChatTab("direct")}
            >
              Direct Message
            </button>
          </div>

          {/* Chat Messages Stream with Outgoing / Incoming Aligned Bubbles */}
          <div className="room-chat-messages">

            {/* Demo Incoming Message */}
            <div className="chat-bubble-card incoming">
              <div className="msg-avatar">s</div>
              <div className="msg-content-block">
                <span className="msg-author-name">sachin kumar</span>
                <div className="msg-text-bubble">
                  <span>hello</span>
                  <span className="msg-time-sub">22 Jun, 12:39 pm</span>
                </div>
              </div>
            </div>

            {/* Demo Outgoing Message */}
            <div className="chat-bubble-card outgoing">
              <div className="msg-content-block">
                <div className="msg-text-bubble emerald">
                  <span>hello</span>
                  <span className="msg-time-sub">Jun 22, 12:39 PM</span>
                </div>
              </div>
              <div className="msg-avatar local">s</div>
            </div>

            {/* Demo Incoming Message */}
            <div className="chat-bubble-card incoming">
              <div className="msg-avatar">L</div>
              <div className="msg-content-block">
                <span className="msg-author-name">Lulu_developer</span>
                <div className="msg-text-bubble">
                  <span>hi</span>
                  <span className="msg-time-sub">22 Jun, 12:39 pm</span>
                </div>
              </div>
            </div>

            {/* Demo Outgoing Message */}
            <div className="chat-bubble-card outgoing">
              <div className="msg-content-block">
                <div className="msg-text-bubble emerald">
                  <span>hai</span>
                  <span className="msg-time-sub">Jun 22, 12:40 PM</span>
                </div>
              </div>
              <div className="msg-avatar local">s</div>
            </div>

            {/* Real In-Call Socket Messages Stream */}
            {inCallMessages.map((msg) => (
              <div key={msg.id} className="chat-bubble-card outgoing">
                <div className="msg-content-block">
                  <div className="msg-text-bubble emerald">
                    <span>{msg.text}</span>
                    <span className="msg-time-sub">{msg.time}</span>
                  </div>
                </div>
                <div className="msg-avatar local">Y</div>
              </div>
            ))}

            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Box */}
          <form onSubmit={handleSend} className="room-chat-form">
            <div className="chat-input-row">
              <input
                type="text"
                placeholder={chatTab === "room" ? "Message room..." : "Direct message user..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className="send-arrow-btn" disabled={!text.trim()}>
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>

        {/* =================================================================== */}
        {/* 3. DANGER ACTION BUTTONS (MATCHING IMAGE 2) */}
        {/* =================================================================== */}
        <div className="danger-footer-actions">
          <button type="button" className="btn-danger-outline" onClick={handleEndCall}>
            <Trash2 size={16} />
            <span>Delete Room</span>
          </button>

          <button type="button" className="btn-danger-outline" onClick={handleEndCall}>
            <LogOut size={16} />
            <span>Exit Workspace</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN CALL OVERLAY COMPONENT
// ----------------------------------------------------------------------
export default function CallOverlay() {
  const {
    activeCall,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    callDuration,
    isCallMinimized,
    setIsCallMinimized,
    toggleMute,
    toggleVideo,
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall,
    preCallModal,
    isHandRaised,
    toggleHandRaise,
    unreadCount,
    activeDrawer,
    setActiveDrawer
  } = useCall();

  // Pinning State (pinnedId: null | 'local' | socketId)
  const [pinnedId, setPinnedId] = useState(null);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.warn(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Keyboard Shortcuts (Ctrl+D: Mic, Ctrl+E: Video, Ctrl+H: Hand, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeCall || activeCall.status !== "connected") return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === "d") {
          e.preventDefault();
          toggleMute();
        } else if (e.key.toLowerCase() === "e") {
          e.preventDefault();
          toggleVideo();
        } else if (e.key.toLowerCase() === "h") {
          e.preventDefault();
          toggleHandRaise();
        }
      }
      if (e.key === "Escape") {
        setActiveDrawer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCall, toggleMute, toggleVideo, toggleHandRaise, setActiveDrawer]);

  const remoteList = Object.keys(remoteStreams || {}).map((socketId) => ({
    id: socketId,
    socketId,
    ...remoteStreams[socketId]
  }));

  const allTiles = [
    {
      id: "local",
      stream: localStream,
      username: "You",
      isLocal: true,
      isMuted,
      isCameraOff: isVideoOff,
      handRaised: isHandRaised
    },
    ...remoteList
  ];

  const totalCount = allTiles.length;
  const pinnedTile = allTiles.find((t) => t.id === pinnedId);
  const isSplitLayout = !!pinnedTile;

  if (preCallModal) {
    return <PreCallSetupModal />;
  }

  if (!activeCall) return null;

  const isIncoming = activeCall.status === "incoming";
  const partnerName = activeCall.partner.isGroup ? activeCall.partner.name : (activeCall.partner.username || "User");
  const partnerAvatar = activeCall.partner.avatar;

  return (
    <div className={`gm-call-root ${isCallMinimized ? "minimized" : ""}`}>

      {/* ---------------------------------------------------------------- */}
      {/* 1. INCOMING CALL POPUP (Google Meet Style) */}
      {/* ---------------------------------------------------------------- */}
      {isIncoming ? (
        <div className="gm-incoming-overlay">
          <div className="gm-incoming-card glassmorphic-modal">
            <div className="gm-incoming-avatar-container">
              <div className="gm-pulse-ring-1" />
              <div className="gm-pulse-ring-2" />
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} className="gm-incoming-avatar" />
              ) : (
                <div className="gm-avatar-placeholder large">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <span className="gm-call-badge">
              {activeCall.type === "video" ? "📹 Incoming Video Call" : "🎤 Incoming Voice Call"}
            </span>

            <h2 className="gm-caller-name">{partnerName}</h2>
            <p className="gm-caller-status">Calling you on Code-Expo...</p>

            <div className="gm-incoming-actions">
              <button type="button" className="gm-call-btn decline" onClick={handleDeclineCall} title="Decline">
                <PhoneOff size={24} />
              </button>
              <button type="button" className="gm-call-btn accept" onClick={handleAcceptCall} title="Accept Call">
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* 2. ACTIVE GOOGLE MEET CALL ROOM LAYOUT */
        /* ---------------------------------------------------------------- */
        <div className="gm-call-viewport">

          {/* Header Bar */}
          <div className="gm-top-header">
            <div className="gm-header-left">
              <div className="gm-room-name-dropdown">
                <span>CodeExpo Room</span>
                <span className="gm-dropdown-arrow">▾</span>
              </div>
              <Shield size={16} className="gm-shield-icon" title="Security & Encryption Enabled" />
              <div className="gm-rec-badge">
                <span className="gm-rec-dot" />
                <span>REC</span>
              </div>
              <span className="gm-call-timer">{formatTime(callDuration)}</span>
            </div>

            <div className="gm-header-right">
              <button
                type="button"
                className="gm-icon-btn"
                onClick={() => setActiveDrawer(activeDrawer === "sidepanel" ? null : "sidepanel")}
                title="People & Room Settings"
              >
                <Users size={16} />
                <span className="header-badge">{totalCount}</span>
              </button>
              <button
                type="button"
                className="gm-icon-btn"
                onClick={() => setActiveDrawer(activeDrawer === "sidepanel" ? null : "sidepanel")}
                title="Room Chat"
              >
                <MessageSquare size={16} />
                {unreadCount > 0 && <span className="header-badge dot">{unreadCount}</span>}
              </button>
              <button
                type="button"
                className="gm-icon-btn"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                <Maximize size={16} />
              </button>
              <button
                type="button"
                className="gm-icon-btn"
                onClick={() => setIsCallMinimized(!isCallMinimized)}
                title={isCallMinimized ? "Restore" : "Minimize"}
              >
                {isCallMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Main Stage & Drawers */}
          {!isCallMinimized && (
            <div className="gm-stage-container">

              {/* SPOTLIGHT PINNED SPLIT-SCREEN LAYOUT */}
              {isSplitLayout ? (
                <div className="gm-split-stage">
                  {/* Left Large Spotlight Canvas */}
                  <div className="gm-spotlight-main">
                    <ParticipantVideoTile
                      feed={pinnedTile}
                      isLocal={pinnedTile.isLocal}
                      isSpeaking={false}
                      isPinned={true}
                      onTogglePin={() => setPinnedId(null)}
                    />
                  </div>

                  {/* Right Sidebar Strip */}
                  <div className="gm-sidebar-strip">
                    {allTiles
                      .filter((t) => t.id !== pinnedId)
                      .map((t) => (
                        <div key={t.id} className="gm-sidebar-tile-wrapper">
                          <ParticipantVideoTile
                            feed={t}
                            isLocal={t.isLocal}
                            isSpeaking={false}
                            isPinned={false}
                            onTogglePin={() => setPinnedId(t.id)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* SYMMETRICAL MULTI-GRID LAYOUT */
                <div className={`gm-video-grid grid-${totalCount <= 2 ? totalCount : totalCount <= 4 ? "3-4" : totalCount <= 6 ? "5-6" : "multi"}`}>
                  {allTiles.map((t) => (
                    <ParticipantVideoTile
                      key={t.id}
                      feed={t}
                      isLocal={t.isLocal}
                      isSpeaking={false}
                      isPinned={false}
                      onTogglePin={() => setPinnedId(t.id)}
                    />
                  ))}
                </div>
              )}

              {/* Ultra-Powerful Unified Side Panel */}
              {(activeDrawer === "sidepanel" || activeDrawer === "participants" || activeDrawer === "chat") && (
                <UnifiedSidePanel
                  onClose={() => setActiveDrawer(null)}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                />
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* FLOATING BOTTOM CONTROL TOOLBAR */}
          {/* ---------------------------------------------------------------- */}
          {!isCallMinimized && (
            <div className="gm-bottom-bar-wrapper">
              <div className="gm-bar-left">
                <span className="gm-time-text">{getCurrentFormattedTime()}</span>
                <span className="gm-bar-divider">|</span>
                <span className="gm-meeting-name">{partnerName}</span>
              </div>

              <div className="gm-bar-center">
                <div className="gm-toolbar-pill glassmorphism">
                  <button
                    type="button"
                    className={`gm-circle-btn ${isMuted ? "danger" : "normal"}`}
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Mic (Ctrl+D)" : "Mute Mic (Ctrl+D)"}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  {activeCall.type === "video" && (
                    <button
                      type="button"
                      className={`gm-circle-btn ${isVideoOff ? "danger" : "normal"}`}
                      onClick={toggleVideo}
                      title={isVideoOff ? "Turn Camera On (Ctrl+E)" : "Turn Camera Off (Ctrl+E)"}
                    >
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}

                  <button
                    type="button"
                    className={`gm-circle-btn ${isHandRaised ? "active-gold" : "normal"}`}
                    onClick={toggleHandRaise}
                    title="Raise Hand (Ctrl+H)"
                  >
                    <Hand size={20} />
                  </button>

                  <button
                    type="button"
                    className="gm-circle-btn hangup-red"
                    onClick={handleEndCall}
                    title="Leave Call"
                  >
                    <PhoneOff size={22} />
                  </button>
                </div>
              </div>

              <div className="gm-bar-right">
                <button
                  type="button"
                  className="gm-bar-icon-btn"
                  title="Meeting Info"
                >
                  <Info size={18} />
                </button>
                <button
                  type="button"
                  className={`gm-bar-icon-btn ${activeDrawer === "sidepanel" ? "active" : ""}`}
                  onClick={() => setActiveDrawer(activeDrawer === "sidepanel" ? null : "sidepanel")}
                  title="Side Panel & Settings"
                >
                  <Users size={18} />
                  <span className="bar-badge">{totalCount}</span>
                </button>
                <button
                  type="button"
                  className={`gm-bar-icon-btn ${activeDrawer === "sidepanel" ? "active" : ""}`}
                  onClick={() => setActiveDrawer(activeDrawer === "sidepanel" ? null : "sidepanel")}
                  title="In-call chat"
                >
                  <MessageSquare size={18} />
                  {unreadCount > 0 && <span className="bar-badge dot">{unreadCount}</span>}
                </button>
                <button
                  type="button"
                  className="gm-bar-icon-btn"
                  onClick={() => setPinnedId(pinnedId ? null : allTiles[0]?.id)}
                  title="Toggle Split Layout"
                >
                  <Grid size={18} />
                </button>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
