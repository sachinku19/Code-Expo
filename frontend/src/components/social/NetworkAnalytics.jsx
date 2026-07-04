import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Eye, Clock, Award, ShieldCheck, Globe, MapPin, Activity, Heart, MessageSquare, BarChart3, Star } from "lucide-react";
import { getNetworkAnalytics, getPosts } from "../../services/socialService";
import { useTheme } from "../../context/ThemeContext";
import socket from "../../socket/socket";

const INDIA_STATES = [
  { name: "J&K", d: "M 195,15 L 210,32 L 202,72 L 175,72 L 182,45 Z", labelX: 192, labelY: 42 },
  { name: "Rajasthan", d: "M 158,82 L 175,72 L 185,92 L 160,95 Z", labelX: 172, labelY: 86 },
  { name: "Gujarat", d: "M 138,122 L 142,108 L 160,95 L 160,112 L 152,125 Z", labelX: 147, labelY: 114 },
  { name: "Maharashtra", d: "M 152,125 L 160,112 L 175,130 L 182,145 L 168,145 Z", labelX: 168, labelY: 132 },
  { name: "Karnataka", d: "M 168,145 L 182,145 L 180,175 L 164,170 Z", labelX: 172, labelY: 160 },
  { name: "Kerala", d: "M 180,175 L 182,195 L 192,192 Z", labelX: 184, labelY: 186 },
  { name: "Tamil Nadu", d: "M 182,195 L 220,205 L 208,178 L 180,175 Z", labelX: 202, labelY: 190 },
  { name: "Andhra & TG", d: "M 180,175 L 208,178 L 212,145 L 182,145 Z", labelX: 198, labelY: 156 },
  { name: "Madhya Pradesh", d: "M 160,95 L 185,92 L 220,115 L 175,130 Z", labelX: 188, labelY: 112 },
  { name: "Uttar Pradesh", d: "M 175,72 L 198,45 L 225,92 L 185,92 Z", labelX: 204, labelY: 76 },
  { name: "West Bengal", d: "M 225,92 L 255,94 L 268,114 L 240,115 Z", labelX: 244, labelY: 104 },
  { name: "North East", d: "M 255,94 L 285,102 L 310,100 L 320,112 L 272,132 L 260,122 Z", labelX: 288, labelY: 112 }
];

