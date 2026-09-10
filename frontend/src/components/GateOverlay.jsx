import React, { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import "./GateOverlay.css";

export default function GateOverlay({ exiting = false, statusText = "Entering Workspace..." }) {
  const [progress, setProgress] = useState(0);
  const { resolvedTheme } = useTheme();

  // Smooth progressive counter synced with route transition timings
  useEffect(() => {
    setProgress(0);
    const duration = exiting ? 500 : 380;
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

  // Dynamic executive status during transition
  const getDynamicSubtitle = () => {
    if (exiting) {
      if (progress < 40) return "Resolving workspace route...";
      if (progress < 85) return "Synchronizing real-time engine...";
      return "Workspace connected";
    }
    return "Initializing collaborative canvas...";
  };

  return (
    <div className={`ce-gate-overlay ${exiting ? "exiting" : ""} ${resolvedTheme}`}>
      {/* Ambient background glow & subtle dot matrix */}
      <div className="gate-ambient-spotlight" />
      <div className="gate-grid-bg" />

      {/* Floating Center Gateway Card */}
      <div className={`gate-portal-card ${exiting ? "exiting" : ""}`}>
        {/* Animated Emblem with Ambient Orbital Rings */}
        <div className="gate-logo-wrapper">
          <div className="gate-logo-orbit-ring" />
          <div className="gate-logo-orbit-ring-secondary" />
          <div className="gate-logo-box">
            <img src="/logo.png" alt="CodeExpo" className="gate-logo-img" />
          </div>
        </div>

        {/* Status Headings */}
        <div className="gate-content-header">
          <span className="gate-eyebrow-tag">
            <span className="gate-live-dot" />
            WORKSPACE GATEWAY
          </span>
          <h2 className="gate-status-title">{statusText || "Entering Workspace..."}</h2>
          <p className="gate-status-subtitle">{getDynamicSubtitle()}</p>
        </div>

        {/* High-Precision Progress Bar */}
        <div className="gate-progress-track">
          <div
            className="gate-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Telemetry Indicator Row */}
        <div className="gate-telemetry-grid">
          <div className="gate-telemetry-chip">
            <span className="chip-label">NETWORK</span>
            <span className="chip-value live">ONLINE</span>
          </div>
          <div className="gate-telemetry-chip">
            <span className="chip-label">SYNC</span>
            <span className="chip-value">P2P CRDT</span>
          </div>
          <div className="gate-telemetry-chip">
            <span className="chip-label">SECURITY</span>
            <span className="chip-value">TLS 1.3</span>
          </div>
        </div>
      </div>
    </div>
  );
}
