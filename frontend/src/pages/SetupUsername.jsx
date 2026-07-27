import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { checkUsernameAvailability, setupUsername } from "../services/userService";
import { getUserProfile } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import {
  Terminal,
  ShieldCheck,
  Shield,
  Lock,
  User,
  AtSign,
  Check,
  X,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import "./SetupUsername.css";

const SetupUsername = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [status, setStatus] = useState("idle"); // 'idle' | 'checking' | 'Available' | 'Taken' | 'Invalid'
  const [statusMessage, setStatusMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = localStorage.getItem("user");
        let initialUser = stored ? JSON.parse(stored) : null;
        
        const profileRes = await getUserProfile();
        if (profileRes && profileRes.user) {
          initialUser = profileRes.user;
          localStorage.setItem("user", JSON.stringify(profileRes.user));
        }

        if (!initialUser) {
          navigate("/login");
          return;
        }

        setCurrentUser(initialUser);
        const name = initialUser.displayName || initialUser.username || "Developer";
        setDisplayName(name);

        if (initialUser.username && /^[a-z0-9_]{3,20}$/.test(initialUser.username)) {
          navigate("/dashboard", { replace: true });
          return;
        }

        const initialCandidate = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 20);

        if (initialCandidate && initialCandidate.length >= 3) {
          setUsernameInput(initialCandidate);
          triggerValidation(initialCandidate);
        }
      } catch (err) {
        console.error("Error loading user profile on onboarding:", err);
      }
    };

    loadUser();
  }, [navigate]);

  const triggerValidation = (val) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = val.toLowerCase().trim();

    if (!clean) {
      setStatus("idle");
      setStatusMessage("");
      setSuggestions([]);
      return;
    }

    if (clean.length < 3) {
      setStatus("Invalid");
      setStatusMessage("Username must be at least 3 characters");
      setSuggestions([]);
      return;
    }

    if (clean.length > 20) {
      setStatus("Invalid");
      setStatusMessage("Username cannot exceed 20 characters");
      setSuggestions([]);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(clean)) {
      setStatus("Invalid");
      setStatusMessage("Only lowercase letters, numbers, and underscores allowed");
      setSuggestions([]);
      return;
    }

    if (clean.startsWith("_") || clean.endsWith("_")) {
      setStatus("Invalid");
      setStatusMessage("Cannot start or end with an underscore");
      setSuggestions([]);
      return;
    }

    if (/__/.test(clean)) {
      setStatus("Invalid");
      setStatusMessage("Cannot contain consecutive underscores");
      setSuggestions([]);
      return;
    }

    setStatus("checking");
    setStatusMessage("Checking availability...");

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(clean);
        if (res.available) {
          setStatus("Available");
          setStatusMessage("Username handle is available!");
          setSuggestions([]);
        } else {
          setStatus(res.status || "Taken");
          setStatusMessage(res.message || "Username is unavailable");
          setSuggestions(res.suggestions || []);
        }
      } catch (err) {
        setStatus("Invalid");
        setStatusMessage("Error checking availability. Please try again.");
      }
    }, 350);
  };

  const handleInputChange = (e) => {
    let val = e.target.value.toLowerCase().replace(/\s+/g, "");
    setUsernameInput(val);
    triggerValidation(val);
  };

  const handleSelectSuggestion = (suggestedName) => {
    setUsernameInput(suggestedName);
    triggerValidation(suggestedName);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== "Available" || !usernameInput || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await setupUsername(usernameInput);
      if (res.success && res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        navigate("/dashboard", { replace: true });
      } else {
        setErrorMessage(res.message || "Failed to set username");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || "Failed to complete username setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rule checks for real-time requirement indicator
  const cleanInput = usernameInput.toLowerCase().trim();
  const ruleLength = cleanInput.length >= 3 && cleanInput.length <= 20;
  const ruleLowercase = /^[a-z0-9_]+$/.test(cleanInput) && cleanInput === cleanInput.toLowerCase();
  const ruleAllowedChars = /^[a-z0-9_]+$/.test(cleanInput);
  const ruleValidFormat = ruleLength && ruleLowercase && !cleanInput.startsWith("_") && !cleanInput.endsWith("_") && !/__/.test(cleanInput);

  return (
    <div className={`setup-page-bg ${resolvedTheme}`}>
      <div className="setup-main-card">

        {/* Left Panel: Real Developer Code Editor / Identity Preview */}
        <div className="setup-left-panel">
          <div className="code-editor-preview">
            <div className="editor-window-bar">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="window-title">identity.config.js</span>
            </div>

            <div className="editor-code-body">
              <div className="code-line">
                <span className="line-num">1</span>
                <span className="code-comment">// CodeExpo Developer Identity</span>
              </div>
              <div className="code-line">
                <span className="line-num">2</span>
                <span className="code-kw">import</span> &#123; createIdentity &#125; <span className="code-kw">from</span> <span className="code-str">"@codeexpo/core"</span>;
              </div>
              <div className="code-line">
                <span className="line-num">3</span>
              </div>
              <div className="code-line">
                <span className="line-num">4</span>
                <span className="code-kw">export default</span> createIdentity(&#123;
              </div>
              <div className="code-line indent">
                <span className="line-num">5</span>
                <span className="code-prop">displayName</span>: <span className="code-str">"{displayName || "Raviraj Kumar"}"</span>,
              </div>
              <div className="code-line indent highlight">
                <span className="line-num">6</span>
                <span className="code-prop">handle</span>: <span className="code-str">"@{usernameInput || "raviraj_kumar"}"</span>,
              </div>
              <div className="code-line indent">
                <span className="line-num">7</span>
                <span className="code-prop">status</span>: <span className="code-str">"Available"</span>,
              </div>
              <div className="code-line indent">
                <span className="line-num">8</span>
                <span className="code-prop">verified</span>: <span className="code-bool">true</span>
              </div>
              <div className="code-line">
                <span className="line-num">9</span>
                &#125;);
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Form Content */}
        <div className="setup-right-panel">

          {/* Top Brand Bar */}
          <div className="top-brand-bar">
            <div className="brand-logo-title">
              <div className="brand-icon-chip">
                <Terminal size={18} />
              </div>
              <div className="brand-meta">
                <span className="brand-name">CodeExpo</span>
                <span className="brand-tagline">Collaborate. Code. Create.</span>
              </div>
            </div>
          </div>

          {/* Account Onboarding Pill Tag */}
          <div className="onboarding-badge-tag">
            <ShieldCheck size={13} className="shield-check-icon" />
            <span>ACCOUNT ONBOARDING</span>
          </div>

          {/* Main Title */}
          <div className="title-section">
            <h1 className="title-heading">
              Welcome to <span className="highlight-text">CodeExpo</span> <span className="waving-emoji">👋</span>
            </h1>
            <p className="title-subtext">
              Choose your permanent username to complete your account setup.
            </p>
          </div>

          {/* Identity Context Info Box */}
          <div className="identity-info-box">
            <div className="shield-icon-container">
              <Info size={18} />
            </div>
            <div className="info-content">
              <h4 className="info-heading">Your username is your identity across CodeExpo.</h4>
              <p className="info-description">
                It's used in profile URLs ( <code className="code-tag">/u/handle</code> ), mentions ( <code className="code-tag">@handle</code> ), search, social graph, and AI collaboration.
              </p>
            </div>
          </div>

          {/* Main Form */}
          <form className="setup-form-element" onSubmit={handleSubmit}>

            {/* Display Name Field */}
            <div className="input-group">
              <div className="label-row">
                <label className="input-label">DISPLAY NAME</label>
                <div className="readonly-badge">
                  <Lock size={10} /> READ ONLY
                </div>
              </div>

              <div className="input-box readonly">
                <User size={16} className="input-box-icon" />
                <input
                  type="text"
                  className="form-input readonly-input"
                  value={displayName}
                  readOnly
                  disabled
                />
              </div>
              <p className="input-helper-text">You can change your display name anytime in profile settings.</p>
            </div>

            {/* Username Handle Field */}
            <div className="input-group">
              <div className="label-row">
                <label className="input-label">
                  USERNAME HANDLE <span className="required-asterisk">*</span>
                </label>
              </div>

              <div className={`input-box handle-box ${status.toLowerCase()}`}>
                <div className="at-symbol">@</div>
                <input
                  type="text"
                  className="form-input handle-input"
                  placeholder="raviraj_kumar"
                  value={usernameInput}
                  onChange={handleInputChange}
                  maxLength={20}
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                  required
                />

                <div className="status-icon-area">
                  {status === "checking" && <div className="mini-spinner" />}
                  {status === "Available" && (
                    <div className="status-circle success">
                      <Check size={12} />
                    </div>
                  )}
                  {(status === "Taken" || status === "Invalid") && (
                    <div className="status-circle error">
                      <X size={12} />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {statusMessage && (
                <div className={`status-banner ${status.toLowerCase()}`}>
                  {status === "Available" ? (
                    <CheckCircle2 size={14} className="banner-icon" />
                  ) : status === "checking" ? (
                    <div className="micro-spinner" />
                  ) : (
                    <AlertCircle size={14} className="banner-icon" />
                  )}
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* 4 Requirement Chips in Row */}
              <div className="requirements-row">
                <div className={`req-chip ${ruleLength ? "active" : ""}`}>
                  {ruleLength ? <Check size={11} /> : null} 3–20 characters
                </div>
                <div className={`req-chip ${ruleLowercase ? "active" : ""}`}>
                  {ruleLowercase ? <Check size={11} /> : null} lowercase
                </div>
                <div className={`req-chip ${ruleAllowedChars ? "active" : ""}`}>
                  {ruleAllowedChars ? <Check size={11} /> : null} 0-9, _ allowed
                </div>
                <div className={`req-chip ${ruleValidFormat ? "active" : ""}`}>
                  {ruleValidFormat ? <Check size={11} /> : null} valid format
                </div>
              </div>

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && (
                <div className="suggestions-area">
                  <span className="suggestions-label">Available Suggestions:</span>
                  <div className="suggestions-chips-row">
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="suggestion-pill-btn"
                        onClick={() => handleSelectSuggestion(sug)}
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="error-alert-bar">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              className="submit-action-btn"
              disabled={status !== "Available" || isSubmitting || !usernameInput}
            >
              {isSubmitting ? (
                <span className="btn-flex-content">
                  <div className="mini-spinner white" /> Setting up account...
                </span>
              ) : (
                <span className="btn-flex-content">
                  Claim Handle & Continue <ArrowRight size={16} className="arrow-next" />
                </span>
              )}
            </button>

            {/* Footer Notice */}
            <div className="footer-notice">
              <Shield size={12} className="footer-shield" />
              <span>You can update your username once every 30 days.</span>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default SetupUsername;
