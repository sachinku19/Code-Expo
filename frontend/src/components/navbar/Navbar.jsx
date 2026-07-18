import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, Moon, Sparkles, Sun, X, LogOut, LayoutDashboard, User, Settings, ChevronDown, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { logoutUser } from "../../services/authService";
import Logo from "../shared/Logo";
import "./Navbar.css";

function Navbar({ activeSection, theme, onThemeToggle, onScrollToSection }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { user, setUser } = useAuth();

  const navLinks = [
    { label: "Home", id: "hero" },
    { label: "Demo", id: "demo" },
    { label: "Editor", id: "collaboration" },
    { label: "Whiteboard", id: "whiteboard" },
    { label: "Expo AI", id: "ai" },
    { label: "Social Hub", id: "social-hub" },
    { label: "Features", id: "features" },
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

  const handleLogout = async () => {
    const confirm = await window.showConfirm(
      "Are you sure you want to log out? We will miss you and your code!",
      "Please don't go!",
      "logout"
    );
    if (!confirm) return;

    window.showLoader("Logging you out securely...");
    logoutUser().catch(err => console.error("Logout error:", err));

    // Preserve local preferences, read stories, and dismissed ads cache
    const preservedKeys = [];
    const prefixesToPreserve = [
      "codeexpo_read_stories",
      "ce_dismissed_ad",
      "editor_",
      "git_",
      "whiteboard_",
      "default_language",
      "notif_approvalAlerts",
      "notif_mentionAlerts",
      "notif_soundEnabled",
      "send_message_notification",
      "codeExpoHomeTheme",
      "ceSidebarPinned",
      "ce_editor_",
      "ce_profileTab",
      "ce_settingsTab",
      "ce_roomsTab",
      "ce_activeRoomsTab",
      "ce_adminActiveTab",
      "ce_tour_seen_",
      "ce_room_tour_seen_"
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixesToPreserve.some(prefix => key.startsWith(prefix))) {
        preservedKeys.push({ key, value: localStorage.getItem(key) });
      }
    }

    localStorage.clear();

    preservedKeys.forEach(item => {
      localStorage.setItem(item.key, item.value);
    });

    window.location.href = "/login";
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
      <div className="navbar-container">
        <Logo size={34} showText={true} className="logo" onClick={() => handleScroll("hero")} />

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
          <button className="theme-btn" onClick={onThemeToggle} aria-label="Toggle Theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <div className="nav-user-dropdown-container">
              <button
                className="nav-user-trigger"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                onBlur={() => setTimeout(() => setProfileDropdownOpen(false), 200)}
              >
                <div className="nav-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <span className="avatar-initial">
                      {user.username?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <span className="nav-username">{user.username}</span>
                <ChevronDown size={14} className={`chevron-icon ${profileDropdownOpen ? "open" : ""}`} />
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <motion.div
                    className="nav-profile-dropdown"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="dropdown-user-details">
                      <span className="user-name">{user.username}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                    <div className="dropdown-divider" />
                    <button onClick={() => navigate("/dashboard")} className="dropdown-link">
                      <LayoutDashboard size={15} />
                      <span>Dashboard</span>
                    </button>
                    <button onClick={() => navigate("/dashboard?tab=profile")} className="dropdown-link">
                      <User size={15} />
                      <span>My Profile</span>
                    </button>
                    <button onClick={() => navigate("/dashboard?tab=settings")} className="dropdown-link">
                      <Settings size={15} />
                      <span>Settings</span>
                    </button>
                    <button onClick={() => navigate("/dashboard?tab=feed-action")} className="dropdown-link">
                      <ShieldAlert size={15} />
                      <span>Feed Action</span>
                    </button>
                    <div className="dropdown-divider" />
                    <button onClick={handleLogout} className="dropdown-link logout-link">
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
        <div className="mobile-nav-controls">
          <button className="theme-btn mobile-only" onClick={onThemeToggle} aria-label="Toggle Theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

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

              {user ? (
                <>
                  <div className="mobile-user-info">
                    <div className="nav-avatar">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} />
                      ) : (
                        <span className="avatar-initial">
                          {user.username?.charAt(0).toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="user-name">{user.username}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
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
                  <button
                    className="login-btn w-full"
                    style={{ marginTop: "8px" }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Logout
                  </button>
                </>
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
