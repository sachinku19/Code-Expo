import socket from "../socket/socket";

/**
 * Production-Grade Global Like Engine
 * Handles optimistic UI updates, request deduplication, latest-intent race locks,
 * monotonic versioning to discard stale updates, and socket state reconciliation.
 */

// Track monotonic versions for each entity: entityId -> timestamp/version
const entityVersions = new Map();

// Track pending operations for each entity: entityId -> { inFlight: boolean, targetLiked: boolean, lastLikes: Array, resolveCallbacks: Array }
const pendingOps = new Map();

// Event listeners for like updates: entityType -> Set of callbacks
const listeners = new Map();

/**
 * Check if a specific user has liked an entity based on its likes array.
 */
export const isEntityLiked = (likes, userId) => {
  if (!likes || !Array.isArray(likes) || !userId) return false;
  const targetId = String(userId._id || userId.id || userId);
  return likes.some(id => String(id._id || id.id || id) === targetId);
};

/**
 * Get the total like count for an entity.
 */
export const getEntityLikesCount = (likes) => {
  return Array.isArray(likes) ? likes.length : 0;
};

/**
 * Register a listener for real-time like updates.
 * @param {string} entityType - "ROOM", "POST", etc.
 * @param {function} callback - (payload) => void
 * @returns {function} unsubscribe function
 */
export const subscribeToLikes = (entityType, callback) => {
  if (!listeners.has(entityType)) {
    listeners.set(entityType, new Set());
  }
  listeners.get(entityType).add(callback);

  return () => {
    const typeSet = listeners.get(entityType);
    if (typeSet) {
      typeSet.delete(callback);
    }
  };
};

/**
 * Core Socket Listener for "like:update"
 */
if (socket) {
  socket.on("like:update", (data) => {
    if (!data || !data.entityId || !data.entityType) return;

    const currentVersion = entityVersions.get(data.entityId) || 0;
    // Stale update protection: ignore updates older than or equal to current version
    if (data.version && data.version <= currentVersion) {
      return;
    }

    // Update monotonic version map
    entityVersions.set(data.entityId, data.version || Date.now());

    // Notify all registered subscribers for this entity type
    const typeSet = listeners.get(data.entityType);
    if (typeSet) {
      typeSet.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in like:update subscriber:", e);
        }
      });
    }
  });
}

/**
 * Executes an optimistic like toggle with latest-intent lock and failure rollback.
 * 
 * @param {Object} params
 * @param {string} params.entityType - "ROOM" | "POST"
 * @param {string} params.entityId - Unique ID of the room or post
 * @param {Object|string} params.currentUser - Auth user object or user ID
 * @param {Array} params.currentLikes - Current likes array from entity
 * @param {Function} params.apiCall - Promise returning API function, e.g. () => toggleLikeRoom(roomId)
 * @param {Function} params.onStateUpdate - Callback receiving optimistic update: ({ likes, likesCount, isLiked, version })
 * @param {Function} [params.onError] - Optional callback if API fails completely
 */
export const toggleLikeOptimistic = async ({
  entityType,
  entityId,
  currentUser,
  currentLikes = [],
  apiCall,
  onStateUpdate,
  onError
}) => {
  if (!entityId || !currentUser || typeof apiCall !== "function") return;

  const userIdStr = String(currentUser._id || currentUser.id || currentUser);
  const currentlyLiked = isEntityLiked(currentLikes, currentUser);
  const targetLiked = !currentlyLiked;

  // Calculate optimistic likes array
  let optimisticLikes = Array.isArray(currentLikes) ? [...currentLikes] : [];
  if (targetLiked) {
    if (!optimisticLikes.some(id => String(id._id || id.id || id) === userIdStr)) {
      optimisticLikes.push(currentUser);
    }
  } else {
    optimisticLikes = optimisticLikes.filter(id => String(id._id || id.id || id) !== userIdStr);
  }

  const optVersion = Date.now();
  entityVersions.set(entityId, optVersion);

  // 1. Immediately apply optimistic UI update
  if (typeof onStateUpdate === "function") {
    onStateUpdate({
      entityId,
      entityType,
      likes: optimisticLikes,
      likesCount: optimisticLikes.length,
      isLiked: targetLiked,
      version: optVersion
    });
  }

  // 2. Manage Latest-Intent Race Locks
  let op = pendingOps.get(entityId);
  if (op && op.inFlight) {
    // If a request is already in flight, record the new target intent and return
    op.targetLiked = targetLiked;
    op.latestOptLikes = optimisticLikes;
    op.onStateUpdate = onStateUpdate;
    op.onError = onError;
    return;
  }

  // Set in-flight lock for this entity
  op = {
    inFlight: true,
    targetLiked,
    initialLikes: currentLikes,
    latestOptLikes: optimisticLikes,
    onStateUpdate,
    onError
  };
  pendingOps.set(entityId, op);

  // 3. Background Persistence Loop (Processes latest user intent sequentially)
  const processHttpQueue = async () => {
    const currentOp = pendingOps.get(entityId);
    if (!currentOp) return;

    try {
      const res = await apiCall();
      
      const latestOp = pendingOps.get(entityId);
      
      // If user clicked again while HTTP request was in flight, fire another request for latest intent
      if (latestOp && latestOp.targetLiked !== currentOp.targetLiked) {
        currentOp.targetLiked = latestOp.targetLiked;
        await processHttpQueue();
        return;
      }

      // Reconciliation: If server returned authoritative likes & version, update state
      if (res && res.success) {
        const serverVersion = res.version || Date.now();
        const currentEntityVersion = entityVersions.get(entityId) || 0;
        
        if (serverVersion >= currentEntityVersion) {
          entityVersions.set(entityId, serverVersion);
          if (res.likes && typeof latestOp.onStateUpdate === "function") {
            latestOp.onStateUpdate({
              entityId,
              entityType,
              likes: res.likes,
              likesCount: res.likes.length,
              isLiked: isEntityLiked(res.likes, currentUser),
              version: serverVersion
            });
          }
        }
      } else {
        throw new Error(res?.message || "Like operation failed");
      }
    } catch (err) {
      console.error(`Failed to persist like toggle for ${entityType} ${entityId}:`, err);
      // Smooth Rollback on hard HTTP failure
      const latestOp = pendingOps.get(entityId);
      if (latestOp) {
        entityVersions.set(entityId, Date.now());
        if (typeof latestOp.onStateUpdate === "function") {
          latestOp.onStateUpdate({
            entityId,
            entityType,
            likes: latestOp.initialLikes,
            likesCount: getEntityLikesCount(latestOp.initialLikes),
            isLiked: isEntityLiked(latestOp.initialLikes, currentUser),
            version: Date.now()
          });
        }
        if (typeof latestOp.onError === "function") {
          latestOp.onError(err);
        }
      }
    } finally {
      pendingOps.delete(entityId);
    }
  };

  await processHttpQueue();
};
