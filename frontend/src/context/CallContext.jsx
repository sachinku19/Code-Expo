/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import socket from "../socket/socket";
import { sendDirectMessage } from "../services/directMessageService";

class CallSoundSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.ringbackInterval = null;
    this.incomingInterval = null;
    this.activeNodes = [];
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  // Dial tone for caller ("trun trun" sound on repeat)
  playTrunTrun() {
    this.stopAll();
    this.init();

    const playPulse = () => {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;

      // Pulse 1: "trun" (mixed frequencies for realistic phone dial tone sound)
      this.createDualTone(400, 450, now, 0.35);

      // Pulse 2: "trun" (after 0.5s)
      this.createDualTone(400, 450, now + 0.5, 0.35);
    };

    playPulse();
    this.ringbackInterval = setInterval(playPulse, 2600);
  }

  createDualTone(f1, f2, startTime, duration) {
    if (!this.audioCtx) return;
    try {
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc1.frequency.setValueAtTime(f1, startTime);
      osc2.frequency.setValueAtTime(f2, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05); // pleasant low volume
      gainNode.gain.setValueAtTime(0.08, startTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);

      this.activeNodes.push(osc1, osc2, gainNode);
    } catch (e) {
      console.warn("Could not create synthesized dial tone node:", e);
    }
  }

  // Ringtone for receiver (incoming call chime)
  playIncomingRing() {
    this.stopAll();
    this.init();

    const playRing = () => {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;

      // WhatsApp-style electronic chime melody
      this.createMelodicRing(now, 0.35, 880);
      this.createMelodicRing(now + 0.45, 0.35, 980);
    };

    playRing();
    this.incomingInterval = setInterval(playRing, 2200);
  }

  createMelodicRing(startTime, duration, freq) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);

      this.activeNodes.push(osc, gainNode);
    } catch (e) {
      console.warn("Could not create synthesized ringtone node:", e);
    }
  }

  stopAll() {
    if (this.ringbackInterval) {
      clearInterval(this.ringbackInterval);
      this.ringbackInterval = null;
    }
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    this.activeNodes.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }
}

