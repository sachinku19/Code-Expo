import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import socket from "../socket/socket";

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [activeCall, setActiveCall] = useState(null); // null or { type: 'audio'|'video', status: 'incoming'|'calling'|'connected', partner }
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callTheme, setCallTheme] = useState("glassmorphism");
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callSize, setCallSize] = useState("compressed");

  const localStreamRef = useRef(null);
  const callConnectTimeoutRef = useRef(null);

  // Call duration counter
  useEffect(() => {
    let timer;
    if (activeCall && activeCall.status === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeCall]);

  const startLocalStream = async (type) => {
    try {
      const constraints = {
        audio: true,
        video: type === "video"
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
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleStartCall = async (type, partnerUser) => {
    if (!partnerUser || !user) return;

    setIsCallMinimized(false);
    setActiveCall({
      type,
      status: "calling",
      partner: partnerUser
    });

    const stream = await startLocalStream(type);

    const callerInfo = {
      _id: currentUserId,
      username: user.username,
      avatar: user.avatar || ""
    };

    socket.emit("dm:call:invite", {
      recipientId: partnerUser._id || partnerUser.id,
      type,
      callerInfo
    });
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;

    setIsCallMinimized(false);
    const stream = await startLocalStream(activeCall.type);

    socket.emit("dm:call:accept", { callerId: activeCall.partner._id || activeCall.partner.id });

    setActiveCall((prev) => {
      if (!prev) return null;
      return { ...prev, status: "connected" };
    });
  };

  const handleDeclineCall = () => {
    if (!activeCall) return;

    socket.emit("dm:call:decline", { callerId: activeCall.partner._id || activeCall.partner.id });
    
    stopLocalStream();
    setActiveCall(null);
  };

  const handleEndCall = () => {
    if (!activeCall) return;

    socket.emit("dm:call:end", { partnerId: activeCall.partner._id || activeCall.partner.id });

    stopLocalStream();
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  // Socket event listeners
  useEffect(() => {
    if (!currentUserId) return;

    const handleIncomingCall = ({ callerId, callerInfo, type }) => {
      // Auto-decline if already in a call
      if (activeCall) {
        socket.emit("dm:call:decline", { callerId });
        return;
      }
      setIsCallMinimized(false);
      setActiveCall({
        type,
        status: "incoming",
        partner: callerInfo
      });
    };

    const handleCallAccepted = () => {
      setActiveCall((prev) => {
        if (!prev) return null;
        return { ...prev, status: "connected" };
      });
    };

    const handleCallDeclined = () => {
      stopLocalStream();
      setActiveCall(null);
      alert("Call was declined.");
    };

    const handleCallEnded = () => {
      stopLocalStream();
      setActiveCall(null);
    };

    socket.on("dm:call:invite", handleIncomingCall);
    socket.on("dm:call:accept", handleCallAccepted);
    socket.on("dm:call:decline", handleCallDeclined);
    socket.on("dm:call:end", handleCallEnded);

    return () => {
      socket.off("dm:call:invite", handleIncomingCall);
      socket.off("dm:call:accept", handleCallAccepted);
      socket.off("dm:call:decline", handleCallDeclined);
      socket.off("dm:call:end", handleCallEnded);
    };
  }, [currentUserId, activeCall]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (callConnectTimeoutRef.current) {
        clearTimeout(callConnectTimeoutRef.current);
      }
      stopLocalStream();
    };
  }, []);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        localStream,
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
        stopLocalStream
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
