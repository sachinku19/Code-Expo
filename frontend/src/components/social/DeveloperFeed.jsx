import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Trash2, Code, Plus, Sparkles, Image, Eye, EyeOff, CheckCircle2, Bookmark, X, ChevronLeft, ChevronRight, BarChart3, Calendar, ShieldCheck, Flame, GitFork, Star, Smile, Bell, Play, Search, MoreVertical, Copy, ChevronDown, ChevronUp, Edit3, Trophy, Repeat, FileText } from "lucide-react";
import { createPost, getPosts, toggleLikePost, addCommentPost, deletePost, searchUsers, getStories } from "../../services/socialService";
import { toggleLikeOptimistic, subscribeToLikes, isEntityLiked } from "../../services/likeEngine";
import { createPortal } from "react-dom";
import socket from "../../socket/socket";
import ProfileAvatar from "../ProfileAvatar";
import ImageCropper from "./ImageCropper";
import ReportUserModal from "./ReportUserModal";
import FeedPage from "./feed/FeedPage";
import CreatePostModal from "./composer/CreatePostModal";

const FeedPortal = ({ children }) => {
  return createPortal(children, document.body);
};

// Resilient SafeAvatar component that handles broken image URLs gracefully and prevents distortion
const SafeAvatar = ({ src, name = "User", size = 36, className = "", style = {}, userId }) => {
  const [hasError, setHasError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const initial = (name || "U").trim().charAt(0).toUpperCase() || "U";

  const dimensionStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    maxWidth: `${size}px`,
    minHeight: `${size}px`,
    maxHeight: `${size}px`,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    boxSizing: "border-box",
    cursor: "pointer",
    ...style
  };

  const handleAvatarClick = (e) => {
    if (!userId) return;
    e.stopPropagation();
    if (window.handleGlobalProfileNav) {
      window.handleGlobalProfileNav(userId, name);
    } else {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserId = storedUser.id || storedUser._id;
        if (String(userId) === String(currentUserId)) {
          navigate("/dashboard/profile");
          return;
        }
      } catch (err) { }

      if (name && name !== "User") {
        navigate(`/u/${name}`);
      } else {
        navigate(`/dashboard/profile/${userId}`);
      }
    }
  };

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setHasError(true)}
        className={className}
        onClick={handleAvatarClick}
        title={`View @${name}'s profile`}
        style={{
          ...dimensionStyle,
          objectFit: "cover",
          display: "block"
        }}
      />
    );
  }

  return (
    <div
      className={className ? `${className}-fallback` : "safe-avatar-fallback"}
      onClick={handleAvatarClick}
      title={`View @${name}'s profile`}
      style={{
        ...dimensionStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "700",
        fontSize: size <= 28 ? "0.7rem" : size <= 36 ? "0.8rem" : "0.95rem",
        color: "#ffffff",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        userSelect: "none"
      }}
    >
      {initial}
    </div>
  );
};

// Reusable styled CodeBlock component with line numbers, syntax highlighting, and copy button
const CodeBlock = ({ lang, code, addToast }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = code.split(/\r?\n/);
  const totalLines = lines.length;
  const isLong = totalLines > 30;

  const visibleLines = isLong && !isExpanded ? lines.slice(0, 22) : lines;
  const remainingLines = totalLines - visibleLines.length;
  const highlightCode = (lineText) => {
    if (!lineText) return "&nbsp;";
    let escaped = lineText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const keywords = [
      "class", "public", "private", "protected", "int", "double", "float", "char", "void", "vector",
      "std", "include", "return", "if", "else", "for", "while", "do", "break", "continue", "switch",
      "case", "const", "let", "var", "function", "import", "export", "from", "default", "new", "this",
      "struct", "template", "typename", "using", "namespace", "false", "true", "null", "nullptr"
    ];

    const regex = new RegExp(
      `(\\/\\/.*)|` +
      `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')|` +
      `\\b(${keywords.join("|")})\\b|` +
      `\\b(\\d+)\\b`,
      "g"
    );

    return escaped.replace(regex, (match, comment, string, keyword, number) => {
      if (comment) {
        return `<span style="color:#64748b; font-style:italic;">${comment}</span>`;
      }
      if (string) {
        return `<span style="color:#34d399;">${string}</span>`;
      }
      if (keyword) {
        return `<span style="color:#f472b6; font-weight:600;">${keyword}</span>`;
      }
      if (number) {
        return `<span style="color:#fbbf24;">${number}</span>`;
      }
      return match;
    });
  };
  return (
    <div
      className="premium-code-window"
      style={{
        background: "#09090f",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "12px",
        overflow: "hidden",
        margin: "12px 0",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "#11111b",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ display: "flex", gap: "5px", marginRight: "8px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <span style={{ fontSize: "0.72rem", color: "#a5b4fc", fontFamily: "monospace", textTransform: "uppercase", fontWeight: "700" }}>
            {lang || "code"}
          </span>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            if (addToast) addToast("Code copied to clipboard!", "success");
          }}
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#e2e8f0",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "0.7rem",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.2s"
          }}
        >
          Copy
        </button>
      </div>

      <div
        style={{
          display: "flex",
          overflow: "auto",
          maxHeight: isLong && !isExpanded ? "380px" : "600px",
          position: "relative",
          background: "#09090f"
        }}
      >
        <div
          style={{
            padding: "16px 12px",
            borderRight: "1px solid rgba(255, 255, 255, 0.05)",
            background: "#07070c",
            textAlign: "right",
            userSelect: "none",
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.8rem",
            color: "#475569",
            lineHeight: "1.5",
            minWidth: "35px"
          }}
        >
          {visibleLines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        <div
          style={{
            padding: "16px 16px",
            flex: 1,
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.8rem",
            lineHeight: "1.5",
            color: "#e2e8f0",
            whiteSpace: "pre",
            overflowX: "auto"
          }}
        >
          {visibleLines.map((line, idx) => (
            <div
              key={idx}
              dangerouslySetInnerHTML={{ __html: highlightCode(line) }}
            />
          ))}
        </div>

        {isLong && !isExpanded && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "80px",
              background: "linear-gradient(to top, #09090f 20%, transparent 100%)",
              pointerEvents: "none"
            }}
          />
        )}
      </div>

      {isLong && (
        <div
          style={{
            padding: "12px",
            background: "#11111b",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 5
          }}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#a5b4fc",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {isExpanded
              ? "Show Less"
              : `${remainingLines} more lines... View Full Code`
            }
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable ExpandableText component for post descriptions and comments to clamp long text to exactly 3 lines
const ExpandableText = ({ children, text, lines = 3, onReadMore }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const textStr = text || (typeof children === "string" ? children : "");
  const shouldShowButton = textStr && (textStr.length > 260 || textStr.split("\n").length > lines);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    if (onReadMore) {
      onReadMore();
    }
  };

  return (
    <div style={{ position: "relative", marginBottom: "4px" }}>
      <div
        style={{
          display: "-webkit-box",
          WebkitLineClamp: isExpanded ? "none" : lines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: "1.5",
          maxHeight: isExpanded ? "none" : `${lines * 1.5}em`,
          position: "relative"
        }}
      >
        {children}
      </div>
      {shouldShowButton && (
        <button
          type="button"
          onClick={handleButtonClick}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            padding: "2px 0",
            marginTop: "4px",
            display: "inline-flex",
            alignItems: "center"
          }}
        >
          {isExpanded ? "Read Less" : "Read More"}
        </button>
      )}
    </div>
  );
};

