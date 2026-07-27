import React, { useState, useEffect, useRef } from "react";
import { useCall } from "../../context/CallContext";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Minimize2, Maximize2, User, Hand,
  MessageSquare, Users, Signal,
  Search, Send, X, Check, Pin, PinOff,
  MoreVertical, Shield, Maximize, Grid, Info, Plus
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
// INDIVIDUAL VIDEO TILE COMPONENT (With Hover Pinning)
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
          {isMuted ? (
            <MicOff size={13} className="gm-mic-icon muted" />
          ) : (
            <Mic size={13} className={`gm-mic-icon ${isSpeaking ? "active" : ""}`} />
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
// PEOPLE / PARTICIPANTS DRAWER (Matching Image 3 Reference Layout)
// ----------------------------------------------------------------------
function ParticipantsDrawer({ onClose, pinnedId, setPinnedId }) {
  const { remoteStreams, isMuted, isVideoOff, isHandRaised } = useCall();
  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  const remoteList = Object.keys(remoteStreams || {}).map((sId) => ({
    id: sId,
    socketId: sId,
    ...remoteStreams[sId]
  }));

  const allMembers = [
    { id: "local", username: "Sachin Kumar (You)", isMuted, isCameraOff: isVideoOff, handRaised: isHandRaised, isHost: true },
    ...remoteList
  ].filter((m) => (m.username || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="gm-drawer-panel glassmorphism people-drawer">
      <div className="gm-drawer-header">
        <div className="gm-drawer-title">
          <h3>People ({allMembers.length})</h3>
        </div>
        <button type="button" className="gm-close-icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="gm-drawer-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search people"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="gm-drawer-section-label">IN CALL</div>

      <div className="gm-drawer-list">
        {allMembers.map((member) => {
          const isPinned = pinnedId === member.id;
          return (
            <div key={member.id} className="gm-member-row">
              <div className="gm-member-avatar-box">
                <User size={16} />
              </div>
              <div className="gm-member-info">
                <span className="gm-member-name">{member.username}</span>
                {member.isHost && <span className="gm-host-badge">Host</span>}
              </div>
              <div className="gm-member-status-icons">
                {member.isMuted ? (
                  <MicOff size={14} className="gm-status-muted" />
                ) : (
                  <Mic size={14} className="gm-status-active" />
                )}
                
                <div className="gm-member-options-wrapper" style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="gm-icon-menu-btn"
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

      <div className="gm-drawer-footer">
        <button type="button" className="gm-add-people-btn">
          <Plus size={16} />
          <span>Add people</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// IN-CALL CHAT DRAWER
// ----------------------------------------------------------------------
function InCallChatDrawer({ onClose }) {
  const { inCallMessages, sendInCallMessage, setUnreadCount } = useCall();
  const [text, setText] = useState("");
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setUnreadCount(0);
  }, [setUnreadCount]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [inCallMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendInCallMessage(text);
    setText("");
  };

  const handleEmojiClick = (emoji) => {
    sendInCallMessage(emoji);
  };

  return (
    <div className="gm-drawer-panel glassmorphism">
      <div className="gm-drawer-header">
        <div className="gm-drawer-title">
          <MessageSquare size={18} />
          <h3>In-Call Chat</h3>
        </div>
        <button type="button" className="gm-close-icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="gm-chat-messages-container">
        {inCallMessages.length === 0 ? (
          <div className="gm-chat-empty">
            <MessageSquare size={32} />
            <p>Messages sent here will be visible to everyone in this call.</p>
          </div>
        ) : (
          inCallMessages.map((msg) => (
            <div key={msg.id} className="gm-chat-msg-row">
              <div className="gm-chat-msg-header">
                <span className="gm-msg-author">{msg.senderName}</span>
                <span className="gm-msg-time">{msg.time}</span>
              </div>
              <p className="gm-msg-body">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Reaction Pills */}
      <div className="gm-quick-reactions">
        {["👍", "❤️", "👏", "🔥", "🎉"].map((emoji) => (
          <button key={emoji} type="button" className="gm-emoji-pill" onClick={() => handleEmojiClick(emoji)}>
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="gm-chat-input-box">
        <input
          type="text"
          placeholder="Send a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="gm-send-btn" disabled={!text.trim()}>
          <Send size={16} />
        </button>
      </form>
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

  // Determine active pinned tile or fallback
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
          
          {/* Header Bar (Matching Image 3 Reference) */}
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
                onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
                title="People"
              >
                <Users size={16} />
                <span className="header-badge">{totalCount}</span>
              </button>
              <button
                type="button"
                className="gm-icon-btn"
                onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
                title="In-call chat"
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

              {/* Side Drawer Panels */}
              {activeDrawer === "participants" && (
                <ParticipantsDrawer
                  onClose={() => setActiveDrawer(null)}
                  pinnedId={pinnedId}
                  setPinnedId={setPinnedId}
                />
              )}
              {activeDrawer === "chat" && (
                <InCallChatDrawer onClose={() => setActiveDrawer(null)} />
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* 3. FLOATING BOTTOM CONTROL TOOLBAR (Matching Reference Image 3) */}
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
                  className={`gm-bar-icon-btn ${activeDrawer === "participants" ? "active" : ""}`}
                  onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
                  title="People"
                >
                  <Users size={18} />
                  <span className="bar-badge">{totalCount}</span>
                </button>
                <button
                  type="button"
                  className={`gm-bar-icon-btn ${activeDrawer === "chat" ? "active" : ""}`}
                  onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
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
