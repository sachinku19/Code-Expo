import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { X, Sparkles, LogIn, UserPlus, Code2 } from "lucide-react";
import "./AuthPromptModal.css";

export default function AuthPromptModal({
  isOpen,
  onClose,
  title = "Sign in to CodeExpo",
  subtitle = "Join the developer network to interact with posts, follow developers, and collaborate on code in real time.",
  actionName = ""
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentUrl = location.pathname + (location.search || "");

  const handleSignIn = () => {
    onClose();
    navigate("/login", {
      state: {
        from: currentUrl,
        intendedAction: actionName
      }
    });
  };

  const handleCreateAccount = () => {
    onClose();
    navigate("/register", {
      state: {
        from: currentUrl,
        intendedAction: actionName
      }
    });
  };

  return createPortal(
    <div className="auth-prompt-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-prompt-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="auth-prompt-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        <div className="auth-prompt-icon-wrapper">
          <div className="auth-prompt-brand-badge">
            <Code2 size={24} className="auth-prompt-logo-icon" />
          </div>
        </div>

        <div className="auth-prompt-content">
          <h3 className="auth-prompt-title">{title}</h3>
          <p className="auth-prompt-subtitle">{subtitle}</p>
        </div>

        <div className="auth-prompt-actions">
          <button
            type="button"
            className="auth-prompt-btn-primary"
            onClick={handleSignIn}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            className="auth-prompt-btn-secondary"
            onClick={handleCreateAccount}
          >
            <UserPlus size={15} />
            <span>Create Free Account</span>
          </button>
        </div>

        <div className="auth-prompt-footer">
          <button
            type="button"
            className="auth-prompt-dismiss-link"
            onClick={onClose}
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