const callSynth = new CallSoundSynthesizer();

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [activeCall, setActiveCall] = useState(null); // null or { type: 'audio'|'video', status: 'incoming'|'calling'|'connected', partner }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> { stream, username, userId, isMuted, isCameraOff }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTheme, setCallTheme] = useState("glassmorphism");
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callSize, setCallSize] = useState("compressed");

  // Google Meet UI states
  const [preCallModal, setPreCallModal] = useState(null); // { partner, selectedType }
  const [declinedCallIds, setDeclinedCallIds] = useState(new Set());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeDrawer, setActiveDrawer] = useState(null); // 'chat' | 'participants' | 'settings' | null

  const localStreamRef = useRef(null);
  const callConnectTimeoutRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const activeCallRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const screenTrackRef = useRef(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const saveCallLog = async (status, finalDuration = 0) => {
    try {
      const activeCallVal = activeCallRef.current;
      if (!activeCallVal) return;
      const isCaller = activeCallVal.caller?._id === currentUserId;
      if (!isCaller) return;

      const recipientId = activeCallVal.partner._id || activeCallVal.partner.id;
      const callType = activeCallVal.type;

      const payload = {
        callType,
        status,
        duration: finalDuration
      };

      await sendDirectMessage(recipientId, JSON.stringify(payload), "call");
      console.log("Logged call history successfully:", payload);
    } catch (err) {
      console.error("Error saving call history message:", err);
    }
  };

  // Call duration counter
  useEffect(() => {
    let timer;
    if (activeCall && activeCall.status === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration((prev) => (prev !== 0 ? 0 : prev));
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  const cleanUpAllCallConnections = () => {
    console.log("WebRTC: Cleaning up all connections");
    callSynth.stopAll();
    Object.keys(peerConnectionsRef.current).forEach((socketId) => {
      const pc = peerConnectionsRef.current[socketId];
      if (pc) {
        try {
          pc.close();
        } catch (e) {
          console.error("Error closing peer connection:", e);
        }
      }
    });
    peerConnectionsRef.current = {};
    setRemoteStreams({});
  };

  const handlePeerDisconnect = (socketId) => {
    console.log("WebRTC: Cleaning up peer connection for socketId:", socketId);
    const pc = peerConnectionsRef.current[socketId];
    if (pc) {
      try {
        pc.close();
      } catch (e) {
        console.error("Error closing peer connection:", e);
      }
      delete peerConnectionsRef.current[socketId];
    }
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  };

  const createPeerConnection = (targetSocketId, targetUsername, targetUserId, currentLocalStream) => {
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

    console.log("WebRTC: Creating RTCPeerConnection for target:", targetSocketId);
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
      console.log("WebRTC: Received remote track from target:", targetSocketId);
      const stream = event.streams[0];
      if (stream) {
        setRemoteStreams((prev) => ({
          ...prev,
          [targetSocketId]: {
            ...prev[targetSocketId],
            stream,
            username: targetUsername || "Participant",
            userId: targetUserId
          }
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`WebRTC Connection State for ${targetSocketId}:`, pc.connectionState);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        handlePeerDisconnect(targetSocketId);
      }
    };

    return pc;
  };

  const startLocalStream = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video" ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.warn("Could not access media devices:", err);
      return null;
    }
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track from ref:", e);
        }
      });
      localStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track from state:", e);
        }
      });
      setLocalStream(null);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const newMuted = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
      setIsMuted(newMuted);

      const targetId = activeCall?.partner?.isGroup ? (activeCall.partner._id || activeCall.partner.id) : (activeCall?.partner?._id || activeCall?.partner?.id);
      if (targetId) {
        socket.emit("toggle-media", {
          roomId: targetId,
          isMuted: newMuted,
          isCameraOff: isVideoOff
        });
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newVideoOff = !isVideoOff;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
      });
      setIsVideoOff(newVideoOff);

      const targetId = activeCall?.partner?.isGroup ? (activeCall.partner._id || activeCall.partner.id) : (activeCall?.partner?._id || activeCall?.partner?.id);
      if (targetId) {
        socket.emit("toggle-media", {
          roomId: targetId,
          isMuted: isMuted,
          isCameraOff: newVideoOff
        });
      }
    }
  };

  const handleStartCall = async (type, partnerUser) => {
    if (!partnerUser || !user) return;

    setIsCallMinimized(false);
    
    const callerInfo = {
      _id: currentUserId,
      username: user.username,
      avatar: user.avatar || ""
    };

    setActiveCall({
      type,
      status: "calling",
      partner: partnerUser,
      caller: callerInfo,
      connectedMembers: []
    });

    await startLocalStream(type);

    const isOnline = partnerUser.isGroup || partnerUser.isOnline;
    if (isOnline) {
      callSynth.playTrunTrun();
    }

    socket.emit("dm:call:invite", {
      recipientId: partnerUser._id || partnerUser.id,
      type,
      callerInfo,
      group: partnerUser.isGroup ? {
        _id: partnerUser._id || partnerUser.id,
        name: partnerUser.name,
        avatar: partnerUser.avatar || "",
        isGroup: true
      } : null
    });
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;

    setIsCallMinimized(false);
    callSynth.stopAll();
    await startLocalStream(activeCall.type);

    const callerId = activeCall.caller?._id || activeCall.partner._id || activeCall.partner.id;
    const isGroup = activeCall.partner.isGroup;
    const groupId = isGroup ? (activeCall.partner._id || activeCall.partner.id) : null;

    socket.emit("dm:call:accept", {
      callerId,
      groupId,
      accepterInfo: {
        _id: currentUserId,
        username: user?.username
      }
    });

    callStartTimeRef.current = Date.now();

    setActiveCall((prev) => {
      if (!prev) return null;
      return { ...prev, status: "connected" };
    });
  };

  const openPreCallModal = (partner, defaultType = "audio") => {
    if (!partner) return;
    handleStartCall(defaultType, partner);
  };

  const closePreCallModal = () => {
    setPreCallModal(null);
  };

  const toggleHandRaise = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    const targetId = activeCall?.partner?.isGroup ? (activeCall.partner._id || activeCall.partner.id) : (activeCall?.partner?._id || activeCall?.partner?.id);
    if (targetId) {
      socket.emit("toggle-media", {
        roomId: targetId,
        isMuted,
        isCameraOff: isVideoOff,
        isHandRaised: next
      });
    }
  };

  const sendInCallMessage = (text) => {
    if (!text || !text.trim() || !user) return;
    const newMsg = {
      id: Date.now(),
      senderId: currentUserId,
      senderName: user.username || "You",
      senderAvatar: user.avatar || "",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setInCallMessages(prev => [...prev, newMsg]);
    if (activeDrawer !== "chat") {
      setUnreadCount(prev => prev + 1);
    }
    const targetId = activeCall?.partner?.isGroup ? (activeCall.partner._id || activeCall.partner.id) : (activeCall?.partner?._id || activeCall?.partner?.id);
    if (targetId) {
      socket.emit("in-call-chat-message", { roomId: targetId, msg: newMsg });
    }
  };

  const handleDeclineCall = () => {
    if (!activeCall) return;

    const callerId = activeCall.caller?._id || activeCall.partner._id || activeCall.partner.id;
    if (callerId) {
      setDeclinedCallIds(prev => new Set(prev).add(String(callerId)));
    }
    socket.emit("dm:call:decline", {
      callerId,
      declinerInfo: {
        _id: currentUserId,
        username: user?.username
      }
    });
    
    stopLocalStream();
    cleanUpAllCallConnections();
    setActiveCall(null);
  };

  const handleEndCall = () => {
    if (!activeCall) return;

    const isGroupCall = activeCall.partner.isGroup;
    const isCaller = activeCall.caller?._id === currentUserId;

    // Calculate duration
    const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
    callStartTimeRef.current = null;

    if (activeCall.status === "calling") {
      saveCallLog("missed");
    } else if (activeCall.status === "connected") {
      saveCallLog("completed", duration);
    }

    if (!isGroupCall || isCaller) {
      socket.emit("dm:call:end", { partnerId: activeCall.partner._id || activeCall.partner.id });
    } else {
      socket.emit("dm:call:leave", {
        groupId: activeCall.partner._id || activeCall.partner.id,
        userId: currentUserId,
        username: user?.username
      });
    }

    stopLocalStream();
    cleanUpAllCallConnections();
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Socket event listeners
  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingCall = ({ callerId, callerSocketId, callerInfo, type, group }) => {
      // Prevent self-ringing loopbacks
      if (String(callerId) === String(currentUserId)) {
        return;
      }
      // Auto-decline if already in a call
      if (activeCallRef.current) {
        socket.emit("dm:call:decline", { callerId });
        return;
      }
      setIsCallMinimized(false);
      callSynth.playIncomingRing();
      setActiveCall({
        type,
        status: "incoming",
        partner: group || callerInfo,
        caller: { ...callerInfo, socketId: callerSocketId },
        connectedMembers: []
      });
    };

    const handleCallAccepted = ({ accepterInfo, groupId, accepterSocketId }) => {
      console.log("WebRTC: handleCallAccepted from", accepterInfo?.username, "socket:", accepterSocketId);
      
      callSynth.stopAll();
      callStartTimeRef.current = Date.now();

      setActiveCall((prev) => {
        if (!prev) return null;
        
        const currentConnected = prev.connectedMembers || [];
        const alreadyAdded = accepterInfo ? currentConnected.some(m => String(m._id) === String(accepterInfo._id)) : false;
        const updatedMembers = (accepterInfo && !alreadyAdded) ? [...currentConnected, { ...accepterInfo, socketId: accepterSocketId }] : currentConnected;
        
        // If we are the host of the group call, emit the sync event to the group
        const isHost = prev.caller?._id === currentUserId;
        if (isHost && prev.partner.isGroup && groupId) {
          socket.emit("dm:call:sync", {
            groupId,
            connectedMembers: updatedMembers
          });
        }

        return {
          ...prev,
          status: "connected",
          connectedMembers: updatedMembers
        };
      });

      // Start WebRTC Negotiation: If we are in calling or connected state, initiate RTCPeerConnection to the new peer
      const currentCall = activeCallRef.current;
      if (currentCall && (currentCall.status === "calling" || currentCall.status === "connected")) {
        if (accepterSocketId && accepterSocketId !== socket.id) {
          setTimeout(async () => {
            const pc = createPeerConnection(
              accepterSocketId,
              accepterInfo?.username,
              accepterInfo?._id,
              localStreamRef.current
            );
            try {
              console.log("WebRTC: Creating and sending offer to:", accepterSocketId);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket.emit("webrtc-offer", {
                targetSocketId: accepterSocketId,
                offer
              });
            } catch (err) {
              console.error("Error creating offer:", err);
            }
          }, 500);
        }
      }
    };

    const handleCallDeclined = ({ declinerInfo }) => {
      const currentCall = activeCallRef.current;
      if (currentCall && currentCall.partner.isGroup) {
        console.log(`${declinerInfo?.username || "A user"} declined the group call.`);
        return;
      }
      saveCallLog("declined");
      stopLocalStream();
      cleanUpAllCallConnections();
      setActiveCall(null);
      alert("Call was declined.");
    };

    const handleCallEnded = () => {
      const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
      callStartTimeRef.current = null;

      const currentCall = activeCallRef.current;
      if (currentCall) {
        if (currentCall.status === "calling") {
          saveCallLog("missed");
        } else if (currentCall.status === "connected") {
          saveCallLog("completed", duration);
        }
      }

      stopLocalStream();
      cleanUpAllCallConnections();
      setActiveCall(null);
    };

    const handleCallLeft = ({ userId }) => {
      console.log("WebRTC: handleCallLeft from userId:", userId);
      
      setRemoteStreams((prev) => {
        const socketId = Object.keys(prev).find(key => String(prev[key].userId) === String(userId));
        if (socketId) {
          setTimeout(() => handlePeerDisconnect(socketId), 50);
        }
        return prev;
      });

      setActiveCall((prev) => {
        if (!prev) return null;
        
        const currentConnected = prev.connectedMembers || [];
        const updatedMembers = currentConnected.filter(m => String(m._id) !== String(userId));
        
        // If we are the host, emit the sync event to the group
        const isHost = prev.caller?._id === currentUserId;
        const groupId = prev.partner.isGroup ? (prev.partner._id || prev.partner.id) : null;
        if (isHost && groupId) {
          socket.emit("dm:call:sync", {
            groupId,
            connectedMembers: updatedMembers
          });
        }

        return {
          ...prev,
          connectedMembers: updatedMembers
        };
      });
    };

    const handleCallSynced = ({ connectedMembers }) => {
      setActiveCall((prev) => {
        if (!prev) return null;
        
        // Map connected members and establish peer connection to any new ones that accepted
        const currentCall = activeCallRef.current;
        if (currentCall && currentCall.status === "connected" && connectedMembers) {
          connectedMembers.forEach(member => {
            if (member.socketId && member.socketId !== socket.id && !peerConnectionsRef.current[member.socketId]) {
              console.log("WebRTC (Sync): Establishing peer connection to:", member.username);
              // Wait for them to send offer or initiate peer connection
            }
          });
        }

        return {
          ...prev,
          connectedMembers: connectedMembers || []
        };
      });
    };

    const handleWebRtcOffer = async ({ senderSocketId, offer }) => {
      const currentCall = activeCallRef.current;
      if (!currentCall) return;
      console.log("WebRTC: Received offer from:", senderSocketId);
      
      let peerUsername = "Participant";
      let peerUserId = "";
      if (currentCall.partner.isGroup) {
        const member = currentCall.connectedMembers?.find(m => m.socketId === senderSocketId);
        if (member) {
          peerUsername = member.username;
          peerUserId = member._id;
        } else if (currentCall.caller?.socketId === senderSocketId) {
          peerUsername = currentCall.caller.username;
          peerUserId = currentCall.caller._id;
        }
      } else {
        peerUsername = currentCall.partner.username;
        peerUserId = currentCall.partner._id || currentCall.partner.id;
      }

      const pc = createPeerConnection(senderSocketId, peerUsername, peerUserId, localStreamRef.current);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("WebRTC: Sending answer to:", senderSocketId);
        socket.emit("webrtc-answer", {
          targetSocketId: senderSocketId,
          answer
        });
      } catch (err) {
        console.error("Error handling WebRTC offer:", err);
      }
    };

    const handleWebRtcAnswer = async ({ senderSocketId, answer }) => {
      console.log("WebRTC: Received answer from:", senderSocketId);
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
      console.log("WebRTC: handleUserToggleMedia", { socketId, peerMuted, peerCameraOff });
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

    const handleUserLeftCall = ({ socketId }) => {
      console.log("WebRTC: handleUserLeftCall from socket:", socketId);
      handlePeerDisconnect(socketId);
    };

    socket.on("dm:call:invite", handleIncomingCall);
    socket.on("dm:call:accept", handleCallAccepted);
    socket.on("dm:call:decline", handleCallDeclined);
    socket.on("dm:call:end", handleCallEnded);
    socket.on("dm:call:leave", handleCallLeft);
    socket.on("dm:call:sync", handleCallSynced);

    // WebRTC signalling listeners
    socket.on("webrtc-offer", handleWebRtcOffer);
    socket.on("webrtc-answer", handleWebRtcAnswer);
    socket.on("webrtc-ice-candidate", handleWebRtcIceCandidate);
    socket.on("user-toggle-media", handleUserToggleMedia);
    socket.on("user-left-call", handleUserLeftCall);

    return () => {
      socket.off("dm:call:invite", handleIncomingCall);
      socket.off("dm:call:accept", handleCallAccepted);
      socket.off("dm:call:decline", handleCallDeclined);
      socket.off("dm:call:end", handleCallEnded);
      socket.off("dm:call:leave", handleCallLeft);
      socket.off("dm:call:sync", handleCallSynced);
      
      socket.off("webrtc-offer", handleWebRtcOffer);
      socket.off("webrtc-answer", handleWebRtcAnswer);
      socket.off("webrtc-ice-candidate", handleWebRtcIceCandidate);
      socket.off("user-toggle-media", handleUserToggleMedia);
      socket.off("user-left-call", handleUserLeftCall);
    };
  }, [currentUserId, activeCall, user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (callConnectTimeoutRef.current) {
        clearTimeout(callConnectTimeoutRef.current);
      }
      stopLocalStream();
      cleanUpAllCallConnections();
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        callTheme,
        setCallTheme,
        callDuration,
        isCallMinimized,
        setIsCallMinimized,
        callSize,
        setCallSize,
        toggleMute,
        toggleVideo,
        handleStartCall,
        handleAcceptCall,
        handleDeclineCall,
        handleEndCall,
        stopLocalStream,
        // Pre-call & Google Meet features
        preCallModal,
        openPreCallModal,
        closePreCallModal,
        declinedCallIds,
        isHandRaised,
        toggleHandRaise,
        isScreenSharing,
        inCallMessages,
        sendInCallMessage,
        unreadCount,
        setUnreadCount,
        activeDrawer,
        setActiveDrawer
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
