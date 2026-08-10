import React, { useState } from "react";
import { Video, Mic, MicOff, Monitor, PhoneOff, Send, MessageSquare, Sparkles, Check, Smile, Paperclip } from "lucide-react";
import "./RoomCollaborationShowcase.css";

export default function RoomCollaborationShowcase() {
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  return (
    <section className="ce-collab-section" id="room-collab">
      {/* Ambient background decorative glow circles */}
      <div className="ce-collab-glow-blob main-blob" />
      <div className="ce-collab-glow-blob alt-blob" />

      <div className="ce-collab-container">
        
        {/* Left Side: Info & Descriptive features */}
        <div className="ce-collab-info-panel">
          <span className="ce-collab-tag">ROOM COLLABORATION HUB</span>
          <h2 className="ce-collab-title">
            Meeting & Live Chat. <br />
            <span className="ce-collab-gradient">Directly in your room.</span>
          </h2>
          <p className="ce-collab-desc">
            CodeExpo integrates crystal clear WebRTC video rooms and threaded developer chat feeds. Pair program, review code structures, and converse with your team in one unified tab.
          </p>

          <div className="ce-collab-features-list">
            <div className="ce-collab-feature-item">
              <div className="ce-collab-icon-box indigo">
                <Video size={18} />
              </div>
              <div className="ce-collab-feature-text">
                <h3>Low-Latency Video Rooms</h3>
                <p>Host high-definition voice and video calls with peer-to-peer screen sharing support.</p>
              </div>
            </div>

            <div className="ce-collab-feature-item">
              <div className="ce-collab-icon-box emerald">
                <MessageSquare size={18} />
              </div>
              <div className="ce-collab-feature-text">
                <h3>Integrated Workspace Chat</h3>
                <p>Send markdown code logs, share sandboxes, and drop files directly inside your active room.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: 3D Scattered Cards Collage */}
        <div className="ce-collab-collage-panel">
          <div className="ce-collab-scattered-wrapper">
            
            {/* Card 1: Video Participant (Sachin - Active Speaker) */}
            <div className="ce-scattered-card card-video-sachin">
              <div className="ce-scattered-card-inner accent-purple">
                <div className="ce-video-avatar-wrapper">
                  <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80" alt="Sachin" className="ce-video-avatar" />
                  <div className="ce-video-active-ring" />
                </div>
                <div className="ce-video-meta">
                  <span className="ce-video-name">Sachin Kumar</span>
                  <span className="ce-video-role">Developer • Speaking</span>
                </div>
                {/* Animated Audio waves */}
                <div className="ce-audio-visualizer">
                  <span className="ce-audio-bar bar-1" />
                  <span className="ce-audio-bar bar-2" />
                  <span className="ce-audio-bar bar-3" />
                  <span className="ce-audio-bar bar-4" />
                </div>
              </div>
              <div className="ce-card-bottom-lip lip-purple">SPEAKING</div>
            </div>

            {/* Card 2: Video Participant (Aman) */}
            <div className="ce-scattered-card card-video-aman">
              <div className="ce-scattered-card-inner accent-green">
                <div className="ce-video-avatar-wrapper">
                  <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&h=80&q=80" alt="Aman" className="ce-video-avatar" />
                </div>
                <div className="ce-video-meta">
                  <span className="ce-video-name">Aman Sharma</span>
                  <span className="ce-video-role">Docker Specialist</span>
                </div>
                <div className="ce-mic-indicator">
                  <Mic size={14} className="ce-mic-icon-active" />
                </div>
              </div>
              <div className="ce-card-bottom-lip lip-green">ONLINE</div>
            </div>

            {/* Card 3: Video Participant (Katarina - Screenshare) */}
            <div className="ce-scattered-card card-video-katarina">
              <div className="ce-scattered-card-inner accent-blue">
                <div className="ce-video-avatar-wrapper">
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" alt="Katarina" className="ce-video-avatar" />
                </div>
                <div className="ce-video-meta">
                  <span className="ce-video-name">Katarina Chen</span>
                  <span className="ce-video-role">Designer • Sharing Screen</span>
                </div>
                <div className="ce-share-indicator">
                  <Monitor size={14} />
                </div>
              </div>
              <div className="ce-card-bottom-lip lip-blue">SHARING</div>
            </div>

            {/* Card 4: Chat Message (Sarah) */}
            <div className="ce-scattered-card card-chat-sarah">
              <div className="ce-scattered-card-inner accent-orange">
                <div className="ce-chat-header">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80" alt="Sarah" className="ce-chat-avatar" />
                  <div>
                    <span className="ce-chat-name">Sarah Jenkins</span>
                    <span className="ce-chat-time">Just now</span>
                  </div>
                </div>
                <p className="ce-chat-body-text">
                  Hey team! Just pushed the WebRTC spatial audio peak handler. Let's run the tests.
                </p>
              </div>
              <div className="ce-card-bottom-lip lip-orange">NEW MESSAGE</div>
            </div>

            {/* Card 5: In-Chat Code snippet share */}
            <div className="ce-scattered-card card-chat-code">
              <div className="ce-scattered-card-inner accent-yellow">
                <div className="ce-snippet-header">
                  <span className="ce-snippet-title">crdt_sync_test.py</span>
                  <span className="ce-snippet-lang">Python</span>
                </div>
                <pre className="ce-snippet-content">
{`# shared via chat
def verify_latency(ping_ms):
    if ping_ms < 20:
        return "Optimal Connection"
    return "Relayed Engine"`}
                </pre>
              </div>
              <div className="ce-card-bottom-lip lip-yellow">CODE LOG</div>
            </div>

            {/* Card 6: Floating Call Controls Panel */}
            <div className="ce-scattered-card card-call-controls">
              <div className="ce-controls-inner">
                <button 
                  className={`ce-control-btn ${micActive ? "active" : "muted"}`}
                  onClick={() => setMicActive(!micActive)}
                  title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micActive ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button 
                  className={`ce-control-btn ${videoActive ? "active" : "muted"}`}
                  onClick={() => setVideoActive(!videoActive)}
                  title={videoActive ? "Stop Camera" : "Start Camera"}
                >
                  <Video size={16} />
                </button>
                <button 
                  className={`ce-control-btn ${screenSharing ? "active" : ""}`}
                  onClick={() => setScreenSharing(!screenSharing)}
                  title="Share Screen"
                >
                  <Monitor size={16} />
                </button>
                <button className="ce-control-btn hangup" title="Leave Call">
                  <PhoneOff size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
