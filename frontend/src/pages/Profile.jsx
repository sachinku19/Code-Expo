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
import { useTheme } from "../context/ThemeContext";
import {
  X, Heart, Bookmark, Users, Sparkles, Terminal,
  Plus, FolderGit, Check, Copy, Lock, Globe, Clock, ArrowLeft, LogIn, MapPin,
  LayoutGrid, Activity
} from "lucide-react";
import ProfileAvatar from "../components/ProfileAvatar";
import "./Profile.css";

const INDIA_STATES = [
  { name: "J&K", d: "M 195,15 L 210,32 L 202,72 L 175,72 L 182,45 Z", labelX: 192, labelY: 42 },
  { name: "Rajasthan", d: "M 158,82 L 175,72 L 185,92 L 160,95 Z", labelX: 172, labelY: 86 },
  { name: "Gujarat", d: "M 138,122 L 142,108 L 160,95 L 160,112 L 152,125 Z", labelX: 147, labelY: 114 },
  { name: "Maharashtra", d: "M 152,125 L 160,112 L 175,130 L 182,145 L 168,145 Z", labelX: 168, labelY: 132 },
  { name: "Karnataka", d: "M 168,145 L 182,145 L 180,175 L 164,170 Z", labelX: 172, labelY: 160 },
  { name: "Kerala", d: "M 180,175 L 182,195 L 192,192 Z", labelX: 184, labelY: 186 },
  { name: "Tamil Nadu", d: "M 182,195 L 220,205 L 208,178 L 180,175 Z", labelX: 202, labelY: 190 },
  { name: "Andhra & TG", d: "M 180,175 L 208,178 L 212,145 L 182,145 Z", labelX: 198, labelY: 156 },
  { name: "Madhya Pradesh", d: "M 160,95 L 185,92 L 220,115 L 175,130 Z", labelX: 188, labelY: 112 },
  { name: "Uttar Pradesh", d: "M 175,72 L 198,45 L 225,92 L 185,92 Z", labelX: 204, labelY: 76 },
  { name: "West Bengal", d: "M 225,92 L 255,94 L 268,114 L 240,115 Z", labelX: 244, labelY: 104 },
  { name: "North East", d: "M 255,94 L 285,102 L 310,100 L 320,112 L 272,132 L 260,122 Z", labelX: 288, labelY: 112 }
];

const INDIA_CITIES = [
  { name: "Delhi", lat: 28.61, lon: 77.20, x: 195, y: 70 },
  { name: "Mumbai", lat: 19.07, lon: 72.87, x: 168, y: 135 },
  { name: "Bengaluru", lat: 12.97, lon: 77.59, x: 195, y: 172 },
  { name: "Hyderabad", lat: 17.38, lon: 78.48, x: 204, y: 142 },
  { name: "Chennai", lat: 13.08, lon: 80.27, x: 212, y: 178 },
  { name: "Kolkata", lat: 22.57, lon: 88.36, x: 268, y: 114 },
  { name: "Ahmedabad", lat: 23.02, lon: 72.57, x: 160, y: 112 },
  { name: "Pune", lat: 18.52, lon: 73.85, x: 172, y: 142 },
  { name: "Jaipur", lat: 26.91, lon: 75.78, x: 180, y: 92 },
  { name: "Kochi", lat: 9.93, lon: 76.26, x: 192, y: 192 },
  { name: "Guwahati", lat: 26.14, lon: 91.73, x: 295, y: 102 }
];

