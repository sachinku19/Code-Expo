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

export const purchaseSubscription = async (plan, paymentDetails) => {
  const res = await API.post("/subscription/purchase", { plan, paymentDetails }, getHeaders());
  return res.data;
};

export const getSubscriptionStatus = async () => {
  const res = await API.get("/subscription/status", getHeaders());
  return res.data;
};

export const getBillingHistory = async () => {
  const res = await API.get("/subscription/history", getHeaders());
  return res.data;
};
