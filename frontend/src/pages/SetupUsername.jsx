import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { checkUsernameAvailability, setupUsername } from "../services/userService";
import { getUserProfile } from "../services/authService";
import { useTheme } from "../context/ThemeContext";
import {
  User,
  Check,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
  Zap,
  Loader2
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
    setStatusMessage("Checking username availability...");

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailability(clean);
        if (res.available) {
          setStatus("Available");
          setStatusMessage("Great! This username is available.");
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

  // Rule checks
  const cleanInput = usernameInput.toLowerCase().trim();
  const ruleLength = cleanInput.length >= 3 && cleanInput.length <= 20;
  const ruleLowercase = /^[a-z0-9_]+$/.test(cleanInput) && cleanInput === cleanInput.toLowerCase();
  const ruleAllowedChars = /^[a-z0-9_]+$/.test(cleanInput);
  const ruleValidFormat = ruleLength && ruleLowercase && !cleanInput.startsWith("_") && !cleanInput.endsWith("_") && !/__/.test(cleanInput);

  return (
    <div className={`ob-page-container ${resolvedTheme}`}>
      <div className="ob-split-card">

        {/* LEFT HERO SECTION */}
        <div className="ob-hero-side">
          <div className="ob-hero-header">
            <img src="/logo.png" alt="CodeExpo Logo" className="ob-brand-logo-img" />
            <span className="ob-brand-title">CodeExpo</span>
          </div>

          <div className="ob-hero-content">
            <h1 className="ob-hero-heading">
              Collaborate.<br />
              Code.<br />
              <span className="ob-purple-text">Create.</span>
            </h1>
            <p className="ob-hero-subtitle">
              Real-time collaborative coding<br />
              platform for developers,<br />
              by developers.
            </p>
          </div>

          {/* Floating Code Editor Window */}
          <div className="ob-code-window-wrapper">
            <div className="ob-code-window">
              <div className="ob-code-header">
                <div className="ob-window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <span className="ob-file-name">&gt; main.js</span>
              </div>

              <div className="ob-code-body">
                <div className="line"><span className="num">1</span><span className="cmt">// Welcome to CodeExpo</span></div>
                <div className="line"><span className="num">2</span><span className="kw">import</span> &#123; Room &#125; <span className="kw">from</span> <span className="str">"codeexpo-sdk"</span>;</div>
                <div className="line"><span className="num">3</span></div>
                <div className="line"><span className="num">4</span><span className="kw">const</span> room = <span className="kw">new</span> Room(&#123;</div>
                <div className="line indent"><span className="num">5</span><span className="prop">name</span>: <span className="str">"Brainstorm"</span>,</div>
                <div className="line indent"><span className="num">6</span><span className="prop">language</span>: <span className="str">"JavaScript"</span></div>
                <div className="line"><span className="num">7</span>&#125;);</div>
                <div className="line"><span className="num">8</span></div>
                <div className="line"><span className="num">9</span>room.on(<span className="str">"code-change"</span>, (delta) =&gt; &#123;</div>
                <div className="line indent"><span className="num">10</span>applyChanges(delta);</div>
                <div className="line"><span className="num">11</span>&#125;);</div>
              </div>
            </div>

            {/* Floating Overlaid Badges */}
            <div className="ob-floating-badge dev-badge">
              <div className="badge-icon-wrap violet">
                <Users size={15} />
              </div>
              <div className="badge-text-group">
                <span className="badge-val">12+</span>
                <span className="badge-lbl">Developers online</span>
              </div>
              <span className="online-green-dot" />
            </div>

            <div className="ob-floating-badge perf-badge">
              <div className="badge-icon-wrap purple">
                <Zap size={15} />
              </div>
              <div className="badge-text-group">
                <span className="badge-val">Low latency</span>
                <span className="badge-lbl">High performance</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT FORM SECTION */}
        <div className="ob-form-side">

          {/* Top Badge Tag */}
          <div className="ob-badge-tag">
            <div className="ob-badge-icon-box">
              <User size={14} />
            </div>
            <span>ACCOUNT ONBOARDING</span>
          </div>

          {/* Title */}
          <div className="ob-title-group">
            <h1 className="ob-main-title">
              Welcome to <span className="ob-title-highlight">CodeExpo</span> <span className="ob-wave-emoji">👋</span>
            </h1>
            <p className="ob-sub-title">
              Choose your permanent username to complete your account setup.
            </p>
          </div>

          {/* Identity Info Box */}
          <div className="ob-info-box">
            <div className="ob-info-icon-circle">
              <Info size={16} />
            </div>
            <div className="ob-info-content">
              <h4 className="ob-info-header">Your username is your identity across CodeExpo.</h4>
              <p className="ob-info-body">
                It's used in profile URLs ( <code className="ob-tag">/u/your-handle</code> ), mentions ( <code className="ob-tag">@yourhandle</code> ), search, social graph, and AI collaboration.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="ob-form-element" onSubmit={handleSubmit}>

            {/* Display Name Field */}
            <div className="ob-field-group">
              <label className="ob-label">DISPLAY NAME</label>
              <div className="ob-input-box readonly">
                <User size={16} className="ob-input-icon" />
                <input
                  type="text"
                  className="ob-input readonly-input"
                  value={displayName}
                  readOnly
                  disabled
                />
              </div>
              <p className="ob-helper-text">This is how others will see you on your profile.</p>
            </div>

            {/* Username Handle Field */}
            <div className="ob-field-group">
              <label className="ob-label">
                USERNAME HANDLE <span className="ob-asterisk">*</span>
              </label>

              <div className={`ob-input-box handle-box ${status.toLowerCase()}`}>
                <div className="ob-at-box">@</div>
                <input
                  type="text"
                  className="ob-input handle-input"
                  placeholder="sachin_kumar_local"
                  value={usernameInput}
                  onChange={handleInputChange}
                  maxLength={20}
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus
                  required
                />

                <div className="ob-status-area">
                  {status === "checking" && <Loader2 size={18} className="ob-spin" />}
                  {status === "Available" && (
                    <div className="ob-status-circle success">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                  {(status === "Taken" || status === "Invalid") && (
                    <div className="ob-status-circle error">
                      <AlertCircle size={18} />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Message */}
              {statusMessage && (
                <div className={`ob-status-msg ${status.toLowerCase()}`}>
                  {status === "Available" ? (
                    <CheckCircle2 size={14} />
                  ) : status === "checking" ? (
                    <Loader2 size={14} className="ob-spin" />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* 4 Requirement Chips */}
              <div className="ob-chips-grid">
                <div className={`ob-chip ${ruleLength ? "active" : ""}`}>
                  {ruleLength ? <Check size={12} strokeWidth={2.5} /> : null}
                  <span>3–20 characters</span>
                </div>
                <div className={`ob-chip ${ruleLowercase ? "active" : ""}`}>
                  {ruleLowercase ? <Check size={12} strokeWidth={2.5} /> : null}
                  <span>lowercase letters</span>
                </div>
                <div className={`ob-chip ${ruleAllowedChars ? "active" : ""}`}>
                  {ruleAllowedChars ? <Check size={12} strokeWidth={2.5} /> : null}
                  <span>0–9 and _ allowed</span>
                </div>
                <div className={`ob-chip ${ruleValidFormat ? "active" : ""}`}>
                  {ruleValidFormat ? <Check size={12} strokeWidth={2.5} /> : null}
                  <span>valid format</span>
                </div>
              </div>

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && (
                <div className="ob-suggestions-wrapper">
                  <span className="ob-suggestions-label">Available Suggestions:</span>
                  <div className="ob-suggestions-row">
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        className="ob-suggestion-pill"
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
              <div className="ob-error-banner">
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="ob-submit-btn"
              disabled={status !== "Available" || isSubmitting || !usernameInput}
            >
              {isSubmitting ? (
                <span className="ob-btn-content">
                  <Loader2 size={18} className="ob-spin" /> Setting up account...
                </span>
              ) : (
                <span className="ob-btn-content">
                  Claim Handle & Continue <ArrowRight size={18} />
                </span>
              )}
            </button>

            {/* Footer Notice */}
            <div className="ob-footer-notice">
              <Shield size={13} />
              <span>You can update your username once every 30 days.</span>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};

export default SetupUsername;
