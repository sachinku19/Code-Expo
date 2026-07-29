import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, X, Video as VideoIcon, ShieldCheck, Volume2 } from "lucide-react";
import "./GoogleMeet.css";

const getAvatarUrl = (avatar) => {
  if (!avatar) return null;
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object") return avatar.url || avatar.path || null;
  return null;
};

const GoogleMeetLobbyModal = ({
  isOpen,
  onClose,
  onJoinMeeting,
  roomTitle,
  currentUser,
  initialMicOn = true,
  initialVideoOn = true
}) => {
  const [isMicOn, setIsMicOn] = useState(initialMicOn);
  const [isVideoOn, setIsVideoOn] = useState(initialVideoOn);
  const [mediaStream, setMediaStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      }
      return;
    }

    let stream = null;
    async function initPreview() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Could not access media devices for preview:", err);
      }
    }

    initPreview();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = isVideoOn;

      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = isMicOn;

      if (videoRef.current && videoRef.current.srcObject !== mediaStream) {
        videoRef.current.srcObject = mediaStream;
      }
    }
  }, [isVideoOn, isMicOn, mediaStream]);

  // Real-time mic audio visualizer
  useEffect(() => {
    if (!isOpen || !isMicOn || !mediaStream) {
      setAudioLevel(0);
      return;
    }
    const audioTracks = mediaStream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) return;

    let audioContext = null;
    let analyser = null;
    let animFrame = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setAudioLevel(Math.min(100, Math.round((avg / 100) * 100)));
        animFrame = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn("Lobby audio visualizer error:", e);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [isOpen, isMicOn, mediaStream]);

  if (!isOpen) return null;

  const handleJoin = (forceMuted = false) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    onJoinMeeting({
      isMicOn: forceMuted ? false : isMicOn,
      isVideoOn: forceMuted ? false : isVideoOn
    });
  };

  const username = currentUser?.username || "Guest User";
  const initialLetter = username.charAt(0).toUpperCase();
  const avatarUrl = getAvatarUrl(currentUser?.avatar);

  return (
    <div className="ce-meet-lobby-overlay" onClick={onClose}>
      <div className="ce-meet-lobby-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ce-meet-lobby-header">
          <div className="ce-meet-lobby-header-left">
            <div className="ce-meet-brand-icon">
              <VideoIcon size={18} />
            </div>
            <div>
              <div className="ce-meet-title-row">
                <h3 className="ce-meet-room-title">{roomTitle || "Workspace Meeting"}</h3>
                <span className="ce-meet-status-badge">Ready to Join</span>
              </div>
              <p className="ce-meet-subtitle">Check your camera and microphone settings before entering</p>
            </div>
          </div>

          <button
            type="button"
            className="ce-meet-close-button"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Preview Container */}
        <div className="ce-meet-preview-box">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="ce-meet-video-element"
            style={{ display: isVideoOn ? "block" : "none" }}
          />

          {!isVideoOn && (
            <div className="ce-meet-camera-off-state">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="ce-meet-avatar-image" />
              ) : (
                <div className="ce-meet-avatar-circle">{initialLetter}</div>
              )}
              <span className="ce-meet-camera-off-text">Camera is turned off</span>
            </div>
          )}

          {/* User Name Tag */}
          <div className="ce-meet-preview-name-tag">
            <span className="ce-meet-name-dot" />
            <span>{username} (You)</span>
          </div>

          {/* Live Mic Audio Indicator */}
          {isMicOn && (
            <div className="ce-meet-audio-indicator" title="Microphone volume level">
              <Volume2 size={14} className="ce-meet-vol-icon" />
              <div className="ce-meet-audio-bar-bg">
                <div className="ce-meet-audio-bar-fill" style={{ width: `${Math.max(10, audioLevel)}%` }} />
              </div>
            </div>
          )}

          {/* Center Toggle Controls */}
          <div className="ce-meet-preview-controls">
            <button
              type="button"
              className={`ce-meet-toggle-btn ${!isMicOn ? "disabled" : "active"}`}
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              <span>{isMicOn ? "Mic On" : "Muted"}</span>
            </button>

            <button
              type="button"
              className={`ce-meet-toggle-btn ${!isVideoOn ? "disabled" : "active"}`}
              onClick={() => setIsVideoOn(!isVideoOn)}
              title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
            >
              {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              <span>{isVideoOn ? "Cam On" : "Cam Off"}</span>
            </button>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="ce-meet-lobby-footer-bar">
          <div className="ce-meet-user-badge">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="ce-meet-badge-avatar" />
            ) : (
              <div className="ce-meet-badge-initial">{initialLetter}</div>
            )}
            <div className="ce-meet-badge-details">
              <span className="ce-meet-badge-name">Joining as <strong>{username}</strong></span>
              <span className="ce-meet-badge-sec"><ShieldCheck size={12} /> Workspace Secured</span>
            </div>
          </div>

          <div className="ce-meet-actions-group">
            <button
              type="button"
              className="ce-meet-btn-secondary"
              onClick={() => handleJoin(true)}
            >
              Join Muted
            </button>
            <button
              type="button"
              className="ce-meet-btn-primary"
              onClick={() => handleJoin(false)}
            >
              Join Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMeetLobbyModal;
