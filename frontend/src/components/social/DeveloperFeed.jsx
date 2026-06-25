import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Trash2, Code, Plus, Sparkles } from "lucide-react";
import { createPost, getPosts, toggleLikePost, addCommentPost, deletePost } from "../../services/socialService";
import ProfileAvatar from "../ProfileAvatar";

export default function DeveloperFeed({ user, addToast }) {
  const [posts, setPosts] = useState([]);
  const [visiblePosts, setVisiblePosts] = useState(4);
  const [inputText, setInputText] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techChips, setTechChips] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [activeComments, setActiveComments] = useState({}); // postId: true/false
  const [commentInputs, setCommentInputs] = useState({}); // postId: text
  const [postToDelete, setPostToDelete] = useState(null); // Custom delete post modal
  const [isDeletingPost, setIsDeletingPost] = useState(false); // Spinner state for deleting post

  const fetchPosts = async () => {
    try {
      const res = await getPosts(1, 20);
      if (res.success) {
        setPosts(res.posts || []);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAddTechChip = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const chip = techInput.trim().replace(/,/g, "");
      if (chip && !techChips.includes(chip)) {
        setTechChips([...techChips, chip]);
      }
      setTechInput("");
    }
  };

  const handleRemoveChip = (chipToRemove) => {
    setTechChips(techChips.filter(c => c !== chipToRemove));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsPosting(true);
    try {
      const res = await createPost({
        text: inputText,
        techStack: techChips
      });
      if (res.success) {
        addToast("Update shared to Developer Feed!", "success");
        setInputText("");
        setTechChips([]);
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikePost = async (postId) => {
    // Optimistic UI update
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const isAlreadyLiked = post.likes.includes(user?.id || user?._id);
        const updatedLikes = isAlreadyLiked 
          ? post.likes.filter(id => id !== (user?.id || user?._id))
          : [...post.likes, (user?.id || user?._id)];
        return { ...post, likes: updatedLikes };
      }
      return post;
    }));

    try {
      await toggleLikePost(postId);
    } catch (err) {
      // Revert if error
      fetchPosts();
      addToast("Failed to toggle like status", "error");
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    // Optimistic UI update for comments
    const tempComment = {
      _id: String(Date.now()),
      user: user?.id || user?._id,
      username: user?.username || "You",
      avatar: user?.avatar || "",
      text: commentText,
      createdAt: new Date()
    };

    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        return { ...post, comments: [...post.comments, tempComment] };
      }
      return post;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));

    try {
      const res = await addCommentPost(postId, commentText);
      if (res.success) {
        setPosts(prev => prev.map(post => {
          if (post._id === postId) {
            return { ...post, comments: res.comments };
          }
          return post;
        }));
      }
    } catch (err) {
      fetchPosts();
      addToast("Failed to post comment", "error");
    }
  };

  const handleDeletePostClick = (postId) => {
    if (!postId) return;
    setPostToDelete(postId);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      const res = await deletePost(postToDelete);
      if (res.success) {
        addToast(res.message || "Post deleted successfully", "success");
        setPosts(prev => prev.filter(post => post._id !== postToDelete));
        setPostToDelete(null);
      }
    } catch (err) {
      addToast("Failed to delete post", "error");
    } finally {
      setIsDeletingPost(false);
    }
  };

  return (
    <div className="dev-feed-container">
      {/* Create Post Card */}
      <form onSubmit={handleCreatePost} className="feed-creator-card">
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} className="feed-avatar-img" />
          ) : (
            <div className="feed-avatar-placeholder" style={{ backgroundColor: "#8b5cf6" }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <textarea
              placeholder="Today I built... Share your coding achievements or rooms!"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="feed-textarea"
              rows={3}
              required
            />
          </div>
        </div>

        {/* Tech Stack Chips Input */}
        <div className="tech-chips-input-container">
          <div className="chips-row">
            {techChips.map(c => (
              <span key={c} className="tech-chip-active">
                {c} <button type="button" onClick={() => handleRemoveChip(c)}>&times;</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Code size={14} style={{ color: "var(--ce-primary)" }} />
            <input
              type="text"
              placeholder="Add tech stack tag (Press Enter)..."
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={handleAddTechChip}
              className="tech-input-box"
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button type="submit" disabled={isPosting} className="dev-btn-message" style={{ width: "auto" }}>
            {isPosting ? "Posting..." : "Share Update"}
          </button>
        </div>
      </form>

      {/* Render Posts List */}
      <div className="feed-posts-list">
        {posts.length === 0 ? (
          <div className="empty-state-card" style={{ padding: "40px 24px" }}>
            <Sparkles size={32} className="empty-state-icon" style={{ color: "var(--ce-text-muted)", marginBottom: "16px" }} />
            <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)" }}>Feed is quiet</h3>
            <p style={{ margin: 0, color: "var(--ce-text-muted)", fontSize: "0.82rem" }}>No posts yet. Be the first to share an update about what you are building!</p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.slice(0, visiblePosts).map(post => {
              if (!post.author) return null;
              const hasLiked = post.likes.includes(user?.id || user?._id);
              const showComments = activeComments[post._id];
              const isOwner = String(post.author._id) === String(user?.id || user?._id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={post._id}
                  className="feed-post-card"
                >
                  {/* Post Header */}
                  <div className="post-header-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.username} className="feed-avatar-img" />
                      ) : (
                        <div className="feed-avatar-placeholder" style={{ backgroundColor: "#6366f1" }}>
                          {post.author.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="post-username">@{post.author.username}</span>
                          <span className="post-level-tag">Lvl {post.author.developerLevel || 1}</span>
                          {post.author.status === "Coding" && (
                            <span className="post-status-coding">💻 Coding</span>
                          )}
                        </div>
                        <span className="post-title-text">{post.author.title || "Developer"}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="post-time">{new Date(post.createdAt).toLocaleDateString()}</span>
                      {isOwner && (
                        <button onClick={() => handleDeletePostClick(post._id)} className="post-delete-btn" aria-label="Delete post">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Body */}
                  <div className="post-body">
                    <p className="post-text">{post.text}</p>
                    {post.techStack && post.techStack.length > 0 && (
                      <div className="post-tags-row">
                        {post.techStack.map(tag => (
                          <span key={tag} className="post-tech-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Post Actions (Likes, Comments Count) */}
                  <div className="post-actions-toolbar">
                    <button 
                      onClick={() => handleLikePost(post._id)} 
                      className={`post-action-btn ${hasLiked ? "liked" : ""}`}
                    >
                      <Heart size={14} fill={hasLiked ? "var(--ce-danger, #ef4444)" : "none"} />
                      <span>{post.likes.length} Like{post.likes.length !== 1 ? 's' : ''}</span>
                    </button>

                    <button 
                      onClick={() => setActiveComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))} 
                      className="post-action-btn"
                    >
                      <MessageSquare size={14} />
                      <span>{post.comments.length} Comment{post.comments.length !== 1 ? 's' : ''}</span>
                    </button>
                  </div>

                  {/* Comment Thread Expansion */}
                  {showComments && (
                    <div className="post-comments-section">
                      <div className="comments-list">
                        {post.comments.map(comment => (
                          <div key={comment._id} className="comment-item-card">
                            {comment.avatar ? (
                              <img src={comment.avatar} alt={comment.username} className="comment-avatar" />
                            ) : (
                              <div className="comment-avatar-fallback">
                                {comment.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="comment-bubble">
                              <div className="comment-meta">
                                <span className="comment-username">@{comment.username}</span>
                                <span className="comment-time">{new Date(comment.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p className="comment-text-body">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment Input form */}
                      <form onSubmit={(e) => handleAddComment(e, post._id)} className="comment-input-form">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentInputs[post._id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                          className="comment-input-box"
                        />
                        <button type="submit" className="comment-send-btn" aria-label="Send comment">
                          <Send size={12} />
                        </button>
                      </form>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {posts.length > visiblePosts && (
          <button
            onClick={() => setVisiblePosts(prev => prev + 4)}
            className="feed-load-more-btn"
            style={{ marginTop: "20px" }}
          >
            Load More Activity
          </button>
        )}
      </div>

      {/* Delete Post Custom Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="ce-modal-overlay" onClick={() => setPostToDelete(null)} style={{ zIndex: 10005 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="ce-modal-card"
              style={{ maxWidth: "380px", width: "90%", padding: "20px", textAlign: "center", background: "var(--ce-bg-card, rgba(16, 16, 22, 0.95))", border: "1px solid var(--ce-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)", fontSize: "1.1rem", fontWeight: "700" }}>Delete Post?</h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--ce-text-muted)", fontSize: "0.82rem", lineHeight: "1.4" }}>
                Are you sure you want to delete this post? This action cannot be undone and your post will be permanently removed from the developer feed.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setPostToDelete(null)}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid var(--ce-border)",
                    background: "transparent",
                    color: "var(--ce-text)",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeletePost}
                  disabled={isDeletingPost}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--ce-danger, #ef4444)",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    cursor: isDeletingPost ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    opacity: isDeletingPost ? 0.7 : 1
                  }}
                >
                  {isDeletingPost ? (
                    <>
                      <span className="btn-spinner" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
