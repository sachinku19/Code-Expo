import React from "react";
import "./SkeletonLoader.css";

export const StatsSkeleton = () => {
  return (
    <div className="ce-stats-skeleton-grid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ce-stats-skeleton-card">
          <div className="ce-stats-skeleton-icon ce-skeleton ce-skeleton-circle"></div>
          <div className="ce-stats-skeleton-info">
            <div className="ce-skeleton ce-skeleton-text" style={{ width: "50%", height: "10px" }}></div>
            <div className="ce-skeleton ce-skeleton-text" style={{ width: "35%", height: "18px" }}></div>
            <div className="ce-skeleton ce-skeleton-text" style={{ width: "70%", height: "8px", marginTop: "4px" }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const RoomCardSkeleton = () => {
  return (
    <div className="ce-room-skeleton-card">
      <div className="ce-room-skeleton-header">
        <div className="ce-room-skeleton-creator">
          <div className="ce-room-skeleton-avatar ce-skeleton ce-skeleton-circle"></div>
          <div className="ce-room-skeleton-name ce-skeleton ce-skeleton-text"></div>
        </div>
        <div className="ce-room-skeleton-badge ce-skeleton"></div>
      </div>
      <div className="ce-room-skeleton-body">
        <div className="ce-room-skeleton-title-1 ce-skeleton ce-skeleton-text"></div>
        <div className="ce-room-skeleton-title-2 ce-skeleton ce-skeleton-text"></div>
      </div>
      <div className="ce-room-skeleton-footer">
        <div className="ce-room-skeleton-meta">
          <div className="ce-room-skeleton-tag ce-skeleton"></div>
        </div>
        <div className="ce-room-skeleton-btn ce-skeleton"></div>
      </div>
    </div>
  );
};

export const RoomGridSkeleton = ({ count = 2 }) => {
  return (
    <div className="ce-rooms-skeleton-grid">
      {Array.from({ length: count }).map((_, idx) => (
        <RoomCardSkeleton key={idx} />
      ))}
    </div>
  );
};

export const ActivityFeedSkeleton = ({ count = 3 }) => {
  return (
    <div className="ce-feed-skeleton-list">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="ce-feed-skeleton-card">
          <div className="ce-feed-skeleton-avatar ce-skeleton ce-skeleton-circle"></div>
          <div className="ce-feed-skeleton-meta">
            <div className="ce-feed-skeleton-line1 ce-skeleton ce-skeleton-text"></div>
            <div className="ce-feed-skeleton-line2 ce-skeleton ce-skeleton-text"></div>
          </div>
          <div className="ce-feed-skeleton-time ce-skeleton ce-skeleton-text"></div>
        </div>
      ))}
    </div>
  );
};

export const UserRowSkeleton = ({ showButton = false }) => {
  return (
    <div className="ce-user-skeleton-item">
      <div className="ce-user-skeleton-avatar ce-skeleton ce-skeleton-circle"></div>
      <div className="ce-user-skeleton-details">
        <div className="ce-user-skeleton-name ce-skeleton ce-skeleton-text"></div>
        <div className="ce-user-skeleton-bio ce-skeleton ce-skeleton-text"></div>
      </div>
      {showButton && <div className="ce-user-skeleton-btn ce-skeleton"></div>}
    </div>
  );
};

export const UserListSkeleton = ({ count = 3, showButton = false }) => {
  return (
    <div className="ce-users-skeleton-list">
      {Array.from({ length: count }).map((_, idx) => (
        <UserRowSkeleton key={idx} showButton={showButton} />
      ))}
    </div>
  );
};

export const TrendingRoomSkeleton = () => {
  return (
    <div className="ce-trending-skeleton-card">
      <div className="ce-trending-skeleton-top">
        <div className="ce-trending-skeleton-creator">
          <div className="ce-trending-skeleton-avatar ce-skeleton ce-skeleton-circle"></div>
          <div className="ce-trending-skeleton-name ce-skeleton ce-skeleton-text"></div>
        </div>
        <div className="ce-trending-skeleton-badge ce-skeleton"></div>
      </div>
      <div className="ce-trending-skeleton-title ce-skeleton ce-skeleton-text"></div>
      <div className="ce-trending-skeleton-bottom">
        <div className="ce-trending-skeleton-meta">
          <div className="ce-trending-skeleton-tag ce-skeleton"></div>
        </div>
        <div className="ce-trending-skeleton-like ce-skeleton"></div>
      </div>
    </div>
  );
};

export const TrendingListSkeleton = ({ count = 2 }) => {
  return (
    <div className="ce-trending-skeleton-list">
      {Array.from({ length: count }).map((_, idx) => (
        <TrendingRoomSkeleton key={idx} />
      ))}
    </div>
  );
};

export const AdSkeleton = () => {
  return (
    <div className="ce-ad-skeleton-card">
      <div className="ce-ad-skeleton-media ce-skeleton"></div>
      <div className="ce-ad-skeleton-details">
        <div className="ce-ad-skeleton-title ce-skeleton ce-skeleton-text"></div>
        <div className="ce-ad-skeleton-link ce-skeleton ce-skeleton-text"></div>
      </div>
    </div>
  );
};
