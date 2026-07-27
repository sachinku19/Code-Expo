import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPostById, toggleLikePost, addCommentPost } from "../services/socialService";
import socket from "../socket/socket";
import { 
  Heart, Bookmark, ChevronLeft, ChevronRight, MessageSquare, 
  Send, Share2, ArrowLeft, ShieldAlert, Sparkles, Copy, Check
} from "lucide-react";
import { motion } from "framer-motion";
import Logo from "../components/shared/Logo";
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [revealedSensitive, setRevealedSensitive] = useState(false);
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
        if (res.post.status === "hidden" || res.post.status === "deleted" || res.post.author?.isSuspended) {
          setError("This post is unavailable because it has been removed or hidden by the platform.");
        } else {
          setPost(res.post);
        }
      } else {
        setError("Post not found");
      }
    } catch (err) {
      console.error("Error fetching post:", err);
      setError("Failed to load post");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPost();

    const handlePostDeleted = ({ postId: deletedPostId }) => {
      if (String(deletedPostId) === String(postId)) {
        setError("This post is unavailable because it has been removed or hidden by the platform.");
      }
    };

    const handlePostLiked = ({ postId: likedPostId, likes }) => {
      if (String(likedPostId) === String(postId)) {
        setPost(prev => prev ? { ...prev, likes } : prev);
      }
    };

    const handlePostCommented = ({ postId: commentedPostId, comments }) => {
      if (String(commentedPostId) === String(postId)) {
        setPost(prev => prev ? { ...prev, comments } : prev);
      }
    };

    const handleAdminPostAction = ({ postId: updatedPostId, post: updatedPost }) => {
      if (String(updatedPostId) === String(postId)) {
        if (updatedPost.status === "hidden" || updatedPost.status === "deleted") {
          setError("This post is unavailable because it has been removed or hidden by the platform.");
        } else {
          setPost(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...updatedPost,
              author: prev.author
            };
          });
        }
      }
    };

    socket.on("post:deleted", handlePostDeleted);
    socket.on("post:liked", handlePostLiked);
    socket.on("post:commented", handlePostCommented);
    socket.on("admin-post-action", handleAdminPostAction);

    return () => {
      socket.off("post:deleted", handlePostDeleted);
      socket.off("post:liked", handlePostLiked);
      socket.off("post:commented", handlePostCommented);
      socket.off("admin-post-action", handleAdminPostAction);
    };
  }, [postId]);

  const requireAuth = (actionName = "perform this action") => {
    if (!user) {
      addToast(`Please log in to ${actionName}`, "error");
      setTimeout(() => {
        navigate("/login", { state: { from: location } });
      }, 1200);
      return false;
    }
    return true;
  };

  const handleLike = async () => {
    if (!requireAuth("like this post")) return;

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
    if (!requireAuth("comment on posts")) return;

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
    if (!requireAuth("bookmark posts")) return;

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0b0c10", color: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "50%", border: "3px solid rgba(139, 92, 246, 0.2)", borderTopColor: "#8b5cf6", animation: "spin 0.9s linear infinite" }} />
          <p style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: "500" }}>Loading developer update...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0b0c10", padding: "20px" }}>
        <div style={{ background: "rgba(18, 18, 26, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "36px", borderRadius: "20px", maxWidth: "420px", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
          <ShieldAlert size={48} style={{ color: "#ef4444", marginBottom: "16px" }} />
          <h2 style={{ color: "#fff", marginBottom: "10px", fontSize: "1.4rem", fontWeight: "700" }}>Post Unavailable</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: "1.5", marginBottom: "24px" }}>{error || "Post not found or has been deleted."}</p>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#fff", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: "10px 20px", borderRadius: "10px", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600", boxShadow: "0 6px 20px rgba(99,102,241,0.3)" }}>
            <ArrowLeft size={16} /> Return to CodeExpo
          </Link>
        </div>
      </div>
    );
  }

  const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
  const hasImage = postImages.length > 0;
  const postContentText = post.text || post.content || "";
  const currentUserId = user?.id || user?._id;
  const isLiked = post.likes ? post.likes.some(id => String(id) === String(currentUserId)) : false;

  return (
    <div style={{ minHeight: "100vh", background: "#090a0f", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Toast Portal */}
      <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 1100000, display: "flex", flexDirection: "column", gap: "10px" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === "error" ? "rgba(239, 68, 68, 0.95)" : "rgba(16, 185, 129, 0.95)",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: "600",
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <header style={{
        height: "64px",
        background: "rgba(13, 14, 22, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justify: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <Link 
          to={user ? "/dashboard" : "/"} 
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: "600",
            padding: "8px 14px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            transition: "all 0.2s"
          }}
        >
          <ArrowLeft size={16} /> <span>{user ? "Back to Workspace" : "Back to CodeExpo"}</span>
        </Link>
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Logo size={28} showText={true} />
        </div>
      </header>

      {/* Main Instagram-Style Post Area */}
      <main style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px" }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            background: "rgba(15, 16, 26, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(99, 102, 241, 0.15)",
            display: "flex",
            flexDirection: hasImage ? "row" : "column",
            minHeight: hasImage ? "600px" : "auto"
          }}
        >
          {/* Left Column: Media Attachment Carousel */}
          {hasImage && (
            <div style={{ flex: "1 1 60%", background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: "450px" }}>
              <img 
                src={postImages[activeImageIdx]} 
                alt={`Media attachment ${activeImageIdx}`} 
                style={{ width: "100%", height: "100%", maxHeight: "700px", objectFit: "contain", display: "block" }}
              />

              {postImages.length > 1 && (
                <>
                  <button 
                    onClick={() => setActiveImageIdx(prev => (prev - 1 + postImages.length) % postImages.length)} 
                    style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    onClick={() => setActiveImageIdx(prev => (prev + 1) % postImages.length)} 
                    style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <ChevronRight size={20} />
                  </button>
                  <div style={{ position: "absolute", bottom: "16px", display: "flex", gap: "6px" }}>
                    {postImages.map((_, i) => (
                      <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: activeImageIdx === i ? "#6366f1" : "rgba(255,255,255,0.4)" }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Right Column: Author, Description & Live Comments */}
          <div style={{ flex: hasImage ? "0 0 420px" : "1", display: "flex", flexDirection: "column", borderLeft: hasImage ? "1px solid rgba(255, 255, 255, 0.08)" : "none", background: "rgba(18, 19, 30, 0.98)" }}>
            
            {/* Header: Author Meta */}
            <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", overflow: "hidden", background: "rgba(99,102,241,0.15)", border: "1.5 solid #6366f1", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {post.author?.avatar ? (
                  <img src={post.author.avatar} alt={post.author.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#8b5cf6", fontWeight: "700", fontSize: "1.1rem" }}>
                    {(post.author?.username || "D").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#fff", fontWeight: "700", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "4px" }}>
                  @{post.author?.username || "developer"}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{post.author?.title || "Software Developer"}</span>
              </div>
            </div>

            {/* Scrollable Feed Container */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "460px" }}>
              {/* Caption bubble */}
              {postContentText && (
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {post.author?.avatar ? (
                      <img src={post.author.avatar} alt="Author" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#94a3b8", fontWeight: "600", fontSize: "0.85rem" }}>
                        {(post.author?.username || "D").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "12px 14px", borderRadius: "12px", flex: 1 }}>
                    <p style={{ margin: 0, color: "#e2e8f0", fontSize: "0.86rem", lineHeight: "1.5" }}>
                      <strong style={{ color: "#fff", marginRight: "6px" }}>@{post.author?.username}:</strong>
                      {postContentText}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

              {/* Comments list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.06)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {c.avatar ? (
                          <img src={c.avatar} alt={c.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: "#94a3b8", fontWeight: "600", fontSize: "0.75rem" }}>
                            {(c.username || "D").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.04)", padding: "10px 12px", borderRadius: "10px", flex: 1 }}>
                        <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.82rem", lineHeight: "1.4" }}>
                          <strong style={{ color: "#8b5cf6", marginRight: "6px" }}>@{c.username}:</strong>
                          {c.text}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "#64748b" }}>
                    <MessageSquare size={24} style={{ marginBottom: "8px", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "0.82rem" }}>No comments yet. Share your thoughts!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(13, 14, 22, 0.6)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                  <button 
                    onClick={handleLike} 
                    disabled={post.likesDisabled}
                    style={{ background: "none", border: "none", color: isLiked ? "#ef4444" : "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", padding: 0 }}
                  >
                    <Heart size={20} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "currentColor"} />
                  </button>

                  <div style={{ position: "relative" }}>
                    <button 
                      onClick={() => setShareOpen(!shareOpen)} 
                      style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                    >
                      <Share2 size={20} />
                    </button>
                    {shareOpen && (
                      <div style={{ position: "absolute", bottom: "35px", left: 0, background: "#181926", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "6px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 10, width: "150px" }}>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setCopiedLink(true);
                            addToast("Link copied to clipboard!", "success");
                            setTimeout(() => setCopiedLink(false), 2000);
                            setShareOpen(false);
                          }}
                          style={{ background: "none", border: "none", color: "#fff", width: "100%", padding: "8px 10px", textAlign: "left", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", borderRadius: "6px" }}
                        >
                          {copiedLink ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />} {copiedLink ? "Copied!" : "Copy Link"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleBookmark} 
                  style={{ background: "none", border: "none", color: isBookmarked() ? "#3b82f6" : "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                >
                  <Bookmark size={20} fill={isBookmarked() ? "#3b82f6" : "none"} color={isBookmarked() ? "#3b82f6" : "currentColor"} />
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "14px", fontWeight: "600" }}>
                <span>{(post.likes || []).length} likes</span>
                <span style={{ fontSize: "0.74rem", color: "#64748b" }}>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="text" 
                  placeholder={user ? "Add a comment..." : "Log in to write a comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  readOnly={!user}
                  onClick={() => {
                    if (!user) requireAuth("write a comment");
                  }}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "10px 14px", borderRadius: "10px", fontSize: "0.84rem", outline: "none" }}
                />
                <button 
                  type="submit" 
                  disabled={!user || !commentText.trim()} 
                  style={{ background: user && commentText.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.08)", border: "none", color: "#fff", width: "38px", height: "38px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: user && commentText.trim() ? "pointer" : "not-allowed", opacity: user && commentText.trim() ? 1 : 0.5 }}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
