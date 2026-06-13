import { useState, useRef } from "react";
import { Play, Volume2, VolumeX, Maximize } from "lucide-react";
import "./VideoShowcase.css";

function VideoShowcase({ onWatchDemo, videoSrc }) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const toggleMute = (e) => {
    e.stopPropagation(); // Avoid triggering open modal
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <section className="video-showcase-section">
      <div className="showcase-content">
        <div className="showcase-badge">PLATFORM WALKTHROUGH</div>
        <h2>See CodeExpo In Action</h2>
        <p className="showcase-desc">
          Watch how easy it is to spin up collaborative code rooms, compile projects inside secure Docker sandboxes, and level up your developer ranking.
        </p>
      </div>

      <div className="browser-mockup-wrapper" onClick={onWatchDemo}>
        {/* Ambient Glows */}
        <div className="mockup-bg-glow glow-1"></div>
        <div className="mockup-bg-glow glow-2"></div>

        {/* Mac OS Browser Mockup Frame */}
        <div className="browser-mockup-header">
          <div className="browser-controls">
            <span className="dot-btn red"></span>
            <span className="dot-btn yellow"></span>
            <span className="dot-btn green"></span>
          </div>
          <div className="browser-address-bar">
            <span>https://codeexpo.dev/demo-tour</span>
          </div>
          <div className="browser-actions-placeholder"></div>
        </div>

        {/* Browser Mockup Body (Video Container) */}
        <div className="browser-mockup-body">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="mockup-video"
          >
            Your browser does not support the video tag.
          </video>

          {/* Mute toggle button inside mockup */}
          <button
            className="video-action-pill mute-btn"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Maximize/Open button */}
          <button
            className="video-action-pill expand-btn"
            onClick={onWatchDemo}
            aria-label="Open Fullscreen Player"
            title="Full Screen"
          >
            <Maximize size={15} />
          </button>

          {/* Floating interactive hover play button */}
          <div className="video-overlay-backdrop">
            <div className="play-button-ring">
              <div className="play-button-core">
                <Play size={24} fill="white" className="play-icon" />
              </div>
            </div>
            <span className="play-overlay-text">Watch Full Demo</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VideoShowcase;
