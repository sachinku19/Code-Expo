import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket/socket";
import { getFollowers, getFollowing, searchUsers } from "../../services/socialService";
import {
  getConversations,
  getChatHistory,
  sendDirectMessage,
  sendDirectMessageAttachment,
  deleteDirectMessage
} from "../../services/directMessageService";
import {
  Send, User, MessageSquare, Search, Plus, ArrowLeft,
  Phone, Video, FileText, Download, X,
  Check, CheckCheck, Trash2, Image, Code2, Sliders, MoreVertical, Info, Users
} from "lucide-react";
import { useCall } from "../../context/CallContext";
import "./DirectMessages.css";

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

export default function DirectMessages({ preselectedUser, onChatLoaded, onViewProfile }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

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
  const [partnerTyping, setPartnerTyping] = useState(false); 

  // Refs
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Attachment states
  const [attachment, setAttachment] = useState(null); 
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const currentUserIdRef = useRef(currentUserId);
  const preselectedUserRef = useRef(preselectedUser);

  const activeChatId = activeChat?._id || activeChat?.id;

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    preselectedUserRef.current = preselectedUser;
  }, [preselectedUser]);

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
      setSearchResults([]);
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
      setActiveChat(preselectedUser);
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
  const fetchConversations = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoadingConversations(true);
      }
      const res = await getConversations();
      if (res.success) {
        setConversations((prev) => {
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
          return list;
        });
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
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
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setPartnerTyping(false);
      }
      fetchConversations();
    };

    const handlePartnerTyping = ({ senderId }) => {
      const activeChatVal = activeChatRef.current;
      const currentUserIdVal = currentUserIdRef.current;
      if (activeChatVal) {
        if (activeChatVal.isGroup) {
          if (String(senderId) !== String(currentUserIdVal)) {
            setPartnerTyping(true);
          }
        } else if (String(senderId) === String(activeChatVal._id)) {
          setPartnerTyping(true);
        }
      }
    };

    const handlePartnerStopTyping = ({ senderId }) => {
      const activeChatVal = activeChatRef.current;
      const currentUserIdVal = currentUserIdRef.current;
      if (activeChatVal) {
        if (activeChatVal.isGroup) {
          if (String(senderId) !== String(currentUserIdVal)) {
            setPartnerTyping(false);
          }
        } else if (String(senderId) === String(activeChatVal._id)) {
          setPartnerTyping(false);
        }
      }
    };

    const handleReceiveDelete = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
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
        setMessages((prev) =>
          prev.map((m) =>
            String(m.sender?._id || m.sender) === String(currentUserIdVal)
              ? { ...m, isRead: true }
              : m
          )
        );
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

    socket.on("dm:receive", handleReceiveMessage);
    socket.on("dm:typing", handlePartnerTyping);
    socket.on("dm:stop-typing", handlePartnerStopTyping);
    socket.on("dm:delete", handleReceiveDelete);
    socket.on("dm:read", handleReceiveReadReceipt);
    socket.on("user:status", handleUserStatusChange);
    socket.on("group:created", handleGroupCreated);

    return () => {
      socket.off("dm:receive", handleReceiveMessage);
      socket.off("dm:typing", handlePartnerTyping);
      socket.off("dm:stop-typing", handlePartnerStopTyping);
      socket.off("dm:delete", handleReceiveDelete);
      socket.off("dm:read", handleReceiveReadReceipt);
      socket.off("user:status", handleUserStatusChange);
      socket.off("group:created", handleGroupCreated);
    };
  }, []);

  // Load chat history when active chat changes (using activeChatId primitive to fix reload loops)
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    loadHistory(activeChatId);
    setPartnerTyping(false);
  }, [activeChatId]);

  // Auto-scroll chat history
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // Load chat history
  const loadHistory = async (userId) => {
    try {
      setLoadingHistory(true);
      const res = await getChatHistory(userId);
      if (res.success) {
        setMessages(res.messages || []);
        window.dispatchEvent(new CustomEvent("ce-unread-messages-update"));
        fetchConversations();
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

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

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDirectMessage(messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      fetchConversations();
    } catch (err) {
      console.error("Error deleting message:", err);
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
            return [...prev, res.message];
          });
          handleRemoveAttachment();
          fetchConversations();
        }
      } else {
        const res = await sendDirectMessage(activeChat._id, messageToSend);
        if (res.success) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === res.message._id)) return prev;
            return [...prev, res.message];
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
      socket.emit("dm:typing", { recipientId: activeChat._id });
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

  // Filter candidates list based on search
  const filteredCandidates = candidates.filter(candidate =>
    candidate.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                onClick={() => onViewProfile && !activeChat.isGroup && onViewProfile(activeChat._id)}
                style={{ cursor: onViewProfile && !activeChat.isGroup ? "pointer" : "default" }}
                title={activeChat.isGroup ? "" : `View @${activeChat.username || activeChat.name}'s profile`}
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
              
              <div className="chat-header-actions">
                <button
                  type="button"
                  className="header-action-btn"
                  onClick={() => !activeChat.isGroup && handleStartCall("audio", activeChat)}
                  title={activeChat.isGroup ? "Audio Call Unavailable" : `Start Audio Call with ${activeChat.username}`}
                  disabled={!!activeCall || activeChat.isGroup}
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  className="header-action-btn"
                  onClick={() => !activeChat.isGroup && handleStartCall("video", activeChat)}
                  title={activeChat.isGroup ? "Video Call Unavailable" : `Start Video Call with ${activeChat.username}`}
                  disabled={!!activeCall || activeChat.isGroup}
                >
                  <Video size={18} />
                </button>
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
                              
                              <div className="message-bubble">
                                {activeChat.isGroup && !isMe && (
                                  <div className="group-message-sender-name">
                                    {msg.sender?.username || "Developer"}
                                  </div>
                                )}

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
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                  {partnerTyping && (
                    <div className="message-bubble-wrapper received">
                      <div className="bubble-avatar-container">
                        {activeChat.avatar ? (
                          <img src={activeChat.avatar} alt={activeChat.username} className="bubble-partner-avatar" />
                        ) : (
                          <div className="bubble-partner-avatar-placeholder">
                            {(activeChat.username || activeChat.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="message-bubble typing-bubble">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Chat input box */}
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
    </div>
  );
}
