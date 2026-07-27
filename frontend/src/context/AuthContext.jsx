import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // Client-side JWT expiration check
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.setItem("session_expired", "true");
            return null;
          }
        }
      } catch (e) {
        // Malformed token
      }
    }

    if (!storedUser || storedUser === "null" || storedUser === "undefined") return null;
    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed) return null;
      return {
        ...parsed,
        id: parsed.id || parsed._id
      };
    } catch (err) {
      console.error("Failed to parse stored user data:", err);
      return null;
    }
  });

  const setNormalizedUser = (u) => {
    setUser((prevUser) => {
      const resolvedUser = typeof u === "function" ? u(prevUser) : u;
      if (resolvedUser) {
        return {
          ...resolvedUser,
          id: resolvedUser.id || resolvedUser._id
        };
      } else {
        return null;
      }
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser: setNormalizedUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);