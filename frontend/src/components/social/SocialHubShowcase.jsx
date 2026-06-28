import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Trophy, Calendar, Send, Flame, Sparkles, Heart, Share2, Code, User, ChevronRight, Activity, Users } from "lucide-react";
import "./SocialHubShowcase.css";

function SocialHubShowcase() {
  const [activeTab, setActiveTab] = useState("feed"); // "feed" | "leaderboard" | "chat"

  // ---------------------------------------------
  // 1. Network Feed State & Logic
  // ---------------------------------------------
  const [feedPosts, setFeedPosts] = useState([
    {
      id: 1,
      author: "Sachin",
      username: "sachin_dev",
      badge: "System Admin",
      avatarColor: "#8b5cf6",
      time: "2 hours ago",
      text: "Just deployed the new WebRTC video calling feature to CodeExpo! Check out the simplified connection logic below. Let me know if you want to test it in a live room! 🚀",
      code: `// Initialize WebRTC Peer Connection
const pc = new RTCPeerConnection(iceConfig);
stream.getTracks().forEach(track => pc.addTrack(track, stream));`,
      codeLang: "javascript",
      tags: ["webrtc", "javascript", "system"],
      likes: 42,
      hasLiked: false,
      comments: [
        { sender: "Aman", text: "Works flawlessly! The latency is under 50ms.", time: "1h ago" },
        { sender: "Neha", text: "Awesome addition, this makes pair programming so much easier.", time: "30m ago" }
      ]
    },
    {
      id: 2,
      author: "Aman",
      username: "aman_architect",
      badge: "Legendary Architect",
      avatarColor: "#ec4899",
      time: "5 hours ago",
      text: "Working on a new responsive layout for the CodeExpo landing page. What do you think of this color palette? 🎨",
      tags: ["css", "uidesign", "frontend"],
      likes: 28,
      hasLiked: false,
      comments: [
        { sender: "Sachin", text: "Looks very clean. Let's make sure the contrast ratios are high.", time: "4h ago" }
      ]
    }
  ]);

  const [commentInputs, setCommentInputs] = useState({}); // postId: text

  const handleLikePost = (postId) => {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const newHasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked: newHasLiked,
            likes: newHasLiked ? post.likes + 1 : post.likes - 1
          };
        }
        return post;
      })
    );
  };

  const handleSendComment = (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [
              ...post.comments,
              { sender: "You", text: commentText, time: "Just now" }
            ]
          };
        }
        return post;
      })
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  // ---------------------------------------------
  // 2. Chat/DM State & Logic
  // ---------------------------------------------
  const [messages, setMessages] = useState([
    { sender: "Sachin", text: "Hey! Let's work on the compiling server.", time: "11:15 AM" },
    { sender: "Aman", text: "Sure, let's open room 'collaborative-sandbox' and run some code.", time: "11:16 AM" }
  ]);
  const [chatInputText, setChatInputText] = useState("");
  const chatEndRef = useRef(null);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;

    const newMsg = {
      sender: "You",
      text: chatInputText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInputText("");

    // Simulate automated response
    setTimeout(() => {
      const bots = ["Sachin", "Aman"];
      const selectedBot = bots[Math.floor(Math.random() * bots.length)];
      const botReplies = [
        "That's a great approach! I just pushed some changes.",
        "Let's sync up on the shared whiteboard to diagram this structure.",
        "Compiling Python sandbox... Exited successfully in 0.14s!",
        "Let's start a video call directly inside the workspace room.",
        "I'll check the activity heatmap feed to log our points."
      ];

      const responseMsg = {
        sender: selectedBot,
        text: botReplies[Math.floor(Math.random() * botReplies.length)],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, responseMsg]);
    }, 1200);
  };

  useEffect(() => {
    if (activeTab === "chat" && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // ---------------------------------------------
  // 3. Leaderboard & Heatmap Data
  // ---------------------------------------------
  const leaderboard = [
    { rank: 1, name: "Sachin", badge: "System Admin", points: 8420, activeHours: 420 },
    { rank: 2, name: "Aman", badge: "Legendary Architect", points: 7650, activeHours: 382 },
    { rank: 3, name: "You (Mock Profile)", badge: "Elite Builder", points: 3120, activeHours: 156 }
  ];

  const heatmapCols = 24;
  const heatmapRows = 7;
  const heatmapCells = Array.from({ length: heatmapCols * heatmapRows }, (_, i) => {
    const val = (i * 7 + (i % 3) * 19 + (i % 5) * 13) % 5;
    return { id: i, level: val, points: val * 10 };
  });

  return (
    <section className="social-hub-showcase-section" id="social-hub">
      <div className="sh-header">
        <span className="sh-badge">
          <Trophy size={14} className="sh-badge-icon" />
          <span>Developer Ecosystem</span>
        </span>
        <h2>Developer Social Network & Rankings</h2>
        <p>
          Connect with builders, grow your followers, log daily contributions, and rank on the global leaderboard.
        </p>
      </div>

      {/* Main Dashboard Wrapper */}
      <div className="sh-dashboard-container glass-panel">
        
        {/* Dashboard Sidebar */}
        <div className="sh-dashboard-sidebar">
          <div className="sh-sidebar-header-brand">
            <Activity size={18} className="sh-brand-pulse-icon" />
            <span>Developer Hub</span>
          </div>
          
          <nav className="sh-sidebar-nav">
            <button
              onClick={() => setActiveTab("feed")}
              className={`sh-sidebar-tab-btn ${activeTab === "feed" ? "active" : ""}`}
            >
              <div className="sh-tab-icon-wrapper">
                <Sparkles size={15} />
                <span className="sh-tab-notif-dot" />
              </div>
              <span className="sh-tab-label">Network Feed</span>
              <ChevronRight size={13} className="sh-tab-arrow" />
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`sh-sidebar-tab-btn ${activeTab === "leaderboard" ? "active" : ""}`}
            >
              <div className="sh-tab-icon-wrapper">
                <Trophy size={15} />
              </div>
              <span className="sh-tab-label">Leaderboard</span>
              <ChevronRight size={13} className="sh-tab-arrow" />
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`sh-sidebar-tab-btn ${activeTab === "chat" ? "active" : ""}`}
            >
              <div className="sh-tab-icon-wrapper">
                <MessageSquare size={15} />
                <span className="sh-tab-online-dot" />
              </div>
              <span className="sh-tab-label">Direct Messages</span>
              <ChevronRight size={13} className="sh-tab-arrow" />
            </button>
          </nav>
          
          <div className="sh-sidebar-footer-profile">
            <div className="sh-footer-avatar">U</div>
            <div className="sh-footer-user-info">
              <span className="sh-footer-username">@you_dev</span>
              <span className="sh-footer-role">Elite Builder</span>
            </div>
          </div>
        </div>

        {/* Dashboard Content Panel */}
        <div className="sh-dashboard-panel">
          <AnimatePresence mode="wait">
            
            {/* 1. Network Feed Tab */}
            {activeTab === "feed" && (
              <motion.div
                key="feed-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="panel-content feed-tab-content"
              >
                <div className="panel-section-title">
                  <Sparkles size={16} className="section-title-icon" />
                  <h3>Developer Network Updates</h3>
                </div>

                <div className="mock-feed-list">
                  {feedPosts.map((post) => (
                    <div key={post.id} className="mock-post-card">
                      {/* Post Header */}
                      <div className="post-card-header">
                        <div className="post-author-avatar" style={{ backgroundColor: post.avatarColor }}>
                          {post.author.charAt(0)}
                        </div>
                        <div className="post-author-details">
                          <span className="author-name">@{post.username}</span>
                          <span className="author-badge">{post.badge}</span>
                        </div>
                        <span className="post-time">{post.time}</span>
                      </div>

                      {/* Post Body */}
                      <div className="post-card-body">
                        <p>{post.text}</p>
                        
                        {post.code && (
                          <div className="post-code-block">
                            <div className="code-header">
                              <Code size={11} />
                              <span>{post.codeLang}</span>
                            </div>
                            <pre>
                              <code>{post.code}</code>
                            </pre>
                          </div>
                        )}

                        <div className="post-tags">
                          {post.tags.map((tag) => (
                            <span key={tag} className="tag-pill">#{tag}</span>
                          ))}
                        </div>
                      </div>

                      {/* Post Actions */}
                      <div className="post-card-actions">
                        <button 
                          className={`action-btn like-btn ${post.hasLiked ? "active" : ""}`}
                          onClick={() => handleLikePost(post.id)}
                        >
                          <Heart size={14} fill={post.hasLiked ? "currentColor" : "transparent"} />
                          <span>{post.likes} Likes</span>
                        </button>
                        <button className="action-btn comment-btn">
                          <MessageSquare size={14} />
                          <span>{post.comments.length} Comments</span>
                        </button>
                        <button className="action-btn share-btn">
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Post Comments */}
                      <div className="post-comments-section">
                        <div className="comments-list">
                          {post.comments.map((comment, idx) => (
                            <div key={idx} className="comment-item">
                              <span className="commenter-name">@{comment.sender.toLowerCase()}:</span>
                              <span className="commenter-text">{comment.text}</span>
                              <span className="comment-time">{comment.time}</span>
                            </div>
                          ))}
                        </div>

                        <form onSubmit={(e) => handleSendComment(e, post.id)} className="post-comment-form">
                          <input
                            type="text"
                            placeholder="Add a reply..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: e.target.value
                              }))
                            }
                          />
                          <button type="submit">Reply</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 2. Leaderboard & Heatmap Tab */}
            {activeTab === "leaderboard" && (
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="panel-content leaderboard-tab-content"
              >
                <div className="panel-section-title">
                  <Trophy size={16} className="section-title-icon" />
                  <h3>Rankings & Contribution Activity</h3>
                </div>

                <div className="leaderboard-split-row">
                  {/* Heatmap Card */}
                  <div className="mock-card heatmap-card">
                    <div className="mock-card-header">
                      <Calendar size={15} className="card-icon" />
                      <span>Contribution Calendar</span>
                      <span className="points-label"><Flame size={11} /> 1,240 pts</span>
                    </div>
                    
                    <div className="heatmap-grid-container">
                      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${heatmapCols}, 1fr)` }}>
                        {heatmapCells.map((cell) => (
                          <div
                            key={cell.id}
                            className={`heatmap-box level-${cell.level}`}
                            title={`${cell.points} points`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="heatmap-legend">
                      <span>Less</span>
                      <div className="heatmap-box level-0" />
                      <div className="heatmap-box level-1" />
                      <div className="heatmap-box level-2" />
                      <div className="heatmap-box level-3" />
                      <div className="heatmap-box level-4" />
                      <span>More</span>
                    </div>
                  </div>

                  {/* Leaderboard Card */}
                  <div className="mock-card leaderboard-card">
                    <div className="mock-card-header">
                      <Users size={15} className="card-icon" />
                      <span>Global Leaderboard</span>
                    </div>
                    <div className="leaderboard-list">
                      {leaderboard.map((dev) => (
                        <div key={dev.name} className="leaderboard-item">
                          <span className={`rank rank-${dev.rank}`}>{dev.rank}</span>
                          <div className="dev-details">
                            <span className="dev-name">{dev.name}</span>
                            <span className="dev-badge-pill" style={{
                              background: dev.rank === 1 ? "linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)" : 
                                          dev.rank === 2 ? "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)" : "rgba(255,255,255,0.06)"
                            }}>
                              {dev.badge}
                            </span>
                          </div>
                          <div className="dev-stats-points">
                            <strong>{dev.points}</strong>
                            <span>pts ({dev.activeHours}h)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Direct Messages Tab */}
            {activeTab === "chat" && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="panel-content chat-tab-content"
              >
                <div className="panel-section-title">
                  <MessageSquare size={16} className="section-title-icon" />
                  <h3>Direct Messaging Chat</h3>
                  <span className="status-indicator">Sachin, Aman Online</span>
                </div>

                <div className="mock-chat-container">
                  <div className="chat-body-container">
                    {messages.map((msg, index) => (
                      <div key={index} className={`chat-message-bubble ${msg.sender === "You" ? "own-message" : ""}`}>
                        <div className="message-meta">
                          <span className="sender-name">{msg.sender}</span>
                          <span className="message-time">{msg.time}</span>
                        </div>
                        <p className="message-content">{msg.text}</p>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="chat-input-row">
                    <input
                      type="text"
                      placeholder="Type your message to Aman or Sachin..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                    />
                    <button type="submit" aria-label="Send message">
                      <Send size={15} />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}

export default SocialHubShowcase;
