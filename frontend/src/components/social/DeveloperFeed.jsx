import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Heart, Share2, Send, Trash2, Code, Plus, Sparkles, Image, Eye, EyeOff, CheckCircle2, Bookmark, X, ChevronLeft, ChevronRight, BarChart3, Calendar, ShieldCheck, Flame, GitFork, Star, Smile, Bell, Play, Search, MoreVertical, Copy } from "lucide-react";
import { createPost, getPosts, toggleLikePost, addCommentPost, deletePost, searchUsers } from "../../services/socialService";
import { createPortal } from "react-dom";
import socket from "../../socket/socket";
import ProfileAvatar from "../ProfileAvatar";
import ImageCropper from "./ImageCropper";
import ReportUserModal from "./ReportUserModal";
import "./PremiumFeed.css";
const FeedPortal = ({ children }) => {
  return createPortal(children, document.body);
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

// Reusable ExpandableText component for post descriptions to clamp long text
const ExpandableText = ({ children, maxHeight = 240 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      const checkHeight = () => {
        if (textRef.current) {
          setShouldShowButton(textRef.current.scrollHeight > maxHeight);
        }
      };
      checkHeight();
      const timeoutId = setTimeout(checkHeight, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [children, maxHeight]);

  return (
    <div style={{ position: "relative", marginBottom: "8px" }}>
      <div 
        ref={textRef}
        style={{ 
          maxHeight: !isExpanded ? `${maxHeight}px` : "none", 
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          position: "relative"
        }}
      >
        {children}
        {!isExpanded && shouldShowButton && (
          <div 
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "45px",
              background: "linear-gradient(to top, var(--ce-premium-bg) 20%, transparent 100%)",
              pointerEvents: "none"
            }}
          />
        )}
      </div>
      {shouldShowButton && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            fontSize: "0.82rem",
            fontWeight: "700",
            cursor: "pointer",
            padding: "4px 0",
            marginTop: "6px",
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
              video.play().catch(() => {});
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
    <AnimatePresence>
      <div 
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(5, 5, 8, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            background: "rgba(30, 30, 45, 0.65)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "16px",
            padding: "24px",
            width: "400px",
            maxWidth: "90vw",
            boxShadow: "0 24px 48px rgba(0, 0, 0, 0.5), 0 0 32px rgba(239, 68, 68, 0.1)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1.5px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ef4444",
              fontSize: "1.8rem"
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "1.2rem", fontWeight: "700" }}>{title}</h3>
            <p style={{ margin: 0, color: "var(--ce-premium-text)", fontSize: "0.88rem", lineHeight: "1.5", opacity: 0.85 }}>{message}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              border: "none",
              color: "#fff",
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "0.88rem",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
              width: "100%",
              marginTop: "8px"
            }}
            onMouseOver={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
            onMouseOut={(e) => e.currentTarget.style.filter = "brightness(1)"}
          >
            OK
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function DeveloperFeed({ user, addToast, followingList = [], handleFollowToggle, onViewProfile, suggestions = [] }) {
  const [posts, setPosts] = useState([]);
  const [visiblePosts, setVisiblePosts] = useState(6);
  const [inputText, setInputText] = useState("");
  const [techInput, setTechInput] = useState("");
  const [techChips, setTechChips] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [activeComments, setActiveComments] = useState({}); // postId: true/false
  const [commentInputs, setCommentInputs] = useState({}); // postId: text
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
  const videoInputRef = useRef(null);
  const prevExceededRef = useRef(false);

  // Live validation helpers
  const codeLinesCount = attachedCode ? attachedCode.split(/\r?\n/).length : 0;
  const codeSizeKB = attachedCode ? Math.round(new Blob([attachedCode]).size / 1024) : 0;
  const isCodeInvalid = codeLinesCount > 300 || codeSizeKB > 100;

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
    const exceeded = codeLinesCount > 300 || codeSizeKB > 100;
    if (exceeded && !prevExceededRef.current) {
      setWarningModal({
        isOpen: true,
        title: "Code Too Large",
        message: "Code posts are limited to 300 lines or 100 KB. Please split your solution into multiple posts or create a Gist."
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
    socket.on("post:liked", handlePostLiked);
    socket.on("post:commented", handlePostCommented);
    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("admin-user-action", handleAdminUserAction);

    return () => {
      socket.off("post:created", handlePostCreated);
      socket.off("post:deleted", handlePostDeleted);
      socket.off("post:liked", handlePostLiked);
      socket.off("post:commented", handlePostCommented);
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("admin-user-action", handleAdminUserAction);
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 10) {
      setWarningModal({
        isOpen: true,
        title: "Too Many Images",
        message: "You can upload a maximum of 10 images per post."
      });
      e.target.value = "";
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
      e.target.value = "";
      return;
    }

    const oversizedFile = files.find(file => file.size > 10 * 1024 * 1024);
    if (oversizedFile) {
      setWarningModal({
        isOpen: true,
        title: "Image Too Large",
        message: "Image exceeds the 10 MB limit. Please compress your image and try again."
      });
      e.target.value = "";
      return;
    }

    const fileToCrop = files[0];
    if (fileToCrop) {
      setCropSource(URL.createObjectURL(fileToCrop));
    }
    e.target.value = "";
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

    if (file.size > 100 * 1024 * 1024) {
      setWarningModal({
        isOpen: true,
        title: "Video Too Large",
        message: "Video file size exceeds the 100 MB limit. Please compress your video or upload a shorter clip."
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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedCode.trim() && selectedImages.length === 0 && !selectedVideo) return;

    setIsPosting(true);
    try {
      const formData = new FormData();

      let postText = inputText;

      // Append attached code blocks
      if (showCodeInput && attachedCode.trim()) {
        postText += `\n\n\`\`\`${attachedCodeLang}\n${attachedCode}\n\`\`\``;
      }

      // Append Dev Polls metadata block
      if (showPollInput && pollQuestionInput.trim()) {
        postText += `\n\n[POLL_QUESTION] ${pollQuestionInput}\n[POLL_OPTS] ${pollOptionsInput.a || "A"}, ${pollOptionsInput.b || "B"}, ${pollOptionsInput.c || "C"}, ${pollOptionsInput.d || "D"}`;
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
        fetchPosts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveDraft = () => {
    if (!inputText.trim()) {
      addToast("Draft is empty. Write post content first.", "error");
      return;
    }
    addToast("Dev update draft auto-saved locally!", "success");
  };

  const handleLikePost = async (postId, emoji = "👍") => {
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
      if (emoji !== "👍") {
        addToast(`Reacted with ${emoji}!`, "success");
      }
    } catch (err) {
      fetchPosts();
      addToast("Failed to react to post", "error");
    } finally {
      setActivePickerPost(null);
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const commentText = commentInputs[postId]?.trim();
    if (!commentText) return;

    setTypingPostIds(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));

    setTimeout(async () => {
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

      setTypingPostIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });

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
        addToast("Failed to submit reply comment", "error");
      }
    }, 900);
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
        addToast("Dev update deleted successfully!", "success");
        setPosts(prev => prev.filter(post => post._id !== postToDelete));
        setPostToDelete(null);
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete post", "error");
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

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0;">$1</h2>');

    // Bold/Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code block
    html = html.replace(/```([a-zA-Z0-9]*)(?:\r?\n)([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre style="background:#09090f; border:1px solid rgba(255,255,255,0.06); padding:12px; border-radius:10px; font-family:'Fira Code', monospace; font-size:0.8rem; overflow:auto; max-height:180px; margin:12px 0; max-width:100%; box-sizing:border-box;"><div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#64748b; margin-bottom:6px; text-transform:uppercase; position:sticky; top:0; background:#09090f; padding-bottom:4px;"><span>${lang || "code"}</span></div><code style="color:#38bdf8; white-space:pre; display:block;">${code}</code></pre>`;
    });

    // Inline Code
    html = html.replace(/`([^`\r\n]+)`/g, '<code style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-family:monospace; color:#fb7185;">$1</code>');

    // Hashtags
    html = html.replace(/#([a-zA-Z0-9_]+)/g, '<span style="color:#8b5cf6; font-weight:600; cursor:pointer;">#$1</span>');

    // Mentions
    html = html.replace(/@([a-zA-Z0-9_]+)/g, '<span style="color:#06b6d4; font-weight:600; cursor:pointer;">@$1</span>');

    html = html.replace(/\n/g, "<br />");

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
    switch (activeFeedTab) {
      case "following":
        return posts.filter(p => p.author?._id && followingList && followingList.some(f => String(f._id || f) === String(p.author._id)));
      case "saved":
        return posts.filter(p => bookmarkedPostIds.has(p._id));
      case "trending":
        return [...posts].sort((a, b) => b.likes.length - a.likes.length);
      case "search-results":
        return posts;
      default:
        return posts;
    }
  };

  const filteredPostsList = getFilteredPosts();

  return (
    <div className="dev-feed-container">



      {/* 2. Instagram-Style Creator Composer Popup Modal */}
      <AnimatePresence>
        {isComposerOpen && (
          <FeedPortal>
            <div className="ce-modal-overlay" onClick={() => setIsComposerOpen(false)} style={{ zIndex: 10010 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="ce-modal-card"
                style={{
                  maxWidth: "640px",
                  width: "90%",
                  padding: "24px",
                  background: "var(--ce-premium-card)",
                  border: "1px solid var(--ce-premium-border)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)"
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} style={{ color: "#8b5cf6" }} />
                    <h3 style={{ margin: 0, color: "var(--ce-premium-text)", fontSize: "1.1rem" }}>Create Dev Post</h3>
                  </div>
                  <button
                    style={{ background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer" }}
                    onClick={() => setIsComposerOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreatePost}>
                  <div className="composer-tabs" style={{ marginBottom: "14px" }}>
                    <button
                      type="button"
                      onClick={() => setComposerTab("write")}
                      className={`composer-tab-btn ${composerTab === "write" ? "active" : ""}`}
                    >
                      Write Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerTab("preview")}
                      className={`composer-tab-btn ${composerTab === "preview" ? "active" : ""}`}
                    >
                      Preview
                    </button>
                  </div>

                  {composerTab === "write" ? (
                    <div style={{ position: "relative" }}>
                      <textarea
                        placeholder="What are you building today? Markdown and snippets are fully supported..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="composer-textarea"
                        rows={5}
                      />

                      {/* Character Counter */}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: isTextInvalid ? "#ef4444" : "var(--ce-premium-muted)", marginTop: "4px", padding: "0 4px" }}>
                        <span>Text characters</span>
                        <span style={{ fontWeight: isTextInvalid ? "700" : "normal" }}>{textLength} / 5,000</span>
                      </div>

                      {/* Emoji picker button */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiGrid(!showEmojiGrid)}
                        style={{ position: "absolute", bottom: "24px", right: "10px", background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer" }}
                      >
                        <Smile size={16} />
                      </button>

                      {/* Emojis Popup */}
                      {showEmojiGrid && (
                        <div style={{ position: "absolute", bottom: "50px", right: "10px", background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", borderRadius: "8px", padding: "8px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", zIndex: 12 }}>
                          {["💻", "🚀", "🔥", "💡", "⚡", "🧠", "🎉", "🤝", "📦", "🎨"].map(e => (
                            <span key={e} onClick={() => insertEmoji(e)} style={{ cursor: "pointer", fontSize: "1.1rem" }}>{e}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="composer-preview-pane" style={{ minHeight: "130px" }}>
                      {inputText.trim() ? parseMarkdown(inputText) : <span style={{ color: "var(--ce-premium-muted)", fontSize: "0.85rem" }}>Post preview will render here. Support headers, bold, `code`, and blocks.</span>}
                    </div>
                  )}

                  {/* Upload Progress Bar if active */}
                  {uploadProgress > 0 && (
                    <div style={{ height: "3px", width: "100%", background: "var(--ce-premium-border)", borderRadius: "2px", overflow: "hidden", margin: "10px 0" }}>
                      <div style={{ height: "100%", background: "#6366f1", width: `${uploadProgress}%` }} />
                    </div>
                  )}

                  {/* Code Snippet attachment drawer */}
                  {showCodeInput && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "0.78rem", color: "var(--ce-premium-text)" }}>Language:</span>
                          <select
                            value={attachedCodeLang}
                            onChange={(e) => setAttachedCodeLang(e.target.value)}
                            style={{ background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", borderRadius: "6px", fontSize: "0.75rem", padding: "4px 8px" }}
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                            <option value="rust">Rust</option>
                            <option value="golang">Go</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: "10px", fontSize: "0.72rem", color: isCodeInvalid ? "#ef4444" : "var(--ce-premium-muted)" }}>
                          <span style={{ fontWeight: codeLinesCount > 300 ? "700" : "normal" }}>Lines: {codeLinesCount}/300</span>
                          <span style={{ fontWeight: codeSizeKB > 100 ? "700" : "normal" }}>Size: {codeSizeKB}/100 KB</span>
                        </div>
                      </div>
                      <textarea
                        placeholder="Paste or write your source code block here..."
                        value={attachedCode}
                        onChange={(e) => setAttachedCode(e.target.value)}
                        className="composer-textarea"
                        style={{ fontFamily: "monospace", minHeight: "100px", fontSize: "0.82rem", borderColor: isCodeInvalid ? "#ef4444" : "" }}
                      />
                    </div>
                  )}

                  {/* Poll inputs block */}
                  {showPollInput && (
                    <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px", background: "var(--ce-premium-glow)", border: "1px dashed var(--ce-premium-border)", padding: "12px", borderRadius: "8px" }}>
                      <input
                        type="text"
                        placeholder="Poll Question"
                        value={pollQuestionInput}
                        onChange={(e) => setPollQuestionInput(e.target.value)}
                        className="composer-textarea"
                        style={{ minHeight: "36px", padding: "8px 10px" }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input type="text" placeholder="Option A" value={pollOptionsInput.a} onChange={(e) => setPollOptionsInput(p => ({ ...p, a: e.target.value }))} style={{ background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", fontSize: "0.78rem", padding: "6px 10px", borderRadius: "6px" }} />
                        <input type="text" placeholder="Option B" value={pollOptionsInput.b} onChange={(e) => setPollOptionsInput(p => ({ ...p, b: e.target.value }))} style={{ background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", fontSize: "0.78rem", padding: "6px 10px", borderRadius: "6px" }} />
                      </div>
                    </div>
                  )}

                  {/* Repository inputs block */}
                  {showRepoInput && (
                    <div style={{ marginTop: "12px" }}>
                      <input
                        type="text"
                        placeholder="Enter GitHub Repository path (e.g. facebook/react)"
                        value={repoShareInput}
                        onChange={(e) => setRepoShareInput(e.target.value)}
                        style={{ width: "100%", background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", fontSize: "0.8rem", padding: "8px 10px", borderRadius: "6px" }}
                      />
                    </div>
                  )}

                  {/* Event inputs block */}
                  {showEventInput && (
                    <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="Event Title"
                        value={eventShareTitle}
                        onChange={(e) => setEventShareTitle(e.target.value)}
                        style={{ flex: 1, background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", fontSize: "0.8rem", padding: "8px 10px", borderRadius: "6px" }}
                      />
                      <input
                        type="text"
                        placeholder="Date (e.g., July 15)"
                        value={eventShareDate}
                        onChange={(e) => setEventShareDate(e.target.value)}
                        style={{ width: "150px", background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", fontSize: "0.8rem", padding: "8px 10px", borderRadius: "6px" }}
                      />
                    </div>
                  )}

                  {/* Chips tag container */}
                  <div className="composer-chips-row">
                    {techChips.map(c => (
                      <span key={c} className="composer-chip">
                        #{c} <button type="button" onClick={() => handleRemoveChip(c)}>&times;</button>
                      </span>
                    ))}
                  </div>

                  <div className="composer-input-row" style={{ marginTop: "12px" }}>
                    <Code size={14} style={{ color: "#8b5cf6" }} />
                    <input
                      type="text"
                      placeholder="Add technology tags (React, MERN, Node... Press Enter)"
                      value={techInput}
                      onChange={(e) => setTechInput(e.target.value)}
                      onKeyDown={handleAddTechChip}
                    />
                  </div>

                  {/* Multiple Images previews */}
                  {selectedImages.length > 0 && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                      {selectedImages.map((imgObj, idx) => (
                        <div key={idx} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <img src={imgObj.preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedImage(idx)}
                            style={{ position: "absolute", top: "2px", right: "2px", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: "16px", height: "16px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", cursor: "pointer" }}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Video preview */}
                  {selectedVideo && (
                    <div style={{ position: "relative", width: "160px", height: "90px", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", margin: "12px 0" }}>
                      <video src={videoPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={handleRemoveSelectedVideo}
                        style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        &times;
                      </button>
                    </div>
                  )}

                  {/* Composer Actions row */}
                  <div className="composer-actions-bar" style={{ marginTop: "18px" }}>
                    <div className="composer-action-btn-group" style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="composer-icon-btn"
                        title="Add Images"
                      >
                        <Image size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className={`composer-icon-btn ${selectedVideo ? "active" : ""}`}
                        title="Add Video"
                      >
                        <Play size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCodeInput(!showCodeInput)}
                        className={`composer-icon-btn ${showCodeInput ? "active" : ""}`}
                        title="Add Code Snippet"
                      >
                        <Code size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPollInput(!showPollInput)}
                        className={`composer-icon-btn ${showPollInput ? "active" : ""}`}
                        title="Add Poll"
                      >
                        <BarChart3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRepoInput(!showRepoInput)}
                        className={`composer-icon-btn ${showRepoInput ? "active" : ""}`}
                        title="Share GitHub Repo"
                      >
                        <GitFork size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEventInput(!showEventInput)}
                        className={`composer-icon-btn ${showEventInput ? "active" : ""}`}
                        title="Share Event"
                      >
                        <Calendar size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="composer-icon-btn"
                        title="Save Draft"
                      >
                        <Bookmark size={15} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="image/*"
                        multiple
                        onChange={handleImagesChange}
                      />
                      <input
                        type="file"
                        ref={videoInputRef}
                        style={{ display: "none" }}
                        accept="video/*"
                        onChange={handleVideoChange}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="composer-select-visibility"
                      >
                        <option value="public">🌍 Public</option>
                        <option value="followers">👥 Followers</option>
                        <option value="private">🔒 Private Only</option>
                      </select>

                      <button type="submit" disabled={isPublishDisabled} className="register-btn" style={{ width: "auto", padding: "8px 16px", opacity: isPublishDisabled ? 0.5 : 1, cursor: isPublishDisabled ? "not-allowed" : "pointer" }}>
                        {isPosting ? "Posting..." : "Share Post"}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          </FeedPortal>
        )}
      </AnimatePresence>

      {/* Strict Validation Warning Modal */}
      <WarningModal 
        isOpen={warningModal.isOpen} 
        title={warningModal.title} 
        message={warningModal.message} 
        onClose={() => setWarningModal({ isOpen: false, title: "", message: "" })} 
      />

      {/* Horizontal Feed Filters */}
      {/* Horizontal Feed Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
        {/* Row 1: Tabs on Left, Create Post on Right */}
        <div className="premium-feed-tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", width: "100%" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "for-you", label: "For You" },
              { id: "following", label: "Following" },
              { id: "trending", label: "Trending" },
              { id: "saved", label: "Saved" }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveFeedTab(t.id);
                  setSearchQueryInput("");
                  setSearchQuery("");
                  setSearchedUsers([]);
                  fetchPosts();
                }}
                className={`premium-feed-tab ${activeFeedTab === t.id && !searchQuery ? "active" : ""}`}
              >
                {t.label}
              </button>
            ))}
            {activeFeedTab === "search-results" && (
              <button className="premium-feed-tab active">
                Search Results
              </button>
            )}
          </div>

          <button
            onClick={() => setIsComposerOpen(true)}
            className="premium-feed-tab active"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "20px",
              border: "none",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            <Plus size={14} /> Create Post
          </button>
        </div>

        {/* Row 2: Search Bar aligned to the Right (directly under Create Post) */}
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", maxWidth: "340px", position: "relative" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--ce-premium-muted)" }} />
              <input
                type="text"
                placeholder="Search posts or users..."
                value={searchQueryInput}
                onChange={(e) => setSearchQueryInput(e.target.value)}
                className="premium-feed-search-input"
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                  outline: "none",
                  transition: "all 0.2s ease"
                }}
              />
              {searchQueryInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer", padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="premium-feed-tab active"
              style={{
                padding: "8px 14px",
                borderRadius: "20px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.82rem",
                background: "var(--ce-accent)",
                color: "#fff"
              }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {activeFeedTab === "search-results" && (
        <div style={{ marginBottom: "16px", color: "var(--ce-premium-text)", fontSize: "0.9rem" }}>
          Showing search results for <strong style={{ color: "#8b5cf6" }}>"{searchQuery}"</strong>
        </div>
      )}

      {/* Searched Users Row */}
      {activeFeedTab === "search-results" && searchedUsers.length > 0 && (
        <div className="premium-glass-card" style={{ padding: "16px", marginBottom: "20px", background: "var(--ce-premium-card)", border: "1px solid var(--ce-premium-border)" }}>
          <h4 style={{ color: "var(--ce-premium-text)", margin: "0 0 12px 0", fontSize: "0.9rem", fontWeight: "600" }}>Matching Users ({searchedUsers.length})</h4>
          <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }} className="ce-horizontal-scroll">
            {searchedUsers.map(dev => {
              const isFollowed = followingList.some(f => String(f._id || f) === String(dev._id || dev.id));
              return (
                <div key={dev._id || dev.id} className="ce-search-user-card">
                  <img
                    src={dev.avatar || "/default-avatar.png"}
                    alt={dev.username}
                    style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover", marginBottom: "8px", border: "2px solid #8b5cf6" }}
                  />
                  <span style={{ color: "var(--ce-premium-text)", fontSize: "0.82rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", cursor: "pointer" }} onClick={() => onViewProfile(dev._id || dev.id)}>
                    {dev.username}
                  </span>
                  <span style={{ color: "var(--ce-premium-muted)", fontSize: "0.7rem", marginBottom: "8px", height: "16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                    {dev.bio || "No bio"}
                  </span>
                  <button
                    onClick={() => handleFollowToggle(dev._id || dev.id)}
                    className={`follow-btn-mini ${isFollowed ? "following" : ""}`}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "20px",
                      border: isFollowed ? "1px solid var(--ce-premium-border)" : "1px solid rgba(139, 92, 246, 0.25)",
                      fontSize: "0.72rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: isFollowed ? "rgba(139, 92, 246, 0.05)" : "rgba(139, 92, 246, 0.1)",
                      color: isFollowed ? "var(--ce-premium-muted)" : "#8b5cf6",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts Feed list */}
      <div className="feed-posts-list">
        {isLoading ? (
          // Shimmer loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="premium-glass-card skeleton-shimmer" style={{ minHeight: "180px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "14px" }}>
                <div className="skeleton-circle skeleton-shimmer" />
                <div style={{ flex: 1 }}>
                  <div className="skeleton-line title skeleton-shimmer" />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: "30%" }} />
                </div>
              </div>
              <div className="skeleton-line body-1 skeleton-shimmer" style={{ marginBottom: "10px" }} />
              <div className="skeleton-line body-2 skeleton-shimmer" />
            </div>
          ))
        ) : filteredPostsList.length === 0 ? (
          <div className="premium-glass-card" style={{ textAlign: "center", padding: "40px 20px" }}>
            {activeFeedTab === "search-results" ? (
              <>
                <Search size={32} style={{ color: "var(--ce-premium-muted)", marginBottom: "16px" }} />
                <h4 style={{ color: "#fff", margin: "0 0 6px 0" }}>No search results found</h4>
                <p style={{ color: "var(--ce-premium-muted)", fontSize: "0.82rem", margin: 0 }}>We couldn't find any posts matching "{searchQuery}"</p>
              </>
            ) : (
              <>
                <Sparkles size={32} style={{ color: "var(--ce-premium-muted)", marginBottom: "16px" }} />
                <h4 style={{ color: "#fff", margin: "0 0 6px 0" }}>No activities found</h4>
                <p style={{ color: "var(--ce-premium-muted)", fontSize: "0.82rem", margin: 0 }}>Be the first to share an update on CodeExpo!</p>
              </>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filteredPostsList.slice(0, visiblePosts).map(post => {
              if (!post.author) return null;
              const hasLiked = post.likes.includes(user?.id || user?._id);
              const showComments = activeComments[post._id];
              const isOwner = String(post.author._id) === String(user?.id || user?._id);
              const isBookmarked = bookmarkedPostIds.has(post._id);

              const postImages = post.images && post.images.length > 0 ? post.images : (post.image ? [post.image] : []);
              const activeImgIdx = carouselIndices[post._id] || 0;

              const isFollowed = followingList ? followingList.some(f => String(f._id || f) === String(post.author._id)) : false;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  key={post._id}
                  className="premium-post-card"
                >
                  {/* Post Header */}
                  <div className="post-header">
                    <div 
                      className="post-author-info" 
                      onClick={() => onViewProfile && onViewProfile(post.author._id)}
                      style={{ cursor: onViewProfile ? "pointer" : "default" }}
                    >
                      <div className="post-avatar-ring" style={{ width: "40px", height: "40px" }}>
                        {post.author.avatar ? (
                          <img src={post.author.avatar} alt={post.author.username} style={{ border: "1px solid #000" }} />
                        ) : (
                          <div className="comment-avatar-bubble-fallback" style={{ width: "36px", height: "36px" }}>
                            {post.author.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="post-name-section">
                        <div className="post-username-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                          <span className="post-username-text" style={{ display: "inline-flex", alignItems: "center" }}>
                            @{post.author.username}
                            {post.author.subscription && post.author.subscription.status === "active" && (
                              <span 
                                title={`${post.author.subscription.plan} Verified`} 
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "12px",
                                  height: "12px",
                                  borderRadius: "50%",
                                  background: post.author.subscription.plan === "Developer Pro" ? "#10b981" : "#f59e0b",
                                  color: "#fff",
                                  marginLeft: "5px",
                                  fontSize: "7px",
                                  fontWeight: "bold",
                                  boxShadow: `0 0 6px ${post.author.subscription.plan === "Developer Pro" ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                                  flexShrink: 0
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </span>
                          {post.author.status === "Coding" && (
                            <span className="post-dot-online" style={{ width: "6px", height: "6px" }} />
                          )}
                          {post.isPinned && (
                            <span className="post-badge-pinned" title="Pinned by Administrator">📌 Pinned</span>
                          )}
                          {post.isFeatured && (
                            <span className="post-badge-featured" title="Featured by Administrator">⭐ Featured</span>
                          )}
                          {post.isSensitive && (
                            <span className="post-badge-sensitive-indicator" title="Flagged as Sensitive Content">⚠️ Sensitive</span>
                          )}
                        </div>
                        <span className="post-author-role">{post.author.title || "Developer"}</span>
                      </div>
                    </div>

                    <div className="post-meta-details" style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      <span title={new Date(post.createdAt).toLocaleString()} style={{ color: "var(--ce-premium-muted)", fontSize: "0.74rem", whiteSpace: "nowrap" }}>{formatPostTime(post.createdAt)}</span>
                      {!isOwner && (
                        <button
                          onClick={() => handleFollowToggle(post.author._id)}
                          style={{
                            background: isFollowed ? "rgba(255, 255, 255, 0.05)" : "rgba(96, 165, 250, 0.08)",
                            border: isFollowed ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(96, 165, 250, 0.25)",
                            color: isFollowed ? "var(--ce-premium-muted)" : "#60a5fa",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            transition: "all 0.2s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {isFollowed ? "Following" : "+ Follow"}
                        </button>
                      )}
                      
                      {/* Post 3-dot Options Menu */}
                      <div className="post-options-dropdown-container" style={{ position: "relative" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePostMenuId(activePostMenuId === post._id ? null : post._id);
                          }}
                          className="post-dropdown-trigger"
                          style={{ background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer", display: "flex", alignItems: "center", padding: "4px" }}
                          title="Options"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {activePostMenuId === post._id && (
                          <div className="ce-options-dropdown">
                            {isOwner ? (
                              <button
                                onClick={() => {
                                  setActivePostMenuId(null);
                                  handleDeletePostClick(post._id);
                                }}
                                className="ce-options-dropdown-item danger"
                              >
                                <Trash2 size={13} />
                                <span>Delete Post</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActivePostMenuId(null);
                                  setReportedTargetUser(post.author);
                                  setReportEvidenceType("POST");
                                  setReportEvidenceId(post._id);
                                  setReportModalOpen(true);
                                }}
                                className="ce-options-dropdown-item danger"
                              >
                                ⚠️ <span>Report Post</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                   {/* Sensitive overlay wrapper */}
                  <div className="sensitive-overlay-container">
                    <div className={post.isSensitive && !revealedSensitivePosts[post._id] ? "sensitive-blur-active" : ""}>
                      {/* Post Content */}
                      <div className="post-card-content">
                        <ExpandableText maxHeight={240}>
                          {renderPostContent(post.text, addToast)}
                        </ExpandableText>
                      </div>

                      {/* Render Poll section template if present */}
                      {parsePollBlock(post._id, post.text)}

                      {/* Render GitHub repository embed template if present */}
                      {parseRepoBlock(post.text)}

                      {/* Render Event embed template if present */}
                      {parseEventBlock(post.text)}

                      {/* Video Attachment with 16:9 aspect ratio */}
                      {post.video && (
                        <div className="post-video-container" style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", borderRadius: "12px", background: "#000", marginTop: "12px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                          <AutoplayVideo src={post.video} />
                        </div>
                      )}

                      {/* Redesigned Premium Carousel Multi-Image Block - Edge to Edge */}
                      {postImages.length > 0 && (
                        <div className="post-carousel-container" style={{ position: "relative", overflow: "hidden", background: "#000" }}>
                          <div style={{ display: "flex", height: "100%", transition: "transform 0.3s ease", transform: `translateX(-${activeImgIdx * 100}%)` }}>
                            {postImages.map((src, i) => (
                              <img key={i} src={src} alt={`Attachment ${i}`} style={{ width: "100%", height: "100%", flexShrink: 0, objectFit: "cover" }} />
                            ))}
                          </div>

                          {/* Carousel Arrow Controls */}
                          {postImages.length > 1 && (
                            <>
                              <button
                                onClick={() => handlePrevImage(post._id, postImages.length)}
                                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                onClick={() => handleNextImage(post._id, postImages.length)}
                                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}
                              >
                                <ChevronRight size={16} />
                              </button>

                              {/* Carousel Dots indicators */}
                              <div style={{ position: "absolute", bottom: "10px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px", zIndex: 5 }}>
                                {postImages.map((_, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      background: activeImgIdx === i ? "#fff" : "rgba(255,255,255,0.4)",
                                      transition: "background 0.2s"
                                    }}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Tech chips block */}
                      {post.techStack && post.techStack.length > 0 && (
                        <div className="post-card-tags">
                          {post.techStack.map(tag => (
                            <span key={tag} className="post-tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {post.isSensitive && !revealedSensitivePosts[post._id] && (
                      <div className="sensitive-shield-mask">
                        <h4 className="sensitive-shield-title">Sensitive Content</h4>
                        <p className="sensitive-shield-desc">This post has been flagged as sensitive by the platform administrators.</p>
                        <button
                          type="button"
                          className="btn-reveal-sensitive"
                          onClick={() => setRevealedSensitivePosts(prev => ({ ...prev, [post._id]: true }))}
                        >
                          Show Sensitive Content
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post Action Reactions row */}
                  <div className="post-reactions-wrapper">
                    <div className="post-reactions-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Liking Button - ONLY Heart Icon */}
                      <button
                        onClick={() => !post.likesDisabled && handleLikePost(post._id)}
                        className={`reaction-button-trigger ${hasLiked ? "liked" : ""}`}
                        style={{ paddingRight: "4px", opacity: post.likesDisabled ? 0.45 : 1, cursor: post.likesDisabled ? "not-allowed" : "pointer" }}
                        title={post.likesDisabled ? "Likes are disabled for this post" : (hasLiked ? "Unlike" : "Like")}
                        disabled={post.likesDisabled}
                      >
                        <Heart size={14} fill={hasLiked ? "#f43f5e" : "none"} color={hasLiked ? "#f43f5e" : "var(--ce-premium-text)"} />
                      </button>

                      {/* Likers Avatars Stack with Clickable More Option */}
                      {(() => {
                        const resolvedLikers = post.likes.map(resolveLikedUser).filter(Boolean);
                        if (resolvedLikers.length === 0) return null;
                        return (
                          <div className="card-likes-avatars-stack" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              {resolvedLikers.slice(0, 3).map((u, i) => (
                                <div
                                  key={i}
                                  className="avatar-stack-item"
                                  style={{
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: "1px solid var(--ce-surface-card)",
                                    marginLeft: i > 0 ? "-6px" : "0",
                                    zIndex: 10 - i,
                                    cursor: "pointer"
                                  }}
                                  onClick={() => setLikedUsersListModal(resolvedLikers)}
                                  title={`@${u.username}`}
                                >
                                  {u.avatar ? (
                                    <img src={u.avatar} alt={u.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <div className="avatar-fallback" style={{ width: "100%", height: "100%", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff" }}>
                                      {(u.username || "D").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => setLikedUsersListModal(resolvedLikers)}
                              style={{ background: "none", border: "none", color: "var(--ce-primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600, padding: 0 }}
                            >
                              {resolvedLikers.length > 3 ? `+${resolvedLikers.length - 3} others` : `liked`}
                            </button>
                          </div>
                        );
                      })()}

                      <button
                        onClick={() => setActiveComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                        className="reaction-button-trigger"
                      >
                        <MessageSquare size={14} />
                        <span>{post.comments.length} Comments</span>
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => toggleBookmark(post._id)}
                        className="reaction-button-trigger"
                        style={{ color: isBookmarked ? "#3b82f6" : "var(--ce-premium-text)" }}
                        title="Bookmark post"
                      >
                        <Bookmark size={14} fill={isBookmarked ? "#3b82f6" : "none"} />
                      </button>
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={() => setOpenSharePostId(openSharePostId === post._id ? null : post._id)}
                          className="reaction-button-trigger"
                          title="Share link"
                        >
                          <Share2 size={14} />
                        </button>
                        {openSharePostId === post._id && (
                          <div className="share-dropdown-menu">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
                                addToast("Link copied to clipboard!", "success");
                                setOpenSharePostId(null);
                              }}
                              style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
                            >
                              <Copy size={13} style={{ color: "var(--ce-text)", flexShrink: 0 }} className="share-dropdown-icon" /> Copy Link
                            </button>
                            <a 
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this post on CodeExpo: " + window.location.origin + "/post/" + post._id)}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={() => setOpenSharePostId(null)}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "13px", height: "13px", color: "var(--ce-text)", flexShrink: 0 }} className="share-dropdown-icon">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg> WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Thread */}
                  {showComments && (
                    <div className="post-comments-thread">
                      <div className="nested-comments-list">
                        {post.comments.map(c => (
                          <div key={c._id} className="comment-bubble-wrapper">
                            {c.avatar ? (
                              <img src={c.avatar} alt={c.username} className="comment-avatar-bubble" />
                            ) : (
                              <div className="comment-avatar-bubble-fallback">
                                {c.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="comment-bubble-body">
                              <div className="comment-meta-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                  <span className="comment-author-name" style={{ display: "inline-flex", alignItems: "center" }}>
                                    @{c.username}
                                    {c.user?.subscription?.status === "active" && (
                                      <span 
                                        title={`${c.user.subscription.plan} Verified`} 
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          width: "10px",
                                          height: "10px",
                                          borderRadius: "50%",
                                          background: c.user.subscription.plan === "Developer Pro" ? "#10b981" : "#f59e0b",
                                          color: "#fff",
                                          marginLeft: "4px",
                                          fontSize: "6px",
                                          fontWeight: "bold",
                                          boxShadow: `0 0 4px ${c.user.subscription.plan === "Developer Pro" ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
                                          flexShrink: 0
                                        }}
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </span>
                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                {String(c.user?._id || c.user || c.sender || "") !== String(user?.id || user?._id) && (
                                  <div style={{ position: "relative" }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCommentMenuId(activeCommentMenuId === c._id ? null : c._id);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--ce-premium-muted)",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "2px"
                                      }}
                                      title="Options"
                                    >
                                      <MoreVertical size={12} />
                                    </button>
                                    {activeCommentMenuId === c._id && (
                                      <div className="ce-options-dropdown" style={{ top: "-8px", right: "20px" }}>
                                        <button
                                          onClick={() => {
                                            setActiveCommentMenuId(null);
                                            setReportedTargetUser({ _id: c.user?._id || c.user, username: c.username });
                                            setReportEvidenceType("COMMENT");
                                            setReportEvidenceId(c._id);
                                            setReportModalOpen(true);
                                          }}
                                          className="ce-options-dropdown-item danger"
                                        >
                                          ⚠️ <span>Report Comment</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="comment-text-content">{c.text}</p>
                            </div>
                          </div>
                        ))}

                        {/* Typing simulation feedback */}
                        {typingPostIds.has(post._id) && (
                          <div className="comment-bubble-wrapper" style={{ opacity: 0.65 }}>
                            <div className="comment-avatar-bubble-fallback">💬</div>
                            <div className="comment-bubble-body">
                              <span style={{ fontSize: "0.78rem", color: "var(--ce-premium-muted)" }}>Typing comment update...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <form onSubmit={(e) => handleAddComment(e, post._id)} className="comment-input-form-row">
                        <input
                          type="text"
                          placeholder={post.commentsLocked ? "Comments are locked for this post." : "Reply to this thread with markdown..."}
                          value={commentInputs[post._id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                          className="comment-text-input"
                          disabled={post.commentsLocked}
                          style={{ cursor: post.commentsLocked ? "not-allowed" : "text" }}
                        />
                        <button type="submit" className="comment-send-submit-btn" disabled={post.commentsLocked} style={{ cursor: post.commentsLocked ? "not-allowed" : "pointer" }}>
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

        {/* Load More button */}
        {!isLoading && filteredPostsList.length > visiblePosts && (
          <button
            onClick={() => setVisiblePosts(prev => prev + 6)}
            className="register-btn"
            style={{ margin: "20px auto 0 auto", width: "auto", display: "block", padding: "10px 24px" }}
          >
            Load More Posts
          </button>
        )}
      </div>

      {/* Delete Post Modal */}
      <AnimatePresence>
        {postToDelete && (
          <FeedPortal>
            <div className="ce-modal-overlay" onClick={() => setPostToDelete(null)} style={{ zIndex: 10009 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="ce-modal-card"
                style={{ maxWidth: "380px", width: "90%", padding: "20px", textAlign: "center", background: "#0a0a0f", border: "1px solid var(--ce-premium-border)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "1.1rem", fontWeight: "700" }}>Delete Activity?</h3>
                <p style={{ margin: "0 0 20px 0", color: "var(--ce-premium-muted)", fontSize: "0.82rem", lineHeight: "1.4" }}>
                  Are you sure you want to delete this activity? This will permanently remove it from the global feed.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setPostToDelete(null)}
                    style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePost}
                    disabled={isDeletingPost}
                    style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    {isDeletingPost ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            </div>
          </FeedPortal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {likedUsersListModal && (
          <FeedPortal>
            <div className="ce-modal-overlay" onClick={() => setLikedUsersListModal(null)} style={{ zIndex: 100000 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="ce-modal-card"
                style={{ maxWidth: "380px", width: "90%", padding: "20px", background: "var(--ce-surface-card)", border: "1px solid var(--ce-border)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--ce-text-h)", fontSize: "1.1rem", fontWeight: "700" }}>Liked By</h3>
                  <button 
                    onClick={() => setLikedUsersListModal(null)} 
                    style={{ background: "none", border: "none", color: "var(--ce-text-muted)", cursor: "pointer" }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "4px" }}>
                  {likedUsersListModal.map((liker, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(99, 102, 241, 0.04)", borderRadius: "8px", border: "1px solid var(--ce-border)" }}>
                      <div 
                        style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                        onClick={() => {
                          setLikedUsersListModal(null);
                          if (onViewProfile) onViewProfile(liker._id);
                        }}
                      >
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {liker.avatar ? (
                            <img src={liker.avatar} alt={liker.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ce-primary)", color: "#fff", fontSize: "0.8rem", fontWeight: "600" }}>
                              {(liker.username || "D").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--ce-text)" }}>@{liker.username}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--ce-text-muted)" }}>{liker.title || "Developer"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </FeedPortal>
        )}
      </AnimatePresence>
      {cropSource && (
        <FeedPortal>
          <ImageCropper
            imageSrc={cropSource}
            aspect={1.2}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropSource(null)}
          />
        </FeedPortal>
      )}

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportedTargetUser(null);
          setReportEvidenceType("");
          setReportEvidenceId("");
        }}
        reportedUser={reportedTargetUser}
        evidenceType={reportEvidenceType}
        evidenceId={reportEvidenceId}
        addToast={addToast}
      />
    </div>
  );
}


