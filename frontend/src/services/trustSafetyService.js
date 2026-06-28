import axios from "axios";

const API_URL = "/api/trust-safety";

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
  const res = await axios.get(`${API_URL}/status`, getHeaders());
  return res.data;
};

export const getModerationHistory = async () => {
  const res = await axios.get(`${API_URL}/history`, getHeaders());
  return res.data;
};

export const createAppeal = async (moderationActionId, reason, notes, attachment) => {
  const res = await axios.post(`${API_URL}/appeal`, {
    moderationActionId,
    reason,
    notes,
    attachment
  }, getHeaders());
  return res.data;
};

export const adminGetAppeals = async () => {
  const res = await axios.get(`${API_URL}/admin/appeals`, getHeaders());
  return res.data;
};

export const adminResolveAppeal = async (appealId, status, adminResponse) => {
  const res = await axios.put(`${API_URL}/admin/appeals/${appealId}`, {
    status,
    adminResponse
  }, getHeaders());
  return res.data;
};
