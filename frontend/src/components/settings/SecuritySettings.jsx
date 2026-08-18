import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Info,
  KeyRound,
  FileText,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  changePassword,
  getRecoveryKeyStatus,
  generateRecoveryKey
} from "../../services/authService";
import "./SecuritySettings.css";

export default function SecuritySettings({ user, addToast }) {
  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Recovery Key State
  const [recoveryStatus, setRecoveryStatus] = useState({
    isLoading: true,
    hasRecoveryKey: false,
    status: "unconfigured",
    createdAt: null,
    lastRegeneratedAt: null
  });

  // Modals
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [activeGeneratedKey, setActiveGeneratedKey] = useState(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Load recovery status on mount
  const fetchRecoveryStatus = async () => {
    try {
      setRecoveryStatus((prev) => ({ ...prev, isLoading: true }));
      const data = await getRecoveryKeyStatus();
      if (data.success) {
        setRecoveryStatus({
          isLoading: false,
          hasRecoveryKey: data.hasRecoveryKey,
          status: data.status,
          createdAt: data.createdAt,
          lastRegeneratedAt: data.lastRegeneratedAt
        });
      } else {
        setRecoveryStatus((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (err) {
      console.error("Failed to load recovery key status:", err);
      setRecoveryStatus((prev) => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchRecoveryStatus();
  }, []);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) {
      return { score: 0, label: "None", color: "transparent", percent: 0, criteria: { length: false, upper: false, lower: false, number: false, special: false } };
    }

    const criteria = {
      length: newPassword.length >= 6,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword)
    };

    let score = 0;
    if (criteria.length) score++;
    if (criteria.upper && criteria.lower) score++;
    if (criteria.number) score++;
    if (criteria.special) score++;

    let label = "Weak";
    let color = "#ef4444";
    let percent = 25;

    if (score === 2) {
      label = "Medium";
      color = "#f59e0b";
      percent = 50;
    } else if (score === 3) {
      label = "Strong";
      color = "#10b981";
      percent = 75;
    } else if (score >= 4) {
      label = "Very Strong";
      color = "#7c3aed";
      percent = 100;
    }

    return { score, label, color, percent, criteria };
  }, [newPassword]);

  // Handle password update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      if (addToast) addToast("Please fill in both password fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      if (addToast) addToast("New password must be at least 6 characters", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      if (res.success) {
        if (addToast) addToast("Password changed successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        if (addToast) addToast(res.message || "Failed to update password", "error");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update password";
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle key generation
  const handlePerformKeyGeneration = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await generateRecoveryKey();
      if (res.success && res.recoveryKey) {
        setActiveGeneratedKey(res.recoveryKey);
        setRecoveryStatus({
          isLoading: false,
          hasRecoveryKey: true,
          status: "active",
          createdAt: res.createdAt,
          lastRegeneratedAt: res.lastRegeneratedAt
        });
        if (addToast) addToast("New recovery key generated securely", "success");
      } else {
        if (addToast) addToast(res.message || "Failed to generate recovery key", "error");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to generate recovery key";
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsGeneratingKey(false);
      setShowRegenerateModal(false);
    }
  };

  // Copy Key to Clipboard
  const handleCopyKey = () => {
    if (!activeGeneratedKey) return;
    navigator.clipboard.writeText(activeGeneratedKey);
    setHasCopied(true);
    if (addToast) addToast("Recovery key copied to clipboard", "success");
    setTimeout(() => setHasCopied(false), 2500);
  };

  // Download key as TXT file
  const handleDownloadKey = () => {
    if (!activeGeneratedKey) return;
    const timestamp = new Date().toISOString();
    const content = `=====================================================
CODE-EXPO OFFLINE ACCOUNT RECOVERY KEY
=====================================================

Account: ${user?.email || user?.username || "CodeExpo Developer"}
Generated: ${timestamp}

RECOVERY KEY:
${activeGeneratedKey}

INSTRUCTIONS:
1. Store this recovery key in an offline vault, password manager, or secure physical location.
2. If you lose access to your password, select "Use Recovery Key" on the CodeExpo login screen.
3. CodeExpo stores only a cryptographic hash of this key and cannot recover the plaintext for you.
4. If you suspect this key has been exposed, immediately regenerate it in Security Settings.

=====================================================
CodeExpo Security Systems • Zero-Knowledge Offline Recovery
=====================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codeexpo-recovery-key-${user?.username || "credential"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (addToast) addToast("Recovery key downloaded", "success");
  };

  const handleCloseActiveKeyModal = () => {
    setActiveGeneratedKey(null);
    setShowGenerateModal(false);
    setShowRegenerateModal(false);
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return "Aug 18, 2026";
    const d = new Date(dateVal);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="security-console-wrapper">
      {/* SECTION 1: CHANGE PASSWORD */}
      <section className="security-card primary-card">
        <div className="security-card-header">
          <div className="security-header-left">
            <div className="security-icon-badge">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="security-card-title">Change Password</h3>
              <p className="security-card-desc">
                Update your account password. Ensure you use a strong, unique password.
              </p>
            </div>
          </div>
        </div>

        <form className="security-form" onSubmit={handlePasswordSubmit}>
          <div className="security-input-grid">
            <div className="security-field">
              <label className="security-label">Current Password</label>
              <div className="security-input-wrapper">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="security-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="security-toggle-eye"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="security-field">
              <label className="security-label">New Password</label>
              <div className="security-input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter a strong new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="security-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="security-toggle-eye"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength Meter */}
          {newPassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="password-strength-panel"
            >
              <div className="strength-bar-meta">
                <span className="strength-caption">Password Strength:</span>
                <span className="strength-status" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="strength-track">
                <div
                  className="strength-fill"
                  style={{
                    width: `${passwordStrength.percent}%`,
                    backgroundColor: passwordStrength.color
                  }}
                />
              </div>

              {/* Validation Feedback Criteria */}
              <div className="strength-criteria-pills">
                <span className={`criteria-pill ${passwordStrength.criteria.length ? "met" : ""}`}>
                  {passwordStrength.criteria.length ? "✓" : "○"} 6+ Chars
                </span>
                <span className={`criteria-pill ${passwordStrength.criteria.upper && passwordStrength.criteria.lower ? "met" : ""}`}>
                  {passwordStrength.criteria.upper && passwordStrength.criteria.lower ? "✓" : "○"} Case Mix
                </span>
                <span className={`criteria-pill ${passwordStrength.criteria.number ? "met" : ""}`}>
                  {passwordStrength.criteria.number ? "✓" : "○"} Number
                </span>
                <span className={`criteria-pill ${passwordStrength.criteria.special ? "met" : ""}`}>
                  {passwordStrength.criteria.special ? "✓" : "○"} Symbol
                </span>
              </div>
            </motion.div>
          )}

          <div className="security-form-actions">
            <button
              type="submit"
              className="security-btn primary"
              disabled={isUpdatingPassword || !currentPassword || !newPassword}
            >
              {isUpdatingPassword ? (
                <>
                  <RefreshCw size={14} className="spin-icon" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Change Password</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: ACCOUNT RECOVERY */}
      <section className="security-card recovery-card">
        <div className="security-card-header">
          <div className="security-header-left">
            <div className="security-icon-badge key-badge">
              <KeyRound size={18} />
            </div>
            <div>
              <div className="security-title-badge-row">
                <h3 className="security-card-title">Recovery Key</h3>
                <span className="security-badge-offline">
                  <span className="badge-pulse-dot" />
                  Offline Recovery • User Controlled
                </span>
              </div>
              <p className="security-card-desc">
                Create a secure recovery key that can be used to regain access to your CodeExpo account if you forget your password.
              </p>
            </div>
          </div>
        </div>

        <p className="recovery-notice-text">
          Your recovery key is independent of email recovery. Keep it somewhere private and secure.
        </p>

        {/* Dynamic Recovery State Card */}
        {recoveryStatus.isLoading ? (
          <div className="recovery-loading-box">
            <RefreshCw size={18} className="spin-icon" />
            <span>Checking security configuration...</span>
          </div>
        ) : !recoveryStatus.hasRecoveryKey ? (
          /* UNCONFIGURED STATE */
          <div className="recovery-state-box unconfigured">
            <div className="state-box-meta">
              <div className="state-status-row">
                <div className="state-dot unconfigured" />
                <h4 className="state-heading">No recovery key configured</h4>
              </div>
              <p className="state-explanation">
                Generate a recovery key to protect your account if you lose access to your password.
              </p>
            </div>

            <div className="state-actions-wrapper">
              <button
                type="button"
                className="security-btn primary"
                onClick={() => setShowGenerateModal(true)}
              >
                <Key size={14} />
                <span>Generate Recovery Key</span>
              </button>
              <span className="state-security-note">
                Your recovery key is shown only once. CodeExpo never stores the original key.
              </span>
            </div>
          </div>
        ) : (
          /* ACTIVE STATE */
          <div className="recovery-state-box active">
            <div className="state-box-meta">
              <div className="state-status-row">
                <div className="state-indicator-badge success">
                  <ShieldCheck size={14} />
                  <span>Recovery Key Active</span>
                </div>
              </div>
              <p className="state-explanation active-text">
                Your recovery key is currently active.
              </p>

              {/* Metadata Grid */}
              <div className="recovery-metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">Created:</span>
                  <span className="metadata-value">{formatDate(recoveryStatus.createdAt)}</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Status:</span>
                  <span className="metadata-value status-active">Active</span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Last regenerated:</span>
                  <span className="metadata-value">{formatDate(recoveryStatus.lastRegeneratedAt || recoveryStatus.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="state-actions-wrapper active-actions">
              <button
                type="button"
                className="security-btn outline-regenerate"
                onClick={() => setShowRegenerateModal(true)}
              >
                <RefreshCw size={14} />
                <span>Regenerate Recovery Key</span>
              </button>
              <p className="state-danger-warning">
                Only generate a new key if you believe your current recovery key may have been exposed. Regenerating immediately invalidates the previous key.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: SECURITY ARCHITECTURE MESSAGING */}
      <section className="security-card architecture-card">
        <div className="architecture-header">
          <Shield size={16} className="architecture-shield-icon" />
          <h4 className="architecture-title">Security Design</h4>
        </div>
        <div className="architecture-grid">
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Recovery keys are unique to each account</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Only one recovery key can be active at a time</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Regenerating a key immediately invalidates the previous key</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Recovery keys are stored as cryptographic hashes, never plaintext</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Recovery attempts are rate-limited</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Failed recovery attempts are monitored</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>The original recovery key cannot be retrieved after generation</span>
          </div>
          <div className="architecture-item">
            <Check size={14} className="architecture-check" />
            <span>Password reset sessions use short-lived authorization tokens</span>
          </div>
        </div>
      </section>

      {/* MODAL 1: GENERATE / SHOW SECURE KEY MODAL */}
      <AnimatePresence>
        {(showGenerateModal || activeGeneratedKey) && (
          <div className="security-modal-overlay">
            <motion.div
              className="security-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              {!activeGeneratedKey ? (
                /* CONFIRMATION BEFORE GENERATION */
                <div className="modal-content-stage">
                  <div className="modal-header-row">
                    <div className="modal-title-with-icon">
                      <div className="modal-icon-glow warning">
                        <KeyRound size={20} />
                      </div>
                      <h3 className="modal-headline">Generate Recovery Key</h3>
                    </div>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={() => setShowGenerateModal(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="modal-body-section">
                    <p className="modal-warning-text">
                      Generating a new recovery key will immediately invalidate your existing recovery key.
                    </p>
                    <div className="modal-highlight-box">
                      <AlertTriangle size={16} className="highlight-icon" />
                      <span>This action cannot be undone.</span>
                    </div>
                  </div>

                  <div className="modal-actions-row">
                    <button
                      type="button"
                      className="security-btn cancel"
                      onClick={() => setShowGenerateModal(false)}
                      disabled={isGeneratingKey}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="security-btn primary"
                      onClick={handlePerformKeyGeneration}
                      disabled={isGeneratingKey}
                    >
                      {isGeneratingKey ? (
                        <>
                          <RefreshCw size={14} className="spin-icon" />
                          <span>Generating Secure Key...</span>
                        </>
                      ) : (
                        <span>Generate Secure Key</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* HIGH-SECURITY DISPLAY PRESENTATION */
                <div className="modal-content-stage">
                  <div className="modal-header-row">
                    <div className="modal-title-with-icon">
                      <div className="modal-icon-glow success">
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="modal-headline">Your Recovery Key</h3>
                    </div>
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={handleCloseActiveKeyModal}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="modal-body-section">
                    <div className="secure-key-display-box">
                      <span className="secure-key-text">{activeGeneratedKey}</span>
                    </div>

                    <div className="modal-important-notice">
                      <strong className="important-title">Important</strong>
                      <p className="important-desc">
                        Save this key in a secure password manager or offline location. For your protection, this key will not be displayed again.
                      </p>
                    </div>
                  </div>

                  <div className="modal-actions-row key-display-actions">
                    <button
                      type="button"
                      className={`security-btn ${hasCopied ? "btn-copied" : "outline"}`}
                      onClick={handleCopyKey}
                    >
                      {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{hasCopied ? "Copied!" : "Copy Key"}</span>
                    </button>

                    <button
                      type="button"
                      className="security-btn outline"
                      onClick={handleDownloadKey}
                    >
                      <Download size={14} />
                      <span>Download / Save</span>
                    </button>

                    <button
                      type="button"
                      className="security-btn primary"
                      onClick={handleCloseActiveKeyModal}
                    >
                      <span>I've Saved It</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: REGENERATE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showRegenerateModal && (
          <div className="security-modal-overlay">
            <motion.div
              className="security-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-content-stage">
                <div className="modal-header-row">
                  <div className="modal-title-with-icon">
                    <div className="modal-icon-glow warning">
                      <RefreshCw size={20} />
                    </div>
                    <h3 className="modal-headline">Replace Recovery Key?</h3>
                  </div>
                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={() => setShowRegenerateModal(false)}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body-section">
                  <p className="modal-warning-text">
                    A new recovery key will be generated and your current recovery key will stop working immediately.
                  </p>
                  <div className="modal-highlight-box danger">
                    <AlertTriangle size={16} className="highlight-icon" />
                    <span>Anyone who has your previous recovery key will no longer be able to use it for account recovery.</span>
                  </div>
                </div>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="security-btn cancel"
                    onClick={() => setShowRegenerateModal(false)}
                    disabled={isGeneratingKey}
                  >
                    Keep Current Key
                  </button>
                  <button
                    type="button"
                    className="security-btn primary"
                    onClick={handlePerformKeyGeneration}
                    disabled={isGeneratingKey}
                  >
                    {isGeneratingKey ? (
                      <>
                        <RefreshCw size={14} className="spin-icon" />
                        <span>Generating New Key...</span>
                      </>
                    ) : (
                      <span>Generate New Key</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
