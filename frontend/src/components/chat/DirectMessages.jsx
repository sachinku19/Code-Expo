/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket/socket";
import { getFollowers, getFollowing, searchUsers } from "../../services/socialService";
import {
  getConversations,
  getChatHistory,
  sendDirectMessage,
  sendDirectMessageAttachment,
  deleteDirectMessage,
  clearChatHistory,
  blockUser,
  unblockUser,
  deleteGroupChat,
  addGroupMember,
  removeGroupMember,
  updateGroupChat,
  promoteGroupAdmin,
  demoteGroupAdmin
} from "../../services/directMessageService";
import {
  Send, User, MessageSquare, Search, Plus, ArrowLeft,
  Phone, Video, X, ArrowUpRight, ArrowDownLeft,
  Check, CheckCheck, Trash2, Image, Code2, Sliders, MoreVertical, Info, Users, Ban, ShieldAlert,
  Shield, Edit2
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import { optimizeCloudinaryUrl, getCloudinarySrcSet } from "../../utils/imageOptimizer";
import "./DirectMessages.css";
import ReportUserModal from "../social/ReportUserModal";



const formatChatDate = (dateString) => {
  const messageDate = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return "Today";
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
};

const renderCallHistory = (msg, currentUserId) => {
  const isMe = String(msg.sender?._id || msg.sender) === String(currentUserId);
  let callDetails = { callType: "audio", status: "completed", duration: 0 };
  try {
    callDetails = JSON.parse(msg.message);
  } catch {
    if (msg.message && msg.message.toLowerCase().includes("video")) {
      callDetails.callType = "video";
    }
  }

  const { callType, status, duration } = callDetails;
  const isOutgoing = isMe;
  let statusText;
  const isMissed = status === "missed" || status === "declined";

  if (isMissed) {
    statusText = isOutgoing ? "No answer" : (status === "declined" ? "Declined" : "Missed call");
  } else {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durStr = duration > 0 ? ` (${mins}:${secs.toString().padStart(2, "0")})` : "";
    statusText = (isOutgoing ? "Outgoing" : "Incoming") + durStr;
  }

  const isVideo = callType === "video";
  const isIncomingMissed = isMissed && !isOutgoing;

  return (
    <div className={`call-history-bubble-inner ${isIncomingMissed ? "missed" : ""}`}>
      <div className="call-history-left">
        <div className={`call-history-icon-circle ${isIncomingMissed ? "missed" : "completed"}`}>
          {isVideo ? <Video size={16} /> : <Phone size={16} />}
        </div>
      </div>
      <div className="call-history-center">
        <span className="call-history-title">{isVideo ? "Video Call" : "Voice Call"}</span>
        <span className="call-history-status-row">
          <span className="call-history-arrow">
            {isOutgoing ? (
              <ArrowUpRight size={14} className={isMissed ? "arrow-missed" : "arrow-completed"} />
            ) : (
              <ArrowDownLeft size={14} className={isMissed ? "arrow-missed" : "arrow-completed"} />
            )}
          </span>
          <span className="call-history-status-text">{statusText}</span>
        </span>
      </div>
    </div>
  );
};

function SafeAvatar({ src, name, className = "user-avatar", isGroup = false, size = 44, userId }) {
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const displayName = name || "User";
  const firstChar = displayName.trim().charAt(0).toUpperCase();

  const handleAvatarClick = (e) => {
    if (isGroup || !userId) return;
    e.stopPropagation();
    if (window.handleGlobalProfileNav) {
      window.handleGlobalProfileNav(userId, displayName);
    } else {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserId = storedUser.id || storedUser._id;
        if (String(userId) === String(currentUserId)) {
          navigate("/dashboard/profile");
          return;
        }
      } catch (err) {}
      
      if (displayName && displayName !== "User") {
        navigate(`/u/${displayName}`);
      } else {
        navigate(`/dashboard/profile/${userId}`);
      }
    }
  };

  if (isGroup && !src) {
    return (
      <div className="group-avatar-icon-box">
        <Users size={size > 36 ? 18 : 14} className="group-avatar-icon" />
      </div>
    );
  }

  if (!src || imgError) {
    return (
      <div
        className="user-avatar-placeholder"
        onClick={handleAvatarClick}
        title={isGroup ? "" : `View @${displayName}'s profile`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size > 36 ? "1.1rem" : "0.85rem",
          overflow: "hidden",
          flexShrink: 0,
          cursor: isGroup ? "default" : "pointer"
        }}
      >
        {firstChar}
      </div>
    );
  }

  return (
    <img
      src={optimizeCloudinaryUrl(src, { quality: "best", width: size * 2, height: size * 2, crop: "fill" })}
      alt={displayName}
      className={className}
      onError={() => setImgError(true)}
      onClick={handleAvatarClick}
      title={isGroup ? "" : `View @${displayName}'s profile`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        cursor: isGroup ? "default" : "pointer"
      }}
    />
  );
}

function formatLastMessageText(lastMsg) {
  if (!lastMsg) return "No messages yet";
  let text = lastMsg.text || lastMsg.message || "";
  if (lastMsg.fileUrl && !text) return "📷 Attachment";

  if (typeof text === "string" && text.trim().startsWith('{"callType"')) {
    try {
      const parsed = JSON.parse(text);
      const isVideo = parsed.callType === "video";
      const isMissed = parsed.status === "missed" || parsed.status === "declined";
      if (isMissed) {
        return isVideo ? "📹 Missed Video Call" : "📞 Missed Voice Call";
      }
      return isVideo ? "📹 Video Call" : "📞 Voice Call";
    } catch {
      return "📞 Call Log";
    }
  }

  return text || (lastMsg.fileUrl ? "📷 Attachment" : "No messages yet");
}

