import React, { useEffect, useState } from "react";
import "./GateOverlay.css";

export default function GateOverlay({ exiting = false, statusText = "Entering Workspace..." }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (exiting) {
      // Simulate quick loading progress during the unlocking phase (first 300ms)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 25);
      return () => clearInterval(interval);
    } else {
      setProgress(40); // default starting progress when closing
    }
  }, [exiting]);

  return (
    <div className={`ce-gate-overlay ${exiting ? "exiting" : ""}`}>
      {/* Central horizontal seam laser scanner */}
      <div className={`gate-laser-beam ${exiting ? "exiting" : ""}`} />

      {/* LEFT SLIDING DOOR */}
      <div className={`gate-door gate-door-left ${exiting ? "exiting" : ""}`}>
        {/* Left Half of the Cyber Lock */}
        <div className={`gate-lock-half left-lock ${exiting ? "exiting" : ""}`}>
          <div className="lock-ring ring-outer" />
          <div className="lock-ring ring-middle" />
          <div className="lock-ring ring-inner" />
          <div className="lock-glow-orb" />
        </div>
        
        {/* Glowing Tech Circuits */}
        <div className="circuit-container">
          <div className="circuit-line line-1" />
          <div className="circuit-line line-2" />
          <div className="circuit-line line-3" />
        </div>
      </div>

      {/* RIGHT SLIDING DOOR */}
      <div className={`gate-door gate-door-right ${exiting ? "exiting" : ""}`}>
        {/* Right Half of the Cyber Lock */}
        <div className={`gate-lock-half right-lock ${exiting ? "exiting" : ""}`}>
          <div className="lock-ring ring-outer" />
          <div className="lock-ring ring-middle" />
          <div className="lock-ring ring-inner" />
          <div className="lock-glow-orb" />
        </div>

        {/* Glowing Tech Circuits */}
        <div className="circuit-container">
          <div className="circuit-line line-1-r" />
          <div className="circuit-line line-2-r" />
          <div className="circuit-line line-3-r" />
        </div>
      </div>

      {/* CENTRAL STATUS TERMINAL */}
      <div className={`gate-core-portal ${exiting ? "exiting" : ""}`}>
        <div className="gate-portal-glow" />
        <div className="gate-scanner-ray" />
        <div className="gate-portal-display">
          <h2 className="gate-portal-text">{statusText}</h2>
          <div className="gate-status-bar">
            <div 
              className="gate-status-progress" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="gate-system-status">
            <span>SECURE LINK: ACTIVE</span>
            <span>GRID: ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
