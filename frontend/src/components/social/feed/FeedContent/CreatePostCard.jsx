import React, { useState } from "react";
import { Code, Image as ImageIcon, FileText, Trophy } from "lucide-react";

const SafeAvatar = ({ src, name = "User", size = 36 }) => {
  const [error, setError] = useState(false);
  const initial = (name || "U").trim().charAt(0).toUpperCase();

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
          src={src}
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

export const CreatePostCard = ({ user, onSubmitPost, onOpenComposer }) => {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("general");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) {
      onOpenComposer && onOpenComposer();
      return;
    }
    onSubmitPost({ content, postType });
    setContent("");
  };

  return (
    <div className="create-post-card">
      <div className="create-post-top-row">
        <SafeAvatar src={user?.avatar} name={user?.username} size={36} />
        <input
          type="text"
          className="create-post-input"
          placeholder="What's on your mind, developer?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSubmit(e);
            }
          }}
          onClick={() => {
            if (!content.trim() && onOpenComposer) {
              // Option to open rich composer if clicked
            }
          }}
        />
      </div>

      <div className="create-post-actions-row">
        <div className="create-post-options">
          <button
            type="button"
            className="create-option-btn"
            onClick={() => onOpenComposer ? onOpenComposer() : setPostType("code")}
          >
            <Code size={14} color="#7C5CFF" />
            <span>Code</span>
          </button>

          <button
            type="button"
            className="create-option-btn"
            onClick={() => onOpenComposer ? onOpenComposer() : setPostType("image")}
          >
            <ImageIcon size={14} color="#10b981" />
            <span>Image</span>
          </button>

          <button
            type="button"
            className="create-option-btn"
            onClick={() => onOpenComposer ? onOpenComposer() : setPostType("article")}
          >
            <FileText size={14} color="#3b82f6" />
            <span>Article</span>
          </button>

          <button
            type="button"
            className="create-option-btn"
            onClick={() => onOpenComposer ? onOpenComposer() : setPostType("challenge")}
          >
            <Trophy size={14} color="#f59e0b" />
            <span>Challenge</span>
          </button>
        </div>

        <button
          type="button"
          className="create-post-submit-btn"
          onClick={handleSubmit}
          style={{ opacity: content.trim() ? 1 : 0.8, cursor: "pointer" }}
        >
          {content.trim() ? "Post" : "Create"}
        </button>
      </div>
    </div>
  );
};

export default React.memo(CreatePostCard);