export default function NetworkAnalytics({ addToast, user }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const { resolvedTheme } = useTheme();

  // User posts for individual impressions tracking
  const [userPosts, setUserPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [loadingPosts, setLoadingPosts] = useState(true);



  // 1. Fetch general network analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getNetworkAnalytics();
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // 2. Fetch logged-in user's own posts for individual impression reports
  useEffect(() => {
    const fetchUserPosts = async () => {
      const authorId = user?._id || user?.id;
      if (!authorId) {
        setLoadingPosts(false);
        return;
      }
      try {
        setLoadingPosts(true);
        const res = await getPosts(1, 30, authorId);
        if (res.success && res.posts) {
          setUserPosts(res.posts);
          if (res.posts.length > 0) {
            setSelectedPostId(res.posts[0]._id);
          }
        }
      } catch (err) {
        console.error("Error fetching user posts:", err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchUserPosts();
  }, [user]);



  if (loading) {
    return <div className="analytics-loading">Generating analytics reports...</div>;
  }

  const { followersGrowth = [], profileViews = [], stats = {} } = data || {};

  // Calculate SVG coordinates for Followers Growth Area Chart
  const maxFollowers = Math.max(...followersGrowth.map(f => f.count), 5);
  const followerPoints = followersGrowth.map((f, i) => {
    const x = 60 + i * 58; 
    const y = 170 - (f.count / maxFollowers) * 130;
    return { x, y, label: f.month, count: f.count };
  });

  const followerStrokePath = followerPoints.length > 0 
    ? `M ${followerPoints.map(p => `${p.x} ${p.y}`).join(" L ")}`
    : "";

  const followerAreaPath = followerPoints.length > 0
    ? `${followerStrokePath} L ${followerPoints[followerPoints.length - 1].x} 170 L ${followerPoints[0].x} 170 Z`
    : "";

  // Calculate SVG coordinates for Profile Views Bar Chart
  const maxViews = Math.max(...profileViews.map(v => v.count), 5);
  const viewBars = profileViews.map((v, i) => {
    const x = 55 + i * 48; 
    const height = (v.count / maxViews) * 135;
    const y = 170 - height;
    return { x, y, width: 20, height: Math.max(height, 3), label: v.day, count: v.count };
  });



  // Selected Post detail data calculation
  const selectedPost = userPosts.find(p => p._id === selectedPostId);
  const likesCount = selectedPost?.likes?.length || 0;
  const commentsCount = selectedPost?.comments?.length || 0;
  const viewsCount = selectedPost?.viewsCount || 0;
  
  // Engagement percentage = (likes + comments) / views
  const engagementPercentage = viewsCount > 0 
    ? (((likesCount + commentsCount) / viewsCount) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="network-analytics-dashboard">
      
      {/* Overview Stat Cards */}
      <div className="analytics-grid-stats">
        <div className="compact-stat-card">
          <div className="stat-card-icon-wrapper purple-theme-wrapper">
            <Users size={16} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Profile Impressions</span>
            <span className="stat-card-val">{stats.totalViews || 0}</span>
            <span className="stat-card-sub text-green-500">{stats.weeklyEngagement || "+0%"} this week</span>
          </div>
        </div>

        <div className="compact-stat-card">
          <div className="stat-card-icon-wrapper blue-theme-wrapper">
            <Clock size={16} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Room Coding Time</span>
            <span className="stat-card-val">{stats.roomHours || 0} hrs</span>
            <span className="stat-card-sub">Active coding sessions</span>
          </div>
        </div>

        <div className="compact-stat-card">
          <div className="stat-card-icon-wrapper green-theme-wrapper">
            <Award size={16} />
          </div>
          <div className="stat-card-info">
            <span className="stat-card-label">Developer Rating</span>
            <span className="stat-card-val">{stats.developerRating || "Bronze Tier"}</span>
            <span className="stat-card-sub">Based on reputation points</span>
          </div>
        </div>
      </div>
 
      {/* SVG Charts Area */}
      <div className="charts-double-row">
        
        {/* 1. Followers Growth Area Chart */}
        <div className="chart-card-wrapper">
          <div className="chart-header-row">
            <Users size={14} style={{ color: "var(--ce-primary)" }} />
            <h5>Follower Trajectory</h5>
          </div>
          <div className="svg-container">
            <svg viewBox="0 0 400 200" className="analytics-svg-chart">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ce-primary)" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="var(--ce-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grids */}
              <line x1="40" y1="20" x2="380" y2="20" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="70" x2="380" y2="70" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="120" x2="380" y2="120" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="170" x2="380" y2="170" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"} />

              {/* Area Path */}
              {followerAreaPath && (
                <path d={followerAreaPath} fill="url(#areaGrad)" />
              )}
              {/* Stroke Path */}
              {followerStrokePath && (
                <path
                  d={followerStrokePath}
                  fill="none"
                  stroke="var(--ce-primary)"
                  strokeWidth="3"
                  className="animated-chart-stroke"
                />
              )}

              {/* Dots & Counts */}
              {followerPoints.map((p, idx) => (
                <g key={idx}>
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={idx === followerPoints.length - 1 ? 5 : 4} 
                    fill={idx === followerPoints.length - 1 ? "#fff" : "var(--ce-primary)"} 
                    stroke={idx === followerPoints.length - 1 ? "var(--ce-primary)" : "none"}
                    strokeWidth={idx === followerPoints.length - 1 ? 2 : 0}
                  />
                  <text 
                    x={p.x} 
                    y={p.y - 8} 
                    fill="var(--ce-text-h)" 
                    fontSize="8" 
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {p.count}
                  </text>
                  <text 
                    x={p.x} 
                    y="190" 
                    fill="var(--ce-text-muted)" 
                    fontSize="10" 
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* 2. Profile Views Bar Chart */}
        <div className="chart-card-wrapper">
          <div className="chart-header-row">
            <Eye size={14} style={{ color: "#06b6d4" }} />
            <h5>Profile Impressions (Daily)</h5>
          </div>
          <div className="svg-container">
            <svg viewBox="0 0 400 200" className="analytics-svg-chart">
              {/* Grids */}
              <line x1="40" y1="20" x2="380" y2="20" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="70" x2="380" y2="70" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="120" x2="380" y2="120" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)"} />
              <line x1="40" y1="170" x2="380" y2="170" stroke={resolvedTheme === "light" ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"} />

              {/* Bars */}
              {viewBars.map((b, idx) => {
                const colors = ["#6366f1", "#06b6d4", "#8b5cf6"];
                const barColor = colors[idx % colors.length];
                return (
                  <g key={idx}>
                    <rect 
                      x={b.x} 
                      y={b.y} 
                      width={b.width} 
                      height={b.height} 
                      rx="3" 
                      fill={barColor} 
                      opacity="0.85" 
                    />
                    <text 
                      x={b.x + b.width / 2} 
                      y={b.y - 6} 
                      fill="var(--ce-text-h)" 
                      fontSize="8" 
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {b.count}
                    </text>
                    <text 
                      x={b.x + b.width / 2} 
                      y="190" 
                      fill="var(--ce-text-muted)" 
                      fontSize="10" 
                      textAnchor="middle"
                    >
                      {b.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

      </div>

      {loadingPosts && (
        <div className="chart-card-wrapper" style={{ marginTop: "12px", width: "100%", padding: "30px", textAlign: "center", color: "var(--ce-text-muted)" }}>
          <div className="loading-spinner-small" style={{ margin: "0 auto 10px auto" }} />
          <span>Retrieving post performance analytics...</span>
        </div>
      )}

      {!loadingPosts && userPosts.length > 0 && (
        <>
          {/* Individual Post Impressions Section */}
          <div className="chart-card-wrapper" style={{ marginTop: "12px", width: "100%" }}>
            <div className="chart-header-row">
              <BarChart3 size={16} style={{ color: "var(--ce-primary)" }} />
              <h5 style={{ fontWeight: "800", textTransform: "uppercase" }}>Individual Post Performance</h5>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
              
              {/* Post Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.7rem", fontWeight: "700", color: "var(--ce-text-muted)", textTransform: "uppercase" }}>Select Post to Analyze</label>
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: resolvedTheme === "light" ? "#ffffff" : "#1a1a24",
                    border: "1px solid var(--ce-border)",
                    color: "var(--ce-text)",
                    fontSize: "0.82rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {userPosts.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.text.length > 70 ? `${p.text.substring(0, 70)}...` : p.text} ({new Date(p.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Individual Post Stats Card */}
              {selectedPost && (
                <div 
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1.2fr 1fr", 
                    gap: "20px", 
                    padding: "16px", 
                    background: resolvedTheme === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", 
                    border: "1px solid var(--ce-border)", 
                    borderRadius: "10px" 
                  }}
                >
                  {/* Left Card: Post Preview & Engagement Rate */}
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                        <Star size={12} style={{ color: "var(--ce-accent)" }} />
                        <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--ce-accent)", textTransform: "uppercase" }}>Post Preview</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ce-text)", lineHeight: "1.4", fontStyle: "italic" }}>
                        "{selectedPost.text.length > 200 ? `${selectedPost.text.substring(0, 200)}...` : selectedPost.text}"
                      </p>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600", marginBottom: "4px" }}>
                        <span>Engagement Rate</span>
                        <span style={{ color: "var(--ce-accent)" }}>{engagementPercentage}%</span>
                      </div>
                      <div style={{ height: "6px", background: resolvedTheme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                        <div 
                          style={{ 
                            width: `${Math.min(parseFloat(engagementPercentage), 100)}%`, 
                            height: "100%", 
                            background: "var(--ce-accent)", 
                            borderRadius: "3px", 
                            transition: "width 0.4s ease" 
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Card: Performance breakdown */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px", background: resolvedTheme === "light" ? "#fff" : "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px solid var(--ce-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--ce-accent)", marginBottom: "4px" }}>
                        <Eye size={14} />
                        <span style={{ fontSize: "0.65rem", fontWeight: "600" }}>Views</span>
                      </div>
                      <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--ce-text)" }}>{viewsCount}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px", background: resolvedTheme === "light" ? "#fff" : "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px solid var(--ce-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ec4899", marginBottom: "4px" }}>
                        <Heart size={14} />
                        <span style={{ fontSize: "0.65rem", fontWeight: "600" }}>Likes</span>
                      </div>
                      <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--ce-text)" }}>{likesCount}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px", background: resolvedTheme === "light" ? "#fff" : "rgba(0,0,0,0.2)", borderRadius: "6px", border: "1px solid var(--ce-border)", gridColumn: "span 2" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#3b82f6", marginBottom: "4px" }}>
                        <MessageSquare size={14} />
                        <span style={{ fontSize: "0.65rem", fontWeight: "600" }}>Comments</span>
                      </div>
                      <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--ce-text)" }}>{commentsCount}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>


        </>
      )}

    </div>
  );
}
