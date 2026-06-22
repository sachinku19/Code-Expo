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
            <div className={`ce-custom-modal-card ce-modal-${modal.type}`} onClick={(e) => e.stopPropagation()}>
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
            </div>
          </div>,
          document.body
        )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
