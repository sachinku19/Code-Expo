import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, X, Video as VideoIcon } from "lucide-react";
import "./GoogleMeet.css";

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

  if (!isOpen) return null;

  const handleJoin = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    onJoinMeeting({ isMicOn, isVideoOn });
  };

  const initialLetter = (currentUser?.username || "U").charAt(0).toUpperCase();

  return (
    <div className="ce-meet-lobby-overlay" onClick={onClose}>
      <div className="ce-meet-lobby-card" onClick={(e) => e.stopPropagation()}>
        <div className="ce-meet-lobby-header">
          <div className="ce-meet-lobby-title">
            <VideoIcon size={22} color="#6366f1" />
            <span>{roomTitle || "Workspace Meeting"}</span>
            <span className="ce-meet-badge-tag">Google Meet</span>
          </div>
          <button
            type="button"
            className="ce-meet-circle-btn"
            onClick={onClose}
            style={{ width: "36px", height: "36px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Preview Screen */}
        <div className="ce-meet-preview-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="ce-meet-preview-video"
            style={{ display: isVideoOn ? "block" : "none" }}
          />

          {!isVideoOn && (
            <div className="ce-meet-preview-fallback">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="ce-meet-tile-avatar-img"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : null}
              {!currentUser?.avatar && (
                <div className="ce-meet-avatar-large">{initialLetter}</div>
              )}
              <span style={{ fontSize: "0.9rem", color: "#9ca3af", fontWeight: "600" }}>
                Camera is turned off
              </span>
            </div>
          )}

          {/* Floating Pre-Join Toggle Controls */}
          <div className="ce-meet-lobby-toggles">
            <button
              type="button"
              className={`ce-meet-circle-btn ${!isMicOn ? "off" : ""}`}
              onClick={() => setIsMicOn(!isMicOn)}
              title={isMicOn ? "Turn off mic" : "Turn on mic"}
            >
              {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              type="button"
              className={`ce-meet-circle-btn ${!isVideoOn ? "off" : ""}`}
              onClick={() => setIsVideoOn(!isVideoOn)}
              title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="ce-meet-lobby-actions">
          <div className="ce-meet-lobby-info">
            <span className="ce-meet-lobby-info-title">Ready to join?</span>
            <span className="ce-meet-lobby-info-sub">
              Check your video and audio before entering the meeting workspace.
            </span>
          </div>

          <button
            type="button"
            className="ce-meet-join-now-btn"
            onClick={handleJoin}
          >
            Join Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMeetLobbyModal;
