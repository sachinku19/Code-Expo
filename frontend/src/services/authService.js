import axios from "axios";

const API=axios.create({
    baseURL:"http://localhost:5000/api"
});

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

export const getGoogleConfig = async () => {
  const response = await API.get("/auth/google-config");
  return response.data;
};
