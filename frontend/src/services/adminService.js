import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getAdminStats = async () => {
  const response = await API.get("/admin/stats", getHeaders());
  return response.data;
};

export const getAdminUsers = async (page = 1, limit = 10, search = "") => {
  const response = await API.get(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getHeaders());
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await API.delete(`/admin/users/${userId}`, getHeaders());
  return response.data;
};

export const updateUserRole = async (userId, role) => {
  const response = await API.put(`/admin/users/${userId}/role`, { role }, getHeaders());
  return response.data;
};

export const getAdminRooms = async (page = 1, limit = 10, search = "") => {
  const response = await API.get(`/admin/rooms?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getHeaders());
  return response.data;
};

export const deleteRoom = async (roomId) => {
  const response = await API.delete(`/admin/rooms/${roomId}`, getHeaders());
  return response.data;
};

export const getAdminRatings = async () => {
  const response = await API.get("/admin/ratings", getHeaders());
  return response.data;
};

export const deleteRating = async (ratingId) => {
  const response = await API.delete(`/admin/ratings/${ratingId}`, getHeaders());
  return response.data;
};

export const promoteSelf = async () => {
  const response = await API.post("/admin/promote-self", {}, getHeaders());
  return response.data;
};

export const toggleUserSuspension = async (userId) => {
  const response = await API.put(`/admin/users/${userId}/suspend`, {}, getHeaders());
  return response.data;
};

export const updateUserTitle = async (userId, title) => {
  const response = await API.put(`/admin/users/${userId}/title`, { title }, getHeaders());
  return response.data;
};

export const getRecentMessages = async (page = 1, limit = 30, search = "") => {
  const response = await API.get(`/admin/messages?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getHeaders());
  return response.data;
};

export const deleteChatMessage = async (messageId) => {
  const response = await API.delete(`/admin/messages/${messageId}`, getHeaders());
  return response.data;
};

export const getMaintenanceStatus = async () => {
  const response = await API.get("/admin/maintenance", getHeaders());
  return response.data;
};

export const toggleMaintenanceMode = async (active) => {
  const response = await API.post("/admin/maintenance", { active }, getHeaders());
  return response.data;
};

export const getAdminAnnouncements = async () => {
  const response = await API.get("/announcements", getHeaders());
  return response.data;
};

export const createAdminAnnouncement = async (announcementData) => {
  const response = await API.post("/announcements", announcementData, getHeaders());
  return response.data;
};

export const deleteAdminAnnouncement = async (id) => {
  const response = await API.delete(`/announcements/${id}`, getHeaders());
  return response.data;
};

// Ads Management API
export const getAdminAds = async () => {
  const response = await API.get("/ads", getHeaders());
  return response.data;
};

export const createAdminAd = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await API.post("/ads", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const toggleAdminAd = async (id) => {
  const response = await API.put(`/ads/${id}/toggle`, {}, getHeaders());
  return response.data;
};

export const deleteAdminAd = async (id) => {
  const response = await API.delete(`/ads/${id}`, getHeaders());
  return response.data;
};

export const getAdminPosts = async (page = 1, limit = 10, search = "", status = "all", userId = "") => {
  const response = await API.get(`/admin/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}&userId=${userId}`, getHeaders());
  return response.data;
};

export const deleteAdminPost = async (postId) => {
  const response = await API.delete(`/admin/posts/${postId}`, getHeaders());
  return response.data;
};

export const deleteAdminPostComment = async (postId, commentId) => {
  const response = await API.delete(`/admin/posts/${postId}/comments/${commentId}`, getHeaders());
  return response.data;
};

export const updateAdminPostStatus = async (postId, status, payload = null) => {
  let body = { status };
  if (payload) {
    if (
      payload.legalCase !== undefined ||
      payload.isPinned !== undefined ||
      payload.isFeatured !== undefined ||
      payload.commentsLocked !== undefined ||
      payload.likesDisabled !== undefined ||
      payload.isSensitive !== undefined ||
      payload.text !== undefined
    ) {
      body = { status, ...payload };
    } else {
      body.legalCase = payload;
    }
  }
  const response = await API.put(`/admin/posts/${postId}/status`, body, getHeaders());
  return response.data;
};

export const getAdminLoginLogs = async (page = 1, limit = 10, search = "", userId = "") => {
  const response = await API.get(`/admin/login-logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&userId=${userId}`, getHeaders());
  return response.data;
};

export const getAdminStories = async (page = 1, limit = 10, search = "", status = "all", userId = "") => {
  const response = await API.get(`/admin/stories?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}&userId=${userId}`, getHeaders());
  return response.data;
};

export const deleteAdminStory = async (storyId) => {
  const response = await API.delete(`/admin/stories/${storyId}`, getHeaders());
  return response.data;
};

export const adminIssueUserAction = async (userId, actionType, reason, notes) => {
  const response = await API.put(
    `/admin/users/${userId}/action`,
    { actionType, reason, notes },
    getHeaders()
  );
  return response.data;
};

export const bulkDeletePosts = async (postIds) => {
  const response = await API.post("/admin/posts/bulk-delete", { postIds }, getHeaders());
  return response.data;
};

export const bulkHidePosts = async (postIds, hide) => {
  const response = await API.post("/admin/posts/bulk-hide", { postIds, hide }, getHeaders());
  return response.data;
};

export const bulkFeaturePosts = async (postIds, feature) => {
  const response = await API.post("/admin/posts/bulk-feature", { postIds, feature }, getHeaders());
  return response.data;
};

export const updateAdminStoryStatus = async (storyId, status) => {
  const response = await API.put(`/admin/stories/${storyId}/status`, { status }, getHeaders());
  return response.data;
};

export const toggleAdminStoryFeature = async (storyId, isFeatured) => {
  const response = await API.put(`/admin/stories/${storyId}/feature`, { isFeatured }, getHeaders());
  return response.data;
};

