import { motion } from "framer-motion";
import { X, MapPin, Briefcase, GraduationCap, Globe, Sparkles, Award, Star, Eye } from "lucide-react";

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

export default function UserProfileModal({ profile, stats, onClose }) {
  if (!profile) return null;

  // Render dummy achievements badges
  const achievements = [
    { title: "Early Adopter", desc: "Joined CodeExpo in Beta", color: "#8b5cf6" },
    { title: "Code Master", desc: "Executed 100+ code blocks", color: "#10b981" },
    { title: "Open Source Hero", desc: "Shared 5+ projects", color: "#06b6d4" },
    { title: "Top Mentor", desc: "Helped 10+ developers", color: "#fbbf24" }
  ];

  // Render dummy experience
  const experiences = [
    { role: "Software Engineer", company: profile.company || "Self-Employed", period: "2024 - Present" },
    { role: "Open Source Contributor", company: "GitHub Ecosystem", period: "2022 - 2024" }
  ];



  return (
    <div className="ce-modal-overlay public-profile-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        className="public-profile-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="profile-close-btn" aria-label="Close profile">
          <X size={18} />
        </button>

        {/* Cover Banner */}
        <div 
          className="profile-cover-banner" 
          style={{ 
            background: profile.coverBanner || "linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.4) 100%)",
            height: "120px",
            position: "relative"
          }}
        >
          <div className="profile-banner-sparkle">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Avatar and Identity Header */}
        <div className="profile-identity-section">
          <div className="profile-avatar-overlap-wrapper">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="profile-large-avatar" />
            ) : (
              <div className="profile-large-avatar-fallback">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="profile-name-meta">
            <h3 className="profile-fullname">@{profile.username}</h3>
            <span className="profile-level-badge">Developer Level {profile.developerLevel || 1}</span>
            <p className="profile-title">{profile.title || "Developer"}</p>
          </div>
        </div>

        {/* Info Grid (Company, Location, College, Links) */}
        <div className="profile-info-pill-grid">
          <div className="info-pill-item">
            <Briefcase size={12} />
            <span>{profile.company || "Independent Builder"}</span>
          </div>
          <div className="info-pill-item">
            <MapPin size={12} />
            <span>{profile.location || "Earth"}</span>
          </div>
          <div className="info-pill-item">
            <GraduationCap size={12} />
            <span>{profile.college || "CodeAcademy"}</span>
          </div>
          
          {/* Social Links Row */}
          <div className="profile-socials-row">
            {profile.githubUrl && (
              <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <GithubIcon size={14} />
              </a>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="social-icon-link">
                <LinkedinIcon size={14} />
              </a>
            )}
            <a href={profile.portfolioUrl || "#"} className="social-icon-link">
              <Globe size={14} />
            </a>
          </div>
        </div>

        {/* Main Sections Scrollable */}
        <div className="profile-content-scrollable">
          
          {/* About Section */}
          <div className="profile-section-card">
            <h4>About Me</h4>
            <p className="about-bio-text">{profile.bio || "This developer has not set a custom professional biography details yet."}</p>
            {profile.careerGoals && (
              <div style={{ marginTop: "10px" }}>
                <strong>Career Goal:</strong> <span style={{ color: "var(--ce-text)", fontSize: "0.75rem" }}>{profile.careerGoals}</span>
              </div>
            )}
          </div>

          {/* Skills Matrix (Progress Bars) */}
          <div className="profile-section-card">
            <h4>Programming Languages & Core Skills</h4>
            <div className="skills-progress-grid">
              {profile.programmingLanguages && profile.programmingLanguages.length > 0 ? (
                profile.programmingLanguages.map(lang => (
                  <div key={lang} className="skill-progress-bar-wrapper">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", marginBottom: "4px" }}>
                      <span>{lang}</span>
                      <span>85%</span>
                    </div>
                    <div className="progress-bg-track">
                      <div className="progress-fill-active" style={{ width: "85%" }} />
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: "0.75rem", color: "var(--ce-text-muted)" }}>No skills listed yet.</p>
              )}
            </div>
          </div>

          {/* Achievements Badges */}
          <div className="profile-section-card">
            <h4>Achievements & Badges</h4>
            <div className="achievements-badges-row">
              {achievements.map(ach => (
                <div key={ach.title} className="achievement-badge-pill" style={{ borderColor: ach.color }}>
                  <Award size={14} style={{ color: ach.color }} />
                  <div>
                    <h6>{ach.title}</h6>
                    <span>{ach.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
