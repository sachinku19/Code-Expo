import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Create socket instance specifically pointing to the /planner namespace
const plannerSocket = io(`${BACKEND_URL}/planner`, {
  autoConnect: false,
  reconnectionAttempts: 5,
  timeout: 10000
});

export default plannerSocket;
