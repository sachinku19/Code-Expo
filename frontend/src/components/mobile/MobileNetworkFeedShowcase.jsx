import React, { useState } from "react";
import { Heart, MessageSquare, Share2, Bookmark, Send, Terminal, Sparkles, Code2, ArrowLeft } from "lucide-react";
import "./MobileNetworkFeedShowcase.css";

export default function MobileNetworkFeedShowcase() {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [following, setFollowing] = useState(true);

  const handleLikeClick = (e) => {
    e.stopPropagation();
    setLikeAnimating(true);
    if (liked) {
      setLikeCount(0);
      setLiked(false);
    } else {
      setLikeCount(1);
      setLiked(true);
    }
    setTimeout(() => setLikeAnimating(false), 400);
  };

  const handleFollowToggle = (e) => {
    e.stopPropagation();
    setFollowing(!following);
  };

  return (
    <section className="mobile-feed-collage-section" id="mobile-network-feed">
      <div className="mobile-feed-collage-container">
        
        {/* Mobile Header */}
        <div className="mobile-feed-section-header">
          <span className="mobile-feed-tag">DEVELOPER SOCIAL NETWORK</span>
          <h3 className="mobile-feed-title">
            Where code meets its <span className="mobile-feed-title-glow">community.</span>
          </h3>
        </div>

        {/* Mobile Mockup Card: Sachin's VR Microprocessor Post */}
        <div className="mobile-collage-card">
          {/* User Profile Header */}
          <div className="mobile-post-header">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80" alt="Sachin" className="mobile-post-avatar" />
            <div className="mobile-post-author-info">
              <div className="mobile-author-badge-row">
                <span className="mobile-post-author-name">@sachin_kumar</span>
                <span className="mobile-post-role-badge checkmark">✓</span>
                <span className="mobile-post-role-badge developer">DEV</span>
              </div>
              <span className="mobile-post-meta">1d ago</span>
            </div>
            <button 
              className={`mobile-post-follow-btn ${following ? "following" : ""}`}
              onClick={handleFollowToggle}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>

          {/* Post Description */}
          <p className="mobile-post-body-text">
            Modern processors are becoming the foundation of next-generation technology, powering everything from artificial intelligence and cloud computing to high-performance applications a... <button type="button" disabled className="mobile-post-readmore" style={{ background: "none", border: "none", color: "#60a5fa", padding: 0, fontSize: "inherit", fontFamily: "inherit", fontWeight: "bold", cursor: "default" }}>... Read more</button>
          </p>

          {/* Custom VR Microprocessor Image */}
          <div className="mobile-post-image-container">
            <img src="/vr_developer_feed.png" alt="VR Developer Microprocessor" className="mobile-post-main-img" />
          </div>

          {/* Feed Actions Footer */}
          <div className="mobile-post-actions-footer">
            <button 
              className={`mobile-post-action-btn like ${liked ? "liked" : ""} ${likeAnimating ? "animating" : ""}`}
              onClick={handleLikeClick}
            >
              <Heart size={15} fill={liked ? "#ef4444" : "none"} />
              <span>{likeCount}</span>
            </button>
            <button className="mobile-post-action-btn">
              <MessageSquare size={15} />
              <span>0</span>
            </button>
            <button className="mobile-post-action-btn">
              <Share2 size={15} />
              <span>Share</span>
            </button>
            <button className="mobile-post-action-btn bookmark-btn">
              <Bookmark size={15} />
            </button>
          </div>

          {/* Add Comment Row */}
          <div className="mobile-post-comment-row">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80" alt="Self" className="mobile-comment-avatar" />
            <div className="mobile-comment-input-wrapper">
              <input type="text" placeholder="Add a comment..." readOnly className="mobile-comment-input" />
              <Send size={12} className="mobile-comment-send-icon" />
            </div>
          </div>
        </div>

        {/* Mobile Info & Bullet Highlights */}
        <div className="mobile-feed-info-panel">
          <p className="mobile-info-desc">
            Stay connected, share coding updates, and build your digital footprint on a social feed designed exclusively for software developers.
          </p>

          <div className="mobile-info-features-list">
            <div className="mobile-feature-item">
              <div className="mobile-feature-icon-box blue">
                <Terminal size={16} />
              </div>
              <div className="mobile-feature-text">
                <h3>Interactive Snippet Execution</h3>
                <p>Run shared code snippets directly from the feed in an isolated sandbox.</p>
              </div>
            </div>

            <div className="mobile-feature-item">
              <div className="mobile-feature-icon-box purple">
                <Sparkles size={16} />
              </div>
              <div className="mobile-feature-text">
                <h3>Rich Media & Visual Snaps</h3>
                <p>Post high-fidelity setups, configurations, and deployment wins.</p>
              </div>
            </div>

            <div className="mobile-feature-item">
              <div className="mobile-feature-icon-box green">
                <Code2 size={16} />
              </div>
              <div className="mobile-feature-text">
                <h3>Smart Recommendations</h3>
                <p>Follow top builders and discover developers matching your stacks.</p>
              </div>
            </div>
          </div>

          <button className="mobile-feed-cta-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span>Start Sharing</span>
            <ArrowLeft size={14} style={{ transform: "rotate(180deg)", marginLeft: "4px" }} />
          </button>
        </div>

      </div>
    </section>
  );
}
