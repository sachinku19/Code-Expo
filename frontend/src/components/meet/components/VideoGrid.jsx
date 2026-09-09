import React from "react";
import { VideoTile } from "./VideoTile";

/**
 * VideoGrid - Dynamic grid/filmstrip meeting layout manager
 */
export function VideoGrid({
  allMembers,
  remoteStreams,
  localStream,
  pinnedUserId,
  onPinToggle,
  speakingMap,
  localSpeaking
}) {
  const gridCount = allMembers.length;

  // Locate the pinned user
  const pinnedMember = allMembers.find((m) => String(m.userId) === String(pinnedUserId));
  const unpinnedMembers = allMembers.filter((m) => String(m.userId) !== String(pinnedUserId));

  // Determine dynamic grid layout class
  const gridClass = `grid-${Math.min(gridCount, 12)}`;

  if (pinnedMember && unpinnedMembers.length > 0) {
    const isSpeaking = pinnedMember.isLocal ? localSpeaking : speakingMap[pinnedMember.userId];
    const stream = pinnedMember.isLocal ? localStream : remoteStreams[pinnedMember.socketId];

    return (
      <div className="ce-meet-pinned-layout">
        {/* Main Pinned Stage */}
        <div className="ce-meet-pinned-main-stage">
          <VideoTile
            key={pinnedMember.socketId || pinnedMember.userId}
            member={pinnedMember}
            stream={stream}
            isSpeaking={isSpeaking}
            isPinned={true}
            isFilmstrip={false}
            onPinToggle={() => onPinToggle(pinnedMember.userId)}
          />
        </div>

        {/* Filmstrip strip for remaining participants */}
        <div className="ce-meet-filmstrip-panel">
          <div className="ce-meet-filmstrip-header">
            <span>Participants ({unpinnedMembers.length})</span>
          </div>
          {unpinnedMembers.map((m) => {
            const mIsSpeaking = m.isLocal ? localSpeaking : speakingMap[m.userId];
            const mStream = m.isLocal ? localStream : remoteStreams[m.socketId];
            return (
              <VideoTile
                key={m.socketId || m.userId}
                member={m}
                stream={mStream}
                isSpeaking={mIsSpeaking}
                isPinned={false}
                isFilmstrip={true}
                onPinToggle={() => onPinToggle(m.userId)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`ce-meet-grid ${gridClass}`}>
      {allMembers.map((m) => {
        const mIsSpeaking = m.isLocal ? localSpeaking : speakingMap[m.userId];
        const mStream = m.isLocal ? localStream : remoteStreams[m.socketId];
        const isPinned = String(pinnedMember?.userId) === String(m.userId);
        return (
          <VideoTile
            key={m.socketId || m.userId}
            member={m}
            stream={mStream}
            isSpeaking={mIsSpeaking}
            isPinned={isPinned}
            onPinToggle={() => onPinToggle(m.userId)}
          />
        );
      })}
    </div>
  );
}
