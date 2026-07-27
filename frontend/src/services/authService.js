import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

// Configure Global & Instance 401 Response Interceptors (LeetCode-grade Auto-Logout)
const setupInterceptors = (instance) => {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        const url = error.config?.url || "";
        const isAuthSubmit = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/forgot-password");

        // Do not auto-logout if the 401 was a failed password/credential check during login submit
        if (!isAuthSubmit) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.setItem("session_expired", "true");

          const currentPath = window.location.pathname;
          if (currentPath !== "/login" && currentPath !== "/register") {
            window.location.href = "/login?expired=true";
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

setupInterceptors(axios);
setupInterceptors(API);

export const  registerUser=async(userData)=>{
    const response=await API.post("/auth/register",userData);
    return response.data;
}
export const loginUser=async(userData)=>{
     const response=await API.post("/auth/login",userData);
     return response.data;
}

export const googleLoginUser=async(token)=>{
     const response=await API.post("/auth/google",{ token });
     return response.data;
}

export const getUserProfile=async()=>{
    const token=localStorage.getItem("token");
    const response=await API.get(
        "/auth/profile",{
            headers:{
                Authorization:`Bearer ${token}`
            }
        });

        return response.data;
}

export const getCountUser = async () => {
    const count = await API.get("/auth/userCount");
    return count.data;
}

export const logoutUser = async () => {
  const token=localStorage.getItem("token");
  const response = await API.put("/auth/logout",{},
    {
        headers:{
            Authorization:`Bearer ${token}`
        }
    }
  );
  return response.data;
};

export const changePassword = async (passwordData) => {
  const token = localStorage.getItem("token");
  const response = await API.put("/auth/change-password", passwordData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

export const getPublicStats = async () => {
  const response = await API.get("/auth/public-stats");
  return response.data;
};

export const getPublicDevelopers = async () => {
  const response = await API.get("/auth/public-developers");
  return response.data;
};

export const getPublicUserProfile = async (username) => {
  const response = await API.get(`/auth/user-profile/${encodeURIComponent(username)}`);
  return response.data;
};

export const getGoogleConfig = async () => {
  const response = await API.get("/auth/google-config");
  return response.data;
};


export const forgotPassword = async (emailData) => {
  const response = await API.post("/auth/forgot-password", emailData);
  return response.data;
};

export const resetPassword = async (token, passwordData) => {
  const response = await API.post(`/auth/reset-password/${token}`, passwordData);
  return response.data;
};
