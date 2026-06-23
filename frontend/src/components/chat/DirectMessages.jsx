import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket/socket";
import { getFollowers, getFollowing } from "../../services/socialService";
import {
  getConversations,
  getChatHistory,
  sendDirectMessage,
  sendDirectMessageAttachment,
  deleteDirectMessage,
  editDirectMessage
} from "../../services/directMessageService";
import {
  Send, User, MessageSquare, Search, Plus, Circle, ShieldAlert, Sparkles, ArrowLeft,
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, FileText, Download, X,
  Check, CheckCheck, Trash2, Pencil, Minimize2, Maximize2, Minus, Square
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

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default function DirectMessages({ preselectedUser, onChatLoaded, onViewProfile }) {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  // Conversations list & active chat state
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // Partner user object
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New chat modal/dropdown state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [candidates, setCandidates] = useState([]); // Followers + Following
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Typing indicator states
  const [isTyping, setIsTyping] = useState(false); // Am I typing?
  const [partnerTyping, setPartnerTyping] = useState(false); // Is partner typing?

  // Refs
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Attachment states
  const [attachment, setAttachment] = useState(null); // { file, previewUrl, type: 'image'|'pdf' }
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const activeChatRef = useRef(activeChat);
  const currentUserIdRef = useRef(currentUserId);
  const preselectedUserRef = useRef(preselectedUser);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    preselectedUserRef.current = preselectedUser;
  }, [preselectedUser]);

  // Message delete states (edit functionality removed)

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

  // Load active conversations on mount
  useEffect(() => {
    fetchConversations(true);
    // Register socket room for DMs if not registered
    if (currentUserId) {
      socket.emit("register-user", currentUserId);
    }
  }, [currentUserId]);

  // Handle preselected chat partner redirected from a public profile card
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
          const preselectedUserVal = preselectedUserRef.current;
          
          // Force activeChat's unread count to 0 locally to prevent any race condition flickers
          if (activeChatVal) {
            list = list.map((c) =>
              String(c.user?._id || c.user?.id) === String(activeChatVal._id)
                ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, isRead: true } }
                : c
            );
          }

          const partner = activeChatVal || preselectedUserVal;
          if (partner) {
            const exists = list.some((c) => String(c.user?._id || c.user?.id) === String(partner._id));
            if (!exists) {
              list = [
                {
                  user: partner,
                  lastMessage: {
                    text: "",
                    senderId: "",
                    createdAt: new Date().toISOString(),
                    isRead: true,
                  },
                  unreadCount: 0,
                },
                ...list,
              ];
            }
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

  // Socket listeners for real-time messages & typing, edits, deletions, and read receipts
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      const activeChatVal = activeChatRef.current;
      // If the message is part of the active chat
      if (
        activeChatVal &&
        (String(msg.sender._id) === String(activeChatVal._id) ||
         String(msg.recipient._id) === String(activeChatVal._id))
      ) {
        // If the active partner sent this message, mark it read on database
        if (String(msg.sender._id) === String(activeChatVal._id)) {
          getChatHistory(activeChatVal._id).catch((e) => console.error("Error marking messages read:", e));
        }

        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        setPartnerTyping(false);
      }
      // Refresh conversations list to update lastMessage and badge
      fetchConversations();
    };

    const handlePartnerTyping = ({ senderId }) => {
      const activeChatVal = activeChatRef.current;
      if (activeChatVal && String(senderId) === String(activeChatVal._id)) {
        setPartnerTyping(true);
      }
    };

    const handlePartnerStopTyping = ({ senderId }) => {
      const activeChatVal = activeChatRef.current;
      if (activeChatVal && String(senderId) === String(activeChatVal._id)) {
        setPartnerTyping(false);
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
            String(m.sender._id || m.sender) === String(currentUserIdVal)
              ? { ...m, isRead: true }
              : m
          )
        );
      }
    };

    socket.on("dm:receive", handleReceiveMessage);
    socket.on("dm:typing", handlePartnerTyping);
    socket.on("dm:stop-typing", handlePartnerStopTyping);
    socket.on("dm:delete", handleReceiveDelete);
    socket.on("dm:read", handleReceiveReadReceipt);

    return () => {
      socket.off("dm:receive", handleReceiveMessage);
      socket.off("dm:typing", handlePartnerTyping);
      socket.off("dm:stop-typing", handlePartnerStopTyping);
      socket.off("dm:delete", handleReceiveDelete);
      socket.off("dm:read", handleReceiveReadReceipt);
    };
  }, []);

  // Load chat history when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    loadHistory(activeChat._id);
    setPartnerTyping(false);
  }, [activeChat]);

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

  // Local stream and calling socket listeners removed (now managed globally in CallContext)

  // Revoke object URL on attachment changes/unmount
  useEffect(() => {
    return () => {
      if (attachment && attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment]);

  // Media device controls and helpers removed (now managed globally in CallContext)

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf"
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Only images (PNG, JPG, JPEG, WEBP) and PDF files are allowed!");
      e.target.value = "";
      return;
    }

    const type = file.type === "application/pdf" ? "pdf" : "image";
    const previewUrl = type === "image" ? URL.createObjectURL(file) : null;

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



  // 3D background animation removed

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
    if (!activeChat) return;

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
    setConversations((prev) =>
      prev.map((c) =>
        String(c.user?._id || c.user?.id) === String(partner._id)
          ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, isRead: true } }
          : c
      )
    );
    setShowNewChatModal(false);
    setSearchQuery("");
  };

  // Filter candidates list based on search
  const filteredCandidates = candidates.filter(candidate =>
    candidate.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`ce-direct-messages-layout ${activeChat ? "show-chat" : ""}`}>
      {/* LEFT SIDEBAR: Conversational partners list */}
      <div className="dm-conversations-panel">
        <div className="conversations-header">
          <div className="header-top">
            <h2 className="panel-title">Messages</h2>
            <button className="new-chat-btn" onClick={handleOpenNewChat} title="New Message">
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="conversations-list">
          {loadingConversations ? (
            <div className="conversations-loading">
              <div className="loading-spinner-small" />
              <span>Loading messages...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="conversations-empty">
              <MessageSquare size={26} style={{ opacity: 0.4 }} />
              <p>No active chats</p>
              <button className="start-btn" onClick={handleOpenNewChat}>Start Chat</button>
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeChat && activeChat._id === conv.user._id;
              return (
                <div
                  key={conv.user._id}
                  className={`conversation-item ${isSelected ? "selected" : ""} ${!conv.lastMessage.isRead && conv.lastMessage.senderId !== currentUserId ? "unread" : ""}`}
                  onClick={() => {
                    setActiveChat(conv.user);
                    setConversations((prev) =>
                      prev.map((c) =>
                        String(c.user?._id || c.user?.id) === String(conv.user._id)
                          ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, isRead: true } }
                          : c
                      )
                    );
                  }}
                >
                  <div 
                    className="avatar-wrapper chat-list-avatar-clickable"
                    onClick={(e) => {
                      if (onViewProfile) {
                        e.stopPropagation();
                        onViewProfile(conv.user._id);
                      }
                    }}
                    style={{ cursor: onViewProfile ? "pointer" : "default" }}
                    title={`View @${conv.user.username}'s profile`}
                  >
                    {conv.user.avatar ? (
                      <img src={conv.user.avatar} alt={conv.user.username} className="user-avatar" />
                    ) : (
                      <div className="user-avatar-placeholder">
                        {conv.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {conv.user.isOnline && <span className="online-dot-badge" />}
                  </div>
                  <div className="item-details">
                    <div className="details-top">
                      <span className="username">{conv.user.username}</span>
                      <span className="timestamp">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="last-message">
                      {conv.lastMessage.senderId === currentUserId ? "You: " : ""}
                      {conv.lastMessage.fileUrl ? (
                        <span className="attachment-indicator">
                          {conv.lastMessage.fileType === "image" ? "📷 Image" : "📄 PDF Document"}
                        </span>
                      ) : (
                        conv.lastMessage.text
                      )}
                    </p>
                  </div>
                  {!conv.lastMessage.isRead && conv.lastMessage.senderId !== currentUserId && (
                    <div className="unread-count-badge">
                      {conv.unreadCount !== undefined ? (conv.unreadCount > 9 ? "9+" : conv.unreadCount) : "1"}
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
                onClick={() => onViewProfile && onViewProfile(activeChat._id)}
                style={{ cursor: onViewProfile ? "pointer" : "default" }}
                title={`View @${activeChat.username}'s profile`}
              >
                <div className="avatar-wrapper">
                  {activeChat.avatar ? (
                    <img src={activeChat.avatar} alt={activeChat.username} className="user-avatar-header" />
                  ) : (
                    <div className="user-avatar-placeholder header">
                      {activeChat.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {activeChat.isOnline && <span className="online-dot-badge header" />}
                </div>
                <div className="user-status-text">
                  <span className="chat-partner-name">{activeChat.username}</span>
                  <span className={`status-label ${activeChat.isOnline ? "online" : ""}`}>
                    {activeChat.isOnline ? "online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="chat-header-actions">
                <button
                  type="button"
                  className="header-action-btn audio-call-btn"
                  onClick={() => handleStartCall("audio", activeChat)}
                  title={`Start Audio Call with ${activeChat.username}`}
                  disabled={!!activeCall}
                >
                  <Phone size={18} />
                </button>
                <button
                  type="button"
                  className="header-action-btn video-call-btn"
                  onClick={() => handleStartCall("video", activeChat)}
                  title={`Start Video Call with ${activeChat.username}`}
                  disabled={!!activeCall}
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
                      const isMe = String(msg.sender._id || msg.sender) === String(currentUserId);
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
                                {msg.fileUrl && (
                                  <div className="message-attachment-container">
                                    <div className="message-attachment">
                                      {msg.fileType === "image" ? (
                                        <img
                                          src={msg.fileUrl}
                                          alt={msg.fileName || "Image attachment"}
                                          className="dm-message-image"
                                          onClick={() => window.open(msg.fileUrl, "_blank")}
                                          title="Click to view image"
                                        />
                                      ) : (
                                        <div className="dm-message-pdf" onClick={() => window.open(msg.fileUrl, "_blank")} title="Open PDF">
                                          <div className="pdf-icon-box">
                                            <FileText size={24} className="pdf-icon" />
                                          </div>
                                          <div className="pdf-info">
                                            <span className="pdf-name">{msg.fileName || "Document.pdf"}</span>
                                            <span className="pdf-action">Open PDF</span>
                                          </div>
                                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="pdf-download-link" onClick={e => e.stopPropagation()}>
                                            <Download size={14} />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Standalone media attachment metadata overlay */}
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
                                    {msg.message}
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
                    {attachment.type === "pdf" ? (
                      <div className="preview-pdf-wrapper">
                        <FileText className="preview-icon pdf" size={24} />
                      </div>
                    ) : (
                      <img src={attachment.previewUrl} alt="Preview" className="preview-thumb" />
                    )}
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

              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className="attachment-trigger-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add Image or PDF"
                  disabled={isSending}
                >
                  <Plus size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                  style={{ display: "none" }}
                />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={attachment ? "Add a caption..." : `Message ${activeChat.username}...`}
                  value={newMessageText}
                  onChange={handleInputChange}
                  className="message-textarea"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  className={`send-msg-btn ${(newMessageText.trim() || attachment) && !isSending ? "active" : ""}`}
                  disabled={(!newMessageText.trim() && !attachment) || isSending}
                >
                  {isSending ? <div className="loading-spinner-tiny animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="dm-empty-state">
            <div className="instagram-dm-icon-wrapper">
              <MessageSquare size={48} className="dm-icon" />
            </div>
            <h3>Your Messages</h3>
            <p>Send private photos, text messages, or invite links directly to a developer.</p>
            <button className="start-chat-main-btn" onClick={handleOpenNewChat}>Send Message</button>
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
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="candidates-list">
              {loadingCandidates ? (
                <div className="candidates-loading">
                  <div className="loading-spinner-small" />
                  <span>Loading connections...</span>
                </div>
              ) : filteredCandidates.length === 0 ? (
                <div className="candidates-empty">
                  <User size={24} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <span>No followers or followed users found</span>
                </div>
              ) : (
                filteredCandidates.map((candidate) => (
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

      {/* Calling overlay removed (rendered globally via CallOverlay) */}
    </div>
  );
}
