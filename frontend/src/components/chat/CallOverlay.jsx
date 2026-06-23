import React, { useEffect, useRef } from "react";
import { useCall } from "../../context/CallContext";
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Minimize2, Maximize2, Minus, Square, User
} from "lucide-react";
import "./DirectMessages.css";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function CallOverlay() {
  const {
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
    handleAcceptCall,
    handleDeclineCall,
    handleEndCall
  } = useCall();

  const localVideoRef = useRef(null);

  // Hook up local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  if (!activeCall) return null;

  return (
    <div className={`dm-call-overlay call-theme-${callTheme} ${isCallMinimized ? "minimized" : ""}`}>
      <div 
        className={`call-container glass-panel ${isCallMinimized ? "minimized" : ""} size-${callSize}`}
        onDoubleClick={() => {
          if (isCallMinimized) {
            setIsCallMinimized(false);
          }
        }}
        title={isCallMinimized ? "Double-click to restore call screen" : ""}
      >
        {/* Background glow effects */}
        <div className="call-glow-1"></div>
        <div className="call-glow-2"></div>

        <div className="call-header">
          {!isCallMinimized ? (
            <div className="call-theme-selector">
              <label>Style:</label>
              <select value={callTheme} onChange={(e) => setCallTheme(e.target.value)}>
                <option value="glassmorphism">Glassmorphism</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="dark-coder">Dark Coder</option>
                <option value="classic">Classic</option>
              </select>
            </div>
          ) : (
            <div className="mini-call-info">
              <span className="mini-partner-name">@{activeCall.partner.username}</span>
            </div>
          )}
          
          <div className="call-header-right">
            <div className="call-type-badge">
              {activeCall.type === "video" ? "Video Link" : "Audio Link"}
            </div>
            {/* Expand / Compress Button */}
            <button
              type="button"
              className="call-resize-toggle-btn"
              onClick={() => {
                if (isCallMinimized) {
                  setIsCallMinimized(false);
                  setCallSize("expanded");
                } else {
                  setCallSize(prev => prev === "compressed" ? "expanded" : "compressed");
                }
              }}
              title={isCallMinimized ? "Restore and Expand Call Box" : (callSize === "compressed" ? "Expand Call Box" : "Compress Call Box")}
            >
              {isCallMinimized || callSize === "compressed" ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>

            {/* Minimize Button */}
            <button
              type="button"
              className="call-minimize-toggle-btn"
              onClick={() => setIsCallMinimized(!isCallMinimized)}
              title={isCallMinimized ? "Restore Call Screen" : "Minimize Call Screen"}
            >
              {isCallMinimized ? <Square size={13} /> : <Minus size={14} />}
            </button>
          </div>
        </div>

        {activeCall.status === "incoming" ? (
          /* Incoming Call Invitation Interface */
          <div className="incoming-call-screen">
            <div className="audio-stream-container">
              <div className="audio-avatar-wrapper">
                <div className="pulsing-avatar-ring animating"></div>
                <div className="pulsing-avatar large">
                  {activeCall.partner.avatar ? (
                    <img src={activeCall.partner.avatar} alt={activeCall.partner.username} />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {activeCall.partner.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="call-partner-name">{activeCall.partner.username}</h3>
              <span className="call-status">
                Incoming {activeCall.type === "video" ? "Video" : "Voice"} Call...
              </span>
            </div>
            
            <div className="call-control-panel incoming-actions">
              <button
                type="button"
                onClick={handleAcceptCall}
                className="control-btn accept-call"
                title="Accept Call"
              >
                <Phone size={22} />
              </button>
              <button
                type="button"
                onClick={handleDeclineCall}
                className="control-btn hang-up"
                title="Decline Call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          </div>
        ) : (
          /* Outgoing Calling & Connected Stream Interface */
          <>
            <div className="call-streams-board">
              {activeCall.type === "video" ? (
                <div className="video-streams-container">
                  {/* Remote (Simulated) */}
                  <div className="video-box remote-video animate-fade-in">
                    {activeCall.status === "connected" ? (
                      <div className="simulated-feed">
                        <div className="neon-scanning-line"></div>
                        <div className="pulsing-avatar large">
                          {activeCall.partner.avatar ? (
                            <img src={activeCall.partner.avatar} alt={activeCall.partner.username} />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {activeCall.partner.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="feed-status-text">Connected with {activeCall.partner.username}</span>
                      </div>
                    ) : (
                      <div className="simulated-placeholder">
                        <div className="spinner-glow"></div>
                        <span className="calling-text">Calling {activeCall.partner.username}...</span>
                      </div>
                    )}
                  </div>

                  {/* Local (Real Stream) */}
                  <div className="video-box local-video">
                    {localStream && !isVideoOff ? (
                      <video ref={localVideoRef} autoPlay playsInline muted className="local-video-element" />
                    ) : (
                      <div className="local-video-placeholder">
                        <User size={32} />
                        <span>Camera Off</span>
                      </div>
                    )}
                    <span className="video-label">You (Local)</span>
                  </div>
                </div>
              ) : (
                /* Audio Call Layout */
                <div className="audio-stream-container">
                  <div className="audio-avatar-wrapper">
                    <div className={`pulsing-avatar-ring ${activeCall.status === "connected" ? "animating" : ""}`}></div>
                    <div className="pulsing-avatar large">
                      {activeCall.partner.avatar ? (
                        <img src={activeCall.partner.avatar} alt={activeCall.partner.username} />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {activeCall.partner.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="call-partner-name">{activeCall.partner.username}</h3>
                  <span className="call-status">
                    {activeCall.status === "calling" ? "Calling..." : `Connected (${formatTime(callDuration)})`}
                  </span>
                </div>
              )}
            </div>

            <div className="call-control-panel">
              <button
                type="button"
                onClick={toggleMute}
                className={`control-btn ${isMuted ? "muted" : ""}`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              {activeCall.type === "video" && (
                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`control-btn ${isVideoOff ? "video-off" : ""}`}
                  title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                >
                  {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
              )}

              <button
                type="button"
                onClick={handleEndCall}
                className="control-btn hang-up"
                title="End Call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
