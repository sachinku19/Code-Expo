import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
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
    if (u) {
      setUser({
        ...u,
        id: u.id || u._id
      });
    } else {
      setUser(null);
    }
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