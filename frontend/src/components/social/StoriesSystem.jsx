import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Eye, Sparkles } from "lucide-react";
import { createStory, getStories } from "../../services/socialService";

export default function StoriesSystem({ user, addToast }) {
  const [stories, setStories] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // When viewing a story
  const [storyProgress, setStoryProgress] = useState(0);

  const fetchStories = async () => {
    try {
      const res = await getStories();
      if (res.success) {
        setStories(res.stories || []);
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Story Auto-Advance Timer
  useEffect(() => {
    if (!activeStoryGroup) return;

    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setActiveStoryGroup(null);
          return 100;
        }
        return prev + 2.5; // Advances every 100ms, total 4 seconds
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryGroup]);

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStoryText.trim()) return;

    try {
      const res = await createStory({ text: newStoryText });
      if (res.success) {
        addToast("Story posted successfully!", "success");
        setNewStoryText("");
        setIsAdding(false);
        fetchStories();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
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

  return (
    <div className="stories-system-container">
      <div className="stories-scroll-wrapper">
        {/* Current user's "Add Story" bubble */}
        <div className="story-bubble-wrapper self">
          <div className="story-avatar-container" onClick={() => setIsAdding(true)}>
            {user?.avatar ? (
              <img src={user.avatar} alt="You" className="story-avatar" />
            ) : (
              <div className="story-avatar-fallback">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="story-add-badge">
              <Plus size={10} />
            </div>
          </div>
          <span className="story-username">My Story</span>
        </div>

        {/* Other users' stories bubbles */}
        {storyGroups.map((group) => (
          <div 
            key={group.username} 
            className="story-bubble-wrapper"
            onClick={() => setActiveStoryGroup(group)}
          >
            <div className="story-avatar-container unread">
              {group.avatar ? (
                <img src={group.avatar} alt={group.username} className="story-avatar" />
              ) : (
                <div className="story-avatar-fallback">
                  {group.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="story-username">@{group.username}</span>
          </div>
        ))}
      </div>

      {/* Add Story Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="ce-modal-overlay" onClick={() => setIsAdding(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="ce-modal-card story-creation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button className="modal-close-btn" onClick={() => setIsAdding(false)}>
                <X size={16} />
              </button>
              <div className="modal-header-new">
                <span className="modal-label-tag">Status Story</span>
                <h3 className="modal-title-new">Share what you are coding</h3>
              </div>
              <form onSubmit={handleCreateStory} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <textarea
                  placeholder="e.g., Working on a V2 Vercel layout clone! #mern #css"
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  maxLength={120}
                  className="story-textarea"
                  required
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="char-counter">{120 - newStoryText.length} chars left</span>
                  <button type="submit" className="dev-btn-message" style={{ width: "auto" }}>
                    Post Story
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Story Viewer Modal */}
      <AnimatePresence>
        {activeStoryGroup && (
          <div className="story-viewer-overlay" onClick={() => setActiveStoryGroup(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="story-viewer-card"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress bars */}
              <div className="story-progress-container">
                <div className="story-progress-bar">
                  <div className="story-progress-fill" style={{ width: `${storyProgress}%` }} />
                </div>
              </div>

              {/* Story Header */}
              <div className="story-viewer-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {activeStoryGroup.avatar ? (
                    <img src={activeStoryGroup.avatar} alt={activeStoryGroup.username} className="story-viewer-avatar" />
                  ) : (
                    <div className="story-viewer-avatar-fallback">
                      {activeStoryGroup.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="story-viewer-username">@{activeStoryGroup.username}</span>
                </div>
                <button className="story-viewer-close" onClick={() => setActiveStoryGroup(null)}>
                  <X size={18} />
                </button>
              </div>

              {/* Story Content */}
              <div className="story-viewer-content">
                <p>{activeStoryGroup.stories[0]?.text}</p>
                <div className="story-sparkle-glow">
                  <Sparkles size={48} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
