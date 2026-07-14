import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Sparkles, Trash2, Send, Flame, Zap, Heart, MessageSquare, Image, Video, ChevronLeft, ChevronRight, HelpCircle, BarChart3, Bot, Check, Pause } from "lucide-react";
import { createStory, getStories, deleteStory, toggleLikeStory, addCommentStory } from "../../services/socialService";
import { createPortal } from "react-dom";
import ImageCropper from "./ImageCropper";
import "./PremiumFeed.css";

const Portal = ({ children }) => {
  return createPortal(children, document.body);
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
            <p style={{ margin: 0, color: "#fff", fontSize: "0.88rem", lineHeight: "1.5", opacity: 0.85 }}>{message}</p>
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

export default function StoriesSystem({ user, addToast, vertical = false }) {
  const [stories, setStories] = useState([]);
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: "", message: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [newStoryText, setNewStoryText] = useState("");
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // When viewing a story
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyToDelete, setStoryToDelete] = useState(null); // Custom delete confirmation modal
  const [isDeleting, setIsDeleting] = useState(false); // Spinner state for story deletion
  const [isPosting, setIsPosting] = useState(false); // Spinner state for posting story
  const [readStories, setReadStories] = useState(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [isStoriesLoading, setIsStoriesLoading] = useState(true);

  useEffect(() => {
    setIsPaused(false);
  }, [activeStoryIndex, activeStoryGroup]);

  // Interactive Story additions
  const [storyTheme, setStoryTheme] = useState("dark-purple");
  const [storyReply, setStoryReply] = useState("");
  const [showStoryComments, setShowStoryComments] = useState(false);

  // New Story Type Selector
  const [storyType, setStoryType] = useState("text"); // text, media, poll, question, ai
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState({ opt1: "", opt2: "" });
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [pollVote, setPollVote] = useState(null); // client-side vote simulation
  const [questionAnswer, setQuestionAnswer] = useState("");

  // File Upload State for Stories (Image / Video)
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaType, setMediaType] = useState(""); // "image" or "video"
  const mediaInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const fetchStories = async () => {
    setIsStoriesLoading(true);
    try {
      const res = await getStories();
      if (res.success) {
        setStories(res.stories || []);
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
    } finally {
      setIsStoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
    try {
      const userKey = user?.id || user?._id || "guest";
      const cached = localStorage.getItem(`codeexpo_read_stories_${userKey}`);
      if (cached) {
        setReadStories(new Set(JSON.parse(cached)));
      }
    } catch (e) { }
  }, [user?.id, user?._id]);

  const markStoryAsRead = (storyId) => {
    if (!storyId) return;
    setReadStories((prev) => {
      const updated = new Set(prev);
      updated.add(storyId);
      try {
        const userKey = user?.id || user?._id || "guest";
        localStorage.setItem(`codeexpo_read_stories_${userKey}`, JSON.stringify(Array.from(updated)));
      } catch (e) { }
      return updated;
    });
  };

  const handleNextStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex < activeStoryGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      markStoryAsRead(activeStoryGroup.stories[nextIdx]?._id);
      setStoryProgress(0);
      setShowStoryComments(false);
      setPollVote(null);
      setQuestionAnswer("");
    } else {
      const currentGroupIdx = storyGroups.findIndex(g => g.username === activeStoryGroup.username);
      if (currentGroupIdx !== -1 && currentGroupIdx < storyGroups.length - 1) {
        const nextGroup = storyGroups[currentGroupIdx + 1];
        setActiveStoryGroup(nextGroup);
        setActiveStoryIndex(0);
        markStoryAsRead(nextGroup.stories[0]?._id);
        setStoryProgress(0);
        setShowStoryComments(false);
        setPollVote(null);
        setQuestionAnswer("");
      } else {
        setActiveStoryGroup(null);
      }
    }
  };

  const handlePrevStory = () => {
    if (!activeStoryGroup) return;
    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1;
      setActiveStoryIndex(prevIdx);
      markStoryAsRead(activeStoryGroup.stories[prevIdx]?._id);
      setStoryProgress(0);
      setShowStoryComments(false);
      setPollVote(null);
      setQuestionAnswer("");
    } else {
      const currentGroupIdx = storyGroups.findIndex(g => g.username === activeStoryGroup.username);
      if (currentGroupIdx > 0) {
        const prevGroup = storyGroups[currentGroupIdx - 1];
        setActiveStoryGroup(prevGroup);
        const lastIdx = prevGroup.stories.length - 1;
        setActiveStoryIndex(lastIdx);
        markStoryAsRead(prevGroup.stories[lastIdx]?._id);
        setStoryProgress(0);
        setShowStoryComments(false);
        setPollVote(null);
        setQuestionAnswer("");
      } else {
        setStoryProgress(0);
      }
    }
  };

  // Story Auto-Advance Timer
  useEffect(() => {
    if (!activeStoryGroup || storyToDelete || showStoryComments || isPaused) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNextStory();
          return 0;
        }
        return prev + 1.5; // Advances progress bar, total ~6 seconds per story
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryGroup, activeStoryIndex, storyToDelete, showStoryComments, isPaused]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeStoryGroup) return;
      if (e.key === "ArrowRight") {
        handleNextStory();
      } else if (e.key === "ArrowLeft") {
        handlePrevStory();
      } else if (e.key === "Escape") {
        setActiveStoryGroup(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStoryGroup, activeStoryIndex, stories]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    if (isVideo) {
      if (file.size > 10 * 1024 * 1024) {
        setWarningModal({
          isOpen: true,
          title: "Video Too Large",
          message: "Story videos are limited to 10 MB. Please compress your video or select a smaller file."
        });
        e.target.value = "";
        return;
      }

      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 30) {
          setWarningModal({
            isOpen: true,
            title: "Video Too Long",
            message: "Story videos are limited to 30 seconds. Please trim your video and try again."
          });
          e.target.value = "";
        } else {
          setMediaType("video");
          setSelectedMedia(file);
          setMediaPreview(URL.createObjectURL(file));
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
    } else {
      if (file.size > 5 * 1024 * 1024) {
        setWarningModal({
          isOpen: true,
          title: "Image Too Large",
          message: "Story images are limited to 5 MB. Please compress your image and try again."
        });
        e.target.value = "";
        return;
      }
      setCropSource(URL.createObjectURL(file));
    }
  };

  const handleRemoveMedia = () => {
    setSelectedMedia(null);
    setMediaPreview("");
    setMediaType("");
    if (mediaInputRef.current) {
      mediaInputRef.current.value = "";
    }
  };

  const generateAIStoryText = () => {
    const insights = [
      "AI Coding Insight: Rust compiler safety protects memory space in live sandboxes perfectly.",
      "Dev Tip: Vite 8 reduces HMR compiling delays by 42% on massive React dashboards.",
      "Tech Trend: Glassmorphism backblur scales cleanly on Safari using webkit styles.",
      "Developer Wisdom: Refactoring duplicate logic improves maintenance speed by 2x."
    ];
    const randomIdx = Math.floor(Math.random() * insights.length);
    setNewStoryText(insights[randomIdx]);
    setStoryType("ai");
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    setIsPosting(true);

    try {
      let finalText = newStoryText;

      // Inject metadata tags for advanced story types
      if (storyType === "poll") {
        finalText = `[POLL] ${pollQuestion}\n[OPT1] ${pollOptions.opt1}\n[OPT2] ${pollOptions.opt2}`;
      } else if (storyType === "question") {
        finalText = `[QUESTION] ${questionPrompt}`;
      } else if (storyType === "ai") {
        finalText = `[AI_INSIGHT] ${newStoryText}`;
      }

      const formData = new FormData();
      formData.append("text", finalText);
      if (selectedMedia && storyType === "media") {
        formData.append("media", selectedMedia);
      }

      const res = await createStory(formData);
      if (res.success) {
        addToast("Developer Story shared successfully!", "success");
        setNewStoryText("");
        setPollQuestion("");
        setPollOptions({ opt1: "", opt2: "" });
        setQuestionPrompt("");
        setSelectedMedia(null);
        setMediaPreview("");
        setMediaType("");
        setStoryType("text");
        setIsAdding(false);
        fetchStories();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteStoryClick = (storyId) => {
    if (!storyId) return;
    setStoryToDelete(storyId);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteStory(storyToDelete);
      if (res.success) {
        addToast("Story slide deleted successfully!", "success");
        setStoryToDelete(null);
        setActiveStoryGroup(null);
        fetchStories();
      }
    } catch (err) {
      addToast("Failed to delete story", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLikeStory = async (storyId) => {
    if (!storyId) return;

    setStories(prev => prev.map(s => {
      if (s._id === storyId) {
        const liked = s.likes.includes(user?.id || user?._id);
        const nextLikes = liked
          ? s.likes.filter(id => id !== (user?.id || user?._id))
          : [...s.likes, (user?.id || user?._id)];
        return { ...s, likes: nextLikes };
      }
      return s;
    }));

    setActiveStoryGroup(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stories: prev.stories.map(s => {
          if (s._id === storyId) {
            const liked = s.likes.includes(user?.id || user?._id);
            const nextLikes = liked
              ? s.likes.filter(id => id !== (user?.id || user?._id))
              : [...s.likes, (user?.id || user?._id)];
            return { ...s, likes: nextLikes };
          }
          return s;
        })
      };
    });

    try {
      await toggleLikeStory(storyId);
    } catch (e) {
      fetchStories();
    }
  };

  const handleSendStoryComment = async (e, storyId) => {
    e.preventDefault();
    if (!storyReply.trim()) return;

    try {
      const res = await addCommentStory(storyId, storyReply);
      if (res.success) {
        addToast("Reply comment shared on story!", "success");
        setStoryReply("");

        setStories(prev => prev.map(s => {
          if (s._id === storyId) {
            return { ...s, comments: res.comments };
          }
          return s;
        }));

        setActiveStoryGroup(prev => {
          if (!prev) return null;
          return {
            ...prev,
            stories: prev.stories.map(s => {
              if (s._id === storyId) {
                return { ...s, comments: res.comments };
              }
              return s;
            })
          };
        });
      }
    } catch (err) {
      addToast("Failed to post comment", "error");
    }
  };

  const scrollLeftBar = () => {
    scrollContainerRef.current?.scrollBy({ left: -240, behavior: "smooth" });
  };

  const scrollRightBar = () => {
    scrollContainerRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  };

  // Group stories by username
  const groupedStories = stories.reduce((acc, story) => {
    const username = story.username;
    if (!acc[username]) {
      acc[username] = {
        username,
        avatar: story.avatar,
        stories: []
      };
    }
    acc[username].stories.push(story);
    return acc;
  }, {});

  const storyGroups = Object.values(groupedStories);

  const isGroupUnread = (group) => {
    return group.stories.some(s => !readStories.has(s._id));
  };

  const getThemeGradientClass = () => {
    switch (storyTheme) {
      case "dark-navy": return "linear-gradient(180deg, #09090e 0%, #1e1e38 100%)";
      case "ocean": return "linear-gradient(180deg, #022c22 0%, #06b6d4 100%)";
      case "matrix": return "linear-gradient(180deg, #022c22 0%, #10b981 100%)";
      default: return "linear-gradient(180deg, #0a0518 0%, #6366f1 100%)";
    }
  };

  const currentActiveStory = activeStoryGroup?.stories[activeStoryIndex];
  const isVideoUrl = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov|avi)($|\?)/i) || url.includes("/video/upload/");
  };

  // Parsing Advanced Story types
  const parsePollData = (text) => {
    if (!text || !text.startsWith("[POLL]")) return null;
    const matchQuestion = text.match(/\[POLL\] (.*)/);
    const matchOpt1 = text.match(/\[OPT1\] (.*)/);
    const matchOpt2 = text.match(/\[OPT2\] (.*)/);
    return {
      question: matchQuestion ? matchQuestion[1].split("\n")[0] : "Poll Question",
      opt1: matchOpt1 ? matchOpt1[1].split("\n")[0] : "Option A",
      opt2: matchOpt2 ? matchOpt2[1].split("\n")[0] : "Option B"
    };
  };

  const parseQuestionData = (text) => {
    if (!text || !text.startsWith("[QUESTION]")) return null;
    const match = text.match(/\[QUESTION\] (.*)/);
    return match ? match[1] : "Ask me a question";
  };

  const parseAIData = (text) => {
    if (!text || !text.startsWith("[AI_INSIGHT]")) return null;
    const match = text.match(/\[AI_INSIGHT\] (.*)/);
    return match ? match[1] : "AI Insight text";
  };

  return (
    <div className={`premium-stories-sticky-wrapper ${vertical ? "vertical" : ""}`}>
      {/* Dynamic SVG gradient defs for unread story bubble rings */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="story-unread-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Scroll Arrows on Desktop (only horizontal mode) */}
      {!vertical && storyGroups.length > 5 && (
        <>
          <button onClick={scrollLeftBar} className="story-nav-arrow left" aria-label="Scroll left">
            <ChevronLeft size={16} />
          </button>
          <button onClick={scrollRightBar} className="story-nav-arrow right" aria-label="Scroll right">
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* Scroll Stories Bar - Borderless Instagram style */}
      <div className={`premium-stories-bar ${vertical ? "vertical" : ""}`} ref={scrollContainerRef}>

        {/* Your Story trigger */}
        <div className="premium-story-bubble self" onClick={() => setIsAdding(true)}>
          <div className="premium-story-ring">
            <svg className="story-ring-svg" viewBox="0 0 68 68">
              <circle
                cx="34"
                cy="34"
                r="32.5"
                fill="none"
                className="svg-ring-read"
                strokeWidth="2.5"
              />
            </svg>
            <div className="premium-story-inner">
              {user?.avatar ? (
                <img src={user.avatar} alt="You" />
              ) : (
                <div className="story-avatar-fallback">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="plus-badge">
              <Plus size={10} />
            </div>
          </div>
          <span className="premium-story-label">Your Story</span>
        </div>

        {/* Story Bubbles */}
        {isStoriesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-story-bubble skeleton" style={{ pointerEvents: "none" }}>
              <div className="premium-story-ring skeleton-shimmer" style={{ width: "68px", height: "68px", borderRadius: "50%", padding: 0 }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: "40px", height: "8px", marginTop: "6px", borderRadius: "4px" }} />
            </div>
          ))
        ) : (
          storyGroups.map((group) => {
            const unread = isGroupUnread(group);
            const hasLive = group.stories.some(s => s.text && s.text.includes("[AI_INSIGHT]"));

            // Segment math for Instagram/WhatsApp multiple stories indicator ring
            const numStories = group.stories.length;
            const radius = 32.5;
            const circumference = 2 * Math.PI * radius; // 204.2
            const gap = numStories > 1 ? 5 : 0;
            const segmentLength = (circumference / numStories) - gap;
            const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;

            return (
              <div
                key={group.username}
                className="premium-story-bubble"
                onClick={() => {
                  setActiveStoryGroup(group);
                  setActiveStoryIndex(0);
                  markStoryAsRead(group.stories[0]?._id);
                  setStoryProgress(0);
                  setShowStoryComments(false);
                  setPollVote(null);
                  setQuestionAnswer("");
                }}
              >
                <div className="premium-story-ring">
                  <svg className="story-ring-svg" viewBox="0 0 68 68">
                    {group.stories.map((story, idx) => {
                      const isSlideRead = readStories.has(story._id);
                      const startAngle = -90 + idx * (360 / numStories);
                      return (
                        <circle
                          key={story._id}
                          cx="34"
                          cy="34"
                          r={radius}
                          fill="none"
                          className={isSlideRead ? "svg-ring-read" : "svg-ring-unread"}
                          strokeWidth="2.5"
                          strokeDasharray={numStories > 1 ? strokeDasharray : "none"}
                          strokeLinecap="round"
                          style={{
                            transform: `rotate(${startAngle}deg)`,
                            transformOrigin: "50% 50%",
                            transition: "all 0.3s ease"
                          }}
                        />
                      );
                    })}
                  </svg>
                  <div className="premium-story-inner">
                    {group.avatar ? (
                      <img src={group.avatar} alt={group.username} />
                    ) : (
                      <div className="story-avatar-fallback">
                        {group.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="premium-story-label">@{group.username}</span>

                {/* LIVE Badge tag for specific coding insights */}
                {hasLive && <span className="story-live-badge-tag">LIVE</span>}
              </div>
            );
          })
        )}
      </div>

      {/* Story Creator Modal */}
      <AnimatePresence>
        {isAdding && (
          <Portal>
            <div className="ce-modal-overlay" onClick={() => setIsAdding(false)} style={{ zIndex: 10008 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="ce-modal-card"
                style={{ maxWidth: "460px", width: "90%", padding: "24px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, color: "var(--ce-text-h)", fontSize: "1.1rem" }}>Share Story</h3>
                  <button style={{ background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer" }} onClick={() => setIsAdding(false)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Story Type selection */}
                <div className="story-type-selection-bar" style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                  {[
                    { id: "text", label: "Text", icon: HelpCircle },
                    { id: "media", label: "Media", icon: Image },
                    { id: "poll", label: "Poll", icon: BarChart3 },
                    { id: "question", label: "Question", icon: HelpCircle },
                    { id: "ai", label: "AI Insight", icon: Bot }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setStoryType(item.id);
                        if (item.id === "ai") generateAIStoryText();
                      }}
                      style={{
                        background: storyType === item.id ? "rgba(99,102,241,0.15)" : "var(--ce-premium-glow)",
                        border: storyType === item.id ? "1px solid #6366f1" : "1px solid var(--ce-premium-border)",
                        color: storyType === item.id ? "var(--ce-premium-text)" : "var(--ce-premium-muted)",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <item.icon size={12} />
                      {item.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCreateStory}>

                  {storyType === "text" && (
                    <textarea
                      placeholder="Share a status or code milestone update..."
                      value={newStoryText}
                      onChange={(e) => setNewStoryText(e.target.value)}
                      maxLength={120}
                      className="composer-textarea"
                      style={{ minHeight: "80px", marginBottom: "12px" }}
                      required
                    />
                  )}

                  {storyType === "media" && (
                    <div>
                      <textarea
                        placeholder="Add a caption to your media story..."
                        value={newStoryText}
                        onChange={(e) => setNewStoryText(e.target.value)}
                        maxLength={120}
                        className="composer-textarea"
                        style={{ minHeight: "80px", marginBottom: "12px" }}
                      />
                      {mediaPreview && (
                        <div style={{ position: "relative", marginBottom: "12px", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--ce-premium-border)" }}>
                          {mediaType === "video" ? (
                            <video src={mediaPreview} style={{ width: "100%", maxHeight: "150px", objectFit: "cover" }} controls />
                          ) : (
                            <img src={mediaPreview} alt="Preview" style={{ width: "100%", maxHeight: "150px", objectFit: "cover" }} />
                          )}
                          <button
                            type="button"
                            onClick={handleRemoveMedia}
                            style={{ position: "absolute", top: "6px", right: "6px", background: "#ef4444", border: "none", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            &times;
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        style={{
                          background: "var(--ce-premium-glow)",
                          border: "1px solid var(--ce-premium-border)",
                          color: "var(--ce-premium-text)",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        <Image size={13} /> Select Image/Video
                      </button>
                      <input
                        type="file"
                        ref={mediaInputRef}
                        style={{ display: "none" }}
                        accept="image/*,video/*"
                        onChange={handleMediaChange}
                      />
                    </div>
                  )}

                  {storyType === "poll" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="composer-input-field"
                        style={{ background: "var(--ce-premium-glow)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", padding: "10px", borderRadius: "8px", fontSize: "0.85rem" }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Option 1"
                        value={pollOptions.opt1}
                        onChange={(e) => setPollOptions(prev => ({ ...prev, opt1: e.target.value }))}
                        className="composer-input-field"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem" }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Option 2"
                        value={pollOptions.opt2}
                        onChange={(e) => setPollOptions(prev => ({ ...prev, opt2: e.target.value }))}
                        className="composer-input-field"
                        style={{ background: "var(--ce-premium-glow)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.78rem" }}
                        required
                      />
                    </div>
                  )}

                  {storyType === "question" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
                      <input
                        type="text"
                        placeholder="Ask me a question..."
                        value={questionPrompt}
                        onChange={(e) => setQuestionPrompt(e.target.value)}
                        className="composer-input-field"
                        style={{ background: "var(--ce-premium-glow)", border: "1px solid var(--ce-premium-border)", color: "var(--ce-premium-text)", padding: "10px", borderRadius: "8px", fontSize: "0.85rem" }}
                        required
                      />
                    </div>
                  )}

                  {storyType === "ai" && (
                    <div style={{ background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.15)", padding: "12px", borderRadius: "8px", marginBottom: "12px", display: "flex", alignItems: "start", gap: "8px" }}>
                      <Sparkles size={14} style={{ color: "#8b5cf6", marginTop: "2px", flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--ce-premium-text)", lineHeight: "1.4" }}>
                        {newStoryText || "Generating AI Coding Insight story preview..."}
                      </p>
                    </div>
                  )}

                  {/* Theme selectors */}
                  <div style={{ marginBottom: "16px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--ce-premium-muted)", display: "block", marginBottom: "6px" }}>Background Accent Theme</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["dark-purple", "dark-navy", "ocean", "matrix"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setStoryTheme(t)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            border: storyTheme === t ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                            background: storyTheme === t ? "rgba(99,102,241,0.12)" : "transparent",
                            color: storyTheme === t ? "#fff" : "var(--ce-premium-muted)",
                            cursor: "pointer"
                          }}
                        >
                          {t.replace("dark-", "")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>Stories expire in 24 hours</span>
                    <button type="submit" disabled={isPosting} className="register-btn" style={{ width: "auto", padding: "8px 16px" }}>
                      {isPosting ? "Sharing..." : "Post Story"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStoryGroup && currentActiveStory && (
          <Portal>
            <div className="story-viewer-overlay" onClick={() => setActiveStoryGroup(null)} style={{ zIndex: 10009 }}>
              
              {/* Left Arrow Button for Desktop Viewports */}
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevStory(); }}
                className="story-viewer-nav-btn left"
                style={{
                  position: "absolute",
                  left: "calc(50% - 240px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10015,
                  transition: "all 0.2s"
                }}
              >
                <ChevronLeft size={24} />
              </button>

              {/* Right Arrow Button for Desktop Viewports */}
              <button
                onClick={(e) => { e.stopPropagation(); handleNextStory(); }}
                className="story-viewer-nav-btn right"
                style={{
                  position: "absolute",
                  right: "calc(50% - 240px)",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  zIndex: 10015,
                  transition: "all 0.2s"
                }}
              >
                <ChevronRight size={24} />
              </button>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="story-viewer-card"
                style={{
                  background: "#000",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  height: "640px",
                  maxWidth: "360px",
                  width: "90%",
                  borderRadius: "12px",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
                  position: "relative",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.12)",
                  userSelect: "none",
                  cursor: "pointer"
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  setIsPaused(false);
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  setIsPaused(false);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  setIsPaused(false);
                }}
              >
                {/* Visual Pause Overlay Indicator */}
                {isPaused && (
                  <div style={{
                    position: "absolute",
                    bottom: "76px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0, 0, 0, 0.65)",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    color: "#fff",
                    zIndex: 20,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
                  }}>
                    <Pause size={14} fill="#fff" />
                  </div>
                )}
                {/* Progress bars indicator grid - absolute overlay on top */}
                <div style={{ display: "flex", gap: "4px", width: "calc(100% - 24px)", position: "absolute", top: "12px", left: "12px", right: "12px", zIndex: 10 }}>
                  {activeStoryGroup.stories.map((s, index) => {
                    let fillWidth = "0%";
                    if (index < activeStoryIndex) fillWidth = "100%";
                    else if (index === activeStoryIndex) fillWidth = `${storyProgress}%`;

                    return (
                      <div key={s._id} style={{ height: "3px", flex: 1, background: "rgba(255,255,255,0.2)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#fff", width: fillWidth }} />
                      </div>
                    );
                  })}
                </div>

                {/* Story Header - absolute overlay on top */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "absolute", top: "24px", left: "12px", right: "12px", zIndex: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {activeStoryGroup.avatar ? (
                      <img src={activeStoryGroup.avatar} alt={activeStoryGroup.username} className="comment-avatar-bubble" style={{ border: "1px solid rgba(255,255,255,0.4)" }} />
                    ) : (
                      <div className="comment-avatar-bubble-fallback">
                        {activeStoryGroup.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>@{activeStoryGroup.username}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {activeStoryGroup.username === user?.username && (
                      <button
                        onClick={() => handleDeleteStoryClick(currentActiveStory?._id)}
                        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                        title="Delete Story"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    <button style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }} onClick={() => setActiveStoryGroup(null)}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Story Media Background & Text (Image or Video) - Immersive Full Bleed */}
                <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: currentActiveStory.mediaUrl ? "#000" : getThemeGradientClass() }}>
                  {currentActiveStory.mediaUrl && (
                    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
                      {isVideoUrl(currentActiveStory.mediaUrl) ? (
                        <video src={currentActiveStory.mediaUrl} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <img src={currentActiveStory.mediaUrl} alt="Story Media" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  )}

                  {/* Story text and Custom templates overlay */}
                  <div style={{ position: "relative", zIndex: 2, padding: "20px", background: currentActiveStory.mediaUrl ? "rgba(0,0,0,0.5)" : "transparent", borderRadius: "10px", width: "85%", textAlign: "center", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>

                    {/* Render standard text if not special template */}
                    {!currentActiveStory.text.startsWith("[POLL]") && !currentActiveStory.text.startsWith("[QUESTION]") && !currentActiveStory.text.startsWith("[AI_INSIGHT]") && (
                      <p style={{ fontSize: "1.05rem", fontWeight: "600", color: "#fff", margin: 0, lineHeight: "1.5", whiteSpace: "pre-wrap", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                        {currentActiveStory.text}
                      </p>
                    )}

                    {/* Template: Poll Story */}
                    {currentActiveStory.text.startsWith("[POLL]") && (() => {
                      const poll = parsePollData(currentActiveStory.text);
                      if (!poll) return null;
                      return (
                        <div style={{ width: "100%", background: "rgba(0,0,0,0.6)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                          <span style={{ fontSize: "0.72rem", color: "#8b5cf6", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>Developer Poll</span>
                          <h4 style={{ color: "#fff", margin: "0 0 14px 0", fontSize: "0.95rem" }}>{poll.question}</h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <button
                              onClick={() => { setPollVote("opt1"); addToast("Voted Option 1!", "success"); }}
                              style={{
                                background: pollVote === "opt1" ? "#6366f1" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "#fff",
                                padding: "10px",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              {poll.opt1} {pollVote === "opt1" && <Check size={12} style={{ display: "inline", marginLeft: "4px" }} />}
                            </button>
                            <button
                              onClick={() => { setPollVote("opt2"); addToast("Voted Option 2!", "success"); }}
                              style={{
                                background: pollVote === "opt2" ? "#6366f1" : "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                color: "#fff",
                                padding: "10px",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                                cursor: "pointer",
                                transition: "all 0.2s"
                              }}
                            >
                              {poll.opt2} {pollVote === "opt2" && <Check size={12} style={{ display: "inline", marginLeft: "4px" }} />}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Template: Question Story */}
                    {currentActiveStory.text.startsWith("[QUESTION]") && (() => {
                      const prompt = parseQuestionData(currentActiveStory.text);
                      return (
                        <div style={{ width: "100%", background: "rgba(0,0,0,0.6)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                          <span style={{ fontSize: "0.72rem", color: "#ec4899", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>Q&A Section</span>
                          <h4 style={{ color: "#fff", margin: "0 0 12px 0", fontSize: "0.95rem" }}>{prompt}</h4>
                          <input
                            type="text"
                            placeholder="Type answer reply..."
                            value={questionAnswer}
                            onChange={(e) => setQuestionAnswer(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "#fff",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              marginBottom: "8px"
                            }}
                          />
                          {questionAnswer.trim() && (
                            <button
                              onClick={() => { addToast("Answer reply sent!", "success"); setQuestionAnswer(""); }}
                              style={{ background: "#ec4899", border: "none", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: "700", cursor: "pointer", width: "100%" }}
                            >
                              Send Response
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Template: AI Insight Story */}
                    {currentActiveStory.text.startsWith("[AI_INSIGHT]") && (() => {
                      const insight = parseAIData(currentActiveStory.text);
                      return (
                        <div style={{ width: "100%", background: "rgba(10,10,18,0.85)", padding: "20px 16px", borderRadius: "12px", border: "1px dashed rgba(99,102,241,0.4)", textAlign: "center", boxShadow: "0 0 15px rgba(99,102,241,0.2)" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
                            <Bot size={15} style={{ color: "#06b6d4" }} />
                            <span style={{ fontSize: "0.72rem", color: "#06b6d4", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px" }}>AI Dev Predictions</span>
                          </div>
                          <p style={{ color: "#e0e7ff", margin: 0, fontSize: "0.85rem", lineHeight: "1.4" }}>{insight}</p>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                {/* Interactive Story comments drawer / likes panel - bottom absolute overlay */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, padding: "16px 14px", background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0) 100%)", borderTop: "none" }}>
                  {showStoryComments ? (
                    // Dynamic comments view
                    <div style={{ background: "rgba(10,10,18,0.95)", borderRadius: "12px", padding: "10px", maxHeight: "150px", overflowY: "auto", marginBottom: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.72rem", color: "#fff", fontWeight: "700" }}>Comments ({currentActiveStory.comments?.length || 0})</span>
                        <button onClick={() => setShowStoryComments(false)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.72rem", cursor: "pointer" }}>Close</button>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {(currentActiveStory.comments || []).map(c => (
                          <div key={c._id} style={{ fontSize: "0.75rem", color: "#fff" }}>
                            <strong style={{ color: "#a5b4fc" }}>@{c.username}: </strong>{c.text}
                          </div>
                        ))}
                        {(currentActiveStory.comments || []).length === 0 && <span style={{ fontSize: "0.7rem", color: "var(--ce-premium-muted)" }}>No comments. Be first!</span>}
                      </div>
                    </div>
                  ) : (
                    // Quick Actions view
                    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "12px" }}>
                      <button
                        onClick={() => handleToggleLikeStory(currentActiveStory._id)}
                        style={{ background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                      >
                        <Heart size={16} fill={currentActiveStory.likes?.includes(user?.id || user?._id) ? "#ef4444" : "none"} color={currentActiveStory.likes?.includes(user?.id || user?._id) ? "#ef4444" : "#fff"} />
                        <span>{currentActiveStory.likes?.length || 0} Likes</span>
                      </button>

                      <button
                        onClick={() => setShowStoryComments(true)}
                        style={{ background: "none", border: "none", color: "#fff", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", cursor: "pointer", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                      >
                        <MessageSquare size={16} />
                        <span>{currentActiveStory.comments?.length || 0} Reply</span>
                      </button>
                    </div>
                  )}

                  <form onSubmit={(e) => handleSendStoryComment(e, currentActiveStory._id)} className="comment-input-form-row">
                    <input
                      type="text"
                      placeholder="Reply or comment..."
                      value={storyReply}
                      onChange={(e) => setStoryReply(e.target.value)}
                      className="comment-text-input"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                    />
                    <button type="submit" className="comment-send-submit-btn">
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {storyToDelete && (
          <Portal>
            <div className="ce-modal-overlay" onClick={() => setStoryToDelete(null)} style={{ zIndex: 10010 }}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="ce-modal-card"
                style={{ maxWidth: "380px", width: "90%", padding: "20px", textAlign: "center" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: "0 0 8px 0", color: "var(--ce-text-h)", fontSize: "1.1rem", fontWeight: "700" }}>Delete Story?</h3>
                <p style={{ margin: "0 0 20px 0", color: "var(--ce-premium-muted)", fontSize: "0.82rem", lineHeight: "1.4" }}>
                  Are you sure you want to delete this story slide? This cannot be undone.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setStoryToDelete(null)}
                    style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--ce-border)", background: "transparent", color: "var(--ce-text)", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteStory}
                    disabled={isDeleting}
                    style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      {cropSource && (
        <Portal>
          <ImageCropper
            imageSrc={cropSource}
            aspect={9 / 16}
            onCropComplete={(croppedFile, croppedPreview) => {
              if (croppedFile.size > 5 * 1024 * 1024) {
                setWarningModal({
                  isOpen: true,
                  title: "Cropped Image Too Large",
                  message: "The cropped image exceeds the 5 MB limit. Please crop a smaller region or compress the image."
                });
                setCropSource(null);
                return;
              }
              setMediaType("image");
              setSelectedMedia(croppedFile);
              setMediaPreview(croppedPreview);
              setCropSource(null);
            }}
            onCancel={() => setCropSource(null)}
          />
        </Portal>
      )}

      {/* Strict Validation Warning Modal */}
      <WarningModal 
        isOpen={warningModal.isOpen} 
        title={warningModal.title} 
        message={warningModal.message} 
        onClose={() => setWarningModal({ isOpen: false, title: "", message: "" })} 
      />
    </div>
  );
}
