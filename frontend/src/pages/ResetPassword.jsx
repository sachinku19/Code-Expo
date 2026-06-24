import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import GlobalNetworkBackground from "../components/auth/GlobalNetworkBackground";
import Logo from "../components/shared/Logo";
import "./ResetPassword.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [status, setStatus] = useState("idle"); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState("");

  const isPasswordValid = password.length >= 6;
  const isMatching = password === confirmPassword && confirmPassword !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (!isMatching) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("Reconfiguring grid credentials...");

    try {
      const response = await resetPassword(token, { password });
      setStatus("success");
      setMessage(response.message || "Password reset successful!");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.message || "Invalid or expired reset link.");
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 25 }
    },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
  };

  return (
    <div className="reset-page">
      <GlobalNetworkBackground />
      <div className="reset-page-bg-grid" />

      {/* Background Neon Beams */}
      <div className="reset-page-neon beam-purple" />
      <div className="reset-page-neon beam-blue" />

      <div className="reset-container">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="reset-card glass-panel border-success"
            >
              <div className="reset-icon-wrapper bg-success-glow">
                <CheckCircle2 className="reset-icon text-success" size={44} />
              </div>
              <h2 className="reset-title text-success-gradient">Credentials Reconfigured</h2>
              <p className="reset-text">{message}</p>
              <p className="reset-subtext text-dim">Your login keys are updated. You can now establish connection with your new credentials.</p>
              <button onClick={() => navigate("/login")} className="reset-btn btn-success-gradient">
                <span>Proceed to Login</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="reset-card glass-panel"
            >
              <div className="reset-header">
                <div className="brand-logo-glow" onClick={() => navigate("/")}>
                  <Logo size={36} showText={true} />
                </div>
                <h2 className="reset-title">Reset Password</h2>
                <p className="reset-text text-dim">Create a secure new password for your developer terminal.</p>
              </div>

              {status === "error" && (
                <div className="error-alert-banner">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{message}</span>
                </div>
              )}

              <form className="reset-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <div className="input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-input"
                      autoComplete="new-password"
                    />
                    <Lock className="input-icon-left" size={16} />
                    <button
                      type="button"
                      className="input-icon-right-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <div className="input-focus-line" />
                  </div>

                  {password && (
                    <div className={`password-indicator-text ${isPasswordValid ? "success" : ""}`}>
                      <span>{isPasswordValid ? "✓" : "○"}</span>
                      <span>Minimum 6 characters</span>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div className="input-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="form-input"
                      autoComplete="new-password"
                    />
                    <Lock className="input-icon-left" size={16} />
                    <button
                      type="button"
                      className="input-icon-right-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <div className="input-focus-line" />
                  </div>

                  {confirmPassword && (
                    <div className={`password-indicator-text ${isMatching ? "success" : ""}`}>
                      <span>{isMatching ? "✓" : "○"}</span>
                      <span>Passwords match</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="reset-btn btn-success-gradient"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <span className="loader-text">Decrypting & Syncing...</span>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Update Credentials</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ResetPassword;
