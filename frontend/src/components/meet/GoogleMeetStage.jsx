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
  Volume2,
  SlidersHorizontal,
  LayoutGrid,
  Maximize,
  MoreHorizontal,
  ChevronDown,
  MoreVertical,
  X,
  Minus,
  Maximize2,
  Pin,
  PinOff,
  Search
} from "lucide-react";
import "./GoogleMeet.css";
import { MediaManager } from "../../utils/MediaManager";

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object") return avatar.url || avatar.path || null;
  return null;
};

function PersistentRemoteAudio({ userId, stream, onSpeakingChange }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      if (audioRef.current.srcObject !== stream) {
        audioRef.current.srcObject = stream;
      }
      audioRef.current.play().catch(() => { });
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
        audioContext.close().catch(() => { });
      }
    };
  }, [stream, userId, onSpeakingChange]);

  if (!stream) return null;
  return <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />;
}

function RemoteVideoTile({ member, isSpeaking, initial }) {
  const videoRef = useRef(null);
  const avatarUrl = getAvatarUrl(member.avatar);

  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && member.stream) {
      if (node.srcObject !== member.stream) {
        node.srcObject = member.stream;
      }
      if (member.isVideoOn) {
        node.play().catch(() => { });
      }
    }
  }, [member.stream, member.isVideoOn]);

  useEffect(() => {
    if (videoRef.current && member.stream) {
      if (videoRef.current.srcObject !== member.stream) {
        videoRef.current.srcObject = member.stream;
      }
      if (member.isVideoOn) {
        videoRef.current.play().catch(() => { });
      }
    }
  }, [member.stream, member.isVideoOn]);

  const videoTracks = member.stream ? member.stream.getVideoTracks() : [];
  const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === "live");
  const hasVideo = Boolean(member.stream && hasActiveVideoTrack && member.isVideoOn);

  return (
    <>
      <video
        ref={setVideoRef}
        autoPlay
        playsInline
        muted
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
  const [remoteSpeakingMap, setRemoteSpeakingMap] = useState({});
  const [participantSearchQuery, setParticipantSearchQuery] = useState("");
  const [participantsTab, setParticipantsTab] = useState("all");
  const [pillPos, setPillPos] = useState({ x: null, y: null });
  const isDraggingPillRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const mediaManagerRef = useRef(new MediaManager());

  const handleRemoteSpeakingChange = useCallback((userId, isSpeaking) => {
    setRemoteSpeakingMap((prev) => {
      if (prev[userId] === isSpeaking) return prev;
      return { ...prev, [userId]: isSpeaking };
    });
  }, []);

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

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
  };

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peersRef = useRef({});

  const setLocalVideoRef = useCallback((node) => {
    localVideoRef.current = node;
    if (node && localStream) {
      if (node.srcObject !== localStream) {
        node.srcObject = localStream;
      }
      if (isVideoOn) {
        node.play().catch(() => { });
      }
    }
  }, [localStream, isVideoOn]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      if (isVideoOn) {
        localVideoRef.current.play().catch(() => { });
      }
    }
  }, [localStream, isVideoOn, isMinimized]);

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
      try {
        await mediaManagerRef.current.stopScreenShare();
        setIsScreenSharing(false);
        setScreenStream(null);
      } catch (err) {
        console.warn("MediaManager: Failed stopping screen share:", err);
      }
    } else {
      try {
        const stream = await mediaManagerRef.current.startScreenShare();
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.onended = async () => {
            await mediaManagerRef.current.stopScreenShare();
            setIsScreenSharing(false);
            setScreenStream(null);
          };
        }
      } catch (err) {
        console.warn("MediaManager: Failed starting screen share:", err);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      mediaManagerRef.current.destroy();
      setLocalStream(null);
      setRemoteStreams({});
      return;
    }

    mediaManagerRef.current.setStreamChangeCallback((newStream) => {
      setLocalStream(newStream);
    });

    async function initMedia() {
      try {
        const stream = await mediaManagerRef.current.initializeStream(initialMicOn, initialVideoOn);
        setLocalStream(stream);
      } catch (err) {
        console.error("MediaManager: Stream initialization failed:", err);
      }
    }
    initMedia();

    return () => {
      mediaManagerRef.current.destroy();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!localStream) return;

    async function syncMediaState() {
      await mediaManagerRef.current.setMicState(isMicOn);
      await mediaManagerRef.current.setVideoState(isVideoOn);
    }
    syncMediaState();

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

    // Clean up peer connections for users who left the meeting
    const activeSocketIds = new Set(participants.map(p => p.socketId).filter(Boolean));
    Object.keys(peersRef.current).forEach((sockId) => {
      if (!activeSocketIds.has(sockId)) {
        console.log("MediaManager: Cleaning up peer connection for left user:", sockId);
        const pc = peersRef.current[sockId];
        if (pc) {
          try {
            pc.close();
          } catch (e) { }
          mediaManagerRef.current.unregisterPeer(sockId);
          delete peersRef.current[sockId];
        }
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[sockId];
          return next;
        });
      }
    });

    const createPeerConnection = (targetSocketId, targetUserId) => {
      let pc = peersRef.current[targetSocketId];
      if (pc) return pc;

      pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pc.pendingCandidates = [];
      peersRef.current[targetSocketId] = pc;

      // Register pc with media manager so track replacements are auto-synced
      mediaManagerRef.current.registerPeer(targetSocketId, pc);

      const hasAudioTrack = localStream.getAudioTracks().length > 0;
      const hasVideoTrack = localStream.getVideoTracks().length > 0;

      localStream.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStream);
        } catch (e) {
          console.warn("Failed to add track to PC on creation:", e);
        }
      });

      if (!hasVideoTrack) {
        try {
          pc.addTransceiver("video", { direction: "sendrecv" });
        } catch (e) {}
      }
      if (!hasAudioTrack) {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch (e) {}
      }

      pc.ontrack = (event) => {
        let stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);

        const updateRemoteStream = () => {
          setRemoteStreams((prev) => ({
            ...prev,
            [targetSocketId]: stream,
            [targetUserId]: stream
          }));
        };

        if (event.track) {
          event.track.onunmute = updateRemoteStream;
          event.track.onmute = updateRemoteStream;
          event.track.onended = updateRemoteStream;
        }

        updateRemoteStream();
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
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => { });
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
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => { });
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
        audioContext.close().catch(() => { });
      }
    };
  }, [isOpen, isMicOn, localStream, myId]);

  if (!isOpen) return null;

  const myName = currentUser?.username || "You";

  const allMembers = [
    {
      userId: myId,
      socketId: socket?.id,
      username: (myName || "You").replace(/\s*\(You\)\s*/gi, ""),
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

  const remoteAudioElements = allMembers
    .filter((m) => !m.isLocal && m.stream)
    .map((m) => (
      <PersistentRemoteAudio
        key={m.userId || m.socketId}
        userId={m.userId}
        stream={m.stream}
        onSpeakingChange={handleRemoteSpeakingChange}
      />
    ));

  const activeSpeakingMember = allMembers.find(
    (m) =>
      String(activeSpeakerId) === String(m.userId) ||
      remoteSpeakingMap[m.userId] ||
      (m.isLocal && isMicOn && activeSpeakerId === myId)
  );

  const pinnedMember = allMembers.find((m) => String(m.userId) === String(pinnedUserId));
  const unpinnedMembers = allMembers.filter((m) => String(m.userId) !== String(pinnedUserId));

  const renderSingleTile = (member, isFilmstrip = false) => {
    const isSpeaking = String(activeSpeakerId) === String(member.userId) || remoteSpeakingMap[member.userId];
    const initial = (member.username || "U").charAt(0).toUpperCase();
    const avatarUrl = getAvatarUrl(member.avatar);
    const isPinned = String(pinnedUserId) === String(member.userId);

    const localVideoTracks = localStream ? localStream.getVideoTracks() : [];
    const hasVideoActive = member.isLocal
      ? Boolean(isVideoOn && localStream && localVideoTracks.length > 0 && localVideoTracks.some((t) => t.enabled && t.readyState === "live"))
      : (() => {
        const videoTracks = member.stream ? member.stream.getVideoTracks() : [];
        const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === "live");
        return Boolean(member.stream && hasActiveVideoTrack && member.isVideoOn);
      })();

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

        {member.isLocal && (
          <video
            ref={setLocalVideoRef}
            autoPlay
            playsInline
            muted
            className="ce-meet-tile-video"
            style={{
              display: hasVideoActive ? "block" : "none",
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        )}

        {!member.isLocal && hasVideoActive && (
          <RemoteVideoTile
            member={member}
            isSpeaking={isSpeaking}
            initial={initial}
          />
        )}

        {!hasVideoActive && (
          !isFilmstrip ? (
            <div className="ce-meet-featured-speaker-view">
              <div className="ce-meet-featured-pulse-container">
                {isSpeaking && (
                  <div className="ce-meet-speaker-equalizer left">
                    <span /><span /><span /><span /><span />
                  </div>
                )}

                <div className={`ce-meet-speaker-avatar-ring ${isSpeaking ? "pulsing" : ""}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={member.username} className="ce-meet-speaker-avatar-img" />
                  ) : (
                    <div className="ce-meet-speaker-avatar-letter">{initial}</div>
                  )}
                </div>

                {isSpeaking && (
                  <div className="ce-meet-speaker-equalizer right">
                    <span /><span /><span /><span /><span />
                  </div>
                )}
              </div>

              <div className="ce-meet-featured-speaker-details">
                <div className="ce-meet-featured-speaker-name-row">
                  <span>{(member.username || "").replace(/\s*\(You\)\s*/gi, "")}{member.isLocal ? " (You)" : ""}</span>
                  {member.isMicOn ? <Mic size={14} color="#10b981" /> : <MicOff size={14} color="#ef4444" />}
                </div>
                {isSpeaking && (
                  <div className="ce-meet-featured-speaking-pill">
                    <div className="ce-meet-speaking-pill-waves">
                      <span /><span /><span />
                    </div>
                    <span>Speaking</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ce-meet-tile-avatar-wrapper">
              {avatarUrl ? (
                <img src={avatarUrl} alt={member.username} className="ce-meet-tile-avatar-img" />
              ) : (
                <div className="ce-meet-tile-avatar">{initial}</div>
              )}
            </div>
          )
        )}

        {(isFilmstrip || hasVideoActive) && (
          <div className="ce-meet-tile-bottom-bar">
            <div className="ce-meet-tile-user-name">
              <span>{(member.username || "").replace(/\s*\(You\)\s*/gi, "")}{member.isLocal ? " (You)" : ""}</span>
            </div>
            <div className="ce-meet-tile-icons">
              {member.isHandRaised && <span className="ce-meet-raised-hand-badge" title="Hand raised">✋</span>}
              {member.isMicOn ? (
                <Mic size={14} color="#10b981" />
              ) : (
                <MicOff size={14} color="#ef4444" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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

        {/* Active Speaker Tracking Badge when Minimized */}
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
              mediaManagerRef.current.destroy();
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

  const filteredMembers = allMembers.filter((m) =>
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
        {/* Dedicated Video Canvas Area for Video Grid + HUD Floating Controls */}
        <div className="ce-meet-video-canvas">
          {/* Floating Utilities at Top Right of Video Canvas */}
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

          {/* Floating Bottom Control Bar (Centered over Video Canvas) */}
          <div className="ce-meet-floating-controls">
            {/* Media Controls */}
            <button
              type="button"
              className={`ce-meet-float-btn ${!isMicOn ? "off" : ""}`}
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>

            <button
              type="button"
              className={`ce-meet-float-btn ${!isVideoOn ? "off" : ""}`}
              onClick={() => setIsVideoOn(!isVideoOn)}
              title={isVideoOn ? "Turn off Camera" : "Turn on Camera"}
            >
              {isVideoOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>

            <button
              type="button"
              className={`ce-meet-float-btn ${isHandRaised ? "active-feature" : ""}`}
              onClick={() => setIsHandRaised(!isHandRaised)}
              title="Raise / Lower Hand"
            >
              <Hand size={16} />
            </button>

            <button
              type="button"
              className={`ce-meet-float-btn ${isScreenSharing ? "active-feature" : ""}`}
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop sharing Screen" : "Share Screen"}
            >
              <Monitor size={16} />
            </button>

            {pinnedUserId && (
              <>
                <div className="ce-meet-floating-divider" />
                <button
                  type="button"
                  className="ce-meet-unpin-spotlight-btn"
                  onClick={() => setPinnedUserId(null)}
                  title="Unpin Spotlight"
                >
                  Unpin
                </button>
              </>
            )}

            <div className="ce-meet-floating-divider" />

            {/* Leave Call */}
            <button
              type="button"
              className="ce-meet-float-btn end"
              onClick={() => {
                mediaManagerRef.current.destroy();
                onLeaveMeeting();
              }}
              title="Leave Meeting"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>

        {/* Side Participants Drawer */}
        {showParticipantsPanel && (() => {
          const speakingCount = allMembers.filter(m => String(activeSpeakerId) === String(m.userId) || remoteSpeakingMap[m.userId]).length;
          const raisedCount = allMembers.filter(m => m.isHandRaised).length;
          const mutedCount = allMembers.filter(m => !m.isMicOn).length;

          const tabFilteredMembers = allMembers.filter((m) => {
            if (participantsTab === "speaking") {
              return String(activeSpeakerId) === String(m.userId) || remoteSpeakingMap[m.userId];
            }
            if (participantsTab === "raised") {
              return m.isHandRaised;
            }
            if (participantsTab === "muted") {
              return !m.isMicOn;
            }
            return true; // 'all'
          });

          const filteredMembers = tabFilteredMembers.filter((m) =>
            (m.username || "").toLowerCase().includes(participantSearchQuery.toLowerCase())
          );

          return (
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
                  <Search size={15} className="ce-meet-search-icon" />
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
                    const isSpeaking = String(activeSpeakerId) === String(member.userId) || remoteSpeakingMap[member.userId];

                    return (
                      <div key={member.userId} className="ce-meet-side-item">
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
                              {(member.username || "").replace(/\s*\(You\)\s*/gi, "")}{isMe ? " (You)" : ""}
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
                            <Pin size={13} />
                          </button>

                          <div className="ce-meet-side-mic">
                            {member.isMicOn ? (
                              <Mic size={13} color="#10b981" />
                            ) : (
                              <MicOff size={13} color="#ef4444" />
                            )}
                          </div>

                          <button type="button" className="ce-meet-side-more">
                            <MoreVertical size={14} />
                          </button>
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

              {/* Sidebar Pagination Footer */}
              <div className="ce-meet-side-pagination">
                <button type="button" className="ce-meet-page-arrow" disabled>&lt;</button>
                <button type="button" className="ce-meet-page-num active">1</button>
                <button type="button" className="ce-meet-page-num">2</button>
                <button type="button" className="ce-meet-page-num">3</button>
                <span className="ce-meet-page-dots">...</span>
                <button type="button" className="ce-meet-page-num">17</button>
                <button type="button" className="ce-meet-page-arrow">&gt;</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default GoogleMeetStage;
