import axios from "axios";

const API_URL = "http://localhost:5000/api/ai";

export const sendAIChatMessage = async (message) => {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await axios.post(`${API_URL}/chat`, { message }, { headers });
  return res.data;
};
