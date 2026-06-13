import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/social"
});

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const toggleFollowUser = async (userId) => {
  const response = await API.post(`/follow/${userId}`, {}, getHeaders());
  return response.data;
};

export const removeFollower = async (userId) => {
  const response = await API.delete(`/follower/${userId}`, getHeaders());
  return response.data;
};

export const getFollowers = async (userId) => {
  const response = await API.get(`/followers/${userId}`, getHeaders());
  return response.data;
};

export const getFollowing = async (userId) => {
  const response = await API.get(`/following/${userId}`, getHeaders());
  return response.data;
};

export const toggleLikeRoom = async (roomId) => {
  const response = await API.post(`/like/${roomId}`, {}, getHeaders());
  return response.data;
};

export const toggleBookmarkRoom = async (roomId) => {
  const response = await API.post(`/bookmark/${roomId}`, {}, getHeaders());
  return response.data;
};

export const getRoomSocialStats = async (roomId) => {
  const response = await API.get(`/room-stats/${roomId}`, getHeaders());
  return response.data;
};

export const getTrendingRooms = async () => {
  const response = await API.get("/trending-rooms", getHeaders());
  return response.data;
};

export const getSocialFeed = async (page = 1, limit = 10) => {
  const response = await API.get(`/feed?page=${page}&limit=${limit}`, getHeaders());
  return response.data;
};

export const getDeveloperSuggestions = async () => {
  const response = await API.get("/suggestions", getHeaders());
  return response.data;
};

export const getNotifications = async () => {
  const response = await API.get("/notifications", getHeaders());
  return response.data;
};

export const markNotificationsRead = async (notificationId = null) => {
  const body = notificationId ? { notificationId } : {};
  const response = await API.post("/notifications/read", body, getHeaders());
  return response.data;
};

export const getLikedRooms = async () => {
  const response = await API.get("/rooms/liked", getHeaders());
  return response.data;
};

export const getBookmarkedRooms = async () => {
  const response = await API.get("/rooms/bookmarked", getHeaders());
  return response.data;
};

export const searchUsers = async (query) => {
  const response = await API.get(`/users/search?q=${query}`, getHeaders());
  return response.data;
};

export const getUserPublicProfile = async (userId, year) => {
  const url = year && year !== "last12" ? `/users/profile/${userId}?year=${year}` : `/users/profile/${userId}`;
  const response = await API.get(url, getHeaders());
  return response.data;
};