export default function DirectMessages({ preselectedUser, onChatLoaded, onViewProfile, addToast }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  // Report user states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedTargetUser, setReportedTargetUser] = useState(null);
  const [reportEvidenceType, setReportEvidenceType] = useState("");
  const [reportEvidenceId, setReportEvidenceId] = useState("");
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [deleteModalMsg, setDeleteModalMsg] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const confirmDeleteMessage = async (msgObj, mode) => {
    if (!msgObj) return;
    const msgId = msgObj._id;
    setDeleteModalMsg(null);

    // Optimistic UI update: instantly hide message locally (<1ms)
    setMessages((prev) => {
      const next = prev.filter((m) => m._id !== msgId);
      if (activeChatRef.current) {
        const key = activeChatRef.current._id || activeChatRef.current.id;
        chatHistoryCacheRef.current[key] = next;
      }
      return next;
    });

    try {
      await deleteDirectMessage(msgId, mode);
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // Show clear chat confirmation popup
  const handleClearChat = () => {
    setShowChatMenu(false);
    setShowClearConfirm(true);
  };

  // Confirm and perform clear chat history from my side only
  const confirmClearChat = async () => {
    if (!activeChat) return;
    const targetId = activeChat._id || activeChat.id;
    setShowClearConfirm(false);
    
    // Clear messages locally immediately
    setMessages([]);
    if (activeChatRef.current) {
      const key = activeChatRef.current._id || activeChatRef.current.id;
      chatHistoryCacheRef.current[key] = [];
    }
    
    try {
      await clearChatHistory(targetId);
      if (addToast) addToast("Chat history cleared from your side", "success");
    } catch (err) {
      console.error("Error clearing chat history:", err);
      if (addToast) addToast("Failed to clear chat history", "error");
    }
  };

  // Conversations list & active chat state (Instant zero-delay refresh cache)
  const [conversations, setConversations] = useState(() => {
    try {
      const globalCached = localStorage.getItem("ce_global_conversations_cache");
      if (globalCached) {
        const parsed = JSON.parse(globalCached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const uid = storedUser?.id || storedUser?._id;
      if (uid) {
        const userCached = localStorage.getItem(`ce_conversations_${uid}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.error("Cache init error:", e);
    }
    return [];
  });
  const [activeChat, setActiveChat] = useState(null); // Partner user or group object

  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(() => {
    try {
      const globalCached = localStorage.getItem("ce_global_conversations_cache");
      if (globalCached) {
        const parsed = JSON.parse(globalCached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const uid = storedUser?.id || storedUser?._id;
      if (uid) {
        const userCached = localStorage.getItem(`ce_conversations_${uid}`);
        if (userCached) {
          const parsed = JSON.parse(userCached);
          if (Array.isArray(parsed) && parsed.length > 0) return false;
        }
      }
    } catch (e) {}
    return true;
  });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Search & filter tab states
  const [convSearchQuery, setConvSearchQuery] = useState("");
  const [selectedSubTab, setSelectedSubTab] = useState("all");

  // New chat modal/dropdown state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [candidates, setCandidates] = useState([]); // Followers + Following
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Group creation states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupBio, setGroupBio] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]); // Array of follower/following User IDs
  const [groupAvatar, setGroupAvatar] = useState(null); // Avatar File
  const [groupAvatarPreview, setGroupAvatarPreview] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [codeLang, setCodeLang] = useState("javascript");

  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTypers, setPartnerTypers] = useState([]); // array of { userId, username, avatar }

  // Refs
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  const inputRef = useRef(null);
  const chatHistoryCacheRef = useRef({});
  const prevChatIdRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const prevTypersCountRef = useRef(0);
  const justLoadedHistoryRef = useRef(false);

  // Attachment states
  const [attachment, setAttachment] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const currentUserIdRef = useRef(currentUserId);
  const preselectedUserRef = useRef(preselectedUser);

  const activeChatId = activeChat?._id || activeChat?.id;

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showGroupInfoPanel, setShowGroupInfoPanel] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [isEditingGroupBio, setIsEditingGroupBio] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [editedGroupBio, setEditedGroupBio] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    if (!showChatMenu) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest(".chat-header-actions")) {
        setShowChatMenu(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showChatMenu]);

  // Close message options menu on outside click
  useEffect(() => {
    if (!activeMessageMenuId) return;
    const handleOutsideMessageClick = (e) => {
      if (!e.target.closest(".message-bubble-actions")) {
        setActiveMessageMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideMessageClick);
    return () => {
      document.removeEventListener("click", handleOutsideMessageClick);
    };
  }, [activeMessageMenuId]);

  // Compute block status reactively
  const isChatBlocked = useMemo(() => {
    if (!activeChat || activeChat.isGroup) return false;
    if (activeChat.isBlocked) return true;
    const conv = conversations.find(c => !c.isGroup && String(c.user?._id || c.user?.id) === String(activeChat._id));
    return !!conv?.user?.isBlocked;
  }, [activeChat, conversations]);

  const hasChatBlockedMe = useMemo(() => {
    if (!activeChat || activeChat.isGroup) return false;
    if (activeChat.hasBlockedMe) return true;
    const conv = conversations.find(c => !c.isGroup && String(c.user?._id || c.user?.id) === String(activeChat._id));
    return !!conv?.user?.hasBlockedMe;
  }, [activeChat, conversations]);

  useEffect(() => {
    activeChatRef.current = activeChat;
    setShowChatMenu((prev) => (prev ? false : prev));
    setShowGroupInfoPanel((prev) => (prev ? false : prev));
    setPartnerTypers((prev) => (prev.length > 0 ? [] : prev));

    // Clear all typing timeouts
    Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    typingTimeoutsRef.current = {};
  }, [activeChat]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    preselectedUserRef.current = preselectedUser;
  }, [preselectedUser]);

  // Load candidates on mount and modal trigger
  useEffect(() => {
    if (currentUserId) {
      const loadCandidates = async () => {
        try {
          const [followersRes, followingRes] = await Promise.all([
            getFollowers(currentUserId).catch(() => ({ success: false, followers: [] })),
            getFollowing(currentUserId).catch(() => ({ success: false, following: [] }))
          ]);

          const merged = {};
          (followersRes.followers || []).forEach(f => { if (f) merged[f._id] = f; });
          (followingRes.following || []).forEach(f => { if (f) merged[f._id] = f; });

          setCandidates(Object.values(merged));
        } catch (err) {
          console.error("Error loading chat candidates:", err);
        }
      };
      loadCandidates();
    }
  }, [currentUserId]);

  // Global calling context
  const {
    activeCall,
    handleStartCall,
    openPreCallModal,
    declinedCallIds
  } = useCall();

  // Auto-focus chat input field when activeChat changes
  useEffect(() => {
    if (activeChat) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [activeChat]);

  // Debounced search for users in system
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await searchUsers(searchQuery);
        if (res.success) {
          setSearchResults(res.users || []);
        }
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Load active conversations on mount
  useEffect(() => {
    fetchConversations(true);
    if (currentUserId) {
      socket.emit("register-user", currentUserId);
    }
  }, [currentUserId]);

  // Handle preselected chat partner redirected from a profile card
  useEffect(() => {
    if (preselectedUser) {
      setActiveChat((prevActive) => {
        const prevId = prevActive?._id || prevActive?.id;
        const newId = preselectedUser._id || preselectedUser.id;
        if (prevId !== newId) {
          return preselectedUser;
        }
        return prevActive;
      });
      setConversations((prev) => {
        const exists = prev.some((c) => String(c.user?._id || c.user?.id) === String(preselectedUser._id));
        if (exists) return prev;
        return [
          {
            user: preselectedUser,
            lastMessage: {
              text: "",
              senderId: "",
              createdAt: new Date().toISOString(),
              isRead: true,
            },
          },
          ...prev,
        ];
      });
      if (onChatLoaded) {
        onChatLoaded();
      }
    }
  }, [preselectedUser, onChatLoaded]);

  const saveConversationsCache = (list) => {
    try {
      const json = JSON.stringify(list);
      localStorage.setItem("ce_global_conversations_cache", json);
      if (currentUserIdRef.current) {
        localStorage.setItem(`ce_conversations_${currentUserIdRef.current}`, json);
      }
    } catch (e) {}
  };

  // Fetch active conversations
  async function fetchConversations(showLoader = false) {
    try {
      if (showLoader && conversations.length === 0) {
        setLoadingConversations(true);
      }
      const res = await getConversations();
      if (res.success) {
        let list = res.conversations || [];
        const activeChatVal = activeChatRef.current;

        if (activeChatVal) {
          list = list.map((c) => {
            const target = c.isGroup ? c.group : c.user;
            return String(target?._id || target?.id) === String(activeChatVal._id)
              ? { ...c, unreadCount: 0, lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : null }
              : c;
          });
        }
        setConversations(list);
        saveConversationsCache(list);
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }

  // Helper to update conversation list in memory instantly without HTTP call
  const updateConversationInMemory = (msg) => {
    setConversations((prev) => {
      const isGroup = !!msg.groupChat;
      const targetId = isGroup
        ? String(msg.groupChat)
        : String(msg.sender?._id || msg.sender) === String(currentUserIdRef.current)
          ? String(msg.recipient?._id || msg.recipient)
          : String(msg.sender?._id || msg.sender);

      const existsIndex = prev.findIndex((c) => {
        const id = c.isGroup ? String(c.group?._id) : String(c.user?._id || c.user?.id);
        return id === targetId || String(c._id) === targetId;
      });

      const updatedLastMsg = {
        text: msg.message || (msg.fileType ? `Sent a ${msg.fileType}` : ""),
        fileUrl: msg.fileUrl,
        fileType: msg.fileType,
        senderId: msg.sender?._id || msg.sender,
        createdAt: msg.createdAt || new Date().toISOString(),
        isRead: activeChatRef.current && String(activeChatRef.current._id) === targetId
      };

      let newList;
      if (existsIndex >= 0) {
        const existing = prev[existsIndex];
        const isSelf = String(msg.sender?._id || msg.sender) === String(currentUserIdRef.current);
        const isActive = activeChatRef.current && String(activeChatRef.current._id) === targetId;
        const newUnread = isSelf || isActive ? 0 : (existing.unreadCount || 0) + 1;

        const updatedConv = {
          ...existing,
          lastMessage: updatedLastMsg,
          unreadCount: newUnread
        };

        newList = [...prev];
        newList.splice(existsIndex, 1);
        newList.unshift(updatedConv);
      } else {
        newList = prev;
        fetchConversations(false);
      }
      saveConversationsCache(newList);
      return newList;
    });
  };

  // Socket listeners for real-time messages, typing, and presence updates
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      const activeChatVal = activeChatRef.current;

      const isMsgForCurrentGroup = msg.groupChat && activeChatVal?.isGroup && String(msg.groupChat) === String(activeChatVal._id);
      const isMsgForCurrentDirect = !msg.groupChat && activeChatVal && !activeChatVal.isGroup &&
        (String(msg.sender?._id || msg.sender) === String(activeChatVal._id) ||
          String(msg.recipient?._id || msg.recipient) === String(activeChatVal._id));

      if (isMsgForCurrentGroup || isMsgForCurrentDirect) {
        if (String(msg.sender?._id || msg.sender) !== String(currentUserIdRef.current)) {
          if (!msg.groupChat) {
            getChatHistory(activeChatVal._id).catch((e) => console.error("Error marking messages read:", e));
          }
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) =>
            m._id !== msg._id &&
            !(m.isTemp && String(m.sender?._id || m.sender) === String(msg.sender?._id || msg.sender) && m.message === msg.message)
          );
          if (filtered.some((m) => m._id === msg._id)) return filtered;
          const next = [...filtered, msg];
          if (activeChatVal) {
            const key = activeChatVal._id || activeChatVal.id;
            chatHistoryCacheRef.current[key] = next;
          }
          return next;
        });

        const senderId = msg.sender?._id || msg.sender;
        setPartnerTypers((prev) => prev.filter((t) => String(t.userId) !== String(senderId)));
        if (typingTimeoutsRef.current[senderId]) {
          clearTimeout(typingTimeoutsRef.current[senderId]);
          delete typingTimeoutsRef.current[senderId];
        }
      }
      updateConversationInMemory(msg);
    };

    const handlePartnerTyping = ({ senderId, senderInfo }) => {
      const activeChatVal = activeChatRef.current;
      const currentUserIdVal = currentUserIdRef.current;
      
      // Filter out typing updates sent by the current user (using both ID and username fallback)
      const isSelfId = currentUserIdVal && String(senderId) === String(currentUserIdVal);
      const isSelfUsername = senderInfo?.username && user?.username && 
        String(senderInfo.username).toLowerCase().trim() === String(user.username).toLowerCase().trim();
        
      if (!activeChatVal || isSelfId || isSelfUsername) return;

      const isFromActiveChat = activeChatVal.isGroup
        ? activeChatVal.members?.some((m) => String(m._id) === String(senderId))
        : String(senderId) === String(activeChatVal._id);

      if (isFromActiveChat) {
        // Clear any existing timeout
        if (typingTimeoutsRef.current[senderId]) {
          clearTimeout(typingTimeoutsRef.current[senderId]);
        }

        // Set a timeout to clean up typing state if they stop sending updates
        typingTimeoutsRef.current[senderId] = setTimeout(() => {
          setPartnerTypers((prev) => prev.filter((t) => String(t.userId) !== String(senderId)));
          delete typingTimeoutsRef.current[senderId];
        }, 6000);

        setPartnerTypers((prev) => {
          const exists = prev.some((t) => String(t.userId) === String(senderId));
          if (exists) return prev;

          const defaultUsername = activeChatVal.isGroup ? "Someone" : (activeChatVal.username || activeChatVal.name);
          const defaultAvatar = activeChatVal.isGroup ? "" : (activeChatVal.avatar || "");

          return [
            ...prev,
            {
              userId: senderId,
              username: senderInfo?.username || defaultUsername,
              avatar: senderInfo?.avatar || defaultAvatar
            }
          ];
        });
      }
    };

    const handlePartnerStopTyping = ({ senderId }) => {
      if (typingTimeoutsRef.current[senderId]) {
        clearTimeout(typingTimeoutsRef.current[senderId]);
        delete typingTimeoutsRef.current[senderId];
      }
      setPartnerTypers((prev) => prev.filter((t) => String(t.userId) !== String(senderId)));
    };

    const handleReceiveDelete = ({ messageId }) => {
      setMessages((prev) => {
        const next = prev.filter((m) => m._id !== messageId);
        const activeChatVal = activeChatRef.current;
        if (activeChatVal) {
          const key = activeChatVal._id || activeChatVal.id;
          chatHistoryCacheRef.current[key] = next;
        }
        return next;
      });
      fetchConversations();
    };

    const handleReceiveReadReceipt = ({ readerId, senderId }) => {
      const activeChatVal = activeChatRef.current;
      const currentUserIdVal = currentUserIdRef.current;

      setMessages((prev) => {
        const next = prev.map((m) => {
          const mSender = String(m.sender?._id || m.sender);
          if (mSender === String(currentUserIdVal) || String(senderId) === String(currentUserIdVal)) {
            return { ...m, isRead: true };
          }
          return m;
        });
        if (activeChatVal) {
          const key = activeChatVal._id || activeChatVal.id;
          chatHistoryCacheRef.current[key] = next;
        }
        return next;
      });

      setConversations((prev) =>
        prev.map((c) => {
          const targetId = c.isGroup ? c.group?._id : c.user?._id;
          if (String(targetId) === String(readerId) || String(c._id) === String(readerId)) {
            return {
              ...c,
              lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : null
            };
          }
          return c;
        })
      );
    };

    // Presence listener: update online statuses in real-time!
    const handleUserStatusChange = ({ userId, isOnline }) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.isGroup) return c;
          return String(c.user?._id || c.user?.id) === String(userId)
            ? { ...c, user: { ...c.user, isOnline } }
            : c;
        })
      );

      const activeChatVal = activeChatRef.current;
      if (activeChatVal && !activeChatVal.isGroup && String(activeChatVal._id) === String(userId)) {
        setActiveChat((prev) => (prev ? { ...prev, isOnline } : null));
      }
    };

    // Socket listener for new groups
    const handleGroupCreated = (group) => {
      socket.emit("group:join", { groupId: group._id });
      setConversations((prev) => {
        const exists = prev.some(c => c.isGroup && String(c.group?._id) === String(group._id));
        if (exists) return prev;
        return [
          {
            _id: group._id,
            isGroup: true,
            group: group,
            lastMessage: null,
            unreadCount: 0
          },
          ...prev
        ];
      });
    };

    const handleGroupDeleted = ({ groupId }) => {
      const activeChatVal = activeChatRef.current;
      if (activeChatVal && activeChatVal.isGroup && String(activeChatVal._id) === String(groupId)) {
        setActiveChat(null);
        alert("This group has been deleted by the creator.");
      }
      fetchConversations();
    };

    const handleMemberAdded = ({ groupId, group }) => {
      const activeChatVal = activeChatRef.current;
      if (activeChatVal && activeChatVal.isGroup && String(activeChatVal._id) === String(groupId)) {
        setActiveChat(group);
      }
      fetchConversations();
    };

    const handleMemberRemoved = ({ groupId, userId, group }) => {
      const activeChatVal = activeChatRef.current;
      if (activeChatVal && activeChatVal.isGroup && String(activeChatVal._id) === String(groupId)) {
        if (String(userId) === String(currentUserIdRef.current)) {
          setActiveChat(null);
          alert("You have been removed from this group by the admin.");
        } else {
          setActiveChat(group);
        }
      }
      fetchConversations();
    };

    socket.on("dm:receive", handleReceiveMessage);
    socket.on("dm:typing", handlePartnerTyping);
    socket.on("dm:stop-typing", handlePartnerStopTyping);
    socket.on("dm:delete", handleReceiveDelete);
    socket.on("dm:read", handleReceiveReadReceipt);
    socket.on("user:status", handleUserStatusChange);
    socket.on("group:created", handleGroupCreated);
    socket.on("group:deleted", handleGroupDeleted);
    socket.on("group:member-added", handleMemberAdded);
    socket.on("group:member-removed", handleMemberRemoved);

    return () => {
      socket.off("dm:receive", handleReceiveMessage);
      socket.off("dm:typing", handlePartnerTyping);
      socket.off("dm:stop-typing", handlePartnerStopTyping);
      socket.off("dm:delete", handleReceiveDelete);
      socket.off("dm:read", handleReceiveReadReceipt);
      socket.off("user:status", handleUserStatusChange);
      socket.off("group:created", handleGroupCreated);
      socket.off("group:deleted", handleGroupDeleted);
      socket.off("group:member-added", handleMemberAdded);
      socket.off("group:member-removed", handleMemberRemoved);

      // Clear all active typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // Load chat history when active chat changes (using activeChatId primitive to fix reload loops)
  useEffect(() => {
    if (!activeChatId) {
      setMessages((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    loadHistory(activeChatId);
    setPartnerTypers((prev) => (prev.length > 0 ? [] : prev));
  }, [activeChatId]);

  // Helper to scroll messages board to bottom programmatically (Instant WhatsApp style)
  const scrollToBottom = (behavior = "instant") => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
    requestAnimationFrame(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "instant", block: "end" });
      }
    });
  };

  // Auto-scroll chat history using refined logic for instant vs smooth scroll
  useEffect(() => {
    if (activeChatId) {
      const isInitialLoad = justLoadedHistoryRef.current || prevChatIdRef.current !== activeChatId || prevMessagesCountRef.current === 0;

      if (isInitialLoad) {
        scrollToBottom("instant");
        justLoadedHistoryRef.current = false;
        prevChatIdRef.current = activeChatId;
      } else if (
        messages.length > prevMessagesCountRef.current ||
        partnerTypers.length > prevTypersCountRef.current
      ) {
        scrollToBottom("smooth");
      }
      prevMessagesCountRef.current = messages.length;
      prevTypersCountRef.current = partnerTypers.length;
    } else {
      prevChatIdRef.current = null;
      prevMessagesCountRef.current = 0;
      prevTypersCountRef.current = 0;
      justLoadedHistoryRef.current = false;
    }
  }, [messages, partnerTypers.length, activeChatId]);

  // Load chat history (Stale-While-Revalidate Caching pattern)
  async function loadHistory(userId) {
    const hasCache = !!chatHistoryCacheRef.current[userId];
    if (hasCache) {
      setMessages(chatHistoryCacheRef.current[userId]);
      justLoadedHistoryRef.current = true;
      scrollToBottom("instant");
    } else {
      setLoadingHistory(true);
    }
    try {
      const res = await getChatHistory(userId);
      if (res.success) {
        const fetchedMsgs = res.messages || [];
        chatHistoryCacheRef.current[userId] = fetchedMsgs;
        setMessages(fetchedMsgs);
        justLoadedHistoryRef.current = true;
        scrollToBottom("instant");
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp"
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Only images (PNG, JPG, JPEG, WEBP) are allowed!");
      e.target.value = "";
      return;
    }

    const type = "image";
    const previewUrl = URL.createObjectURL(file);

    setAttachment({
      file,
      previewUrl,
      type
    });
  };

  const handleRemoveAttachment = () => {
    if (attachment && attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };



  const handleToggleBlock = async (userId, currentlyBlocked) => {
    try {
      if (currentlyBlocked) {
        await unblockUser(userId);
      } else {
        const confirmBlock = window.confirm(`Are you sure you want to block @${activeChat.username || activeChat.name}? You will not receive messages or calls from them.`);
        if (!confirmBlock) return;
        await blockUser(userId);
      }

      // Update activeChat
      setActiveChat(prev => {
        if (prev && String(prev._id) === String(userId)) {
          return { ...prev, isBlocked: !currentlyBlocked };
        }
        return prev;
      });

      // Update conversations list
      setConversations(prev => prev.map(c => {
        if (!c.isGroup && String(c.user?._id || c.user?.id) === String(userId)) {
          return {
            ...c,
            user: { ...c.user, isBlocked: !currentlyBlocked }
          };
        }
        return c;
      }));

      setShowChatMenu(false);
    } catch (err) {
      console.error("Error toggling block:", err);
      alert("Failed to update block status. Please try again.");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this group? All message history will be permanently deleted.");
    if (!confirmDelete) return;

    try {
      await deleteGroupChat(groupId);
      setActiveChat(null);
      fetchConversations();
      setShowChatMenu(false);
    } catch (err) {
      console.error("Error deleting group:", err);
      alert("Failed to delete group. Only the group creator can delete it.");
    }
  };

  const handleAddMemberSubmit = async (targetUserId) => {
    try {
      const res = await addGroupMember(activeChat._id, targetUserId);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
        setShowAddMemberModal(false);
      }
    } catch (err) {
      console.error("Error adding group member:", err);
      alert(err.response?.data?.message || "Failed to add member. Please try again.");
    }
  };

  const handleRemoveMemberSubmit = async (targetUserId, username) => {
    const isSelf = String(targetUserId) === String(currentUserId);
    const confirmMsg = isSelf
      ? "Are you sure you want to leave this group?"
      : `Are you sure you want to remove @${username} from the group?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await removeGroupMember(activeChat._id, targetUserId);
      if (res.success) {
        if (isSelf) {
          setActiveChat(null);
          setShowGroupInfoPanel(false);
        } else {
          setActiveChat(res.group);
        }
        fetchConversations();
      }
    } catch (err) {
      console.error("Error removing group member:", err);
      alert(err.response?.data?.message || "Failed to remove member. Please try again.");
    }
  };

  const handleUpdateGroupAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only image files (JPEG, JPG, PNG, WEBP) are allowed for group icon!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await updateGroupChat(activeChat._id, formData);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Error updating group icon:", err);
      alert(err.response?.data?.message || "Failed to update group icon. Please try again.");
    }
  };

  const handleSaveGroupName = async () => {
    if (!editedGroupName.trim() || !activeChat) return;
    try {
      const formData = new FormData();
      formData.append("name", editedGroupName.trim());
      const res = await updateGroupChat(activeChat._id, formData);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
        setIsEditingGroupName(false);
      }
    } catch (err) {
      console.error("Error updating group name:", err);
      alert(err.response?.data?.message || "Failed to update group name.");
    }
  };

  const handleSaveGroupBio = async () => {
    if (!activeChat) return;
    try {
      const formData = new FormData();
      formData.append("bio", editedGroupBio.trim());
      const res = await updateGroupChat(activeChat._id, formData);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
        setIsEditingGroupBio(false);
      }
    } catch (err) {
      console.error("Error updating group bio:", err);
      alert(err.response?.data?.message || "Failed to update group bio.");
    }
  };

  const handlePromoteAdmin = async (targetUserId) => {
    try {
      const res = await promoteGroupAdmin(activeChat._id, targetUserId);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Error promoting member:", err);
      alert(err.response?.data?.message || "Failed to promote member to admin.");
    }
  };

  const handleDemoteAdmin = async (targetUserId) => {
    try {
      const res = await demoteGroupAdmin(activeChat._id, targetUserId);
      if (res.success) {
        setActiveChat(res.group);
        setConversations(prev => prev.map(c => {
          if (c.isGroup && String(c.group?._id) === String(activeChat._id)) {
            return { ...c, group: res.group };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Error demoting admin:", err);
      alert(err.response?.data?.message || "Failed to demote admin.");
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessageText.trim() && !attachment) || !activeChat) return;

    const messageToSend = newMessageText.trim();
    setNewMessageText("");

    // Stop typing emitter
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("dm:stop-typing", { recipientId: activeChat._id });
    setIsTyping(false);

    // Create optimistic message for instant UI responsiveness (<1ms)
    const tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const nowIso = new Date().toISOString();
    let tempMessage = null;

    if (!attachment && messageToSend) {
      tempMessage = {
        _id: tempId,
        sender: {
          _id: user?._id || user?.id,
          username: user?.username || "Me",
          avatar: user?.avatar || ""
        },
        recipient: activeChat._id,
        message: messageToSend,
        createdAt: nowIso,
        isRead: false,
        isTemp: true
      };

      // 1. Instantly update active messages state
      setMessages((prev) => {
        const next = [...prev, tempMessage];
        if (activeChat) {
          const key = activeChat._id || activeChat.id;
          chatHistoryCacheRef.current[key] = next;
        }
        return next;
      });

      // 2. Instantly update left conversations list in memory (no HTTP delay!)
      setConversations((prev) => {
        const key = activeChat._id || activeChat.id;
        const existsIndex = prev.findIndex((c) => String(c._id) === String(key) || String(c.user?._id) === String(key) || String(c.group?._id) === String(key));
        const updatedMsg = {
          text: messageToSend,
          senderId: user?._id || user?.id,
          createdAt: nowIso,
          isRead: false
        };

        if (existsIndex >= 0) {
          const updatedConv = { ...prev[existsIndex], lastMessage: updatedMsg };
          const newList = [...prev];
          newList.splice(existsIndex, 1);
          return [updatedConv, ...newList];
        }
        return prev;
      });

      // Scroll to bottom immediately
      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 10);
    }

    // Background API Chat Handling (Non-blocking)
    try {
      if (attachment) {
        setIsSending(true);
        const formData = new FormData();
        formData.append("recipientId", activeChat._id);
        formData.append("file", attachment.file);
        if (messageToSend) {
          formData.append("message", messageToSend);
        }
        const res = await sendDirectMessageAttachment(formData);
        if (res.success) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === res.message._id)) return prev;
            const next = [...prev, res.message];
            if (activeChat) {
              const key = activeChat._id || activeChat.id;
              chatHistoryCacheRef.current[key] = next;
            }
            return next;
          });
          handleRemoveAttachment();
        }
      } else {
        if (socket.connected) {
          socket.emit("dm:send", { recipientId: activeChat._id, message: messageToSend, tempId }, (ack) => {
            if (ack && ack.success && ack.message) {
              setMessages((prev) => {
                const filtered = prev.filter((m) => m._id !== tempId && m._id !== ack.message._id);
                const next = [...filtered, ack.message];
                if (activeChat) {
                  const key = activeChat._id || activeChat.id;
                  chatHistoryCacheRef.current[key] = next;
                }
                return next;
              });
            }
          });
        } else {
          const res = await sendDirectMessage(activeChat._id, messageToSend);
          if (res.success) {
            setMessages((prev) => {
              const filtered = prev.filter((m) => m._id !== tempId && m._id !== res.message._id);
              const next = [...filtered, res.message];
              if (activeChat) {
                const key = activeChat._id || activeChat.id;
                chatHistoryCacheRef.current[key] = next;
              }
              return next;
            });
          } else if (tempMessage) {
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
          }
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      if (tempMessage) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    } finally {
      setIsSending(false);
    }
  };

  // Send typing notifications
  const handleInputChange = (e) => {
    setNewMessageText(e.target.value);
    if (!activeChat || String(activeChat._id).startsWith("mock_")) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("dm:typing", {
        recipientId: activeChat._id,
        senderInfo: {
          username: user?.username || "Someone",
          avatar: user?.avatar || ""
        }
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("dm:stop-typing", { recipientId: activeChat._id });
      setIsTyping(false);
    }, 1500);
  };

  const handleInsertCode = () => {
    if (!codeText.trim()) return;
    const codeBlock = `\n\`\`\`${codeLang}\n${codeText}\n\`\`\`\n`;

    const input = inputRef.current;
    if (!input) {
      setNewMessageText(prev => prev + codeBlock);
    } else {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const text = newMessageText;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      setNewMessageText(before + codeBlock + after);
    }

    setShowCodeModal(false);
    setCodeText("");
  };



  const handleSendImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/png, image/jpeg, image/jpg, image/webp";
      fileInputRef.current.click();
    }
  };

  const renderMessageText = (text) => {
    if (!text) return null;

    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : "code";
        const content = match ? match[2].trim() : part.slice(3, -3).trim();

        return (
          <div key={index} className="chat-message-code-block-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="code-block-header">
              <span className="code-block-lang-badge">{lang || "code"}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(content);
                  alert("Code copied to clipboard!");
                }}
                className="code-block-copy-btn"
              >
                Copy
              </button>
            </div>
            <pre className="code-block-pre">
              <code className="code-block-content">{content}</code>
            </pre>
          </div>
        );
      }

      return (
        <span key={index} style={{ whiteSpace: "pre-line" }}>
          {part}
        </span>
      );
    });
  };

  // Fetch candidates for new chat
  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    try {
      setLoadingCandidates(true);
      const [followersRes, followingRes] = await Promise.all([
        getFollowers(currentUserId).catch(() => ({ success: false, followers: [] })),
        getFollowing(currentUserId).catch(() => ({ success: false, following: [] }))
      ]);

      // Merge and deduplicate candidates
      const merged = {};
      (followersRes.followers || []).forEach(f => { if (f) merged[f._id] = f; });
      (followingRes.following || []).forEach(f => { if (f) merged[f._id] = f; });

      setCandidates(Object.values(merged));
    } catch (err) {
      console.error("Error loading chat candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Start chat with select candidate
  const handleStartChatWith = (partner) => {
    setActiveChat(partner);
    setConversations((prev) => {
      const exists = prev.some((c) => String(c.user?._id || c.user?.id) === String(partner._id));
      if (exists) {
        return prev.map((c) =>
          String(c.user?._id || c.user?.id) === String(partner._id)
            ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, isRead: true } }
            : c
        );
      }
      return [
        {
          user: partner,
          lastMessage: {
            text: "",
            senderId: "",
            createdAt: new Date().toISOString(),
            isRead: true
          },
          unreadCount: 0
        },
        ...prev
      ];
    });
    setShowNewChatModal(false);
    setSearchQuery("");
  };



  const handleOpenCreateGroup = async () => {
    setShowCreateGroupModal(true);
    setGroupName("");
    setGroupBio("");
    setSelectedMembers([]);
    setGroupAvatar(null);
    setGroupAvatarPreview("");

    try {
      setLoadingCandidates(true);
      const [followersRes, followingRes] = await Promise.all([
        getFollowers(currentUserId).catch(() => ({ success: false, followers: [] })),
        getFollowing(currentUserId).catch(() => ({ success: false, following: [] }))
      ]);

      const merged = {};
      (followersRes.followers || []).forEach(f => { if (f) merged[f._id] = f; });
      (followingRes.following || []).forEach(f => { if (f) merged[f._id] = f; });

      setCandidates(Object.values(merged));
    } catch (err) {
      console.error("Error loading group candidates:", err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleGroupAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only image files (JPEG, JPG, PNG, WEBP) are allowed for group avatar!");
      return;
    }
    setGroupAvatar(file);
    setGroupAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert("Group name is required!");
      return;
    }
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to create a group!");
      return;
    }

    try {
      setCreatingGroup(true);
      const formData = new FormData();
      formData.append("name", groupName.trim());
      formData.append("bio", groupBio.trim());
      formData.append("members", JSON.stringify(selectedMembers));
      if (groupAvatar) {
        formData.append("avatar", groupAvatar);
      }

      const { createGroupChat } = await import("../../services/directMessageService");
      const res = await createGroupChat(formData);
      if (res.success) {
        socket.emit("group:join", { groupId: res.group._id });
        setActiveChat(res.group);
        setShowCreateGroupModal(false);
        fetchConversations();
      }
    } catch (err) {
      console.error("Error creating group:", err);
      alert(err.response?.data?.message || "Failed to create group. Please try again.");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Filtered and Searched conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const chatPartner = conv.isGroup ? conv.group : conv.user;
      if (!chatPartner) return false;

      const name = conv.isGroup ? chatPartner.name : chatPartner.username;
      const matchesSearch = name.toLowerCase().includes(convSearchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedSubTab === "unread") {
        return conv.unreadCount > 0;
      }
      if (selectedSubTab === "favorites") {
        return !!conv.isFavorite;
      }
      if (selectedSubTab === "groups") {
        return !!conv.isGroup;
      }

      return true;
    });
  }, [conversations, convSearchQuery, selectedSubTab]);

  return (
    <div className={`ce-direct-messages-layout ${activeChat ? "show-chat" : ""}`}>
      {/* LEFT SIDEBAR: Conversations list */}
      <div className="dm-conversations-panel">
        <div className="conversations-header">
          <div className="header-top">
            <h2 className="panel-title">Messages</h2>
            <div className="header-action-buttons">
              <button className="new-message-purple-btn" onClick={handleOpenNewChat} title="New Message">
                <Plus size={14} /> New DM
              </button>
              <button className="new-group-purple-btn" onClick={handleOpenCreateGroup} title="New Group">
                <Users size={14} /> Group
              </button>
            </div>
          </div>

          {/* Search box with filter sliders */}
          <div className="conversations-search-row">
            <div className="conversations-search-container">
              <Search size={14} className="conversations-search-icon" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={convSearchQuery}
                onChange={(e) => setConvSearchQuery(e.target.value)}
                className="conversations-search-input"
              />
            </div>
            <button className="conversations-filter-btn" title="Filters">
              <Sliders size={16} />
            </button>
          </div>

          {/* Subtabs Switcher */}
          <div className="conversations-subtabs-row">
            <span
              className="conversations-subtab-bg-slide"
              style={{
                left: `calc(${["all", "unread", "favorites", "groups"].indexOf(selectedSubTab) * 25}% + 3px)`
              }}
            />
            {["all", "unread", "favorites", "groups"].map((tab) => (
              <button
                key={tab}
                className={`conversations-subtab-pill ${selectedSubTab === tab ? "active" : ""}`}
                onClick={() => setSelectedSubTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="conversations-list">
          {loadingConversations ? (
            <div className="conversations-loading">
              <div className="loading-spinner-small" />
              <span>Loading messages...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="conversations-empty">
              <MessageSquare size={26} style={{ opacity: 0.4 }} />
              <p>No chats found</p>
              <div className="empty-actions">
                <button className="start-btn" onClick={handleOpenNewChat}>Start DM</button>
                <button className="start-btn group-start-btn" onClick={handleOpenCreateGroup}>Create Group</button>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const chatPartner = conv.isGroup ? conv.group : conv.user;
              if (!chatPartner) return null;

              const isSelected = activeChat && activeChat._id === chatPartner._id;
              const hasUnread = conv.unreadCount > 0;
              const partnerName = conv.isGroup ? chatPartner.name : chatPartner.username;

              return (
                <div
                  key={chatPartner._id}
                  className={`conversation-item ${isSelected ? "selected" : ""} ${hasUnread ? "unread" : ""}`}
                  onClick={() => {
                    setActiveChat(chatPartner);
                    setConversations((prev) =>
                      prev.map((c) => {
                        const target = c.isGroup ? c.group : c.user;
                        return String(target?._id || target?.id) === String(chatPartner._id)
                          ? { ...c, unreadCount: 0, lastMessage: c.lastMessage ? { ...c.lastMessage, isRead: true } : null }
                          : c;
                      })
                    );
                  }}
                >
                  <div
                    className="avatar-wrapper chat-list-avatar-clickable"
                    onClick={(e) => {
                      if (onViewProfile && !conv.isGroup) {
                        e.stopPropagation();
                        onViewProfile(chatPartner._id);
                      }
                    }}
                    style={{ cursor: onViewProfile && !conv.isGroup ? "pointer" : "default" }}
                    title={conv.isGroup ? "" : `View @${partnerName}'s profile`}
                  >
                    <SafeAvatar
                      src={chatPartner.avatar}
                      name={partnerName}
                      className="user-avatar"
                      isGroup={conv.isGroup}
                      size={44}
                      userId={chatPartner._id || chatPartner.id}
                    />
                    {!conv.isGroup && chatPartner.isOnline && <span className="online-dot-badge" />}
                  </div>

                  <div className="item-details">
                    <div className="details-top">
                      <span className="username">{partnerName}</span>
                      <span className="timestamp">
                        {conv.lastMessage ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>
                    <p className="last-message">
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.senderId === currentUserId ? "You: " : conv.isGroup ? `${conv.lastMessage.senderName}: ` : ""}
                          {formatLastMessageText(conv.lastMessage)}
                        </>
                      ) : (
                        <span className="no-messages">No messages yet</span>
                      )}
                    </p>
                  </div>

                  {hasUnread && (
                    <div className="unread-count-badge">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Message history & Chat board */}
      <div className="dm-chat-panel" style={{ position: "relative" }}>
        {showClearConfirm && (
          <div className="chat-inline-confirm-overlay">
            <div className="chat-inline-confirm-card">
              <h4>Clear Chat History?</h4>
              <p>Are you sure you want to clear your chat history? This will delete all messages in this chat from your side only and cannot be undone.</p>
              <div className="chat-inline-confirm-actions">
                <button 
                  type="button" 
                  className="chat-inline-confirm-btn cancel" 
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="chat-inline-confirm-btn confirm" 
                  onClick={confirmClearChat}
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        )}
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="chat-header animate-fade-in">
              <button
                type="button"
                className="chat-back-btn"
                onClick={() => setActiveChat(null)}
                title="Back to chats"
              >
                <ArrowLeft size={18} />
              </button>

              <div
                className="header-user-info active-chat-header-clickable"
                onClick={() => {
                  if (activeChat.isGroup) {
                    setShowGroupInfoPanel(!showGroupInfoPanel);
                  } else if (onViewProfile) {
                    onViewProfile(activeChat._id);
                  }
                }}
                style={{ cursor: "pointer" }}
                title={activeChat.isGroup ? "View Group Info" : `View @${activeChat.username || activeChat.name}'s profile`}
              >
                <div className="avatar-wrapper">
                  <SafeAvatar
                    src={activeChat.avatar}
                    name={activeChat.name || activeChat.username}
                    className="user-avatar-header"
                    isGroup={activeChat.isGroup}
                    size={40}
                    userId={activeChat._id || activeChat.id}
                  />
                  {activeChat.isOnline && !activeChat.isGroup && <span className="online-dot-badge header" />}
                </div>

                <div className="user-status-text">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="chat-partner-name">{activeChat.isGroup ? activeChat.name : (activeChat.displayName || activeChat.username)}</span>
                    {!activeChat.isGroup &&
                      activeChat.username &&
                      activeChat.displayName &&
                      activeChat.displayName.trim().toLowerCase() !== activeChat.username.trim().toLowerCase() && (
                        <span className="chat-partner-handle" style={{ fontSize: "0.78rem", color: "var(--ce-accent)", fontFamily: "monospace" }}>
                          @{activeChat.username}
                        </span>
                    )}
                  </div>
                  <span className={`status-label ${activeChat.isOnline || activeChat.isGroup ? "online" : ""}`}>
                    {activeChat.isGroup ? (activeChat.bio || "Group Channel") : activeChat.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>

              <div className="chat-header-actions" style={{ position: "relative" }}>
                {activeChat.isGroup && declinedCallIds?.has(String(activeChat._id || activeChat.id)) ? (
                  <button
                    type="button"
                    className="header-action-btn join-call-btn-highlight"
                    onClick={() => handleStartCall("audio", activeChat)}
                    title="Join active group call"
                    disabled={!!activeCall || isChatBlocked || hasChatBlockedMe}
                    style={{ background: "#10b981", color: "#fff", padding: "6px 14px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px", border: "none", fontWeight: 700, fontSize: "0.78rem" }}
                  >
                    <Phone size={14} />
                    <span>Join Call</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="header-action-btn"
                      onClick={() => handleStartCall("audio", activeChat)}
                      title={activeChat.isGroup ? `Start Group Audio Call in ${activeChat.name}` : `Start Audio Call with ${activeChat.username}`}
                      disabled={!!activeCall || isChatBlocked || hasChatBlockedMe}
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      type="button"
                      className="header-action-btn"
                      onClick={() => handleStartCall("video", activeChat)}
                      title={activeChat.isGroup ? `Start Group Video Call in ${activeChat.name}` : `Start Video Call with ${activeChat.username}`}
                      disabled={!!activeCall || isChatBlocked || hasChatBlockedMe}
                    >
                      <Video size={18} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={`header-action-btn options-menu-btn ${showChatMenu ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChatMenu(!showChatMenu);
                  }}
                  title="Chat Options"
                >
                  <MoreVertical size={18} />
                </button>

                {showChatMenu && (
                  <div className="chat-options-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    {activeChat.isGroup ? (
                      <>
                        <button
                          type="button"
                          className="dropdown-action-item"
                          onClick={() => {
                            setShowGroupInfoPanel(true);
                            setShowChatMenu(false);
                          }}
                        >
                          <Info size={14} />
                          <span>Group Info</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-action-item danger"
                          onClick={handleClearChat}
                        >
                          <Trash2 size={14} />
                          <span>Clear Chat</span>
                        </button>
                        {activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId)) && (
                          <button
                            type="button"
                            className="dropdown-action-item danger"
                            onClick={() => handleDeleteGroup(activeChat._id)}
                          >
                            <Trash2 size={14} />
                            <span>Delete Group</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="dropdown-action-item"
                          onClick={() => {
                            if (onViewProfile) onViewProfile(activeChat._id);
                            setShowChatMenu(false);
                          }}
                        >
                          <User size={14} />
                          <span>View Profile</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-action-item danger"
                          onClick={handleClearChat}
                        >
                          <Trash2 size={14} />
                          <span>Clear Chat</span>
                        </button>
                        <button
                          type="button"
                          className={`dropdown-action-item ${isChatBlocked ? "success" : "danger"}`}
                          onClick={() => handleToggleBlock(activeChat._id, isChatBlocked)}
                        >
                          <Ban size={14} />
                          <span>{isChatBlocked ? "Unblock User" : "Block User"}</span>
                        </button>
                        <button
                          type="button"
                          className="dropdown-action-item danger"
                          onClick={() => {
                            setReportedTargetUser(activeChat);
                            setReportEvidenceType("USER");
                            setReportEvidenceId(activeChat._id);
                            setReportModalOpen(true);
                            setShowChatMenu(false);
                          }}
                        >
                          <ShieldAlert size={14} style={{ color: "#ef4444" }} />
                          <span style={{ color: "#ef4444" }}>Report User</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chat message board */}
            <div className="chat-message-board">
              {loadingHistory ? (
                <div className="board-loading">
                  <div className="loading-spinner-small" />
                  <span>Retrieving history...</span>
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="chat-board-empty-state">
                      <div className="empty-chat-avatar-wrapper">
                        <SafeAvatar
                          src={activeChat.avatar}
                          name={activeChat.name || activeChat.username}
                          className="empty-chat-partner-avatar"
                          size={64}
                        />
                      </div>
                      <h3>Say hello to {activeChat.name || activeChat.username}!</h3>
                      <p>This is the start of your message history. Type a message below or send an invite to start pair-programming together.</p>
                      
                      <div className="quick-hello-buttons">
                        <button 
                          className="hello-action-chip" 
                          onClick={() => {
                            setNewMessageText("👋 Hey there! How's it going?");
                            if (inputRef.current) inputRef.current.focus();
                          }}
                        >
                          👋 Say Hey!
                        </button>
                        <button 
                          className="hello-action-chip" 
                          onClick={() => {
                            setNewMessageText("💻 Let's collaborate on some code!");
                            if (inputRef.current) inputRef.current.focus();
                          }}
                        >
                          💻 Let's Code!
                        </button>
                        <button 
                          className="hello-action-chip" 
                          onClick={() => {
                            setNewMessageText("🚀 Hey, saw your profile on CodeExpo. Nice to connect!");
                            if (inputRef.current) inputRef.current.focus();
                          }}
                        >
                          🚀 Nice to Connect!
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      let lastDateStr = null;
                      return messages.map((msg) => {
                        const isMe = String(msg.sender?._id || msg.sender) === String(currentUserId);
                        const msgDateStr = new Date(msg.createdAt).toDateString();
                      const showDateHeader = msgDateStr !== lastDateStr;
                      lastDateStr = msgDateStr;

                      return (
                        <React.Fragment key={msg._id}>
                          {showDateHeader && (
                            <div className="chat-date-header">
                              <span className="chat-date-badge">{formatChatDate(msg.createdAt)}</span>
                            </div>
                          )}
                          {msg.isSystem ? (
                            <div className="chat-system-message-container">
                              <span className="chat-system-message-badge">
                                {msg.message}
                              </span>
                            </div>
                          ) : (
                            <div className={`message-bubble-wrapper ${isMe ? "sent" : "received"}`}>
                            {!isMe && (
                              <div className="bubble-avatar-container">
                                <SafeAvatar
                                  src={activeChat.isGroup ? msg.sender?.avatar : activeChat.avatar}
                                  name={activeChat.isGroup ? msg.sender?.username : activeChat.username}
                                  className="bubble-partner-avatar"
                                  isGroup={false}
                                  size={32}
                                />
                              </div>
                            )}

                            <div className="message-bubble-container">
                              {isMe && (
                                <div className="message-bubble-actions">
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModalMsg(msg)}
                                    className="bubble-action-btn delete-btn"
                                    title="Delete message"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}

                              <div className={`message-bubble ${msg.fileType === 'call' ? 'call-history-bubble' : ''}`}>
                                {activeChat.isGroup && !isMe && (
                                  <div className="group-message-sender-name" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>{msg.sender?.displayName || msg.sender?.username || "Developer"}</span>
                                    {msg.sender?.username &&
                                      msg.sender?.displayName &&
                                      msg.sender.displayName.trim().toLowerCase() !== msg.sender.username.trim().toLowerCase() && (
                                        <span style={{ fontSize: "10.5px", color: "var(--ce-accent)", opacity: 0.85, fontFamily: "monospace" }}>
                                          @{msg.sender.username}
                                        </span>
                                    )}
                                  </div>
                                )}

                                {msg.fileType === 'call' ? (
                                  <div className="message-call-history-container">
                                    {renderCallHistory(msg, currentUserId)}
                                    <span className="message-meta-inline">
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {isMe && (
                                        <span className="tick-container">
                                          {msg.isRead ? (
                                            <CheckCheck size={12} className="read-tick" />
                                          ) : (
                                            <Check size={12} className="sent-tick" />
                                          )}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    {msg.fileUrl && (
                                      <div className="message-attachment-container">
                                        <div className="message-attachment">
                                          <img
                                            src={optimizeCloudinaryUrl(msg.fileUrl, { quality: "best" })}
                                            srcSet={getCloudinarySrcSet(msg.fileUrl, { quality: "best" })}
                                            sizes="(max-width: 600px) 100vw, 400px"
                                            alt={msg.fileName || "Image attachment"}
                                            className="dm-message-image"
                                            onClick={() => window.open(msg.fileUrl, "_blank")}
                                            title="Click to view image"
                                          />
                                        </div>

                                        {msg.fileUrl && !msg.message && (
                                          <span className="attachment-meta-overlay">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {isMe && (
                                              <span className="tick-container">
                                                {msg.isRead ? (
                                                  <CheckCheck size={12} className="read-tick" />
                                                ) : (
                                                  <Check size={12} className="sent-tick" />
                                                )}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {msg.message && (
                                      <div className="message-text">
                                        {renderMessageText(msg.message)}
                                        <span className="message-meta-inline">
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {isMe && (
                                            <span className="tick-container">
                                              {msg.isRead ? (
                                                <CheckCheck size={12} className="read-tick" />
                                              ) : (
                                                <Check size={12} className="sent-tick" />
                                              )}
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {!isMe && (
                                <div
                                  className="message-bubble-actions"
                                  style={{
                                    position: "relative",
                                    display: "flex",
                                    gap: "4px",
                                    opacity: activeMessageMenuId === msg._id ? 1 : undefined,
                                    pointerEvents: activeMessageMenuId === msg._id ? "auto" : undefined,
                                    transform: activeMessageMenuId === msg._id ? "scale(1)" : undefined
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMessageMenuId(activeMessageMenuId === msg._id ? null : msg._id);
                                    }}
                                    className="bubble-action-btn delete-btn"
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                    title="Options"
                                  >
                                    <MoreVertical size={12} />
                                  </button>
                                  {activeMessageMenuId === msg._id && (
                                    <div className="bubble-options-dropdown">
                                      <button
                                        onClick={() => {
                                          setActiveMessageMenuId(null);
                                          setDeleteModalMsg(msg);
                                        }}
                                        className="bubble-dropdown-item danger"
                                      >
                                        <Trash2 size={13} /> Delete for Me
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMessageMenuId(null);
                                          setReportedTargetUser(msg.sender || activeChat);
                                          setReportEvidenceType("MESSAGE");
                                          setReportEvidenceId(msg._id);
                                          setReportModalOpen(true);
                                        }}
                                        className="bubble-dropdown-item warning"
                                      >
                                        ⚠️ Report Msg
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })())}
                  {partnerTypers.map((typer) => (
                    <div key={typer.userId} className="message-bubble-wrapper received typing-wrapper-row">
                      <div className="bubble-avatar-container">
                        {typer.avatar ? (
                          <img src={typer.avatar} alt={typer.username} className="bubble-partner-avatar" />
                        ) : (
                          <div className="bubble-partner-avatar-placeholder">
                            {(typer.username || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="typing-content-box">
                        {activeChat.isGroup && (
                          <span className="typing-user-label">@{typer.username} is typing</span>
                        )}
                        <div className="message-bubble typing-bubble">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Chat input box or Blocked banner */}
            {isChatBlocked ? (
              <div className="chat-blocked-banner animate-fade-in">
                <Ban size={18} className="blocked-banner-icon" />
                <span className="blocked-banner-text">You have blocked this user.</span>
                <button
                  type="button"
                  className="unblock-banner-btn"
                  onClick={() => handleToggleBlock(activeChat._id, true)}
                >
                  Unblock
                </button>
              </div>
            ) : hasChatBlockedMe ? (
              <div className="chat-blocked-banner animate-fade-in">
                <Ban size={18} className="blocked-banner-icon" />
                <span className="blocked-banner-text">You cannot send messages or start calls with this user.</span>
              </div>
            ) : (
              <div className="chat-input-container animate-fade-in">
                {attachment && (
                  <div className="attachment-preview-panel animate-slide-up">
                    <div className="preview-info">
                      <img src={attachment.previewUrl} alt="Preview" className="preview-thumb" />
                      <div className="preview-details">
                        <span className="preview-name">{attachment.file.name}</span>
                        <span className="preview-size">{(attachment.file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <button type="button" className="remove-preview-btn" onClick={handleRemoveAttachment}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Redesigned Premium Chat Input Card (WhatsApp Style) */}
                <div className="chat-input-card">
                  <div className="chat-input-left-actions">
                    <button
                      type="button"
                      className="chat-action-icon-btn"
                      onClick={handleSendImageClick}
                      title="Send Image File"
                      disabled={isSending}
                    >
                      <Image size={18} />
                    </button>
                    <button
                      type="button"
                      className="chat-action-icon-btn"
                      onClick={() => setShowCodeModal(true)}
                      title="Send Code Block"
                      disabled={isSending}
                    >
                      <Code2 size={18} />
                    </button>
                  </div>

                  <textarea
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={newMessageText}
                    onChange={handleInputChange}
                    className="chat-textarea-input"
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    style={{ display: "none" }}
                  />

                  <button
                    type="submit"
                    className="chat-send-purple-btn"
                    onClick={handleSendMessage}
                    disabled={(!newMessageText.trim() && !attachment) || isSending}
                  >
                    {isSending ? (
                      <div className="loading-spinner-tiny animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </div>
              </div>
            )}

              {showGroupInfoPanel && activeChat.isGroup && (() => {
              const isOwnerOfGroup = activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId));
              const isAdminOfGroup = (activeChat.admins || []).some(admin => String(admin._id || admin) === String(currentUserId)) || isOwnerOfGroup;
              return (
                <div className="group-info-panel animate-slide-left" onClick={(e) => e.stopPropagation()}>
                  <div className="group-info-header">
                    <h3>Group Info</h3>
                    <button type="button" className="close-panel-btn" onClick={() => setShowGroupInfoPanel(false)}>
                      <X size={18} />
                    </button>
                  </div>

                  <div className="group-info-scroll-container">
                    {/* Avatar & Meta */}
                    <div className="group-info-meta-card">
                      <div
                        className={`group-info-avatar-box ${isAdminOfGroup ? "editable" : ""}`}
                        onClick={() => {
                          if (isAdminOfGroup) {
                            document.getElementById("group-info-avatar-input").click();
                          }
                        }}
                        style={{ cursor: isAdminOfGroup ? "pointer" : "default" }}
                        title={isAdminOfGroup ? "Change Group Icon" : ""}
                      >
                        {activeChat.avatar ? (
                          <img src={activeChat.avatar} alt={activeChat.name} className="group-info-avatar" />
                        ) : (
                          <div className="group-info-avatar-placeholder">
                            <Users size={32} />
                          </div>
                        )}
                        {isAdminOfGroup && (
                          <div className="group-info-avatar-edit-overlay">
                            <span className="edit-icon-text">Change DP</span>
                          </div>
                        )}
                      </div>
                      {isAdminOfGroup && (
                        <input
                          type="file"
                          id="group-info-avatar-input"
                          style={{ display: "none" }}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          onChange={handleUpdateGroupAvatar}
                        />
                      )}

                      {isEditingGroupName ? (
                        <div className="group-info-edit-row">
                          <input
                            type="text"
                            className="group-info-edit-input"
                            value={editedGroupName}
                            onChange={(e) => setEditedGroupName(e.target.value)}
                            maxLength={30}
                            autoFocus
                          />
                          <div className="group-info-edit-actions">
                            <button className="edit-save-btn" onClick={handleSaveGroupName}>
                              <Check size={14} />
                            </button>
                            <button className="edit-cancel-btn" onClick={() => setIsEditingGroupName(false)}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group-info-name-wrapper">
                          <h4 className="group-info-name">{activeChat.name}</h4>
                          {isAdminOfGroup && (
                            <button
                              type="button"
                              className="group-info-edit-trigger-btn"
                              onClick={() => {
                                setEditedGroupName(activeChat.name);
                                setIsEditingGroupName(true);
                              }}
                              title="Edit Name"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {isEditingGroupBio ? (
                        <div className="group-info-edit-row column">
                          <textarea
                            className="group-info-edit-textarea"
                            value={editedGroupBio}
                            onChange={(e) => setEditedGroupBio(e.target.value)}
                            maxLength={150}
                            autoFocus
                            placeholder="Describe the group..."
                          />
                          <div className="group-info-edit-actions justify-end">
                            <button className="edit-save-btn" onClick={handleSaveGroupBio}>
                              <Check size={14} /> Save
                            </button>
                            <button className="edit-cancel-btn" onClick={() => setIsEditingGroupBio(false)}>
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group-info-bio-wrapper">
                          <p className="group-info-bio">{activeChat.bio || "No group description."}</p>
                          {isAdminOfGroup && (
                            <button
                              type="button"
                              className="group-info-edit-trigger-btn"
                              onClick={() => {
                                setEditedGroupBio(activeChat.bio || "");
                                setIsEditingGroupBio(true);
                              }}
                              title="Edit Description"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      <span className="group-info-created-by">
                        Owner: @{activeChat.createdBy?.username || "Admin"}
                      </span>
                    </div>

                    {/* Members List */}
                    <div className="group-info-members-section">
                      <div className="members-section-header">
                        <h4>Group Members ({activeChat.members?.length || 0})</h4>
                        {isAdminOfGroup && (
                          <button
                            type="button"
                            className="add-member-trigger-btn"
                            onClick={() => setShowAddMemberModal(true)}
                            title="Add Member"
                          >
                            <Plus size={14} /> Add
                          </button>
                        )}
                      </div>

                      <div className="group-members-list">
                        {activeChat.members && activeChat.members.map((member) => {
                          const isCreator = activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(member._id));
                          const isMemberAdmin = (activeChat.admins || []).some(admin => String(admin._id || admin) === String(member._id)) || isCreator;
                          const isMe = String(member._id) === String(currentUserId);

                          return (
                            <div key={member._id} className="group-member-row">
                              <div
                                className={`member-row-left ${onViewProfile ? "clickable" : ""}`}
                                onClick={() => {
                                  if (onViewProfile) {
                                    onViewProfile(member._id);
                                  }
                                }}
                                style={{ cursor: onViewProfile ? "pointer" : "default" }}
                                title={onViewProfile ? `View @${member.username}'s profile` : ""}
                              >
                                <div className="member-row-avatar-box">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt={member.username} className="member-row-avatar" />
                                  ) : (
                                    <div className="member-row-avatar-placeholder">
                                      {member.username.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  {member.isOnline && <span className="member-row-online-badge" />}
                                </div>
                                <div className="member-row-details">
                                  <span className="member-row-username">
                                    {member.username} {isMe && "(You)"}
                                  </span>
                                  <span className="member-row-bio">{member.bio || "Developer"}</span>
                                </div>
                              </div>
                              <div className="member-row-right">
                                {isCreator ? (
                                  <span className="member-role-badge owner">Owner</span>
                                ) : (
                                  <div className="member-row-badges-actions">
                                    {isMemberAdmin && <span className="member-role-badge admin">Admin</span>}
                                    {isMe ? (
                                      <span className="member-role-badge self">You</span>
                                    ) : (
                                      isAdminOfGroup && (
                                        <div className="member-row-actions">
                                          {!isMemberAdmin && (
                                            <button
                                              type="button"
                                              className="member-row-action-btn promote-btn"
                                              onClick={() => handlePromoteAdmin(member._id)}
                                              title="Promote to Admin"
                                            >
                                              <Shield size={12} /> Make Admin
                                            </button>
                                          )}
                                          {isMemberAdmin && isOwnerOfGroup && (
                                            <button
                                              type="button"
                                              className="member-row-action-btn demote-btn"
                                              onClick={() => handleDemoteAdmin(member._id)}
                                              title="Demote Admin"
                                            >
                                              <ShieldAlert size={12} /> Dismiss Admin
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            className="member-row-action-btn remove-btn"
                                            onClick={() => handleRemoveMemberSubmit(member._id, member.username)}
                                            title={`Remove @${member.username}`}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="group-info-footer">
                    {isOwnerOfGroup ? (
                      <button
                        type="button"
                        className="group-info-danger-btn"
                        onClick={() => handleDeleteGroup(activeChat._id)}
                      >
                        <Trash2 size={14} /> Delete Group
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="group-info-danger-btn"
                        onClick={() => handleRemoveMemberSubmit(currentUserId, user?.username)}
                      >
                        <ArrowLeft size={14} /> Leave Group
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ADD MEMBER MODAL */}
            {showAddMemberModal && (
              <div className="new-chat-modal-overlay add-member-modal-zindex">
                <div className="new-chat-card glass-panel add-member-card">
                  <div className="modal-header">
                    <h3>Add Group Member</h3>
                    <button type="button" className="close-modal-btn" onClick={() => setShowAddMemberModal(false)}>×</button>
                  </div>

                  <div className="candidates-list">
                    {candidates
                      .filter(c => !activeChat.members?.some(m => String(m._id) === String(c._id)))
                      .map((candidate) => (
                        <div
                          key={candidate._id}
                          className="candidate-item"
                          onClick={() => handleAddMemberSubmit(candidate._id)}
                        >
                          {candidate.avatar ? (
                            <img src={candidate.avatar} alt={candidate.username} className="candidate-avatar" />
                          ) : (
                            <div className="candidate-avatar-placeholder">
                              {candidate.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="candidate-info">
                            <span className="cand-name">{candidate.username}</span>
                            <span className="cand-bio">{candidate.bio || "Developer"}</span>
                          </div>
                          <button type="button" className="add-member-row-btn">
                            <Plus size={12} /> Add
                          </button>
                        </div>
                      ))
                    }
                    {candidates.filter(c => !activeChat.members?.some(m => String(m._id) === String(c._id))).length === 0 && (
                      <div className="candidates-empty">
                        <User size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                        <span>All your connections are already members of this group</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="dm-empty-state">
            <div className="instagram-dm-icon-wrapper">
              <MessageSquare size={48} className="dm-icon" />
            </div>
            <h3>Your Messages</h3>
            <p className="dm-empty-desc">Send private photos, code blocks, or invite links directly to a developer.</p>
            <div className="empty-actions" style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px" }}>
              <button className="start-chat-main-btn" onClick={handleOpenNewChat}>Send DM</button>
              <button className="start-chat-main-btn group-start-btn" onClick={handleOpenCreateGroup} style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.4)" }}>Create Group</button>
            </div>

            {/* Suggested contacts panel */}
            <div className="dm-empty-suggestions-section">
              <h4 className="suggestions-title">Quick Connect Suggestions</h4>
              {candidates.length > 0 ? (
                <div className="suggestions-horizontal-scroll">
                  {candidates.slice(0, 5).map((candidate) => (
                    <div key={candidate._id} className="suggestion-card" onClick={() => handleStartChatWith(candidate)}>
                      <SafeAvatar
                        src={candidate.avatar}
                        name={candidate.username}
                        className="suggestion-avatar"
                        size={44}
                      />
                      <span className="suggestion-username">@{candidate.username}</span>
                      <span className="suggestion-bio">{candidate.bio || "Developer"}</span>
                      <button className="suggestion-chat-btn">Chat</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="suggestions-empty-box">
                  <p>You haven't followed any developers yet. Follow other developers from the Dashboard or search connections to grow your network!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* START NEW CHAT MODAL DIALOG */}
      {showNewChatModal && (
        <div className="new-chat-modal-overlay">
          <div className="new-chat-card glass-panel">
            <div className="modal-header">
              <h3>New Message</h3>
              <button className="close-modal-btn" onClick={() => setShowNewChatModal(false)}>×</button>
            </div>

            <div className="modal-search-bar">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="candidates-list">
              {searchQuery.trim() ? (
                searching ? (
                  <div className="candidates-loading">
                    <div className="loading-spinner-small" />
                    <span>Searching developers...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="candidates-empty">
                    <User size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                    <span>No developers found matching "{searchQuery}"</span>
                  </div>
                ) : (
                  searchResults.map((candidate) => (
                    <div
                      key={candidate._id}
                      className="candidate-item"
                      onClick={() => handleStartChatWith(candidate)}
                    >
                      {candidate.avatar ? (
                        <img src={candidate.avatar} alt={candidate.username} className="candidate-avatar" />
                      ) : (
                        <div className="candidate-avatar-placeholder">
                          {candidate.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="candidate-info">
                        <span className="cand-name">{candidate.username}</span>
                        <span className="cand-bio">{candidate.bio || "Developer"}</span>
                      </div>
                    </div>
                  ))
                )
              ) : loadingCandidates ? (
                <div className="candidates-loading">
                  <div className="loading-spinner-small" />
                  <span>Loading connections...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="candidates-empty">
                  <User size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <span>No followers or followed users found</span>
                </div>
              ) : (
                candidates.map((candidate) => (
                  <div
                    key={candidate._id}
                    className="candidate-item"
                    onClick={() => handleStartChatWith(candidate)}
                  >
                    {candidate.avatar ? (
                      <img src={candidate.avatar} alt={candidate.username} className="candidate-avatar" />
                    ) : (
                      <div className="candidate-avatar-placeholder">
                        {candidate.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="candidate-info">
                      <span className="cand-name">{candidate.username}</span>
                      <span className="cand-bio">{candidate.bio || "Developer"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP CHAT MODAL DIALOG */}
      {showCreateGroupModal && (
        <div className="new-chat-modal-overlay">
          <form className="new-chat-card glass-panel create-group-card" onSubmit={handleCreateGroupSubmit}>
            <div className="modal-header">
              <h3>Create Group Channel</h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowCreateGroupModal(false)}>×</button>
            </div>

            <div className="group-form-fields-container">
              {/* Group DP uploader */}
              <div className="group-dp-upload-section">
                <div className="group-avatar-preview-box" onClick={() => document.getElementById("group-avatar-input").click()}>
                  {groupAvatarPreview ? (
                    <img src={groupAvatarPreview} alt="Group DP Preview" className="group-avatar-preview-image" />
                  ) : (
                    <div className="group-avatar-preview-placeholder">
                      <Users size={32} className="placeholder-icon" />
                      <span>Upload DP</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  id="group-avatar-input"
                  style={{ display: "none" }}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleGroupAvatarSelect}
                />
              </div>

              {/* Group Text Fields */}
              <div className="group-text-inputs">
                <div className="group-input-wrapper">
                  <input
                    type="text"
                    placeholder="Group Name *"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className="group-text-input"
                  />
                </div>
                <div className="group-input-wrapper">
                  <textarea
                    placeholder="Group Description (e.g. topic, bio)..."
                    value={groupBio}
                    onChange={(e) => setGroupBio(e.target.value)}
                    className="group-textarea-input-field"
                  />
                </div>
              </div>
            </div>

            {/* Checklist of connections */}
            <div className="group-members-checklist-header">
              <h4>Select Group Members ({selectedMembers.length} selected)</h4>
            </div>

            <div className="candidates-list group-members-checklist">
              {loadingCandidates ? (
                <div className="candidates-loading">
                  <div className="loading-spinner-small" />
                  <span>Loading connections...</span>
                </div>
              ) : candidates.length === 0 ? (
                <div className="candidates-empty">
                  <User size={20} style={{ opacity: 0.3, marginBottom: "4px" }} />
                  <span>No followers or followed users found to add</span>
                </div>
              ) : (
                candidates.map((candidate) => {
                  const isChecked = selectedMembers.includes(candidate._id);
                  return (
                    <div
                      key={candidate._id}
                      className={`candidate-item checklist-item ${isChecked ? "checked" : ""}`}
                      onClick={() => handleToggleMember(candidate._id)}
                    >
                      <div className="checklist-left">
                        {candidate.avatar ? (
                          <img src={candidate.avatar} alt={candidate.username} className="candidate-avatar" />
                        ) : (
                          <div className="candidate-avatar-placeholder">
                            {candidate.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="candidate-info">
                          <span className="cand-name">{candidate.username}</span>
                          <span className="cand-bio">{candidate.bio || "Developer"}</span>
                        </div>
                      </div>
                      <div className={`checkbox-indicator ${isChecked ? "active" : ""}`}>
                        {isChecked && <Check size={14} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="group-modal-footer">
              <button
                type="button"
                className="group-modal-btn cancel"
                onClick={() => setShowCreateGroupModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="group-modal-btn submit"
                disabled={creatingGroup || !groupName.trim() || selectedMembers.length === 0}
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CODE BLOCK GENERATOR MODAL */}
      {showCodeModal && (
        <div className="code-block-modal-overlay">
          <div className="code-block-modal-card">
            <h3>Insert Code Block</h3>

            <div className="code-block-form-group">
              <label>Select Language</label>
              <select
                value={codeLang}
                onChange={(e) => setCodeLang(e.target.value)}
                className="code-block-select-lang"
              >
                <option value="javascript">JavaScript / TypeScript</option>
                <option value="python">Python</option>
                <option value="html">HTML / CSS</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="bash">Bash / Shell</option>
              </select>
            </div>

            <div className="code-block-form-group">
              <label>Paste Code Snippet</label>
              <textarea
                placeholder="// Write or paste your code here..."
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                className="code-block-textarea"
              />
            </div>

            <div className="code-block-modal-actions">
              <button
                type="button"
                onClick={() => { setShowCodeModal(false); setCodeText(""); }}
                className="code-block-modal-btn cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertCode}
                className="code-block-modal-btn insert"
              >
                Insert Code
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Report User Modal */}
      <ReportUserModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportedTargetUser(null);
          setReportEvidenceType("");
          setReportEvidenceId("");
        }}
        reportedUser={reportedTargetUser}
        evidenceType={reportEvidenceType}
        evidenceId={reportEvidenceId}
        addToast={addToast}
      />
      {/* WhatsApp-Style Light Mode Delete Message Confirmation Modal */}
      <AnimatePresence>
        {deleteModalMsg && (
          <div
            className="ce-modal-overlay"
            onClick={() => setDeleteModalMsg(null)}
            style={{
              zIndex: 100000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.55)",
              backdropFilter: "blur(8px)"
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="ce-modal-card whatsapp-light-delete-card"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "380px",
                width: "90%",
                padding: "26px 24px",
                textAlign: "center",
                background: "#ffffff",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "20px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "14px"
                }}
              >
                <Trash2 size={24} color="#ef4444" />
              </div>

              <h3 style={{ margin: "0 0 8px 0", color: "#111827", fontSize: "1.2rem", fontWeight: "700", letterSpacing: "-0.01em" }}>
                Delete message?
              </h3>

              <p style={{ margin: "0 0 22px 0", color: "#4b5563", fontSize: "0.88rem", lineHeight: 1.55 }}>
                {String(deleteModalMsg.sender?._id || deleteModalMsg.sender) === String(currentUserId)
                  ? "Do you want to delete this message for everyone or only for yourself?"
                  : "This message will be removed from your device only."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                {String(deleteModalMsg.sender?._id || deleteModalMsg.sender) === String(currentUserId) && (
                  <button
                    type="button"
                    onClick={() => confirmDeleteMessage(deleteModalMsg, "everyone")}
                    style={{
                      width: "100%",
                      padding: "12px 18px",
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      color: "#ffffff",
                      fontSize: "0.88rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 6px 18px rgba(239, 68, 68, 0.45)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(239, 68, 68, 0.35)";
                    }}
                  >
                    Delete for Everyone
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => confirmDeleteMessage(deleteModalMsg, "me")}
                  style={{
                    width: "100%",
                    padding: "12px 18px",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    color: "#1f2937",
                    fontSize: "0.88rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.15s ease, border-color 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f3f4f6";
                    e.currentTarget.style.borderColor = "#d1d5db";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                >
                  Delete for Me
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteModalMsg(null)}
                  style={{
                    width: "100%",
                    padding: "9px 18px",
                    borderRadius: "12px",
                    border: "none",
                    background: "transparent",
                    color: "#6b7280",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "color 0.15s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#111827"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#6b7280"}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}
