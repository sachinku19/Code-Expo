import React, { useState, useEffect, useRef } from "react";
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
  Volume2,
  X,
  Minus,
  Maximize2,
  Pin,
  PinOff
} from "lucide-react";
import "./GoogleMeet.css";

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object") return avatar.url || avatar.path || null;
  return null;
};

function RemoteVideoTile({ member, isSpeaking, initial }) {
  const videoRef = useRef(null);
  const avatarUrl = getAvatarUrl(member.avatar);

  useEffect(() => {
    if (videoRef.current) {
      if (member.stream && videoRef.current.srcObject !== member.stream) {
        videoRef.current.srcObject = member.stream;
      }
      if (member.stream && member.isVideoOn) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [member.stream, member.isVideoOn]);

  const videoTracks = member.stream ? member.stream.getVideoTracks() : [];
  const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === "live");
  const hasVideo = Boolean(member.stream && hasActiveVideoTrack && member.isVideoOn);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="ce-meet-tile-video"
        style={{
          display: hasVideo ? "block" : "none",
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />

      {!hasVideo && (
        <div className="ce-meet-tile-avatar-wrapper">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={member.username}
              className="ce-meet-tile-avatar-img"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="ce-meet-tile-avatar">{initial}</div>
          )}
          {isSpeaking && (
            <div className="ce-meet-audio-wave">
              <span /><span /><span />
            </div>
          )}
        </div>
      )}
    </>
  );
}

