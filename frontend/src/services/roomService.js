import axios from "axios"

const API = axios.create({
    baseURL: `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`
})

export const createRoom = async (title, language, isPrivate) => {
    const token = localStorage.getItem("token");
    const response = await API.post(
        "/rooms/create",
        { title, language, isPrivate },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
}

export const joinRoom = async (roomId) => {

    const token = localStorage.getItem("token");

    const response = await API.post(
        "/rooms/join",
        { roomId },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }

    )
    return response.data;
}

export const getRoom = async (roomId) => {
    const token = localStorage.getItem("token");

    const response = await API.get(
        `/rooms/${roomId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
}

export const leaveRoom = async (roomId) => {
    const token = localStorage.getItem("token");

    const response = await API.delete(
        `/rooms/leave/${roomId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    )

    return response.data;
}

export const deleteRoom = async (roomId) => {

    const token = localStorage.getItem("token");

    const response = await API.delete(
        `/rooms/delete/${roomId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return response.data;
};

export const getUserRoomsHistory = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/user/history",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getLiveRooms = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/active/live",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getRecentRooms = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/recent",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getPendingRequests = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/requests/pending",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const respondToJoinRequest = async (roomId, requesterId, action) => {
    const token = localStorage.getItem("token");
    const response = await API.post(
        "/rooms/requests/respond",
        { roomId, requesterId, action },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const removeUser = async (roomId, userId) => {
    const token = localStorage.getItem("token");
    const response = await API.post(
        "/rooms/remove-user",
        { roomId, userId },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getActivityFeed = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/activity",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getActivityStats = async (year) => {
    const token = localStorage.getItem("token");
    const url = year && year !== "last12" ? `/activity/stats?year=${year}` : "/activity/stats";
    const response = await API.get(
        url,
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getAllPublicRooms = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/all/public",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getMySentRequests = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/rooms/requests/my-requests",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};
