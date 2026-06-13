import axios from "axios";

const API=axios.create({
    baseURL:"http://localhost:5000/api"
});

export const getMessage=async(roomId)=>{
    const token=localStorage.getItem("token");
    const response=await API.get(
        `message/${roomId}`,
        {
            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );
    return response.data;
}