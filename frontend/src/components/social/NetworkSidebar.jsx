import { MessageSquare } from "lucide-react";
import "./PremiumFeed.css";

export default function NetworkSidebar({ 
  suggestions = [], 
  onlineFollows = [], 
  followingList = [],
  handleFollowToggle,
  handleViewUserProfile,
  setPreselectedChatPartner,
  navigate 
}) {

  return (
    <aside className="premium-right-sidebar feed-sidebar" style={{ width: "340px", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* CARD 1: ONLINE DEVELOPERS (Crisp Professional Square Box) */}
      <div className="sidebar-card-box" style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "0.9rem", fontWeight: "700", color: "#f4f4f5" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} /> Online Developers
          </h4>
          <span style={{ fontSize: "0.78rem", color: "#a1a1aa" }}>({onlineFollows.length || 0})</span>
        </div>

        <div className="presence-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {onlineFollows.length === 0 ? (
            <p style={{ color: "#a1a1aa", fontSize: "0.8rem", margin: 0 }}>No followed developers online.</p>
          ) : (
            onlineFollows.map(dev => (
              <div key={dev._id || dev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div 
                  onClick={() => handleViewUserProfile(dev._id || dev.id)} 
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", minWidth: 0, flex: 1 }}
                >
                  <div style={{ position: "relative", width: "36px", height: "36px", flexShrink: 0 }}>
                    {dev.avatar ? (
                      <img src={dev.avatar} alt={dev.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700" }}>
                        {(dev.username || "D").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ position: "absolute", bottom: 0, right: 0, width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", border: "1.5px solid #111114" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#f4f4f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{dev.username}</span>
                    <span style={{ fontSize: "0.72rem", color: "#a1a1aa" }}>{dev.title || "Developer"}</span>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setPreselectedChatPartner(dev);
                    if (navigate) navigate("/dashboard/messages");
                  }} 
                  style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "4px" }}
                  title="Direct Message"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={() => navigate ? navigate("/dashboard/messages") : null}
          style={{ width: "100%", marginTop: "16px", padding: "8px 12px", background: "#18181c", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "6px", color: "#f4f4f5", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}
        >
          View All
        </button>
      </div>

      {/* CARD 2: SUGGESTED DEVELOPERS (Crisp Professional Square Box) */}
      <div className="sidebar-card-box" style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "18px 20px" }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "0.9rem", fontWeight: "700", color: "#f4f4f5" }}>Suggested Developers</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {suggestions.length === 0 ? (
            <p style={{ color: "#a1a1aa", fontSize: "0.8rem", margin: 0 }}>No suggestions available.</p>
          ) : (
            suggestions.slice(0, 5).map(s => {
              const devId = String(s._id || s.id);
              const isFollowed = (followingList || []).some(f => String(f._id || f.id || f) === devId) || s.isFollowing === true;
              return (
                <div key={devId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                  <div 
                    onClick={() => handleViewUserProfile(devId)} 
                    style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", minWidth: 0, flex: 1 }}
                  >
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                      {s.avatar ? (
                        <img src={s.avatar} alt={s.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "#6366f1", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700" }}>
                          {(s.username || "D").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#f4f4f5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{s.username}</span>
                      <span style={{ fontSize: "0.72rem", color: "#a1a1aa" }}>{s.title || "Developer"}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFollowToggle(devId)} 
                    style={{
                      background: isFollowed ? "rgba(255, 255, 255, 0.05)" : "#6366f1",
                      border: isFollowed ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                      color: "#ffffff",
                      fontSize: "0.76rem",
                      fontWeight: "600",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <button style={{ width: "100%", marginTop: "16px", padding: "8px 12px", background: "#18181c", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "6px", color: "#f4f4f5", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}>
          View More
        </button>
      </div>

      {/* CARD 3: TRENDING TAGS (Crisp Professional Square Box) */}
      <div className="sidebar-card-box" style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "18px 20px" }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: "0.9rem", fontWeight: "700", color: "#f4f4f5" }}>Trending Tags</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { tag: "#javascript", posts: "12.4K posts" },
            { tag: "#reactjs", posts: "8.7K posts" },
            { tag: "#webdev", posts: "6.1K posts" }
          ].map(t => (
            <div key={t.tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#f4f4f5" }}>{t.tag}</span>
              <span style={{ fontSize: "0.72rem", color: "#a1a1aa" }}>{t.posts}</span>
            </div>
          ))}
        </div>

        <button style={{ width: "100%", marginTop: "16px", padding: "8px 12px", background: "#18181c", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "6px", color: "#f4f4f5", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}>
          View All
        </button>
      </div>

    </aside>
  );
}
