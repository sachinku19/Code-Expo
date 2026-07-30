import React from "react";
import { Mic, MicOff, Video, VideoOff, Monitor, Hand, Users, PhoneOff } from "lucide-react";

/**
 * MeetingToolbar - Control panel for toggling audio, video, screen share, and leaving
 */
export function MeetingToolbar({
  isMicOn,
  isVideoOn,
  isScreenSharing,
  isHandRaised,
  showParticipants,
  participantCount,
  onMicToggle,
  onCameraToggle,
  onScreenShareToggle,
  onHandToggle,
  onParticipantsToggle,
  onLeaveMeeting
}) {
  return (
    <div className="ce-meet-toolbar">
      {/* Mic Action */}
      <button
        type="button"
        className={`ce-meet-btn ${isMicOn ? "active" : "muted"}`}
        onClick={onMicToggle}
        title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
      >
        {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      {/* Camera Action */}
      <button
        type="button"
        className={`ce-meet-btn ${isVideoOn ? "active" : "muted"}`}
        onClick={onCameraToggle}
        title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
      >
        {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>

      {/* Screen Share Action */}
      <button
        type="button"
        className={`ce-meet-btn ${isScreenSharing ? "active-screen" : ""}`}
        onClick={onScreenShareToggle}
        title={isScreenSharing ? "Stop Presenting" : "Present Screen"}
      >
        <Monitor size={18} />
      </button>

      {/* Hand Raise Action */}
      <button
        type="button"
        className={`ce-meet-btn ${isHandRaised ? "active-hand" : ""}`}
        onClick={onHandToggle}
        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
      >
        <Hand size={18} />
      </button>

      {/* Participants Toggle Action */}
      <button
        type="button"
        className={`ce-meet-btn ${showParticipants ? "active-info" : ""}`}
        onClick={onParticipantsToggle}
        title="View Room Participants"
      >
        <Users size={18} />
        {participantCount > 0 && <span className="ce-meet-btn-badge">{participantCount}</span>}
      </button>

      {/* Leave Meeting Action */}
      <button
        type="button"
        className="ce-meet-btn hangup"
        onClick={onLeaveMeeting}
        title="Leave Meeting Room"
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
}
