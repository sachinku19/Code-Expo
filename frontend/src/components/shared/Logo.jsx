import React from "react";
import { useTheme } from "../../context/ThemeContext";
import "./Logo.css";

function Logo({ size = 32, showText = true, className = "", forceTheme = null, ...props }) {
  let isLight = false;
  if (forceTheme === "dark") {
    isLight = false;
  } else if (forceTheme === "light") {
    isLight = true;
  } else {
    try {
      const themeContext = useTheme();
      isLight = (themeContext?.resolvedTheme || themeContext?.theme) === "light";
    } catch (e) {
      if (typeof document !== "undefined") {
        isLight = document.documentElement.classList.contains("light") || document.body.classList.contains("light");
      }
    }
  }

  const logoSrc = isLight ? "/logo-light.png" : "/logo-dark.png";

  return (
    <div className={`logo-container ${isLight ? "light" : "dark"} ${className}`} {...props}>
      <div className="logo-icon-wrapper" style={{ width: size, height: size }}>
        <img
          src={logoSrc}
          alt="CodeExpo Logo"
          className="logo-img-src"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block"
          }}
        />
      </div>

      {showText && (
        <span className="logo-text-wrapper">
          Code<span className="logo-text-highlight">Expo</span>
        </span>
      )}
    </div>
  );
}

export default Logo;
