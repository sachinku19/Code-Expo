import React, { useState } from "react";
import { Flame, UserPlus, UserCheck, MessageSquare } from "lucide-react";
import { optimizeCloudinaryUrl } from "../../../../utils/imageOptimizer";

const SafeAvatar = ({ src, name = "Dev", size = 32 }) => {
  const [error, setError] = useState(false);
  const initial = (name || "D").trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden"
      }}
    >
      {src && !error ? (
        <img
          src={optimizeCloudinaryUrl(src, { quality: "best", width: size * 2, height: size * 2, crop: "fill" })}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setError(true)}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #7C5CFF, #8b5cf6)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: `${size * 0.4}px`
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export const RightSidebar = ({
  onlineUsers = [],
  suggestedUsers = [],
  followingList = [],
  trendingTags = ["#react", "#javascript", "#webdev", "#fullstack", "#ai"],
  onFollowToggle,
  onUserClick,
  onMessageUser,
  onSelectTag
}) => {
  return (
    <aside className="rebuilt-right-column">
      {/* Online Developers Card */}
      <div className="feed-premium-card">
        <div className="right-card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "10px", height: "10px" }}>
            <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span style={{ position: "absolute", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.35)", animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
          </span>
          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)" }}>Online Developers ({onlineUsers.length})</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {onlineUsers.slice(0, 5).map((u, i) => {
            const uId = u._id || u.id;
            return (
              <div
                key={uId || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "6px 8px",
                  borderRadius: "10px",
                  transition: "background 0.2s ease"
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1, minWidth: 0, overflow: "hidden" }}
                  onClick={() => onUserClick && onUserClick(uId)}
                >
                  <SafeAvatar src={u.avatar} name={u.username} size={32} />
                  <div style={{ fontSize: "0.84rem", fontWeight: "600", color: "var(--feed-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    @{u.username || "dev"}
                  </div>
                </div>

                <button
                  type="button"
                  title="Send Direct Message"
                  onClick={() => onMessageUser && onMessageUser(uId)}
                  className="post-action-btn"
                  style={{
                    width: "30px",
                    height: "30px",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    borderRadius: "8px"
                  }}
                >
                  <MessageSquare size={13} />
                </button>
              </div>
            );
          })}
          {onlineUsers.length === 0 && (
            <div style={{ fontSize: "0.82rem", color: "var(--feed-text-secondary)" }}>No developers online right now</div>
          )}
        </div>
      </div>

      {/* Suggested Developers Card */}
      <div className="feed-premium-card">
        <div className="right-card-title" style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)", marginBottom: "14px" }}>
          Suggested Developers
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {suggestedUsers.slice(0, 5).map((u, i) => {
            const uId = u._id || u.id;
            const isFollowing = followingList.some(f => String(f._id || f) === String(uId));

            return (
              <div
                key={uId || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "4px 0"
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1, minWidth: 0, overflow: "hidden" }}
                  onClick={() => onUserClick && onUserClick(uId)}
                >
                  <SafeAvatar src={u.avatar} name={u.username} size={34} />
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "var(--feed-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      @{u.username || "dev"}
                    </span>
                    <span style={{ fontSize: "0.74rem", color: "var(--feed-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.role || u.title || "Developer"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                  <button
                    type="button"
                    title="Send Direct Message"
                    onClick={() => onMessageUser && onMessageUser(uId)}
                    className="post-action-btn"
                    style={{
                      width: "30px",
                      height: "30px",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      borderRadius: "8px"
                    }}
                  >
                    <MessageSquare size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onFollowToggle && onFollowToggle(uId)}
                    style={{
                      background: isFollowing ? "rgba(99, 102, 241, 0.12)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      border: isFollowing ? "1px solid rgba(99, 102, 241, 0.25)" : "none",
                      borderRadius: "8px",
                      color: isFollowing ? "#6366f1" : "#ffffff",
                      padding: "6px 12px",
                      fontSize: "0.76rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: isFollowing ? "none" : "0 3px 10px rgba(99,102,241,0.3)",
                      transition: "all 0.2s ease",
                      flexShrink: 0
                    }}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={12} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={12} /> Follow
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {suggestedUsers.length === 0 && (
            <div style={{ fontSize: "0.82rem", color: "var(--feed-text-secondary)" }}>No suggested developers right now</div>
          )}
        </div>
      </div>

      {/* Trending Tags Card */}
      <div className="feed-premium-card">
        <div className="right-card-title" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px" }}>
          <Flame size={15} color="#f59e0b" />
          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)" }}>Trending Tags</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {trendingTags.map((tag, i) => (
            <span
              key={i}
              className="tag-chip"
              onClick={() => onSelectTag && onSelectTag(tag)}
              style={{
                borderRadius: "10px",
                padding: "6px 12px",
                fontSize: "0.78rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(RightSidebar);
