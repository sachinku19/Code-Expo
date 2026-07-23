import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./MobileFooter.css";

export default function MobileFooter() {
  const [openSections, setOpenSections] = useState({});
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const navigate = useNavigate();

  const toggleAccordion = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="mobile-footer-section">
      <div className="mobile-footer-watermark">CODEEXPO</div>

      <div className="mobile-footer-container">
        {/* Logo & Branding (Exact desktop branding) */}
        <div className="footer-brand">
          <div className="footer-logo" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CodeExpo" className="footer-logo-img" />
            <span className="footer-logo-text">CodeExpo</span>
          </div>
          <p className="footer-brand-desc">
            The ultimate workspace for collaborative coding, real-time shared whiteboards, and developer feeds.
          </p>
          <div className="footer-contact-info">
            <a href="mailto:support@codeexpo.com" className="footer-contact-email">support@codeexpo.com</a>
            <span className="footer-contact-city">Bengaluru, India</span>
          </div>
          <div className="footer-status-pill">
            <span className="status-dot-pulse" />
            <span>All systems operational</span>
          </div>
        </div>

        {/* Accordion Links (Exact desktop links) */}
        <div className="footer-accordions">
          {/* Section 1: Product */}
          <div className="footer-accordion-item">
            <button
              className="accordion-header-btn"
              onClick={() => toggleAccordion("product")}
            >
              <span>Product</span>
              {openSections.product ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {openSections.product && (
                <motion.div
                  className="accordion-content-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <a href="#features">Features</a>
                  <a href="#editor-section">Sandbox Editor</a>
                  <a href="#features">AI Coding</a>
                  <a href="#pricing">Premium Plans</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: Resources */}
          <div className="footer-accordion-item">
            <button
              className="accordion-header-btn"
              onClick={() => toggleAccordion("resources")}
            >
              <span>Resources</span>
              {openSections.resources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {openSections.resources && (
                <motion.div
                  className="accordion-content-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <a href="#">API Reference</a>
                  <a href="#">Documentation</a>
                  <a href="#">SLA Status</a>
                  <a href="#">Open Source</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 3: Legal */}
          <div className="footer-accordion-item">
            <button
              className="accordion-header-btn"
              onClick={() => toggleAccordion("legal")}
            >
              <span>Legal</span>
              {openSections.legal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <AnimatePresence>
              {openSections.legal && (
                <motion.div
                  className="accordion-content-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Service</a>
                  <a href="#">GDPR Compliance</a>
                  <a href="#">Cookie Settings</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Newsletter Box (Exact desktop newsletter text) */}
        <div className="footer-newsletter-card">
          <span className="newsletter-title">Stay Updated</span>
          <p className="newsletter-desc">
            Subscribe to get notified about scaling updates, API releases, and product news.
          </p>

          {subscribed ? (
            <div className="newsletter-success">
              ✓ Thanks for subscribing!
            </div>
          ) : (
            <form className="newsletter-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="enter your email..."
                className="newsletter-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="newsletter-submit-btn" aria-label="Subscribe">
                <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom-bar">
          <span>© {new Date().getFullYear()} CodeExpo. All rights reserved.</span>
          <div className="footer-social-inline">
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://discord.com" target="_blank" rel="noreferrer">Discord</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer">X / Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