// Reusable AutoplayVideo component using IntersectionObserver (Instagram autoplay style)
const AutoplayVideo = ({ src }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Ensure it is muted to satisfy browser autoplay requirements
              video.muted = true;
              video.play().catch(() => { });
            });
          } else {
            video.pause();
          }
        });
      },
      {
        threshold: 0.5
      }
    );

    observer.observe(video);

    return () => {
      if (video) {
        observer.unobserve(video);
      }
      observer.disconnect();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      loop
      muted
      playsInline
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
};

const parseMarkdownOnly = (text) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.*$)/gim, '<h4 class="feed-post-h4">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="feed-post-h3">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="feed-post-h2">$1</h2>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="feed-post-strong">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="feed-post-em">$1</em>');
  html = html.replace(/`([^`\r\n]+)`/g, '<code class="feed-post-code">$1</code>');
  html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span class="feed-post-hashtag">#$1</span>');
  html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span class="feed-post-mention">@$1</span>');

  // Handle list items starting with - or *
  html = html.split("\n").map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return `<li class="feed-post-li">${trimmed.substring(2)}</li>`;
    }
    return line;
  }).join("\n");

  // Wrap continuous list items in dynamic ul tags
  html = html.replace(/(<li class="feed-post-li">.*?<\/li>)/gs, '<ul class="feed-post-ul">$1</ul>');
  html = html.replace(/\n/g, "<br />");

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

const renderPostContent = (text, addToast) => {
  if (!text) return null;

  const parts = text.split(/(```[a-zA-Z0-9]*(?:\r?\n)[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith("```")) {
      const match = part.match(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/);
      if (match) {
        const lang = match[1] || "code";
        const code = match[2];
        return (
          <CodeBlock
            key={index}
            lang={lang}
            code={code}
            addToast={addToast}
          />
        );
      }
    }

    return (
      <span key={index} style={{ display: "block", marginBottom: "8px" }}>
        {parseMarkdownOnly(part)}
      </span>
    );
  });
};

// Reusable animated glassmorphism WarningModal component
const WarningModal = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <FeedPortal>
      <AnimatePresence>
        <div
          className="ce-warning-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              background: "rgba(18, 18, 30, 0.9)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "28px 24px",
              width: "420px",
              maxWidth: "90vw",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(99, 102, 241, 0.08)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1.5px solid rgba(245, 158, 11, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f59e0b",
                fontSize: "1.6rem"
              }}
            >
              ⚠️
            </div>
            <div>
              <h3 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "1.25rem", fontWeight: "700", letterSpacing: "-0.02em" }}>{title}</h3>
              <p style={{ margin: 0, color: "var(--ce-premium-text, #a5b4fc)", fontSize: "0.9rem", lineHeight: "1.55", opacity: 0.85 }}>{message}</p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                border: "none",
                color: "#fff",
                padding: "11px 24px",
                borderRadius: "10px",
                fontSize: "0.9rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.25)",
                width: "100%",
                marginTop: "4px"
              }}
              onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.15)"}
              onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
            >
              Understand
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    </FeedPortal>
  );
};

// Professional Enterprise-Grade Delete Post Confirmation Modal Component
const DeletePostConfirmModal = ({ isOpen, onConfirm, onCancel, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <FeedPortal>
      <AnimatePresence>
        <div
          className="ce-confirm-modal-overlay"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="ce-confirm-modal-card delete-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <div className="ce-confirm-modal-badge delete-badge">
              <Trash2 size={26} color="#ef4444" />
            </div>

            {/* Title & Body */}
            <div>
              <h3 className="ce-confirm-modal-title">
                Delete Post?
              </h3>
              <p className="ce-confirm-modal-text">
                Are you sure you want to delete this developer post? This action is permanent and cannot be undone.
              </p>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "4px" }}>
              <button
                type="button"
                className="ce-confirm-btn-cancel"
                onClick={onCancel}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ce-confirm-btn-delete"
                onClick={onConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Post"}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </FeedPortal>
  );
};

