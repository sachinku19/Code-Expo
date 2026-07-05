import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

// Set token helper
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getTrustSafetyStatus = async () => {
  const res = await API.get("/trust-safety/status", getHeaders());
  return res.data;
};

export const getModerationHistory = async () => {
  const res = await API.get("/trust-safety/history", getHeaders());
  return res.data;
};

export const createAppeal = async (moderationActionId, reason, notes, attachment) => {
  const res = await API.post("/trust-safety/appeal", {
    moderationActionId,
    reason,
    notes,
    attachment
  }, getHeaders());
  return res.data;
};

export const adminGetAppeals = async () => {
  const res = await API.get("/trust-safety/admin/appeals", getHeaders());
  return res.data;
};

export const adminResolveAppeal = async (appealId, status, adminResponse) => {
  const res = await API.put(`/trust-safety/admin/appeals/${appealId}`, {
    status,
    adminResponse
  }, getHeaders());
  return res.data;
};
