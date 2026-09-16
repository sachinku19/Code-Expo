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

  // Compute trending tags dynamically from real MongoDB posts
  const computedTrendingTags = useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) {
      return ["#react", "#javascript", "#typescript", "#webdev", "#python", "#nodejs", "#css", "#mongodb"];
    }

    const tagCounts = {};

    posts.forEach((post) => {
      if (!post) return;

      // Extract techStack tags
      if (Array.isArray(post.techStack)) {
        post.techStack.forEach((t) => {
          if (t && typeof t === "string") {
            const clean = t.trim().toLowerCase().replace(/^#+/, "");
            if (clean && clean.length >= 2) {
              tagCounts[clean] = (tagCounts[clean] || 0) + 1;
            }
          }
        });
      }

      // Extract #hashtags from post content
      const content = String(post.content || post.text || "");
      const hashtagMatches = content.match(/#[a-zA-Z0-9_]+/g);
      if (hashtagMatches) {
        hashtagMatches.forEach((ht) => {
          const clean = ht.substring(1).toLowerCase();
          if (clean && clean.length >= 2) {
            tagCounts[clean] = (tagCounts[clean] || 0) + 1;
          }
        });
      }

      // Extract codeLanguage
      if (post.codeLanguage && typeof post.codeLanguage === "string") {
        const clean = post.codeLanguage.trim().toLowerCase();
        if (clean && clean.length >= 2) {
          tagCounts[clean] = (tagCounts[clean] || 0) + 1;
        }
      }
    });

    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => `#${tag}`);

    if (sortedTags.length > 0) {
      return sortedTags;
    }

    return ["#react", "#javascript", "#typescript", "#webdev", "#python", "#nodejs", "#css", "#mongodb"];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    let list = [...posts];

    // Filter by tab
    if (activeTab === "trending") {
      list.sort((a, b) => (b?.likes?.length || 0) - (a?.likes?.length || 0));
    } else if (activeTab === "following") {
      list = list.filter((p) => {
        if (!p) return false;
        const authorId = String(p.author?._id || p.author?.id || p.author || p.user?._id || p.user?.id || p.user || "");
        return authorId && Array.isArray(followingList) && followingList.some((f) => String(f?._id || f?.id || f) === authorId);
      });
    } else if (activeTab === "code") {
      list = list.filter((p) => p && (p.postType === "code" || p.codeSnippet));
    }

    // Filter by tag if selected
    if (selectedTag) {
      const cleanTag = String(selectedTag).replace("#", "").toLowerCase().trim();
      list = list.filter((p) => {
        if (!p) return false;
        const inTechStack = Array.isArray(p.techStack) && p.techStack.some((t) => t && String(t).toLowerCase().trim() === cleanTag);
        const inContent = String(p.content || p.text || "").toLowerCase().includes(`#${cleanTag}`) || String(p.content || p.text || "").toLowerCase().includes(cleanTag);
        const inLang = String(p.codeLanguage || "").toLowerCase().trim() === cleanTag;
        return inTechStack || inContent || inLang;
      });
    }

    // Search query filter
    const safeSearchQuery = String(searchQuery || "").trim();
    if (safeSearchQuery) {
      const q = safeSearchQuery.toLowerCase();
      list = list.filter((p) => {
        if (!p) return false;
        const content = String(p.content || p.text || p.title || "").toLowerCase();
        const authorName = String(p.author?.username || p.user?.username || p.author?.name || p.user?.name || "").toLowerCase();
        const code = String(p.codeSnippet || "").toLowerCase();
        return content.includes(q) || authorName.includes(q) || code.includes(q);
      });
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", fontSize: "0.84rem", color: "#f59e0b" }}>
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
          trendingTags={computedTrendingTags}
          onFollowToggle={onFollowToggle}
          onUserClick={onUserClick}
          onMessageUser={onMessageUser}
          onSelectTag={(tag) => {
            const clean = String(tag).trim();
            setSelectedTag(prev => (prev === clean ? null : clean));
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(FeedPage);
