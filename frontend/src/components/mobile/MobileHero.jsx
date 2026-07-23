import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Compass } from "lucide-react";
import "./MobileHero.css";

export default function MobileHero({ user, totalUser }) {
  const navigate = useNavigate();

  const handlePrimaryClick = () => {
    if (user) {
      navigate(user?.role === "admin" ? "/admin" : "/dashboard");
    } else {
      navigate("/register");
    }
  };

  const handleSecondaryClick = () => {
    const el = document.getElementById("editor-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="mobile-hero-section" id="hero">
      <div className="mobile-hero-container">
        {/* Status Badge (Exact desktop text) */}
        <motion.div
          className="mobile-hero-badge"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="badge-pulse-dot" />
          <span className="badge-text">
            {totalUser > 0 ? `${totalUser} developers online coding right now` : "Developers hub online"}
          </span>
        </motion.div>

        {/* Hero Title (Exact desktop title) */}
        <motion.h1
          className="mobile-hero-title"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Where developers collaborate, code, and share in real time.
        </motion.h1>

        {/* Hero Subtitle (Exact desktop subtitle) */}
        <motion.p
          className="mobile-hero-subtitle"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          A professional multiplayer editor with integrated audio/video rooms, shared whiteboards, AI pair programming, and developer profiles.
        </motion.p>

        {/* Hero CTAs (Exact desktop labels) */}
        <motion.div
          className="mobile-hero-actions"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <button className="mobile-hero-btn primary" onClick={handlePrimaryClick}>
            <span>{user ? "Go to Dashboard" : "Create Workspace"}</span>
            <ArrowRight size={16} />
          </button>

          <button className="mobile-hero-btn secondary" onClick={handleSecondaryClick}>
            <span>Explore Live Workspace</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
