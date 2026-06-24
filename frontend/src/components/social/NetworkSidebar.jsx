import { UserPlus, MessageSquare } from "lucide-react";

export default function NetworkSidebar({ 
  suggestions, 
  onlineFollows, 
  handleFollowToggle,
  handleViewUserProfile,
  setPreselectedChatPartner,
  navigate 
}) {

  return (
    <div className="network-sidebar-widgets-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. Online Now Widget */}
      <div className="sidebar-widget-card">
        <div className="widget-header">
          <span className="live-indicator-dot animate-pulse" style={{ background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
          <h4>Online Now ({onlineFollows.length})</h4>
        </div>
        <div className="widget-content">
          {onlineFollows.length === 0 ? (
            <p className="widget-empty-msg">No followed users online.</p>
          ) : (
            <div className="online-users-list">
              {onlineFollows.map(dev => (
                <div key={dev._id || dev.id} className="online-user-item-row">
                  <div 
                    onClick={() => handleViewUserProfile(dev._id || dev.id)} 
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}
                  >
                    {dev.avatar ? (
                      <img src={dev.avatar} alt={dev.username} className="online-mini-avatar" />
                    ) : (
                      <div className="online-mini-avatar-fallback">
                        {dev.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="online-username">@{dev.username}</span>
                      <span className="online-title">{dev.title || "Developer"}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setPreselectedChatPartner(dev);
                      navigate("/dashboard?tab=messages");
                    }} 
                    className="online-chat-btn" 
                    title="Send direct message"
                  >
                    <MessageSquare size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Connection Suggestions Widget */}
      <div className="sidebar-widget-card">
        <div className="widget-header">
          <UserPlus size={14} style={{ color: "#06b6d4" }} />
          <h4>Suggested Developers</h4>
        </div>
        <div className="widget-content">
          {suggestions.length === 0 ? (
            <p className="widget-empty-msg">No suggestions available.</p>
          ) : (
            <div className="suggestions-list-sidebar">
              {suggestions.map(s => (
                <div key={s._id} className="suggestion-sidebar-item">
                  <div 
                    onClick={() => handleViewUserProfile(s._id)} 
                    style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1 }}
                  >
                    {s.avatar ? (
                      <img src={s.avatar} alt={s.username} className="online-mini-avatar" />
                    ) : (
                      <div className="online-mini-avatar-fallback">
                        {s.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="online-username">@{s.username}</span>
                      <span className="online-title" style={{ fontSize: "0.62rem" }}>{s.title || "Developer"}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFollowToggle(s._id)} 
                    className="sidebar-follow-btn"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
