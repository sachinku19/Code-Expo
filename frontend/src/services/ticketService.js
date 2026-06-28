import axios from "axios";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
});

// Helper to configure authorization header
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const createTicket = async (subject, description, category, attachments) => {
  const response = await API.post(
    "/tickets",
    { subject, description, category, attachments },
    getAuthHeaders()
  );
  return response.data;
};

export const getUserTickets = async () => {
  const response = await API.get(
    "/tickets",
    getAuthHeaders()
  );
  return response.data;
};

export const getTicketDetails = async (ticketId) => {
  const response = await API.get(
    `/tickets/${ticketId}`,
    getAuthHeaders()
  );
  return response.data;
};

export const addTicketMessage = async (ticketId, message) => {
  const response = await API.post(
    `/tickets/${ticketId}/messages`,
    { message },
    getAuthHeaders()
  );
  return response.data;
};

export const adminGetAllTickets = async () => {
  const response = await API.get(
    "/tickets/admin/all",
    getAuthHeaders()
  );
  return response.data;
};

export const adminUpdateTicketStatus = async (ticketId, status, assignedTo) => {
  const response = await API.put(
    `/tickets/admin/${ticketId}/status`,
    { status, assignedTo },
    getAuthHeaders()
  );
  return response.data;
};
