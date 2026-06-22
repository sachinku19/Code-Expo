import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/direct-messages`
});

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getConversations = async () => {
  const response = await API.get("/conversations", getHeaders());
  return response.data;
};

export const getChatHistory = async (userId) => {
  const response = await API.get(`/chat/${userId}`, getHeaders());
  return response.data;
};

export const sendDirectMessage = async (recipientId, message) => {
  const response = await API.post("/send", { recipientId, message }, getHeaders());
  return response.data;
};
