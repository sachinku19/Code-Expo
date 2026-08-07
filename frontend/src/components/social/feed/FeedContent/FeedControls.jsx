import React from "react";
import { Search } from "lucide-react";

export const FeedControls = ({ activeTab, onSelectTab, searchQuery, onSearchChange }) => {
  const tabs = [
    { id: "all", label: "All Posts" },
    { id: "trending", label: "Trending" },
    { id: "following", label: "Following" },
    { id: "code", label: "Code Snippets" }
  ];

  return (
    <div className="feed-controls-bar">
      <div className="feed-tabs-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`feed-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="feed-search-input-box">
        <Search size={14} color="rgba(255, 255, 255, 0.45)" />
        <input
          type="text"
          placeholder="Search feed..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};

export default React.memo(FeedControls);
