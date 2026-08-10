import React, { useState } from "react";
import { Video, Mic, MicOff, Monitor, PhoneOff, Send, MessageSquare, Sparkles, Check } from "lucide-react";
import "./MobileRoomCollaborationShowcase.css";

export default function MobileRoomCollaborationShowcase() {
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  return (
    <section className="mobile-collab-section" id="mobile-room-collab">
      <div className="mobile-collab-container">
        
        {/* Header */}
        <div className="mobile-collab-header">
          <span className="mobile-collab-tag">INTEGRATED COLLABORATION</span>
          <h3 className="mobile-collab-title">
            Meeting & Chat. <span className="mobile-collab-title-glow">In-room.</span>
          </h3>
        </div>

        {/* Scattered Deck (Re-aligned flat grid for mobile viewports) */}
        <div className="mobile-collab-grid">
          {/* Card 1: Video Call profile (Sachin) */}
          <div className="mobile-scattered-card accent-purple">
            <div className="mobile-card-inner">
              <div className="mobile-video-header">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80" alt="Sachin" className="mobile-video-avatar" />
                <div className="mobile-video-meta">
                  <span className="mobile-video-name">Sachin Kumar</span>
                  <span className="mobile-video-role">Developer • Speaking</span>
                </div>
                {/* Audio Waves */}
                <div className="mobile-audio-waves">
                  <span className="wave-bar active-1" />
                  <span className="wave-bar active-2" />
                  <span className="wave-bar active-3" />
                </div>
              </div>
            </div>
            <div className="mobile-card-lip lip-purple">SPEAKING</div>
          </div>

          {/* Card 4: Chat Message (Sarah) */}
          <div className="mobile-scattered-card accent-orange">
            <div className="mobile-card-inner">
              <div className="mobile-chat-header">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80" alt="Sarah" className="mobile-chat-avatar" />
                <div>
                  <strong className="mobile-chat-name">Sarah Jenkins</strong>
                  <span className="mobile-chat-time">Just now</span>
                </div>
              </div>
              <p className="mobile-chat-body">
                Hey team! Just pushed the WebRTC audio peak handler. Let's test.
              </p>
            </div>
            <div className="mobile-card-lip lip-orange">NEW MESSAGE</div>
          </div>

          {/* Card 6: Inline controls */}
          <div className="mobile-scattered-card controls-card">
            <div className="mobile-controls-row">
              <button 
                className={`mobile-ctrl-btn ${micActive ? "active" : "muted"}`}
                onClick={() => setMicActive(!micActive)}
              >
                {micActive ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <button 
                className={`mobile-ctrl-btn ${videoActive ? "active" : "muted"}`}
                onClick={() => setVideoActive(!videoActive)}
              >
                <Video size={14} />
              </button>
              <button 
                className={`mobile-ctrl-btn ${screenSharing ? "active" : ""}`}
                onClick={() => setScreenSharing(!screenSharing)}
              >
                <Monitor size={14} />
              </button>
              <button className="mobile-ctrl-btn hangup">
                <PhoneOff size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="mobile-collab-info-panel">
          <p className="mobile-collab-desc">
            CodeExpo integrates crystal clear WebRTC video rooms and threaded developer chat feeds. Pair program, review code structures, and converse with your team in one unified tab.
          </p>

          <div className="mobile-collab-features-list">
            <div className="mobile-feature-item">
              <div className="mobile-feature-icon-box blue">
                <Video size={16} />
              </div>
              <div className="mobile-feature-text">
                <h4>Low-Latency Video Rooms</h4>
                <p>HD voice and video calls with peer-to-peer screen sharing.</p>
              </div>
            </div>

            <div className="mobile-feature-item">
              <div className="mobile-feature-icon-box green">
                <MessageSquare size={16} />
              </div>
              <div className="mobile-feature-text">
                <h4>Integrated Workspace Chat</h4>
                <p>Share code logs, compile snaps, and send files inside the room.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
