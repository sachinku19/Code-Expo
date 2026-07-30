import React, { useRef, useEffect } from "react";
import { MicOff, Pin, PinOff, Hand } from "lucide-react";

/**
 * VideoTile - Individual participant video/audio tile component
 */
export function VideoTile({ member, stream, isSpeaking, isPinned, onPinToggle }) {
  const videoRef = useRef(null);
  const initial = (member.username || "U").charAt(0).toUpperCase();

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const videoTracks = stream ? stream.getVideoTracks() : [];
  const hasActiveVideoTrack = videoTracks.length > 0 && videoTracks.some((t) => t.enabled && t.readyState === "live");
  const hasVideo = Boolean(member.isVideoOn && hasActiveVideoTrack);

  return (
    <div className={`ce-meet-tile ${isSpeaking ? "speaking" : ""} ${isPinned ? "pinned" : ""}`}>
      {/* Pinned / Unpinned Button */}
      <button
        type="button"
        className={`ce-meet-pin-btn ${isPinned ? "active" : ""}`}
        onClick={onPinToggle}
        title={isPinned ? "Unpin participant" : "Pin participant to main stage"}
      >
        {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
      </button>

      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={member.isLocal} // Always mute local stream playback to prevent feedback echo
        style={{
          display: hasVideo ? "block" : "none",
          width: "100%",
          height: "100%",
          objectFit: "cover"
        }}
      />

      {/* Avatar Fallback */}
      {!hasVideo && (
        <div className="ce-meet-tile-avatar-wrapper">
          {member.avatar ? (
            <img src={member.avatar} alt={member.username} className="ce-meet-tile-avatar-img" />
          ) : (
            <div className="ce-meet-tile-avatar">{initial}</div>
          )}
        </div>
      )}

      {/* Bottom Labels & Indicators */}
      <div className="ce-meet-tile-overlay-details">
        <div className="ce-meet-tile-name-row">
          <span>{member.username}{member.isLocal ? " (You)" : ""}</span>
          {!member.isMicOn && <MicOff size={13} className="ce-meet-mic-off-icon" />}
        </div>
      </div>

      {/* Hand Raised Floating Badge */}
      {member.isHandRaised && (
        <div className="ce-meet-hand-raised-badge" title="Hand raised">
          <Hand size={14} />
        </div>
      )}
    </div>
  );
}
