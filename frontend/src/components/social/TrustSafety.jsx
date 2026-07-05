import React, { useState, useEffect } from "react";
import {
  EyeOff, Eye, Trash2, Sparkles, Pin, Search, Filter, ArrowUpDown, AlertCircle, Clock
} from "lucide-react";
import socket from "../../socket/socket";
import { getModerationHistory, getTrustSafetyStatus } from "../../services/trustSafetyService";
import "./TrustSafety.css";

export default function TrustSafety({ user, addToast }) {
  const [history, setHistory] = useState([]);
  const [trustStatus, setTrustStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchStatus = async () => {
    try {
      const res = await getTrustSafetyStatus();
      if (res.success) {
        setTrustStatus(res.status);
      }
    } catch (err) {
      console.error("Failed to load trust safety status in user action page:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getModerationHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error("Failed to load account activity history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchStatus();
  }, []);

  // Real-time update listeners
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchHistory();
      fetchStatus();
    };

    socket.on("admin-user-action", handleUpdate);
    socket.on("admin-post-action", handleUpdate);
    socket.on("admin-story-action", handleUpdate);

    return () => {
      socket.off("admin-user-action", handleUpdate);
      socket.off("admin-post-action", handleUpdate);
      socket.off("admin-story-action", handleUpdate);
    };
  }, [user]);

  // Helper to get action icon and color
  const getActivityMeta = (actionType) => {
    const action = actionType.toLowerCase();
    if (action.includes("hidden")) {
      return {
        icon: <EyeOff size={16} />,
        color: "#f43f5e",
        bg: "rgba(244, 63, 94, 0.08)",
        border: "rgba(244, 63, 94, 0.15)",
        badgeClass: "badge-hidden"
      };
    }
    if (action.includes("restored") || action.includes("reactivated") || action.includes("active")) {
      return {
        icon: <Eye size={16} />,
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.08)",
        border: "rgba(16, 185, 129, 0.15)",
        badgeClass: "badge-active"
      };
    }
    if (action.includes("delete")) {
      return {
        icon: <Trash2 size={16} />,
        color: "#6b7280",
        bg: "rgba(107, 114, 128, 0.08)",
        border: "rgba(107, 114, 128, 0.15)",
        badgeClass: "badge-deleted"
      };
    }
    if (action.includes("feature")) {
      return {
        icon: <Sparkles size={16} />,
        color: "#a855f7",
        bg: "rgba(168, 85, 247, 0.08)",
        border: "rgba(168, 85, 247, 0.15)",
        badgeClass: "badge-featured"
      };
    }
    if (action.includes("pin")) {
      return {
        icon: <Pin size={16} />,
        color: "#6366f1",
        bg: "rgba(99, 102, 241, 0.08)",
        border: "rgba(99, 102, 241, 0.15)",
        badgeClass: "badge-pinned"
      };
    }
    if (action.includes("warning")) {
      return {
        icon: <AlertCircle size={16} />,
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.08)",
        border: "rgba(245, 158, 11, 0.15)",
        badgeClass: "badge-warning"
      };
    }
    if (action.includes("suspend") || action.includes("ban") || action.includes("restrict")) {
      return {
        icon: <AlertCircle size={16} />,
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.15)",
        badgeClass: "badge-ban"
      };
    }
    return {
      icon: <AlertCircle size={16} />,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.08)",
      border: "rgba(245, 158, 11, 0.15)",
      badgeClass: "badge-warning"
    };
  };

  // Filter and Sort history
  const filteredHistory = history
    .filter((item) => {
      // Action type filter
      if (actionFilter !== "all") {
        const type = item.actionType.toLowerCase();
        if (actionFilter === "hidden" && !type.includes("hidden")) return false;
        if (actionFilter === "restored" && !type.includes("restored") && !type.includes("reactivated")) return false;
        if (actionFilter === "deleted" && !type.includes("delete")) return false;
        if (actionFilter === "featured" && !type.includes("feature")) return false;
        if (actionFilter === "pinned" && !type.includes("pin")) return false;
        if (actionFilter === "warnings" && !type.includes("warning") && !type.includes("restrict") && !type.includes("suspend") && !type.includes("ban")) return false;
      }

      // Search query filter (search by content text, title, or reason)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const reason = (item.reason || "").toLowerCase();
        const action = item.actionType.toLowerCase();
        const postText = item.postId?.text ? item.postId.text.toLowerCase() : "";
        const postTitle = item.postId?.title ? item.postId.title.toLowerCase() : "";

        return reason.includes(query) || action.includes(query) || postText.includes(query) || postTitle.includes(query);
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="account-activity-container">
      <div className="activity-header">
        <div className="activity-header-titles">
          <h2>My Account Activity</h2>
          <p>Real-time timeline of administrative actions and status updates on your content.</p>
        </div>
      </div>

      {trustStatus && (
        <div 
          className="ce-trust-safety-cards-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "10px",
            marginBottom: "16px",
            width: "100%"
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Account Status</span>
            <span style={{
              fontSize: "0.78rem",
              fontWeight: "750",
              color: trustStatus.accountStatus === "Active" ? "#10b981" : "#f59e0b"
            }}>{trustStatus.accountStatus}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Active Restrictions</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#f43f5e" }}>{trustStatus.counters?.activeRestrictionsCount || 0}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Open Appeals</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "var(--accent)" }}>{trustStatus.counters?.openAppealsCount || 0}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Open Tickets</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#10b981" }}>{trustStatus.counters?.openSupportTicketsCount || 0}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Total Warnings</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#f59e0b" }}>{trustStatus.totalWarnings || 0}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Removed Posts</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#ef4444" }}>{trustStatus.counters?.removedPostsCount || 0}</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "10px 12px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: "600" }}>Hidden Posts</span>
            <span style={{ fontSize: "0.8rem", fontWeight: "750", color: "#ef4444" }}>{trustStatus.counters?.hiddenPostsCount || 0}</span>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="activity-filter-bar glass-panel">
        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by content, reason, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <div className="select-wrapper">
            <Filter size={12} className="select-icon" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="all">All Actions</option>
              <option value="warnings">Warnings & Standings</option>
              <option value="hidden">Hidden Content</option>
              <option value="restored">Restored Content</option>
              <option value="deleted">Deleted Content</option>
              <option value="featured">Featured Content</option>
              <option value="pinned">Pinned Content</option>
            </select>
          </div>

          <div className="select-wrapper">
            <ArrowUpDown size={12} className="select-icon" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Logs */}
      {loading ? (
        <div className="activity-loading-state">
          {[1, 2, 3].map((n) => (
            <div key={n} className="skeleton-card glass-panel">
              <div className="skeleton-icon"></div>
              <div className="skeleton-content">
                <div className="skeleton-line title"></div>
                <div className="skeleton-line desc"></div>
                <div className="skeleton-line meta"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="activity-empty-state glass-panel animate-fade-in">
          <div className="empty-icon-wrapper">
            <Clock size={40} />
          </div>
          <h3>No recent activity</h3>
          <p>Your account is in perfect standing. No administrative actions have been logged.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {filteredHistory.map((item) => {
            const meta = getActivityMeta(item.actionType);
            const isAccountAction = ["warning issued", "temporary restriction", "suspension", "ban", "account reactivated"].includes(item.actionType.toLowerCase());
            let contentSnippet = "";
            if (isAccountAction) {
              contentSnippet = "Entire Account / Profile";
            } else if (item.postId) {
              contentSnippet = item.postId.title || item.postId.text || "Post Content";
            } else {
              contentSnippet = "Removed or Deleted Content";
            }

            return (
              <div
                key={item._id}
                className="activity-card glass-panel animate-fade-in"
                style={{
                  borderLeft: `4px solid ${meta.color}`,
                  background: `linear-gradient(to right, ${meta.bg}, rgba(255,255,255,0.01))`
                }}
              >
                <div className="activity-card-icon" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                  {meta.icon}
                </div>

                <div className="activity-card-body">
                  <div className="activity-card-header">
                    <span className="activity-action-name">{item.actionType}</span>
                    <span className={`status-badge ${meta.badgeClass}`}>
                      {item.currentStatus || "Executed"}
                    </span>
                  </div>

                  <p className="activity-content-preview">
                    <strong>Content affected:</strong> {contentSnippet.length > 120 ? `${contentSnippet.substring(0, 120)}...` : contentSnippet}
                  </p>

                  {item.postId && (
                    <div style={{ marginTop: "4px", marginBottom: "4px" }}>
                      <a 
                        href={`/dashboard?post=${item.postId._id || item.postId}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: "0.76rem", color: "#60a5fa", textDecoration: "none", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}
                      >
                        <Eye size={12} /> View Affected Post
                      </a>
                    </div>
                  )}

                  {item.reason && (
                    <div className="activity-admin-reason">
                      <span className="reason-label">Reason from Admin:</span>
                      <span className="reason-text">"{item.reason}"</span>
                    </div>
                  )}

                  <div className="activity-card-footer">
                    <span>Logged on: {new Date(item.createdAt).toLocaleString()}</span>
                    <span>Audited by: {item.moderator || "System"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
