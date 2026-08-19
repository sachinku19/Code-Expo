import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/workspace`
});

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const getWorkspaceTree = async (roomId) => {
  const response = await API.get(`/${roomId}/tree`, getHeaders());
  return response.data;
};

export const getFileContent = async (fileId) => {
  const response = await API.get(`/files/${fileId}`, getHeaders());
  return response.data;
};

export const createWorkspaceItem = async (roomId, name, type, parentId = null, language = "javascript") => {
  const response = await API.post(
    `/${roomId}/item`,
    { name, type, parentId, language },
    getHeaders()
  );
  return response.data;
};

export const renameWorkspaceItem = async (itemId, name) => {
  const response = await API.put(`/items/${itemId}/rename`, { name }, getHeaders());
  return response.data;
};

export const moveWorkspaceItem = async (itemId, parentId = null) => {
  const response = await API.put(`/items/${itemId}/move`, { parentId }, getHeaders());
  return response.data;
};

export const deleteWorkspaceItem = async (itemId) => {
  const response = await API.delete(`/items/${itemId}`, getHeaders());
  return response.data;
};

export const saveFileContent = async (fileId, content) => {
  const response = await API.put(`/files/${fileId}/content`, { content }, getHeaders());
  return response.data;
};

export const setFileEntryPoint = async (fileId) => {
  const response = await API.put(`/files/${fileId}/entry-point`, {}, getHeaders());
  return response.data;
};

export const getRoomHistory = async (roomId) => {
  const response = await API.get(`/${roomId}/history`, getHeaders());
  return response.data;
};

export const getWorkspaceContents = async (roomId) => {
  const response = await API.get(`/${roomId}/contents`, getHeaders());
  return response.data;
};

export const getRoomStorage = async (roomId) => {
  const response = await API.get(`/${roomId}/storage`, getHeaders());
  return response.data;
};

export const validateImport = async (roomId, files) => {
  const response = await API.post(`/${roomId}/import/validate`, { files }, getHeaders());
  return response.data;
};

export const importFiles = async (roomId, formData, onUploadProgress) => {
  const token = localStorage.getItem("token");
  const response = await API.post(`/${roomId}/import`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    },
    onUploadProgress
  });
  return response.data;
};