const GoogleMeetStage = ({
  isOpen,
  onLeaveMeeting,
  roomId,
  roomTitle,
  currentUser,
  participants = [],
  initialMicOn = true,
  initialVideoOn = true,
  socket
}) => {
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isVideoOn, setIsVideoOn] = useState(initialVideoOn);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [pinnedUserId, setPinnedUserId] = useState(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peersRef = useRef({});

  const myId = currentUser?.id || currentUser?._id;

  useEffect(() => {
    if (isOpen) {
      setIsMicOn(initialMicOn);
      setIsVideoOn(initialVideoOn);
    }
  }, [isOpen, initialMicOn, initialVideoOn]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      const cameraTrack = localStream?.getVideoTracks()[0];
      if (cameraTrack) {
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(cameraTrack);
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          stream.getTracks().forEach((t) => t.stop());
          setScreenStream(null);
          setIsScreenSharing(false);
          const camTrack = localStream?.getVideoTracks()[0];
          if (camTrack) {
            Object.values(peersRef.current).forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
              if (sender) sender.replaceTrack(camTrack);
            });
          }
        };
      } catch (err) {
        console.warn("Screen sharing cancelled or failed:", err);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      setRemoteStreams({});
      return;
    }

    let stream = null;
    async function initLocalStream() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } catch (err) {
        console.warn("Could not get video+audio stream, trying audio-only fallback:", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
        } catch (err2) {
          console.warn("Could not get audio stream, creating synthetic stream:", err2);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.connect(dst);
            osc.start();
            stream = dst.stream;
          } catch (err3) {
            console.warn("Synthetic stream creation failed:", err3);
          }
        }
      }

      if (stream) {
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) vTrack.enabled = initialVideoOn;
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) aTrack.enabled = initialMicOn;

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    }

    initLocalStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = isVideoOn;

      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = isMicOn;

      if (localVideoRef.current && localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }

    if (socket) {
      socket.emit("meet:state-change", {
        roomId,
        userId: myId,
        isMicOn,
        isVideoOn,
        isHandRaised
      });
    }
  }, [isVideoOn, isMicOn, isHandRaised, localStream, socket, myId, roomId]);

  // WebRTC Signaling & Peer Streams
  useEffect(() => {
    if (!isOpen || !socket || !localStream) return;

    const createPeerConnection = (targetSocketId, targetUserId) => {
      let pc = peersRef.current[targetSocketId];
      if (pc) return pc;

      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pc.pendingCandidates = [];
      peersRef.current[targetSocketId] = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          setRemoteStreams((prev) => ({
            ...prev,
            [targetSocketId]: stream,
            [targetUserId]: stream
          }));
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("meet:signal", {
            targetSocketId,
            fromUserId: myId,
            signalData: e.candidate,
            signalType: "candidate"
          });
        }
      };

      return pc;
    };

    const handleSignal = async ({ fromSocketId, fromUserId, signalData, signalType }) => {
      try {
        const pc = createPeerConnection(fromSocketId, fromUserId);

        if (signalType === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const cand of pc.pendingCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pc.pendingCandidates = [];
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("meet:signal", {
            targetSocketId: fromSocketId,
            fromUserId: myId,
            signalData: answer,
            signalType: "answer"
          });
        } else if (signalType === "answer") {
          if (pc.signalingState !== "closed") {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
              for (const cand of pc.pendingCandidates) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
              pc.pendingCandidates = [];
            }
          }
        } else if (signalType === "candidate") {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
          } else {
            pc.pendingCandidates.push(signalData);
          }
        }
      } catch (err) {
        console.warn("Error handling WebRTC signal:", err);
      }
    };

    socket.on("meet:signal", handleSignal);

    participants.forEach(async (p) => {
      const pUserId = p.userId || p.id;
      const isRemoteUser = p.socketId && socket.id ? p.socketId !== socket.id : String(pUserId) !== String(myId);

      // Deterministic negotiation: only the peer with lexicographically higher socketId initiates offer
      if (isRemoteUser && p.socketId && !peersRef.current[p.socketId]) {
        const shouldInitiate = socket.id > p.socketId;
        if (shouldInitiate) {
          try {
            const pc = createPeerConnection(p.socketId, pUserId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("meet:signal", {
              targetSocketId: p.socketId,
              fromUserId: myId,
              signalData: offer,
              signalType: "offer"
            });
          } catch (e) {
            console.warn("Failed to create offer for participant:", e);
          }
        }
      }
    });

    return () => {
      socket.off("meet:signal", handleSignal);
    };
  }, [isOpen, socket, localStream, participants, myId]);

  // Real-time local audio volume speaker detection
  useEffect(() => {
    if (!isOpen || !isMicOn || !localStream) {
      setActiveSpeakerId(null);
      return;
    }

    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      setActiveSpeakerId(null);
      return;
    }

    let audioContext = null;
    let analyser = null;
    let animFrame = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(localStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 18) {
          setActiveSpeakerId(myId);
        } else {
          setActiveSpeakerId(null);
        }

        animFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("AudioContext speaker detection error:", e);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [isOpen, isMicOn, localStream, myId]);

  if (!isOpen) return null;

  const myName = currentUser?.username || "You";

  const allMembers = [
    {
      userId: myId,
      socketId: socket?.id,
      username: `${myName} (You)`,
      isLocal: true,
      isMicOn,
      isVideoOn,
      isHandRaised,
      avatar: currentUser?.avatar
    },
    ...participants
      .filter((p) => (p.socketId && socket?.id ? p.socketId !== socket.id : String(p.userId || p.id) !== String(myId)))
      .map((p) => {
        const pUserId = p.userId || p.id;
        const pKey = p.socketId || pUserId;
        return {
          ...p,
          userId: pUserId,
          isLocal: false,
          isMicOn: p.isMicOn !== undefined ? p.isMicOn : true,
          isVideoOn: p.isVideoOn !== undefined ? p.isVideoOn : true,
          stream: remoteStreams[p.socketId] || remoteStreams[pUserId] || p.stream
        };
      })
  ];

  const gridCount = allMembers.length;
  const gridClass = `grid-${Math.min(gridCount, 9)}`;

  const pinnedMember = allMembers.find((m) => String(m.userId) === String(pinnedUserId));
  const unpinnedMembers = allMembers.filter((m) => String(m.userId) !== String(pinnedUserId));

  const renderSingleTile = (member, isFilmstrip = false) => {
    const isSpeaking = String(activeSpeakerId) === String(member.userId);
    const initial = (member.username || "U").charAt(0).toUpperCase();
    const avatarUrl = getAvatarUrl(member.avatar);
    const isPinned = String(pinnedUserId) === String(member.userId);

    return (
      <div
        key={member.userId}
        className={`${isFilmstrip ? "ce-meet-filmstrip-tile" : "ce-meet-tile"} ${isSpeaking ? "speaking" : ""}`}
        onClick={() => {
          if (isFilmstrip) {
            setPinnedUserId(member.userId);
          }
        }}
      >
        {/* Pin / Unpin Button */}
        <button
          type="button"
          className={`ce-meet-pin-btn ${isPinned ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setPinnedUserId(isPinned ? null : member.userId);
          }}
          title={isPinned ? "Unpin participant" : "Pin participant to main stage"}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>

        {member.isLocal ? (
          (() => {
            const localVideoTracks = localStream ? localStream.getVideoTracks() : [];
            const hasLocalActiveVideo = Boolean(isVideoOn && localStream && localVideoTracks.length > 0 && localVideoTracks.some((t) => t.enabled && t.readyState === "live"));
            return (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="ce-meet-tile-video"
                  style={{ display: hasLocalActiveVideo ? "block" : "none", transform: "scaleX(-1)" }}
                />
                {!hasLocalActiveVideo && (
                  <div className="ce-meet-tile-avatar-wrapper">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={member.username}
                        className="ce-meet-tile-avatar-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="ce-meet-tile-avatar">{initial}</div>
                    )}
                    {isSpeaking && (
                      <div className="ce-meet-audio-wave">
                        <span /><span /><span />
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <RemoteVideoTile
            member={member}
            isSpeaking={isSpeaking}
            initial={initial}
          />
        )}

        {/* Name & Mute Tag */}
        <div className="ce-meet-tile-name-tag">
          <div className={`ce-meet-mic-badge ${!member.isMicOn ? "muted" : "talking"}`}>
            {member.isMicOn ? (
              isSpeaking ? (
                <Volume2 size={13} color="#10b981" />
              ) : (
                <Mic size={13} color="#10b981" />
              )
            ) : (
              <MicOff size={13} color="#ef4444" />
            )}
          </div>
          <span>{member.username}</span>
          {member.isHandRaised && <span>🖐️</span>}
        </div>
      </div>
    );
  };

  if (isMinimized) {
    return createPortal(
      <div className="ce-meet-minimized-pill">
        <div className="ce-meet-minimized-info" onClick={() => setIsMinimized(false)}>
          <div className="ce-meet-live-dot" />
          <span className="ce-meet-minimized-title">Meeting ({allMembers.length})</span>
        </div>

        <div className="ce-meet-minimized-actions">
          <button
            type="button"
            className={`ce-meet-minimized-btn ${!isMicOn ? "off" : ""}`}
            onClick={() => setIsMicOn(!isMicOn)}
            title={isMicOn ? "Mute Mic" : "Unmute Mic"}
          >
            {isMicOn ? <Mic size={14} /> : <MicOff size={14} />}
          </button>

          <button
            type="button"
            className={`ce-meet-minimized-btn ${!isVideoOn ? "off" : ""}`}
            onClick={() => setIsVideoOn(!isVideoOn)}
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
            onClick={() => {
              if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
              }
              onLeaveMeeting();
            }}
            title="Leave Meeting"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="ce-meet-stage-overlay">
      {/* Top Stage Header */}
      <div className="ce-meet-stage-header">
        <div className="ce-meet-room-title">
          <div className="ce-meet-live-dot" />
          <span>{roomTitle || "Workspace Meeting"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {pinnedUserId && (
            <button
              type="button"
              className="ce-meet-ctrl-btn active-feature"
              style={{ width: "auto", padding: "0 12px", height: "36px", borderRadius: "18px", fontSize: "0.78rem", fontWeight: "700" }}
              onClick={() => setPinnedUserId(null)}
              title="Unpin and return to equal grid view"
            >
              Unpin Spotlight
            </button>
          )}

          <button
            type="button"
            className="ce-meet-ctrl-btn"
            style={{ width: "40px", height: "40px" }}
            onClick={() => setIsMinimized(true)}
            title="Minimize Meeting Stage"
          >
            <Minus size={18} />
          </button>
        </div>
      </div>

      {isScreenSharing && (
        <div style={{ padding: "12px 24px 0 24px" }}>
          <div className="ce-meet-screen-presenting-banner">
            <span>🖥️ You are presenting your screen to everyone in the meeting</span>
            <button
              type="button"
              onClick={toggleScreenShare}
              style={{
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              Stop Presenting
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Stage & Side Panel */}
      <div className="ce-meet-stage-body">
        {/* Pinned / Spotlight View Mode */}
        {pinnedMember ? (
          <div className="ce-meet-pinned-stage">
            {/* Big Featured Main Stage */}
            <div className="ce-meet-pinned-main">
              {renderSingleTile(pinnedMember, false)}
            </div>

            {/* Vertical Right Filmstrip of Small Thumbnails */}
            <div className="ce-meet-filmstrip-column">
              {unpinnedMembers.map((m) => renderSingleTile(m, true))}
            </div>
          </div>
        ) : (
          /* Dynamic Equal Video Grid Mode */
          <div className={`ce-meet-grid ${gridClass}`}>
            {allMembers.map((m) => renderSingleTile(m, false))}
          </div>
        )}

        {/* Side Participants Drawer */}
        {showParticipantsPanel && (
          <div className="ce-meet-side-panel">
            <div className="ce-meet-side-header">
              <span>In-Meeting ({allMembers.length})</span>
              <button
                type="button"
                onClick={() => setShowParticipantsPanel(false)}
                style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="ce-meet-side-list">
              {allMembers.map((member) => {
                const memberAvatarUrl = getAvatarUrl(member.avatar);
                const isPinned = String(pinnedUserId) === String(member.userId);

                return (
                  <div key={member.userId} className="ce-meet-side-item">
                    <div className="ce-meet-side-user-info">
                      {memberAvatarUrl ? (
                        <img
                          src={memberAvatarUrl}
                          alt={member.username}
                          className="ce-meet-side-avatar"
                          style={{ objectFit: "cover" }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="ce-meet-side-avatar">
                          {(member.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#ffffff" }}>
                        {member.username}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setPinnedUserId(isPinned ? null : member.userId)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isPinned ? "#6366f1" : "#9ca3af",
                          cursor: "pointer"
                        }}
                        title={isPinned ? "Unpin" : "Pin participant"}
                      >
                        <Pin size={14} />
                      </button>

                      {member.isMicOn ? (
                        <Mic size={14} color="#10b981" />
                      ) : (
                        <MicOff size={14} color="#ef4444" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      <div className="ce-meet-bottom-bar">
        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ffffff" }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div className="ce-meet-bar-center">
          <button
            type="button"
            className={`ce-meet-ctrl-btn ${!isMicOn ? "off" : ""}`}
            onClick={() => setIsMicOn(!isMicOn)}
            title={isMicOn ? "Turn off mic" : "Turn on mic"}
          >
            {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          <button
            type="button"
            className={`ce-meet-ctrl-btn ${!isVideoOn ? "off" : ""}`}
            onClick={() => setIsVideoOn(!isVideoOn)}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          <button
            type="button"
            className={`ce-meet-ctrl-btn ${isHandRaised ? "active-feature" : ""}`}
            onClick={() => setIsHandRaised(!isHandRaised)}
            title="Raise / Lower Hand"
          >
            <Hand size={20} />
          </button>

          <button
            type="button"
            className={`ce-meet-ctrl-btn ${isScreenSharing ? "active-feature" : ""}`}
            title={isScreenSharing ? "Stop Presenting Screen" : "Share Screen"}
            onClick={toggleScreenShare}
          >
            <Monitor size={20} />
          </button>

          <button
            type="button"
            className="ce-meet-end-call-btn"
            onClick={() => {
              if (localStream) {
                localStream.getTracks().forEach((t) => t.stop());
              }
              onLeaveMeeting();
            }}
            title="Leave Meeting"
          >
            <PhoneOff size={20} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className={`ce-meet-ctrl-btn ${showParticipantsPanel ? "active-feature" : ""}`}
            onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
            title="In-Meeting Participants"
          >
            <Users size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMeetStage;
