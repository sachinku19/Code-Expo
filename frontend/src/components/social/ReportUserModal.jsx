import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Check,
  Loader2,
  Flag,
  Ban,
  EyeOff,
  FileWarning,
  HelpCircle,
  MessageSquareWarning,
  ChevronDown,
  Lock
} from "lucide-react";
import { reportUser } from "../../services/socialService";
import { getAvatarColor, getAvatarInitial } from "../../utils/avatarUtils";
import { useTheme } from "../../context/ThemeContext";
import "./ReportUserModal.css";

const REPORT_REASONS = [
  {
    id: "Harassment",
    label: "Harassment or Bullying",
    desc: "Intimidation, personal attacks, or aggressive behavior",
    icon: MessageSquareWarning
  },
  {
    id: "Spam",
    label: "Spam or Promotion",
    desc: "Unsolicited promotional links, bot behavior, or advertising",
    icon: Ban
  },
  {
    id: "Hate Speech",
    label: "Hate Speech & Toxicity",
    desc: "Discriminatory language, slurs, or targeted hostility",
    icon: ShieldAlert
  },
  {
    id: "Fraud / Scam",
    label: "Fraud, Scam or Phishing",
    desc: "Malicious code, credential harvesting, or fake identity",
    icon: AlertTriangle
  },
  {
    id: "Inappropriate Content",
    label: "Inappropriate Content",
    desc: "Explicit, offensive, or unsafe code/media",
    icon: EyeOff
  },
  {
    id: "TOS Violation",
    label: "Terms of Service Violation",
    desc: "Platform exploit, unauthorized automation, or rule breaking",
    icon: FileWarning
  },
  {
    id: "Other",
    label: "Other Community Issue",
    desc: "Other safety concerns requiring manual moderation",
    icon: HelpCircle
  }
];

export default function ReportUserModal({
  isOpen,
  onClose,
  reportedUser,
  evidenceType = "PROFILE",
  evidenceId = "",
  addToast
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isDropdownOpen]);

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setReason("");
      setDetails("");
      setIsDropdownOpen(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const themeContext = useTheme ? useTheme() : null;
  const isLight =
    themeContext?.resolvedTheme === "light" ||
    (typeof document !== "undefined" &&
      (document.documentElement.classList.contains("light") ||
        document.body.classList.contains("light") ||
        document.documentElement.getAttribute("data-theme-mode") === "light"));

  if (!isOpen || !reportedUser) return null;

  const targetUsername = reportedUser.username || "developer";
  const targetInitial = getAvatarInitial(targetUsername);
  const targetAvatarBg = getAvatarColor(targetUsername);

  const selectedCategoryObj = REPORT_REASONS.find((r) => r.id === reason);

  const getEvidenceLabel = () => {
    const t = String(evidenceType || "").toUpperCase();
    if (t === "ROOM") return "Workspace Room";
    if (t === "POST") return "Feed Post";
    if (t === "COMMENT") return "Comment";
    if (t === "PROFILE") return "User Profile";
    return `${t} Incident`;
  };

  const isDetailsValid = details.trim().length >= 10;
  const isFormReady = Boolean(reason && isDetailsValid && !isSubmitting);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      if (addToast) addToast("Please select a reason category for reporting", "error");
      return;
    }
    if (!isDetailsValid) {
      if (addToast) addToast("Please provide at least 10 characters of context for our review", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = reportedUser.id || reportedUser._id;
      const res = await reportUser(targetId, reason, details.trim(), evidenceType, evidenceId);
      if (res?.success) {
        if (addToast) addToast(res.message || "Report submitted securely to our moderation team.", "success");
        setReason("");
        setDetails("");
        onClose();
      } else {
        if (addToast) addToast(res?.message || "Failed to submit report.", "error");
      }
    } catch (error) {
      console.error("Submit report error:", error);
      const errMsg =
        error.response?.data?.message || "Failed to submit report. You may have already reported this item.";
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className={`rum-overlay ${isLight ? "light-theme light" : "dark-theme"}`} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="rum-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
          {/* 1. Header */}
          <div className="rum-header">
            <div className="rum-header-left">
              <ShieldAlert size={16} className="rum-header-icon" />
              <h3 id="report-modal-title" className="rum-header-title">Report Incident</h3>
            </div>
            <button
              type="button"
              className="rum-close-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>

          {/* 2. Target Context - Clean inline strip (no heavy box) */}
          <div className="rum-target-bar">
            {reportedUser.avatar ? (
              <img src={reportedUser.avatar} alt={targetUsername} className="rum-target-avatar" />
            ) : (
              <div
                className="rum-target-avatar-fallback"
                style={{ backgroundColor: targetAvatarBg }}
              >
                {targetInitial}
              </div>
            )}
            <div className="rum-target-meta">
              <span className="rum-target-username">@{targetUsername}</span>
              <span className="rum-target-scope">/ {getEvidenceLabel()}</span>
            </div>
          </div>

          {/* 3. Form */}
          <form onSubmit={handleSubmit} className="rum-form">
            <div className="rum-body">
              {/* Reason Field */}
              <div className="rum-field">
                <label className="rum-label">
                  Violation Category <span className="rum-req">*</span>
                </label>

                <div className="rum-dropdown-container" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`rum-dropdown-trigger ${isDropdownOpen ? "open" : ""} ${reason ? "has-value" : ""}`}
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    aria-expanded={isDropdownOpen}
                  >
                    <div className="rum-trigger-left">
                      {selectedCategoryObj ? (
                        <>
                          <selectedCategoryObj.icon size={15} className="rum-trigger-icon-active" />
                          <span className="rum-trigger-text-selected">{selectedCategoryObj.label}</span>
                        </>
                      ) : (
                        <span className="rum-trigger-text-placeholder">Select a category...</span>
                      )}
                    </div>
                    <ChevronDown size={14} className={`rum-trigger-chevron ${isDropdownOpen ? "rotated" : ""}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="rum-dropdown-menu">
                      {REPORT_REASONS.map((r) => {
                        const IconComponent = r.icon;
                        const isSelected = reason === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className={`rum-dropdown-item ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              setReason(r.id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className="rum-item-left">
                              <IconComponent size={14} className="rum-item-icon" />
                              <span className="rum-item-title">{r.label}</span>
                            </div>
                            {isSelected && <Check size={13} className="rum-item-check" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Details Field */}
              <div className="rum-field">
                <div className="rum-label-row">
                  <label className="rum-label">
                    Incident Details <span className="rum-req">*</span>
                  </label>
                  <span className="rum-char-count">{details.length} / 1000</span>
                </div>

                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Describe what occurred with as much context as possible..."
                  rows={4}
                  maxLength={1000}
                  className="rum-textarea"
                />

                <div className="rum-field-footer">
                  {details.trim().length > 0 && details.trim().length < 10 ? (
                    <span className="rum-min-warn">
                      Need at least 10 characters ({10 - details.trim().length} more)
                    </span>
                  ) : (
                    <span className="rum-min-info">Minimum 10 characters required</span>
                  )}
                </div>
              </div>

              {/* Discreet Note */}
              <div className="rum-confidential-note">
                <Lock size={12} className="rum-lock-icon" />
                <span>Reports are encrypted, confidential, and verified by platform moderators.</span>
              </div>
            </div>

            {/* 4. Footer Actions */}
            <div className="rum-footer">
              <button
                type="button"
                className="rum-btn-cancel"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rum-btn-submit"
                disabled={!isFormReady}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="rum-spinner" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Flag size={13} />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