const findNearestCity = (lat, lon) => {
  let nearest = null;
  let minDist = Infinity;
  INDIA_CITIES.forEach(c => {
    const dist = Math.pow(c.lat - lat, 2) + Math.pow(c.lon - lon, 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = c;
    }
  });
  return nearest;
};

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
  const [locationInput, setLocationInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const { resolvedTheme } = useTheme();
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

  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      addToast("Geolocation is not supported by your browser", "error");
      return;
    }
    addToast("Locating your device...", "info");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb;
          const state = data.address?.state;
          let formatted = "";
          if (city && state) {
            formatted = `${city}, ${state}`;
          } else {
            const nearest = findNearestCity(latitude, longitude);
            formatted = nearest ? `${nearest.name}, India` : "Bengaluru, India";
          }
          setLocationInput(formatted);
          addToast(`Located: ${formatted}`, "success");
        } catch (err) {
          const nearest = findNearestCity(position.coords.latitude, position.coords.longitude);
          const formatted = nearest ? `${nearest.name}, India` : "Bengaluru, India";
          setLocationInput(formatted);
          addToast(`Located (nearest hub): ${formatted}`, "success");
        }
      },
      (error) => {
        addToast("Permission denied or failed to locate: " + error.message, "error");
      }
    );
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
    setLocationInput(profileUser?.location || "");
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile({
        bio: bioInput,
        programmingLanguages: langsInput,
        location: locationInput
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
      if (prevProfileUser) setProfileUser(prevProfileUser);
      setFollowersList(prevFollowersList);
      setFollowingList(prevFollowingList);
      if (prevAuthUser) setAuthUser(prevAuthUser);
    }
  };

  const handleLikeRoom = async (roomId) => {
    const currentUser = authUser;
    if (!currentUser) return;

    setAnimatingLikes(prev => ({ ...prev, [roomId]: true }));
    setTimeout(() => {
      setAnimatingLikes(prev => ({ ...prev, [roomId]: false }));
    }, 600);

    const prevLikedRooms = [...likedRooms];
    const prevHistoryRooms = [...historyRooms];
    const prevSavedRooms = [...savedRooms];
    const wasLiked = isRoomLiked(roomId);
    const isAdd = !wasLiked;

    // Optimistically toggle like state
    if (wasLiked) {
      setLikedRooms(prev => prev.filter(r => r && r.roomId !== roomId && r._id !== roomId));
    } else {
      const matchedRoom = historyRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        savedRooms.find(r => r && (r.roomId === roomId || r._id === roomId)) ||
        likedRooms.find(r => r && (r.roomId === roomId || r._id === roomId));
      if (matchedRoom) {
        const updatedMatched = { 
          ...matchedRoom, 
          likesCount: (matchedRoom.likesCount || 0) + 1,
          likedBy: [...(matchedRoom.likedBy || []), currentUser]
        };
        setLikedRooms(prev => [...prev, updatedMatched]);
      }
    }

    const toggleRoomInArray = (roomsArray) => {
      if (!roomsArray) return roomsArray;
      return roomsArray.map(r => {
        if (r && (r.roomId === roomId || r._id === roomId)) {
          const alreadyLiked = (r.likedBy || []).some(u => String(u._id || u) === String(currentUser.id || currentUser._id));
          let updatedLikedBy = r.likedBy || [];
          if (isAdd) {
            if (!alreadyLiked) updatedLikedBy = [...updatedLikedBy, currentUser];
          } else {
            updatedLikedBy = updatedLikedBy.filter(u => String(u._id || u) !== String(currentUser.id || currentUser._id));
          }
          return {
            ...r,
            likesCount: updatedLikedBy.length,
            likedBy: updatedLikedBy
          };
        }
        return r;
      });
    };

    setHistoryRooms(prev => toggleRoomInArray(prev));
    setSavedRooms(prev => toggleRoomInArray(prev));

    try {
      const res = await toggleLikeRoom(roomId);
      if (res.success) {
        addToast(res.message, "success");
        const likedRes = await getLikedRooms().catch(() => ({ success: false, rooms: [] }));
        if (likedRes.success) setLikedRooms(likedRes.rooms || []);
      } else {
        throw new Error(res.message || "Failed to toggle like");
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
      setLikedRooms(prevLikedRooms);
      setHistoryRooms(prevHistoryRooms);
      setSavedRooms(prevSavedRooms);
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
        addToast("Join request sent to room owner for approval", "success");
        return;
      }
      navigate(`/editor/${targetRoomId}`);
    } catch (error) {
      addToast(error.response?.data?.message || error.message, "error");
    }
  };

  const handleJoinRoomDirect = (targetRoomId) => {
    const room = historyRooms.find(r => r.roomId === targetRoomId) ||
      likedRooms.find(r => r.roomId === targetRoomId) ||
      savedRooms.find(r => r.roomId === targetRoomId) ||
      { roomId: targetRoomId, title: "Workspace Room" };

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
            {profileUser.location && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--ce-text-muted)", marginTop: "4px", marginBottom: "4px" }}>
                <MapPin size={12} style={{ color: "var(--ce-accent)" }} />
                <span>{profileUser.location}</span>
              </div>
            )}
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
                <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--ce-text-muted)" }}>Location</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="e.g. Bengaluru, Karnataka"
                      style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--ce-border)", borderRadius: "6px", background: resolvedTheme === "light" ? "#fff" : "rgba(255,255,255,0.03)", color: "var(--ce-text)", fontSize: "0.82rem" }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAutoLocate}
                      style={{
                        padding: "8px 12px",
                        background: "var(--ce-accent)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <MapPin size={12} /> Locate Me
                    </button>
                  </div>
                  {/* Interactive SVG India Selector Map */}
                  <div style={{ position: "relative", width: "100%", height: "200px", background: resolvedTheme === "light" ? "rgba(0,0,0,0.01)" : "rgba(255,255,255,0.01)", border: "1px solid var(--ce-border)", borderRadius: "8px", overflow: "hidden", marginTop: "4px" }}>
                    <span style={{ position: "absolute", top: "6px", left: "8px", fontSize: "0.6rem", fontWeight: "750", color: "var(--ce-text-muted)" }}>
                      CLICK ANY HUB TO CHOOSE LOCATION
                    </span>
                    <svg viewBox="120 10 220 200" style={{ width: "100%", height: "100%" }}>
                      {/* Indian States with Borders */}
                      {INDIA_STATES.map((state) => (
                        <path
                          key={state.name}
                          d={state.d}
                          fill={resolvedTheme === "light" ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.02)"}
                          stroke={resolvedTheme === "light" ? "rgba(15, 23, 42, 0.15)" : "rgba(255, 255, 255, 0.12)"}
                          strokeWidth="0.8"
                        />
                      ))}
                      {/* Indian States Labels */}
                      {INDIA_STATES.map((state) => (
                        <text
                          key={state.name}
                          x={state.labelX}
                          y={state.labelY}
                          fill={resolvedTheme === "light" ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.25)"}
                          fontSize="5"
                          fontWeight="650"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {state.name}
                        </text>
                      ))}
                      {INDIA_CITIES.map(city => {
                        const isSelected = locationInput.toLowerCase().includes(city.name.toLowerCase());
                        return (
                          <g key={city.name} style={{ cursor: "pointer" }} onClick={() => setLocationInput(`${city.name}, India`)}>
                            <circle
                              cx={city.x}
                              cy={city.y}
                              r={isSelected ? "6" : "3.5"}
                              fill={isSelected ? "var(--ce-accent)" : (resolvedTheme === "light" ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.4)")}
                              style={{ transition: "all 0.2s" }}
                            />
                            {isSelected && (
                              <circle cx={city.x} cy={city.y} r="12" fill="var(--ce-accent)" opacity="0.2">
                                <animate attributeName="r" values="6;14" dur="1.2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.7;0" dur="1.2s" repeatCount="indefinite" />
                              </circle>
                            )}
                            <text
                              x={city.x}
                              y={city.y - 7}
                              fill={isSelected ? "var(--ce-accent)" : "var(--ce-text-muted)"}
                              fontSize="6.5"
                              fontWeight="750"
                              textAnchor="middle"
                            >
                              {city.name}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
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
                    <LayoutGrid size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px" }} /> My Rooms ({myCreatedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "liked" ? "active" : ""}`}
                    onClick={() => setProfileTab("liked")}
                  >
                    <Heart size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px", fill: profileTab === "liked" ? "currentColor" : "none" }} /> Liked ({likedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "saved" ? "active" : ""}`}
                    onClick={() => setProfileTab("saved")}
                  >
                    <Bookmark size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px", fill: profileTab === "saved" ? "currentColor" : "none" }} /> Saved ({savedRooms.length})
                  </button>
                  <button
                    type="button"
                    className={`ce-pill-btn ${profileTab === "activity" ? "active" : ""}`}
                    onClick={() => setProfileTab("activity")}
                  >
                    <Activity size={14} className="ce-pill-tab-icon" style={{ marginRight: "6px" }} /> Recent Logs
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