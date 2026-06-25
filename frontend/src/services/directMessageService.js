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

export const sendDirectMessageAttachment = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await API.post("/send-attachment", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const deleteDirectMessage = async (messageId) => {
  const response = await API.delete(`/delete/${messageId}`, getHeaders());
  return response.data;
};

export const editDirectMessage = async (messageId, text) => {
  const response = await API.put(`/edit/${messageId}`, { text }, getHeaders());
  return response.data;
};

export const createGroupChat = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await API.post("/group/create", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};
