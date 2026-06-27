import { UserPlus, MessageSquare } from "lucide-react";
import "./PremiumFeed.css";

export default function NetworkSidebar({ 
  suggestions, 
  onlineFollows, 
  handleFollowToggle,
  handleViewUserProfile,
  setPreselectedChatPartner,
  navigate 
}) {

  return (
    <div className="premium-right-sidebar">
      
      {/* 1. Real-time Presence list */}
      <div className="premium-glass-card">
        <h4 className="sidebar-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="post-dot-online" /> Online Developers ({onlineFollows.length})
        </h4>
        <div className="presence-list">
          {onlineFollows.length === 0 ? (
            <p style={{ color: "var(--ce-premium-muted)", fontSize: "0.78rem", margin: 0 }}>No followed developers online.</p>
          ) : (
            onlineFollows.map(dev => (
              <div key={dev._id || dev.id} className="presence-item">
                <div 
                  onClick={() => handleViewUserProfile(dev._id || dev.id)} 
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                >
                  <div className="presence-avatar-wrapper">
                    {dev.avatar ? (
                      <img src={dev.avatar} alt={dev.username} className="presence-avatar" />
                    ) : (
                      <div className="presence-avatar-fallback">
                        {dev.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="presence-dot online" />
                  </div>
                  <div className="presence-name-col">
                    <span className="presence-username">@{dev.username}</span>
                    <span className="presence-activity-text">
                      {dev.status === "Coding" ? "💻 Coding Live" : "🟢 Available"}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setPreselectedChatPartner(dev);
                    navigate("/dashboard?tab=messages");
                  }} 
                  className="presence-action-btn"
                  title="Direct Message"
                >
                  <MessageSquare size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Suggested Connections widget */}
      <div className="premium-glass-card">
        <h4 className="sidebar-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserPlus size={14} style={{ color: "#06b6d4" }} /> Suggested Developers
        </h4>
        <div className="suggestions-list">
          {suggestions.length === 0 ? (
            <p style={{ color: "var(--ce-premium-muted)", fontSize: "0.78rem", margin: 0 }}>No suggestions available.</p>
          ) : (
            suggestions.slice(0, 8).map(s => (
              <div key={s._id} className="suggestion-item">
                <div 
                  onClick={() => handleViewUserProfile(s._id)} 
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                >
                  {s.avatar ? (
                    <img src={s.avatar} alt={s.username} className="presence-avatar" />
                  ) : (
                    <div className="presence-avatar-fallback">
                      {s.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="suggestion-name-col">
                    <span className="suggestion-username">@{s.username}</span>
                    <span className="suggestion-mutuals" style={{ fontSize: "0.65rem" }}>
                      Lvl {s.developerLevel || 1} &bull; {s.title || "Developer"}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => handleFollowToggle(s._id)} 
                  className="suggestion-follow-btn"
                >
                  Follow
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