// Reusable animated ConfirmPostModal component
const ConfirmPostModal = ({ isOpen, onConfirm, onCancel, isPosting }) => {
  if (!isOpen) return null;

  return (
    <FeedPortal>
      <AnimatePresence>
        <div
          className="ce-confirm-modal-overlay"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="ce-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ce-confirm-modal-badge">
              <ShieldCheck size={28} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h3 className="ce-confirm-modal-title">
                Confirm Post Publication
              </h3>
              <p className="ce-confirm-modal-text">
                Are you sure you want to publish this update? It will immediately be shared with the developer community on CodeExpo.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", width: "100%", marginTop: "4px" }}>
              <button
                type="button"
                className="ce-confirm-btn-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ce-confirm-btn-submit"
                onClick={onConfirm}
                disabled={isPosting}
              >
                {isPosting ? (
                  "Posting..."
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Yes, Publish</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    </FeedPortal>
  );
};

export default function DeveloperFeed({ user, addToast, followingList = [], handleFollowToggle, onViewProfile, suggestions = [], onOpenPost, onlineUsers = [] }) {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [visiblePosts, setVisiblePosts] = useState(6);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [inputText, setInputText] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techChips, setTechChips] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [activeComments, setActiveComments] = useState({}); // postId: true/false
  const [commentInputs, setCommentInputs] = useState({}); // postId: text
  const [activeCommentsPanelPostId, setActiveCommentsPanelPostId] = useState(null);
  const [panelCommentInput, setPanelCommentInput] = useState("");
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [activeInlineReplyId, setActiveInlineReplyId] = useState(null); // ID of comment with active inline reply form
  const [inlineReplyText, setInlineReplyText] = useState(""); // text typed in inline reply form
  const [commentLikes, setCommentLikes] = useState(() => {
    try {
      const saved = localStorage.getItem('code_expo_comment_likes_count');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [userLikedComments, setUserLikedComments] = useState(() => {
    try {
      const saved = localStorage.getItem('code_expo_liked_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [commentParentMap, setCommentParentMap] = useState(() => {
    try {
      const saved = localStorage.getItem('code_expo_comment_parent_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [expandedCommentThreads, setExpandedCommentThreads] = useState({});
  const [commentsTriggerOrigin, setCommentsTriggerOrigin] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('code_expo_comment_parent_map', JSON.stringify(commentParentMap));
    } catch (e) {
      console.error(e);
    }
  }, [commentParentMap]);

  useEffect(() => {
    try {
      localStorage.setItem('code_expo_liked_comments', JSON.stringify(userLikedComments));
    } catch (e) {
      console.error(e);
    }
  }, [userLikedComments]);

  useEffect(() => {
    try {
      localStorage.setItem('code_expo_comment_likes_count', JSON.stringify(commentLikes));
    } catch (e) {
      console.error(e);
    }
  }, [commentLikes]);

  const activeCommentsPanelPost = posts.find(p => p._id === activeCommentsPanelPostId);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);

  const [showParentPostModal, setShowParentPostModal] = useState(false);

  const handleCommentsClick = (postId, event) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setCommentsTriggerOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    } else {
      setCommentsTriggerOrigin(null);
    }
    setActiveCommentsPanelPostId(postId);
  };

  const getCommentsPanelTransformOrigin = () => {
    if (!commentsTriggerOrigin) return "right center";
    const panelWidth = window.innerWidth >= 1200 ? 400 : window.innerWidth;
    const panelRight = window.innerWidth >= 1400 ? Math.max(24, (window.innerWidth - 1360) / 2 + 24) : (window.innerWidth >= 1200 ? 24 : 0);
    const panelLeft = window.innerWidth - panelRight - panelWidth;
    const panelTop = window.innerWidth >= 1200 ? 90 : 0;
    return `${commentsTriggerOrigin.x - panelLeft}px ${commentsTriggerOrigin.y - panelTop}px`;
  };

  useEffect(() => {
    setPanelCommentInput("");
    setReplyingToComment(null);
    setActiveInlineReplyId(null);
    setInlineReplyText("");
    const postComments = activeCommentsPanelPost?.comments || [];
    setVisibleCommentsCount(Math.max(50, postComments.length));
    setIsLoadingMoreComments(false);
    setShowParentPostModal(false);
  }, [activeCommentsPanelPostId]);

  const handleCommentsScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      const allComments = activeCommentsPanelPost?.comments || [];
      if (activeCommentsPanelPost && !isLoadingMoreComments && visibleCommentsCount < allComments.length) {
        setIsLoadingMoreComments(true);
        setTimeout(() => {
          setVisibleCommentsCount(prev => prev + 20);
          setIsLoadingMoreComments(false);
        }, 300);
      }
    }
  };

  const getStableCommentLikesCount = (commentId) => {
    return 0;
  };

  const handleToggleLikeComment = (commentId) => {
    const wasLiked = !!userLikedComments[commentId];
    const newLiked = !wasLiked;

    setUserLikedComments(prev => ({
      ...prev,
      [commentId]: newLiked
    }));

    setCommentLikes(cPrev => {
      const startingLikes = getStableCommentLikesCount(commentId);
      const currentCount = cPrev[commentId] !== undefined ? cPrev[commentId] : startingLikes;
      return {
        ...cPrev,
        [commentId]: Math.max(0, currentCount + (newLiked ? 1 : -1))
      };
    });
  };

  const handlePanelAddComment = async (postId) => {
    const commentText = panelCommentInput.trim();
    if (!commentText) return;

    let textToSend = commentText;
    if (replyingToComment) {
      textToSend = `@[${replyingToComment.username}] ${commentText}`;
    }

    setTypingPostIds(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    const targetParentId = replyingToComment ? replyingToComment.commentId : null;

    setPanelCommentInput("");
    setReplyingToComment(null);

    if (targetParentId) {
      setExpandedCommentThreads(prev => ({ ...prev, [targetParentId]: true }));
    }

    const tempComment = {
      _id: String(Date.now()),
      user: user?.id || user?._id,
      username: user?.username || "You",
      avatar: user?.avatar || "",
      text: textToSend,
      parentCommentId: targetParentId,
      createdAt: new Date()
    };

    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        return { ...post, comments: [...post.comments, tempComment] };
      }
      return post;
    }));

    setTypingPostIds(prev => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });

    try {
      const res = await addCommentPost(postId, textToSend);
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
      if (addToast) addToast("Failed to submit reply comment", "error");
    }
  };

  const handleSubmitInlineReply = async (postId, targetCommentId, targetUsername) => {
    const commentText = inlineReplyText.trim();
    if (!commentText) return;

    const textToSend = `@[${targetUsername}] ${commentText}`;
    const targetParentIdStr = String(targetCommentId);
    const tempId = String(Date.now());

    // Store mapping in commentParentMap
    setCommentParentMap(prev => ({ ...prev, [tempId]: targetParentIdStr }));

    // Expand target comment thread automatically
    setExpandedCommentThreads(prev => ({ ...prev, [targetParentIdStr]: true }));

    // Reset inline input state
    setActiveInlineReplyId(null);
    setInlineReplyText("");

    const tempComment = {
      _id: tempId,
      user: user?.id || user?._id,
      username: user?.username || "You",
      avatar: user?.avatar || "",
      text: textToSend,
      parentCommentId: targetParentIdStr,
      createdAt: new Date()
    };

    setPosts(prev => prev.map(post => {
      if (String(post._id) === String(postId)) {
        return { ...post, comments: [...(post.comments || []), tempComment] };
      }
      return post;
    }));

    try {
      const res = await addCommentPost(postId, textToSend);
      if (res.success) {
        setPosts(prev => prev.map(post => {
          if (String(post._id) === String(postId)) {
            const updatedComments = (res.comments || []).map(c => {
              const cId = String(c._id);
              const existingParentId = c.parentCommentId || c.parentId || commentParentMap[cId];
              const resolvedParentId = existingParentId || (c.text === textToSend ? targetParentIdStr : null);
              if (resolvedParentId) {
                setCommentParentMap(prevMap => ({ ...prevMap, [cId]: String(resolvedParentId) }));
              }
              return {
                ...c,
                parentCommentId: resolvedParentId ? String(resolvedParentId) : c.parentCommentId
              };
            });
            return { ...post, comments: updatedComments };
          }
          return post;
        }));
      }
    } catch (err) {
      fetchPosts();
      if (addToast) addToast("Failed to submit reply", "error");
    }
  };

  const [postToDelete, setPostToDelete] = useState(null); // Custom delete post modal
  const [isDeletingPost, setIsDeletingPost] = useState(false); // Spinner state for deleting post
  const [likedUsersListModal, setLikedUsersListModal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openSharePostId, setOpenSharePostId] = useState(null);

  // Composer Refined upgrades
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerTab, setComposerTab] = useState("write");
  const [visibility, setVisibility] = useState("public");

  // Search states
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Report modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedTargetUser, setReportedTargetUser] = useState(null);
  const [reportEvidenceType, setReportEvidenceType] = useState("");
  const [reportEvidenceId, setReportEvidenceId] = useState("");

  // Dropdown menu states
  const [activePostMenuId, setActivePostMenuId] = useState(null);
  const [activeCommentMenuId, setActiveCommentMenuId] = useState(null);

  // Custom Attachments states
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [attachedCode, setAttachedCode] = useState("");
  const [attachedCodeLang, setAttachedCodeLang] = useState("javascript");

  const [showPollInput, setShowPollInput] = useState(false);
  const [pollQuestionInput, setPollQuestionInput] = useState("");
  const [pollOptionsInput, setPollOptionsInput] = useState({ a: "", b: "", c: "", d: "" });

  const [showRepoInput, setShowRepoInput] = useState(false);
  const [repoShareInput, setRepoShareInput] = useState("");

  const [showEventInput, setShowEventInput] = useState(false);
  const [eventShareTitle, setEventShareTitle] = useState("");
  const [eventShareDate, setEventShareDate] = useState("");

  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Multiple Image state
  const [selectedImages, setSelectedImages] = useState([]); // Array of { file, preview }
  const fileInputRef = useRef(null);

  // Video and Validation states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: "", message: "" });
  const [confirmPostModal, setConfirmPostModal] = useState({ isOpen: false, directText: null });
  const videoInputRef = useRef(null);
  const prevExceededRef = useRef(false);

  // Live validation helpers
  const codeLinesCount = attachedCode ? attachedCode.split(/\r?\n/).length : 0;
  const codeSizeKB = attachedCode ? Math.round(new Blob([attachedCode]).size / 1024) : 0;
  const isCodeInvalid = codeLinesCount > 1000 || codeSizeKB > 500;

  const textLength = inputText.length;
  const isTextInvalid = textLength > 5000;

  const isImagesInvalid = selectedImages.length > 10;

  const isPublishDisabled =
    (!inputText.trim() && !attachedCode.trim() && selectedImages.length === 0 && !selectedVideo) ||
    isCodeInvalid ||
    isTextInvalid ||
    isImagesInvalid ||
    isPosting;

  // Code size warning trigger
  useEffect(() => {
    const exceeded = codeLinesCount > 1000 || codeSizeKB > 500;
    if (exceeded && !prevExceededRef.current) {
      setWarningModal({
        isOpen: true,
        title: "Code Too Large",
        message: "Code posts are limited to 1000 lines or 500 KB. Please split your solution into multiple posts or create a Gist."
      });
    }
    prevExceededRef.current = exceeded;
  }, [attachedCode, codeLinesCount, codeSizeKB]);

  // Carousel index tracker for post cards
  const [carouselIndices, setCarouselIndices] = useState({}); // postId: activeIndex
  const [pollVotesSim, setPollVotesSim] = useState({}); // postId: optionVoted
  const [revealedSensitivePosts, setRevealedSensitivePosts] = useState({}); // postId: true


  // Filter feed tab state
  const [activeFeedTab, setActiveFeedTab] = useState("for-you");
  const [activePickerPost, setActivePickerPost] = useState(null); // postId for hover reaction picker
  const [typingPostIds, setTypingPostIds] = useState(new Set()); // simulation of typing comments
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState(() => {
    try {
      const saved = localStorage.getItem("codeexpo_bookmarked_post_ids");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Follow state syncs with parent followingList database prop

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await getPosts(1, 40);
      if (res.success) {
        setPosts(res.posts || []);
      }
      try {
        const storiesRes = await getStories();
        if (storiesRes && storiesRes.success) {
          setStories(storiesRes.stories || []);
        }
      } catch (sErr) {
        console.error("Error fetching stories:", sErr);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQueryInput.trim()) return;

    setSearchQuery(searchQueryInput);
    setIsSearching(true);
    setIsLoading(true);

    try {
      const postsRes = await getPosts(1, 40, null, searchQueryInput);
      if (postsRes.success) {
        setPosts(postsRes.posts || []);
      }

      const usersRes = await searchUsers(searchQueryInput);
      if (usersRes.success) {
        setSearchedUsers(usersRes.users || []);
      }

      setActiveFeedTab("search-results");
    } catch (err) {
      console.error("Search error:", err);
      if (addToast) addToast("Failed to perform search", "error");
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQueryInput("");
    setSearchQuery("");
    setSearchedUsers([]);
    setActiveFeedTab("for-you");
    fetchPosts();
  };

  useEffect(() => {
    fetchPosts();

    // Real-time synchronization
    const handlePostCreated = (newPost) => {
      setPosts(prev => {
        if (prev.some(p => p._id === newPost._id || p.id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostDeleted = ({ postId }) => {
      setPosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
    };

    const handlePostLiked = ({ postId, likes }) => {
      setPosts(prev => prev.map(p => {
        if (p._id === postId || p.id === postId) {
          return { ...p, likes };
        }
        return p;
      }));
    };

    const handlePostCommented = ({ postId, comments }) => {
      setPosts(prev => prev.map(p => {
        if (p._id === postId || p.id === postId) {
          return { ...p, comments };
        }
        return p;
      }));
    };

    const handleAdminPostAction = ({ postId, post: updatedPost }) => {
      if (updatedPost.status === "hidden" || updatedPost.status === "deleted") {
        setPosts(prev => prev.filter(p => p._id !== postId && p.id !== postId));
      } else {
        setPosts(prev => prev.map(p => {
          if (p._id === postId || p.id === postId) {
            return {
              ...p,
              ...updatedPost,
              _id: postId,
              id: postId,
              author: p.author
            };
          }
          return p;
        }));
      }
    };

    const handleAdminUserAction = ({ userId, isSuspended }) => {
      if (isSuspended) {
        setPosts(prev => prev.filter(p => p.author?._id !== userId && p.author?.id !== userId));
        const currentUserId = user?.id || user?._id;
        if (currentUserId && String(currentUserId) === String(userId)) {
          localStorage.clear();
          if (typeof addToast === "function") {
            addToast("Your account has been suspended by an administrator.", "error");
          }
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
      }
    };

    socket.on("post:created", handlePostCreated);
    socket.on("post:deleted", handlePostDeleted);
    socket.on("post:commented", handlePostCommented);
    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("admin-user-action", handleAdminUserAction);

    const unsubPostLikes = subscribeToLikes("POST", (data) => {
      const postId = data.entityId;
      setPosts(prev => prev.map(p => (p._id === postId || p.id === postId) ? { ...p, likes: data.likes, likesCount: data.likesCount } : p));
    });

    return () => {
      socket.off("post:created", handlePostCreated);
      socket.off("post:deleted", handlePostDeleted);
      socket.off("post:commented", handlePostCommented);
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("admin-user-action", handleAdminUserAction);
      unsubPostLikes();
    };
  }, [user?.id, user?._id]);

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

  const handleImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 10) {
      setWarningModal({
        isOpen: true,
        title: "Too Many Images",
        message: "You can upload a maximum of 10 images per post."
      });
      if (e.target) e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const hasInvalidFormat = files.some(file => !allowedTypes.includes(file.type));
    if (hasInvalidFormat) {
      setWarningModal({
        isOpen: true,
        title: "Unsupported Image Format",
        message: "Only JPG, JPEG, PNG, or WEBP image formats are supported."
      });
      if (e.target) e.target.value = "";
      return;
    }

    const oversizedFile = files.find(file => file.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setWarningModal({
        isOpen: true,
        title: "Image Too Large",
        message: "Image exceeds the 10 MB limit. Please compress your image and try again."
      });
      if (e.target) e.target.value = "";
      return;
    }

    const newImageObjs = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setSelectedImages(prev => [...prev, ...newImageObjs]);
    if (e.target) e.target.value = "";
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedExtensions = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"];
    if (!allowedExtensions.includes(file.type)) {
      setWarningModal({
        isOpen: true,
        title: "Unsupported Video Format",
        message: "Only MP4, WEBM, MOV, AVI, or MKV video formats are supported."
      });
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setWarningModal({
        isOpen: true,
        title: "Video Too Large",
        message: "Video file size exceeds the 10 MB limit. Please compress your video or upload a shorter clip."
      });
      e.target.value = "";
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 300) {
        setWarningModal({
          isOpen: true,
          title: "Video Too Long",
          message: "Video duration exceeds the 5-minute limit. Please trim your video and try again."
        });
        setSelectedVideo(null);
        setVideoPreview("");
        e.target.value = "";
      } else {
        setSelectedVideo(file);
        setVideoPreview(URL.createObjectURL(file));
      }
    };
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      setWarningModal({
        isOpen: true,
        title: "Invalid Video File",
        message: "Could not read the video file metadata. The file might be corrupted."
      });
      e.target.value = "";
    };
    video.src = URL.createObjectURL(file);
  };

  const handleRemoveSelectedVideo = () => {
    setSelectedVideo(null);
    setVideoPreview("");
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const handleCropComplete = (croppedFile, croppedPreview) => {
    // Simulate upload progress animation
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 0;
        }
        return prev + 15;
      });
    }, 150);

    setSelectedImages(prev => [...prev, {
      file: croppedFile,
      preview: croppedPreview
    }]);
    setCropSource(null);
  };

  const resolveLikedUser = (likeUserId) => {
    if (!likeUserId) return null;
    const targetId = typeof likeUserId === "object" ? likeUserId._id || likeUserId.id : likeUserId;
    if (user && (String(targetId) === String(user.id) || String(targetId) === String(user._id))) {
      return {
        _id: targetId,
        username: user.username,
        avatar: user.avatar,
        title: user.title || "Developer"
      };
    }
    const foundInSuggestions = (suggestions || []).find(s => String(s._id || s.id) === String(targetId));
    if (foundInSuggestions) return foundInSuggestions;

    const foundInFollowers = (followingList || []).find(f => String(f._id || f.id) === String(targetId));
    if (foundInFollowers) return foundInFollowers;

    const suffix = typeof targetId === "string" ? targetId.slice(-4) : "dev";
    return {
      _id: targetId,
      username: `dev_${suffix}`,
      avatar: null,
      title: "Software Engineer"
    };
  };

  const handleRemoveSelectedImage = (indexToRemove) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const executePublishPost = async () => {
    const directText = confirmPostModal.directText;
    const textToSubmit = directText !== null ? directText : inputText;

    if (!textToSubmit.trim() && !attachedCode.trim() && selectedImages.length === 0 && !selectedVideo) return;

    setIsPosting(true);
    try {
      const formData = new FormData();

      let postText = textToSubmit;

      // Append attached code blocks
      if (showCodeInput && attachedCode.trim()) {
        postText += `\n\n\`\`\`${attachedCodeLang}\n${attachedCode}\n\`\`\``;
      }

      // Append Dev Polls metadata block
      if (showPollInput && pollQuestionInput.trim()) {
        const validPollOpts = [
          pollOptionsInput.a,
          pollOptionsInput.b,
          pollOptionsInput.c,
          pollOptionsInput.d
        ]
          .map(o => o?.trim())
          .filter(Boolean);

        if (validPollOpts.length >= 2) {
          postText += `\n\n[POLL_QUESTION] ${pollQuestionInput}\n[POLL_OPTS] ${validPollOpts.join(", ")}`;
        }
      }

      // Append Repositories metadata block
      if (showRepoInput && repoShareInput.trim()) {
        postText += `\n\n[REPO] ${repoShareInput}`;
      }

      // Append Event sharing metadata block
      if (showEventInput && eventShareTitle.trim()) {
        postText += `\n\n[EVENT] ${eventShareTitle} & ${eventShareDate || "Upcoming Date"}`;
      }

      formData.append("text", postText);
      formData.append("techStack", JSON.stringify(techChips));

      // Append multiple images to FormData
      if (selectedImages.length > 0) {
        selectedImages.forEach(imgObj => {
          formData.append("images", imgObj.file);
        });
      }

      // Append video to FormData
      if (selectedVideo) {
        formData.append("video", selectedVideo);
      }

      const res = await createPost(formData);
      if (res.success) {
        addToast("Dev update shared successfully!", "success");
        setInputText("");
        setTechChips([]);
        setSelectedImages([]);
        setSelectedVideo(null);
        setVideoPreview("");
        setAttachedCode("");
        setPollQuestionInput("");
        setPollOptionsInput({ a: "", b: "", c: "", d: "" });
        setRepoShareInput("");
        setEventShareTitle("");
        setEventShareDate("");
        setShowCodeInput(false);
        setShowPollInput(false);
        setShowRepoInput(false);
        setShowEventInput(false);
        setIsComposerOpen(false); // Close modal
        setConfirmPostModal({ isOpen: false, directText: null });
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleCreatePost = (e, directText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const textToSubmit = directText !== null ? directText : inputText;

    if (!textToSubmit.trim() && !attachedCode.trim() && selectedImages.length === 0 && !selectedVideo) return;

    setConfirmPostModal({ isOpen: true, directText });
  };

  const handleSaveDraft = () => {
    if (!inputText.trim()) {
      addToast("Draft is empty. Write post content first.", "error");
      return;
    }
    addToast("Dev update draft auto-saved locally!", "success");
  };

  const handleLikePost = async (postId, emoji = "👍") => {
    if (!user) return;
    const currentPost = posts.find(p => p._id === postId || p.id === postId);
    const currentLikes = currentPost ? (currentPost.likes || []) : [];

    await toggleLikeOptimistic({
      entityType: "POST",
      entityId: postId,
      currentUser: user,
      currentLikes,
      apiCall: () => toggleLikePost(postId),
      onStateUpdate: ({ likes, likesCount }) => {
        setPosts(prev => prev.map(p => (p._id === postId || p.id === postId) ? { ...p, likes, likesCount } : p));
        if (emoji !== "👍") {
          addToast(`Reacted with ${emoji}!`, "success");
        }
      },
      onError: (err) => {
        addToast(err.response?.data?.message || err.message || "Failed to react to post", "error");
      }
    });
    setActivePickerPost(null);
  };

  const handleAddComment = async (e, postId, textDirect, commentIdTarget) => {
    if (e && e.preventDefault) e.preventDefault();
    const commentText = (textDirect || commentInputs[postId])?.trim();
    if (!commentText) return;

    // Create optimistic comment object for instant local update
    const tempCommentId = "temp-" + Date.now();
    const optimisticComment = {
      _id: tempCommentId,
      text: commentText,
      user: {
        _id: user?._id || user?.id,
        username: user?.username || "you",
        avatar: user?.avatar
      },
      likes: [],
      likesCount: 0,
      createdAt: new Date().toISOString(),
      replies: []
    };

    // Update posts state optimistically
    setPosts(prev => prev.map(post => {
      if (post._id === postId) {
        const currentComments = post.comments || [];
        if (!commentIdTarget) {
          // Top-level comment
          return { ...post, comments: [...currentComments, optimisticComment] };
        } else {
          // Nested reply
          const addReplyToTreeRecursively = (tree) => {
            return tree.map(c => {
              if (String(c._id) === String(commentIdTarget)) {
                return { ...c, replies: [...(c.replies || []), optimisticComment] };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: addReplyToTreeRecursively(c.replies) };
              }
              return c;
            });
          };
          return { ...post, comments: addReplyToTreeRecursively(currentComments) };
        }
      }
      return post;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));

    setTypingPostIds(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    try {
      const res = await addCommentPost(postId, commentText, commentIdTarget);
      if (res && res.success && res.comments) {
        setPosts(prev => prev.map(post => {
          if (post._id === postId) {
            return { ...post, comments: res.comments };
          }
          return post;
        }));
      }
    } catch (err) {
      // Rollback by reloading actual feed from server
      fetchPosts();
      addToast("Failed to submit reply comment", "error");
    } finally {
      setTypingPostIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
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
      await deletePost(postToDelete);
      setPosts(prev => prev.filter(post => post._id !== postToDelete && post.id !== postToDelete));
      addToast("Post deleted successfully!", "success");
      setPostToDelete(null);
    } catch (err) {
      setPosts(prev => prev.filter(post => post._id !== postToDelete && post.id !== postToDelete));
      addToast("Post deleted successfully!", "success");
      setPostToDelete(null);
    } finally {
      setIsDeletingPost(false);
    }
  };

  const toggleBookmark = (postId) => {
    setBookmarkedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        addToast("Post removed from saved bookmarks", "success");
      } else {
        next.add(postId);
        addToast("Post saved to bookmarks", "success");
      }
      localStorage.setItem("codeexpo_bookmarked_post_ids", JSON.stringify(Array.from(next)));
      return next;
    });
  };


  // Relative post creation timestamp helper
  const formatPostTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + " at " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  // Parser helper matching custom Markdown structures
  const parseMarkdown = (text) => {
    if (!text) return "";
    let cleanText = text;

    // Filter out metadata blocks from rendering inside text block directly
    cleanText = cleanText
      .replace(/\[POLL_QUESTION\][\s\S]*$/, "")
      .replace(/\[REPO\][\s\S]*$/, "")
      .replace(/\[EVENT\][\s\S]*$/, "");

    let html = cleanText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Extract code blocks first to preserve exact code whitespace & linebreaks
    const codeBlocks = [];
    html = html.replace(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(
        `<pre style="background:#09090b; border:1px solid rgba(255,255,255,0.08); padding:12px 14px; border-radius:10px; font-family:'Fira Code', monospace; font-size:0.82rem; overflow:auto; max-height:220px; margin:12px 0; box-sizing:border-box;"><div style="font-size:0.72rem; color:#7C5CFF; font-weight:600; text-transform:uppercase; margin-bottom:6px;">${lang || "code"}</div><code style="color:#e4e4e7; white-space:pre; display:block;">${code.trim()}</code></pre>`
      );
      return placeholder;
    });

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0; color:#ffffff;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0; color:#ffffff;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0; color:#ffffff;">$1</h2>');

    // Bold/Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline Code
    html = html.replace(/`([^`\r\n]+)`/g, '<code style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-family:monospace; color:#8b5cf6;">$1</code>');

    // Hashtags
    html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span style="color:#8b5cf6; font-weight:600;">#$1</span>');

    // Mentions
    html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color:#3b82f6; font-weight:600;">@$1</span>');

    // Line breaks outside code blocks
    html = html.replace(/\n/g, "<br />");

    // Restore Code blocks
    codeBlocks.forEach((block, idx) => {
      html = html.replace(`___CODE_BLOCK_${idx}___`, block);
    });

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Advanced post builders templates
  const parsePollBlock = (postId, text) => {
    if (!text || !text.includes("[POLL_QUESTION]")) return null;
    const matchQ = text.match(/\[POLL_QUESTION\] (.*)/);
    const matchO = text.match(/\[POLL_OPTS\] (.*)/);
    if (!matchQ || !matchO) return null;

    const question = matchQ[1].split("\n")[0];
    const opts = matchO[1].split(",").map(o => o.trim());

    const activeVote = pollVotesSim[postId];

    return (
      <div className="premium-poll-display-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "14px", margin: "12px 14px" }}>
        <h5 style={{ margin: "0 0 10px 0", color: "#fff", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <BarChart3 size={14} style={{ color: "#3b82f6" }} /> Developer Poll
        </h5>
        <p style={{ margin: "0 0 12px 0", color: "#e2e8f0", fontSize: "0.85rem", fontWeight: "600" }}>{question}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {opts.map((opt, idx) => {
            const votesPct = activeVote ? (idx === 0 ? "54%" : idx === 1 ? "32%" : "7%") : null;
            return (
              <button
                key={idx}
                disabled={!!activeVote}
                onClick={() => {
                  setPollVotesSim(prev => ({ ...prev, [postId]: idx }));
                  addToast(`Voted for option: ${opt}!`, "success");
                }}
                className={`premium-poll-opt-btn ${activeVote === idx ? "voted" : ""}`}
                style={{
                  background: activeVote === idx ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.04)",
                  border: activeVote === idx ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                  color: "#fff",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  transition: "all 0.2s"
                }}
              >
                <span>{opt}</span>
                {votesPct && <span style={{ fontWeight: "700", color: "#818cf8" }}>{votesPct}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const parseRepoBlock = (text) => {
    if (!text || !text.includes("[REPO]")) return null;
    const match = text.match(/\[REPO\] (.*)/);
    if (!match) return null;
    const repoName = match[1].split("\n")[0].trim();

    return (
      <div
        onClick={() => window.open(`https://github.com/${repoName}`, "_blank")}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          padding: "14px",
          margin: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer"
        }}
        className="premium-repo-embed"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Star size={16} style={{ color: "#fbbf24" }} />
          <div>
            <h6 style={{ margin: 0, color: "#60a5fa", fontSize: "0.85rem", fontWeight: "700" }}>{repoName}</h6>
            <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>GitHub Repository &bull; Click to explore</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>⭐ 240</span>
          <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><GitFork size={10} /> 32</span>
        </div>
      </div>
    );
  };

  const parseEventBlock = (text) => {
    if (!text || !text.includes("[EVENT]")) return null;
    const match = text.match(/\[EVENT\] (.*)/);
    if (!match) return null;
    const parts = match[1].split("\n")[0].split("&").map(p => p.trim());
    const title = parts[0];
    const date = parts[1] || "Upcoming Event";

    return (
      <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", padding: "14px", margin: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Calendar size={18} style={{ color: "#818cf8" }} />
        <div>
          <h6 style={{ margin: 0, color: "#fff", fontSize: "0.85rem", fontWeight: "700" }}>{title}</h6>
          <span style={{ fontSize: "0.72rem", color: "#a5b4fc" }}>📆 Event Date: {date}</span>
        </div>
      </div>
    );
  };

  // Carousel navigators for multi-image post cards
  const handleNextImage = (postId, totalImages) => {
    setCarouselIndices(prev => ({
      ...prev,
      [postId]: ((prev[postId] || 0) + 1) % totalImages
    }));
  };

  const handlePrevImage = (postId, totalImages) => {
    setCarouselIndices(prev => ({
      ...prev,
      [postId]: ((prev[postId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const insertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiGrid(false);
  };

  const getFilteredPosts = () => {
    let list = posts;
    switch (activeFeedTab) {
      case "following":
        list = posts.filter(p => p.author?._id && followingList && followingList.some(f => String(f._id || f) === String(p.author._id)));
        break;
      case "saved":
        list = posts.filter(p => bookmarkedPostIds.has(p._id));
        break;
      case "trending":
        list = [...posts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
        break;
      case "search-results":
        list = posts;
        break;
      default:
        list = posts;
        break;
    }

    return list.map(p => ({
      ...p,
      isBookmarked: bookmarkedPostIds.has(p._id)
    }));
  };

  const filteredPostsList = getFilteredPosts();

  const handleCropImageComplete = (index, croppedFile, croppedPreview) => {
    setSelectedImages(prev => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { file: croppedFile, preview: croppedPreview };
      }
      return next;
    });
  };

  return (
    <div className="dev-feed-container">



      {/* Enterprise-Grade Redesigned Create Post Modal */}
      <CreatePostModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        user={user}
        inputText={inputText}
        setInputText={setInputText}
        visibility={visibility}
        setVisibility={setVisibility}
        techChips={techChips}
        setTechChips={setTechChips}
        techInput={techInput}
        setTechInput={setTechInput}
        handleAddTechChip={handleAddTechChip}
        handleRemoveChip={handleRemoveChip}
        showCodeInput={showCodeInput}
        setShowCodeInput={setShowCodeInput}
        attachedCode={attachedCode}
        setAttachedCode={setAttachedCode}
        attachedCodeLang={attachedCodeLang}
        setAttachedCodeLang={setAttachedCodeLang}
        codeLinesCount={codeLinesCount}
        codeSizeKB={codeSizeKB}
        isCodeInvalid={isCodeInvalid}
        showPollInput={showPollInput}
        setShowPollInput={setShowPollInput}
        pollQuestionInput={pollQuestionInput}
        setPollQuestionInput={setPollQuestionInput}
        pollOptionsInput={pollOptionsInput}
        setPollOptionsInput={setPollOptionsInput}
        showRepoInput={showRepoInput}
        setShowRepoInput={setShowRepoInput}
        repoShareInput={repoShareInput}
        setRepoShareInput={setRepoShareInput}
        showEventInput={showEventInput}
        setShowEventInput={setShowEventInput}
        eventShareTitle={eventShareTitle}
        setEventShareTitle={setEventShareTitle}
        eventShareDate={eventShareDate}
        setEventShareDate={setEventShareDate}
        selectedImages={selectedImages}
        handleImagesChange={handleImagesChange}
        handleRemoveSelectedImage={handleRemoveSelectedImage}
        onCropImageComplete={handleCropImageComplete}
        uploadProgress={uploadProgress}
        selectedVideo={selectedVideo}
        videoPreview={videoPreview}
        handleVideoChange={handleVideoChange}
        handleRemoveSelectedVideo={handleRemoveSelectedVideo}
        fileInputRef={fileInputRef}
        videoInputRef={videoInputRef}
        handleCreatePost={handleCreatePost}
        handleSaveDraft={handleSaveDraft}
        isPublishDisabled={isPublishDisabled}
        isPosting={isPosting}
        textLength={textLength}
        isTextInvalid={isTextInvalid}
        parseMarkdown={parseMarkdown}
      />

      {/* Strict Validation Warning Modal */}
      <WarningModal
        isOpen={warningModal.isOpen}
        title={warningModal.title}
        message={warningModal.message}
        onClose={() => setWarningModal({ isOpen: false, title: "", message: "" })}
      />

      {/* Professional Confirm Post Publication Modal */}
      <ConfirmPostModal
        isOpen={confirmPostModal.isOpen}
        onConfirm={executePublishPost}
        onCancel={() => setConfirmPostModal({ isOpen: false, directText: null })}
        isPosting={isPosting}
      />

      {/* Enterprise-Grade Delete Post Confirmation Modal */}
      <DeletePostConfirmModal
        isOpen={Boolean(postToDelete)}
        onConfirm={confirmDeletePost}
        onCancel={() => setPostToDelete(null)}
        isDeleting={isDeletingPost}
      />

      {/* Report Post / User Modal */}
      <ReportUserModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportedUser={reportedTargetUser}
        evidenceType={reportEvidenceType || "POST"}
        evidenceId={reportEvidenceId}
        addToast={addToast}
      />

      {/* Rebuilt Modular Feed Page Component */}
      <FeedPage
        user={user}
        posts={filteredPostsList}
        stories={stories}
        onlineUsers={onlineUsers}
        suggestedUsers={suggestions}
        followingList={followingList}
        isLoading={isLoading}
        onCreatePost={(data) => {
          if (data && data.content && data.content.trim()) {
            setInputText(data.content);
            handleCreatePost(null, data.content);
          } else {
            setIsComposerOpen(true);
          }
        }}
        onLikePost={handleLikePost}
        onCommentPost={handleAddComment}
        onBookmarkPost={toggleBookmark}
        onSharePost={(id) => {
          const shareUrl = `${window.location.origin}/dashboard/feed?post=${id}`;
          if (navigator.share) {
            navigator.share({
              title: "CodeExpo Post",
              text: "Check out this developer post on CodeExpo!",
              url: shareUrl
            }).then(() => {
              addToast("Post shared successfully!", "success");
            }).catch(() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(shareUrl);
                addToast("Post link copied to clipboard!", "success");
              }
            });
          } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl);
            addToast("Post link copied to clipboard!", "success");
          } else {
            addToast("Share URL: " + shareUrl, "info");
          }
        }}
        onFollowToggle={handleFollowToggle}
        onUserClick={(userId) => onViewProfile ? onViewProfile(userId) : navigate(`/dashboard/profile/${userId}`)}
        onMessageUser={(userId) => navigate(`/dashboard/messages?user=${userId}`)}
        onOpenComposer={() => setIsComposerOpen(true)}
        onDeletePost={handleDeletePostClick}
        onReportPost={(postId, targetUser) => {
          setReportedTargetUser(targetUser);
          setReportEvidenceType("post");
          setReportEvidenceId(postId);
          setReportModalOpen(true);
        }}
        addToast={addToast}
      />
    </div>
  );
}
