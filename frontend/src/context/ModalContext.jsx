import React, { createContext, useContext, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Info, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import "./ModalContext.css";

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info", // "info" | "success" | "warning" | "error"
    isConfirm: false,
    resolve: null
  });

  useEffect(() => {
    const nativeAlert = window.alert;

    // Bind functions to window object for global availability without hooks
    window.showAlert = (message, title = "System Notification", type = "info") => {
      // Auto-detect errors to adjust title and type
      let resolvedType = type;
      let resolvedTitle = title;
      if (type === "info" && message && (message.toLowerCase().includes("fail") || message.toLowerCase().includes("error"))) {
        resolvedType = "error";
        resolvedTitle = "Operation Failed";
      }

      return new Promise((resolve) => {
        setModal({
          isOpen: true,
          title: resolvedTitle,
          message,
          type: resolvedType,
          isConfirm: false,
          resolve
        });
      });
    };

    window.showConfirm = (message, title = "Confirm Action", type = "warning") => {
      return new Promise((resolve) => {
        setModal({
          isOpen: true,
          title,
          message,
          type,
          isConfirm: true,
          resolve
        });
      });
    };

    window.alert = (message) => {
      const msgStr = typeof message === "object" ? JSON.stringify(message) : String(message);
      window.showAlert(msgStr);
    };

    return () => {
      window.alert = nativeAlert;
      delete window.showAlert;
      delete window.showConfirm;
    };
  }, []);

  const handleClose = (value) => {
    if (modal.resolve) {
      modal.resolve(value);
    }
    setModal({
      isOpen: false,
      title: "",
      message: "",
      type: "info",
      isConfirm: false,
      resolve: null
    });
  };

  const getIcon = () => {
    switch (modal.type) {
      case "success":
        return <CheckCircle2 size={20} />;
      case "warning":
        return <AlertTriangle size={20} />;
      case "error":
        return <AlertCircle size={20} />;
      case "info":
      default:
        return <Info size={20} />;
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert: window.showAlert, showConfirm: window.showConfirm }}>
      {children}
      {modal.isOpen &&
        createPortal(
          <div className="ce-custom-modal-overlay" onClick={() => !modal.isConfirm && handleClose(false)}>
            <div className={`ce-custom-modal-card ce-modal-${modal.type} ${modal.type === "logout" ? "ce-logout-modal-card" : ""}`} onClick={(e) => e.stopPropagation()}>
              {modal.type === "logout" ? (
                <div className="ce-logout-modal-content">
                  <div className="ce-logout-animation-container">
                    <svg viewBox="0 0 240 160" className="ce-logout-svg" width="240" height="160">
                      <defs>
                        <linearGradient id="screen-glow-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect x="40" y="110" width="160" height="12" rx="4" fill="#3b4252" />
                      <rect x="50" y="40" width="140" height="75" rx="4" fill="#2e3440" stroke="#4c566a" strokeWidth="3" />
                      <line x1="30" y1="120" x2="210" y2="120" stroke="#4c566a" strokeWidth="4" strokeLinecap="round" />
                      <rect x="53" y="43" width="134" height="69" fill="#111827" rx="2" />
                      <polygon points="120,43 53,112 187,112" fill="url(#screen-glow-grad)" />
                      <g className="character-group">
                        <path d="M70,120 Q80,60 120,60 C135,60 145,75 145,95 Q145,105 130,110 Q110,115 70,120 Z" fill="#2563eb" />
                        <path d="M120,60 Q130,100 135,115" stroke="#1d4ed8" strokeWidth="8" strokeLinecap="round" fill="none" />
                        <circle cx="132" cy="72" r="14" fill="#eab308" className="head-bob" />
                        <path d="M123,71 Q126,67 128,70" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <path d="M132,71 Q135,67 137,70" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <path d="M128,78 Q131,82 133,78" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
                        <circle cx="125" cy="74" r="2.5" fill="#60a5fa" className="tear-drop tear-left" />
                        <circle cx="135" cy="74" r="2.5" fill="#60a5fa" className="tear-drop tear-right" />
                      </g>
                    </svg>
                  </div>
                  <h3 className="ce-modal-title ce-logout-title">{modal.title}</h3>
                  <div className="ce-modal-body ce-logout-body">{modal.message}</div>
                  <div className="ce-modal-actions ce-logout-actions">
                    <button className="ce-modal-btn ce-modal-btn-cancel ce-logout-btn-stay" onClick={() => handleClose(false)}>
                      No, Stay Here!
                    </button>
                    <button className="ce-modal-btn ce-modal-btn-primary ce-logout-btn-leave" onClick={() => handleClose(true)}>
                      Yes, Log Out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="ce-modal-header">
                    <span className="ce-modal-icon-wrapper">{getIcon()}</span>
                    <h3 className="ce-modal-title">{modal.title}</h3>
                  </div>
                  <div className="ce-modal-body">{modal.message}</div>
                  <div className="ce-modal-actions">
                    {modal.isConfirm && (
                      <button className="ce-modal-btn ce-modal-btn-cancel" onClick={() => handleClose(false)}>
                        Cancel
                      </button>
                    )}
                    <button className="ce-modal-btn ce-modal-btn-primary" onClick={() => handleClose(true)}>
                      {modal.isConfirm ? "Confirm" : "OK"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
