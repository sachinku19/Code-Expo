import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import "./GateOverlay.css";

export default function GateOverlay({ exiting = false, statusText = "Entering Workspace..." }) {
  const [progress, setProgress] = useState(0);
  const { resolvedTheme } = useTheme();

  // Smooth progress counter synced with route transition timings
  useEffect(() => {
    setProgress(0);
    const duration = exiting ? 800 : 400;
    const steps = 20;
    const stepTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const currentProg = Math.min((currentStep / steps) * 100, 100);
      setProgress(Math.round(currentProg));
      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [exiting]);

  // Dynamic professional statuses during load
  const getDynamicStatusText = () => {
    if (exiting) {
      if (progress < 40) return "Syncing Workspace Grid...";
      if (progress < 80) return "Loading IDE Components...";
      return "Workspace Connected";
    }
    return statusText;
  };

  return (
    <div className={`ce-gate-overlay ${exiting ? "exiting" : ""} ${resolvedTheme}`}>
      
      {/* Subtle dotted background grid */}
      <div className="gate-grid-bg" />

      {/* Modern glass panels */}
      <div className="gate-doors-container">
        <div className={`gate-door gate-door-left ${exiting ? "exiting" : ""}`} />
        <div className={`gate-door gate-door-right ${exiting ? "exiting" : ""}`} />
      </div>

      {/* Minimalist central HUD console */}
      <div className={`gate-core-portal ${exiting ? "exiting" : ""}`}>
        <div className="gate-logo-container">
          <img src="/logo.png" alt="CodeExpo Logo" className="gate-logo-img" />
          <div className="logo-pulse-ring" />
        </div>

        <div className="gate-display-panel">
          <h2 className="gate-status-title">{getDynamicStatusText()}</h2>
          
          {/* Snappy thin progress line */}
          <div className="gate-loader-bar">
            <div 
              className="gate-loader-fill" 
              style={{ width: `${progress}%` }} 
            />
          </div>

          {/* Minimalist status indicators */}
          <div className="gate-details-row">
            <div className="detail-item">
              <span className="label">BRIDGE</span>
              <span className="value active">SECURE</span>
            </div>
            <div className="detail-item">
              <span className="label">DECRYPT</span>
              <span className="value percent">{progress}%</span>
            </div>
            <div className="detail-item">
              <span className="label">GRID</span>
              <span className="value active">ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
