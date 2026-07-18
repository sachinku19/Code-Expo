import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

// Helper to attach authorization token
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getUnifiedStats = async () => {
  const res = await API.get("/cp/dashboard", getAuthHeaders());
  return res.data;
};

export const connectPlatform = async (platform, username) => {
  const res = await API.post("/cp/connect", { platform, username }, getAuthHeaders());
  return res.data;
};

export const refreshAllPlatforms = async (platform = null) => {
  const body = platform ? { platform } : {};
  const res = await API.post("/cp/refresh", body, getAuthHeaders());
  return res.data;
};

export const disconnectPlatform = async (platform) => {
  const res = await API.delete("/cp/disconnect", {
    data: { platform },
    ...getAuthHeaders()
  });
  return res.data;
};

export const getLeaderboard = async (scope) => {
  const res = await API.get(`/cp/leaderboard?scope=${scope}`, getAuthHeaders());
  return res.data;
};

export const shareProfile = async () => {
  const res = await API.post("/cp/share", {}, getAuthHeaders());
  return res.data;
};
