import { User, Bookmark, Flame, Zap, Compass, FolderKanban, MessageSquare, Bell, Star } from "lucide-react";
import "./PremiumFeed.css";

export default function LeftSidebar({ user, activeSection, setActiveTab, setTab }) {
  // Safe stats
  const reputation = user?.executionsCount || 0;
  const devLvl = Math.floor(reputation / 100) + 1;
  const streak = user?.contributionScore || 5;

  return (
    <div className="premium-left-sidebar">
      {/* 1. Profile Mini Widget */}
      <div className="premium-glass-card premium-profile-card">
        <div className="premium-profile-cover" />
        <div className="premium-profile-content">
          <div className="premium-profile-avatar-container">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} />
            ) : (
              <div className="story-avatar-fallback" style={{ fontSize: "1.8rem" }}>
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h3 className="premium-profile-name">@{user?.username || "developer"}</h3>
          <p className="premium-profile-username">{user?.title || "Full Stack Developer"}</p>
          
          <div className="streak-container">
            <Flame size={14} fill="#f87171" />
            <span>🔥 {streak} Day Coding Streak</span>
          </div>

          <div className="premium-stats-grid">
            <div className="premium-stat-item">
              <span className="premium-stat-val">{devLvl}</span>
              <span className="premium-stat-label">Level</span>
            </div>
            <div className="premium-stat-item">
              <span className="premium-stat-val purple">{reputation}</span>
              <span className="premium-stat-label">Rep XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Actions widget */}
      <div className="premium-glass-card">
        <h4 className="sidebar-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Compass size={14} style={{ color: "#3b82f6" }} /> Navigator
        </h4>
        <div className="premium-nav-list">
          <button 
            onClick={() => setTab("explore")}
            className="premium-nav-item"
          >
            <div className="premium-nav-item-left">
              <Compass size={16} />
              <span>Explore Rooms</span>
            </div>
          </button>

          <button 
            onClick={() => setTab("bookmarks")}
            className="premium-nav-item"
          >
            <div className="premium-nav-item-left">
              <Bookmark size={16} />
              <span>Bookmarks</span>
            </div>
          </button>

          <button 
            onClick={() => setTab("messages")}
            className="premium-nav-item"
          >
            <div className="premium-nav-item-left">
              <MessageSquare size={16} />
              <span>Direct Messages</span>
            </div>
            <span className="premium-badge">New</span>
          </button>
        </div>
      </div>

      {/* 3. Trending Repositories */}
      <div className="premium-glass-card">
        <h4 className="sidebar-section-title" style={{ color: "#06b6d4", display: "flex", alignItems: "center", gap: "8px" }}>
          <Star size={14} /> Trending Repos
        </h4>
        <div className="trends-list">
          {[
            { repo: "vitejs/vite", desc: "Next gen frontend tooling", stars: "38.2k" },
            { repo: "facebook/react", desc: "Library for user interfaces", stars: "220k" },
            { repo: "codeexpo/editor", desc: "Collaborative sandbox module", stars: "4.8k" }
          ].map(r => (
            <div 
              key={r.repo} 
              className="trend-item"
              onClick={() => window.open(`https://github.com/${r.repo}`, "_blank")}
            >
              <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#60a5fa" }}>{r.repo}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>{r.desc}</span>
              <span style={{ fontSize: "0.68rem", color: "#fbbf24", marginTop: "2px" }}>⭐ {r.stars}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
