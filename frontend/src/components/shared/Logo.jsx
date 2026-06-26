import React from "react";
import "./Logo.css";

function Logo({ size = 32, showText = true, className = "", ...props }) {
  return (
    <div className={`logo-container ${className}`} {...props}>
      <div className="logo-icon-wrapper" style={{ width: size, height: size }}>
        <img
          src="/logo.png"
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
