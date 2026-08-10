import React, { useState } from "react";
import { Heart, MessageSquare, Share2, Bookmark, Send, Check, UserPlus, Sparkles, Terminal, Code2, ArrowLeft } from "lucide-react";
import "./NetworkFeedShowcase.css";

export default function NetworkFeedShowcase() {
  const [sachinLiked, setSachinLiked] = useState(false);
  const [sachinLikeCount, setSachinLikeCount] = useState(0);
  const [sachinLikeAnimating, setSachinLikeAnimating] = useState(false);
  const [sachinFollowing, setSachinFollowing] = useState(true);

  const [followStates, setFollowStates] = useState({
    sarah: false,
    aman: false
  });

  const handleLikeClick = (e) => {
    e.stopPropagation();
    setSachinLikeAnimating(true);
    if (sachinLiked) {
      setSachinLikeCount(0);
      setSachinLiked(false);
    } else {
      setSachinLikeCount(1);
      setSachinLiked(true);
    }
    setTimeout(() => setSachinLikeAnimating(false), 400);
  };

  const handleFollowToggle = (e) => {
    e.stopPropagation();
    setSachinFollowing(!sachinFollowing);
  };

  const handleUserFollow = (userKey) => {
    setFollowStates((prev) => ({
      ...prev,
      [userKey]: !prev[userKey]
    }));
  };

  return (
    <section className="ce-feed-collage-section" id="network-feed">
      {/* Ambient Glowing Background Blobs */}
      <div className="ce-glowing-blob purple-blob" />
      <div className="ce-glowing-blob pink-blob" />

      <div className="ce-feed-collage-container">
        
        {/* Left Side: 3D Collage of actual Feed Cards */}
        <div className="ce-collage-3d-panel">
          <div className="ce-collage-perspective-wrapper">
            
            {/* Card 3 (Back/Bottom Offset): Who to Follow Widget */}
            <div className="ce-collage-card card-back-widget">
              <div className="ce-widget-header">
                <span className="ce-widget-title">Who to follow</span>
              </div>
              <div className="ce-widget-body">
                <div className="ce-widget-user">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80" alt="Sarah" className="ce-widget-avatar" />
                  <div className="ce-widget-info">
                    <span className="ce-widget-name">Sarah Jenkins</span>
                    <span className="ce-widget-handle">@sarah_sys</span>
                  </div>
                  <button 
                    className={`ce-widget-follow-btn ${followStates.sarah ? "active" : ""}`}
                    onClick={() => handleUserFollow("sarah")}
                  >
                    {followStates.sarah ? <Check size={12} /> : <UserPlus size={12} />}
                  </button>
                </div>
                <div className="ce-widget-user">
                  <img src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=64&h=64&q=80" alt="Aman" className="ce-widget-avatar" />
                  <div className="ce-widget-info">
                    <span className="ce-widget-name">Aman Sharma</span>
                    <span className="ce-widget-handle">@aman_dev</span>
                  </div>
                  <button 
                    className={`ce-widget-follow-btn ${followStates.aman ? "active" : ""}`}
                    onClick={() => handleUserFollow("aman")}
                  >
                    {followStates.aman ? <Check size={12} /> : <UserPlus size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2 (Middle Offset): Code Snippet Post Card */}
            <div className="ce-collage-card card-middle-post">
              <div className="ce-post-header">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80" alt="Katarina" className="ce-post-avatar" />
                <div className="ce-post-author-info">
                  <div className="ce-author-badge-row">
                    <span className="ce-post-author-name">@katarina_canvas</span>
                    <span className="ce-post-role-badge designer">DESIGNER</span>
                  </div>
                  <span className="ce-post-meta">3h ago</span>
                </div>
              </div>
              <p className="ce-post-body-text">
                Check out the drawing line rendering logic on the multiplayer canvas! Handles WebSockets packets cleanly.
              </p>
              <div className="ce-post-code-container">
                <div className="ce-code-header">
                  <span className="ce-code-lang">JavaScript</span>
                  <Code2 size={13} />
                </div>
                <pre className="ce-code-content">
{`const drawLine = (x0, y0, x1, y1, color) => {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.stroke();
};`}
                </pre>
              </div>
            </div>

            {/* Card 1 (Front/Top Main): Sachin's VR Microprocessor Post Card */}
            <div className="ce-collage-card card-front-main">
              {/* User Profile Header */}
              <div className="ce-post-header">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80" alt="Sachin" className="ce-post-avatar" />
                <div className="ce-post-author-info">
                  <div className="ce-author-badge-row">
                    <span className="ce-post-author-name">@sachin_kumar</span>
                    <span className="ce-post-role-badge checkmark">✓</span>
                    <span className="ce-post-role-badge developer">DEVELOPER</span>
                  </div>
                  <span className="ce-post-meta">1d ago</span>
                </div>
                <button 
                  className={`ce-post-follow-btn ${sachinFollowing ? "following" : ""}`}
                  onClick={handleFollowToggle}
                >
                  {sachinFollowing ? "Following" : "Follow"}
                </button>
              </div>

              {/* Post Description */}
              <p className="ce-post-body-text">
                Modern processors are becoming the foundation of next-generation technology, powering everything from artificial intelligence and cloud computing to high-performance applications a... <span className="ce-post-readmore">... Read more</span>
              </p>

              {/* Custom VR Microprocessor Image */}
              <div className="ce-post-image-container">
                <img src="/vr_developer_feed.png" alt="VR Developer Microprocessor" className="ce-post-main-img" />
              </div>

              {/* Feed Actions Footer */}
              <div className="ce-post-actions-footer">
                <button 
                  className={`ce-post-action-btn like ${sachinLiked ? "liked" : ""} ${sachinLikeAnimating ? "animating" : ""}`}
                  onClick={handleLikeClick}
                >
                  <Heart size={16} fill={sachinLiked ? "#ef4444" : "none"} />
                  <span>{sachinLikeCount}</span>
                </button>
                <button className="ce-post-action-btn">
                  <MessageSquare size={16} />
                  <span>0</span>
                </button>
                <button className="ce-post-action-btn">
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button className="ce-post-action-btn bookmark-btn">
                  <Bookmark size={16} />
                </button>
              </div>

              {/* Add Comment Row */}
              <div className="ce-post-comment-row">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80" alt="Self" className="ce-comment-avatar" />
                <div className="ce-comment-input-wrapper">
                  <input type="text" placeholder="Add a comment..." readOnly className="ce-comment-input" />
                  <Send size={14} className="ce-comment-send-icon" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Network Feed Information & CTA */}
        <div className="ce-feed-info-panel">
          <span className="ce-info-tag">DEVELOPER SOCIAL NETWORK</span>
          <h2 className="ce-info-title">
            Where code meets its <span className="ce-title-gradient">community.</span>
          </h2>
          <p className="ce-info-desc">
            Stay connected, share coding updates, and build your digital footprint on a social feed designed exclusively for software developers.
          </p>

          <div className="ce-info-features-list">
            <div className="ce-feature-item">
              <div className="ce-feature-icon-box blue">
                <Terminal size={18} />
              </div>
              <div className="ce-feature-text">
                <h4>Interactive Snippet Execution</h4>
                <p>Run and test shared code snippets directly from the feed in a secure isolated compiler sandbox.</p>
              </div>
            </div>

            <div className="ce-feature-item">
              <div className="ce-feature-icon-box purple">
                <Sparkles size={18} />
              </div>
              <div className="ce-feature-text">
                <h4>Rich Media & Visual Snaps</h4>
                <p>Post high-fidelity snapshots of physical builds, dashboard setups, and daily coding accomplishments.</p>
              </div>
            </div>

            <div className="ce-feature-item">
              <div className="ce-feature-icon-box green">
                <Code2 size={18} />
              </div>
              <div className="ce-feature-text">
                <h4>Smart Recommendations</h4>
                <p>Follow top builders and discover developers matching your technical stacks automatically.</p>
              </div>
            </div>
          </div>

          <button className="ce-feed-cta-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span>Start Sharing</span>
            <ArrowLeft size={16} style={{ transform: "rotate(180deg)", marginLeft: "4px" }} />
          </button>
        </div>

      </div>
    </section>
  );
}
