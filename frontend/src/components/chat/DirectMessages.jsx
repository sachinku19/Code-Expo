/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket/socket";
import { getFollowers, getFollowing, searchUsers } from "../../services/socialService";
import {
  getConversations,
  getChatHistory,
  sendDirectMessage,
  sendDirectMessageAttachment,
  deleteDirectMessage,
  blockUser,
  unblockUser,
  deleteGroupChat,
  addGroupMember,
  removeGroupMember,
  updateGroupChat
} from "../../services/directMessageService";
import {
  Send, User, MessageSquare, Search, Plus, ArrowLeft,
  Phone, Video, X, ArrowUpRight, ArrowDownLeft,
  Check, CheckCheck, Trash2, Image, Code2, Sliders, MoreVertical, Info, Users, Ban, ShieldAlert
} from "lucide-react";
import { useCall } from "../../context/CallContext";
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

export default function DirectMessages({ preselectedUser, onChatLoaded, onViewProfile, addToast }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  // Report user states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedTargetUser, setReportedTargetUser] = useState(null);
  const [reportEvidenceType, setReportEvidenceType] = useState("");
  const [reportEvidenceId, setReportEvidenceId] = useState("");
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  // Conversations list & active chat state
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // Partner user or group object
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
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

  // Load candidates for adding members
  useEffect(() => {
    if (showAddMemberModal && currentUserId) {
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
          console.error("Error loading add-member candidates:", err);
        }
      };
      loadCandidates();
    }
  }, [showAddMemberModal, currentUserId]);

  // Global calling context
  const {
    activeCall,
    handleStartCall
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

  // Fetch active conversations
  async function fetchConversations(showLoader = false) {
    try {
      if (showLoader) {
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
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  }

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
          if (prev.some((m) => m._id === msg._id)) return prev;
          const next = [...prev, msg];
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
      fetchConversations();
    };

    const handlePartnerTyping = ({ senderId, senderInfo }) => {
      const activeChatVal = activeChatRef.current;
      const currentUserIdVal = currentUserIdRef.current;
      if (!activeChatVal || String(senderId) === String(currentUserIdVal)) return;

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
      if (
        activeChatVal &&
        String(readerId) === String(activeChatVal._id) &&
        String(senderId) === String(currentUserIdVal)
      ) {
        setMessages((prev) => {
          const next = prev.map((m) =>
            String(m.sender?._id || m.sender) === String(currentUserIdVal)
              ? { ...m, isRead: true }
              : m
          );
          if (activeChatVal) {
            const key = activeChatVal._id || activeChatVal.id;
            chatHistoryCacheRef.current[key] = next;
          }
          return next;
        });
      }
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

  // Helper to scroll messages board to bottom programmatically
  const scrollToBottom = (behavior = "smooth") => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  };

  // Auto-scroll chat history using refined logic for instant vs smooth scroll
  useEffect(() => {
    if (activeChatId) {
      if (prevChatIdRef.current !== activeChatId || prevMessagesCountRef.current === 0) {
        scrollToBottom("auto");
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
    }
  }, [messages, partnerTypers.length, activeChatId]);

  // Load chat history (Stale-While-Revalidate Caching pattern)
  async function loadHistory(userId) {
    const hasCache = !!chatHistoryCacheRef.current[userId];
    if (hasCache) {
      setMessages(chatHistoryCacheRef.current[userId]);
    } else {
      setLoadingHistory(true);
    }
    try {
      const res = await getChatHistory(userId);
      if (res.success) {
        const fetchedMsgs = res.messages || [];
        chatHistoryCacheRef.current[userId] = fetchedMsgs;
        setMessages(fetchedMsgs);
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
        fetchConversations();
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

  const handleDeleteMessage = (messageId) => {
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return;
    setIsDeletingMessage(true);
    try {
      await deleteDirectMessage(messageToDelete);
      setMessages((prev) => {
        const next = prev.filter((m) => m._id !== messageToDelete);
        if (activeChatId) {
          chatHistoryCacheRef.current[activeChatId] = next;
        }
        return next;
      });
      fetchConversations();
    } catch (err) {
      console.error("Error deleting message:", err);
    } finally {
      setIsDeletingMessage(false);
      setMessageToDelete(null);
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

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessageText.trim() && !attachment) || !activeChat || isSending) return;

    const messageToSend = newMessageText.trim();
    setNewMessageText("");

    // Stop typing emitter
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("dm:stop-typing", { recipientId: activeChat._id });
    setIsTyping(false);



    // Actual API Chat Handling
    try {
      setIsSending(true);
      if (attachment) {
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
          fetchConversations();
        }
      } else {
        const res = await sendDirectMessage(activeChat._id, messageToSend);
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
          fetchConversations();
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
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
                    {conv.isGroup ? (
                      chatPartner.avatar ? (
                        <img src={chatPartner.avatar} alt={partnerName} className="user-avatar" />
                      ) : (
                        <div className="group-avatar-icon-box">
                          <Users size={16} className="group-avatar-icon" />
                        </div>
                      )
                    ) : chatPartner.avatar ? (
                      <img src={chatPartner.avatar} alt={partnerName} className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {partnerName.charAt(0).toUpperCase()}
                      </div>
                    )}
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
                          {conv.lastMessage.fileUrl ? (
                            <span className="attachment-indicator">
                              📷 Image
                            </span>
                          ) : (
                            conv.lastMessage.text
                          )}
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
      <div className="dm-chat-panel">
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
                  {activeChat.isGroup ? (
                    activeChat.avatar ? (
                      <img src={activeChat.avatar} alt={activeChat.name} className="user-avatar-header" />
                    ) : (
                      <div className="group-avatar-icon-box header">
                        <Users size={18} className="group-avatar-icon" />
                      </div>
                    )
                  ) : activeChat.avatar ? (
                    <img src={activeChat.avatar} alt={activeChat.username} className="user-avatar-header" />
                  ) : (
                    <div className="user-avatar-placeholder header">
                      {(activeChat.username || activeChat.name).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {activeChat.isOnline && !activeChat.isGroup && <span className="online-dot-badge header" />}
                </div>
                
                <div className="user-status-text">
                  <span className="chat-partner-name">{activeChat.isGroup ? activeChat.name : activeChat.username}</span>
                  <span className={`status-label ${activeChat.isOnline || activeChat.isGroup ? "online" : ""}`}>
                    {activeChat.isGroup ? (activeChat.bio || "Group Channel") : activeChat.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              
              <div className="chat-header-actions" style={{ position: "relative" }}>
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
                  {(() => {
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
                          <div className={`message-bubble-wrapper ${isMe ? "sent" : "received"}`}>
                            {!isMe && (
                              <div className="bubble-avatar-container">
                                {activeChat.isGroup ? (
                                  msg.sender?.avatar ? (
                                    <img src={msg.sender.avatar} alt={msg.sender.username} className="bubble-partner-avatar" />
                                  ) : (
                                    <div className="msg-sender-avatar-placeholder">
                                      {msg.sender?.username?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                  )
                                ) : activeChat.avatar ? (
                                  <img src={activeChat.avatar} alt={activeChat.username} className="bubble-partner-avatar" />
                                ) : (
                                  <div className="bubble-partner-avatar-placeholder">
                                    {activeChat.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="message-bubble-container">
                              {isMe && (
                                <div className="message-bubble-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    className="bubble-action-btn delete-btn"
                                    title="Delete message"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}
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
                                    <div
                                      style={{
                                        position: "absolute",
                                        right: "100%",
                                        top: 0,
                                        background: "rgba(10, 10, 18, 0.96)",
                                        backdropFilter: "blur(16px)",
                                        border: "1px solid var(--ce-border)",
                                        borderRadius: "6px",
                                        boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
                                        zIndex: 1000,
                                        minWidth: "125px",
                                        width: "max-content",
                                        whiteSpace: "nowrap",
                                        display: "flex",
                                        flexDirection: "column",
                                        padding: "4px"
                                      }}
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveMessageMenuId(null);
                                          setReportedTargetUser(msg.sender || activeChat);
                                          setReportEvidenceType("MESSAGE");
                                          setReportEvidenceId(msg._id);
                                          setReportModalOpen(true);
                                        }}
                                        style={{
                                          background: "transparent",
                                          border: "none",
                                          color: "#ef4444",
                                          fontSize: "0.74rem",
                                          fontWeight: "600",
                                          padding: "8px 12px",
                                          textAlign: "left",
                                          cursor: "pointer",
                                          width: "100%",
                                          borderRadius: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          transition: "background 0.2s ease"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                      >
                                        ⚠️ Report Msg
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className={`message-bubble ${msg.fileType === 'call' ? 'call-history-bubble' : ''}`}>
                                {activeChat.isGroup && !isMe && (
                                  <div className="group-message-sender-name">
                                    {msg.sender?.username || "Developer"}
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
                                            src={msg.fileUrl}
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
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
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

                {/* Redesigned Premium Chat Input Card */}
                <div className="chat-input-card">
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
                  <div className="chat-input-actions-bar">
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
                    <button
                      type="submit"
                      className="chat-send-purple-btn"
                      onClick={handleSendMessage}
                      disabled={(!newMessageText.trim() && !attachment) || isSending}
                    >
                      {isSending ? (
                        <div className="loading-spinner-tiny animate-spin" />
                      ) : (
                        <>
                          <Send size={14} className="send-icon-margin" /> Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SLIDING GROUP INFO PANEL */}
            {showGroupInfoPanel && activeChat.isGroup && (
              <div className="group-info-panel animate-slide-left" onClick={(e) => e.stopPropagation()}>
                <div className="group-info-header">
                  <h3>Group Info</h3>
                  <button type="button" className="close-panel-btn" onClick={() => setShowGroupInfoPanel(false)}>
                    <X size={18} />
                  </button>
                </div>

                <div className="group-info-scroll-container">
                  {/* Avatar & Meta */}
                  {(() => {
                    const isAdminOfGroup = activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId));
                    return (
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
                        <h4 className="group-info-name">{activeChat.name}</h4>
                        <p className="group-info-bio">{activeChat.bio || "No group description."}</p>
                        <span className="group-info-created-by">
                          Admin: @{activeChat.createdBy?.username || activeChat.createdBy || "Admin"}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Members List */}
                  <div className="group-info-members-section">
                    <div className="members-section-header">
                      <h4>Group Members ({activeChat.members?.length || 0})</h4>
                      {activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId)) && (
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
                        const isAdminOfGroup = activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId));
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
                                <span className="member-admin-badge">Admin</span>
                              ) : (
                                isAdminOfGroup && (
                                  <button
                                    type="button"
                                    className="member-row-remove-btn"
                                    onClick={() => handleRemoveMemberSubmit(member._id, member.username)}
                                    title={`Remove @${member.username}`}
                                  >
                                    Remove
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="group-info-footer">
                  {activeChat.createdBy && (String(activeChat.createdBy._id || activeChat.createdBy) === String(currentUserId)) ? (
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
            )}

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
            <p>Send private photos, text messages, or invite links directly to a developer.</p>
            <div className="empty-actions" style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button className="start-chat-main-btn" onClick={handleOpenNewChat}>Send DM</button>
              <button className="start-chat-main-btn group-start-btn" onClick={handleOpenCreateGroup} style={{ background: "rgba(139, 92, 246, 0.15)", border: "1px solid rgba(139, 92, 246, 0.4)" }}>Create Group</button>
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
      {/* Delete Direct Message Confirmation Modal */}
      <AnimatePresence>
        {messageToDelete && (
          <div className="ce-modal-overlay" onClick={() => setMessageToDelete(null)} style={{ zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="ce-modal-card"
              style={{ maxWidth: "380px", width: "90%", padding: "20px", textAlign: "center", background: "#0a0a0f", border: "1px solid var(--ce-premium-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "1.1rem", fontWeight: "700" }}>Delete Message?</h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--ce-premium-muted)", fontSize: "0.82rem", lineHeight: "1.4" }}>
                Are you sure you want to delete this message? This action will permanently remove it from your chat history.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteMessage}
                  disabled={isDeletingMessage}
                  style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "none", background: "#ef4444", color: "#fff", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer" }}
                >
                  {isDeletingMessage ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
