import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import { reportUser } from "../../services/socialService";

export default function ReportUserModal({
  isOpen,
  onClose,
  reportedUser,
  evidenceType,
  evidenceId = "",
  addToast
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      if (addToast) addToast("Please select a reason for reporting", "error");
      return;
    }
    if (details.trim().length < 10) {
      if (addToast) addToast("Please provide at least 10 characters of detail for review", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = reportedUser.id || reportedUser._id;
      const res = await reportUser(targetId, reason, details, evidenceType, evidenceId);
      if (res.success) {
        if (addToast) addToast(res.message || "Report submitted successfully.", "success");
        // Reset and close
        setReason("");
        setDetails("");
        onClose();
      } else {
        if (addToast) addToast(res.message || "Failed to submit report.", "error");
      }
    } catch (error) {
      console.error("Submit report error:", error);
      const errMsg = error.response?.data?.message || "Failed to submit report. You may have reported this already.";
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && reportedUser && (
        <div 
          className="ce-modal-overlay" 
          onClick={onClose} 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: "rgba(0,0,0,0.65)", 
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 999999 
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="ce-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "520px",
              width: "90%",
              padding: "24px",
              background: "var(--ce-premium-card, #111827)",
              border: "1px solid var(--ce-premium-border, #1f2937)",
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldAlert size={20} style={{ color: "#ef4444" }} />
                <h3 style={{ margin: 0, color: "var(--ce-premium-text, #fff)", fontSize: "1.2rem", fontWeight: "600" }}>Report User</h3>
              </div>
              <button
                onClick={onClose}
                style={{ background: "none", border: "none", color: "var(--ce-premium-muted, #9ca3af)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: "var(--ce-premium-muted, #9ca3af)", fontSize: "0.85rem", marginBottom: "18px" }}>
              You are reporting <strong style={{ color: "#ef4444" }}>@{reportedUser.username}</strong> for violation of our community standards. Please select the most appropriate category and details.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Reason Select */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "var(--ce-premium-text, #fff)", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px" }}>
                  Reason Category <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--ce-premium-border, #1f2937)",
                    background: "var(--ce-premium-bg, rgba(0,0,0,0.25))",
                    color: "var(--ce-premium-text, #fff)",
                    outline: "none",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="" disabled style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Select a reason...</option>
                  <option value="Spam" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Spam or Advertising</option>
                  <option value="Harassment" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Harassment or Bullying</option>
                  <option value="Hate Speech" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Hate Speech or Discrimination</option>
                  <option value="Fraud / Scam" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Fraud, Scam, or Imitation</option>
                  <option value="Inappropriate Content" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Inappropriate or Nudity</option>
                  <option value="TOS Violation" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Terms of Service Violation</option>
                  <option value="Other" style={{ background: "var(--ce-premium-card, #111827)", color: "var(--ce-premium-text, #fff)" }}>Other Violation</option>
                </select>
              </div>

              {/* Description Details */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "var(--ce-premium-text, #fff)", fontSize: "0.82rem", fontWeight: "600", marginBottom: "6px" }}>
                  Explain the details <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Explain the context and specify the violation..."
                  rows={4}
                  required
                  maxLength={1000}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid var(--ce-premium-border, #1f2937)",
                    background: "var(--ce-premium-bg, rgba(0,0,0,0.25))",
                    color: "var(--ce-premium-text, #fff)",
                    outline: "none",
                    fontSize: "0.85rem",
                    resize: "none"
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.75rem", color: "var(--ce-premium-muted, #9ca3af)" }}>
                  <span>Minimum 10 characters</span>
                  <span>{details.length}/1000</span>
                </div>
              </div>

              {/* Fraud warning box */}
              <div 
                style={{ 
                  display: "flex", 
                  gap: "10px", 
                  background: "rgba(239, 68, 68, 0.08)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)", 
                  padding: "12px", 
                  borderRadius: "8px", 
                  marginBottom: "20px" 
                }}
              >
                <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
                <p style={{ margin: 0, fontSize: "0.76rem", color: "#ef4444", lineHeight: "1.3" }}>
                  <strong>Anti-Fraud Warning:</strong> False or malicious reports are strictly prohibited. Abuse of the reporting system may trigger warning strikes or restriction of your account.
                </p>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--ce-premium-border, #1f2937)",
                    background: "none",
                    color: "var(--ce-premium-text, #fff)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    opacity: isSubmitting ? 0.5 : 1
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
