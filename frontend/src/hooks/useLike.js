import { useMemo, useCallback } from "react";
import { isEntityLiked, getEntityLikesCount, toggleLikeOptimistic } from "../services/likeEngine";

/**
 * Reusable React Hook for Any Likeable Entity (Room, Post, Story, Comment)
 * 
 * @param {Object} options
 * @param {string} options.entityType - "ROOM" | "POST"
 * @param {string} options.entityId - Unique ID of entity
 * @param {Array} options.likes - Current likes array
 * @param {Object|string} options.currentUser - Logged-in user
 * @param {Function} options.apiCall - Async API toggle function
 * @param {Function} options.onUpdate - Callback when likes state updates (optimistic or server)
 * @param {Function} [options.onError] - Optional error handler
 */
export const useLike = ({
  entityType,
  entityId,
  likes = [],
  currentUser,
  apiCall,
  onUpdate,
  onError
}) => {
  const isLiked = useMemo(() => {
    return isEntityLiked(likes, currentUser);
  }, [likes, currentUser]);

  const likesCount = useMemo(() => {
    return getEntityLikesCount(likes);
  }, [likes]);

  const toggleLike = useCallback(() => {
    return toggleLikeOptimistic({
      entityType,
      entityId,
      currentUser,
      currentLikes: likes,
      apiCall,
      onStateUpdate: onUpdate,
      onError
    });
  }, [entityType, entityId, currentUser, likes, apiCall, onUpdate, onError]);

  return {
    isLiked,
    likesCount,
    toggleLike
  };
};
