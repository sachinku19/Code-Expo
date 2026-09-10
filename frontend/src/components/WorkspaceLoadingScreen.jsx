import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { RefreshCw, ArrowLeft, ShieldCheck, Cpu, Wifi, Hash } from "lucide-react";
import "./WorkspaceLoadingScreen.css";

export default function WorkspaceLoadingScreen({
  roomId = "",
  exiting = false,
  onRetry,
  onBack,
  statusMessage = "Entering Workspace..."
}) {
  const { resolvedTheme } = useTheme();
  const [progress, setProgress] = useState(15);
  const [stageIndex, setStageIndex] = useState(0);
  const [takingLonger, setTakingLonger] = useState(false);

  const stages = [
    {
      title: "Connecting to Workspace Node...",
      subtitle: roomId ? `Resolving workspace channel #${roomId.slice(-6).toUpperCase()}...` : "Resolving secure room channel...",
      targetProgress: 35
    },
    {
      title: "Mounting Collaborative Engine...",
      subtitle: "Initializing Monaco language services & AST parsing...",
      targetProgress: 68
    },
    {
      title: "Synchronizing Document State...",
      subtitle: "Establishing peer-to-peer CRDT & WebRTC mesh...",
      targetProgress: 90
    },
    {
      title: "Finalizing Workspace...",
      subtitle: "Rendering collaborative editor canvas...",
      targetProgress: 98
    }
  ];

  // Progressive simulated timer
  useEffect(() => {
    if (exiting) return;

    const stageTimer1 = setTimeout(() => {
      setStageIndex(1);
      setProgress(stages[1].targetProgress);
    }, 350);

    const stageTimer2 = setTimeout(() => {
      setStageIndex(2);
      setProgress(stages[2].targetProgress);
    }, 950);

    const stageTimer3 = setTimeout(() => {
      setStageIndex(3);
      setProgress(stages[3].targetProgress);
    }, 1800);

    const longerTimer = setTimeout(() => {
      setTakingLonger(true);
    }, 7000);

    return () => {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      clearTimeout(longerTimer);
    };
  }, [exiting]);

  const currentStage = stages[stageIndex] || stages[0];
  const activeProgress = exiting ? 100 : progress;

  return (
    <div className={`ce-workspace-loading ${exiting ? "exiting" : ""} ${resolvedTheme}`}>
      {/* Ambient background glow & subtle dot matrix */}
      <div className="workspace-loading-ambient" />
      <div className="workspace-loading-grid" />

      {/* Floating Center Card */}
      <div className={`workspace-loading-card ${exiting ? "exiting" : ""}`}>
        {/* Animated Emblem with Ambient Orbital Rings */}
        <div className="workspace-loading-logo-wrapper">
          <div className="workspace-loading-orbit-ring" />
          <div className="workspace-loading-orbit-ring-secondary" />
          <div className="workspace-loading-logo-box">
            <img src="/logo.png" alt="CodeExpo" className="workspace-loading-logo-img" />
          </div>
        </div>

        {/* Status Headings */}
        <div className="workspace-loading-header">
          <div className="workspace-loading-eyebrow">
            <span className="workspace-live-dot" />
            <span>{exiting ? "WORKSPACE CONNECTED" : "WORKSPACE INITIALIZATION"}</span>
          </div>
          <h2 className="workspace-loading-title">
            {exiting ? "Workspace Ready" : (statusMessage || currentStage.title)}
          </h2>
          <p className="workspace-loading-subtitle">
            {exiting ? "Launching collaborative canvas..." : currentStage.subtitle}
          </p>
        </div>

        {/* High-Precision Progress Bar */}
        <div className="workspace-progress-box">
          <div className="workspace-progress-track">
            <div
              className="workspace-progress-bar"
              style={{ width: `${activeProgress}%` }}
            />
          </div>
          <div className="workspace-progress-info">
            <span className="progress-status-label">
              {exiting ? "STATUS: READY" : "STATUS: INITIALIZING"}
            </span>
            <span className="progress-value">{activeProgress}%</span>
          </div>
        </div>

        {/* Telemetry Matrix Grid */}
        <div className="workspace-telemetry-grid">
          <div className="workspace-telemetry-chip">
            <span className="telemetry-label">
              <Hash size={11} className="telemetry-icon" /> ROOM
            </span>
            <span className="telemetry-value">
              {roomId ? `#${roomId.slice(-6).toUpperCase()}` : "ACTIVE"}
            </span>
          </div>

          <div className="workspace-telemetry-chip">
            <span className="telemetry-label">
              <Cpu size={11} className="telemetry-icon" /> ENGINE
            </span>
            <span className="telemetry-value">MONACO v0.48</span>
          </div>

          <div className="workspace-telemetry-chip">
            <span className="telemetry-label">
              <Wifi size={11} className="telemetry-icon" /> NETWORK
            </span>
            <span className="telemetry-value live">P2P CRDT</span>
          </div>

          <div className="workspace-telemetry-chip">
            <span className="telemetry-label">
              <ShieldCheck size={11} className="telemetry-icon" /> SECURITY
            </span>
            <span className="telemetry-value">TLS 1.3 AES</span>
          </div>
        </div>

        {/* Timeout / Slow Connection Alert */}
        {!exiting && takingLonger && (
          <div className="workspace-timeout-box">
            <p className="workspace-timeout-msg">
              Synchronization is taking longer than expected.
            </p>
            <div className="workspace-timeout-actions">
              {onRetry && (
                <button
                  type="button"
                  className="workspace-action-btn primary"
                  onClick={onRetry}
                >
                  <RefreshCw size={13} />
                  <span>Retry Connection</span>
                </button>
              )}
              {onBack && (
                <button
                  type="button"
                  className="workspace-action-btn secondary"
                  onClick={onBack}
                >
                  <ArrowLeft size={13} />
                  <span>Return to Dashboard</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
