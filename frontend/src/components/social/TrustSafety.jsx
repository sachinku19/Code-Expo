import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Shield, Clock, HelpCircle,
  FileText, ArrowRight, MessageSquare, Send, Plus, Upload, X, Check, Lock, Heart, EyeOff, Sparkles, Pin
} from "lucide-react";
import socket from "../../socket/socket";
import { getTrustSafetyStatus, getModerationHistory, createAppeal } from "../../services/trustSafetyService";
import { createTicket, getUserTickets, getTicketDetails, addTicketMessage } from "../../services/ticketService";
import "./TrustSafety.css";

export default function TrustSafety({ user, addToast }) {
  // Tabs
  const [activeSubTab, setActiveSubTab] = useState("overview");

  // Trust & Safety State
  const [healthData, setHealthData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Appeal Modal State
  const [selectedActionToAppeal, setSelectedActionToAppeal] = useState(null);
  const [appealReason, setAppealReason] = useState("");
  const [appealNotes, setAppealNotes] = useState("");
  const [appealAttachment, setAppealAttachment] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Tickets State
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Create Ticket Form State
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketCategory, setTicketCategory] = useState("General");
  const [ticketAttachment, setTicketAttachment] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Timeline filters
  const [timelineFilter, setTimelineFilter] = useState("all");

  const chatEndRef = useRef(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoadingHealth(true);
      const res = await getTrustSafetyStatus();
      if (res.success) {
        setHealthData(res.status);
      }
    } catch (err) {
      console.error("Failed to load health status:", err);
    } finally {
      setLoadingHealth(false);
    }

    try {
      setLoadingHistory(true);
      const res = await getModerationHistory();
      if (res.success) {
        setHistory(res.history || []);
      }
    } catch (err) {
      console.error("Failed to load moderation history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchUserTicketsList = async () => {
    try {
      setLoadingTickets(true);
      const res = await getUserTickets();
      if (res.success) {
        setTickets(res.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUserTicketsList();
  }, []);

  // Sync ticket details scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticketDetails?.messages]);

  // Load ticket details when selected
  useEffect(() => {
    if (selectedTicketId) {
      const loadDetails = async () => {
        try {
          setLoadingTicketDetails(true);
          const res = await getTicketDetails(selectedTicketId);
          if (res.success) {
            setTicketDetails(res.ticket);
          }
        } catch (err) {
          console.error("Failed to load ticket details:", err);
        } finally {
          setLoadingTicketDetails(false);
        }
      };
      loadDetails();
    } else {
      setTicketDetails(null);
    }
  }, [selectedTicketId]);

  // Real-time update listeners
  useEffect(() => {
    if (!socket) return;

    const handleAdminUserAction = (data) => {
      const targetUserId = data.userId || data.user?._id;
      const currentUserId = user?.id || user?._id;
      if (String(targetUserId) === String(currentUserId)) {
        // Refresh entire health profile
        fetchData();
        if (typeof addToast === "function") {
          addToast("Your account status has been updated by administrators.", "info");
        }
      }
    };

    const handleAdminPostAction = () => {
      // Re-fetch history to reflect reversals
      fetchData();
    };

    const handleTicketUpdate = (data) => {
      // Refresh tickets list
      fetchUserTicketsList();
      // If active ticket is updated, load it
      if (selectedTicketId && String(data.ticketId) === String(selectedTicketId)) {
        setTicketDetails(data.ticket);
      }
    };

    const handleNotification = (notif) => {
      if (notif.type === "MODERATION_ACTION" || notif.type === "APPEAL_STATUS" || notif.type === "TICKET_UPDATE") {
        fetchData();
        fetchUserTicketsList();
      }
    };

    socket.on("admin-user-action", handleAdminUserAction);
    socket.on("admin-post-action", handleAdminPostAction);
    socket.on("ticket-update", handleTicketUpdate);
    socket.on("notification-received", handleNotification);

    return () => {
      socket.off("admin-user-action", handleAdminUserAction);
      socket.off("admin-post-action", handleAdminPostAction);
      socket.off("ticket-update", handleTicketUpdate);
      socket.off("notification-received", handleNotification);
    };
  }, [selectedTicketId, user]);

  // Handle filing appeal
  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    if (!appealReason.trim()) return;

    setSubmittingAppeal(true);
    try {
      const res = await createAppeal(
        selectedActionToAppeal._id,
        appealReason,
        appealNotes,
        appealAttachment
      );
      if (res.success) {
        if (typeof addToast === "function") {
          addToast("Appeal submitted successfully. Administrators will review it.", "success");
        }
        setSelectedActionToAppeal(null);
        setAppealReason("");
        setAppealNotes("");
        setAppealAttachment("");
        fetchData();
      }
    } catch (err) {
      if (typeof addToast === "function") {
        addToast(err.response?.data?.message || "Failed to submit appeal.", "error");
      }
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // Handle ticket creation
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setSubmittingTicket(true);
    try {
      const res = await createTicket(ticketSubject, ticketDescription, ticketCategory, ticketAttachment ? [ticketAttachment] : []);
      if (res.success) {
        if (typeof addToast === "function") {
          addToast("Support ticket created successfully.", "success");
        }
        setShowCreateTicketModal(false);
        setTicketSubject("");
        setTicketDescription("");
        setTicketCategory("General");
        setTicketAttachment("");
        fetchUserTicketsList();
      }
    } catch (err) {
      if (typeof addToast === "function") {
        addToast(err.response?.data?.message || "Failed to create ticket.", "error");
      }
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Send Message reply to active ticket chat
  const handleSendTicketReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const res = await addTicketMessage(selectedTicketId, replyMessage);
      if (res.success) {
        setReplyMessage("");
        setTicketDetails(prev => ({
          ...prev,
          messages: res.messages,
          status: res.status
        }));
        fetchUserTicketsList();
      }
    } catch (err) {
      if (typeof addToast === "function") {
        addToast(err.response?.data?.message || "Failed to send message reply.", "error");
      }
    } finally {
      setSendingReply(false);
    }
  };

  // Filtered timeline entries
  const filteredTimeline = history.filter(item => {
    if (timelineFilter === "all") return true;
    if (timelineFilter === "active") return item.currentStatus === "Active";
    if (timelineFilter === "reversed") return item.currentStatus === "Reversed";
    if (timelineFilter === "appeals") return item.currentStatus === "Appealed";
    return true;
  });

  // Health Ring parameters
  const healthScore = healthData?.accountHealth !== undefined ? healthData.accountHealth : 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="trust-safety-container">
      {/* Overview Cards */}
      <div className="trust-safety-header">
        <div className="trust-safety-header-titles">
          <h2>Feed Action Center</h2>
          <p>Transparency and action compliance overview of your account.</p>
        </div>
        <div className="trust-safety-tabs">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`trust-safety-tab-btn ${activeSubTab === "overview" ? "active" : ""}`}
          >
            Overview & Standing
          </button>
          <button
            onClick={() => setActiveSubTab("history")}
            className={`trust-safety-tab-btn ${activeSubTab === "history" ? "active" : ""}`}
          >
            Timeline Logs ({history.length})
          </button>
          <button
            onClick={() => setActiveSubTab("tickets")}
            className={`trust-safety-tab-btn ${activeSubTab === "tickets" ? "active" : ""}`}
          >
            Resolution Center
          </button>
        </div>
      </div>

      {activeSubTab === "overview" && (
        <>
          {/* Main Account standing card */}
          <div className="trust-safety-main-grid">
            <div className="trust-safety-radial-card">
              <div style={{ position: "relative", width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={healthScore >= 80 ? "#10b981" : healthScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span className="trust-safety-health-score">{healthScore}</span>
                  <span className="trust-safety-health-label" style={{ color: "var(--text)" }}>Health</span>
                </div>
              </div>
            </div>

            <div className="trust-safety-status-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h3 className="trust-safety-status-title">Account Status:</h3>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    letterSpacing: "0.5px",
                    background:
                      healthData?.accountStatus === "Active" ? "rgba(16, 185, 129, 0.12)" :
                      healthData?.accountStatus === "Restricted" ? "rgba(245, 158, 11, 0.12)" :
                      "rgba(239, 68, 68, 0.12)",
                    color:
                      healthData?.accountStatus === "Active" ? "#10b981" :
                      healthData?.accountStatus === "Restricted" ? "#f59e0b" :
                      "#ef4444",
                    border: `1px solid ${
                      healthData?.accountStatus === "Active" ? "rgba(16, 185, 129, 0.25)" :
                      healthData?.accountStatus === "Restricted" ? "rgba(245, 158, 11, 0.25)" :
                      "rgba(239, 68, 68, 0.25)"
                    }`
                  }}
                >
                  {(healthData?.accountStatus || "ACTIVE").toUpperCase()}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px", marginTop: "4px" }}>
                <div>
                  <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text)" }}>Guideline standing</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: "650", color: "var(--text-h)" }}>{healthData?.guidelineStatus || "Good Standing"}</span>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text)" }}>Last Reviewed Date</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: "650", color: "var(--text-h)" }}>
                    {healthData?.lastReviewedDate ? new Date(healthData.lastReviewedDate).toLocaleDateString() : "Never Reviewed"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="trust-safety-stats-grid">
            <div className="trust-safety-stat-box">
              <span>Warnings Issued</span>
              <strong style={{ color: "#f59e0b" }}>{healthData?.totalWarnings || 0}</strong>
            </div>
            <div className="trust-safety-stat-box">
              <span>Account Violations</span>
              <strong style={{ color: "#ef4444" }}>{healthData?.totalViolations || 0}</strong>
            </div>
            <div className="trust-safety-stat-box">
              <span>Active Restrictions</span>
              <strong style={{ color: "#f43f5e" }}>{healthData?.counters?.activeRestrictionsCount || 0}</strong>
            </div>
            <div className="trust-safety-stat-box">
              <span>Open Appeals</span>
              <strong style={{ color: "var(--accent)" }}>{healthData?.counters?.openAppealsCount || 0}</strong>
            </div>
            <div className="trust-safety-stat-box">
              <span>Open Tickets</span>
              <strong style={{ color: "#10b981" }}>{healthData?.counters?.openSupportTicketsCount || 0}</strong>
            </div>
          </div>
        </>
      )}

      {activeSubTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Filters Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "12px 16px", borderRadius: "10px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>Moderation Log Entries</span>
            <div style={{ display: "flex", gap: "8px" }}>
              {["all", "active", "appeals", "reversed"].map(filterKey => (
                <button
                  key={filterKey}
                  onClick={() => setTimelineFilter(filterKey)}
                  style={{
                    padding: "4px 10px",
                    background: timelineFilter === filterKey ? "rgba(255,255,255,0.08)" : "transparent",
                    color: timelineFilter === filterKey ? "#fff" : "var(--admin-text-muted)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontWeight: "600"
                  }}
                >
                  {filterKey.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--admin-text-muted)" }}>Loading compliance logs...</div>
          ) : filteredTimeline.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", padding: "40px", borderRadius: "12px", textAlign: "center", color: "var(--admin-text-muted)" }}>
              No moderation logs match your filter selection.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "relative" }}>
              {filteredTimeline.map((item) => (
                <div
                  key={item._id}
                  style={{
                    background: "rgba(13,13,21,0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    alignItems: "center",
                    gap: "16px"
                  }}
                >
                  <div
                    style={{
                      background:
                        item.actionType.includes("Delete") || item.actionType.includes("Ban") || item.actionType.includes("Suspension") ? "rgba(239, 68, 68, 0.12)" :
                        item.actionType.includes("Restored") || item.actionType.includes("Reactivated") ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                      color:
                        item.actionType.includes("Delete") || item.actionType.includes("Ban") || item.actionType.includes("Suspension") ? "#ef4444" :
                        item.actionType.includes("Restored") || item.actionType.includes("Reactivated") ? "#10b981" : "#f59e0b",
                      padding: "10px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <ShieldAlert size={20} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "750", color: "#f8fafc", fontSize: "0.9rem" }}>{item.actionType}</span>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background:
                            item.currentStatus === "Active" ? "rgba(239, 68, 68, 0.1)" :
                            item.currentStatus === "Reversed" ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          color:
                            item.currentStatus === "Active" ? "#ef4444" :
                            item.currentStatus === "Reversed" ? "#10b981" : "#f59e0b",
                          border: `1px solid ${
                            item.currentStatus === "Active" ? "rgba(239, 68, 68, 0.2)" :
                            item.currentStatus === "Reversed" ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"
                          }`
                        }}
                      >
                        {item.currentStatus.toUpperCase()}
                      </span>
                    </div>

                    <span style={{ fontSize: "0.8rem", color: "#e2e8f0" }}>{item.reason}</span>

                    {item.postId && (
                      <div style={{ marginTop: "4px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.1)", padding: "4px 8px", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                        Post Affected: {item.postId.text ? item.postId.text.substring(0, 80) : "Media Post"}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "14px", fontSize: "0.68rem", color: "var(--admin-text-muted)", marginTop: "2px" }}>
                      <span>Date: {new Date(item.createdAt).toLocaleString()}</span>
                      <span>Moderator: {item.moderator}</span>
                    </div>
                  </div>

                  <div>
                    {item.currentStatus === "Active" && (
                      <button
                        onClick={() => setSelectedActionToAppeal(item)}
                        style={{
                          background: "var(--accent)",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          cursor: "pointer"
                        }}
                      >
                        Appeal Action
                      </button>
                    )}
                    {item.currentStatus === "Appealed" && (
                      <span style={{ fontSize: "0.72rem", color: "#f59e0b", fontWeight: "600" }}>Appeal Pending</span>
                    )}
                    {item.currentStatus === "Reversed" && (
                      <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: "600" }}>Action Reversed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === "tickets" && (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>
          {/* Left Tickets list panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "750" }}>Support Tickets</h4>
              <button
                onClick={() => setShowCreateTicketModal(true)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff"
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            {loadingTickets ? (
              <div style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)", textAlign: "center", padding: "20px" }}>Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)", textAlign: "center", padding: "20px" }}>No tickets created.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "400px", overflowY: "auto" }}>
                {tickets.map(t => (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTicketId(t._id)}
                    style={{
                      background: selectedTicketId === t._id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedTicketId === t._id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)"}`,
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{t.subject}</span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            t.status === "open" ? "rgba(16, 185, 129, 0.12)" :
                            t.status === "under-review" ? "rgba(245, 158, 11, 0.12)" :
                            t.status === "resolved" ? "rgba(255, 255, 255, 0.08)" : "rgba(239, 68, 68, 0.12)",
                          color:
                            t.status === "open" ? "#10b981" :
                            t.status === "under-review" ? "#f59e0b" :
                            t.status === "resolved" ? "var(--admin-text-muted)" : "#ef4444"
                        }}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--admin-text-muted)" }}>
                      <span>Category: {t.category || "General"}</span>
                      <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Ticket Thread view */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px", height: "460px", display: "flex", flexDirection: "column" }}>
            {!selectedTicketId ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--admin-text-muted)", gap: "10px" }}>
                <MessageSquare size={32} />
                <span style={{ fontSize: "0.8rem" }}>Select a support ticket to view conversation details.</span>
              </div>
            ) : loadingTicketDetails ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--admin-text-muted)" }}>
                Loading thread history...
              </div>
            ) : (
              <>
                {/* Header info */}
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "750" }}>{ticketDetails?.subject}</h4>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>Assignee: {ticketDetails?.assignedTo?.username || "Unassigned"}</span>
                    </div>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>{ticketDetails?.description}</p>
                  {ticketDetails?.attachments && ticketDetails.attachments.length > 0 && (
                    <div style={{ marginTop: "6px" }}>
                      {ticketDetails.attachments.map((at, idx) => (
                        <a key={idx} href={at} target="_blank" rel="noreferrer" style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "underline" }}>Attachment #{idx + 1}</a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Messages List Area */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {ticketDetails?.messages?.length === 0 ? (
                    <div style={{ textAlign: "center", color: "var(--admin-text-muted)", fontSize: "0.75rem", padding: "20px" }}>
                      No messages in conversation. Send a message to start.
                    </div>
                  ) : (
                    ticketDetails?.messages?.map((msg, index) => {
                      const isMe = String(msg.sender?._id || msg.sender) === String(user?.id || user?._id);
                      return (
                        <div
                          key={index}
                          style={{
                            alignSelf: isMe ? "flex-end" : "flex-start",
                            background: isMe ? "var(--accent)" : "rgba(255,255,255,0.06)",
                            color: "#fff",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            maxWidth: "70%",
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px"
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", wordBreak: "break-word" }}>{msg.message}</span>
                          <span style={{ fontSize: "0.55rem", opacity: 0.6, textAlign: "right" }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply Footer Input */}
                <form onSubmit={handleSendTicketReply} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your response reply..."
                    disabled={ticketDetails?.status === "closed"}
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      color: "#fff",
                      fontSize: "0.8rem",
                      outline: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || ticketDetails?.status === "closed"}
                    style={{
                      background: "var(--accent)",
                      border: "none",
                      color: "#fff",
                      borderRadius: "8px",
                      width: "34px",
                      height: "34px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    <Send size={14} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Appeal Form Modal Overlay */}
      {selectedActionToAppeal && (
        <div className="ce-modal-overlay" onClick={() => setSelectedActionToAppeal(null)} style={{ zIndex: 10000000, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <form
            onSubmit={handleSubmitAppeal}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "500px",
              background: "#0d0d15",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <h4 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Appeal Moderation Action</h4>
            <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "6px" }}>
              <strong>Action Type:</strong> {selectedActionToAppeal.actionType}<br />
              <strong>Reason logged:</strong> {selectedActionToAppeal.reason}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Reason for Appeal *</label>
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                required
                placeholder="Explain why you think this action should be reversed..."
                style={{
                  width: "100%",
                  height: "100px",
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "#e2e8f0",
                  fontSize: "0.85rem",
                  resize: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Additional Notes (Optional)</label>
              <input
                type="text"
                value={appealNotes}
                onChange={(e) => setAppealNotes(e.target.value)}
                placeholder="Any extra details..."
                style={{
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: "0.8rem"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Attachment URL (Optional)</label>
              <input
                type="text"
                value={appealAttachment}
                onChange={(e) => setAppealAttachment(e.target.value)}
                placeholder="Provide link to screenshots, proof files..."
                style={{
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: "0.8rem"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setSelectedActionToAppeal(null)}
                style={{ padding: "6px 14px", background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAppeal}
                style={{ padding: "6px 14px", background: "var(--accent)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                Submit Appeal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Create Form Modal */}
      {showCreateTicketModal && (
        <div className="ce-modal-overlay" onClick={() => setShowCreateTicketModal(false)} style={{ zIndex: 10000000, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <form
            onSubmit={handleCreateTicket}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "500px",
              background: "#0d0d15",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}
          >
            <h4 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>Open Support Ticket</h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Category *</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                style={{
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: "0.8rem"
                }}
              >
                <option value="General">General Inquiries</option>
                <option value="Billing">Billing & Subscription</option>
                <option value="Bug Report">Technical Bug Report</option>
                <option value="Moderation Appeal">Account Compliance & Moderation</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Subject *</label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                required
                placeholder="Brief summary of the issue..."
                style={{
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: "0.8rem"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Description *</label>
              <textarea
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                required
                placeholder="Describe your issue in detail..."
                style={{
                  width: "100%",
                  height: "100px",
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "#e2e8f0",
                  fontSize: "0.85rem",
                  resize: "none"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>Attachment Screenshot URL (Optional)</label>
              <input
                type="text"
                value={ticketAttachment}
                onChange={(e) => setTicketAttachment(e.target.value)}
                placeholder="Screenshot or log file URL..."
                style={{
                  background: "#06060a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  color: "#e2e8f0",
                  fontSize: "0.8rem"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowCreateTicketModal(false)}
                style={{ padding: "6px 14px", background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingTicket}
                style={{ padding: "6px 14px", background: "var(--accent)", border: "none", color: "#fff", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
              >
                Open Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
