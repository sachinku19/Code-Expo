import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Eye, Clock, Award, ShieldCheck } from "lucide-react";
import { getNetworkAnalytics } from "../../services/socialService";

export default function NetworkAnalytics({ addToast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

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

  if (loading) {
    return <div className="analytics-loading">Generating analytics reports...</div>;
  }

  const { followersGrowth = [], profileViews = [], stats = {} } = data || {};

  // Calculate SVG coordinates for Followers Growth Area Chart
  const maxFollowers = Math.max(...followersGrowth.map(f => f.count), 5);
  const followerPoints = followersGrowth.map((f, i) => {
    const x = 60 + i * 58; // 60, 118, 176, 234, 292, 350
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
    const x = 55 + i * 48; // Spaced evenly across 400px width
    const height = (v.count / maxViews) * 135;
    const y = 170 - height;
    return { x, y, width: 20, height: Math.max(height, 3), label: v.day, count: v.count };
  });

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
              <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.08)" />

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
              <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.08)" />

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
    </div>
  );
}
