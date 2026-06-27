import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPostById, toggleLikePost, addCommentPost } from "../services/socialService";
import { 
  Heart, Bookmark, ChevronLeft, ChevronRight, MessageSquare, 
  Send, Share2, ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import "../components/social/PremiumFeed.css";

export default function PublicPostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchPost = async () => {
    try {
      const res = await getPostById(postId);
      if (res?.success && res.post) {
        setPost(res.post);
      } else {
        setError("Post not found");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const handleLike = async () => {
    if (!user) {
      addToast("Please login to like this post", "error");
      setTimeout(() => {
        navigate("/login", { state: { from: location } });
      }, 1200);
      return;
    }

    try {
      const res = await toggleLikePost(postId);
      if (res?.success) {
        setPost(prev => ({
          ...prev,
          likes: res.likes
        }));
      }
    } catch (err) {
      addToast("Failed to update like", "error");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast("Please login to comment", "error");
      setTimeout(() => {
        navigate("/login", { state: { from: location } });
      }, 1200);
      return;
    }

    if (!commentText.trim()) return;

    try {
      const res = await addCommentPost(postId, commentText.trim());
      if (res?.success) {
        setCommentText("");
        fetchPost();
        addToast("Comment added!", "success");
      }
    } catch (err) {
      addToast("Failed to add comment", "error");
    }
  };

  const handleBookmark = () => {
    if (!user) {
      addToast("Please login to bookmark posts", "error");
      setTimeout(() => {
        navigate("/login", { state: { from: location } });
      }, 1200);
      return;
    }

    try {
      const saved = localStorage.getItem("codeexpo_bookmarked_post_ids");
      const next = saved ? new Set(JSON.parse(saved)) : new Set();
      if (next.has(postId)) {
        next.delete(postId);
        addToast("Post removed from saved bookmarks", "success");
      } else {
        next.add(postId);
        addToast("Post saved to bookmarks", "success");
      }
      localStorage.setItem("codeexpo_bookmarked_post_ids", JSON.stringify(Array.from(next)));
      setPost(prev => ({ ...prev })); 
    } catch (err) {
      addToast("Error saving bookmark", "error");
    }
  };

  const isBookmarked = () => {
    if (!user) return false;
    try {
      const saved = localStorage.getItem("codeexpo_bookmarked_post_ids");
      const next = saved ? new Set(JSON.parse(saved)) : new Set();
      return next.has(postId);
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="public-post-page-container loading" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--ce-bg)", color: "var(--ce-text)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div className="premium-spinner" style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid rgba(170, 59, 255, 0.15)", borderTopColor: "var(--ce-primary)", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: "0.9rem", color: "var(--ce-text-muted)" }}>Loading developer update...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="public-post-page-container error" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--ce-bg)", padding: "20px" }}>
        <div style={{ background: "var(--ce-surface-card)", border: "1px solid var(--ce-border)", padding: "30px", borderRadius: "16px", maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          <h2 style={{ color: "var(--ce-danger)", marginBottom: "12px", fontSize: "1.5rem" }}>Post Unavailable</h2>
          <p style={{ color: "var(--ce-text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>{error || "Post not found or has been deleted."}</p>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#fff", background: "var(--ce-primary)", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }}>
            <ArrowLeft size={16} /> Back to CodeExpo
          </Link>
        </div>
      </div>
    );
  }

  const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
  const hasImage = postImages.length > 0;

  return (
    <div className="public-post-page-container">
      {/* Toast Portal */}
      <div className="toast-portal-container" style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1100000, display: "flex", flexDirection: "column", gap: "8px" }}>
        {toasts.map(t => (
          <div key={t.id} className={`ce-toast toast-${t.type}`} style={{
            background: t.type === "error" ? "rgba(239, 68, 68, 0.9)" : "rgba(16, 185, 129, 0.9)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: "600",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            animation: "toastFadeIn 0.3s ease"
          }}>
            {t.message}
          </div>
        ))}
      </div>

      <header className="public-post-navbar">
        <Link to={user ? "/dashboard" : "/"} className="back-link-btn">
          <ArrowLeft size={16} /> <span>{user ? "Back to Workspace" : "Back to Home"}</span>
        </Link>
        <span className="navbar-logo-title">CodeExpo Social</span>
      </header>

      <main className="public-post-content-area">
        <motion.div 
          className="public-post-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ flexDirection: hasImage ? "row" : "column" }}
        >
          {/* Image carousel block */}
          {hasImage && (
            <div className="public-post-image-column">
              <div className="carousel-inner-track" style={{ transform: `translateX(-${activeImageIdx * 100}%)` }}>
                {postImages.map((src, i) => (
                  <img key={i} src={src} alt={`Media attachment ${i}`} />
                ))}
              </div>
              {postImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImageIdx(prev => (prev - 1 + postImages.length) % postImages.length)} 
                    className="carousel-control-btn left"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => setActiveImageIdx(prev => (prev + 1) % postImages.length)} 
                    className="carousel-control-btn right"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="carousel-dot-indicators">
                    {postImages.map((_, i) => (
                      <span key={i} className={`dot ${activeImageIdx === i ? "active" : ""}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Details / Comments column */}
          <div className="public-post-details-column" style={{ width: hasImage ? "380px" : "100%" }}>
            {/* Header / Author */}
            <div className="post-details-header">
              <div className="author-info-block">
                <div className="author-avatar-wrapper">
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt={post.author.username} />
                  ) : (
                    <div className="avatar-fallback-text">
                      {(post.author?.username || "D").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="author-name-meta">
                  <span className="username">@{post.author?.username || "developer"}</span>
                  <span className="title">{post.author?.title || "Developer"}</span>
                </div>
              </div>
            </div>

            {/* Scrollable details container */}
            <div className="post-scrollable-body">
              {/* Description */}
              <div className="post-description-bubble">
                <div className="bubble-avatar-wrapper">
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="Author" />
                  ) : (
                    <div className="avatar-fallback-text-small">
                      {(post.author?.username || "D").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="description-text">
                  <strong style={{ color: "var(--ce-text-h)" }}>@{post.author?.username}: </strong>
                  {post.content}
                </p>
              </div>

              <div className="post-divider" />

              {/* Comments list */}
              <div className="comments-stream-container">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((c, i) => (
                    <div key={i} className="comment-bubble-item">
                      <div className="comment-avatar-wrapper">
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.username} />
                        ) : (
                          <div className="avatar-fallback-text-small">
                            {(c.username || "D").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="comment-text">
                        <strong style={{ color: "var(--ce-text-h)" }}>@{c.username}: </strong>
                        {c.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="no-comments-prompt">No comments yet. Share your thoughts!</p>
                )}
              </div>
            </div>

            {/* Footer / Actions */}
            <div className="post-details-footer">
              <div className="actions-row">
                <div className="action-buttons-group">
                  <button 
                    onClick={handleLike} 
                    className="action-trigger-btn like" 
                    style={{ color: post.likes?.includes(user?.id || user?._id) ? "#ef4444" : "var(--ce-text)" }}
                  >
                    <Heart size={20} fill={post.likes?.includes(user?.id || user?._id) ? "#ef4444" : "none"} />
                  </button>

                  <div className="share-dropdown-trigger-container" style={{ position: "relative" }}>
                    <button 
                      onClick={() => setShareOpen(!shareOpen)} 
                      className="action-trigger-btn share"
                    >
                      <Share2 size={20} />
                    </button>
                    {shareOpen && (
                      <div className="share-dropdown-menu">
                        <button onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          addToast("Link copied to clipboard!", "success");
                          setShareOpen(false);
                        }}>
                          📋 Copy Link
                        </button>
                        <a 
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this post on CodeExpo: " + window.location.href)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => setShareOpen(false)}
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleBookmark} 
                  className="action-trigger-btn bookmark"
                  style={{ color: isBookmarked() ? "#3b82f6" : "var(--ce-text)" }}
                >
                  <Bookmark size={20} fill={isBookmarked() ? "#3b82f6" : "none"} />
                </button>
              </div>

              <div className="post-stats-summary">
                <span className="stat-likes">{(post.likes || []).length} likes</span>
                <span className="stat-date">{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Comment submission form */}
              <form onSubmit={handleAddComment} className="public-comment-form">
                <input 
                  type="text" 
                  placeholder={user ? "Add a comment..." : "Login to write comments..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onClick={() => {
                    if (!user) {
                      addToast("Please login to write a comment.", "error");
                      setTimeout(() => {
                        navigate("/login", { state: { from: location } });
                      }, 1200);
                    }
                  }}
                />
                <button type="submit" className="comment-submit-btn" disabled={!user || !commentText.trim()}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
