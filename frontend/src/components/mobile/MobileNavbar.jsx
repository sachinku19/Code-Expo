import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  ArrowRight,
  LayoutDashboard,
  LogIn,
  UserPlus
} from "lucide-react";
import { IconGithub, IconTwitter, IconLinkedin, IconDiscord } from "./SocialIcons";
import "./MobileNavbar.css";

export default function MobileNavbar({ user, theme, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNavClick = (sectionId) => {
    setIsOpen(false);
    if (sectionId === "hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAction = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="mobile-nav-header">
        <div className="mobile-nav-container">
          {/* Left Action Group (Three line option & Theme toggle) */}
          <div className="mobile-nav-left-actions">
            <button
              className="mobile-hamburger-btn"
              onClick={() => setIsOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu className="icon-menu" size={20} />
            </button>

            <button
              className="mobile-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="icon-theme sun" size={18} />
              ) : (
                <Moon className="icon-theme moon" size={18} />
              )}
            </button>
          </div>

          {/* Logo on Right Side */}
          <div className="mobile-nav-logo right-aligned" onClick={() => handleNavClick("hero")}>
            <img src="/logo.png" alt="CodeExpo" className="mobile-nav-logo-img" />
            <span className="mobile-nav-logo-text">CodeExpo</span>
          </div>
        </div>
      </header>

      {/* Fullscreen Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="mobile-drawer-overlay">
            <motion.div
              className="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              className="mobile-drawer-content left-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
            >
              {/* Drawer Header */}
              <div className="drawer-header">
                <div className="drawer-logo" onClick={() => handleNavClick("hero")}>
                  <img src="/logo.png" alt="CodeExpo" className="mobile-nav-logo-img" />
                  <span className="mobile-nav-logo-text">CodeExpo</span>
                </div>
                <div className="drawer-header-actions">
                  <button
                    className="mobile-icon-btn"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? <Sun size={18} className="icon-theme" /> : <Moon size={18} className="icon-theme" />}
                  </button>
                  <button
                    className="mobile-close-btn"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                  >
                    <X size={20} className="icon-close" />
                  </button>
                </div>
              </div>

              {/* Drawer Links */}
              <div className="drawer-body">
                <nav className="drawer-nav">
                  <button className="drawer-nav-item" onClick={() => handleNavClick("hero")}>
                    <span>Home</span>
                    <ChevronRight className="nav-arrow" size={18} />
                  </button>
                  <button className="drawer-nav-item" onClick={() => handleNavClick("editor-section")}>
                    <span>Workspace</span>
                    <ChevronRight className="nav-arrow" size={18} />
                  </button>
                  <button className="drawer-nav-item" onClick={() => handleNavClick("features")}>
                    <span>Features</span>
                    <ChevronRight className="nav-arrow" size={18} />
                  </button>
                  <button className="drawer-nav-item" onClick={() => handleNavClick("analytics")}>
                    <span>Analytics</span>
                    <ChevronRight className="nav-arrow" size={18} />
                  </button>
                  <button className="drawer-nav-item" onClick={() => handleNavClick("pricing")}>
                    <span>Plans</span>
                    <ChevronRight className="nav-arrow" size={18} />
                  </button>
                </nav>

                {/* Primary Actions (Exact desktop labels) */}
                <div className="drawer-buttons">
                  {user ? (
                    <button className="drawer-btn primary" onClick={() => handleAction(user?.role === "admin" ? "/admin" : "/dashboard")}>
                      <LayoutDashboard size={18} />
                      <span>Go to Dashboard</span>
                    </button>
                  ) : (
                    <>
                      <button className="drawer-btn primary" onClick={() => handleAction("/register")}>
                        <span>Get Started</span>
                        <ArrowRight size={16} />
                      </button>
                      <button className="drawer-btn secondary" onClick={() => handleAction("/login")}>
                        <LogIn size={18} />
                        <span>Sign In</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Drawer Footer Socials */}
              <div className="drawer-footer">
                <div className="social-links">
                  <a href="https://github.com" target="_blank" rel="noreferrer" className="social-link">
                    <IconGithub size={18} />
                  </a>
                  <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-link">
                    <IconTwitter size={18} />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-link">
                    <IconLinkedin size={18} />
                  </a>
                  <a href="https://discord.com" target="_blank" rel="noreferrer" className="social-link">
                    <IconDiscord size={18} />
                  </a>
                </div>
                <span className="drawer-footer-note">© {new Date().getFullYear()} CodeExpo. All rights reserved.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
