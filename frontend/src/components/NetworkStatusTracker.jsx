import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, X } from "lucide-react";

const NetworkStatusTracker = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState(null); // 'online' | 'offline'

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setBannerType("online");
      setShowBanner(true);
      // Automatically hide the "Back Online" message after 3.5 seconds
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setBannerType("offline");
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check: if already offline on load, show offline banner immediately
    if (!navigator.onLine) {
      setIsOnline(false);
      setBannerType("offline");
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  const isOfflineMode = bannerType === "offline";

  return (
    <div className={`ce-network-status-banner ${isOfflineMode ? "offline" : "online"}`}>
      <style>{`
        .ce-network-status-banner {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999999;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-radius: 12px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          animation: ceBannerSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transition: all 0.3s ease;
        }

        .ce-network-status-banner.offline {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
        }

        .ce-network-status-banner.online {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }

        .ce-network-status-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .ce-network-status-pulse {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: cePulseAnimation 1.8s infinite ease-in-out;
        }

        .offline .ce-network-status-pulse {
          background: #ef4444;
        }

        .online .ce-network-status-pulse {
          background: #10b981;
        }

        .ce-network-close-btn {
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 2px;
          opacity: 0.7;
          display: flex;
          align-items: center;
          transition: opacity 0.2s ease;
        }

        .ce-network-close-btn:hover {
          opacity: 1;
        }

        @keyframes ceBannerSlideIn {
          0% {
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes cePulseAnimation {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.8);
            opacity: 0;
          }
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }
      `}</style>

      <div className="ce-network-status-icon-container">
        {isOfflineMode ? <WifiOff size={16} /> : <Wifi size={16} />}
      </div>

      <span>
        {isOfflineMode
          ? "Connection Lost. Please check your internet connection."
          : "Connection Restored! You are back online."}
      </span>

      <button
        type="button"
        className="ce-network-close-btn"
        onClick={() => setShowBanner(false)}
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default NetworkStatusTracker;
