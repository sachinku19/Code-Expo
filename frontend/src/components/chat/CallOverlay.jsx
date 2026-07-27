import React, { useState, useEffect, useRef } from "react";
import { useCall } from "../../context/CallContext";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Minimize2, Maximize2, User, Hand,
  MessageSquare, Users, Signal,
  Search, Send, X, Check
} from "lucide-react";
import "./CallOverlay.css";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// ----------------------------------------------------------------------
// PRE-CALL SETUP MODAL
// ----------------------------------------------------------------------
function PreCallSetupModal() {
  const { preCallModal, closePreCallModal, handleStartCall } = useCall();
  const [callType, setCallType] = useState("audio");
  const [micPreview, setMicPreview] = useState(true);
  const [camPreview, setCamPreview] = useState(true);

  if (!preCallModal) return null;

  const partner = preCallModal.partner;
  const partnerName = partner.isGroup ? partner.name : (partner.username || "Developer");
  const partnerAvatar = partner.avatar;

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
          <div
            className={`gm-type-card ${callType === "audio" ? "selected" : ""}`}
            onClick={() => setCallType("audio")}
          >
            <div className="gm-type-icon-box">
              <Mic size={22} />
            </div>
            <div className="gm-type-info">
              <span className="gm-type-title">🎤 Audio Call</span>
              <span className="gm-type-subtitle">Voice-only HD stream (Default)</span>
            </div>
            {callType === "audio" && <Check size={18} className="gm-check-icon" />}
          </div>

          <div
            className={`gm-type-card ${callType === "video" ? "selected" : ""}`}
            onClick={() => setCallType("video")}
          >
            <div className="gm-type-icon-box">
              <Video size={22} />
            </div>
            <div className="gm-type-info">
              <span className="gm-type-title">📹 Video Call</span>
              <span className="gm-type-subtitle">High definition 60FPS video</span>
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
            <Phone size={16} />
            <span>Start Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// INDIVIDUAL VIDEO TILE COMPONENT
// ----------------------------------------------------------------------
function ParticipantVideoTile({ feed, isLocal, isSpeaking }) {
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
    <div className={`gm-video-tile ${isSpeaking ? "active-speaker" : ""} ${isCameraOff ? "cam-off" : ""}`}>
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

      {/* Top Left Indicators */}
      <div className="gm-tile-top-bar">
        {feed?.handRaised && (
          <div className="gm-hand-badge" title="Hand Raised">
            <Hand size={13} />
            <span>Hand Raised</span>
          </div>
        )}
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
// PARTICIPANTS DRAWER
// ----------------------------------------------------------------------
function ParticipantsDrawer({ onClose }) {
  const { remoteStreams, isMuted, isVideoOff, isHandRaised } = useCall();
  const [search, setSearch] = useState("");

  const remoteList = Object.keys(remoteStreams || {}).map((sId) => ({
    socketId: sId,
    ...remoteStreams[sId]
  }));

  const allMembers = [
    { username: "You", isMuted, isCameraOff: isVideoOff, handRaised: isHandRaised, isHost: true },
    ...remoteList
  ].filter((m) => (m.username || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="gm-drawer-panel glassmorphism">
      <div className="gm-drawer-header">
        <div className="gm-drawer-title">
          <Users size={18} />
          <h3>Participants ({allMembers.length})</h3>
        </div>
        <button type="button" className="gm-close-icon-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="gm-drawer-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="gm-drawer-list">
        {allMembers.map((member, i) => (
          <div key={member.socketId || i} className="gm-member-row">
            <div className="gm-member-avatar-box">
              <User size={16} />
            </div>
            <div className="gm-member-info">
              <span className="gm-member-name">{member.username}</span>
              {member.isHost && <span className="gm-host-badge">HOST</span>}
            </div>
            <div className="gm-member-status-icons">
              {member.handRaised && <Hand size={14} className="gm-status-hand" title="Hand Raised" />}
              {member.isMuted ? <MicOff size={14} className="gm-status-muted" /> : <Mic size={14} className="gm-status-active" />}
              {member.isCameraOff ? <VideoOff size={14} className="gm-status-muted" /> : <Video size={14} className="gm-status-active" />}
            </div>
          </div>
        ))}
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

  // Keyboard Shortcuts (Ctrl+D: Mic, Ctrl+E: Video, Ctrl+H: Hand)
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
    socketId,
    ...remoteStreams[socketId]
  }));

  // Total Participants
  const totalCount = remoteList.length + 1;

  // Determine Dynamic Grid Class
  let gridClass = "grid-1";
  if (totalCount === 2) gridClass = "grid-2";
  else if (totalCount >= 3 && totalCount <= 4) gridClass = "grid-3-4";
  else if (totalCount >= 5 && totalCount <= 6) gridClass = "grid-5-6";
  else if (totalCount >= 7) gridClass = "grid-multi";

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
              <span className="gm-room-title">{partnerName}</span>
              <span className="gm-divider">•</span>
              <span className="gm-call-timer">{formatTime(callDuration)}</span>
            </div>

            <div className="gm-header-right">
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

          {/* Main Grid Viewport */}
          {!isCallMinimized && (
            <div className="gm-stage-container">
              <div className={`gm-video-grid ${gridClass}`}>
                
                {/* Local Video Tile */}
                <ParticipantVideoTile
                  feed={{
                    stream: localStream,
                    username: "You",
                    isMuted,
                    isCameraOff: isVideoOff,
                    handRaised: isHandRaised
                  }}
                  isLocal={true}
                  isSpeaking={false}
                />

                {/* Remote Video Tiles */}
                {remoteList.map((feed) => (
                  <ParticipantVideoTile
                    key={feed.socketId}
                    feed={feed}
                    isLocal={false}
                    isSpeaking={false}
                  />
                ))}

              </div>

              {/* Drawer Panels Side-by-Side */}
              {activeDrawer === "participants" && (
                <ParticipantsDrawer onClose={() => setActiveDrawer(null)} />
              )}
              {activeDrawer === "chat" && (
                <InCallChatDrawer onClose={() => setActiveDrawer(null)} />
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* 3. FLOATING BOTTOM CONTROL TOOLBAR (Google Meet Grade) */}
          {/* ---------------------------------------------------------------- */}
          {!isCallMinimized && (
            <div className="gm-bottom-toolbar">
              <div className="gm-toolbar-pill glassmorphism">
                
                {/* Mute Mic Button */}
                <button
                  type="button"
                  className={`gm-circle-btn ${isMuted ? "danger" : "normal"}`}
                  onClick={toggleMute}
                  title={isMuted ? "Unmute Mic (Ctrl+D)" : "Mute Mic (Ctrl+D)"}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Camera Toggle Button */}
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

                {/* Raise Hand Button */}
                <button
                  type="button"
                  className={`gm-circle-btn ${isHandRaised ? "active-gold" : "normal"}`}
                  onClick={toggleHandRaise}
                  title="Raise Hand (Ctrl+H)"
                >
                  <Hand size={20} />
                </button>

                {/* In-Call Chat Button */}
                <button
                  type="button"
                  className={`gm-circle-btn ${activeDrawer === "chat" ? "active-purple" : "normal"}`}
                  onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
                  title="In-Call Chat"
                >
                  <MessageSquare size={20} />
                  {unreadCount > 0 && <span className="gm-badge-dot">{unreadCount}</span>}
                </button>

                {/* Participants Drawer Button */}
                <button
                  type="button"
                  className={`gm-circle-btn ${activeDrawer === "participants" ? "active-purple" : "normal"}`}
                  onClick={() => setActiveDrawer(activeDrawer === "participants" ? null : "participants")}
                  title="Participants"
                >
                  <Users size={20} />
                  <span className="gm-badge-num">{totalCount}</span>
                </button>

                {/* Leave / End Call Button */}
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
          )}

        </div>
      )}
    </div>
  );
}
