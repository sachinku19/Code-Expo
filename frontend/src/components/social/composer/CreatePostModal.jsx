import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Image, Play, Code, BarChart3, GitFork, Calendar,
  Smile, CheckCircle2, Bookmark, Trash2, Globe, Users, Lock,
  FileText, HelpCircle, Eye, Edit3, Plus, Terminal, Clock, Hash
} from "lucide-react";
import { createPortal } from "react-dom";
import ImageCropper from "../ImageCropper";
import { optimizeCloudinaryUrl } from "../../../utils/imageOptimizer";
import "./CreatePostModal.css";

const FeedPortal = ({ children }) => {
  return createPortal(children, document.body);
};

const TECH_SUGGESTIONS = [
  "React", "Next", "Node", "MongoDB", "Express", "Redis",
  "Docker", "AWS", "TypeScript", "GraphQL", "Python", "Tailwind",
  "PostgreSQL", "Vue", "Angular", "Go", "Rust", "C++", "Java"
];

const CODE_LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "React (JSX)", value: "jsx" },
  { label: "Python", value: "python" },
  { label: "HTML / CSS", value: "html" },
  { label: "Node.js", value: "node" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
  { label: "Rust", value: "rust" },
  { label: "Go", value: "golang" },
  { label: "SQL", value: "sql" }
];

const EMOJI_LIST = ["💻", "🛠️", "🔥", "💡", "⚡", "🧠", "🎉", "🤝", "📦", "🎨", "🚀", "✨", "🐛", "🔒", "📊"];

