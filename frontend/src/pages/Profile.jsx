import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../services/authService";
import { getUserRoomsHistory, getActivityFeed, joinRoom } from "../services/roomService";
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
  Plus, FolderGit, Check, Copy, Lock, Globe, Clock, ArrowLeft, LogIn
} from "lucide-react";
import ProfileAvatar from "../components/ProfileAvatar";
import "./Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, setUser: setAuthUser } = useAuth();
  const pendingLikesRef = useRef(new Set());
  const pendingFollowsRef = useRef(new Set());
  const pendingBookmarksRef = useRef(new Set());

  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
  const [showJoinConfirmModal, setShowJoinConfirmModal] = useState(false);
  const [joinTargetRoom, setJoinTargetRoom] = useState(null);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

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
    setIsSavingProfile(true);
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
    } finally {
      setIsSavingProfile(false);
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
    if (pendingFollowsRef.current.has(candidateId)) return;
    pendingFollowsRef.current.add(candidateId);

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
    } finally {
      pendingFollowsRef.current.delete(candidateId);
    }
  };

  const handleLikeRoom = async (roomId) => {
    if (pendingLikesRef.current.has(roomId)) return;
    pendingLikesRef.current.add(roomId);

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
    } finally {
      pendingLikesRef.current.delete(roomId);
    }
  };

  const handleBookmarkRoom = async (roomId) => {
    if (pendingBookmarksRef.current.has(roomId)) return;
    pendingBookmarksRef.current.add(roomId);

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
    } finally {
      pendingBookmarksRef.current.delete(roomId);
    }
  };

  const proceedJoinRoom = async (targetRoomId) => {
    try {
      const data = await joinRoom(targetRoomId);
      if (data.requiresApproval) {
        alert("Join request sent to room owner for approval");
        return;
      }
      navigate(`/editor/${targetRoomId}`);
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleJoinRoomDirect = (targetRoomId) => {
    const room = historyRooms.find(r => r.roomId === targetRoomId) ||
      likedRooms.find(r => r.roomId === targetRoomId) ||
      savedRooms.find(r => r.roomId === targetRoomId) ||
      { roomId: targetRoomId, title: "Workspace Room" };

    const isOwner = room.createdBy === authUser?.id || room.createdBy?._id === authUser?.id || room.createdBy === authUser?._id || room.createdBy?._id === authUser?._id;
    const isParticipant = room.participants?.some(p => {
      const pId = p.user?._id || p.user?.id || p.user || p._id || p;
      return String(pId) === String(authUser?.id || authUser?._id);
    });

    if (isOwner || isParticipant) {
      navigate(`/editor/${targetRoomId}`);
      return;
    }

    setJoinTargetRoom(room);
    setShowJoinConfirmModal(true);
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
    return <div className="profile-loading">Loading Portfolio profile...</div>;
  }

  const myCreatedRooms = historyRooms.filter(
    r => r.createdBy?._id === profileUser._id || r.createdBy === profileUser._id
  );

  return (
    <div className="profile-page-main-wrapper">
      <div className="profile-page-header-nav">
        <button onClick={() => navigate("/dashboard")} className="profile-back-btn">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="profile-container">
        <div className="github-profile-layout">

          {/* Profile Sidebar */}
          <div className="profile-sidebar-card">
            <ProfileAvatar />
            <h2>{profileUser.username}</h2>
            <span className="profile-email">{profileUser.email}</span>
            <span
              className="profile-badge"
              style={getBadgeStyle(profileUser.title)}
            >
              {profileUser.title || "Developer"}
            </span>

            <div className="profile-social-stats">
              <div className="profile-stat-click" onClick={() => setShowFollowersModal(true)}>
                <strong>{profileUser.followersCount || 0}</strong>
                <span>Followers</span>
              </div>
              <div className="profile-stat-click" onClick={() => setShowFollowingModal(true)}>
                <strong>{profileUser.followingCount || 0}</strong>
                <span>Following</span>
              </div>
            </div>

            {isEditingProfile ? (
              <div className="profile-edit-form-card">
                <div className="form-field">
                  <label>Bio</label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Write a bio..."
                  />
                </div>
                <div className="form-field">
                  <label>Languages</label>
                  <input
                    type="text"
                    value={langsInput}
                    onChange={(e) => setLangsInput(e.target.value)}
                    placeholder="e.g. JavaScript, Python"
                  />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="profile-edit-save-btn" onClick={handleSaveProfile} disabled={isSavingProfile}>
                    {isSavingProfile ? "Saving..." : "Save"}
                  </button>
                  <button className="profile-edit-cancel-btn" onClick={() => setIsEditingProfile(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ width: "100%" }}>
                <p className="profile-bio-text">
                  {profileUser.bio || "No bio set yet. Write something about your developer experience!"}
                </p>
                {profileUser.programmingLanguages?.length > 0 && (
                  <div className="profile-languages-chips">
                    {profileUser.programmingLanguages.map(lang => (
                      <span key={lang} className="lang-chip-badge">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
                <button className="profile-edit-trigger-btn" onClick={startEditingProfile}>
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Main profile content */}
          <div className="profile-main-body">

            {/* Heatmap Widget */}
            <div className="profile-sec-card">
              <h3>
                <span>Contribution Heatmap Stats</span>
                <span className="heatmap-subtext">Last 52 Days</span>
              </h3>
              <div className="mock-heatmap-grid">
                {Array.from({ length: 52 }).map((_, idx) => {
                  const levelVal = idx % 7 === 0 ? 3 : idx % 5 === 0 ? 2 : idx % 11 === 0 ? 4 : idx % 3 === 0 ? 1 : 0;
                  const pts = levelVal * 15;
                  const d = new Date();
                  d.setDate(d.getDate() - (51 - idx));
                  const dateString = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                  return (
                    <div
                      key={idx}
                      className={`heatmap-box level-${levelVal}`}
                    >
                      <div className="heatmap-tooltip">
                        <span className="tooltip-pts">{pts} contributions</span>
                        <span className="tooltip-date">on {dateString}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="heatmap-legend">
                <span>Less</span>
                <div className="heatmap-box level-0" />
                <div className="heatmap-box level-1" />
                <div className="heatmap-box level-2" />
                <div className="heatmap-box level-3" />
                <div className="heatmap-box level-4" />
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
            <div className="profile-tabs-container">
              {/* Segmented Pill Switcher with Round Sliding Background */}
              <div className="ce-pill-switcher-container">
                <div className="ce-pill-switcher" style={{ maxWidth: "680px" }}>
                  <div
                    className="ce-pill-bg-slide"
                    style={{
                      width: "calc(25% - 2px)",
                      transform: `translateX(${(profileTab === "rooms" ? 0 : profileTab === "liked" ? 1 : profileTab === "saved" ? 2 : 3) * 100}%)`
                    }}
                  />
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "rooms" ? "active" : ""}`}
                    onClick={() => setProfileTab("rooms")}
                  >
                    My Rooms ({myCreatedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "liked" ? "active" : ""}`}
                    onClick={() => setProfileTab("liked")}
                  >
                    Liked ({likedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "saved" ? "active" : ""}`}
                    onClick={() => setProfileTab("saved")}
                  >
                    Saved ({savedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "activity" ? "active" : ""}`}
                    onClick={() => setProfileTab("activity")}
                  >
                    Recent Logs
                  </button>
                </div>
              </div>

              <div className="profile-tab-content">
                {profileTab === "rooms" && (
                  <div className="profile-rooms-grid">
                    {myCreatedRooms.length === 0 ? (
                      <p className="profile-rooms-empty-msg">No rooms created yet.</p>
                    ) : (
                      myCreatedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                          <div className="profile-room-card-header">
                            <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                            <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                          </div>
                          <p className="profile-room-card-id">ID: {room.roomId}</p>
                          <div className="profile-room-card-footer">
                            <div className="profile-room-card-footer-left">
                              <span className="profile-room-card-date">{new Date(room.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                              {room.likedBy && room.likedBy.length > 0 && (
                                <div className="card-likes-avatars-stack">
                                  {room.likedBy.slice(0, 3).map((u, i) => (
                                    <div
                                      key={i}
                                      className="avatar-stack-item"
                                      style={{
                                        marginLeft: i > 0 ? "-6px" : "0",
                                        zIndex: 10 - i
                                      }}
                                    >
                                      {u.avatar ? (
                                        <img src={u.avatar} alt={u.username} />
                                      ) : (
                                        <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                          {(u.username || "D").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {room.likedBy.length > 3 && (
                                    <span className="avatar-stack-more">
                                      +{room.likedBy.length - 3}
                                    </span>
                                  )}
                                  <div className="likes-tooltip">
                                    <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                    <div className="likes-tooltip-list">
                                      {room.likedBy.map((u, idx) => (
                                        <div key={idx} className="likes-tooltip-user">
                                          {u.avatar ? (
                                            <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                          ) : (
                                            <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                              {(u.username || "D").charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="likes-tooltip-username">{u.username}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <button
                                type="button"
                                className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                onClick={() => handleLikeRoom(room.roomId)}
                              >
                                <Heart
                                  size={12}
                                  fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                />
                                <span className="like-count-text">{room.likesCount || 0}</span>
                              </button>
                              <button className="profile-room-bookmark-btn" onClick={() => handleBookmarkRoom(room.roomId)}><Bookmark size={12} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "liked" && (
                  <div className="profile-rooms-grid">
                    {likedRooms.length === 0 ? (
                      <p className="profile-rooms-empty-msg">No liked rooms.</p>
                    ) : (
                      likedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                          <div className="profile-room-card-header">
                            <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                            <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                          </div>
                          <p className="profile-room-card-author">By {room.createdBy?.username || "Developer"}</p>
                          <div className="profile-room-card-footer">
                            <div className="profile-room-card-footer-left">
                              <span className="profile-room-card-status-text">Liked</span>
                            </div>
                            <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                              {room.likedBy && room.likedBy.length > 0 && (
                                <div className="card-likes-avatars-stack">
                                  {room.likedBy.slice(0, 3).map((u, i) => (
                                    <div
                                      key={i}
                                      className="avatar-stack-item"
                                      style={{
                                        marginLeft: i > 0 ? "-6px" : "0",
                                        zIndex: 10 - i
                                      }}
                                    >
                                      {u.avatar ? (
                                        <img src={u.avatar} alt={u.username} />
                                      ) : (
                                        <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                          {(u.username || "D").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {room.likedBy.length > 3 && (
                                    <span className="avatar-stack-more">
                                      +{room.likedBy.length - 3}
                                    </span>
                                  )}
                                  <div className="likes-tooltip">
                                    <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                    <div className="likes-tooltip-list">
                                      {room.likedBy.map((u, idx) => (
                                        <div key={idx} className="likes-tooltip-user">
                                          {u.avatar ? (
                                            <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                          ) : (
                                            <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                              {(u.username || "D").charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="likes-tooltip-username">{u.username}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <button
                                type="button"
                                className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                onClick={() => handleLikeRoom(room.roomId)}
                              >
                                <Heart
                                  size={12}
                                  fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                />
                                <span className="like-count-text">{room.likesCount || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "saved" && (
                  <div className="profile-rooms-grid">
                    {savedRooms.length === 0 ? (
                      <p className="profile-rooms-empty-msg">No bookmarked rooms.</p>
                    ) : (
                      savedRooms.map(room => (
                        <div key={room.roomId} className="profile-room-card" onClick={() => handleJoinRoomDirect(room.roomId)}>
                          <div className="profile-room-card-header">
                            <h4 className="profile-room-card-title">🚀 {room.title}</h4>
                            <span className="room-lang-badge">{room.language?.toUpperCase()}</span>
                          </div>
                          <p className="profile-room-card-author">By {room.createdBy?.username || "Developer"}</p>
                          <div className="profile-room-card-footer">
                            <div className="profile-room-card-footer-left">
                              <span className="profile-room-card-status-text">Saved</span>
                            </div>
                            <div className="profile-room-card-footer-right" onClick={e => e.stopPropagation()}>
                              {room.likedBy && room.likedBy.length > 0 && (
                                <div className="card-likes-avatars-stack">
                                  {room.likedBy.slice(0, 3).map((u, i) => (
                                    <div
                                      key={i}
                                      className="avatar-stack-item"
                                      style={{
                                        marginLeft: i > 0 ? "-6px" : "0",
                                        zIndex: 10 - i
                                      }}
                                    >
                                      {u.avatar ? (
                                        <img src={u.avatar} alt={u.username} />
                                      ) : (
                                        <div className="avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                          {(u.username || "D").charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {room.likedBy.length > 3 && (
                                    <span className="avatar-stack-more">
                                      +{room.likedBy.length - 3}
                                    </span>
                                  )}
                                  <div className="likes-tooltip">
                                    <div className="likes-tooltip-title">Liked by ({room.likedBy.length})</div>
                                    <div className="likes-tooltip-list">
                                      {room.likedBy.map((u, idx) => (
                                        <div key={idx} className="likes-tooltip-user">
                                          {u.avatar ? (
                                            <img src={u.avatar} alt={u.username} className="likes-tooltip-avatar" />
                                          ) : (
                                            <div className="likes-tooltip-avatar-fallback" style={{ backgroundColor: getAvatarColor(u.username || "D") }}>
                                              {(u.username || "D").charAt(0).toUpperCase()}
                                            </div>
                                          )}
                                          <span className="likes-tooltip-username">{u.username}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                              <button
                                type="button"
                                className={`ce-like-btn-animated ${animatingLikes[room.roomId] ? "heart-pop-active" : ""} ${isRoomLiked(room.roomId) ? "liked" : ""}`}
                                onClick={() => handleLikeRoom(room.roomId)}
                              >
                                <Heart
                                  size={12}
                                  fill={isRoomLiked(room.roomId) ? "currentColor" : "transparent"}
                                />
                                <span className="like-count-text">{room.likesCount || 0}</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleBookmarkRoom(room.roomId); }} className="profile-room-bookmark-btn active"><Bookmark size={12} fill="currentColor" /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {profileTab === "activity" && (
                  <div className="profile-activity-list">
                    {activities.filter(a => String(a.username) === String(profileUser.username)).length === 0 ? (
                      <p className="profile-rooms-empty-msg">No recent activity logged.</p>
                    ) : (
                      activities.filter(a => String(a.username) === String(profileUser.username)).slice(0, 10).map(act => (
                        <div key={act._id} className="profile-activity-item">
                          <span>You {act.action} room <strong>{act.roomTitle}</strong></span>
                          <span className="activity-time-text">{formatLastActive(act.timestamp)}</span>
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
      {showFollowersModal && createPortal(
        <div className="ce-modal-overlay" onClick={() => setShowFollowersModal(false)}>
          <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowFollowersModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-new">
              <span className="modal-label-tag">Social Graph</span>
              <h3 className="modal-title-new">Followers ({followersList.length})</h3>
            </div>
            <div className="modal-members-section">
              <div className="members-list-scrollable">
                {followersList.length === 0 ? (
                  <p className="modal-empty-msg">No followers yet.</p>
                ) : (
                  followersList.map(item => {
                    const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                    return (
                      <div key={item._id} className="modal-member-card">
                        <div className="modal-member-info">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.username} className="modal-member-avatar-img" />
                          ) : (
                            <div className="modal-member-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.username) }}>
                              {item.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="modal-member-meta">
                            <span className="modal-member-name">{item.username}</span>
                            <span className="modal-member-bio">{item.bio || "No bio"}</span>
                          </div>
                        </div>
                        <div className="modal-member-actions">
                          <button
                            onClick={() => handleFollowToggle(item._id)}
                            className={`modal-follow-btn ${isFollowingUser ? "following" : "follow-back"}`}
                          >
                            {isFollowingUser ? "Following" : "Follow Back"}
                          </button>
                          <button
                            onClick={() => handleRemoveFollower(item._id)}
                            className="modal-remove-btn"
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
        </div>,
        document.body
      )}

      {/* Following list modal */}
      {showFollowingModal && createPortal(
        <div className="ce-modal-overlay" onClick={() => setShowFollowingModal(false)}>
          <div className="ce-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowFollowingModal(false)}>
              <X size={18} />
            </button>
            <div className="modal-header-new">
              <span className="modal-label-tag">Social Graph</span>
              <h3 className="modal-title-new">Following ({followingList.length})</h3>
            </div>
            <div className="modal-members-section">
              <div className="members-list-scrollable">
                {followingList.length === 0 ? (
                  <p className="modal-empty-msg">Not following anyone yet.</p>
                ) : (
                  followingList.map(item => {
                    const isFollowingUser = followingList.some(f => String(f._id || f) === String(item._id));
                    return (
                      <div key={item._id} className="modal-member-card">
                        <div className="modal-member-info">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.username} className="modal-member-avatar-img" />
                          ) : (
                            <div className="modal-member-avatar-placeholder" style={{ backgroundColor: getAvatarColor(item.username) }}>
                              {item.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="modal-member-meta">
                            <span className="modal-member-name">{item.username}</span>
                            <span className="modal-member-bio">{item.bio || "No bio"}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollowToggle(item._id)}
                          className={`modal-follow-btn ${isFollowingUser ? "following" : "follow"}`}
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
        </div>,
        document.body
      )}

      {/* Join Confirmation Modal */}
      {showJoinConfirmModal && joinTargetRoom && createPortal(
        <div className="ce-modal-overlay" onClick={() => {
          if (!isJoiningRoom) {
            setShowJoinConfirmModal(false);
            setJoinTargetRoom(null);
          }
        }}>
          <div className="ce-modal-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
            {!isJoiningRoom ? (
              <>
                <div className="modal-icon-circle info">
                  <LogIn size={32} />
                </div>
                <h2 className="modal-confirm-title">Join Workspace?</h2>
                <p className="modal-confirm-desc">
                  Are you sure you want to join <strong>{joinTargetRoom.title}</strong>? You will connect to this collaborative sandbox.
                </p>
                <div className="modal-confirm-actions">
                  <button
                    className="ce-btn-secondary"
                    type="button"
                    onClick={() => {
                      setShowJoinConfirmModal(false);
                      setJoinTargetRoom(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="ce-btn-primary"
                    type="button"
                    onClick={async () => {
                      setIsJoiningRoom(true);
                      const roomId = joinTargetRoom.roomId;
                      try {
                        await proceedJoinRoom(roomId);
                      } catch (error) {
                        console.error("Join room error:", error);
                      } finally {
                        setIsJoiningRoom(false);
                        setJoinTargetRoom(null);
                        setShowJoinConfirmModal(false);
                      }
                    }}
                  >
                    Yes, Join Room
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-loader-container">
                <div className="modal-roller-spinner">
                  <div></div><div></div><div></div><div></div>
                  <div></div><div></div><div></div><div></div>
                </div>
                <h4 className="modal-loader-text">Connecting to Workspace...</h4>
                <p className="modal-loader-subtext">Establishing secure collaborative synchronization channels</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Floating Toast Notification overlay */}
      {createPortal(
        <div className="ce-toast-notifications-stack">
          {toasts.map(t => (
            <div key={t.id} className={`ce-toast-alert ${t.type}`}>
              <div className="toast-bullet" />
              <div className="toast-message-text">{t.message}</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;