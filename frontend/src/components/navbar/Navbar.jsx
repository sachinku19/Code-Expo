import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../shared/Logo";
import "./Navbar.css";

function Navbar({ activeSection, theme, onThemeToggle, onScrollToSection }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  const navLinks = [
    { label: "Home", id: "hero" },
    { label: "Demo", id: "demo" },
    { label: "Features", id: "features" },
    { label: "Collaboration", id: "collaboration" },
    { label: "AI Copilot", id: "ai" },
  ];

  const handleScroll = (id) => {
    setMobileMenuOpen(false);
    if (onScrollToSection) {
      onScrollToSection(id);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };
  return (
    <motion.nav
      className="navbar"
      initial={{ y: -100, x: "-50%", opacity: 0 }}
      animate={{ y: 0, x: "-50%", opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 80,
        damping: 15,
        mass: 1,
        restDelta: 0.001
      }}
    >
      <Logo size={36} showText={true} className="logo" onClick={() => handleScroll("hero")} />

      {/* Desktop Links */}
      <div className="nav-links">
        {navLinks.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleScroll(link.id);
            }}
            className={activeSection === link.id ? "active" : ""}
          >
            {link.label}
            {activeSection === link.id && (
              <motion.span
                layoutId="activeNavIndicator"
                className="nav-active-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </a>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="nav-buttons">
        <button
          className="theme-btn"
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {user ? (
          <button className="start-btn" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
            <ArrowRight size={17} />
          </button>
        ) : (
          <>
            <button className="login-btn" onClick={() => navigate("/login")}>
              Login
            </button>

            <button className="start-btn" onClick={() => navigate("/register")}>
              Get Started
              <ArrowRight size={17} />
            </button>
          </>
        )}
      </div>

      {/* Mobile Toggle */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Navigation Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-nav-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mobile-links">
              {navLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleScroll(link.id);
                  }}
                  className={activeSection === link.id ? "active" : ""}
                >
                  {link.label}
                </a>
              ))}
              <hr className="mobile-divider" />
              <button className="theme-btn mobile-theme-btn" onClick={onThemeToggle}>
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              {user ? (
                <button
                  className="start-btn w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/dashboard");
                  }}
                >
                  Go to Dashboard
                  <ArrowRight size={17} />
                </button>
              ) : (
                <>
                  <button
                    className="login-btn w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/login");
                    }}
                  >
                    Login
                  </button>
                  <button
                    className="start-btn w-full"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/register");
                    }}
                  >
                    Get Started
                    <ArrowRight size={17} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

export default Navbar;
