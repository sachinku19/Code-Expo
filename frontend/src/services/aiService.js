import axios from "axios";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/ai`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Universal AI Request Helper
 */
const postAIRequest = async (endpoint, payload) => {
  const response = await axios.post(`${API_URL}/${endpoint}`, payload, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const sendAIChat = (payload) => postAIRequest("chat", payload);
export const sendAIChatMessage = async (message, roomId = "global-dashboard") => {
  return postAIRequest("chat", { prompt: message, message, roomId: roomId || "global-dashboard" });
};
export const explainCode = (payload) => postAIRequest("explain", payload);
export const fixCode = (payload) => postAIRequest("fix", payload);
export const optimizeCode = (payload) => postAIRequest("optimize", payload);
export const reviewCode = (payload) => postAIRequest("review", payload);
export const generateTests = (payload) => postAIRequest("generate-tests", payload);
export const generateDocumentation = (payload) => postAIRequest("documentation", payload);
export const convertLanguage = (payload) => postAIRequest("convert-language", payload);

/**
 * Room AI History
 */
export const getAIHistory = async (roomId) => {
  const response = await axios.get(`${API_URL}/history/${roomId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const clearAIHistory = async (roomId) => {
  const response = await axios.delete(`${API_URL}/history/${roomId}`, {
    headers: getAuthHeaders()
  });
  return response.data;
};
