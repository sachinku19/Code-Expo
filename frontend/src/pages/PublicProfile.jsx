import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPublicUserProfile } from "../services/authService";
import { toggleFollowUser } from "../services/socialService";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getAvatarColor, getAvatarInitial } from "../utils/avatarUtils";
import {
  Code2,
  User,
  MapPin,
  Calendar,
  Users,
  Award,
  ArrowLeft,
  Mail,
  MessageSquare,
  UserPlus,
  UserCheck,
  Terminal,
  Shield,
  LogIn,
  Heart,
  Bookmark,
  ExternalLink,
  Briefcase,
  Lock,
  Laptop
} from "lucide-react";
import { optimizeCloudinaryUrl } from "../utils/imageOptimizer";
import MainLayout from "../layouts/MainLayout";
import AuthPromptModal from "../components/modals/AuthPromptModal";
import "./PublicProfile.css";

const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { resolvedTheme } = useTheme();

  const [profileUser, setProfileUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const [authModalState, setAuthModalState] = useState({
    isOpen: false,
    title: "",
    subtitle: "",
    actionName: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await getPublicUserProfile(username);
        if (res && res.success && res.user) {
          setProfileUser(res.user);
          setFollowersCount(res.user.followersCount || 0);
          if (authUser && res.user.followers) {
            const isUserFollowing = res.user.followers.some(
              (f) => String(f._id || f.id || f) === String(authUser._id || authUser.id)
            );
            setIsFollowing(isUserFollowing);
          }
        } else {
          setErrorMsg("User profile not found");
        }
      } catch (err) {
        console.error("Error fetching public user profile:", err);
        setErrorMsg("User profile not found or unavailable");
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username, authUser]);

  const isOwnProfile = authUser && profileUser && (
    String(authUser._id || authUser.id) === String(profileUser._id || profileUser.id) ||
    (authUser.username && profileUser.username && authUser.username.toLowerCase() === profileUser.username.toLowerCase())
  );

  // Gated action check: prompts AuthPromptModal if guest
  const requireAuth = (title, subtitle, actionName) => {
    if (!authUser) {
      setAuthModalState({
        isOpen: true,
        title: title || "Sign in to CodeExpo",
        subtitle: subtitle || "Join the developer network to interact with developers, follow profiles, and collaborate on code.",
        actionName: actionName || "interact"
      });
      return false;
    }
    return true;
  };

  const handleFollowToggle = async () => {
    if (!profileUser) return;
    if (!requireAuth(
      `Sign in to follow @${profileUser.username}`,
      `Stay updated with @${profileUser.username}'s latest code projects, posts, and rooms.`,
      `follow @${profileUser.username}`
    )) return;

    try {
      if (isFollowing) {
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
      await toggleFollowUser(profileUser._id || profileUser.id);
    } catch (err) {
      console.error("Error toggling follow status:", err);
    }
  };

  // Render complete LinkedIn-style profile UI
  const renderProfileBody = () => {
    if (isLoading) {
      return (
        <div className="pub-profile-loading">
          <div className="pub-spinner" />
          <span>Loading developer profile...</span>
        </div>
      );
    }

    if (errorMsg || !profileUser) {
      return (
        <div className="pub-profile-error-card">
          <Shield size={40} className="error-shield-icon" />
          <h2>Profile Not Found</h2>
          <p>The developer handle <code>@{username}</code> does not exist or has not set up a profile yet.</p>
          <button className="pub-back-home-btn" onClick={() => navigate("/")}>
            <ArrowLeft size={16} /> Back to CodeExpo
          </button>
        </div>
      );
    }

    const displayName = profileUser.displayName || profileUser.username || "Developer";

    return (
      <div className="pub-profile-container">
        {/* Top Header for Non-Logged-In Guest Visitors */}
        {!authUser && (
          <header className="pub-guest-header">
            <div className="pub-guest-brand" onClick={() => navigate("/")}>
              <div className="pub-brand-logo">
                <Code2 size={20} />
              </div>
              <span className="pub-brand-name">CodeExpo</span>
            </div>
            <div className="pub-guest-actions">
              <Link to="/login" className="pub-login-link">Sign In</Link>
              <Link to="/register" className="pub-register-btn">Join CodeExpo</Link>
            </div>
          </header>
        )}

        {/* Hero Card Banner & Identity */}
        <div className="pub-hero-card">
          <div
            className="pub-cover-banner"
            style={{ background: profileUser.coverBanner ? `url(${optimizeCloudinaryUrl(profileUser.coverBanner, { quality: "best", width: 1200 })}) center/cover` : undefined }}
          >
            <div className="pub-banner-overlay" />
          </div>

          <div className="pub-hero-content">
            <div className="pub-avatar-container">
              {profileUser.avatar ? (
                <img src={optimizeCloudinaryUrl(profileUser.avatar, { quality: "best", width: 160, height: 160, crop: "fill" })} alt={displayName} className="pub-avatar-img" />
              ) : (
                <div className="pub-avatar-fallback" style={{ backgroundColor: getAvatarColor(profileUser.username) }}>
                  {(profileUser.username || "D").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="pub-identity-meta">
              <div className="pub-name-row">
                <h1 className="pub-display-name">{displayName}</h1>
                {profileUser.title && (
                  <span className="pub-title-badge">{profileUser.title}</span>
                )}
              </div>
              <div className="pub-handle-badge">@{profileUser.username}</div>

              {profileUser.bio && (
                <p className="pub-bio-text">{profileUser.bio}</p>
              )}

              <div className="pub-meta-list">
                {profileUser.location && (
                  <div className="pub-meta-item">
                    <MapPin size={14} />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {isOwnProfile && profileUser.email && (
                  <div className="pub-meta-item">
                    <Mail size={14} />
                    <span>{profileUser.email}</span>
                  </div>
                )}
                <div className="pub-meta-item">
                  <Calendar size={14} />
                  <span>Joined CodeExpo</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pub-actions-bar">
              {isOwnProfile ? (
                <button
                  className="pub-edit-profile-btn"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    className={`pub-action-btn ${isFollowing ? "secondary" : "primary"}`}
                    onClick={handleFollowToggle}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck size={15} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} /> Follow
                      </>
                    )}
                  </button>
                  <button
                    className="pub-action-btn secondary"
                    onClick={(e) => {
                      if (e && e.preventDefault) e.preventDefault();
                      if (!requireAuth(
                        `Sign in to message @${profileUser.username}`,
                        `Start a conversation and collaborate on code directly with @${profileUser.username}.`,
                        `message @${profileUser.username}`
                      )) return;
                      navigate(`/dashboard/messages?user=${profileUser._id || profileUser.id}`);
                    }}
                  >
                    <MessageSquare size={15} /> Message
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="pub-stats-row">
          <div
            className="pub-stat-box clickable"
            onClick={() => {
              requireAuth(
                "Sign in to view followers",
                "Explore developer networks and followers across CodeExpo.",
                "view followers"
              );
            }}
            title={!authUser ? "Sign in to view followers" : undefined}
          >
            <span className="pub-stat-num">{followersCount}</span>
            <span className="pub-stat-label">Followers</span>
          </div>
          <div
            className="pub-stat-box clickable"
            onClick={() => {
              requireAuth(
                "Sign in to view following",
                "Explore developer networks and following connections.",
                "view following"
              );
            }}
            title={!authUser ? "Sign in to view following" : undefined}
          >
            <span className="pub-stat-num">{profileUser.followingCount || 0}</span>
            <span className="pub-stat-label">Following</span>
          </div>
          <div className="pub-stat-box">
            <span className="pub-stat-num">{profileUser.executionsCount || 0}</span>
            <span className="pub-stat-label">Code Executions</span>
          </div>
          <div className="pub-stat-box">
            <span className="pub-stat-num">{profileUser.codingHours || 0}h</span>
            <span className="pub-stat-label">Coding Time</span>
          </div>
        </div>

        {/* Tech Stack / Programming Languages */}
        {profileUser.programmingLanguages && profileUser.programmingLanguages.length > 0 && (
          <div className="pub-section-card">
            <h3 className="pub-section-title">
              <Terminal size={16} /> Programming Languages & Tech Stack
            </h3>
            <div className="pub-skills-wrap">
              {profileUser.programmingLanguages.map((lang) => (
                <span key={lang} className="pub-skill-chip">{lang}</span>
              ))}
            </div>
          </div>
        )}

        {/* Public Workspaces & Projects Shared */}
        <div className="pub-section-card">
          <h3 className="pub-section-title">
            <Briefcase size={16} /> Public Workspaces & Work
          </h3>
          {profileUser.projectsShared && profileUser.projectsShared.length > 0 ? (
            <div className="pub-rooms-grid">
              {profileUser.projectsShared.map((project, idx) => (
                <div
                  key={idx}
                  className="pub-room-card"
                  onClick={() => {
                    if (!requireAuth("Sign in to join room", "Join collaborative developer rooms and code together in real-time.", "join room")) return;
                    if (project.roomId) navigate(`/editor/${project.roomId}`);
                  }}
                >
                  <div className="pub-room-card-header">
                    <h4>{project.name || project.title || "Workspace Room"}</h4>
                    <span className="pub-lang-tag">{project.language || "code"}</span>
                  </div>
                  <p>{project.description || "Real-time collaborative code room."}</p>
                  <div className="pub-room-card-footer">
                    <button className="pub-join-room-btn">
                      {!authUser ? <Lock size={13} /> : <ExternalLink size={13} />} Open Room
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pub-empty-box">
              <Code2 size={24} />
              <span>No public work shared yet.</span>
            </div>
          )}
        </div>

        {/* Reusable Auth Gate Modal for Guests */}
        <AuthPromptModal
          isOpen={authModalState.isOpen}
          onClose={() => setAuthModalState(prev => ({ ...prev, isOpen: false }))}
          title={authModalState.title}
          subtitle={authModalState.subtitle}
          actionName={authModalState.actionName}
        />
      </div>
    );
  };

  // If user is authenticated, wrap inside MainLayout
  if (authUser) {
    return (
      <MainLayout activeTab="profile">
        <div className="pub-page-wrapper authenticated">
          {renderProfileBody()}
        </div>
      </MainLayout>
    );
  }

  // Guest View
  return (
    <div className={`pub-page-wrapper guest ${resolvedTheme}`}>
      {renderProfileBody()}
    </div>
  );
};

export default PublicProfile;
