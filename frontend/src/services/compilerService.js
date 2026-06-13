import axios from "axios";

const API=axios.create({
    baseURL:"http://localhost:5000/api"
});

export const runCode=async(data)=>{
    const token=localStorage.getItem("token");

    const response=await API.post(
        "/compiler/run",
        data,
        {
            headers:{
                Authorization:`Bearer ${token}`
            }
        }
    );

    return response.data;
}