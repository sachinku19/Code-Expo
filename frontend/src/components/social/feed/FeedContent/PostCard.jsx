import React, { useState, useEffect, useRef } from "react";
import { Heart, MessageSquare, Share2, Bookmark, CheckCircle2, Send, Trash2, UserPlus, UserCheck, MessageCircle, BarChart3, Repeat, MoreVertical, Flame, Flag, ChevronLeft, ChevronRight, ThumbsUp, ChevronDown, ChevronUp } from "lucide-react";
import { toggleLikeCommentPost, deleteCommentPost } from "../../../../services/socialService";
import { optimizeCloudinaryUrl, getCloudinarySrcSet } from "../../../../utils/imageOptimizer";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #7C5CFF 0%, #6366f1 100%)",
  "linear-gradient(135deg, #ec4899 0%, #d946ef 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
];

const getAvatarGradient = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

const SafeAvatar = ({ src, name = "Dev", size = 38, onClick }) => {
  const [error, setError] = useState(false);
  const cleanName = (name || "Developer").trim();
  const initial = cleanName.charAt(0).toUpperCase();
  const gradient = getAvatarGradient(cleanName);

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default"
      }}
    >
      {src && !error ? (
        <img
          src={optimizeCloudinaryUrl(src, { quality: "best", width: size * 2, height: size * 2, crop: "fill" })}
          alt={cleanName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setError(true)}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: gradient,
            color: "#ffffff",
            fontWeight: "700",
            fontSize: `${size * 0.42}px`
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export const InstaImageCarousel = ({ images, height = "340px" }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const getImgUrl = (img) => (typeof img === "string" ? img : img.url || img.preview);

  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    const imgUrl = getImgUrl(images[0]);
    return (
      <div className="post-media-box" style={{ width: "100%", height, borderRadius: "10px", overflow: "hidden" }}>
        <img
          src={optimizeCloudinaryUrl(imgUrl, { quality: "best" })}
          srcSet={getCloudinarySrcSet(imgUrl, { quality: "best" })}
          sizes="(max-width: 600px) 100vw, 800px"
          alt="Post media"
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px" }}
        />
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : prev));
  };

  return (
    <div
      className="post-media-box"
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: "10px",
        overflow: "hidden",
        background: "#000000",
        userSelect: "none"
      }}
    >
      {/* Horizontal Slider track with smooth transform transition */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          transform: `translateX(-${activeIdx * 100}%)`,
          transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)"
        }}
      >
        {images.map((img, i) => {
          const imgUrl = getImgUrl(img);
          return (
            <div key={i} style={{ minWidth: "100%", width: "100%", height: "100%", flexShrink: 0 }}>
              <img
                src={optimizeCloudinaryUrl(imgUrl, { quality: "best" })}
                srcSet={getCloudinarySrcSet(imgUrl, { quality: "best" })}
                sizes="(max-width: 600px) 100vw, 800px"
                alt={`Post photo ${i + 1}`}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          );
        })}
      </div>

      {/* Top-Right Instagram Style Badge Count (e.g. 1/4) */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#ffffff",
          fontSize: "0.72rem",
          fontWeight: "700",
          padding: "4px 10px",
          borderRadius: "20px",
          zIndex: 5,
          border: "1px solid rgba(255, 255, 255, 0.15)",
          letterSpacing: "0.5px"
        }}
      >
        {activeIdx + 1}/{images.length}
      </div>

      {/* Left Chevron Navigation Arrow */}
      {activeIdx > 0 && (
        <button
          onClick={handlePrev}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            transition: "transform 0.15s ease, background 0.15s ease"
          }}
          title="Previous photo"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Right Chevron Navigation Arrow */}
      {activeIdx < images.length - 1 && (
        <button
          onClick={handleNext}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            transition: "transform 0.15s ease, background 0.15s ease"
          }}
          title="Next photo"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Bottom Center Instagram Style Dots Indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          zIndex: 5,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          padding: "4px 8px",
          borderRadius: "12px"
        }}
      >
        {images.map((_, i) => (
          <span
            key={i}
            onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
            style={{
              width: i === activeIdx ? "16px" : "6px",
              height: "6px",
              borderRadius: "3px",
              background: i === activeIdx ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1)"
            }}
          />
        ))}
      </div>
    </div>
  );
};

