import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Award, Activity, Flame, CheckCircle2, RefreshCw, Plus, Trash2, ShieldAlert,
  Search, Share2, FileDown, Info, Brain, Users, Target,
  TrendingUp, Globe, School, Building2, User, Copy, Check, ExternalLink, Calendar, Lock
} from "lucide-react";
import { jsPDF } from "jspdf";
import { getUnifiedStats, connectPlatform, refreshAllPlatforms, disconnectPlatform, getLeaderboard, shareProfile } from "../../services/cpService";
import ProfileAvatar from "../ProfileAvatar";
import "./CPDashboard.css";

export default function CPDashboard({ user }) {
  // States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [platforms, setPlatforms] = useState({});
  const [unifiedStats, setUnifiedStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Leaderboard state
  const [leaderboardScope, setLeaderboardScope] = useState("global"); // global | country | college | friends
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Connection Dialog state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedPlatformToConnect, setSelectedPlatformToConnect] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [platformToDisconnect, setPlatformToDisconnect] = useState(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [activeChartMetric, setActiveChartMetric] = useState("solved");
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const STAGES = [
    "Analyzing problem distributions...",
    "Validating rating trajectories...",
    "Synthesizing customized AI study roadmaps..."
  ];

  const runDiagnostics = () => {
    setAnalyzing(true);
    setAnalysisStage(0);
    setTimeout(() => {
      setAnalysisStage(1);
    }, 800);
    setTimeout(() => {
      setAnalysisStage(2);
    }, 1600);
    setTimeout(() => {
      setAnalyzing(false);
      setHasAnalyzed(true);
    }, 2400);
  };

  // Search/Filter states
  const [compSearch, setCompSearch] = useState("");
  const [compSortKey, setCompSortKey] = useState("solved"); // solved | rating | rank
  const [compSortOrder, setCompSortOrder] = useState("desc");



  // Chart Zoom state
  const [areaZoom, setAreaZoom] = useState("6M"); // 3M | 6M | 12M
  const [donutHoveredIndex, setDonutHoveredIndex] = useState(null);

  // Share profile state
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareData, setShareData] = useState(null);

  // Platform list config
  const PLATFORMS_CONFIG = {
    leetcode: { name: "LeetCode", color: "#F89F1B", logo: "https://upload.wikimedia.org/wikipedia/commons/1/19/LeetCode_logo_black.png" },
    codeforces: { name: "Codeforces", color: "#3182CE", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Codeforces_logo.svg/1200px-Codeforces_logo.svg.png" },
    codechef: { name: "CodeChef", color: "#5B4636", logo: "https://cdn.jsdelivr.net/npm/simple-icons@11.12.0/icons/codechef.svg" },
    atcoder: { name: "AtCoder", color: "#111111", logo: "https://img.atcoder.jp/assets/logo.png" },
    hackerrank: { name: "HackerRank", color: "#2EC866", logo: "https://upload.wikimedia.org/wikipedia/commons/4/40/HackerRank_Icon-Green.svg" }
  };

  // Fetch initial data
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getUnifiedStats();
      if (data.success) {
        setPlatforms(data.platforms || {});
        setUnifiedStats(data.unifiedStats || null);
        setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : null);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to sync Competitive Programming profiles. Please retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch leaderboard when scope or stats changes
  const fetchLeaderboardData = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await getLeaderboard(leaderboardScope);
      if (res.success) {
        setLeaderboardData(res.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (unifiedStats) {
      fetchLeaderboardData();
    }
  }, [leaderboardScope, unifiedStats]);

  // Connect platform handler
  const handleConnect = async (platformKey, username) => {
    setConnecting(true);
    setConnectingPlatform(platformKey);
    try {
      const res = await connectPlatform(platformKey, username.trim());
      if (res.success) {
        setPlatforms(res.platforms || {});
        setUnifiedStats(res.unifiedStats || null);
        setLastUpdated(new Date());
        setConnectModalOpen(false);
        setUsernameInput("");
        const input = document.getElementById(`input-connect-${platformKey}`);
        if (input) input.value = "";
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to connect to ${PLATFORMS_CONFIG[platformKey]?.name || platformKey}`);
    } finally {
      setConnecting(false);
      setConnectingPlatform(null);
    }
  };

  const handleModalConnectSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    handleConnect(selectedPlatformToConnect, usernameInput.trim());
  };

  // Disconnect initiation
  const handleDisconnectClick = (platformKey) => {
    setPlatformToDisconnect(platformKey);
    setDisconnectConfirmOpen(true);
  };

  // Confirmed Disconnect process
  const handleConfirmDisconnect = async () => {
    const platformKey = platformToDisconnect;
    if (!platformKey) return;
    
    setDisconnectConfirmOpen(false);
    setDisconnectingPlatform(platformKey);
    try {
      const res = await disconnectPlatform(platformKey);
      if (res.success) {
        setPlatforms(res.platforms || {});
        setUnifiedStats(res.unifiedStats || null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to disconnect ${PLATFORMS_CONFIG[platformKey]?.name || platformKey}`);
    } finally {
      setDisconnectingPlatform(null);
      setPlatformToDisconnect(null);
    }
  };

  // Single platform Refresh handler
  const handleRefreshSingle = async (platformKey) => {
    setPlatforms(prev => ({
      ...prev,
      [platformKey]: {
        ...prev[platformKey],
        syncStatus: "Syncing"
      }
    }));
    try {
      const res = await refreshAllPlatforms(platformKey);
      if (res.success) {
        setPlatforms(res.platforms || {});
        setUnifiedStats(res.unifiedStats || null);
        setLastUpdated(new Date());
        if (res.warnings && res.warnings.length > 0) {
          alert(res.warnings.join("\n"));
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to refresh ${PLATFORMS_CONFIG[platformKey]?.name || platformKey}`);
      fetchData();
    }
  };

  // Full Refresh handler
  const handleFullRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshAllPlatforms();
      if (res.success) {
        setPlatforms(res.platforms || {});
        setUnifiedStats(res.unifiedStats || null);
        setLastUpdated(new Date());
        if (res.warnings && res.warnings.length > 0) {
          alert(res.warnings.join("\n"));
        }
      }
    } catch (err) {
      alert("Refresh sync failed. Platform API gateways might be busy.");
    } finally {
      setRefreshing(false);
    }
  };

  // Public Share generate
  const handleShare = async () => {
    try {
      const res = await shareProfile();
      if (res.success) {
        setShareData(res);
        navigator.clipboard.writeText(res.shareUrl);
        setShareLinkCopied(true);
        setTimeout(() => setShareLinkCopied(false), 3000);
      }
    } catch (e) {
      alert("Sharing failed.");
    }
  };

  // Export PDF Report
  const exportPDF = () => {
    if (!unifiedStats) return;
    const doc = new jsPDF();
    
    // Color Palette
    const primaryColor = [15, 23, 42]; // Slate 900
    const secondaryColor = [37, 99, 235]; // Royal Blue
    const mutedColor = [100, 116, 139]; // Slate 500
    const lightBg = [248, 250, 252]; // Slate 50
    const borderCol = [226, 232, 240]; // Slate 200
    
    // Page 1 Header Banner
    doc.setFillColor(...secondaryColor);
    doc.rect(0, 0, 210, 42, "F");
    
    // Header Content
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("CODEEXPO CP PROFILE REPORT", 15, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(219, 234, 254);
    doc.text("Premium Competitive Programming Analytics Dashboard", 15, 25);
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 34);
    
    // Section: Developer Overview
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Developer Overview", 15, 54);
    
    // Draw horizontal separator line
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.5);
    doc.line(15, 57, 195, 57);
    
    // Stats Grid - Row 1
    // Box 1: Overall Score
    doc.setFillColor(...lightBg);
    doc.rect(15, 62, 56, 24, "F");
    doc.setDrawColor(...borderCol);
    doc.rect(15, 62, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("OVERALL SCORE", 20, 70);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...secondaryColor);
    doc.text(`${unifiedStats.score} / 1000`, 20, 78);
    
    // Box 2: Total Solves
    doc.setFillColor(...lightBg);
    doc.rect(77, 62, 56, 24, "F");
    doc.rect(77, 62, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("TOTAL SOLVED", 82, 70);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(`${unifiedStats.overallSolved}`, 82, 78);
    
    // Box 3: Avg Contest Rating
    doc.setFillColor(...lightBg);
    doc.rect(139, 62, 56, 24, "F");
    doc.rect(139, 62, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("AVG CONTEST RATING", 144, 70);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(`${unifiedStats.avgRating}`, 144, 78);
    
    // Stats Grid - Row 2
    // Box 4: Global Percentile
    doc.setFillColor(...lightBg);
    doc.rect(15, 92, 56, 24, "F");
    doc.rect(15, 92, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("GLOBAL PERCENTILE", 20, 100);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(`${unifiedStats.percentile?.toFixed(2)}%`, 20, 108);

    // Box 5: Active Streak
    doc.setFillColor(...lightBg);
    doc.rect(77, 92, 56, 24, "F");
    doc.rect(77, 92, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("CODING STREAK", 82, 100);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(`${unifiedStats.codingStreak} Days`, 82, 108);

    // Box 6: Rating Tier
    doc.setFillColor(...lightBg);
    doc.rect(139, 92, 56, 24, "F");
    doc.rect(139, 92, 56, 24, "D");
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...mutedColor);
    doc.text("RATING TIER", 144, 100);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...primaryColor);
    doc.text(`${unifiedStats.level}`, 144, 108);
    
    // Section: Connected Platforms
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Connected Platforms Detail", 15, 134);
    doc.line(15, 137, 195, 137);
    
    // Render platform info cards
    let y = 144;
    Object.keys(platforms).forEach(key => {
      const p = platforms[key];
      if (p && p.username && PLATFORMS_CONFIG[key]) {
        doc.setFillColor(...lightBg);
        doc.rect(15, y, 180, 20, "F");
        doc.rect(15, y, 180, 20, "D");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...secondaryColor);
        doc.text(PLATFORMS_CONFIG[key].name, 20, y + 8);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...primaryColor);
        doc.text(`Handle: ${p.username}   |   Solved: ${p.stats?.solvedStats?.total || 0}   |   Contest Rating: ${p.stats?.contestRating || "N/A"}   |   Global Rank: ${p.stats?.currentRank || "N/A"}`, 20, y + 14);
        
        y += 25;
      }
    });
    
    // Page 2: AI Insights (if available)
    if (unifiedStats.insights) {
      doc.addPage();
      
      // Page 2 Header Banner
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 28, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("EXPOAI DIAGNOSTICS & RECOMMENDATIONS", 15, 18);
      
      let nextY = 40;
      
      const renderSection = (title, text) => {
        if (!text) return;
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(...secondaryColor);
        doc.text(title, 15, nextY);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...primaryColor);
        
        // Wrap text cleanly
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, 15, nextY + 6);
        
        const height = splitText.length * 5.5;
        nextY += 12 + height;
      };
      
      renderSection("Key Skill Strengths", unifiedStats.insights.strengths);
      renderSection("Growth Opportunities & Weaknesses", unifiedStats.insights.weaknesses);
      renderSection("Targeted Improvement Areas", unifiedStats.insights.improvementAreas);
      
      if (unifiedStats.insights.recommendedTopics && unifiedStats.insights.recommendedTopics.length > 0) {
        renderSection("Recommended Advanced Curriculum Topics", unifiedStats.insights.recommendedTopics.join(", "));
      }
    }
    
    doc.save(`${user?.username || "developer"}_cp_report.pdf`);
  };

  // Compare section filters/sorting
  const comparisonList = useMemo(() => {
    const list = [];
    Object.keys(platforms).forEach(key => {
      const p = platforms[key];
      if (p && p.username && PLATFORMS_CONFIG[key]) {
        list.push({
          id: key,
          platform: PLATFORMS_CONFIG[key].name,
          logo: PLATFORMS_CONFIG[key].logo,
          username: p.username,
          solved: p.stats?.solvedStats?.total || 0,
          rating: p.stats?.contestRating || 0,
          rank: p.stats?.currentRank || "N/A",
          badges: p.stats?.badges?.length || 0,
          contests: p.stats?.contestHistory?.length || 0,
          languages: key === "leetcode" ? "C++, Python, JS" : key === "codeforces" ? "C++20" : key === "hackerrank" ? "SQL, Python" : "Python 3",
          lastActivity: p.lastSynced ? new Date(p.lastSynced).toLocaleDateString() : "N/A"
        });
      }
    });

    if (compSearch) {
      return list.filter(item => item.platform.toLowerCase().includes(compSearch.toLowerCase()) || item.username.toLowerCase().includes(compSearch.toLowerCase()));
    }

    return list.sort((a, b) => {
      let aVal = a[compSortKey];
      let bVal = b[compSortKey];
      if (typeof aVal === "string") return aVal.localeCompare(bVal) * (compSortOrder === "asc" ? 1 : -1);
      return (bVal - aVal) * (compSortOrder === "asc" ? -1 : 1);
    });
  }, [platforms, compSearch, compSortKey, compSortOrder]);



  // SVG Area Chart helper
  const areaChartPoints = useMemo(() => {
    if (!unifiedStats || !unifiedStats.monthlyProgress) return [];
    let data = [...unifiedStats.monthlyProgress];
    if (areaZoom === "3M") data = data.slice(-3);
    return data;
  }, [unifiedStats, areaZoom]);

  // Heatmap stats calculations
  const heatmapStats = useMemo(() => {
    if (!unifiedStats || !unifiedStats.heatmap) return { total: 0, activeDays: 0, peak: 0, consistency: "Casual Coder" };
    const vals = Object.values(unifiedStats.heatmap || {});
    const total = vals.reduce((a, b) => a + b, 0);
    const activeDays = vals.filter(v => v > 0).length;
    const peak = vals.length > 0 ? Math.max(...vals) : 0;
    
    let consistency = "Casual Coder";
    const ratio = activeDays / 364;
    if (ratio > 0.45) consistency = "Grandmaster Grinder";
    else if (ratio > 0.25) consistency = "Dedicated Coder";
    else if (ratio > 0.1) consistency = "Consistent Solver";
    
    return { total, activeDays, peak, consistency };
  }, [unifiedStats]);

  // SVG Donut percentages
  const donutSegments = useMemo(() => {
    if (!unifiedStats || !unifiedStats.difficultySolved) return [];
    const { easy, medium, hard } = unifiedStats.difficultySolved;
    const total = easy + medium + hard;
    if (total === 0) return [];

    const segments = [
      { label: "Easy", count: easy, color: "#10B981", percent: (easy / total) * 100 },
      { label: "Medium", count: medium, color: "#F59E0B", percent: (medium / total) * 100 },
      { label: "Hard", count: hard, color: "#EF4444", percent: (hard / total) * 100 }
    ];

    let currentOffset = 0;
    const C = 314.16;
    return segments.map(seg => {
      const strokeDasharray = `${(C * seg.percent) / 100} ${C}`;
      const strokeDashoffset = -((C * currentOffset) / 100);
      currentOffset += seg.percent;
      return {
        ...seg,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [unifiedStats]);

  // SVG Radar coordinates
  const radarPoints = useMemo(() => {
    if (!unifiedStats || !unifiedStats.skills) return "";
    const axes = [
      { name: "Algorithms", val: unifiedStats.skills.Algorithms || 0 },
      { name: "DP", val: unifiedStats.skills["Dynamic Programming"] || 0 },
      { name: "Graphs", val: unifiedStats.skills.Graphs || 0 },
      { name: "Trees", val: unifiedStats.skills.Trees || 0 },
      { name: "Math", val: unifiedStats.skills.Math || 0 },
      { name: "Strings", val: unifiedStats.skills.Strings || 0 },
      { name: "Greedy", val: unifiedStats.skills.Greedy || 0 },
      { name: "Binary Search", val: unifiedStats.skills["Binary Search"] || 0 }
    ];

    const maxVal = Math.max(...axes.map(a => a.val), 10);
    const radius = 90;
    const center = 120;

    const points = axes.map((axis, i) => {
      const angle = (Math.PI * 2 / axes.length) * i - Math.PI / 2;
      const factor = axis.val / maxVal;
      const x = center + Math.cos(angle) * (radius * factor);
      const y = center + Math.sin(angle) * (radius * factor);
      return `${x},${y}`;
    });

    return points.join(" ");
  }, [unifiedStats]);

  const hasConnectedPlatforms = Object.keys(platforms).some(key => platforms[key].username && PLATFORMS_CONFIG[key]);

  // Render Skeletons
  if (loading) {
    return (
      <div className="cp-dashboard-container page-fade-in">
        <div className="cp-header-skeleton shimmer" />
        <div className="cp-grid-skeleton">
          <div className="cp-card-skeleton shimmer" />
          <div className="cp-card-skeleton shimmer" />
          <div className="cp-card-skeleton shimmer" />
        </div>
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="cp-error-card glass-panel page-fade-in">
        <ShieldAlert size={48} className="cp-error-icon" />
        <h3>Profile Sync Interrupted</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={() => fetchData()}>
          <RefreshCw size={14} /> Retry Sync
        </button>
      </div>
    );
  }

  // Main UI
  return (
    <div className="cp-dashboard-container page-fade-in">
      
      {/* 1. Profile Header */}
      <div className="cp-profile-header glass-panel">
        <div className="cp-header-cover" />
        <div className="cp-header-main">
          <div className="cp-header-avatar">
            <ProfileAvatar />
          </div>
          <div className="cp-header-info">
            <div className="cp-name-row">
              <h2>{unifiedStats?.name || user?.username || "Developer"}</h2>
              {unifiedStats && <span className="verified-badge"><CheckCircle2 size={12} fill="#10B981" color="#fff" /> Verified</span>}
            </div>
            <p className="cp-college-row">
              <School size={14} /> {user?.college || "Global Coding Guild"} • <Globe size={14} /> {user?.location?.trim() || "Not Given"}
            </p>
            <div className="cp-badge-tags">
              <span className="cp-tag text-blue"><Trophy size={12} /> Rank: {unifiedStats?.currentRank || "Unranked"}</span>
              <span className="cp-tag text-purple"><Award size={12} /> Connected: {unifiedStats?.connectedPlatforms?.length || 0} Platforms</span>
              {lastUpdated && <span className="cp-tag text-muted"><Calendar size={12} /> Sync: {lastUpdated.toLocaleTimeString()}</span>}
            </div>
          </div>
          <div className="cp-header-actions">
            {hasConnectedPlatforms && (
              <button className={`btn-sync-all ${refreshing ? "spinning" : ""}`} onClick={handleFullRefresh} disabled={refreshing}>
                <RefreshCw size={14} /> {refreshing ? "Syncing..." : "Sync Platforms"}
              </button>
            )}
            <button className="btn-connect-new" onClick={() => { setSelectedPlatformToConnect("leetcode"); setConnectModalOpen(true); }}>
              <Plus size={14} /> Connect Platform
            </button>
          </div>
        </div>
      </div>

      {!hasConnectedPlatforms ? (
        // Empty State Connect UI
        <div className="cp-empty-state glass-panel animate-scale-up">
          <div className="illustration-grid">
            <Trophy size={64} className="trophy-bounce" />
          </div>
          <h2>Connect Coding Profiles</h2>
          <p>Import your ratings, solved metrics, and streaks from LeetCode, Codeforces, HackerRank, and more into one beautiful real-time dashboard.</p>
          <div className="empty-cta-row">
            <button className="btn-connect-new lg" onClick={() => { setSelectedPlatformToConnect("leetcode"); setConnectModalOpen(true); }}>
              Connect your first platform
            </button>
          </div>
        </div>
      ) : (
        // Connected Layout
        <div className="cp-dashboard-grid">

          {/* Connected platforms horizontal listing */}
          <div className="cp-platforms-section">
            <h3 className="section-title">Platforms Connected</h3>
            <div className="platforms-row">
              {Object.keys(PLATFORMS_CONFIG).map(key => {
                const plat = platforms[key] || { username: "", syncStatus: "Not Connected", lastSynced: null, stats: null };
                const cfg = PLATFORMS_CONFIG[key];
                const isConnected = !!plat.username;

                return (
                  <div key={key} className={`platform-card glass-panel hover-elevation ${isConnected ? "connected" : "unconnected"}`}>
                    <div className="card-header-row">
                      <img src={cfg.logo} alt={cfg.name} className="platform-logo" />
                      <div className="status-indicator">
                        <span className={`status-dot ${
                          disconnectingPlatform === key 
                            ? "failed" 
                            : (connectingPlatform === key ? "syncing" : (plat.syncStatus?.toLowerCase().replace(/\s/g, "") || "notconnected"))
                        }`} />
                        <span className="status-lbl">
                          {disconnectingPlatform === key 
                            ? "Disconnecting..." 
                            : (connectingPlatform === key ? "Connecting..." : (plat.syncStatus || (isConnected ? "Connected" : "Not Connected")))}
                        </span>
                      </div>
                    </div>

                    {isConnected ? (
                      <div className="platform-body">
                        <div className="body-header">
                          <h4 className="platform-name">{cfg.name}</h4>
                          <span className="verification-badge">Verified</span>
                        </div>
                        <p className="handle">@{plat.username}</p>
                        
                        <div className="platform-stats-grid">
                          <div className="stat-item">
                            <span className="stat-lbl">Rating</span>
                            <strong className="stat-val">{plat.stats?.contestRating || "N/A"}</strong>
                          </div>
                          <div className="stat-item">
                            <span className="stat-lbl">Solved</span>
                            <strong className="stat-val">{plat.stats?.solvedStats?.total || 0}</strong>
                          </div>
                        </div>

                        {plat.lastError && (
                          <div className="sync-error-text" title={plat.lastError}>
                            ⚠️ {plat.lastError.length > 25 ? plat.lastError.substring(0, 25) + "..." : plat.lastError}
                          </div>
                        )}

                        <div className="card-footer-row">
                          <span className="sync-time">
                            Synced: {plat.lastSynced ? new Date(plat.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                          </span>
                          <div className="action-buttons">
                            <button className="btn-refresh" onClick={() => handleRefreshSingle(key)} disabled={plat.syncStatus === "Syncing" || disconnectingPlatform === key} title="Sync this platform">
                              <RefreshCw size={12} className={plat.syncStatus === "Syncing" ? "spinning" : ""} />
                            </button>
                            <button className="btn-disconnect" onClick={() => handleDisconnectClick(key)} disabled={disconnectingPlatform === key} title="Disconnect platform">
                              {disconnectingPlatform === key ? (
                                <RefreshCw size={12} className="spinning" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="platform-body unconnected-body">
                        <h4 className="platform-name">{cfg.name}</h4>
                        <p className="status-muted">{connectingPlatform === key ? "Connecting..." : "Not Connected"}</p>
                        
                        <div className="connect-quick-input">
                          <input 
                            type="text" 
                            placeholder="Username" 
                            id={`input-connect-${key}`} 
                            className="quick-username-input" 
                            disabled={connectingPlatform === key}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = e.target.value.trim();
                                if (val !== "") {
                                  handleConnect(key, val);
                                }
                              }
                            }}
                          />
                          <button 
                            className="btn-quick-connect" 
                            disabled={connectingPlatform === key}
                            onClick={() => {
                              const input = document.getElementById(`input-connect-${key}`);
                              if (input && input.value.trim() !== "") {
                                handleConnect(key, input.value.trim());
                              }
                            }}
                          >
                            {connectingPlatform === key ? (
                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <RefreshCw size={10} className="spinning" /> Connecting
                              </span>
                            ) : (
                              "Connect"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unified score & metrics summary */}
          <div className="metrics-column-layout">
            
            {/* Overview cards */}
            <div className="overview-stats-grid">
              <div className="overview-card glass-panel">
                <div className="card-header-icon bg-blue">
                  <Activity size={18} />
                </div>
                <div className="card-val-box">
                  <span className="card-label">Total Solved</span>
                  <h3 className="counter">{unifiedStats?.overallSolved}</h3>
                  <span className="sub-text">Across all profiles</span>
                </div>
              </div>
              <div className="overview-card glass-panel">
                <div className="card-header-icon bg-green">
                  <Flame size={18} fill="#10B981" />
                </div>
                <div className="card-val-box">
                  <span className="card-label">Active Streak</span>
                  <h3 className="counter">{unifiedStats?.codingStreak} Days</h3>
                  <span className="sub-text">Consistent solver</span>
                </div>
              </div>
              <div className="overview-card glass-panel">
                <div className="card-header-icon bg-purple">
                  <Trophy size={18} />
                </div>
                <div className="card-val-box">
                  <span className="card-label">Avg Rating</span>
                  <h3 className="counter">{unifiedStats?.avgRating}</h3>
                  <span className="sub-text">Contest difficulty index</span>
                </div>
              </div>
              <div className="overview-card glass-panel">
                <div className="card-header-icon bg-orange">
                  <TrendingUp size={18} />
                </div>
                <div className="card-val-box">
                  <span className="card-label">Global Rank</span>
                  <h3 className="counter">Top {100 - (unifiedStats?.percentile || 95).toFixed(1)}%</h3>
                  <span className="sub-text">Percentile standing</span>
                </div>
              </div>
            </div>

            {/* CodeExpo Score Meter */}
            <div className="codeexpo-score-card glass-panel">
              <div className="score-details-box">
                <h4>CodeExpo Score</h4>
                <div className="score-main-flex">
                  <h2 className="score-big">{unifiedStats?.score}<span>/1000</span></h2>
                  <span className={`tier-badge ${unifiedStats?.level?.toLowerCase()}`}>{unifiedStats?.level}</span>
                </div>
                <div className="score-progress-wrapper">
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${unifiedStats?.progress}%` }} />
                  </div>
                  <div className="progress-labels">
                    <span>XP progress</span>
                    <span>{unifiedStats?.pointsToNext > 0 ? `${unifiedStats.pointsToNext} points to next tier` : "Max Rank Achieved"}</span>
                  </div>
                </div>
              </div>
              <div className="score-radial-visual">
                {/* SVG Radial Meter */}
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--cp-track-bg)" strokeWidth="6" fill="none" />
                  <circle cx="50" cy="50" r="40" stroke="var(--cp-blue)" strokeWidth="6" fill="none"
                          strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * (unifiedStats?.score || 0)) / 1000}
                          strokeLinecap="round" transform="rotate(-90 50 50)" />
                  <text x="50" y="55" textAnchor="middle" fill="var(--text-h)" fontSize="16" fontWeight="bold">Lvl {Math.floor((unifiedStats?.score || 0) / 150) + 1}</text>
                </svg>
              </div>
            </div>

          </div>

          {/* Solved Distributions (Donut + Bar Charts) */}
          <div className="charts-split-section">
            <div className="donut-chart-box glass-panel">
              <h3 className="card-title">Difficulty Distribution</h3>
              <div className="donut-body-wrapper">
                <div className="svg-donut-container">
                  <svg width="180" height="180" viewBox="0 0 120 120">
                    <defs>
                      <linearGradient id="easy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="medium-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>
                      <linearGradient id="hard-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#EF4444" />
                        <stop offset="100%" stopColor="#DC2626" />
                      </linearGradient>
                      <radialGradient id="donut-center-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255, 255, 255, 0.05)" />
                        <stop offset="70%" stopColor="rgba(255, 255, 255, 0.02)" />
                        <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
                      </radialGradient>
                    </defs>
                    
                    <circle cx="60" cy="60" r="50" stroke="var(--cp-track-bg)" strokeWidth="8" fill="none" />
                    <circle cx="60" cy="60" r="42" fill="url(#donut-center-glow)" />

                    {donutSegments.map((seg, idx) => {
                      const gradId = seg.label === "Easy" ? "url(#easy-grad)" : seg.label === "Medium" ? "url(#medium-grad)" : "url(#hard-grad)";
                      return (
                        <circle key={seg.label} cx="60" cy="60" r="50" stroke={gradId} strokeWidth="10" fill="none"
                                strokeDasharray={seg.strokeDasharray} strokeDashoffset={seg.strokeDashoffset}
                                strokeLinecap="butt" transform="rotate(-90 60 60)"
                                style={{
                                  transition: "stroke-width 0.2s ease, filter 0.2s ease",
                                  cursor: "pointer",
                                  filter: donutHoveredIndex === idx ? "brightness(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.2))" : "none"
                                }}
                                onMouseEnter={() => setDonutHoveredIndex(idx)}
                                onMouseLeave={() => setDonutHoveredIndex(null)} />
                      );
                    })}
                    <text x="60" y="62" textAnchor="middle" fill="var(--text-h)" fontSize="13" fontWeight="bold">
                      {unifiedStats?.overallSolved}
                    </text>
                    <text x="60" y="73" textAnchor="middle" fill="var(--cp-text-muted)" fontSize="7" fontWeight="500" letterSpacing="0.5">
                      SOLVED
                    </text>
                  </svg>
                </div>
                <div className="donut-legend-premium">
                  {donutSegments.map((seg, idx) => (
                    <div key={seg.label} className={`legend-card-premium ${seg.label.toLowerCase()}-card`}
                         style={{ opacity: donutHoveredIndex === null || donutHoveredIndex === idx ? 1 : 0.4 }}
                         onMouseEnter={() => setDonutHoveredIndex(idx)}
                         onMouseLeave={() => setDonutHoveredIndex(null)}>
                      <div className="card-top-row">
                        <div className="card-lbl-wrapper">
                          <span className={`card-indicator-dot ${seg.label.toLowerCase()}`} />
                          <span className="card-lbl-text">{seg.label}</span>
                        </div>
                        <span className="card-lbl-percentage">{seg.percent.toFixed(1)}%</span>
                      </div>
                      <div className="progress-track-mini">
                        <div className="progress-fill-mini" style={{ width: `${seg.percent}%`, background: seg.color }} />
                      </div>
                      <div className="card-bottom-row">
                        <span className="card-val-text"><strong>{seg.count}</strong> solved</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bar-chart-box glass-panel">
              <h3 className="card-title">Platform-wise Breakdown</h3>
              <div className="platform-breakdown-container-premium">
                {Object.keys(unifiedStats?.platformWiseSolved || {})
                  .filter(key => PLATFORMS_CONFIG[key])
                  .map(key => {
                    const solved = unifiedStats.platformWiseSolved[key] || 0;
                    const cfg = PLATFORMS_CONFIG[key];
                    const plat = platforms[key] || {};
                    const maxVal = Math.max(...Object.values(unifiedStats.platformWiseSolved || {}).filter((_, idx) => {
                      const k = Object.keys(unifiedStats.platformWiseSolved)[idx];
                      return PLATFORMS_CONFIG[k];
                    }), 1);
                    const percent = (solved / maxVal) * 100;
                    
                    return (
                      <div key={key} className="platform-progress-row-premium">
                        <div className="platform-row-meta">
                          <div className="platform-identity">
                            <img src={cfg.logo} alt={cfg.name} className="platform-icon-img" />
                            <span className="platform-name-text">{cfg.name}</span>
                          </div>
                          <div className="platform-solved-badge">
                            <strong>{solved}</strong> solved
                          </div>
                        </div>
                        
                        <div className="platform-progress-bar-track-premium">
                          <div className="platform-progress-bar-fill-premium" style={{
                            width: `${percent}%`,
                            background: `linear-gradient(90deg, ${cfg.color}88, ${cfg.color})`,
                            boxShadow: `0 0 10px ${cfg.color}44`
                          }} />
                        </div>
                        
                        <div className="platform-row-footer">
                          <span className="footer-stat">Rating: <strong>{plat.stats?.contestRating || "N/A"}</strong></span>
                          <span className="footer-stat">Rank: <strong>{plat.stats?.currentRank || "N/A"}</strong></span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Interactive monthly area progress chart */}
          <div className="area-progress-section glass-panel">
            <div className="area-header">
              <div className="title-and-tabs-row">
                <h3 className="card-title">Monthly Progress Tracker</h3>
                <div className="metric-tabs-premium">
                  {[
                    { key: "solved", label: "Problems Solved", color: "#8B5CF6" },
                    { key: "rating", label: "Contest Rating", color: "#10B981" },
                    { key: "contests", label: "Contest Count", color: "#06B6D4" }
                  ].map(metric => (
                    <button key={metric.key} className={`metric-tab-premium ${activeChartMetric === metric.key ? "active" : ""}`}
                            style={{ "--metric-color": metric.color }}
                            onClick={() => { setActiveChartMetric(metric.key); setHoveredPoint(null); }}>
                      <span className="metric-dot" />
                      <span className="metric-tab-lbl">{metric.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="zoom-toggle-row">
                {["3M", "6M"].map(zoom => (
                  <button key={zoom} className={`btn-zoom ${areaZoom === zoom ? "active" : ""}`} onClick={() => setAreaZoom(zoom)}>
                    {zoom}
                  </button>
                ))}
              </div>
            </div>
            <div className="area-body-svg-premium" style={{ position: "relative" }}>
              <svg viewBox="0 0 500 150" width="100%" height="150" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="solvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="contestsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal grids */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />

                {/* Graph coordinates generator */}
                {(() => {
                  const pointsCount = areaChartPoints.length;
                  const stepX = 500 / (pointsCount - 1 || 1);
                  const maxVal = Math.max(...areaChartPoints.map(p => p[activeChartMetric] || 0), 1);
                  
                  // Construct line path
                  const coords = areaChartPoints.map((item, idx) => {
                    const x = idx * stepX;
                    const val = item[activeChartMetric] || 0;
                    const y = 130 - (val / maxVal) * 110;
                    return { x, y, label: item.month, val };
                  });

                  const pathStr = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                  const fillStr = `${pathStr} L ${coords[coords.length - 1].x} 130 L ${coords[0].x} 130 Z`;
                  const gradId = activeChartMetric === "solved" ? "url(#solvedGrad)" : activeChartMetric === "rating" ? "url(#ratingGrad)" : "url(#contestsGrad)";
                  const strokeColor = activeChartMetric === "solved" ? "#8B5CF6" : activeChartMetric === "rating" ? "#10B981" : "#06B6D4";

                  return (
                    <>
                      <path d={fillStr} fill={gradId} style={{ transition: "all 0.5s ease" }} />
                      <path d={pathStr} fill="none" stroke={strokeColor} strokeWidth="3" style={{ transition: "all 0.5s ease" }} />
                      {coords.map(c => (
                        <g key={c.label}
                           onMouseEnter={() => setHoveredPoint(c)}
                           onMouseLeave={() => setHoveredPoint(null)}
                           style={{ cursor: "pointer" }}>
                          <circle cx={c.x} cy={c.y} r="5" fill={strokeColor} stroke="var(--bg)" strokeWidth="2"
                                  style={{ transition: "all 0.3s ease" }} />
                          <text x={c.x} y="145" textAnchor="middle" fill="var(--cp-text-muted)" fontSize="8.5" fontWeight="500">{c.label}</text>
                        </g>
                      ))}

                      {/* Integrated Vector Tooltip */}
                      {hoveredPoint && (
                        <g style={{ pointerEvents: "none" }}>
                          <rect x={Math.max(5, Math.min(385, hoveredPoint.x - 55))} y={Math.max(5, hoveredPoint.y - 48)} width="110" height="36" rx="8"
                                fill="var(--cp-card-bg)" stroke={strokeColor} strokeWidth="1.5"
                                style={{ filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))" }} />
                          
                          <text x={Math.max(5, Math.min(385, hoveredPoint.x - 55)) + 55} y={Math.max(5, hoveredPoint.y - 48) + 13} textAnchor="middle"
                                fill="var(--cp-text-muted)" fontSize="7.5" fontWeight="bold" letterSpacing="0.5">
                            {hoveredPoint.label.toUpperCase()}
                          </text>

                          <text x={Math.max(5, Math.min(385, hoveredPoint.x - 55)) + 55} y={Math.max(5, hoveredPoint.y - 48) + 27} textAnchor="middle"
                                fill="var(--text-h)" fontSize="8.5" fontWeight="bold">
                            {hoveredPoint.val} {activeChartMetric === "solved" ? "solves" : activeChartMetric === "rating" ? "rating" : "contests"}
                          </text>
                        </g>
                      )}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Submission Heatmap Grid */}
          <div className="heatmap-section-premium glass-panel">
            <div className="heatmap-header-premium">
              <h3 className="card-title">LeetCode Submission Heatmap</h3>
              <div className="heatmap-summary-badge-premium">
                <span className="badge-title">Consistency:</span>
                <span className="badge-value-premium">{heatmapStats.consistency}</span>
              </div>
            </div>
            
            <div className="heatmap-dashboard-premium">
              {/* Left hand stats grid */}
              <div className="heatmap-stats-side-panel">
                <div className="stat-card-mini glass-panel">
                  <span className="stat-label">Total Submissions</span>
                  <strong className="stat-value">{heatmapStats.total}</strong>
                </div>
                <div className="stat-card-mini glass-panel">
                  <span className="stat-label">Active Days</span>
                  <strong className="stat-value">{heatmapStats.activeDays} <span className="stat-sub">/ 364d</span></strong>
                </div>
                <div className="stat-card-mini glass-panel">
                  <span className="stat-label">Peak Daily Solves</span>
                  <strong className="stat-value">{heatmapStats.peak}</strong>
                </div>
              </div>

              {/* Right hand grid */}
              <div className="heatmap-grid-container-premium">
                <div className="heatmap-grid-scroll">
                  <div className="heatmap-grid-body">
                    {(() => {
                      const now = new Date();
                      const heatmapDays = [];
                      for (let i = 363; i >= 0; i--) {
                        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                        const dateStr = date.toISOString().split("T")[0];
                        const count = unifiedStats?.heatmap?.[dateStr] || 0;
                        let colorClass = "heat-0";
                        if (count > 0 && count <= 2) colorClass = "heat-1";
                        else if (count > 2 && count <= 4) colorClass = "heat-2";
                        else if (count > 4) colorClass = "heat-3";

                        heatmapDays.push({
                          date: dateStr,
                          count,
                          colorClass
                        });
                      }

                      return (
                        <div className="heatmap-days-row">
                          {heatmapDays.map(day => (
                            <div key={day.date} className={`heat-cell-premium ${day.colorClass}`} title={`${day.date}: ${day.count} solves`} />
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="heatmap-footer-labels-premium">
                  <span>Less</span>
                  <span className="legend-cell-premium heat-0" title="0 solves" />
                  <span className="legend-cell-premium heat-1" title="1-2 solves" />
                  <span className="legend-cell-premium heat-2" title="3-4 solves" />
                  <span className="legend-cell-premium heat-3" title="5+ solves" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform comparison table */}
          <div className="comparison-table-section glass-panel">
            <div className="table-header-row">
              <h3 className="card-title">Platform Stats Matrix</h3>
              <div className="search-bar-input">
                <Search size={14} />
                <input type="text" placeholder="Search handles..." value={compSearch} onChange={(e) => setCompSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-scroll-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Platform</th>
                    <th onClick={() => { setCompSortKey("solved"); setCompSortOrder(p => p === "asc" ? "desc" : "asc"); }}>Solved</th>
                    <th onClick={() => { setCompSortKey("rating"); setCompSortOrder(p => p === "asc" ? "desc" : "asc"); }}>Rating</th>
                    <th>Rank</th>
                    <th>Badges</th>
                    <th>Contests</th>
                    <th>Languages</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", color: "var(--cp-text-muted)", padding: "20px" }}>No matching connections found</td>
                    </tr>
                  ) : (
                    comparisonList.map(item => (
                      <tr key={item.id}>
                        <td className="pf-col">
                          <img src={item.logo} alt={item.platform} />
                          <span>{item.platform}</span>
                        </td>
                        <td>{item.solved}</td>
                        <td className="rating-num">{item.rating || "N/A"}</td>
                        <td>{item.rank}</td>
                        <td>{item.badges}</td>
                        <td>{item.contests}</td>
                        <td className="langs-lbl">{item.languages}</td>
                        <td className="time-lbl">{item.lastActivity}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skill Radar & Timeline splits */}
          <div className="radar-timeline-splits">
            
            {/* Skill Radar Chart */}
            <div className="radar-card glass-panel">
              <h3 className="card-title">Skill Profiler</h3>
              <div className="radar-svg-wrapper">
                <svg width="240" height="240" viewBox="0 0 240 240">
                  {/* Concentric octagons */}
                  <polygon points="120,30 183,56 210,120 183,183 120,210 56,183 30,120 56,56" fill="none" stroke="var(--cp-glass-border)" strokeWidth="0.5" />
                  <polygon points="120,60 151,78 165,120 151,161 120,180 88,161 75,120 88,78" fill="none" stroke="var(--cp-glass-border)" strokeWidth="0.5" />
                  <polygon points="120,90 135,99 142,120 135,140 120,150 104,140 97,120 104,99" fill="none" stroke="var(--cp-glass-border)" strokeWidth="0.5" />
                  
                  {/* Skill Coordinate Fill Polygon */}
                  {radarPoints && (
                    <polygon points={radarPoints} fill="rgba(37,99,235,0.18)" stroke="var(--ce-accent)" strokeWidth="2" strokeLinejoin="round" />
                  )}

                  {/* Axis labels */}
                  <text x="120" y="22" textAnchor="middle" fill="var(--cp-text-muted)" fontSize="8">Algorithms</text>
                  <text x="195" y="52" textAnchor="start" fill="var(--cp-text-muted)" fontSize="8">DP</text>
                  <text x="220" y="122" textAnchor="start" fill="var(--cp-text-muted)" fontSize="8">Graphs</text>
                  <text x="195" y="192" textAnchor="start" fill="var(--cp-text-muted)" fontSize="8">Trees</text>
                  <text x="120" y="222" textAnchor="middle" fill="var(--cp-text-muted)" fontSize="8">Math</text>
                  <text x="45" y="192" textAnchor="end" fill="var(--cp-text-muted)" fontSize="8">Strings</text>
                  <text x="20" y="122" textAnchor="end" fill="var(--cp-text-muted)" fontSize="8">Greedy</text>
                  <text x="45" y="52" textAnchor="end" fill="var(--cp-text-muted)" fontSize="8">Binary Search</text>
                </svg>
              </div>
            </div>

            {/* Contest History vertical timeline */}
            <div className="timeline-card glass-panel">
              <h3 className="card-title">Contest milestones</h3>
              <div className="timeline-scroll-box">
                {unifiedStats?.contestHistory?.length === 0 ? (
                  <p className="empty-timeline-text">No contest histories recorded.</p>
                ) : (
                  <div className="vertical-timeline-track">
                    {unifiedStats.contestHistory.map((item, idx) => {
                      const cfg = PLATFORMS_CONFIG[item.platform];
                      return (
                        <div key={idx} className="timeline-node">
                          <div className="node-icon-logo">
                            <img src={cfg.logo} alt={item.platform} />
                          </div>
                          <div className="node-content">
                            <div className="node-heading">
                              <h4>{item.contestName}</h4>
                              <span className={`node-rating-change ${item.ratingChange.startsWith("+") ? "gain" : "loss"}`}>
                                {item.ratingChange}
                              </span>
                            </div>
                            <div className="node-sub-row">
                              <span>Rank: <strong>#{item.rank}</strong></span>
                              <span>Solved: <strong>{item.problemsSolved}</strong></span>
                              <span>Rating: <strong>{item.rating}</strong></span>
                              <span className="date-lbl">{item.date}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>




          {/* AI Insights summary */}
          {unifiedStats?.insights && (
            <div className="ai-insights-card glass-panel">
              <div className="ai-header-bar">
                <Brain size={22} className={analyzing ? "ai-icon-pulse spinning" : "ai-icon-pulse"} />
                <h3>ExpoAI Developer Diagnostics</h3>
              </div>

              {!hasAnalyzed && !analyzing && (
                <div className="ai-cta-block" style={{ textAlign: "center", padding: "30px 20px" }}>
                  <p style={{ color: "var(--cp-text-muted)", marginBottom: "20px", fontSize: "0.9rem" }}>
                    ExpoAI can analyze your connected platform statistics to map your strengths, identify growth areas, and outline recommended study plans.
                  </p>
                  <button className="btn-connect-new" onClick={runDiagnostics}>
                    Run ExpoAI Diagnostics
                  </button>
                </div>
              )}

              {analyzing && (
                <div className="ai-loading-block" style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div className="spinner-progress-container" style={{ maxWidth: "300px", margin: "0 auto" }}>
                    <div className="spinning-icon-wrapper" style={{ marginBottom: "15px" }}>
                      <RefreshCw size={28} className="spinning" style={{ color: "var(--cp-blue)" }} />
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-h)", fontWeight: "500" }}>
                      {STAGES[analysisStage]}
                    </p>
                    <div className="ai-progress-bar-track" style={{ height: "4px", background: "var(--cp-glass-border)", borderRadius: "2px", marginTop: "16px", overflow: "hidden" }}>
                      <div className="ai-progress-bar-fill" style={{
                        height: "100%",
                        background: "var(--cp-blue)",
                        width: `${(analysisStage + 1) * 33.3}%`,
                        transition: "width 0.4s ease"
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {hasAnalyzed && !analyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <div className="ai-diagnostics-grid">
                    <div className="diagnostic-block">
                      <h5><CheckCircle2 size={12} className="icon-green" /> Core Strengths</h5>
                      <p>{unifiedStats.insights.strengths}</p>
                    </div>
                    <div className="diagnostic-block">
                      <h5><Info size={12} className="icon-orange" /> Growth Areas</h5>
                      <p>{unifiedStats.insights.weaknesses}</p>
                    </div>
                    <div className="diagnostic-block">
                      <h5><Users size={12} className="icon-blue" /> Contest Overview</h5>
                      <p>{unifiedStats.insights.contestAnalysis}</p>
                    </div>
                    <div className="diagnostic-block">
                      <h5><Target size={12} className="icon-purple" /> Consistency Score</h5>
                      <p>{unifiedStats.insights.consistency}</p>
                    </div>
                  </div>
                  <div className="recommended-bar">
                    <span>Next study topics:</span>
                    <div className="topic-pills-row">
                      {unifiedStats.insights.recommendedTopics?.map(topic => (
                        <span key={topic} className="topic-pill">{topic}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Leaderboard comparisons */}
          <div className="leaderboard-section-card glass-panel">
            <div className="table-header-row">
              <h3 className="card-title">Developer Leaderboard</h3>
              <div className="leaderboard-scopes-row">
                {["global", "country", "college", "friends"].map(scope => (
                  <button key={scope} className={`btn-scope ${leaderboardScope === scope ? "active" : ""}`} onClick={() => setLeaderboardScope(scope)}>
                    {scope.charAt(0).toUpperCase() + scope.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-scroll-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Developer</th>
                    <th>Tier</th>
                    <th>CodeExpo Score</th>
                    <th>Solved</th>
                    <th>Highest Rating</th>
                    <th>Platforms</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardLoading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", color: "var(--cp-text-muted)", padding: "30px" }}>Loading Leaderboards...</td>
                    </tr>
                  ) : leaderboardData.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", color: "var(--cp-text-muted)", padding: "30px" }}>No relative coders recorded under this scope</td>
                    </tr>
                  ) : (
                    leaderboardData.map(entry => (
                      <tr key={entry.id} className={entry.id === user?.id || entry.id === user?._id ? "own-ranking-row" : ""}>
                        <td className="rank-td">
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                        </td>
                        <td className="user-td-cell">
                          {entry.avatar ? <img src={entry.avatar} alt="" /> : <div className="fallback-sm">{entry.username?.charAt(0).toUpperCase()}</div>}
                          <span>@{entry.username}</span>
                        </td>
                        <td>
                          <span className={`tier-badge sm ${entry.level.toLowerCase()}`}>{entry.level}</span>
                        </td>
                        <td className="score-lbl">{entry.score}</td>
                        <td>{entry.solved}</td>
                        <td className="rating-num">{entry.maxRating || "N/A"}</td>
                        <td>{entry.platformsCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portfolio card sharing & exporting */}
          <div className="share-profile-card glass-panel">
            <h3 className="card-title">Share Developer Portfolio</h3>
            <p>Generate shareable portfolio links or export your full CP diagnostics report to showcase on GitHub, LinkedIn, or send directly to recruiters.</p>
            <div className="share-btn-row">
              <button className="btn-share-link" onClick={handleShare}>
                {shareLinkCopied ? (
                  <><Check size={14} /> Link Copied</>
                ) : (
                  <><Copy size={14} /> Copy Portfolio Link</>
                )}
              </button>
              <button className="btn-export-pdf" onClick={exportPDF}>
                <FileDown size={14} /> Export Profile PDF
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Connection Dialog Modal */}
      {createPortal(
        <AnimatePresence>
          {connectModalOpen && (
            <div className="modal-backdrop-overlay" onClick={() => setConnectModalOpen(false)}>
              <motion.div className="modal-card-box glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="modal-header">
                  <h4>Link Platform Account</h4>
                  <button className="btn-close" onClick={() => setConnectModalOpen(false)}>&times;</button>
                </div>
                <form onSubmit={handleModalConnectSubmit} className="modal-form">
                  <div className="form-group">
                    <label>Select Platforms</label>
                    <select value={selectedPlatformToConnect} onChange={(e) => setSelectedPlatformToConnect(e.target.value)}>
                      {Object.keys(PLATFORMS_CONFIG).map(key => (
                        <option key={key} value={key} disabled={platforms[key]?.username}>{PLATFORMS_CONFIG[key].name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Username / Handle</label>
                    <input type="text" placeholder="Enter coding username..." value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required />
                  </div>
                  <div className="form-footer">
                    <button type="button" className="btn-cancel" onClick={() => setConnectModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={connecting}>
                      {connecting ? "Connecting..." : "Confirm Connect"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Disconnect Confirmation Modal */}
      {createPortal(
        <AnimatePresence>
          {disconnectConfirmOpen && platformToDisconnect && (
            <div className="modal-backdrop-overlay" onClick={() => setDisconnectConfirmOpen(false)}>
              <motion.div className="modal-card-box glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="modal-header">
                  <h4 style={{ color: "var(--cp-red)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldAlert size={20} /> Disconnect Account
                  </h4>
                  <button className="btn-close" onClick={() => setDisconnectConfirmOpen(false)}>&times;</button>
                </div>
                <div style={{ margin: "16px 0", color: "var(--text)" }}>
                  <p>Are you sure you want to disconnect your <strong>{PLATFORMS_CONFIG[platformToDisconnect]?.name}</strong> account?</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--cp-text-muted)", marginTop: "8px" }}>
                    All local caches, solves tracking history, and scores for this platform will be permanently removed.
                  </p>
                </div>
                <div className="form-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" className="btn-cancel" onClick={() => setDisconnectConfirmOpen(false)}>Cancel</button>
                  <button type="button" className="btn-submit" style={{ backgroundColor: "var(--cp-red)" }} onClick={handleConfirmDisconnect}>
                    Confirm Disconnect
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
