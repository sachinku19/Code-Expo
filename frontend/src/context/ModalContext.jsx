import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Info, AlertTriangle, CheckCircle2, AlertCircle, DoorOpen, LogOut } from "lucide-react";
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

  const [loader, setLoader] = useState({
    isOpen: false,
    message: ""
  });

  const [avatarPreview, setAvatarPreview] = useState({
    isOpen: false,
    url: "",
    username: ""
  });

  const navigate = useNavigate();

  useEffect(() => {
    const nativeAlert = window.alert;

    // Bind functions to window object for global availability without hooks
    window.showAvatarPreview = (url, username = "User") => {
      setAvatarPreview({
        isOpen: true,
        url,
        username
      });
    };



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

    window.showLoader = (message = "Processing...") => {
      setLoader({
        isOpen: true,
        message
      });
    };

    window.hideLoader = () => {
      setLoader({
        isOpen: false,
        message: ""
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
      delete window.showLoader;
      delete window.hideLoader;
      delete window.showAvatarPreview;
    };
  }, []);



  // Escape key close listener for Avatar Preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCloseAvatarPreview();
      }
    };
    if (avatarPreview.isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [avatarPreview.isOpen]);

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

  const handleCloseAvatarPreview = () => {
    setAvatarPreview({
      isOpen: false,
      url: "",
      username: ""
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
            <div className={`ce-custom-modal-card ce-modal-${modal.type} ${["logout", "exit-workspace"].includes(modal.type) ? "ce-logout-modal-card" : ""}`} onClick={(e) => e.stopPropagation()}>
              {["logout", "exit-workspace"].includes(modal.type) ? (
                <div className="ce-exit-modal-content">
                  <div className="ce-exit-modal-icon-badge">
                    {modal.type === "exit-workspace" ? (
                      <DoorOpen size={24} className="ce-exit-modal-icon" />
                    ) : (
                      <LogOut size={24} className="ce-exit-modal-icon" />
                    )}
                  </div>
                  <h3 className="ce-modal-title ce-exit-modal-title">
                    {modal.title || (modal.type === "exit-workspace" ? "Exit Workspace" : "Log Out")}
                  </h3>
                  <div className="ce-modal-body ce-exit-modal-body">{modal.message}</div>
                  <div className="ce-modal-actions ce-exit-modal-actions">
                    <button
                      type="button"
                      className="ce-modal-btn ce-modal-btn-cancel ce-exit-btn-cancel"
                      onClick={() => handleClose(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ce-modal-btn ce-modal-btn-primary ce-exit-btn-confirm"
                      onClick={() => handleClose(true)}
                    >
                      {modal.type === "exit-workspace" ? "Exit Workspace" : "Log Out"}
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
      {loader.isOpen &&
        createPortal(
          <div className="ce-global-loader-overlay">
            <div className="ce-global-loader-card">
              <div className="ce-roller-spinner">
                <div></div><div></div><div></div><div></div>
                <div></div><div></div><div></div><div></div>
              </div>
              <span className="ce-global-loader-text">{loader.message}</span>
            </div>
          </div>,
          document.body
        )}
      {avatarPreview.isOpen &&
        createPortal(
          <div className="ce-avatar-preview-overlay" onClick={handleCloseAvatarPreview}>
            <div className="ce-avatar-preview-container" onClick={(e) => e.stopPropagation()}>
              <button className="ce-avatar-preview-close" onClick={handleCloseAvatarPreview} aria-label="Close Preview">
                &times;
              </button>
              <div className="ce-avatar-preview-img-card">
                {avatarPreview.url ? (
                  <img src={avatarPreview.url} alt={avatarPreview.username} className="ce-avatar-preview-img" />
                ) : (
                  <div className="ce-avatar-preview-fallback">
                    {avatarPreview.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="ce-avatar-preview-info">
                <span className="ce-avatar-preview-username">@{avatarPreview.username}</span>
                <span className="ce-avatar-preview-subtitle">Profile Photo</span>
              </div>
            </div>
          </div>,
          document.body
        )}

    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
