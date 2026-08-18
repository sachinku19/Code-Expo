import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  FileText,
  Briefcase,
  Code2,
  Globe,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";
import { uploadAvatar, updateUserProfile } from "../../services/userService";
import { getAvatarColor, getAvatarInitial } from "../../utils/avatarUtils";
import "./AccountSettings.css";

const GithubIcon = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const LinkedinIcon = ({ size = 14 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const AccountSettings = ({ user, setUser, addToast }) => {
  // Form State
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [languages, setLanguages] = useState([]);
  const [langInput, setLangInput] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // UX & Async States
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [initialState, setInitialState] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize form from user prop
  useEffect(() => {
    if (user) {
      const initialLangs = Array.isArray(user.programmingLanguages)
        ? user.programmingLanguages
        : typeof user.programmingLanguages === "string"
        ? user.programmingLanguages.split(",").map((l) => l.trim()).filter(Boolean)
        : [];

      const initialData = {
        bio: user.bio || "",
        title: user.title || "",
        languages: initialLangs,
        githubUrl: user.githubUrl || "",
        linkedinUrl: user.linkedinUrl || "",
        portfolioUrl: user.portfolioUrl || ""
      };

      setBio(initialData.bio);
      setTitle(initialData.title);
      setLanguages(initialData.languages);
      setGithubUrl(initialData.githubUrl);
      setLinkedinUrl(initialData.linkedinUrl);
      setPortfolioUrl(initialData.portfolioUrl);
      setInitialState(initialData);
    }
  }, [user]);

  // Check for unsaved changes
  const hasUnsavedChanges = Boolean(
    initialState &&
      (bio !== initialState.bio ||
        title !== initialState.title ||
        githubUrl !== initialState.githubUrl ||
        linkedinUrl !== initialState.linkedinUrl ||
        portfolioUrl !== initialState.portfolioUrl ||
        JSON.stringify(languages) !== JSON.stringify(initialState.languages))
  );

  // Discard changes
  const handleDiscardChanges = () => {
    if (!initialState) return;
    setBio(initialState.bio);
    setTitle(initialState.title);
    setLanguages(initialState.languages);
    setGithubUrl(initialState.githubUrl);
    setLinkedinUrl(initialState.linkedinUrl);
    setPortfolioUrl(initialState.portfolioUrl);
    setSaveStatus(null);
  };

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      if (addToast) addToast("Please select a valid image file (PNG, JPG, WebP)", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (addToast) addToast("Image size must be under 5MB", "error");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsUploadingAvatar(true);
    try {
      const res = await uploadAvatar(formData);
      if (res.success) {
        const updatedUser = {
          ...user,
          avatar: res.avatar,
          avatarMetadata: res.avatarMetadata
        };
        if (setUser) setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (addToast) addToast("Avatar updated successfully", "success");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to upload avatar";
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Tag Management
  const handleAddLanguage = () => {
    const trimmed = langInput.trim().replace(/^,+|,+$/g, "");
    if (!trimmed) return;

    // Support comma-separated batch adding
    const newItems = trimmed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && !languages.includes(item));

    if (newItems.length > 0) {
      setLanguages((prev) => [...prev, ...newItems]);
    }
    setLangInput("");
  };

  const handleLangKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddLanguage();
    } else if (e.key === "Backspace" && !langInput && languages.length > 0) {
      setLanguages((prev) => prev.slice(0, -1));
    }
  };

  const handleRemoveLanguage = (indexToRemove) => {
    setLanguages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const payload = {
        bio: bio.trim(),
        title: title.trim() || "Developer",
        programmingLanguages: languages,
        githubUrl: githubUrl.trim(),
        linkedinUrl: linkedinUrl.trim(),
        portfolioUrl: portfolioUrl.trim()
      };

      const res = await updateUserProfile(payload);

      if (res.success && res.user) {
        const updatedUser = {
          ...user,
          ...res.user
        };
        if (setUser) setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        setInitialState({
          bio: updatedUser.bio || "",
          title: updatedUser.title || "",
          languages: updatedUser.programmingLanguages || [],
          githubUrl: updatedUser.githubUrl || "",
          linkedinUrl: updatedUser.linkedinUrl || "",
          portfolioUrl: updatedUser.portfolioUrl || ""
        });

        setSaveStatus({ type: "success", message: "Profile updated successfully" });
        if (addToast) addToast("Profile updated successfully", "success");

        // Clear inline message after 4s
        setTimeout(() => setSaveStatus(null), 4000);
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || "Unable to update your profile. Please try again.";
      setSaveStatus({ type: "error", message: errMsg });
      if (addToast) addToast(errMsg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for Initials Fallback
  const getInitials = () => {
    const name = user?.displayName || user?.username || "Dev";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="account-settings-wrapper">
      {/* 1. Header */}
      <div className="account-header-row">
        <div className="account-header-left">
          <h3 className="account-main-title">Account Profile</h3>
          <p className="account-main-subtitle">
            Manage your CodeExpo identity, developer profile, and public information.
          </p>
        </div>
      </div>

      {/* 2. Compact Profile Identity Card */}
      <div className="profile-identity-card">
        <div className="identity-card-left">
          <div className="avatar-preview-container">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.username || "Avatar"}
                className="avatar-img-preview"
              />
            ) : (
              <div
                className="avatar-initials-fallback"
                style={{ backgroundColor: getAvatarColor(user?.username), color: "#ffffff" }}
              >
                {getAvatarInitial(user?.username)}
              </div>
            )}
          </div>

          <div className="identity-info-block">
            <h4 className="identity-username-handle">
              @{user?.username || "developer"}
            </h4>
            <span className="identity-live-title">
              {title.trim() || user?.title || "Developer"}
            </span>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarFileChange}
          accept="image/png,image/jpeg,image/webp,image/jpg"
          style={{ display: "none" }}
        />

        <button
          type="button"
          className="avatar-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAvatar}
        >
          {isUploadingAvatar ? (
            <>
              <Loader2 size={13} className="spin-icon-small" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Camera size={13} />
              <span>Change Avatar</span>
            </>
          )}
        </button>
      </div>

      {/* 3. Basic Information Section */}
      <div className="account-section-card">
        <div className="section-card-header">
          <h4 className="section-header-title">
            <User size={15} className="section-icon" />
            <span>Basic Information</span>
          </h4>
        </div>

        <div className="account-form-grid">
          <div className="account-field">
            <label className="account-label">Username</label>
            <input
              type="text"
              value={user?.username || ""}
              disabled
              className="account-input"
            />
            <p className="field-hint-small">Username is unique to your CodeExpo account</p>
          </div>

          <div className="account-field">
            <label className="account-label">Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="account-input"
            />
            <p className="field-hint-small">Contact email associated with your login</p>
          </div>
        </div>

        <div className="account-field">
          <div className="account-field-header">
            <label className="account-label">Profile Bio</label>
            <span className="char-counter">{bio.length} / 250</span>
          </div>
          <textarea
            placeholder="Tell the community about your developer journey, projects, and focus areas..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={250}
            className="account-textarea"
          />
        </div>
      </div>

      {/* 4. Developer Profile Section */}
      <div className="account-section-card">
        <div className="section-card-header">
          <h4 className="section-header-title">
            <Briefcase size={15} className="section-icon" />
            <span>Developer Profile</span>
          </h4>
        </div>

        <div className="account-field">
          <label className="account-label">Professional Title</label>
          <input
            type="text"
            placeholder="e.g. Full Stack Developer, Systems Architect, UI Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="account-input"
          />
        </div>

        <div className="account-field">
          <label className="account-label">Programming Languages & Technologies</label>
          <div className="tags-input-box" onClick={() => document.getElementById("tech-tag-input")?.focus()}>
            {languages.map((lang, idx) => (
              <span key={idx} className="tag-badge-item">
                <span>{lang}</span>
                <button
                  type="button"
                  className="tag-remove-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLanguage(idx);
                  }}
                  title={`Remove ${lang}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              id="tech-tag-input"
              type="text"
              placeholder={languages.length === 0 ? "Type language & press Enter (e.g. React, Python, C++)" : "Add technology..."}
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={handleLangKeyDown}
              onBlur={handleAddLanguage}
              className="tag-native-input"
            />
          </div>
          <p className="field-hint-small">Press Enter or comma to add each technology tag</p>
        </div>
      </div>

      {/* 5. Professional Links Section (Optional) */}
      <div className="account-section-card">
        <div className="section-card-header">
          <h4 className="section-header-title">
            <Globe size={15} className="section-icon" />
            <span>Professional Links</span>
          </h4>
          <span className="section-optional-badge">Optional</span>
        </div>

        <div className="account-form-grid">
          <div className="account-field">
            <label className="account-label">GitHub</label>
            <input
              type="url"
              placeholder="https://github.com/username"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="account-input"
            />
          </div>

          <div className="account-field">
            <label className="account-label">LinkedIn</label>
            <input
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="account-input"
            />
          </div>
        </div>

        <div className="account-field">
          <label className="account-label">Portfolio Website</label>
          <input
            type="url"
            placeholder="https://yourportfolio.com"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            className="account-input"
          />
        </div>
      </div>

      {/* 6. Save Experience & Actions */}
      <div className="account-action-row">
        <div className="account-action-left">
          {hasUnsavedChanges && (
            <>
              <span className="unsaved-status-indicator">
                <AlertCircle size={13} />
                <span>You have unsaved changes</span>
              </span>
              <button
                type="button"
                className="discard-changes-link"
                onClick={handleDiscardChanges}
              >
                Discard
              </button>
            </>
          )}
        </div>

        <div className="account-action-right">
          {saveStatus && (
            <span className={`inline-msg-feedback ${saveStatus.type}`}>
              {saveStatus.type === "success" ? (
                <Check size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              <span>{saveStatus.message}</span>
            </span>
          )}

          <button
            type="button"
            className="account-save-btn"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="spin-icon-small" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Update Profile</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
