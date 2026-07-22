/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  // Default to "light" theme choice
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem("codeExpoHomeTheme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "light";
  });

  const [resolvedTheme, setResolvedTheme] = useState("light");

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("codeExpoHomeTheme", newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const applyTheme = () => {
      let resTheme = theme;
      if (theme === "system") {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        resTheme = isSystemDark ? "dark" : "light";
      }
      setResolvedTheme(resTheme);
      document.documentElement.className = resTheme;
      document.documentElement.setAttribute("data-theme-mode", theme);
      if (resTheme === "light") {
        document.body.classList.add("light");
        document.body.classList.remove("dark");
      } else {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Sync theme when localStorage updates in another tab or window
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "codeExpoHomeTheme") {
        const val = e.newValue;
        if (val === "light" || val === "dark" || val === "system") {
          setThemeState(val);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
