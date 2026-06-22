import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket/socket";
import { getFollowers, getFollowing } from "../../services/socialService";
import { getConversations, getChatHistory, sendDirectMessage } from "../../services/directMessageService";
import { Send, User, MessageSquare, Search, Plus, Circle, ShieldAlert, Sparkles, ArrowLeft } from "lucide-react";
import "./DirectMessages.css";

export default function DirectMessages({ preselectedUser, onChatLoaded }) {
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
          
          // Force activeChat's unread count to 0 locally to prevent any race condition flickers
          if (activeChat) {
            list = list.map((c) =>
              String(c.user?._id || c.user?.id) === String(activeChat._id)
                ? { ...c, unreadCount: 0, lastMessage: { ...c.lastMessage, isRead: true } }
                : c
            );
          }

          const partner = activeChat || preselectedUser;
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

  // Socket listeners for real-time messages & typing
  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      // If the message is part of the active chat
      if (
        activeChat &&
        (String(msg.sender._id) === String(activeChat._id) ||
         String(msg.recipient._id) === String(activeChat._id))
      ) {
        // If the active partner sent this message, hit getChatHistory in background to mark it read on database
        if (String(msg.sender._id) === String(activeChat._id)) {
          getChatHistory(activeChat._id).catch((e) => console.error("Error marking messages read:", e));
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
      if (activeChat && String(senderId) === String(activeChat._id)) {
        setPartnerTyping(true);
      }
    };

    const handlePartnerStopTyping = ({ senderId }) => {
      if (activeChat && String(senderId) === String(activeChat._id)) {
        setPartnerTyping(false);
      }
    };

    socket.on("dm:receive", handleReceiveMessage);
    socket.on("dm:typing", handlePartnerTyping);
    socket.on("dm:stop-typing", handlePartnerStopTyping);

    return () => {
      socket.off("dm:receive", handleReceiveMessage);
      socket.off("dm:typing", handlePartnerTyping);
      socket.off("dm:stop-typing", handlePartnerStopTyping);
    };
  }, [activeChat]);

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

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeChat) return;

    const messageToSend = newMessageText.trim();
    setNewMessageText("");

    // Stop typing emitter
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("dm:stop-typing", { recipientId: activeChat._id });
    setIsTyping(false);

    try {
      const res = await sendDirectMessage(activeChat._id, messageToSend);
      if (res.success) {
        // Appends to message array (the controller socket broadcast also catches this, but to guarantee order we check duplication)
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
        fetchConversations();
      }
    } catch (err) {
      console.error("Error sending direct message:", err);
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
                  <div className="avatar-wrapper">
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
                      {conv.lastMessage.text}
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
            <div className="chat-header">
              <button 
                type="button" 
                className="chat-back-btn" 
                onClick={() => setActiveChat(null)}
                title="Back to chats"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="header-user-info">
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
                  {messages.map((msg) => {
                    const isMe = String(msg.sender._id || msg.sender) === String(currentUserId);
                    return (
                      <div key={msg._id} className={`message-bubble-wrapper ${isMe ? "sent" : "received"}`}>
                        <div className="message-bubble">
                          <p className="message-text">{msg.message}</p>
                          <span className="message-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                placeholder={`Message ${activeChat.username}...`}
                value={newMessageText}
                onChange={handleInputChange}
                className="message-textarea"
              />
              <button
                type="submit"
                className={`send-msg-btn ${newMessageText.trim() ? "active" : ""}`}
                disabled={!newMessageText.trim()}
              >
                <Send size={15} />
              </button>
            </form>
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
    </div>
  );
}