const SafeAvatar = ({ src, name = "Dev", size = 40 }) => {
  const [error, setError] = useState(false);
  const initial = (name || "D").trim().charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        flexShrink: 0,
        overflow: "hidden"
      }}
    >
      {src && !error ? (
        <img
          src={optimizeCloudinaryUrl(src, { quality: "best", width: size * 2, height: size * 2, crop: "fill" })}
          alt={name}
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
            background: "linear-gradient(135deg, #7C5CFF, #8b5cf6)",
            color: "#ffffff",
            fontWeight: "700",
            fontSize: `${size * 0.4}px`
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
};

export const CreatePostModal = ({
  isOpen,
  onClose,
  user,
  inputText,
  setInputText,
  visibility,
  setVisibility,
  techChips = [],
  setTechChips,
  techInput,
  setTechInput,
  handleAddTechChip,
  handleRemoveChip,
  showCodeInput,
  setShowCodeInput,
  attachedCode,
  setAttachedCode,
  attachedCodeLang,
  setAttachedCodeLang,
  codeLinesCount,
  codeSizeKB,
  isCodeInvalid,
  showPollInput,
  setShowPollInput,
  pollQuestionInput,
  setPollQuestionInput,
  pollOptionsInput,
  setPollOptionsInput,
  showRepoInput,
  setShowRepoInput,
  repoShareInput,
  setRepoShareInput,
  showEventInput,
  setShowEventInput,
  eventShareTitle,
  setEventShareTitle,
  eventShareDate,
  setEventShareDate,
  selectedImages = [],
  handleImagesChange,
  handleRemoveSelectedImage,
  onCropImageComplete,
  uploadProgress = 0,
  selectedVideo,
  videoPreview,
  handleVideoChange,
  handleRemoveSelectedVideo,
  fileInputRef,
  videoInputRef,
  handleCreatePost,
  handleSaveDraft,
  isPublishDisabled,
  isPosting,
  textLength,
  isTextInvalid,
  parseMarkdown
}) => {
  const [activeTab, setActiveTab] = useState("write"); // 'write' | 'preview'
  const [showEmojiGrid, setShowEmojiGrid] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pollDuration, setPollDuration] = useState("1 Day");
  const [pollOptionsList, setPollOptionsList] = useState(["", ""]);
  const [lastSavedTime, setLastSavedTime] = useState("Just now");
  const [cropState, setCropState] = useState(null); // { idx, imageSrc }
  const textareaRef = useRef(null);

  // Auto-save timer simulator
  useEffect(() => {
    const interval = setInterval(() => {
      if (inputText.trim()) {
        setLastSavedTime("Saved 2 sec ago");
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [inputText]);

  // Keyboard shortcut listeners (ESC, Ctrl+Enter, Ctrl+S)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isPublishDisabled && handleCreatePost) {
          handleCreatePost(e);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (handleSaveDraft) {
          handleSaveDraft();
          setLastSavedTime("Draft saved");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPublishDisabled, handleCreatePost, handleSaveDraft, onClose]);

  // Insert Emoji at cursor
  const insertEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiGrid(false);
  };

  // Drag & drop image handling
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (handleImagesChange) {
        handleImagesChange({ target: { files: e.dataTransfer.files } });
      }
    }
  };

  // Add tech chip from suggestion
  const handleSelectTechSuggestion = (tag) => {
    const cleanTag = tag.trim();
    if (cleanTag && !techChips.includes(cleanTag) && setTechChips) {
      setTechChips([...techChips, cleanTag]);
    }
  };

  // Calculate Reading Time & Stats
  const wordsCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const estimatedReadTime = Math.max(1, Math.ceil(wordsCount / 200));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <FeedPortal>
        <div className="ce-composer-overlay" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="ce-composer-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Modal Header */}
            <div className="ce-composer-header">
              <div className="composer-header-title-box">
                <div className="composer-sparkle-badge">
                  <Sparkles size={16} color="#7C5CFF" />
                </div>
                <div>
                  <h2 className="composer-header-title">Create Developer Post</h2>
                  <p className="composer-header-subtitle">
                    Share projects, ideas, code, tutorials and discussions.
                  </p>
                </div>
              </div>

              <div className="composer-header-right-box">
                <span className="composer-shortcut-hint">
                  <kbd>ESC</kbd> to close
                </span>
                <button type="button" className="composer-close-btn" onClick={onClose}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 2. Main Body Grid: Editor Main + Right Sidebar */}
            <div className="ce-composer-body">
              {/* Left/Center Editor Column */}
              <div className="ce-composer-main">
                {/* Author Info Bar + Visibility Selector */}
                <div className="composer-author-bar">
                  <div className="composer-author-info">
                    <SafeAvatar src={user?.avatar} name={user?.username} size={38} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div className="composer-author-name">
                        @{user?.username || "developer"}
                        <CheckCircle2 size={14} color="#3b82f6" />
                      </div>
                      <div className="composer-author-role">{user?.role || user?.title || "Developer"}</div>
                    </div>
                  </div>

                  {/* Mode Switcher Tabs */}
                  <div className="composer-view-tabs">
                    <button
                      type="button"
                      className={`view-tab-btn ${activeTab === "write" ? "active" : ""}`}
                      onClick={() => setActiveTab("write")}
                    >
                      <Edit3 size={13} /> Write
                    </button>
                    <button
                      type="button"
                      className={`view-tab-btn ${activeTab === "preview" ? "active" : ""}`}
                      onClick={() => setActiveTab("preview")}
                    >
                      <Eye size={13} /> Live Preview
                    </button>
                  </div>
                </div>

                {/* Write Mode vs Preview Mode */}
                {activeTab === "write" ? (
                  <div className="composer-editor-wrapper">
                    {/* Auto-growing Text Editor */}
                    <div className="composer-textarea-box">
                      <textarea
                        ref={textareaRef}
                        className="composer-textarea"
                        placeholder="What are you building today?&#10;Share code, projects, tutorials or ideas...&#10;Markdown, code snippets and embeds are supported."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />

                      {/* Character Counter */}
                      <div className={`composer-char-counter ${isTextInvalid ? "invalid" : ""}`}>
                        <span>{textLength} / 5,000</span>
                      </div>
                    </div>

                    {/* Live Toolbar */}
                    <div className="composer-live-toolbar">
                      <div className="toolbar-left-group">
                        <button
                          type="button"
                          className="toolbar-btn"
                          title="Add Images (Drag & Drop / Paste)"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image size={16} color="#10b981" />
                          <span>Image</span>
                        </button>

                        <button
                          type="button"
                          className={`toolbar-btn ${selectedVideo ? "active" : ""}`}
                          title="Add Video (MP4 / WebM)"
                          onClick={() => videoInputRef.current?.click()}
                        >
                          <Play size={16} color="#f59e0b" />
                          <span>Video</span>
                        </button>

                        <button
                          type="button"
                          className={`toolbar-btn ${showCodeInput ? "active" : ""}`}
                          title="Attach Code Block"
                          onClick={() => setShowCodeInput(!showCodeInput)}
                        >
                          <Code size={16} color="#7C5CFF" />
                          <span>Code</span>
                        </button>

                        <button
                          type="button"
                          className={`toolbar-btn ${showRepoInput ? "active" : ""}`}
                          title="Attach GitHub Repo"
                          onClick={() => setShowRepoInput(!showRepoInput)}
                        >
                          <GitFork size={16} color="#ec4899" />
                          <span>Repo</span>
                        </button>

                        <button
                          type="button"
                          className="toolbar-btn"
                          title="Insert Emoji"
                          onClick={() => setShowEmojiGrid(!showEmojiGrid)}
                        >
                          <Smile size={16} color="#eab308" />
                          <span>Emoji</span>
                        </button>
                      </div>

                      {/* Emoji Grid Popup */}
                      {showEmojiGrid && (
                        <div className="composer-emoji-popup">
                          {EMOJI_LIST.map((emoji) => (
                            <span
                              key={emoji}
                              className="emoji-item"
                              onClick={() => insertEmoji(emoji)}
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hidden Inputs for Files & Video */}
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

                    {/* Upload Progress Indicator Bar */}
                    {uploadProgress > 0 && (
                      <div className="composer-upload-progress-bar">
                        <div
                          className="composer-upload-progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Attachment 1: Code Block Input Drawer */}
                    {showCodeInput && (
                      <div className="composer-attachment-card">
                        <div className="attachment-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Terminal size={15} color="#7C5CFF" />
                            <span className="attachment-title">Attach Code Snippet</span>
                          </div>

                          <div className="code-lang-selector">
                            <select
                              value={attachedCodeLang}
                              onChange={(e) => setAttachedCodeLang(e.target.value)}
                              className="code-lang-select"
                            >
                              {CODE_LANGUAGES.map((l) => (
                                <option key={l.value} value={l.value}>
                                  {l.label}
                                </option>
                              ))}
                            </select>
                            <span className={`code-size-badge ${isCodeInvalid ? "invalid" : ""}`}>
                              {codeLinesCount} lines | {codeSizeKB} KB
                            </span>
                          </div>
                        </div>

                        {/* Quick Code Language Chips */}
                        <div className="code-lang-chips-row">
                          {["javascript", "jsx", "typescript", "python", "html", "sql", "golang"].map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              className={`code-chip-btn ${attachedCodeLang === lang ? "active" : ""}`}
                              onClick={() => setAttachedCodeLang(lang)}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>

                        <textarea
                          placeholder="Paste or type code snippet here..."
                          value={attachedCode}
                          onChange={(e) => setAttachedCode(e.target.value)}
                          className="composer-code-textarea"
                        />
                      </div>
                    )}



                    {/* Attachment 3: GitHub Repository Share Input */}
                    {showRepoInput && (
                      <div className="composer-attachment-card">
                        <div className="attachment-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <GitFork size={15} color="#ec4899" />
                            <span className="attachment-title">Share GitHub Repository</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Repository path (e.g. facebook/react or https://github.com/...)"
                          value={repoShareInput}
                          onChange={(e) => setRepoShareInput(e.target.value)}
                          className="composer-input-field"
                        />
                      </div>
                    )}

                    {/* Drag-and-Drop Image Dropzone & Preview Grid */}
                    <div
                      className={`composer-dropzone ${isDragOver ? "dragover" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      {selectedImages.length === 0 ? (
                        <div
                          className="dropzone-empty-hint"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image size={24} color="rgba(255,255,255,0.4)" />
                          <span>Drag & drop images here or <strong>browse</strong> (up to 10 images)</span>
                        </div>
                      ) : (
                        <div className="images-preview-grid">
                          {selectedImages.map((imgObj, idx) => (
                            <div key={idx} className="image-preview-thumb" style={{ position: "relative" }}>
                              <img src={imgObj.preview} alt="Upload preview" />
                              <div style={{ position: "absolute", bottom: "4px", left: "4px", right: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCropState({ idx, imageSrc: imgObj.preview, file: imgObj.file });
                                  }}
                                  style={{
                                    background: "rgba(10, 10, 18, 0.85)",
                                    backdropFilter: "blur(6px)",
                                    WebkitBackdropFilter: "blur(6px)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    color: "#a5b4fc",
                                    fontSize: "0.68rem",
                                    fontWeight: "600",
                                    padding: "3px 7px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.5)"
                                  }}
                                  title="Crop & Edit Image"
                                >
                                  <Edit3 size={11} /> Crop
                                </button>
                                <button
                                  type="button"
                                  className="remove-thumb-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSelectedImage(idx);
                                  }}
                                  style={{ position: "static" }}
                                >
                                  &times;
                                </button>
                              </div>
                            </div>
                          ))}
                          {selectedImages.length < 10 && (
                            <button
                              type="button"
                              className="add-more-images-btn"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Plus size={20} />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image Cropper Modal */}
                    {cropState && (
                      <FeedPortal>
                        <ImageCropper
                          imageSrc={cropState.imageSrc}
                          file={cropState.file}
                          aspect={16 / 9}
                          onCropComplete={(croppedFile, croppedPreview) => {
                            if (onCropImageComplete) {
                              onCropImageComplete(cropState.idx, croppedFile, croppedPreview);
                            }
                            setCropState(null);
                          }}
                          onCancel={() => setCropState(null)}
                        />
                      </FeedPortal>
                    )}

                    {/* Video Attachment Preview */}
                    {selectedVideo && (
                      <div className="composer-video-preview-box">
                        <video src={videoPreview} controls />
                        <button
                          type="button"
                          className="remove-video-btn"
                          onClick={handleRemoveSelectedVideo}
                        >
                          &times;
                        </button>
                      </div>
                    )}

                    {/* Tech Stack Chips & Input */}
                    <div className="composer-tech-stack-box">
                      <div className="tech-chips-list">
                        {techChips.map((chip) => (
                          <span key={chip} className="tech-chip-tag">
                            #{chip}
                            <button type="button" onClick={() => handleRemoveChip(chip)}>
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="tech-input-row">
                        <Hash size={14} color="#7C5CFF" />
                        <input
                          type="text"
                          placeholder="Add tech stack tags (React, Node, MERN... Press Enter)"
                          value={techInput}
                          onChange={(e) => setTechInput(e.target.value)}
                          onKeyDown={handleAddTechChip}
                        />
                      </div>

                      {/* Autocomplete Tech Tag Suggestions */}
                      <div className="tech-suggestions-row">
                        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>Suggestions:</span>
                        {TECH_SUGGESTIONS.slice(0, 8).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="suggestion-tag-btn"
                            onClick={() => handleSelectTechSuggestion(tag)}
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Real-Time Live Preview Pane */
                  <div className="composer-live-preview-pane">
                    <div className="preview-card-wrapper">
                      {/* Post Header */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <SafeAvatar src={user?.avatar} name={user?.username} size={38} />
                        <div>
                          <div className="preview-author-name" style={{ fontSize: "0.9rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                            @{user?.username || "developer"}
                            <CheckCircle2 size={13} color="#3b82f6" />
                          </div>
                          <div className="preview-author-meta" style={{ fontSize: "0.76rem" }}>{user?.role || "Developer"} &bull; Just now</div>
                        </div>
                      </div>

                      {/* Rendered Text Content */}
                      <div className="preview-text-content">
                        {inputText.trim() ? (
                          parseMarkdown ? parseMarkdown(inputText) : inputText
                        ) : (
                          <span className="preview-placeholder-text" style={{ fontStyle: "italic" }}>
                            No post text written yet. Switch back to Write mode to compose your post.
                          </span>
                        )}
                      </div>

                      {/* Rendered Code Snippet */}
                      {attachedCode && (
                        <div className="preview-code-block">
                          <div className="preview-code-header">{attachedCodeLang || "code"}</div>
                          <pre><code>{attachedCode}</code></pre>
                        </div>
                      )}

                      {/* Rendered Media Grid */}
                      {selectedImages.length > 0 && (
                        <div className="preview-media-grid">
                          {selectedImages.map((img, i) => (
                            <img key={i} src={img.preview} alt="Preview" />
                          ))}
                        </div>
                      )}

                      {/* Rendered Video */}
                      {selectedVideo && (
                        <div className="preview-video-box">
                          <video src={videoPreview} controls />
                        </div>
                      )}

                      {/* Rendered Poll */}
                      {pollQuestionInput && (
                        <div className="preview-poll-box">
                          <div style={{ fontSize: "0.86rem", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                            📊 {pollQuestionInput}
                          </div>
                          {pollOptionsInput.a && <div className="preview-poll-option">{pollOptionsInput.a}</div>}
                          {pollOptionsInput.b && <div className="preview-poll-option">{pollOptionsInput.b}</div>}
                        </div>
                      )}

                      {/* Rendered Tech Tags */}
                      {techChips.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                          {techChips.map((tag) => (
                            <span key={tag} className="tech-chip-tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side Panel: Tips, Shortcuts & Metrics */}
              <aside className="ce-composer-sidepanel">
                {/* Metrics Card */}
                <div className="sidepanel-card">
                  <div className="sidepanel-card-title">
                    <Clock size={14} color="#7C5CFF" />
                    <span>Live Post Metrics</span>
                  </div>

                  <div className="sidepanel-stats-list">
                    <div className="stat-item">
                      <span className="stat-label">Reading Time</span>
                      <span className="stat-value">~{estimatedReadTime} min read</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-label">Character Count</span>
                      <span className={`stat-value ${isTextInvalid ? "invalid" : ""}`}>
                        {textLength} / 5000
                      </span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-label">Attached Images</span>
                      <span className="stat-value">{selectedImages.length} / 10</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-label">Attached Video</span>
                      <span className="stat-value">{selectedVideo ? "1 / 1" : "0 / 1"}</span>
                    </div>

                    <div className="stat-item">
                      <span className="stat-label">Code Snippets</span>
                      <span className="stat-value">{attachedCode ? "1 / 10" : "0 / 10"}</span>
                    </div>
                  </div>
                </div>

                {/* Markdown Shortcuts Card */}
                <div className="sidepanel-card">
                  <div className="sidepanel-card-title">
                    <Terminal size={14} color="#3b82f6" />
                    <span>Markdown Shortcuts</span>
                  </div>
                  <div className="sidepanel-shortcuts-list">
                    <code># Heading 1</code>
                    <code>**Bold text**</code>
                    <code>`inline code`</code>
                    <code>```js code block```</code>
                    <code>&gt; Quote block</code>
                  </div>
                </div>

                {/* Publishing Tips Card */}
                <div className="sidepanel-card">
                  <div className="sidepanel-card-title">
                    <HelpCircle size={14} color="#f59e0b" />
                    <span>Publishing Tips</span>
                  </div>
                  <ul className="sidepanel-tips-list">
                    <li>Include clear code snippets for higher engagement.</li>
                    <li>Add relevant tech stack tags (`#react`, `#node`).</li>
                    <li>Drag & drop media previews to demonstrate your project.</li>
                  </ul>
                </div>
              </aside>
            </div>

            {/* 3. Bottom Bar */}
            <div className="ce-composer-footer">
              <div className="footer-left">
                <span className="draft-status-badge">
                  <Bookmark size={13} /> {lastSavedTime}
                </span>
              </div>

              <div className="footer-middle">
                <select
                  value="public"
                  onChange={(e) => setVisibility && setVisibility("public")}
                  className="composer-visibility-select"
                >
                  <option value="public">🌍 Public (Everyone)</option>
                </select>
              </div>

              <div className="footer-right">
                <button
                  type="button"
                  className="footer-btn discard"
                  onClick={onClose}
                >
                  Discard
                </button>

                <button
                  type="button"
                  className="footer-btn draft"
                  onClick={() => {
                    handleSaveDraft && handleSaveDraft();
                    setLastSavedTime("Draft saved");
                  }}
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  className="footer-btn publish"
                  disabled={isPublishDisabled}
                  onClick={handleCreatePost}
                >
                  {isPosting ? "Publishing..." : "Publish Post"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </FeedPortal>
    </AnimatePresence>
  );
};

export default CreatePostModal;