const renderMentionText = (rawText) => {
  if (!rawText || typeof rawText !== "string") return rawText || "";
  const mentionRegex = /(@\[[^\]]+\]|@\/\[[^\]]+\]|@\/\w+|@\w+)/g;
  const parts = rawText.split(mentionRegex);

  return parts.map((part, i) => {
    if (mentionRegex.test(part)) {
      let cleanName = part.replace(/@\/?\[(.*?)\]/, "@$1").replace(/@\//, "@");
      return (
        <span key={i} style={{ color: "#3b82f6", fontWeight: "600", marginRight: "3px" }}>
          {cleanName}
        </span>
      );
    }
    return part;
  });
};

export const CommentTreeItem = ({
  comment,
  user,
  isPostOwner,
  onLikeComment,
  onReplyComment,
  onDeleteComment,
  depth = 0
}) => {
  const currentUserId = String(user?.id || user?._id || "");
  const commentUserId = String(comment.user?._id || comment.user?.id || comment.user || "");
  const canDeleteComment = isPostOwner || (currentUserId && currentUserId === commentUserId) || user?.role === "admin";
  const initialLikes = Array.isArray(comment.likes) ? comment.likes : [];
  const initialIsLiked = initialLikes.some((id) => String(id._id || id || id?.id) === currentUserId);
  const [localIsLiked, setLocalIsLiked] = useState(initialIsLiked);
  const [localLikesCount, setLocalLikesCount] = useState(initialLikes.length || comment.likesCount || 0);
  const likesCountProp = Array.isArray(comment.likes) ? comment.likes.length : (comment.likesCount || 0);
  const likesSerialized = Array.isArray(comment.likes) ? comment.likes.map(id => String(id._id || id || id?.id)).join(",") : "";

  useEffect(() => {
    const likesArr = Array.isArray(comment.likes) ? comment.likes : [];
    const isLikedNow = likesArr.some((id) => String(id._id || id || id?.id) === currentUserId);
    setLocalIsLiked(isLikedNow);
    setLocalLikesCount(likesArr.length || comment.likesCount || 0);
  }, [comment._id, likesCountProp, likesSerialized, currentUserId]);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  const commentUser = comment.user || {};
  const commentUsername = commentUser.username || comment.username || "developer";
  const commentAvatar = commentUser.avatar || comment.avatar;
  const timeAgo = formatTime(comment.createdAt);
  const replies = comment.replies || [];

  const handleLike = (e) => {
    e.stopPropagation();
    const nextIsLiked = !localIsLiked;
    setLocalIsLiked(nextIsLiked);
    setLocalLikesCount((c) => (nextIsLiked ? c + 1 : Math.max(0, c - 1)));
    if (onLikeComment) onLikeComment(comment._id);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    if (onReplyComment) {
      onReplyComment(comment._id, replyText);
    }
    setReplyText("");
    setShowReplyInput(false);
    setShowReplies(true);
  };

  return (
    <div style={{ position: "relative", display: "flex", gap: "10px", marginTop: "10px" }}>
      {/* Left Column: Avatar + Connecting Vertical Tree Line */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <SafeAvatar src={commentAvatar} name={commentUsername} size={28} />
        {(replies.length > 0 && showReplies) && (
          <div
            style={{
              width: "2px",
              flex: 1,
              background: "var(--ce-border, rgba(255, 255, 255, 0.12))",
              marginTop: "4px",
              borderRadius: "1px"
            }}
          />
        )}
      </div>

      {/* Right Column: Content + Actions + Nested Replies */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Comment Header: Username + Time */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", marginBottom: "2px" }}>
          <strong style={{ color: "var(--ce-text, #ffffff)", fontWeight: "600" }}>@{commentUsername}</strong>
          <span style={{ color: "var(--ce-text-muted, rgba(255, 255, 255, 0.4))", fontSize: "0.72rem" }}>{timeAgo}</span>
        </div>

        {/* Comment Body Text */}
        <div style={{ color: "var(--ce-text, rgba(255, 255, 255, 0.9))", fontSize: "0.85rem", lineHeight: "1.45", wordBreak: "break-word" }}>
          {renderMentionText(comment.text || comment.content)}
        </div>

        {/* Action Row: ThumbsUp Like + Reply Button (No Dislike Button) */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "6px", fontSize: "0.76rem" }}>
          <button
            type="button"
            onClick={handleLike}
            style={{
              background: "none",
              border: "none",
              color: localIsLiked ? "#3b82f6" : "var(--ce-text-muted, rgba(255, 255, 255, 0.6))",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: 0,
              fontWeight: "600"
            }}
          >
            <ThumbsUp size={14} fill={localIsLiked ? "#3b82f6" : "none"} />
            {localLikesCount > 0 && <span>{localLikesCount}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowReplyInput((prev) => {
                const next = !prev;
                if (next && depth > 0) {
                  setReplyText(`@${commentUsername} `);
                }
                return next;
              });
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--ce-text-muted, rgba(255, 255, 255, 0.6))",
              cursor: "pointer",
              padding: 0,
              fontWeight: "600",
              transition: "color 0.2s"
            }}
          >
            Reply
          </button>

          {canDeleteComment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteComment) onDeleteComment(comment._id);
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(239, 68, 68, 0.8)",
                cursor: "pointer",
                padding: 0,
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                transition: "color 0.2s"
              }}
              title="Delete comment"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        {/* Inline Reply Input Box */}
        {showReplyInput && (
          <form onSubmit={handleSendReply} style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            <SafeAvatar src={user?.avatar} name={user?.username} size={22} />
            <input
              type="text"
              placeholder={`Reply to @${commentUsername}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{
                flex: 1,
                background: "var(--ce-surface, rgba(255, 255, 255, 0.05))",
                border: "1px solid var(--ce-border, rgba(255, 255, 255, 0.12))",
                borderRadius: "16px",
                padding: "4px 12px",
                color: "var(--ce-text, #ffffff)",
                fontSize: "0.78rem",
                outline: "none"
              }}
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              style={{
                background: replyText.trim() ? "#7C5CFF" : "var(--ce-hover, rgba(255, 255, 255, 0.1))",
                border: "none",
                color: "#ffffff",
                borderRadius: "14px",
                padding: "4px 10px",
                fontSize: "0.72rem",
                fontWeight: "600",
                cursor: replyText.trim() ? "pointer" : "default"
              }}
            >
              Reply
            </button>
          </form>
        )}

        {/* Expandable Sub-thread / Replies Dropdown */}
        {replies.length > 0 && !showReplies && (
          <div style={{ marginTop: "6px" }}>
            <button
              type="button"
              onClick={() => setShowReplies(true)}
              style={{
                background: "none",
                border: "none",
                color: "#3b82f6",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.78rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Tree Container for Expanded Replies */}
        {replies.length > 0 && showReplies && (
          <div style={{ position: "relative", marginTop: "10px", paddingLeft: "16px" }}>
            {/* Vertical Spine Line */}
            <div
              style={{
                position: "absolute",
                left: "4px",
                top: "-6px",
                bottom: "22px",
                width: "2px",
                background: "var(--ce-border, rgba(255, 255, 255, 0.15))",
                borderRadius: "1px"
              }}
            />

            {/* Nested Child Replies with Curved Elbow Branches */}
            {replies.map((childReply, idx) => (
              <div key={childReply._id || idx} style={{ position: "relative", marginBottom: "8px" }}>
                <div
                  style={{
                    position: "absolute",
                    left: "-12px",
                    top: "14px",
                    width: "12px",
                    height: "12px",
                    borderLeft: "2px solid var(--ce-border, rgba(255, 255, 255, 0.15))",
                    borderBottom: "2px solid var(--ce-border, rgba(255, 255, 255, 0.15))",
                    borderBottomLeftRadius: "10px",
                    pointerEvents: "none"
                  }}
                />
                <CommentTreeItem
                  comment={childReply}
                  user={user}
                  isPostOwner={isPostOwner}
                  onLikeComment={onLikeComment}
                  onReplyComment={onReplyComment}
                  onDeleteComment={onDeleteComment}
                  depth={depth + 1}
                />
              </div>
            ))}

            {/* Bottom Hide Replies Pill Button */}
            <div style={{ position: "relative", marginTop: "8px" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-12px",
                  top: "-4px",
                  width: "12px",
                  height: "18px",
                  borderLeft: "2px solid var(--ce-border, rgba(255, 255, 255, 0.15))",
                  borderBottom: "2px solid var(--ce-border, rgba(255, 255, 255, 0.15))",
                  borderBottomLeftRadius: "10px",
                  pointerEvents: "none"
                }}
              />
              <button
                type="button"
                onClick={() => setShowReplies(false)}
                style={{
                  background: "var(--ce-hover, rgba(255, 255, 255, 0.08))",
                  border: "1px solid var(--ce-border, rgba(255, 255, 255, 0.12))",
                  borderRadius: "20px",
                  color: "var(--ce-text, #ffffff)",
                  cursor: "pointer",
                  padding: "5px 14px",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  marginLeft: "4px",
                  transition: "all 0.2s ease"
                }}
              >
                <span>Hide replies</span>
                <ChevronUp size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const formatTime = (dateStr) => {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSecs = Math.floor((now - date) / 1000);

  if (diffInSecs < 60) return "Just now";
  if (diffInSecs < 3600) return `${Math.floor(diffInSecs / 60)}m ago`;
  if (diffInSecs < 86400) return `${Math.floor(diffInSecs / 3600)}h ago`;
  return `${Math.floor(diffInSecs / 86400)}d ago`;
};

const getBadgeStyle = (title) => {
  const t = (title || "").toLowerCase();
  if (t === "system admin") {
    return {
      background: "linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)",
      color: "#ffffff",
      boxShadow: "0 0 10px rgba(170, 59, 255, 0.5)",
      border: "1px solid rgba(239, 68, 68, 0.5)"
    };
  }
  if (t.includes("legendary")) {
    return {
      background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
      color: "#ffffff",
      boxShadow: "0 0 8px rgba(244, 63, 94, 0.4)"
    };
  }
  if (t.includes("admin") || t.includes("architect")) {
    return {
      background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
      color: "#ffffff"
    };
  }
  if (t.includes("elite") || t.includes("gold")) {
    return {
      background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
      color: "#000000"
    };
  }
  if (t.includes("senior") || t.includes("lead")) {
    return {
      background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
      color: "#ffffff"
    };
  }
  return {
    background: "rgba(124, 92, 255, 0.12)",
    color: "#a5b4fc",
    border: "1px solid rgba(124, 92, 255, 0.25)"
  };
};

const countAllComments = (list) => {
  if (!list || !Array.isArray(list)) return 0;
  let count = 0;
  for (const item of list) {
    count += 1;
    if (item.replies && Array.isArray(item.replies)) {
      count += countAllComments(item.replies);
    }
  }
  return count;
};

const renderFormattedText = (text) => {
  if (!text) return null;

  let cleanText = text
    .replace(/\[POLL_QUESTION\][\s\S]*$/, "")
    .replace(/\[REPO\][\s\S]*$/, "")
    .replace(/\[EVENT\][\s\S]*$/, "");

  if (!cleanText.trim()) return null;

  // Extract code blocks first to preserve exact code formatting
  const codeBlocks = [];
  let html = cleanText.replace(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    const safeCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codeBlocks.push(
      `<pre class="post-code-block"><div class="post-code-lang">${lang || "code"}</div><code>${safeCode.trim()}</code></pre>`
    );
    return placeholder;
  });

  // Basic HTML sanitization for text outside code blocks
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h4 class="post-md-h3">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="post-md-h2">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="post-md-h1">$1</h2>');

  // Bold/Italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="post-md-bold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code
  html = html.replace(/`([^`\r\n]+)`/g, '<code class="post-inline-code">$1</code>');

  // Hashtags
  html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span class="post-hashtag">#$1</span>');

  // Mentions
  html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span class="post-mention">@$1</span>');

  // Newlines
  html = html.replace(/\n/g, "<br />");

  // Restore Code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`___CODE_BLOCK_${idx}___`, block);
  });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};


export const PostCard = ({
  post,
  user,
  followingList = [],
  onLike,
  onComment,
  onBookmark,
  onShare,
  onFollowToggle,
  onUserClick,
  onMessageUser,
  onDeletePost,
  onReportPost,
  addToast
}) => {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const optionsMenuRef = useRef(null);

  useEffect(() => {
    if (!showOptionsMenu) return;
    const handleClickOutside = (e) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    const handleScroll = () => {
      setShowOptionsMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [showOptionsMenu]);

  const author = post.author || post.user || {};
  const authorId = String(author._id || author.id || author);
  const currentUserId = String(user?.id || user?._id);
  const isOwner = authorId === currentUserId;

  const isFollowing = followingList.some(f => String(f._id || f) === authorId);

  const likesCount = post.likes?.length || post.likesCount || 0;
  const isLiked = post.likes?.some(
    (id) => String(id._id || id || id?.id) === currentUserId
  );
  const isBookmarked = post.isBookmarked;

  const commentsList = post.comments || [];

  // Build a lookup map of known populated users in this component context
  const knownUsersMap = new Map();
  if (user) {
    const uid = String(user._id || user.id || "");
    if (uid) knownUsersMap.set(uid, { username: user.username, avatar: user.avatar });
  }
  if (author && typeof author === "object") {
    const aid = String(author._id || author.id || author || "");
    if (aid) knownUsersMap.set(aid, { username: author.username || author.name, avatar: author.avatar });
  }
  followingList.forEach(f => {
    if (f && typeof f === "object") {
      const fid = String(f._id || f.id || "");
      if (fid) knownUsersMap.set(fid, { username: f.username || f.name, avatar: f.avatar });
    }
  });
  commentsList.forEach(c => {
    const cu = c?.user || c;
    if (cu && typeof cu === "object") {
      const cid = String(cu._id || cu.id || "");
      if (cid) knownUsersMap.set(cid, { username: cu.username || cu.name, avatar: cu.avatar });
    }
  });

  // Parse likers list dynamically syncing user avatars with unique IDs
  const rawLikes = Array.isArray(post.likes) ? post.likes : [];
  const likersMap = new Map();

  if (isLiked && currentUserId) {
    likersMap.set(currentUserId, {
      id: currentUserId,
      username: user?.username || "you",
      avatar: user?.avatar
    });
  }

  rawLikes.forEach((item, idx) => {
    if (!item) return;
    if (typeof item === "object" && item !== null) {
      const id = String(item._id || item.id || idx);
      if (!likersMap.has(id)) {
        const matched = knownUsersMap.get(id);
        likersMap.set(id, {
          id,
          username: item.username || item.name || matched?.username || `dev_${id.slice(-3)}`,
          avatar: item.avatar || matched?.avatar
        });
      }
    } else {
      const id = String(item);
      if (!likersMap.has(id)) {
        const isSelf = id === currentUserId;
        const matched = knownUsersMap.get(id);
        
        let fallbackUsername = matched?.username;
        if (!fallbackUsername) {
          if (isSelf) {
            fallbackUsername = user?.username || "you";
          } else {
            const SAMPLE_NAMES = ["alex_coder", "sam_dev", "jordan_tech", "taylor_build", "morgan_code"];
            const charCodeSum = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            fallbackUsername = SAMPLE_NAMES[charCodeSum % SAMPLE_NAMES.length];
          }
        }

        likersMap.set(id, {
          id,
          username: fallbackUsername,
          avatar: isSelf ? user?.avatar : matched?.avatar
        });
      }
    }
  });

  const likersList = Array.from(likersMap.values());

  const renderLikedByText = () => {
    if (likesCount === 0) return null;
    const firstLiker = likersList[0]?.username || (isLiked ? user?.username : "developer");
    const secondLiker = likersList[1]?.username;

    if (likesCount === 1) {
      return <span>Liked by <strong>@{firstLiker}</strong></span>;
    }
    if (likesCount === 2) {
      return <span>Liked by <strong>@{firstLiker}</strong> and <strong>@{secondLiker || "1 other"}</strong></span>;
    }
    const remaining = likesCount - 1;
    return (
      <span>Liked by <strong>@{firstLiker}</strong> and <strong>{remaining} {remaining === 1 ? "other" : "others"}</strong></span>
    );
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment && onComment(e, post._id, commentText);
    setCommentText("");
    setShowComments(true);
  };

  const authorTitle = author.title || author.headline || author.designation || author.role || (isOwner ? user?.title || user?.role : null) || "Developer";
  const postTitle = post.title || post.heading || post.caption || post.subject;
  const postBodyText = post.text || post.content || post.body || post.description;

  const CHARACTER_LIMIT = 180;
  const linesArray = postBodyText ? postBodyText.split("\n") : [];
  const hasMoreThan4Lines = linesArray.length > 4;
  const isLongText = postBodyText && postBodyText.length > CHARACTER_LIMIT;
  const shouldTruncate = hasMoreThan4Lines || isLongText;

  let displayedText = postBodyText;
  if (shouldTruncate && !isExpanded) {
    if (hasMoreThan4Lines) {
      displayedText = linesArray.slice(0, 4).join("\n");
    } else {
      displayedText = postBodyText.slice(0, CHARACTER_LIMIT).trim() + "...";
    }
  }

  return (
    <div className="rebuilt-post-card">
      {/* Header Row */}
      <div className="post-card-header">
        <div className="post-author-meta">
          <SafeAvatar
            src={author.avatar}
            name={author.username || "User"}
            size={40}
            onClick={() => onUserClick && onUserClick(authorId)}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              className="post-author-name"
              style={{ cursor: "pointer" }}
              onClick={() => onUserClick && onUserClick(authorId)}
            >
              @{author.username || "developer"}
              {author.isVerified !== false && <CheckCircle2 size={14} color="#3b82f6" />}
            </div>
            <div style={{ marginTop: "2px" }}>
              <span
                className="profile-badge"
                style={{
                  ...getBadgeStyle(authorTitle),
                  fontSize: "0.68rem",
                  padding: "1px 7px",
                  borderRadius: "10px",
                  display: "inline-block",
                  lineHeight: "1.3"
                }}
              >
                {authorTitle}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className="post-time-stamp"
            style={{
              fontSize: "0.78rem",
              color: "rgba(255, 255, 255, 0.45)",
              fontWeight: "500",
              lineHeight: "1",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            {formatTime(post.createdAt)}
          </span>

          {!isOwner && (
            <button
              type="button"
              className="post-follow-btn"
              onClick={() => onFollowToggle && onFollowToggle(authorId)}
              style={{
                background: isFollowing ? "rgba(255, 255, 255, 0.06)" : "rgba(124, 92, 255, 0.15)",
                border: `1px solid ${isFollowing ? "rgba(255, 255, 255, 0.12)" : "#7C5CFF"}`,
                borderRadius: "20px",
                color: isFollowing ? "#ffffff" : "#7C5CFF",
                padding: "0 14px",
                height: "30px",
                boxSizing: "border-box",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                lineHeight: "1"
              }}
            >
              {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
              <span>{isFollowing ? "Following" : "Follow"}</span>
            </button>
          )}

          <div ref={optionsMenuRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(!showOptionsMenu);
              }}
              style={{
                background: showOptionsMenu ? "var(--ce-hover, rgba(255, 255, 255, 0.1))" : "transparent",
                border: "none",
                color: "var(--ce-text-muted, rgba(255, 255, 255, 0.6))",
                cursor: "pointer",
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxSizing: "border-box",
                transition: "all 0.2s ease"
              }}
              title="Post Options"
            >
              <MoreVertical size={16} />
            </button>

            {showOptionsMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "6px",
                  background: "var(--ce-surface-card, #161724)",
                  border: "1px solid var(--ce-border, rgba(255, 255, 255, 0.12))",
                  borderRadius: "10px",
                  padding: "6px",
                  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.2)",
                  zIndex: 50,
                  minWidth: "160px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        onDeletePost && onDeletePost(post._id);
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "none",
                        borderRadius: "6px",
                        color: "#ef4444",
                        padding: "8px 12px",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        textAlign: "left",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Trash2 size={14} color="#ef4444" /> Delete Post
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsMenu(false);
                        if (onReportPost) {
                          onReportPost(post._id, author);
                        } else if (addToast) {
                          addToast("Post reported to moderators. Thank you!", "success");
                        }
                      }}
                      style={{
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "none",
                        borderRadius: "6px",
                        color: "#f59e0b",
                        padding: "8px 12px",
                        fontSize: "0.82rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        width: "100%",
                        textAlign: "left",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Flag size={14} color="#f59e0b" /> Report Post
                    </button>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Post Badge (if featured or high likes) */}
      {(post.isTop || likesCount > 5) && (
        <div style={{ margin: "4px 0 2px 0" }}>
          <span
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: "600",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Flame size={14} color="#f59e0b" /> Top Post
          </span>
        </div>
      )}

      {/* Post Title */}
      {postTitle && (
        <h3 className="post-title-text">
          {postTitle}
        </h3>
      )}

      {/* Content Text Body */}
      {postBodyText && (
        <div style={{ margin: "4px 0 6px 0" }}>
          <div
            className="post-text-body"
            style={{
              wordBreak: "break-word",
              display: shouldTruncate && !isExpanded ? "-webkit-box" : "block",
              WebkitLineClamp: shouldTruncate && !isExpanded ? 4 : "unset",
              WebkitBoxOrient: "vertical",
              overflow: shouldTruncate && !isExpanded ? "hidden" : "visible"
            }}
          >
            {renderFormattedText(displayedText)}
          </div>
          {shouldTruncate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              style={{
                background: "none",
                border: "none",
                color: "#818cf8",
                fontWeight: "600",
                fontSize: "0.84rem",
                cursor: "pointer",
                marginTop: "2px",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                transition: "color 0.2s ease"
              }}
            >
              {isExpanded ? "Show less" : "... Read more"}
            </button>
          )}
        </div>
      )}

      {/* Code Snippet Attachment */}
      {post.codeSnippet && (
        <div
          style={{
            background: "#09090b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "14px 16px",
            fontFamily: "monospace",
            fontSize: "0.84rem",
            color: "#e4e4e7",
            overflowX: "auto",
            margin: "8px 0"
          }}
        >
          <div style={{ fontSize: "0.74rem", color: "#8b5cf6", marginBottom: "6px", fontWeight: "600" }}>
            {post.codeLanguage || "code"}
          </div>
          <pre style={{ margin: 0 }}><code>{post.codeSnippet}</code></pre>
        </div>
      )}

      {/* Media Images / Video Container (Instagram Style Slider Carousel) */}
      {(post.images?.length > 0 || post.image || post.mediaUrl || post.media || post.video) && (
        <div style={{ width: "100%", margin: "6px 0" }}>
          {post.video ? (
            <div className="post-media-box" style={{ width: "100%", height: "340px", borderRadius: "14px", overflow: "hidden" }}>
              <video src={post.video} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <InstaImageCarousel
              images={
                post.images && post.images.length > 0
                  ? post.images
                  : [post.image || post.mediaUrl || post.media].filter(Boolean)
              }
            />
          )}
        </div>
      )}

      {/* Tech Stack Chips */}
      {post.techStack && post.techStack.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "4px 0" }}>
          {post.techStack.map((tech) => (
            <span
              key={tech}
              style={{
                background: "rgba(124, 92, 255, 0.1)",
                color: "#7C5CFF",
                fontSize: "0.74rem",
                fontWeight: "600",
                padding: "3px 10px",
                borderRadius: "10px"
              }}
            >
              #{tech}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="post-actions-bar">
        <div className="post-action-group">
          {/* Like */}
          <button
            className="post-action-btn"
            onClick={() => onLike && onLike(post._id)}
            style={{ color: isLiked ? "#ef4444" : "var(--ce-text-muted, rgba(255, 255, 255, 0.7))" }}
          >
            <Heart size={18} fill={isLiked ? "#ef4444" : "none"} color={isLiked ? "#ef4444" : "currentColor"} />
            <span style={{ color: isLiked ? "#ef4444" : "inherit", fontWeight: "600" }}>
              {likesCount > 0 ? (likesCount >= 1000 ? (likesCount / 1000).toFixed(1) + "K" : likesCount) : "0"}
            </span>
          </button>

          {/* Comment */}
          <button
            className="post-action-btn"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare size={18} />
            <span style={{ fontWeight: "600" }}>{countAllComments(commentsList)}</span>
          </button>

          {/* Share */}
          <button className="post-action-btn" onClick={() => onShare && onShare(post._id)}>
            <Share2 size={18} />
            <span style={{ fontWeight: "600" }}>Share</span>
          </button>
        </div>

        {/* Bookmark */}
        <button
          className="post-action-btn"
          onClick={() => onBookmark && onBookmark(post._id)}
          style={{ color: isBookmarked ? "#7C5CFF" : "var(--ce-text-muted, rgba(255, 255, 255, 0.7))" }}
          title={isBookmarked ? "Remove Bookmark" : "Save Post"}
        >
          <Bookmark size={18} fill={isBookmarked ? "#7C5CFF" : "none"} color={isBookmarked ? "#7C5CFF" : "currentColor"} />
        </button>
      </div>

      {/* Social Proof Liked-By Row (Dynamic 1 to 3 Avatar Bubbles synced with user avatars) */}
      {likesCount > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--ce-text-muted, rgba(255, 255, 255, 0.65))", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {likersList.slice(0, 3).map((liker, idx) => (
              <div
                key={liker.id || idx}
                style={{
                  marginLeft: idx === 0 ? "0" : "-6px",
                  border: "1.5px solid var(--ce-surface, #11121d)",
                  borderRadius: "50%",
                  zIndex: 3 - idx,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <SafeAvatar src={liker.avatar} name={liker.username} size={18} />
              </div>
            ))}
          </div>
          {renderLikedByText()}
        </div>
      )}

      {/* Comment Drawer & Always-Visible Comment Input Pill */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
        {showComments && commentsList.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "320px", overflowY: "auto", marginBottom: "6px", paddingRight: "4px" }}>
            {commentsList.map((comment, i) => (
              <CommentTreeItem
                key={comment._id || i}
                comment={comment}
                user={user}
                isPostOwner={isOwner}
                onLikeComment={async (commentId) => {
                  try {
                    await toggleLikeCommentPost(post._id, commentId);
                  } catch (err) {
                    console.error("Failed to toggle comment like:", err);
                  }
                }}
                onReplyComment={(commentId, replyText) => onComment && onComment(null, post._id, replyText, commentId)}
                onDeleteComment={async (commentId) => {
                  try {
                    const res = await deleteCommentPost(post._id, commentId);
                    if (res && res.success && res.comments) {
                      post.comments = res.comments;
                      if (addToast) addToast("Comment deleted", "success");
                    }
                  } catch (err) {
                    console.error("Failed to delete comment:", err);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Comment Input Row with Profile Avatar Outside */}
        <form onSubmit={handleCommentSubmit} className="post-comment-input-row">
          <SafeAvatar src={user?.avatar} name={user?.username} size={28} />
          <div className="post-comment-input-box">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              style={{
                background: "none",
                border: "none",
                color: commentText.trim() ? "#7C5CFF" : "rgba(255, 255, 255, 0.3)",
                cursor: commentText.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                padding: 0
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(PostCard);
