import React, { useState, useMemo } from "react";
import StoriesColumn from "./LeftSidebar/StoriesColumn";
import StoriesSystem from "../StoriesSystem";
import CreatePostCard from "./FeedContent/CreatePostCard";
import FeedControls from "./FeedContent/FeedControls";
import PostCard from "./FeedContent/PostCard";
import RightSidebar from "./RightSidebar/RightSidebar";
import "./FeedLayout.css";

export const PostCardSkeleton = () => (
  <div className="rebuilt-post-card ce-skeleton-card">
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
      <div className="ce-skeleton-shimmer" style={{ width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        <div className="ce-skeleton-shimmer" style={{ width: "120px", height: "12px", borderRadius: "4px" }} />
        <div className="ce-skeleton-shimmer" style={{ width: "70px", height: "10px", borderRadius: "4px" }} />
      </div>
    </div>
    <div className="ce-skeleton-shimmer" style={{ width: "100%", height: "200px", borderRadius: "10px", marginBottom: "10px" }} />
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
      <div className="ce-skeleton-shimmer" style={{ width: "95%", height: "12px", borderRadius: "4px" }} />
      <div className="ce-skeleton-shimmer" style={{ width: "80%", height: "12px", borderRadius: "4px" }} />
      <div className="ce-skeleton-shimmer" style={{ width: "60%", height: "12px", borderRadius: "4px" }} />
    </div>
    <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
      <div className="ce-skeleton-shimmer" style={{ width: "50px", height: "24px", borderRadius: "12px" }} />
      <div className="ce-skeleton-shimmer" style={{ width: "50px", height: "24px", borderRadius: "12px" }} />
      <div className="ce-skeleton-shimmer" style={{ width: "50px", height: "24px", borderRadius: "12px" }} />
    </div>
  </div>
);

export const FeedPage = ({
  user,
  posts = [],
  stories = [],
  onlineUsers = [],
  suggestedUsers = [],
  followingList = [],
  isLoading = false,
  onCreatePost,
  onLikePost,
  onCommentPost,
  onBookmarkPost,
  onSharePost,
  onFollowToggle,
  onUserClick,
  onMessageUser,
  onOpenComposer,
  onDeletePost,
  onReportPost,
  addToast
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);

  const filteredPosts = useMemo(() => {
    let list = [...posts];

    // Filter by tab
    if (activeTab === "trending") {
      list.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    } else if (activeTab === "following") {
      list = list.filter(p => {
        const authorId = String(p.author?._id || p.author || p.user?._id || p.user);
        return followingList.some(f => String(f._id || f) === authorId);
      });
    } else if (activeTab === "code") {
      list = list.filter((p) => p.postType === "code" || p.codeSnippet);
    }

    // Filter by tag if selected
    if (selectedTag) {
      const cleanTag = selectedTag.replace("#", "").toLowerCase();
      list = list.filter(p => p.techStack?.some(t => t.toLowerCase() === cleanTag));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.content?.toLowerCase().includes(q) ||
          p.author?.username?.toLowerCase().includes(q) ||
          p.codeSnippet?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [posts, activeTab, searchQuery, selectedTag, followingList]);

  return (
    <div className="rebuilt-feed-root">
      <div className="rebuilt-feed-container">
        {/* Left Sidebar: Stories */}
        <StoriesColumn
          user={user}
          stories={stories}
          addToast={addToast}
          onUserClick={onUserClick}
        />

        {/* Center Column: Feed Content */}
        <main className="rebuilt-center-column">
          <div className="mobile-stories-wrapper">
            <StoriesSystem user={user} addToast={addToast} vertical={false} onUserClick={onUserClick} />
          </div>

          <CreatePostCard
            user={user}
            onSubmitPost={onCreatePost}
            onOpenComposer={onOpenComposer}
          />
          
          <FeedControls
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setSelectedTag(null);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {selectedTag && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "0.84rem", color: "#7C5CFF" }}>
              <span>Filtering by <strong>{selectedTag}</strong></span>
              <button
                onClick={() => setSelectedTag(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Clear
              </button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {isLoading ? (
              <>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
              </>
            ) : (
              filteredPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  user={user}
                  followingList={followingList}
                  onLike={onLikePost}
                  onComment={onCommentPost}
                  onBookmark={onBookmarkPost}
                  onShare={onSharePost}
                  onFollowToggle={onFollowToggle}
                  onUserClick={onUserClick}
                  onMessageUser={onMessageUser}
                  onDeletePost={onDeletePost}
                  onReportPost={onReportPost}
                  addToast={addToast}
                />
              ))
            )}

            {!isLoading && filteredPosts.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "rgba(255, 255, 255, 0.45)",
                  fontSize: "0.9rem",
                  background: "var(--feed-card-bg)",
                  borderRadius: "var(--feed-radius)",
                  border: "1px solid var(--feed-card-border)"
                }}
              >
                No posts found in this feed view.
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Online Devs, Suggestions, Trends */}
        <RightSidebar
          onlineUsers={onlineUsers}
          suggestedUsers={suggestedUsers}
          followingList={followingList}
          onFollowToggle={onFollowToggle}
          onUserClick={onUserClick}
          onMessageUser={onMessageUser}
          onSelectTag={(tag) => setSelectedTag(tag)}
        />
      </div>
    </div>
  );
};

export default React.memo(FeedPage);
