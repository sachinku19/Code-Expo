import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000/api"
});

export const submitWebsiteRating = async (rating, comment) => {
    const token = localStorage.getItem("token");
    const response = await API.post(
        "/website-rating/submit",
        { rating, comment },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};

export const getWebsiteRatingInfo = async () => {
    const token = localStorage.getItem("token");
    const response = await API.get(
        "/website-rating/info",
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );
    return response.data;
};
