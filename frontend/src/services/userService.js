import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const uploadAvatar = async (formData) => {
  const token = localStorage.getItem("token");
  const response = await API.post("/users/avatar", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

export const deleteAvatar = async () => {
  const token = localStorage.getItem("token");
  const response = await API.delete("/users/avatar", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const token = localStorage.getItem("token");
  const response = await API.put("/users/profile", profileData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

export const getActiveAnnouncements = async () => {
  const token = localStorage.getItem("token");
  const response = await API.get("/announcements/active", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

export const getActiveAds = async () => {
  const token = localStorage.getItem("token");
  const response = await API.get("/ads/active", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};


