import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, registerUser, googleLoginUser, getGoogleConfig, forgotPassword } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, ArrowLeft, Sparkles, Eye, EyeOff } from "lucide-react";
import AuthBackground from "../components/auth/AuthBackground";
import GlobalNetworkBackground from "../components/auth/GlobalNetworkBackground";
import { motion, AnimatePresence } from "framer-motion";
import "./Auth.css";

function Auth({ mode }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const completeAuthRedirect = () => {
    const from = location.state?.from?.pathname
      ? location.state.from.pathname + location.state.from.search
      : "/dashboard";
    navigate(from);
  };

  // Animation state tracking
  const [prevMode, setPrevMode] = useState(mode);
  const [direction, setDirection] = useState(1);

  if (mode !== prevMode) {
    setDirection(mode === "register" ? 1 : -1);
    setPrevMode(mode);
  }

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

  const theme = "dark";

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
  }, [mode]);

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
      if (mode === "login") setLoginError(errMsg);
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
      navigate("/login", {
        state: {
          successMessage: data.message || "Registration successful! You can now log in."
        }
      });
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

  const formVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 50 : -50,
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
      x: direction > 0 ? -50 : 50,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.15, ease: "easeIn" }
      }
    })
  };

  const activeError = mode === "login" ? loginError || googleError : registerError || googleError;
  const activeLoading = mode === "login" ? loginLoading || googleLoading : registerLoading || googleLoading;

  return (
    <div className={`auth-page ${theme === "light" ? "light-theme" : ""}`}>
      {/* Immersive 3D Zooming/Collaborating Global Network Page Background */}
      <GlobalNetworkBackground />

      {/* Background Cyber Grid Overlay */}
      <div className="auth-page-bg-grid" />

      {/* Background Ambient Neon Beams */}
      <div className="auth-page-neon beam-blue" />
      <div className="auth-page-neon beam-indigo" />
      <div className="auth-page-neon beam-cyan" />
      <div className="auth-page-neon beam-purple" />

      {/* Floating Back Home Button */}
      <button onClick={() => navigate("/")} className="btn-back-home">
        <ArrowLeft size={14} className="btn-back-home-arrow" />
        <span>Home</span>
      </button>

      {/* Centered Panel Wrapper */}
      <div className="auth-form-panel">
        {/* Double-Panel Split Glass Card */}
        <div className="auth-double-card">
          
          {/* LEFT HALF: Form Column */}
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
                  <div className="auth-header">
                    <div className="brand-logo-glow" onClick={() => navigate("/")}>
                      <div className="logo-symbol">&lt;/&gt;</div>
                      <div className="logo-text">
                        Code<span className="logo-highlight">Expo</span>
                      </div>
                    </div>
                    <p className="auth-tagline-explore">Forgot Password?</p>
                    <p className="auth-tagline-world">Recover your access to the <span className="text-highlight">Grid</span>.</p>
                  </div>

                  {forgotError && (
                    <div className="error-alert-banner">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="success-alert-banner" style={{ borderLeft: "4px solid #238636", backgroundColor: "rgba(35, 134, 54, 0.15)", padding: "10px", borderRadius: "5px", marginBottom: "15px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="success-icon" style={{ color: "#3fb950" }}>✓</span>
                      <span className="success-text" style={{ color: "#c9d1d9", fontSize: "14px" }}>{forgotSuccess}</span>
                    </div>
                  )}

                  <form className="auth-form-main" onSubmit={handleForgotSubmit}>
                    <div className="form-group">
                      <div className="input-container">
                        <input
                          id="forgotEmail"
                          type="email"
                          name="email"
                          placeholder="Registered Email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                          className="form-input"
                          autoComplete="email"
                        />
                        <Mail className="input-icon-left" size={16} />
                        <div className="input-focus-line" />
                      </div>
                    </div>

                    <button type="submit" className="btn-submit-premium" disabled={forgotLoading}>
                      {forgotLoading ? (
                        <span className="loader-text">Locating Identity...</span>
                      ) : (
                        <>
                          <span className="btn-arrow-icon">➔</span>
                          <span>Send Reset Link</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="auth-card-footer">
                    <span>Remembered credentials?</span>
                    <button 
                      onClick={() => {
                        setIsForgotPassword(false);
                        setForgotError(null);
                        setForgotSuccess(null);
                      }} 
                      className="btn-link-toggle-mode"
                    >
                      Log in
                    </button>
                  </div>
                </motion.div>
              ) : mode === "login" ? (
                <motion.div
                  key="login"
                  custom={direction}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="auth-form-motion-wrapper"
                >
                  <div className="auth-header">
                    <div className="brand-logo-glow" onClick={() => navigate("/")}>
                      <div className="logo-symbol">&lt;/&gt;</div>
                      <div className="logo-text">
                        Code<span className="logo-highlight">Expo</span>
                      </div>
                    </div>
                    <p className="auth-tagline-explore">Explore. Code. Innovate.</p>
                    <p className="auth-tagline-world">The <span className="text-highlight">World</span> is our Playground.</p>
                  </div>

                  {location.state?.successMessage && (
                    <div className="success-alert-banner" style={{ borderLeft: "4px solid #aa3bff", backgroundColor: "rgba(170, 59, 255, 0.15)", padding: "10px", borderRadius: "5px", marginBottom: "15px", display: "flex", gap: "8px", alignItems: "center" }}>
                      <span className="success-icon" style={{ color: "#aa3bff" }}>✓</span>
                      <span className="success-text" style={{ color: "#c9d1d9", fontSize: "14px" }}>{location.state.successMessage}</span>
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
                      <div className="input-container">
                        <input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="Username or Email"
                          value={loginData.email}
                          onChange={handleLoginChange}
                          required
                          className="form-input"
                          autoComplete="email"
                        />
                        <User className="input-icon-left" size={16} />
                        <div className="input-focus-line" />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-container">
                        <input
                          id="password"
                          type={showLoginPassword ? "text" : "password"}
                          name="password"
                          placeholder="Password"
                          value={loginData.password}
                          onChange={handleLoginChange}
                          required
                          className="form-input"
                          autoComplete="current-password"
                        />
                        <Lock className="input-icon-left" size={16} />
                        <button
                          type="button"
                          className="input-icon-right-toggle"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <div className="input-focus-line" />
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

                    <button type="submit" className="btn-submit-premium" disabled={activeLoading}>
                      {activeLoading ? (
                        <span className="loader-text">Authorizing Session...</span>
                      ) : (
                        <>
                          <span className="btn-arrow-icon">➔</span>
                          <span>Login to CodeExpo</span>
                        </>
                      )}
                    </button>

                    <div className="social-separator-container">
                      <span className="separator-text">or</span>
                    </div>

                    <button
                      type="button"
                      className="btn-google-centered"
                      onClick={handleGoogleLogin}
                      disabled={activeLoading}
                    >
                      <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.45-1.11 2.69-2.35 3.51v2.91h3.79c2.22-2.05 3.5-5.07 3.5-8.37z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.17 1.12-3.21 0-5.93-2.17-6.9-5.1H1.31v3.01C3.29 21.16 7.37 24 12 24z" />
                        <path fill="#FBBC05" d="M5.1 14.2c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38V6.43H1.31C.48 8.09 0 9.97 0 12s.48 3.91 1.31 5.57l3.79-3.37z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.97 1.19 15.24 0 12 0 7.37 0 3.29 2.84 1.31 6.43l3.79 3.37c.97-2.93 3.69-5.05 6.9-5.05z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </form>

                  <div className="auth-card-footer">
                    <span>New to CodeExpo?</span>
                    <button onClick={() => navigate("/register")} className="btn-link-toggle-mode">
                      Sign up
                    </button>
                  </div>
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
                  <div className="auth-header">
                    <div className="brand-logo-glow" onClick={() => navigate("/")}>
                      <div className="logo-symbol">&lt;/&gt;</div>
                      <div className="logo-text">
                        Code<span className="logo-highlight">Expo</span>
                      </div>
                    </div>
                    <p className="auth-tagline-explore">Explore. Code. Innovate.</p>
                    <p className="auth-tagline-world">The <span className="text-highlight">World</span> is our Playground.</p>
                  </div>

                  {activeError && (
                    <div className="error-alert-banner">
                      <span className="error-icon">⚠️</span>
                      <span className="error-text">{activeError}</span>
                    </div>
                  )}

                  <form className="auth-form-main" onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <div className="input-container">
                        <input
                          id="username"
                          type="text"
                          name="username"
                          placeholder="Username"
                          value={registerData.username}
                          onChange={handleRegisterChange}
                          required
                          className="form-input"
                          minLength={3}
                          maxLength={30}
                          autoComplete="username"
                        />
                        <User className="input-icon-left" size={16} />
                        <div className="input-focus-line" />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-container">
                        <input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="Email"
                          value={registerData.email}
                          onChange={handleRegisterChange}
                          required
                          className="form-input"
                          autoComplete="email"
                        />
                        <Mail className="input-icon-left" size={16} />
                        <div className="input-focus-line" />
                      </div>
                    </div>

                    <div className="form-group">
                      <div className="input-container">
                        <input
                          id="password"
                          type={showRegisterPassword ? "text" : "password"}
                          name="password"
                          placeholder="Password"
                          value={registerData.password}
                          onChange={handleRegisterChange}
                          required
                          className="form-input"
                          autoComplete="new-password"
                        />
                        <Lock className="input-icon-left" size={16} />
                        <button
                          type="button"
                          className="input-icon-right-toggle"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        >
                          {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <div className="input-focus-line" />
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
                        <span className="checkbox-label">I agree to the terms & privacy policy</span>
                      </label>
                    </div>

                    <button type="submit" className="btn-submit-premium" disabled={activeLoading}>
                      {activeLoading ? (
                        <span className="loader-text">Configuring Account...</span>
                      ) : (
                        <>
                          <span className="btn-arrow-icon">➔</span>
                          <span>Get started on CodeExpo</span>
                        </>
                      )}
                    </button>

                    <div className="social-separator-container">
                      <span className="separator-text">or</span>
                    </div>

                    <button
                      type="button"
                      className="btn-google-centered"
                      onClick={handleGoogleLogin}
                      disabled={activeLoading}
                    >
                      <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.45-1.11 2.69-2.35 3.51v2.91h3.79c2.22-2.05 3.5-5.07 3.5-8.37z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.17 1.12-3.21 0-5.93-2.17-6.9-5.1H1.31v3.01C3.29 21.16 7.37 24 12 24z" />
                        <path fill="#FBBC05" d="M5.1 14.2c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38V6.43H1.31C.48 8.09 0 9.97 0 12s.48 3.91 1.31 5.57l3.79-3.37z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.97 1.19 15.24 0 12 0 7.37 0 3.29 2.84 1.31 6.43l3.79 3.37c.97-2.93 3.69-5.05 6.9-5.05z" />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </form>

                  <div className="auth-card-footer">
                    <span>Already have an account?</span>
                    <button onClick={() => navigate("/login")} className="btn-link-toggle-mode">
                      Log in
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT HALF: Animation Column */}
          <div className="auth-animation-column">
            <AuthBackground theme={theme} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default Auth;
