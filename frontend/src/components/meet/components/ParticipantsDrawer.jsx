import React, { useState } from "react";
import { Mic, MicOff, Video, VideoOff, Search, X, Hand } from "lucide-react";

/**
 * ParticipantsDrawer - Sidebar list panel tracking participant roster & media states
 */
export function ParticipantsDrawer({ participants, onClose }) {
  const [search, setSearch] = useState("");

  const filtered = participants.filter((p) =>
    (p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="ce-meet-drawer">
      <div className="ce-meet-drawer-header">
        <h3>Participants ({participants.length})</h3>
        <button type="button" className="ce-meet-drawer-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="ce-meet-drawer-search">
        <Search size={14} className="ce-meet-search-icon" />
        <input
          type="text"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ce-meet-drawer-list">
        {filtered.map((p) => {
          const initial = (p.username || "U").charAt(0).toUpperCase();
          return (
            <div key={p.socketId || p.userId} className="ce-meet-drawer-item">
              <div className="ce-meet-drawer-item-left">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.username} className="ce-meet-drawer-avatar" />
                ) : (
                  <div className="ce-meet-drawer-avatar-fallback">{initial}</div>
                )}
                <div className="ce-meet-drawer-info">
                  <span className="ce-meet-drawer-name">
                    {p.username}
                  </span>
                  {p.isHandRaised && (
                    <span className="ce-meet-drawer-badge-hand">
                      <Hand size={10} style={{ marginRight: "2px" }} /> Raised
                    </span>
                  )}
                </div>
              </div>

              <div className="ce-meet-drawer-item-right">
                {p.isMicOn ? (
                  <Mic size={15} className="ce-meet-status-on" />
                ) : (
                  <MicOff size={15} className="ce-meet-status-off" />
                )}
                {p.isVideoOn ? (
                  <Video size={15} className="ce-meet-status-on" />
                ) : (
                  <VideoOff size={15} className="ce-meet-status-off" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
