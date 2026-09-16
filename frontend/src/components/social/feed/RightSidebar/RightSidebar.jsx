import React, { useState } from "react";
import { Flame, UserPlus, UserCheck, MessageSquare, ChevronRight } from "lucide-react";
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
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
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

const DEFAULT_TRENDING_TAGS = [
  "#react",
  "#javascript",
  "#webdev",
  "#fullstack",
  "#ai",
  "#python",
  "#nodejs",
  "#nextjs",
  "#typescript",
  "#css",
  "#tailwindcss",
  "#mongodb",
  "#graphql",
  "#docker",
  "#devops",
  "#cloud"
];

export const RightSidebar = ({
  onlineUsers = [],
  suggestedUsers = [],
  followingList = [],
  trendingTags = DEFAULT_TRENDING_TAGS,
  onFollowToggle,
  onUserClick,
  onMessageUser,
  onSelectTag
}) => {
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  // Suggested users list strictly from real database props
  const realSuggested = Array.isArray(suggestedUsers) ? suggestedUsers : [];
  const visibleSuggested = showAllSuggested ? realSuggested : realSuggested.slice(0, 3);

  // Tags list
  const allTags = Array.isArray(trendingTags) && trendingTags.length > 0 ? trendingTags : DEFAULT_TRENDING_TAGS;
  const visibleTags = showAllTags ? allTags : allTags.slice(0, 6);

  // Online users list
  const realOnline = Array.isArray(onlineUsers) ? onlineUsers : [];
  const visibleOnline = showAllOnline ? realOnline : realOnline.slice(0, 4);

  return (
    <aside className="rebuilt-right-column">
      {/* Online Developers Card */}
      <div className="feed-premium-card">
        <div
          className="right-card-title"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", cursor: realOnline.length > 4 ? "pointer" : "default" }}
          onClick={() => realOnline.length > 4 && setShowAllOnline(!showAllOnline)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "10px", height: "10px" }}>
              <span style={{ position: "absolute", width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#10b981" }} />
              <span style={{ position: "absolute", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.35)", animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
            </span>
            <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)" }}>
              Online Developers ({realOnline.length})
            </span>
          </div>
          {realOnline.length > 4 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllOnline(!showAllOnline);
              }}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.78rem",
                fontWeight: "600",
                color: "#f59e0b",
                cursor: "pointer"
              }}
            >
              {showAllOnline ? "Show less" : "View all"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: showAllOnline ? "320px" : "none", overflowY: showAllOnline ? "auto" : "visible" }}>
          {visibleOnline.map((u, i) => {
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
                  borderRadius: "8px",
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
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "#94a3b8"
                  }}
                >
                  <MessageSquare size={13} />
                </button>
              </div>
            );
          })}
          {realOnline.length === 0 && (
            <div style={{ fontSize: "0.82rem", color: "#64748b", padding: "4px 0" }}>
              No developers online right now
            </div>
          )}
        </div>
      </div>

      {/* Suggested Developers Card */}
      <div className="feed-premium-card">
        <div className="right-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)" }}>
            Suggested Developers
          </span>
          {realSuggested.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllSuggested(!showAllSuggested)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.78rem",
                fontWeight: "600",
                color: "#f59e0b",
                cursor: "pointer",
                transition: "opacity 0.15s ease"
              }}
            >
              {showAllSuggested ? "Show less" : "View all"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: showAllSuggested ? "360px" : "none", overflowY: showAllSuggested ? "auto" : "visible" }}>
          {visibleSuggested.map((u, i) => {
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
                    <span style={{ fontSize: "0.84rem", fontWeight: "700", color: "var(--feed-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      @{u.username || "dev"}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      color: "#94a3b8"
                    }}
                  >
                    <MessageSquare size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onFollowToggle && onFollowToggle(uId)}
                    style={{
                      background: isFollowing ? "rgba(255, 255, 255, 0.06)" : "#f59e0b",
                      border: isFollowing ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
                      borderRadius: "6px",
                      color: isFollowing ? "#ffffff" : "#0a0c10",
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.15s ease",
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
          {visibleSuggested.length === 0 && (
            <div style={{ fontSize: "0.82rem", color: "#64748b" }}>No suggested developers right now</div>
          )}
        </div>
      </div>

      {/* Trending Tags Card */}
      <div className="feed-premium-card">
        <div className="right-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Flame size={15} color="#f59e0b" />
            <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--feed-text)" }}>Trending Tags</span>
          </div>
          {allTags.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllTags(!showAllTags)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "0.78rem",
                fontWeight: "600",
                color: "#f59e0b",
                cursor: "pointer",
                transition: "opacity 0.15s ease"
              }}
            >
              {showAllTags ? "Show less" : "View all"}
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {Array.isArray(visibleTags) && visibleTags.map((tag, i) => {
            const tagStr = typeof tag === "object" && tag !== null ? (tag.name || tag.tag || "") : String(tag || "");
            if (!tagStr) return null;
            const displayTag = tagStr.startsWith("#") ? tagStr : `#${tagStr}`;
            return (
              <span
                key={i}
                className="tag-chip"
                onClick={() => onSelectTag && onSelectTag(tagStr)}
                style={{
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#cbd5e1",
                  transition: "all 0.2s ease"
                }}
              >
                {displayTag}
              </span>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(RightSidebar);
