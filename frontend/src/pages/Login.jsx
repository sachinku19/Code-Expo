import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, googleLoginUser, getGoogleConfig } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowLeft, Code2, Sparkles, Sun, Moon } from "lucide-react";
import "./Login.css";

function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("codeExpoHomeTheme") || "dark");
  const [googleClient, setGoogleClient] = useState(null);

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
              setLoading(true);
              setError(null);
              try {
                const data = await googleLoginUser(tokenResponse.access_token);
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                setUser(data.user);
                navigate("/dashboard");
              } catch (err) {
                const errMsg = err.response?.data?.message || err.message || "Google sign-in failed.";
                setError(errMsg);
              } finally {
                setLoading(false);
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
      setError("Google Login is initializing. Please try again in a moment.");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("codeExpoHomeTheme", nextTheme);
  };

  // Self-contained Coding Animation (Matrix Code Rain themed around Developer Syntax)
  useEffect(() => {
    const canvas = document.getElementById("auth-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Modern programming languages tokens list
    const codeTokens = [
      "const", "let", "function", "import", "export", "class", "async", "await", "=>",
      "useState", "useEffect", "useRoom", "sync", "compile", "console.log",
      "socket.emit", "socket.on", "Room", "User", "auth", "token", "email", "password",
      "&&", "||", "===", "{}", "[]", "<CodeExpo />", "Dashboard", "Editor", "Compiler",
      "npm run dev", "git commit", "return", "try", "catch", "new Promise()", "res.json"
    ];

    const columnsCount = Math.floor(width / 120); // Spacing between vertical streams
    const columns = [];

    // Create random vertical drop streams
    for (let i = 0; i < columnsCount; i++) {
      columns.push({
        x: i * 120 + Math.random() * 30,
        y: Math.random() * height - height, // Start above the screen
        speed: Math.random() * 1.2 + 0.6,
        tokenIndex: Math.floor(Math.random() * codeTokens.length),
        opacity: Math.random() * 0.16 + 0.04
      });
    }

    const animate = () => {
      // Clear with trailing alpha layer to make code lines fade away (using theme colors)
      ctx.fillStyle = theme === "light" ? "rgba(248, 251, 255, 0.12)" : "rgba(3, 3, 3, 0.12)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const token = codeTokens[col.tokenIndex];

        if (theme === "light") {
          // Light theme code rain colors (darker, readable violet and blue)
          ctx.fillStyle = i % 2 === 0 ? `rgba(109, 40, 217, ${col.opacity * 1.5})` : `rgba(2, 132, 199, ${col.opacity * 1.5})`;
        } else {
          // Dark theme code rain colors (indigo/cyan neons)
          ctx.fillStyle = i % 2 === 0 ? `rgba(129, 140, 248, ${col.opacity})` : `rgba(56, 189, 248, ${col.opacity})`;
        }

        ctx.fillText(token, col.x, col.y);

        // Advance stream drop position
        col.y += col.speed;

        // Reset to top when column drops off bottom viewport boundary
        if (col.y > height) {
          col.y = -24;
          col.x = i * 120 + Math.random() * 30;
          col.speed = Math.random() * 1.2 + 0.6;
          col.tokenIndex = Math.floor(Math.random() * codeTokens.length);
          col.opacity = Math.random() * 0.16 + 0.04;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  // Handle inputs change
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit form data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginUser(formData);
      console.log(data);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);

      navigate("/dashboard");
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || "Login failed. Please verify credentials.";
      console.log(errMsg);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to register page
  const nav_to_register = () => {
    navigate("/register");
  };

  return (
    <div className={`login-page ${theme === "light" ? "light-theme" : ""}`}>
      {/* Background Coding Code Rain Animation Canvas */}
      <canvas id="auth-canvas" className="auth-canvas-bg"></canvas>

      {/* Background Dots Matrix */}
      <div className="bg-dots"></div>

      {/* Floating Back to Home button */}
      <button onClick={() => navigate("/")} className="btn-back-home">
        <ArrowLeft size={14} />
        <span>Back</span>
      </button>

      {/* Floating Theme Toggle Switch */}
      <button onClick={toggleTheme} className="btn-theme-toggle" aria-label="Toggle Theme">
        {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {/* Main Glassmorphic Card */}
      <div className="login-card-container">
        <div className="login-header">
          <div className="brand-icon-wrapper">
            <Code2 size={24} />
          </div>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">
            Log in to access your workspaces and resume editing code.
          </p>
        </div>

        {error && (
          <div className="error-alert-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form className="login-form-main" onSubmit={handleSubmit}>
          {/* Email Group */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <div className="input-container">
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
              />
              <Mail className="input-icon-left" size={16} />
            </div>
          </div>

          {/* Password Group */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-container">
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
              />
              <Lock className="input-icon-left" size={16} />
            </div>
          </div>

          {/* Submit Action */}
          <button type="submit" className="btn-submit-premium" disabled={loading}>
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign in</span>
                <Sparkles size={14} />
              </>
            )}
          </button>

          {/* Social login separators */}
          <div className="social-separator-container">or continue with</div>

          {/* Mock Social Options */}
          <div className="social-actions-grid">
            <button 
              type="button" 
              className="social-action-btn"
              onClick={() => alert("GitHub integration coming soon!")}
            >
              <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ marginRight: "8px" }}>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </button>
            <button 
              type="button" 
              className="social-action-btn"
              onClick={handleGoogleLogin}
            >
              <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: "8px" }}>
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.58c-.28 1.45-1.11 2.69-2.35 3.51v2.91h3.79c2.22-2.05 3.5-5.07 3.5-8.37z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.17 1.12-3.21 0-5.93-2.17-6.9-5.1H1.31v3.01C3.29 21.16 7.37 24 12 24z" />
                <path fill="#FBBC05" d="M5.1 14.2c-.25-.75-.39-1.55-.39-2.38s.14-1.63.39-2.38V6.43H1.31C.48 8.09 0 9.97 0 12s.48 3.91 1.31 5.57l3.79-3.37z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.97 1.19 15.24 0 12 0 7.37 0 3.29 2.84 1.31 6.43l3.79 3.37c.97-2.93 3.69-5.05 6.9-5.05z" />
              </svg>
              <span>Google</span>
            </button>
          </div>
        </form>

        {/* Navigation to Register */}
        <div className="login-card-footer">
          <span>New to Code Expo?</span>
          <button onClick={nav_to_register} className="btn-link-register">
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;