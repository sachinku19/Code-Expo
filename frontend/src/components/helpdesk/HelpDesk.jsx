import React, { useState, useEffect, useRef } from "react";
import {
  getUserTickets,
  getTicketDetails,
  createTicket,
  addTicketMessage
} from "../../services/ticketService";
import {
  Plus, MessageSquare, Send, Calendar, CheckCircle2,
  Clock, AlertCircle, FileText, Loader2, ArrowLeft, RefreshCw
} from "lucide-react";
import "./HelpDesk.css";

export default function HelpDesk() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Form states
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [replyMessage, setReplyMessage] = useState("");

  const chatEndRef = useRef(null);

  // Fetch user tickets
  const fetchTickets = async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const data = await getUserTickets();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      if (!silent) setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Poll for new messages if a ticket is open
  useEffect(() => {
    if (!selectedTicket) return;

    const interval = setInterval(async () => {
      try {
        const data = await getTicketDetails(selectedTicket._id);
        if (data.success) {
          // Check if message length changed to avoid re-rendering
          if (data.ticket.messages.length !== selectedTicket.messages.length || data.ticket.status !== selectedTicket.status) {
            setSelectedTicket(data.ticket);
          }
        }
      } catch (err) {
        console.error("Error polling ticket details:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedTicket]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedTicket?.messages]);

  const handleSelectTicket = async (ticketId) => {
    setIsCreating(false);
    setLoadingDetails(true);
    try {
      const data = await getTicketDetails(ticketId);
      if (data.success) {
        setSelectedTicket(data.ticket);
      }
    } catch (err) {
      console.error("Error getting ticket details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateTicketSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setSubmittingTicket(true);
    try {
      const data = await createTicket(subject.trim(), description.trim());
      if (data.success) {
        setSubject("");
        setDescription("");
        setIsCreating(false);
        await fetchTickets();
        if (data.ticket) {
          handleSelectTicket(data.ticket._id);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create support ticket.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;

    setSendingMessage(true);
    try {
      const data = await addTicketMessage(selectedTicket._id, replyMessage.trim());
      if (data.success) {
        setReplyMessage("");
        setSelectedTicket((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            messages: data.messages
          };
        });
        // Silent list update to reflect status change
        fetchTickets(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "resolved":
        return <CheckCircle2 size={14} className="icon-resolved" />;
      case "in-progress":
        return <Clock size={14} className="icon-progress" />;
      default:
        return <AlertCircle size={14} className="icon-open" />;
    }
  };

  return (
    <div className="helpdesk-container glass-panel animate-fade-in">
      <div className="helpdesk-sidebar-pane">
        <div className="helpdesk-sidebar-header">
          <div className="title-row">
            <MessageSquare size={18} className="theme-accent-color" />
            <h3>Help Desk</h3>
            <button
              onClick={() => fetchTickets(true)}
              className="btn-refresh-tickets"
              title="Refresh tickets list"
            >
              <RefreshCw size={13} />
            </button>
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedTicket(null);
            }}
            className="btn-create-ticket-trigger"
          >
            <Plus size={14} /> New Ticket
          </button>
        </div>

        <div className="helpdesk-tickets-list-scroll">
          {loadingList ? (
            <div className="helpdesk-loader-box">
              <Loader2 className="spinner" size={24} />
              <span>Loading tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="helpdesk-empty-state">
              <FileText size={20} className="muted-icon" />
              <p>No support tickets yet. Need help? Create a ticket to start a session with an administrator.</p>
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?._id === t._id;
              const formattedDate = new Date(t.updatedAt).toLocaleDateString();
              const lastMessage = t.messages?.length > 0 ? t.messages[t.messages.length - 1].message : t.description;

              return (
                <div
                  key={t._id}
                  onClick={() => handleSelectTicket(t._id)}
                  className={`helpdesk-ticket-item-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="ticket-item-meta">
                    <span className={`status-badge-pill ${t.status}`}>
                      {getStatusIcon(t.status)}
                      {t.status.toUpperCase()}
                    </span>
                    <span className="ticket-item-date">{formattedDate}</span>
                  </div>
                  <h4 className="ticket-item-title">{t.subject}</h4>
                  <p className="ticket-item-snippet">{lastMessage}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="helpdesk-content-pane">
        {isCreating ? (
          <div className="helpdesk-composer-wrapper animate-fade-in">
            <div className="composer-header-row">
              <h4>Create Support Ticket</h4>
              <button className="btn-mobile-back" onClick={() => setIsCreating(false)}>
                <ArrowLeft size={16} /> Back
              </button>
            </div>
            <p className="composer-desc-helper">
              Describe your issue in detail. A system administrator will review your query and reply directly inside this ticket.
            </p>

            <form onSubmit={handleCreateTicketSubmit} className="composer-form-container">
              <div className="composer-field">
                <label>Ticket Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Workspace files failed to compile"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="composer-field">
                <label>Problem Description</label>
                <textarea
                  placeholder="Tell us what went wrong, including any error logs, steps to reproduce, or browser specs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="btn-submit-support-ticket"
              >
                {submittingTicket ? (
                  <>
                    <Loader2 className="spinner" size={14} /> Submitting...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </button>
            </form>
          </div>
        ) : selectedTicket ? (
          <div className="helpdesk-ticket-detail-view animate-fade-in">
            {loadingDetails ? (
              <div className="helpdesk-details-loader">
                <Loader2 className="spinner" size={30} />
                <span>Loading ticket logs...</span>
              </div>
            ) : (
              <>
                <div className="ticket-details-header">
                  <div className="header-meta-row">
                    <button className="btn-mobile-back" onClick={() => setSelectedTicket(null)}>
                      <ArrowLeft size={16} /> List
                    </button>
                    <span className="ticket-id-label">ID: {selectedTicket._id}</span>
                    <span className={`status-badge-pill large ${selectedTicket.status}`}>
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.status.toUpperCase()}
                    </span>
                  </div>
                  <h3>{selectedTicket.subject}</h3>
                  <div className="ticket-origin-desc">
                    <div className="origin-meta">
                      <Calendar size={13} />
                      <span>Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="origin-description-text">{selectedTicket.description}</p>
                  </div>
                </div>

                <div className="ticket-messages-log-scroll">
                  {selectedTicket.messages.length === 0 ? (
                    <div className="ticket-empty-chat-hint">
                      <Clock size={16} />
                      <span>Awaiting administrator response. Feel free to add more details below.</span>
                    </div>
                  ) : (
                    selectedTicket.messages.map((m, idx) => {
                      const isSelf = String(m.sender?._id || m.sender) === String(selectedTicket.user?._id || selectedTicket.user);
                      const isAdmin = m.sender?.role === "admin";
                      const senderName = m.sender?.username || (isSelf ? "You" : "Support Agent");
                      const avatar = m.sender?.avatar;

                      return (
                        <div
                          key={m._id || idx}
                          className={`ticket-chat-message-row ${isSelf ? "user-side" : "support-side"}`}
                        >
                          <div className="chat-avatar-box">
                            {avatar ? (
                              <img src={avatar} alt={senderName} className="chat-avatar-img" />
                            ) : (
                              <div className="chat-avatar-placeholder">
                                {senderName.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="chat-content-bubble">
                            <div className="chat-bubble-header">
                              <span className="sender-name">{senderName}</span>
                              {isAdmin && <span className="admin-sender-tag">SUPPORT</span>}
                              <span className="message-time">
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="message-body-text">{m.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessageSubmit} className="ticket-chat-input-row">
                  {selectedTicket.status === "resolved" && (
                    <div className="ticket-resolved-warn-banner">
                      <CheckCircle2 size={13} />
                      <span>This ticket has been marked resolved. Submitting a new message will re-open this query.</span>
                    </div>
                  )}
                  <div className="input-group">
                    <textarea
                      placeholder="Type your message reply..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !replyMessage.trim()}
                      className="btn-send-chat-msg"
                    >
                      {sendingMessage ? (
                        <Loader2 className="spinner" size={14} />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        ) : (
          <div className="helpdesk-no-ticket-fallback animate-fade-in">
            <MessageSquare size={36} className="fallback-icon-accent" />
            <h4>Select a Ticket or Create a New Request</h4>
            <p>
              Review your ongoing support chats or launch a new query from the sidebar menu to consult with CodeExpo customer support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
