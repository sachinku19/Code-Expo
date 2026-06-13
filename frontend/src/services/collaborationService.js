import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const fetchLineOwnership = async (roomId, fileId) => {
  const params = fileId ? `?fileId=${fileId}` : "";
  const response = await API.get(`/collaboration/${roomId}/ownership${params}`, getHeaders());
  return response.data;
};

export const fetchVersionHistory = async (roomId, fileId) => {
  const params = fileId ? `?fileId=${fileId}` : "";
  const response = await API.get(`/collaboration/${roomId}/versions${params}`, getHeaders());
  return response.data;
};

export const fetchEditActivities = async (roomId, fileId) => {
  const params = fileId ? `?fileId=${fileId}` : "";
  const response = await API.get(`/collaboration/${roomId}/activities${params}`, getHeaders());
  return response.data;
};

export const restoreVersion = async (roomId, fileId, versionId) => {
  const response = await API.post(`/collaboration/${roomId}/restore`, { fileId, versionId }, getHeaders());
  return response.data;
};
