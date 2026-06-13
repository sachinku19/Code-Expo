import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/authService";
import { getUserRoomsHistory, getActivityFeed } from "../services/roomService";
import {
  getFollowers,
  getFollowing,
  getLikedRooms,
  getBookmarkedRooms,
  toggleFollowUser,
  removeFollower,
  toggleLikeRoom,
  toggleBookmarkRoom
} from "../services/socialService";
import { updateUserProfile } from "../services/userService";
import {
  X, Heart, Bookmark, Users, Sparkles, Terminal,
  Plus, FolderGit, Check, Copy, Lock, Globe, Clock, ArrowLeft
} from "lucide-react";
import ProfileAvatar from "../components/ProfileAvatar";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuth();

  const [profileUser, setProfileUser] = useState(null);
  const [historyRooms, setHistoryRooms] = useState([]);
  const [likedRooms, setLikedRooms] = useState([]);
  const [savedRooms, setSavedRooms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [animatingLikes, setAnimatingLikes] = useState({});
  const isRoomLiked = (roomId) => {
    return likedRooms.some(lr => lr && (lr.roomId === roomId || lr._id === roomId));
  };

  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const [bioInput, setBioInput] = useState("");
  const [langsInput, setLangsInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState("rooms");
  const [copiedId, setCopiedId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchProfileData = async () => {
    try {
      const data = await getUserProfile();
      setProfileUser(data.user);
      setBioInput(data.user.bio || "");
      setLangsInput((data.user.programmingLanguages || []).join(", "));

      const [roomsRes, likedRes, savedRes, actRes, followersRes, followingRes] = await Promise.all([
        getUserRoomsHistory().catch(() => ({ rooms: [] })),
        getLikedRooms().catch(() => ({ rooms: [] })),
        getBookmarkedRooms().catch(() => ({ rooms: [] })),
        getActivityFeed().catch(() => ({ activities: [] })),
        getFollowers(data.user._id).catch(() => ({ success: false, followers: [] })),
        getFollowing(data.user._id).catch(() => ({ success: false, following: [] }))
      ]);

      setHistoryRooms(roomsRes.rooms || []);
      setLikedRooms(likedRes.rooms || []);
      setSavedRooms(savedRes.rooms || []);
      setActivities(actRes.activities || []);

      if (followersRes.success) setFollowersList(followersRes.followers || []);
      if (followingRes.success) setFollowingList(followingRes.following || []);
    } catch (error) {
      console.error("Failed to load profile data:", error);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const startEditingProfile = () => {
    setBioInput(profileUser?.bio || "");
    setLangsInput((profileUser?.programmingLanguages || []).join(", "));
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    try {
      const res = await updateUserProfile({
        bio: bioInput,
        programmingLanguages: langsInput
      });
      if (res.success) {
        addToast("Profile updated successfully", "success");
        setProfileUser(res.user);
        setAuthUser(res.user);
        localStorage.setItem("user", JSON.stringify(res.user));
        setIsEditingProfile(false);
        fetchProfileData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    }
  };

  const handleRemoveFollower = async (followerId) => {
    const prevProfileUser = profileUser ? { ...profileUser } : null;
    const prevFollowersList = [...followersList];
    const prevAuthUser = authUser ? { ...authUser } : null;

    // Optimistically remove follower
    setFollowersList(prev => prev.filter(f => String(f._id || f) !== String(followerId)));
    if (profileUser) {
      setProfileUser(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1) }));
    }
    if (authUser) {
      setAuthUser(prev => ({ ...prev, followersCount: Math.max(0, (prev.followersCount || 1) - 1) }));
    }

    try {
      const res = await removeFollower(followerId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background sync
        const [followersRes, profileRes] = await Promise.all([
          getFollowers(profileUser._id).catch(() => ({ success: false, followers: [] })),
          getUserProfile().catch(() => ({ success: false }))
        ]);
        if (followersRes.success) setFollowersList(followersRes.followers || []);
        if (profileRes.success) {
          setProfileUser(profileRes.user);
          setAuthUser(profileRes.user);
          localStorage.setItem("user", JSON.stringify(profileRes.user));
        }
      } else {
        throw new Error(res.message || "Failed to remove follower");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      if (prevProfileUser) setProfileUser(prevProfileUser);
      setFollowersList(prevFollowersList);
      if (prevAuthUser) setAuthUser(prevAuthUser);
    }
  };

  const handleFollowToggle = async (candidateId) => {
    const prevProfileUser = profileUser ? { ...profileUser } : null;
    const prevFollowersList = [...followersList];
    const prevFollowingList = [...followingList];
    const prevAuthUser = authUser ? { ...authUser } : null;

    const isFollowing = followingList.some(f => String(f._id || f) === String(candidateId));
    let targetUser = followersList.find(f => String(f._id || f) === String(candidateId)) ||
                     followingList.find(f => String(f._id || f) === String(candidateId)) ||
                     { _id: candidateId, username: "Developer" };

    // Optimistically toggle following state
    if (isFollowing) {
      setFollowingList(prev => prev.filter(f => String(f._id || f) !== String(candidateId)));
      if (profileUser) {
        setProfileUser(prev => ({ ...prev, followingCount: Math.max(0, (prev.followingCount || 1) - 1) }));
      }
      if (authUser) {
        setAuthUser(prev => ({ ...prev, followingCount: Math.max(0, (prev.followingCount || 1) - 1) }));
      }
    } else {
      const newFollowItem = { ...targetUser };
      setFollowingList(prev => [...prev, newFollowItem]);
      if (profileUser) {
        setProfileUser(prev => ({ ...prev, followingCount: (prev.followingCount || 0) + 1 }));
      }
      if (authUser) {
        setAuthUser(prev => ({ ...prev, followingCount: (prev.followingCount || 0) + 1 }));
      }
    }

    try {
      const res = await toggleFollowUser(candidateId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background sync
        const [followingRes, profileRes] = await Promise.all([
          getFollowing(profileUser._id).catch(() => ({ success: false, following: [] })),
          getUserProfile().catch(() => ({ success: false }))
        ]);
        if (followingRes.success) setFollowingList(followingRes.following || []);
        if (profileRes.success) {
          setProfileUser(profileRes.user);
          setAuthUser(profileRes.user);
          localStorage.setItem("user", JSON.stringify(profileRes.user));
        }
      } else {
        throw new Error(res.message || "Failed to update follow status");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      if (prevProfileUser) setProfileUser(prevProfileUser);
      setFollowersList(prevFollowersList);
      setFollowingList(prevFollowingList);
      if (prevAuthUser) setAuthUser(prevAuthUser);
    }
  };

  const handleLikeRoom = async (roomId) => {
    setAnimatingLikes(prev => ({ ...prev, [roomId]: true }));
    setTimeout(() => {
      setAnimatingLikes(prev => ({ ...prev, [roomId]: false }));
    }, 600);

    const prevLikedRooms = [...likedRooms];
    const prevHistoryRooms = [...historyRooms];
    const prevSavedRooms = [...savedRooms];
    const wasLiked = isRoomLiked(roomId);

    // Optimistically toggle like state
    if (wasLiked) {
      setLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        savedRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        likedRooms.find(r => r && (r.roomId === roomId || r._id === roomId));
      if (matchedRoom) {
        setLikedRooms(prev => [...prev, { ...matchedRoom, likesCount: (matchedRoom.likesCount || 0) + 1 }]);
      }
    }

    const updateLikesCount = (roomsArray) =>
      roomsArray.map(r => {
        if (r && (r.roomId === roomId || r._id === roomId)) {
          return {
            ...r,
            likesCount: Math.max(0, (r.likesCount || 0) + (wasLiked ? -1 : 1))
          };
        }
        return r;
      });

    setHistoryRooms(prev => updateLikesCount(prev));
    setSavedRooms(prev => updateLikesCount(prev));

    try {
      const res = await toggleLikeRoom(roomId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background sync
        const likedRes = await getLikedRooms().catch(() => ({ success: false, rooms: [] }));
        if (likedRes.success) setLikedRooms(likedRes.rooms || []);
      } else {
        throw new Error(res.message || "Failed to toggle like");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      setLikedRooms(prevLikedRooms);
      setHistoryRooms(prevHistoryRooms);
      setSavedRooms(prevSavedRooms);
    }
  };

  const handleBookmarkRoom = async (roomId) => {
    const prevSavedRooms = [...savedRooms];
    const isBookmarked = savedRooms.some(r => r && (r.roomId === roomId || r._id === roomId));

    // Optimistically toggle bookmark state
    if (isBookmarked) {
      setSavedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r.roomId === roomId) ||
        likedRooms.find(r => r.roomId === roomId);
      if (matchedRoom) {
        setSavedRooms(prev => [...prev, matchedRoom]);
      }
    }

    try {
      const res = await toggleBookmarkRoom(roomId);
      if (res.success) {
        addToast(res.message, "success");
        // Silent background sync
        const savedRes = await getBookmarkedRooms().catch(() => ({ success: false, rooms: [] }));
        if (savedRes.success) setSavedRooms(savedRes.rooms || []);
      } else {
        throw new Error(res.message || "Failed to toggle bookmark");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      // Rollback on failure
      setSavedRooms(prevSavedRooms);
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
      "#ec4899", "#14b8a6", "#6366f1", "#06b6d4", "#84cc16"
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getBadgeStyle = (title) => {
    const t = (title || "").toLowerCase();
    if (t === "system admin") {
      return {
        background: "linear-gradient(135deg, #ef4444 0%, #aa3bff 100%)",
        color: "#fff",
        boxShadow: "0 0 12px rgba(170, 59, 255, 0.5)",
        border: "1px solid rgba(239, 68, 68, 0.5)"
      };
    }
    if (t.includes("legendary")) {
      return {
        background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
        color: "#fff",
        boxShadow: "0 0 10px rgba(244, 63, 94, 0.4)"
      };
    }
    if (t.includes("admin") || t.includes("architect")) {
      return {
        background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
        color: "#fff"
      };
    }
    if (t.includes("elite")) {
      return {
        background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)",
        color: "#000"
      };
    }
    if (t.includes("senior")) {
      return {
        background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
        color: "#fff"
      };
    }
    return {
      background: "rgba(255, 255, 255, 0.08)",
      color: "var(--ce-text)",
      border: "1px solid var(--ce-border)"
    };
  };

  const formatLastActive = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!profileUser) {
    return <div className="profile-loading" style={{ color: "var(--ce-text)", textAlign: "center", padding: "100px" }}>Loading Portfolio profile...</div>;
  }

  const myCreatedRooms = historyRooms.filter(
    r => r.createdBy?._id === profileUser._id || r.createdBy === profileUser._id
  );

  return (
    <div className="profile-page-main-wrapper" style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      <div className="profile-page-header-nav" style={{ marginBottom: "20px" }}>
        <button onClick={() => navigate("/dashboard")} className="profile-back-btn" style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--ce-primary)", cursor: "pointer", fontWeight: "600", fontSize: "0.9rem" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="profile-container">
        <div className="github-profile-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px", width: "100%" }}>

          {/* Profile Sidebar */}
          <div className="profile-sidebar-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ProfileAvatar />
            <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--ce-text)", marginTop: "12px", marginBottom: "2px" }}>{profileUser.username}</h2>
            <span className="profile-email" style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)", marginBottom: "12px" }}>{profileUser.email}</span>
            <span
              className="profile-badge"
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: "12px",
                fontWeight: "700",
                ...getBadgeStyle(profileUser.title)
              }}
            >
              {profileUser.title || "Developer"}
            </span>

            <div className="profile-social-stats" style={{ display: "flex", gap: "16px", marginTop: "20px", borderTop: "1px solid var(--ce-border)", borderBottom: "1px solid var(--ce-border)", width: "100%", padding: "12px 0", justifyContent: "space-around" }}>
              <div className="profile-stat-click" onClick={() => setShowFollowersModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--ce-text)" }}>{profileUser.followersCount || 0}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>Followers</span>
              </div>
              <div className="profile-stat-click" onClick={() => setShowFollowingModal(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--ce-text)" }}>{profileUser.followingCount || 0}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)" }}>Following</span>
              </div>
            </div>

            {isEditingProfile ? (
              <div className="profile-edit-form-card" style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: "16px" }}>
                <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Bio</label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Write a bio..."
                    style={{ width: "100%", minHeight: "60px", background: "rgba(128, 128, 128, 0.08)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem", resize: "none" }}
                  />
                </div>
                <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.72rem", color: "var(--ce-text-muted)", fontWeight: "600" }}>Languages</label>
                  <input
                    type="text"
                    value={langsInput}
                    onChange={(e) => setLangsInput(e.target.value)}
                    placeholder="e.g. JavaScript, Python"
                    style={{ width: "100%", background: "rgba(128, 128, 128, 0.08)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", padding: "8px", fontSize: "0.8rem" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="profile-edit-save-btn" onClick={handleSaveProfile} style={{ flex: 1, padding: "6px", background: "var(--ce-primary)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600" }}>
                    Save
                  </button>
                  <button className="profile-edit-cancel-btn" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "6px", background: "rgba(128, 128, 128, 0.12)", color: "var(--ce-text)", border: "1px solid var(--ce-border)", borderRadius: "4px", cursor: "pointer", fontSize: "0.78rem" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: "100%" }}>
                <p className="profile-bio-text" style={{ fontSize: "0.78rem", color: "var(--ce-text-muted)", marginTop: "16px", textAlign: "center", fontStyle: "italic", lineHeight: "1.4" }}>
                  {profileUser.bio || "No bio set yet. Write something about your developer experience!"}
                </p>
                {profileUser.programmingLanguages?.length > 0 && (
                  <div className="profile-languages-chips" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "12px", justifyContent: "center" }}>
                    {profileUser.programmingLanguages.map(lang => (
                      <span key={lang} className="lang-chip-badge" style={{ fontSize: "0.62rem", padding: "2px 6px", background: "rgba(88, 166, 255, 0.08)", color: "var(--ce-primary)", borderRadius: "4px", border: "1px solid rgba(88, 166, 255, 0.15)", fontWeight: "600" }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
                <button className="profile-edit-trigger-btn" onClick={startEditingProfile} style={{ width: "100%", marginTop: "20px", padding: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--ce-border)", borderRadius: "6px", color: "var(--ce-text)", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Main profile content */}
          <div className="profile-main-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Heatmap Widget */}
            <div className="profile-sec-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "16px" }}>
              <h3 style={{ display: "flex", justifyContent: "space-between", margin: "0 0 12px 0", fontSize: "0.92rem", fontWeight: "600" }}>
                <span>Contribution Heatmap Stats</span>
                <span style={{ fontSize: "0.72rem", fontWeight: "normal", color: "var(--ce-text-muted)" }}>Last 52 Days</span>
              </h3>
              <div className="mock-heatmap-grid">
                {Array.from({ length: 52 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="heatmap-box level-0"
                    title="0 activities logged"
                  />
                ))}
              </div>
              <div className="heatmap-legend" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", fontSize: "0.68rem", color: "var(--ce-text-muted)", marginTop: "8px" }}>
                <span>Less</span>
                <div className="heatmap-box level-0" />
                <div className="heatmap-box level-1" />
                <div className="heatmap-box level-2" />
                <div className="heatmap-box level-3" />
                <span>More</span>
              </div>
            </div>

            {/* Achievements Card */}
            <div className="profile-sec-card">
              <h3>Achievements</h3>
              <div className="achievements-container">
                <div className="achievement-badge-card">
                  <Sparkles size={14} className="badge-icon gold" />
                  <span>Creator Pro</span>
                </div>
                <div className="achievement-badge-card">
                  <Users size={14} className="badge-icon blue" />
                  <span>Team Player</span>
                </div>
                <div className="achievement-badge-card">
                  <Terminal size={14} className="badge-icon green" />
                  <span>Script Master</span>
                </div>
              </div>
            </div>

            {/* Tabs details */}
            <div className="profile-tabs-container" style={{ marginTop: "12px" }}>
              <div className="profile-tabs-header" style={{ display: "flex", gap: "16px", borderBottom: "1px solid var(--ce-border)", paddingBottom: "8px", marginBottom: "16px" }}>
                <button className={`profile-tab-btn ${profileTab === "rooms" ? "active" : ""}`} onClick={() => setProfileTab("rooms")} style={{ background: "none", border: "none", color: profileTab === "rooms" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: profileTab === "rooms" ? "2px solid var(--ce-primary)" : "none", cursor: "pointer", outline: "none" }}>
                  My Rooms ({myCreatedRooms.length})
                </button>
                <button className={`profile-tab-btn ${profileTab === "liked" ? "active" : ""}`} onClick={() => setProfileTab("liked")} style={{ background: "none", border: "none", color: profileTab === "liked" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: profileTab === "liked" ? "2px solid var(--ce-primary)" : "none", cursor: "pointer", outline: "none" }}>
                  Liked ({likedRooms.length})
                </button>
                <button className={`profile-tab-btn ${profileTab === "saved" ? "active" : ""}`} onClick={() => setProfileTab("saved")} style={{ background: "none", border: "none", color: profileTab === "saved" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: profileTab === "saved" ? "2px solid var(--ce-primary)" : "none", cursor: "pointer", outline: "none" }}>
                  Saved ({savedRooms.length})
                </button>
                <button className={`profile-tab-btn ${profileTab === "activity" ? "active" : ""}`} onClick={() => setProfileTab("activity")} style={{ background: "none", border: "none", color: profileTab === "activity" ? "var(--ce-primary)" : "var(--ce-text-muted)", fontWeight: "600", fontSize: "0.85rem", paddingBottom: "6px", borderBottom: profileTab === "activity" ? "2px solid var(--ce-primary)" : "none", cursor: "pointer", outline: "none" }}>
                  Recent Logs
                </button>
              </div>

              <div className="profile-tab-content">
                {profileTab === "rooms" && (
                  <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                    {myCreatedRooms.length === 0 ? (
                      <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No rooms created yet.</p>
                    ) : (
                      myCreatedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => navigate(`/editor/${room.roomId}`)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer", position: "relative" }}>
                          <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                          <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                          <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>ID: {room.roomId}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                            <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>{new Date(room.createdAt).toLocaleDateString()}</span>
                            <div style={{ display: "flex", gap: "6px" }} onClick={e => e.stopPropagation()}>
                              <button
                                className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                                onClick={() => handleLikeRoom(room.roomId)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: isRoomLiked(room.roomId) ? "var(--ce-danger, #f85149)" : "var(--ce-text)",
                                  padding: "2px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "color 0.35s ease, transform 0.2s ease"
                                }}
                              >
                                <Heart
                                  size={12}
                                  fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                  style={{
                                    transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                                  }}
                                />
                              </button>
                              <button onClick={() => handleBookmarkRoom(room.roomId)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ce-text-muted)", padding: "2px" }}><Bookmark size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "liked" && (
                  <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                    {likedRooms.length === 0 ? (
                      <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No liked rooms.</p>
                    ) : (
                      likedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => navigate(`/editor/${room.roomId}`)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer" }}>
                          <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                          <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                          <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>By {room.createdBy?.username || "Developer"}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                            <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>Liked</span>
                            <button
                              className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""}`}
                              onClick={(e) => { e.stopPropagation(); handleLikeRoom(room.roomId); }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--ce-danger, #f85149)",
                                padding: "2px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                transition: "color 0.35s ease, transform 0.2s ease"
                              }}
                            >
                              <Heart
                                size={12}
                                fill="currentColor"
                                style={{
                                  transition: "fill 0.35s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.35s ease"
                                }}
                              />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "saved" && (
                  <div className="profile-rooms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", alignItems: "start" }}>
                    {savedRooms.length === 0 ? (
                      <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No bookmarked rooms.</p>
                    ) : (
                      savedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => navigate(`/editor/${room.roomId}`)} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", padding: "12px", cursor: "pointer" }}>
                          <span className="room-lang-badge" style={{ float: "right", fontSize: "0.62rem", padding: "1px 5px", background: "rgba(255,255,255,0.05)", borderRadius: "3px", color: "var(--ce-text-muted)" }}>{room.language?.toUpperCase()}</span>
                          <h4 style={{ margin: "0 0 6px 0", color: "var(--ce-text)", fontSize: "0.82rem" }}>🚀 {room.title}</h4>
                          <p style={{ margin: "0", fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>By {room.createdBy?.username || "Developer"}</p>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                            <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)" }}>Saved</span>
                            <button onClick={(e) => { e.stopPropagation(); handleBookmarkRoom(room.roomId); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ce-primary, #58a6ff)", padding: "2px" }}><Bookmark size={12} fill="currentColor" /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "activity" && (
                  <div className="profile-activity-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {activities.filter(a => String(a.username) === String(profileUser.username)).length === 0 ? (
                      <p style={{ color: "var(--ce-text-muted)", fontSize: "0.78rem" }}>No recent activity logged.</p>
                    ) : (
                      activities.filter(a => String(a.username) === String(profileUser.username)).slice(0, 10).map(act => (
                        <div key={act._id} className="profile-activity-item" style={{ padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", fontSize: "0.75rem", color: "var(--ce-text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>You {act.action} room <strong>{act.roomTitle}</strong></span>
                          <span style={{ fontSize: "0.68rem" }}>{formatLastActive(act.timestamp)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Followers list modal */}
      {showFollowersModal && (
        <div className="ce-modal-overlay" onClick={() => setShowFollowersModal(false)} style={{ zIndex: 10000 }}>
          <div className="ce-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "400px", maxWidth: "90%" }}>
            <button className="modal-close-btn" onClick={() => setShowFollowersModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-new">
              <span className="modal-label-tag">Social Graph</span>
              <h3 className="modal-title-new">Followers ({followersList.length})</h3>
            </div>
            <div className="modal-members-section" style={{ marginTop: "16px" }}>
              <div className="members-list-scrollable" style={{ maxHeight: "300px" }}>
                {followersList.length === 0 ? (
                  <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>No followers yet.</p>
                ) : (
                  followersList.map(item => {
                    const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                    return (
                      <div key={item._id} className="modal-member-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.username} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(item.username), fontSize: "0.7rem", fontWeight: "600", color: "#fff" }}>
                              {item.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.username}</span>
                            <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.bio || "No bio"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => handleFollowToggle(item._id)}
                            style={{
                              padding: "4px 8px",
                              background: isFollowingUser ? "rgba(255, 255, 255, 0.05)" : "rgba(88, 166, 255, 0.1)",
                              border: isFollowingUser ? "1px solid var(--ce-border)" : "1px solid rgba(88, 166, 255, 0.2)",
                              borderRadius: "4px",
                              color: isFollowingUser ? "var(--ce-text-muted)" : "var(--ce-primary)",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                          >
                            {isFollowingUser ? "Following" : "Follow Back"}
                          </button>
                          <button
                            onClick={() => handleRemoveFollower(item._id)}
                            style={{ padding: "4px 8px", background: "rgba(248, 81, 73, 0.1)", border: "1px solid rgba(248, 81, 73, 0.2)", borderRadius: "4px", color: "var(--ce-danger, #f85149)", fontSize: "0.7rem", cursor: "pointer", fontWeight: "600" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Following list modal */}
      {showFollowingModal && (
        <div className="ce-modal-overlay" onClick={() => setShowFollowingModal(false)} style={{ zIndex: 10000 }}>
          <div className="ce-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "400px", maxWidth: "90%" }}>
            <button className="modal-close-btn" onClick={() => setShowFollowingModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-new">
              <span className="modal-label-tag">Social Graph</span>
              <h3 className="modal-title-new">Following ({followingList.length})</h3>
            </div>
            <div className="modal-members-section" style={{ marginTop: "16px" }}>
              <div className="members-list-scrollable" style={{ maxHeight: "300px" }}>
                {followingList.length === 0 ? (
                  <p style={{ color: "var(--ce-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px" }}>Not following anyone yet.</p>
                ) : (
                  followingList.map(item => {
                    const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                    return (
                      <div key={item._id} className="modal-member-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", background: "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "6px", marginBottom: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.username} style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: getAvatarColor(item.username), fontSize: "0.7rem", fontWeight: "600", color: "#fff" }}>
                              {item.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--ce-text)", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.username}</span>
                            <span style={{ fontSize: "0.68rem", color: "var(--ce-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.bio || "No bio"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowToggle(item._id)}
                          style={{
                            padding: "4px 8px",
                            background: isFollowingUser ? "rgba(255, 255, 255, 0.05)" : "rgba(88, 166, 255, 0.1)",
                            border: isFollowingUser ? "1px solid var(--ce-border)" : "1px solid rgba(88, 166, 255, 0.2)",
                            borderRadius: "4px",
                            color: isFollowingUser ? "var(--ce-text-muted)" : "var(--ce-primary)",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            fontWeight: "600"
                          }}
                        >
                          {isFollowingUser ? "Following" : "Follow"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification overlay */}
      <div className="ce-toast-notifications-stack" style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 99999999, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`ce-toast-alert ${t.type}`}
            style={{
              pointerEvents: "auto",
              background: "rgba(10, 10, 15, 0.95)",
              border: t.type === "error" ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(16, 185, 129, 0.5)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: "250px",
              maxWidth: "350px"
            }}
          >
            <div className="toast-bullet" style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: t.type === "error" ? "#ef4444" : "#10b981" }} />
            <div className="toast-message-text" style={{ flex: 1 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;