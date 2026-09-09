import React, { useRef, useLayoutEffect, useCallback } from "react";
import { MicOff, Pin, PinOff, Hand } from "lucide-react";

/**
 * VideoTile - Individual participant video/audio tile component
 */
export function VideoTile({
  member,
  stream,
  isSpeaking,
  isPinned,
  isFilmstrip = false,
  onPinToggle
}) {
  const videoRef = useRef(null);
  const initial = (member?.username || "U").charAt(0).toUpperCase();

  // Synchronously attach stream to video node the moment it attaches to the DOM
  const handleVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && stream) {
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
      node.play().catch(() => {});
    }
  }, [stream]);

  useLayoutEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const videoTracks = stream ? stream.getVideoTracks() : [];
  const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === "live");
  const hasVideo = Boolean(member?.isVideoOn && hasActiveVideoTrack);

  const handleTileClick = () => {
    if (isFilmstrip && onPinToggle) {
      onPinToggle();
    }
  };

  return (
    <div
      className={`ce-meet-tile ${isSpeaking ? "speaking" : ""} ${isPinned ? "pinned" : ""} ${isFilmstrip ? "filmstrip-tile" : ""}`}
      onClick={handleTileClick}
      title={isFilmstrip ? `Click to pin ${member?.username || "user"} to main stage` : undefined}
    >
      {/* Top Left Floating Actions: Pin & Hand Raised */}
      <div className="ce-meet-tile-top-left-actions">
        {/* Hand Raised Floating Badge */}
        {member?.isHandRaised && (
          <div className="ce-meet-hand-raised-badge" title="Hand raised">
            <Hand size={14} />
          </div>
        )}

        {/* Pinned / Unpinned Button (Icon only) */}
        <button
          type="button"
          className={`ce-meet-pin-btn ${isPinned ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onPinToggle) onPinToggle();
          }}
          title={isPinned ? "Unpin participant (restore grid view)" : "Pin to main stage"}
          aria-label={isPinned ? "Unpin participant" : "Pin participant to main stage"}
          aria-pressed={isPinned}
        >
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      </div>

      {/* Video Element */}
      <video
        ref={handleVideoRef}
        autoPlay
        playsInline
        muted={member?.isLocal} // Always mute local stream playback to prevent feedback echo
        style={{
          display: hasVideo ? "block" : "none",
          width: "100%",
          height: "100%",
          objectFit: member?.isScreenSharing ? "contain" : "cover",
          background: "transparent"
        }}
      />

      {/* Avatar Fallback */}
      {!hasVideo && (
        <div className={`ce-meet-tile-avatar-wrapper ${isSpeaking ? "speaking-pulse" : ""}`}>
          {isSpeaking && <div className="ce-avatar-sound-ring" />}
          {member?.avatar ? (
            <img src={member.avatar} alt={member.username} className="ce-meet-tile-avatar-img" />
          ) : (
            <div className="ce-meet-tile-avatar">{initial}</div>
          )}
        </div>
      )}

      {/* Bottom Labels & Indicators */}
      <div className="ce-meet-tile-overlay-details">
        <div className={`ce-meet-tile-name-row ${isSpeaking ? "speaking-active" : ""}`}>
          {member?.isHandRaised && (
            <span className="ce-name-hand-icon" title="Hand raised">✋</span>
          )}
          <span>{member?.username}{member?.isLocal ? " (You)" : ""}</span>
          {!member?.isMicOn && <MicOff size={13} className="ce-meet-mic-off-icon" />}

          {/* Sound / Speaking Wave Indicator (like Google Meet) */}
          {member?.isMicOn && isSpeaking && (
            <div className="ce-audio-wave-bars" title="Speaking">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
