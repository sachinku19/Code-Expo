import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { verifyEmail } from "../services/authService";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import GlobalNetworkBackground from "../components/auth/GlobalNetworkBackground";
import "./VerifyEmail.css";

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState("Securing access grid verification...");

  useEffect(() => {
    const performVerification = async () => {
      try {
        const response = await verifyEmail(token);
        setStatus("success");
        setMessage(response.message || "Email verified successfully!");
      } catch (error) {
        setStatus("error");
        setMessage(error.response?.data?.message || "Invalid or expired verification link.");
      }
    };

    if (token) {
      performVerification();
    } else {
      setStatus("error");
      setMessage("Verification token is missing.");
    }
  }, [token]);

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
    <div className="verify-page">
      <GlobalNetworkBackground />
      <div className="verify-page-bg-grid" />

      {/* Background Neon Beams */}
      <div className="verify-page-neon beam-indigo" />
      <div className="verify-page-neon beam-cyan" />

      <div className="verify-container">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="verify-card glass-panel"
            >
              <div className="verify-icon-wrapper pulse-cyan">
                <Loader2 className="verify-icon spin text-cyan" size={40} />
              </div>
              <h2 className="verify-title">Analyzing Decryption Key</h2>
              <p className="verify-text text-dim">Please stand by while we verify your secure token on the blockchain...</p>
              <div className="progress-bar-container">
                <div className="progress-bar-loading" />
              </div>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              key="success"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="verify-card glass-panel border-success"
            >
              <div className="verify-icon-wrapper bg-success-glow">
                <CheckCircle2 className="verify-icon text-success" size={44} />
              </div>
              <h2 className="verify-title text-success-gradient">Verification Successful</h2>
              <p className="verify-text">{message}</p>
              <p className="verify-subtext text-dim">Your Node Identity is now unlocked. You are fully authorized to access the CodeExpo network.</p>
              <button onClick={() => navigate("/login")} className="verify-btn btn-success-gradient">
                <span>Access Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="verify-card glass-panel border-error"
            >
              <div className="verify-icon-wrapper bg-error-glow">
                <XCircle className="verify-icon text-error" size={44} />
              </div>
              <h2 className="verify-title text-error-gradient">Decryption Failure</h2>
              <p className="verify-text">{message}</p>
              <p className="verify-subtext text-dim">The link may have expired or already been utilized. Please trigger a new request or register a new identity profile.</p>
              <div className="verify-btn-group">
                <button onClick={() => navigate("/login")} className="verify-btn btn-secondary">
                  Back to Login
                </button>
                <button onClick={() => navigate("/register")} className="verify-btn btn-error-gradient">
                  Register Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default VerifyEmail;
