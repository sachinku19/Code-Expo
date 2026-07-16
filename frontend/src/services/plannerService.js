import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/planner`
});

// Automatically attach JWT token to all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ==========================================
// PERSONAL TASKS
// ==========================================
export const getPersonalTasks = async (params = {}) => {
  const response = await API.get("/personal", { params });
  return response.data;
};

export const createPersonalTask = async (taskFormData) => {
  const response = await API.post("/personal", taskFormData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const updatePersonalTask = async (taskId, taskFormData) => {
  const response = await API.put(`/personal/${taskId}`, taskFormData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const deletePersonalTask = async (taskId) => {
  const response = await API.delete(`/personal/${taskId}`);
  return response.data;
};

// ==========================================
// ROOM TASKS
// ==========================================
export const getRoomTasks = async (roomId, params = {}) => {
  const response = await API.get(`/room/${roomId}`, { params });
  return response.data;
};

export const createRoomTask = async (roomId, taskFormData) => {
  const response = await API.post(`/room/${roomId}`, taskFormData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const updateRoomTask = async (roomId, taskId, taskFormData) => {
  const response = await API.put(`/room/${roomId}/tasks/${taskId}`, taskFormData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const deleteRoomTask = async (roomId, taskId) => {
  const response = await API.delete(`/room/${roomId}/tasks/${taskId}`);
  return response.data;
};

// ==========================================
// CHECKLISTS
// ==========================================
export const getTaskChecklist = async (taskId) => {
  const response = await API.get(`/tasks/${taskId}/checklist`);
  return response.data;
};

export const addChecklistItem = async (taskId, data) => {
  const response = await API.post(`/tasks/${taskId}/checklist`, data);
  return response.data;
};

export const updateChecklistItem = async (taskId, itemId, data) => {
  const response = await API.put(`/tasks/${taskId}/checklist/${itemId}`, data);
  return response.data;
};

export const deleteChecklistItem = async (taskId, itemId) => {
  const response = await API.delete(`/tasks/${taskId}/checklist/${itemId}`);
  return response.data;
};

// ==========================================
// COMMENTS
// ==========================================
export const getTaskComments = async (taskId) => {
  const response = await API.get(`/tasks/${taskId}/comments`);
  return response.data;
};

export const addComment = async (taskId, data) => {
  const response = await API.post(`/tasks/${taskId}/comments`, data);
  return response.data;
};

export const deleteComment = async (commentId) => {
  const response = await API.delete(`/comments/${commentId}`);
  return response.data;
};

// ==========================================
// TIMER SESSIONS
// ==========================================
export const startTimer = async (taskId, taskType) => {
  const response = await API.post(`/tasks/${taskId}/timer/start`, { taskType });
  return response.data;
};

export const stopTimer = async (taskId, taskType) => {
  const response = await API.post(`/tasks/${taskId}/timer/stop`, { taskType });
  return response.data;
};

export const getActiveTimer = async () => {
  const response = await API.get("/timer/active");
  return response.data;
};

// ==========================================
// DASHBOARDS
// ==========================================
export const getPersonalDashboard = async () => {
  const response = await API.get("/dashboard/personal");
  return response.data;
};

export const getRoomDashboard = async (roomId) => {
  const response = await API.get(`/dashboard/room/${roomId}`);
  return response.data;
};
