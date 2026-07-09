import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, registerUser, googleLoginUser, getGoogleConfig, forgotPassword } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useGateTransition } from "../routes/AppRoutes";
import { ArrowLeft, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./Auth.css";

function Auth({ mode }) {
  const { setUser } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { triggerGateTransition } = useGateTransition();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeMode, setActiveMode] = useState(mode);
  const [localSuccessMessage, setLocalSuccessMessage] = useState(null);

  // Sync mode if changed externally (e.g. initial route load)
  useEffect(() => {
    setActiveMode(mode);
    setLocalSuccessMessage(null);
  }, [mode]);

  const completeAuthRedirect = () => {
    const from = location.state?.from?.pathname
      ? location.state.from.pathname + location.state.from.search
      : "/dashboard";
    navigate(from, { replace: true });
  };

  // Animation state tracking
  const [prevMode, setPrevMode] = useState(activeMode);
  const [direction, setDirection] = useState(1);

  if (activeMode !== prevMode) {
    setDirection(activeMode === "register" ? 1 : -1);
    setPrevMode(activeMode);
  }

  const handleSwitchMode = (newMode) => {
    setDirection(newMode === "register" ? 1 : -1);
    setActiveMode(newMode);
    setLocalSuccessMessage(null);
    setGoogleError(null);
    setLoginError(null);
    setRegisterError(null);
    window.history.pushState(null, "", `/${newMode}`);
  };

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // State for Login Form
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // State for Register Form
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [registerError, setRegisterError] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // State for Forgot Password Form
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);

  // Shared Google Client state
  const [googleClient, setGoogleClient] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState(null);

  // Background Interactive Mouse Coordinates
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    // Clear errors and states when toggling mode
    setLoginError(null);
    setRegisterError(null);
    setGoogleError(null);
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setIsForgotPassword(false);
    setForgotEmail("");
    setForgotError(null);
    setForgotSuccess(null);
    setAgreeTerms(false);
  }, [activeMode]);

  useEffect(() => {
    if (location.state?.successMessage) {
      const timer = setTimeout(() => {
        navigate(location.pathname, { replace: true, state: { ...location.state, successMessage: undefined } });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const initGoogleOAuth = async () => {
      if (window.google) {
        let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_LOGIN_URI;
        if (!clientId) {
          try {
            const config = await getGoogleConfig();
            clientId = config.googleClientId;
          } catch (err) {
            console.error("Failed to load Google client ID from backend:", err);
          }
        }
        if (!clientId) {
          clientId = "337775949576-96q1o762t1q7q3b2u36p22e707e7bca5.apps.googleusercontent.com"; // fallback
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "email profile openid",
          callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setGoogleLoading(true);
              setGoogleError(null);
              try {
                const data = await googleLoginUser(tokenResponse.access_token);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                setUser(data.user);
                completeAuthRedirect();
              } catch (err) {
                const errMsg = err.response?.data?.message || err.message || "Google sign-in failed.";
                setGoogleError(errMsg);
              } finally {
                setGoogleLoading(false);
              }
            }
          },
        });
        setGoogleClient(client);
      }
    };

    if (window.google) {
      initGoogleOAuth();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initGoogleOAuth();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  const handleGoogleLogin = () => {
    if (googleClient) {
      googleClient.requestAccessToken();
    } else {
      const errMsg = "Google Login is initializing. Please try again in a moment.";
      if (activeMode === "login") setLoginError(errMsg);
      else setRegisterError(errMsg);
    }
  };

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const data = await loginUser(loginData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      completeAuthRedirect();
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Login failed. Please verify credentials.";
      setLoginError(errMsg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError(null);

    if (!agreeTerms) {
      setRegisterError("Please accept the terms & privacy policy to continue.");
      return;
    }

    setRegisterLoading(true);

    try {
      const data = await registerUser(registerData);
      handleSwitchMode("login");
      setLocalSuccessMessage(data.message || "Registration successful! You can now log in.");
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Registration failed. Please try again.";
      setRegisterError(errMsg);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);

    try {
      const data = await forgotPassword({ email: forgotEmail });
      setForgotSuccess(data.message || "Reset link sent. Please check your email.");
      setForgotEmail("");
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Failed to process request.";
      setForgotError(errMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const isPasswordValid = registerData.password.length >= 6;
  const activeError = activeMode === "login" ? loginError || googleError : registerError || googleError;
  const activeLoading = activeMode === "login" ? loginLoading || googleLoading : registerLoading || googleLoading;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isRegisterEmailValid = emailRegex.test(registerData.email);
  const isLoginEmailValid = emailRegex.test(loginData.email);
  const isForgotEmailValid = emailRegex.test(forgotEmail);

  const formVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2, ease: "easeOut" }
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.15, ease: "easeIn" }
      }
    })
  };

  return (
    <div className={`auth-page ${resolvedTheme} page-fade-in`}>
      {/* Floating Back Home Button */}
      <button onClick={() => navigate("/")} className="btn-back-home">
        <ArrowLeft size={14} className="btn-back-home-arrow" />
        <span>Home</span>
      </button>

      {/* Floating Theme Toggle Button */}
      <button onClick={toggleTheme} className="btn-theme-toggle" aria-label="Toggle Theme">
        {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Floating Immersive Background Elements */}
      <div className="auth-floating-background">

        {/* Bubble 1: Collab Room (Top Left) */}
        <div
          className="auth-parallax-wrapper"
          style={{
            transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -25}px)`
          }}
        >
          <div className="auth-bg-bubble bubble-room">
            <div className="bubble-header">
              <span className="bubble-room-dot"></span>
              <span className="bubble-room-title">Python Live Room</span>
            </div>
            <p className="bubble-text">Debugging main.py</p>
            <div className="bubble-avatars">
              <span className="b-avatar color-1">A</span>
              <span className="b-avatar color-2">S</span>
              <span className="b-avatar color-3">K</span>
              <span className="b-avatar-count">+2</span>
            </div>
          </div>
        </div>

        {/* Bubble 2: Chat Feed message (Bottom Left) */}
        <div
          className="auth-parallax-wrapper"
          style={{
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`
          }}
        >
          <div className="auth-bg-bubble bubble-chat">
            <div className="bubble-chat-author">
              <strong>Saurabh</strong>
              <span>Collab chat</span>
            </div>
            <p className="bubble-chat-message">"Code runs perfectly! Let's deploy the project. 🚀"</p>
          </div>
        </div>

        {/* Bubble 3: Code Feed Snippet (Top Right) */}
        <div
          className="auth-parallax-wrapper"
          style={{
            transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -18}px)`
          }}
        >
          <div className="auth-bg-bubble bubble-code">
            <div className="bubble-code-header">
              <span className="bubble-code-lang">JavaScript</span>
              <span className="bubble-code-likes">❤️ 24</span>
            </div>
            <pre className="bubble-code-snippet">
              {`const collab = () => {
  return "CodeExpo";
};`}
            </pre>
          </div>
        </div>

        {/* Bubble 4: AI Alert Status (Bottom Right) */}
        <div
          className="auth-parallax-wrapper"
          style={{
            transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`
          }}
        >
          <div className="auth-bg-bubble bubble-ai">
            <div className="bubble-ai-title">
              <span className="ai-sparkle-icon">✦</span>
              <span>AI Assistant</span>
            </div>
            <p className="bubble-text">Code reviewed! 0 bugs found.</p>
          </div>
        </div>

      </div>

      {/* Centered Panel Wrapper */}
      <div className="auth-form-panel">
        {/* Double-Panel Split Layout Card */}
        <div className="auth-card-split">

          {/* LEFT PANEL: Branding & Info (Blue Gradient) */}
          <div className="auth-info-column">
            <div className="auth-info-content">
              <span className="auth-info-welcome">Welcome to</span>

              {/* White circle wrapping logo image */}
              <div className="auth-info-logo-circle">
                <img src="/logo.png" alt="CodeExpo Logo" className="auth-info-logo-img" />
              </div>

              <h1 className="auth-info-brand">CodeExpo</h1>

              <p className="auth-info-desc">
                The ultimate workspace for collaborative coding, real-time code sharing, and building your developer presence.
              </p>

              <div className="auth-info-footer">
                <span>CREATOR HERE</span>
                <span className="auth-footer-divider">|</span>
                <span>DESIGNER HERE</span>
              </div>
            </div>

            {/* Custom SVG cloud separator on right boundary */}
            <svg className="cloud-wave-separator" viewBox="0 0 100 620" preserveAspectRatio="none">
              <path d="M0,0 
                        C20,40 40,80 30,120 
                        C20,160 50,200 40,240 
                        C30,280 60,320 50,360 
                        C40,400 50,450 30,500 
                        C10,550 20,590 0,620 
                        L100,620 L100,0 Z"
                fill="rgba(255, 255, 255, 0.12)" />
              <path d="M0,0 
                        C15,45 35,75 25,125 
                        C15,175 45,195 35,245 
                        C25,295 55,315 45,365 
                        C35,415 45,465 25,515 
                        C5,565 15,585 0,620 
                        L100,620 L100,0 Z"
                fill="rgba(255, 255, 255, 0.25)" />
              <path d="M0,0 
                        C10,50 30,70 20,130 
                        C10,190 40,190 30,250 
                        C20,310 50,310 40,370 
                        C30,430 40,480 20,530 
                        C0,580 10,580 0,620 
                        L100,620 L100,0 Z"
                className="cloud-wave-front" />
            </svg>
          </div>

          {/* RIGHT PANEL: Form inputs (White background) */}
          <div className="auth-form-column">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              {isForgotPassword ? (
                <motion.div
                  key="forgot-password"
                  custom={direction}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-form-motion-wrapper"
                >
                  <div className="auth-brand-header">
                    <h2 className="auth-form-title">Forgot Password</h2>
                  </div>

                  {forgotError && (
                    <div className="error-alert-banner">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="success-alert-banner">
                      <span className="success-icon">✓</span>
                      <span className="success-text">{forgotSuccess}</span>
                    </div>
                  )}

                  <form className="auth-form-main" onSubmit={handleForgotSubmit}>
                    <div className="form-group">
                      <label htmlFor="forgotEmail" className="form-label">Email Address</label>
                      <div className="input-container">
                        <input
                          id="forgotEmail"
                          type="email"
                          name="email"
                          placeholder="name@example.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="form-input-underline"
                          autoComplete="email"
                        />
                        {isForgotEmailValid && <span className="input-valid-tick">✓</span>}
                      </div>
                    </div>

                    <div className="auth-action-row">
                      <button type="submit" className="btn-capsule-filled" disabled={forgotLoading}>
                        {forgotLoading ? "Sending..." : "Send Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(false);
                          setForgotError(null);
                          setForgotSuccess(null);
                        }}
                        className="btn-capsule-outlined"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : activeMode === "login" ? (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-form-motion-wrapper"
                >
                  <div className="auth-brand-header">
                    <h2 className="auth-form-title">Sign In</h2>
                  </div>

                  {(location.state?.successMessage || localSuccessMessage) && (
                    <div className="success-alert-banner">
                      <span className="success-icon">✓</span>
                      <span className="success-text">{location.state?.successMessage || localSuccessMessage}</span>
                    </div>
                  )}

                  {activeError && (
                    <div className="error-alert-banner">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{activeError}</span>
                    </div>
                  )}

                  <form className="auth-form-main" onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <div className="input-container">
                        <input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="name@example.com"
                          value={loginData.email}
                          onChange={handleLoginChange}
                          required
                          className="form-input-underline"
                          autoComplete="email"
                        />
                        {isLoginEmailValid && <span className="input-valid-tick">✓</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="password" className="form-label">Password</label>
                      <div className="input-container">
                        <input
                          id="password"
                          type={showLoginPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={handleLoginChange}
                          required
                          className="form-input-underline"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="input-icon-right-toggle"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {loginData.password.length >= 6 && <span className="input-valid-tick with-icon">✓</span>}
                      </div>
                      <div className="form-link-forgot-wrapper">
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="btn-link-forgot"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    <div className="auth-action-row">
                      <button type="submit" className="btn-capsule-filled" disabled={activeLoading}>
                        {activeLoading ? "Sign In..." : "Sign In"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSwitchMode("register")} 
                        className="btn-capsule-outlined"
                      >
                        Sign Up
                      </button>
                    </div>

                    <div className="social-separator-container">
                      <span className="separator-text">Or Continue With Google</span>
                    </div>

                    <div className="social-buttons-container">
                      <button
                        type="button"
                        className="social-btn-google-pill"
                        onClick={handleGoogleLogin}
                        disabled={activeLoading}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.45-1.11 2.69-2.35 3.51v2.91h3.79c2.22-2.05 3.5-5.07 3.5-8.37z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.17 1.12-3.21 0-5.93-2.17-6.9-5.1H1.31v3.01C3.29 21.16 7.37 24 12 24z" />
                          <path fill="#FBBC05" d="M5.1 14.2c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38V6.43H1.31C.48 8.09 0 9.97 0 12s.48 3.91 1.31 5.57l3.79-3.37z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.97 1.19 15.24 0 12 0 7.37 0 3.29 2.84 1.31 6.43l3.79 3.37c.97-2.93 3.69-5.05 6.9-5.05z" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  custom={direction}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-form-motion-wrapper"
                >
                  <div className="auth-brand-header">
                    <h2 className="auth-form-title">Create your account</h2>
                  </div>

                  {activeError && (
                    <div className="error-alert-banner">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{activeError}</span>
                    </div>
                  )}

                  <form className="auth-form-main" onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label htmlFor="username" className="form-label">Name</label>
                      <div className="input-container">
                        <input
                          id="username"
                          type="text"
                          name="username"
                          placeholder="Enter your name"
                          value={registerData.username}
                          onChange={handleRegisterChange}
                          required
                          className="form-input-underline"
                          minLength={3}
                          maxLength={30}
                          autoComplete="username"
                        />
                        {registerData.username.length >= 3 && <span className="input-valid-tick">✓</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <div className="input-container">
                        <input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="name@example.com"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          required
                          className="form-input-underline"
                          autoComplete="email"
                        />
                        {isRegisterEmailValid && <span className="input-valid-tick">✓</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="password" className="form-label">Password</label>
                      <div className="input-container">
                        <input
                          id="password"
                          type={showRegisterPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter your password"
                          value={registerData.password}
                          onChange={handleRegisterChange}
                          required
                          className="form-input-underline"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="input-icon-right-toggle"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        >
                          {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {registerData.password.length >= 6 && <span className="input-valid-tick with-icon">✓</span>}
                      </div>

                      {registerData.password && (
                        <div className={`password-indicator-text ${isPasswordValid ? "success" : ""}`}>
                          <span>{isPasswordValid ? "✓" : "○"}</span>
                          <span>Minimum 6 characters</span>
                        </div>
                      )}
                    </div>

                    <div className="form-actions-row-register">
                      <label className="remember-me-checkbox">
                        <input
                          type="checkbox"
                          name="agree"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">
                          By Signing Up, I Agree with{" "}
                          <a
                            href="/terms-and-conditions.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="terms-link"
                          >
                            Terms & Conditions
                          </a>
                        </span>
                      </label>
                    </div>

                    <div className="auth-action-row">
                      <button type="submit" className="btn-capsule-filled" disabled={activeLoading}>
                        {activeLoading ? "Signing Up..." : "Sign Up"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSwitchMode("login")} 
                        className="btn-capsule-outlined"
                      >
                        Sign In
                      </button>
                    </div>

                    <div className="social-separator-container">
                      <span className="separator-text">Or Continue With Google</span>
                    </div>

                    <div className="social-buttons-container">
                      <button
                        type="button"
                        className="social-btn-google-pill"
                        onClick={handleGoogleLogin}
                        disabled={activeLoading}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.45-1.11 2.69-2.35 3.51v2.91h3.79c2.22-2.05 3.5-5.07 3.5-8.37z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.17 1.12-3.21 0-5.93-2.17-6.9-5.1H1.31v3.01C3.29 21.16 7.37 24 12 24z" />
                          <path fill="#FBBC05" d="M5.1 14.2c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38V6.43H1.31C.48 8.09 0 9.97 0 12s.48 3.91 1.31 5.57l3.79-3.37z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.97 1.19 15.24 0 12 0 7.37 0 3.29 2.84 1.31 6.43l3.79 3.37c.97-2.93 3.69-5.05 6.9-5.05z" />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Auth;
