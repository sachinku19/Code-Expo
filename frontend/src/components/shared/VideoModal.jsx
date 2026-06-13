import { useEffect, useRef } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import "./VideoModal.css";

function VideoModal({ isOpen, onClose, videoSrc }) {
  const videoRef = useRef(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = ""; // Re-enable background scrolling
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("video-modal-overlay")) {
      onClose();
    }
  };

  return (
    <div className="video-modal-overlay" onClick={handleBackdropClick}>
      <div className="video-modal-container">
        {/* Glow Effects */}
        <div className="video-modal-glow-cyan"></div>
        <div className="video-modal-glow-purple"></div>

        {/* Header bar (Mac-like window style) */}
        <div className="video-modal-header">
          <div className="window-dots">
            <span className="window-dot red-dot" onClick={onClose}></span>
            <span className="window-dot yellow-dot"></span>
            <span className="window-dot green-dot"></span>
          </div>
          <span className="video-modal-title">CodeExpo Interactive Demo</span>
          <button className="video-modal-close-btn" onClick={onClose} aria-label="Close Demo Video">
            <X size={20} />
          </button>
        </div>

        {/* Video Player wrapper */}
        <div className="video-modal-content">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            controls
            playsInline
            className="video-element"
            aria-label="CodeExpo demo video"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}

export default VideoModal;
