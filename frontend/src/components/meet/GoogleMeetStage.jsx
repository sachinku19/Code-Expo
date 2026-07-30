import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Hand,
  Monitor,
  X,
  Minus,
  Maximize2,
  Pin,
  PinOff,
  Search
} from "lucide-react";
import "./GoogleMeet.css";
import { MeetingEngine } from "./services/MeetingEngine";
import { VideoGrid } from "./components/VideoGrid";
import { MeetingToolbar } from "./components/MeetingToolbar";

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object") return avatar.url || avatar.path || null;
  return null;
};

/**
 * PersistentRemoteAudio - Audio sink player with active VAD detector
 */
function PersistentRemoteAudio({ userId, stream, onSpeakingChange }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      audioRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioContext;
    let analyser;
    let animFrame;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const speaking = average > 12;

        if (onSpeakingChange && userId) {
          onSpeakingChange(userId, speaking);
        }

        animFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("Remote audio speaking check error:", e);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [stream, userId, onSpeakingChange]);

  if (!stream) return null;
  return <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />;
}

/**
 * GoogleMeetStage - Main orchestrating modal/stage overlay
 */
const GoogleMeetStage = ({
  isOpen,
  onLeaveMeeting,
  roomId,
  roomTitle,
  currentUser,
  initialMicOn = true,
  initialVideoOn = true,
  socket
}) => {
  const [engine, setEngine] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [myStream, setMyStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isVideoOn, setIsVideoOn] = useState(initialVideoOn);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeakingMap, setRemoteSpeakingMap] = useState({});
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [participantsTab, setParticipantsTab] = useState("all");
  const [pillPos, setPillPos] = useState({ x: null, y: null });

  const engineRef = useRef(null);
  const isDraggingPillRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const myId = currentUser?.id || currentUser?._id;

  const handleRemoteSpeakingChange = useCallback((userId, isSpeaking) => {
    setRemoteSpeakingMap((prev) => {
      if (prev[userId] === isSpeaking) return prev;
      return { ...prev, [userId]: isSpeaking };
    });
  }, []);

  // Minimize pill mouse handlers
  const handlePillMouseDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;

    const pillEl = e.currentTarget;
    const rect = pillEl.getBoundingClientRect();

    isDraggingPillRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const handleMouseMove = (moveEv) => {
      if (!isDraggingPillRef.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - rect.width - 10, moveEv.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - rect.height - 10, moveEv.clientY - dragOffsetRef.current.y));
      setPillPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingPillRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handlePillTouchStart = (e) => {
    if (e.target.closest("button")) return;
    const touch = e.touches[0];
    const pillEl = e.currentTarget;
    const rect = pillEl.getBoundingClientRect();

    isDraggingPillRef.current = true;
    dragOffsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    const handleTouchMove = (moveEv) => {
      if (!isDraggingPillRef.current) return;
      const t = moveEv.touches[0];
      const newX = Math.max(10, Math.min(window.innerWidth - rect.width - 10, t.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - rect.height - 10, t.clientY - dragOffsetRef.current.y));
      setPillPos({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      isDraggingPillRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
  };

  // Instantiates the core facade MeetingEngine
  useEffect(() => {
    if (!isOpen || !socket) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        setEngine(null);
      }
      return;
    }

    const callbacks = {
      onParticipantsChange: (participantsList) => {
        const local = {
          userId: myId,
          socketId: socket.id,
          username: (currentUser?.username || "You").replace(/\s*\(You\)\s*/gi, ""),
          isLocal: true,
          isMicOn: engineRef.current ? engineRef.current.isMicOn : initialMicOn,
          isVideoOn: engineRef.current ? engineRef.current.isVideoOn : initialVideoOn,
          isHandRaised: engineRef.current ? engineRef.current.isHandRaised : false
        };

        const list = [
          local,
          ...participantsList
            .filter((p) => p.socketId !== socket.id)
            .map((p) => ({
              ...p,
              isLocal: false
            }))
        ];
        setAllMembers(list);
        if (engineRef.current) {
          setRemoteStreams({ ...engineRef.current.remoteStreams });
        }
      },
      onLocalStreamChange: (stream) => {
        setMyStream(stream);
      },
      onLocalSpeaking: (speaking) => {
        setLocalSpeaking(speaking);
      }
    };

    const newEngine = new MeetingEngine(socket, roomId, currentUser, callbacks);
    engineRef.current = newEngine;
    setEngine(newEngine);

    newEngine.start(initialMicOn, initialVideoOn).then(() => {
      setIsMicOn(newEngine.isMicOn);
      setIsVideoOn(newEngine.isVideoOn);
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
        setEngine(null);
      }
    };
  }, [isOpen, roomId, socket]);

  if (!isOpen) return null;

  const handleMicToggle = async () => {
    if (engine) {
      const state = await engine.toggleMic();
      setIsMicOn(state);
    }
  };

  const handleCameraToggle = async () => {
    if (engine) {
      const state = await engine.toggleCamera();
      setIsVideoOn(state);
    }
  };

  const handleHandToggle = async () => {
    if (engine) {
      const state = await engine.toggleHandRaise();
      setIsHandRaised(state);
    }
  };

  const handleScreenShareToggle = async () => {
    if (engine) {
      const state = await engine.toggleScreenShare();
      setIsScreenSharing(state);
    }
  };

  const handleLeaveCall = () => {
    if (engine) {
      engine.destroy();
    }
    onLeaveMeeting();
  };

  // Remote audio elements to sink audio streams dynamically
  const remoteAudioElements = allMembers
    .filter((m) => !m.isLocal && remoteStreams[m.socketId])
    .map((m) => (
      <PersistentRemoteAudio
        key={m.socketId || m.userId}
        userId={m.userId}
        stream={remoteStreams[m.socketId]}
        onSpeakingChange={handleRemoteSpeakingChange}
      />
    ));

  // Determine active speaker member
  const activeSpeakingMember = allMembers.find(
    (m) =>
      (m.isLocal && localSpeaking) ||
      (!m.isLocal && remoteSpeakingMap[m.userId])
  );

  if (isMinimized) {
    const pillStyle = pillPos.x !== null
      ? { left: `${pillPos.x}px`, top: `${pillPos.y}px`, bottom: "auto", right: "auto" }
      : {};

    return createPortal(
      <div
        className="ce-meet-minimized-pill"
        style={pillStyle}
        onMouseDown={handlePillMouseDown}
        onTouchStart={handlePillTouchStart}
      >
        {remoteAudioElements}

        {activeSpeakingMember ? (
          <div className="ce-meet-minimized-speaker-badge" onClick={() => setIsMinimized(false)} title={`${activeSpeakingMember.username} is speaking`}>
            <div className="ce-meet-minimized-speaker-avatar">
              {getAvatarUrl(activeSpeakingMember.avatar) ? (
                <img src={getAvatarUrl(activeSpeakingMember.avatar)} alt={activeSpeakingMember.username} />
              ) : (
                <span>{(activeSpeakingMember.username || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="ce-meet-minimized-speaker-name">{activeSpeakingMember.username}</span>
            <div className="ce-audio-wave-bars" title="Speaking">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          </div>
        ) : (
          <div className="ce-meet-minimized-info" onClick={() => setIsMinimized(false)}>
            <div className="ce-meet-live-dot" />
            <span className="ce-meet-minimized-title">Meeting ({allMembers.length})</span>
          </div>
        )}

        <div className="ce-meet-minimized-actions">
          <button
            type="button"
            className={`ce-meet-minimized-btn ${!isMicOn ? "off" : ""}`}
            onClick={handleMicToggle}
            title={isMicOn ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>

          <button
            type="button"
            className={`ce-meet-minimized-btn ${!isVideoOn ? "off" : ""}`}
            onClick={handleCameraToggle}
            title={isVideoOn ? "Turn off video" : "Turn on video"}
          >
            {isVideoOn ? <Video size={14} /> : <VideoOff size={14} />}
          </button>

          <button
            type="button"
            className="ce-meet-minimized-btn expand"
            onClick={() => setIsMinimized(false)}
            title="Expand Meeting Stage"
          >
            <Maximize2 size={14} />
          </button>

          <button
            type="button"
            className="ce-meet-minimized-btn end"
            onClick={handleLeaveCall}
            title="Leave Meeting"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Right sidebar drawer list filters
  const speakingCount = allMembers.filter(m => (m.isLocal && localSpeaking) || remoteSpeakingMap[m.userId]).length;
  const raisedCount = allMembers.filter(m => m.isHandRaised).length;
  const mutedCount = allMembers.filter(m => !m.isMicOn).length;

  const tabFilteredMembers = allMembers.filter((m) => {
    if (participantsTab === "speaking") {
      return (m.isLocal && localSpeaking) || remoteSpeakingMap[m.userId];
    }
    if (participantsTab === "raised") {
      return m.isHandRaised;
    }
    if (participantsTab === "muted") {
      return !m.isMicOn;
    }
    return true;
  });

  const filteredMembers = tabFilteredMembers.filter((m) =>
    (m.username || "").toLowerCase().includes(participantSearchQuery.toLowerCase())
  );

  return (
    <div className="ce-meet-stage-overlay">
      {remoteAudioElements}

      {isScreenSharing && (
        <div style={{ padding: "12px 24px 0 24px" }}>
          <div className="ce-meet-screen-presenting-banner">
            <span>🖥️ You are presenting your screen to everyone in the meeting</span>
            <button
              type="button"
              onClick={handleScreenShareToggle}
              className="ce-meet-screen-stop-btn"
            >
              Stop Presenting
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Stage & Side Panel */}
      <div className="ce-meet-stage-body">
        <div className="ce-meet-video-canvas">
          {/* Top Right Actions */}
          <div className="ce-meet-stage-top-right-actions">
            <button
              type="button"
              className="ce-meet-float-btn"
              onClick={() => setIsMinimized(true)}
              title="Minimize Stage"
            >
              <Minus size={15} />
            </button>

            <button
              type="button"
              className={`ce-meet-float-btn-pill ${showParticipantsPanel ? "active-feature" : ""}`}
              onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
              title="Participants list"
            >
              <Users size={15} />
              <span style={{ fontSize: "0.72rem", fontWeight: "700" }}>{allMembers.length}</span>
            </button>
          </div>

          {/* Main Grid Component */}
          <VideoGrid
            allMembers={allMembers}
            remoteStreams={remoteStreams}
            localStream={myStream}
            pinnedUserId={pinnedUserId}
            onPinToggle={(uid) => setPinnedUserId(pinnedUserId === uid ? null : uid)}
            speakingMap={remoteSpeakingMap}
            localSpeaking={localSpeaking}
          />

          {/* Center Control Toolbar */}
          <div className="ce-meet-floating-controls">
            <MeetingToolbar
              isMicOn={isMicOn}
              isVideoOn={isVideoOn}
              isScreenSharing={isScreenSharing}
              isHandRaised={isHandRaised}
              showParticipants={showParticipantsPanel}
              participantCount={allMembers.length}
              onMicToggle={handleMicToggle}
              onCameraToggle={handleCameraToggle}
              onScreenShareToggle={handleScreenShareToggle}
              onHandToggle={handleHandToggle}
              onParticipantsToggle={() => setShowParticipantsPanel(!showParticipantsPanel)}
              onLeaveMeeting={handleLeaveCall}
            />
          </div>
        </div>

        {/* Side Participants Drawer */}
        {showParticipantsPanel && (
          <div className="ce-meet-side-panel">
            <div className="ce-meet-side-header">
              <span>Participants <span className="ce-meet-purple-count">({allMembers.length})</span></span>
              <button
                type="button"
                className="ce-meet-side-close"
                onClick={() => setShowParticipantsPanel(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Real-time Search Box */}
            <div className="ce-meet-search-row">
              <div className="ce-meet-search-box">
                <Search size={14} className="ce-meet-search-icon" />
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={participantSearchQuery}
                  onChange={(e) => setParticipantSearchQuery(e.target.value)}
                  className="ce-meet-search-input"
                />
                {participantSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setParticipantSearchQuery("")}
                    className="ce-meet-search-clear"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Tab Pills */}
            <div className="ce-meet-side-tabs">
              <button
                className={`ce-meet-side-tab-pill ${participantsTab === "all" ? "active" : ""}`}
                onClick={() => setParticipantsTab("all")}
              >
                All {allMembers.length}
              </button>
              <button
                className={`ce-meet-side-tab-pill speaking ${participantsTab === "speaking" ? "active" : ""}`}
                onClick={() => setParticipantsTab("speaking")}
              >
                Speaking {speakingCount}
              </button>
              <button
                className={`ce-meet-side-tab-pill raised ${participantsTab === "raised" ? "active" : ""}`}
                onClick={() => setParticipantsTab("raised")}
              >
                Raised {raisedCount}
              </button>
              <button
                className={`ce-meet-side-tab-pill muted ${participantsTab === "muted" ? "active" : ""}`}
                onClick={() => setParticipantsTab("muted")}
              >
                Muted {mutedCount}
              </button>
            </div>

            {/* Participants list */}
            <div className="ce-meet-side-list">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const memberAvatarUrl = getAvatarUrl(member.avatar);
                  const isPinned = String(pinnedUserId) === String(member.userId);
                  const isMe = member.isLocal;
                  const isSpeaking = isMe ? localSpeaking : remoteSpeakingMap[member.userId];

                  return (
                    <div key={member.socketId || member.userId} className="ce-meet-side-item">
                      <div className="ce-meet-side-user-info">
                        {memberAvatarUrl ? (
                          <img
                            src={memberAvatarUrl}
                            alt={member.username}
                            className="ce-meet-side-avatar"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="ce-meet-side-avatar">
                            {(member.username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className="ce-meet-side-username">
                            {member.username}{isMe ? " (You)" : ""}
                          </span>
                          <span className="ce-meet-side-user-status" style={{ color: isSpeaking ? "#10b981" : isMe ? "#8b5cf6" : "#9ca3af" }}>
                            {isMe ? "Host" : isSpeaking ? "Speaking" : "Participant"}
                          </span>
                        </div>
                      </div>

                      <div className="ce-meet-side-item-actions">
                        {isSpeaking && (
                          <div className="ce-audio-wave-bars" title="Speaking">
                            <span className="wave-bar" />
                            <span className="wave-bar" />
                            <span className="wave-bar" />
                            <span className="wave-bar" />
                          </div>
                        )}

                        {member.isHandRaised && (
                          <span className="ce-meet-side-hand-badge" title="Hand raised">✋</span>
                        )}

                        <button
                          type="button"
                          className={`ce-meet-side-pin ${isPinned ? "active" : ""}`}
                          onClick={() => setPinnedUserId(isPinned ? null : member.userId)}
                          title={isPinned ? "Unpin" : "Pin participant"}
                        >
                          {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                        </button>

                        <div className="ce-meet-side-mic">
                          {member.isMicOn ? (
                            <Mic size={13} color="#10b981" />
                          ) : (
                            <MicOff size={13} color="#ef4444" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="ce-meet-empty-search">
                  No participants found matching "{participantSearchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMeetStage;
