import React, { useState, useEffect } from "react";
import { Check, Lock, CreditCard, X, Loader, DollarSign, HelpCircle, Activity, Smartphone } from "lucide-react";
import { purchaseSubscription, getSubscriptionStatus, getBillingHistory } from "../../services/subscriptionService";
import "./SubscriptionPlans.css";

export default function SubscriptionPlans({ user, addToast }) {
  const [currentSubscription, setCurrentSubscription] = useState({ plan: "Free", status: "inactive" });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Checkout form details
  const [paymentMethodType, setPaymentMethodType] = useState("card"); // "card" or "upi"
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("other"); // "phonepe" | "gpay" | "paytm" | "other"
  const [upiUsername, setUpiUsername] = useState("");
  const [billingEmail, setBillingEmail] = useState(user?.email || "");
  const [cardBrand, setCardBrand] = useState("Visa");

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        getSubscriptionStatus(),
        getBillingHistory()
      ]);
      if (statusRes.success) {
        setCurrentSubscription(statusRes.subscription || { plan: "Free", status: "inactive" });
      }
      if (historyRes.success) {
        setHistory(historyRes.history || []);
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCheckout = (planName) => {
    setSelectedPlan(planName);
    setPaymentMethodType("card");
    setCardholderName("");
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setUpiId("");
    setSelectedUpiApp("other");
    setUpiUsername("");
    setBillingEmail(user?.email || "");
    setCardBrand("Visa");
    setIsCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
  };

  const handlePurchase = async (e) => {
    e.preventDefault();

    if (!billingEmail.trim() || !billingEmail.includes("@")) {
      addToast("A valid billing email is required.", "error");
      return;
    }

    const payload = {
      paymentMethodType,
      billingEmail
    };

    if (paymentMethodType === "card") {
      if (!cardholderName.trim()) {
        addToast("Cardholder name is required.", "error");
        return;
      }
      if (cardNumber.length < 16) {
        addToast("Card number must be 16 digits.", "error");
        return;
      }
      if (!expiryDate || !expiryDate.includes("/")) {
        addToast("Expiry date must be in MM/YY format.", "error");
        return;
      }
      if (cvv.length < 3) {
        addToast("CVV must be 3 or 4 digits.", "error");
        return;
      }
      payload.cardholderName = cardholderName;
      payload.cardNumber = cardNumber;
      payload.expiryDate = expiryDate;
      payload.cvv = cvv;
      payload.cardBrand = cardBrand;
    } else if (paymentMethodType === "upi") {
      if (selectedUpiApp === "other") {
        if (!upiId.trim() || !upiId.includes("@")) {
          addToast("A valid UPI ID is required (e.g. user@okaxis).", "error");
          return;
        }
        payload.upiId = upiId;
      } else {
        if (!upiUsername.trim()) {
          addToast("UPI username or phone number is required.", "error");
          return;
        }
        const suffix = selectedUpiApp === "gpay" ? "@okaxis" : selectedUpiApp === "phonepe" ? "@ybl" : "@paytm";
        payload.upiId = `${upiUsername}${suffix}`;
      }
    }

    try {
      setIsProcessing(true);
      const res = await purchaseSubscription(selectedPlan, payload);

      if (res.success) {
        addToast(res.message, "success");
        setIsCheckoutOpen(false);
        // Refresh pricing stats and logs
        await loadData();
        // Trigger window reload or update context so navbar / header updates ticks
        if (window.location) {
          window.location.reload();
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="subscription-plans-container">
      <div className="plans-header">
        <div className="plans-header-titles">
          <h2>Premium Developer Subscriptions</h2>
          <p>Supercharge your workspace credentials, access exclusive developer perks, and showcase verified badge ticks.</p>
        </div>
      </div>

      {currentSubscription.status === "pending" && (
        <div className="pending-activation-banner" style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "16px",
          fontSize: "0.85rem",
          color: "#f59e0b"
        }}>
          <Activity className="spinner" size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <span>
            <strong>Subscription Pending Admin Activation</strong>: You have submitted a request for <strong>{currentSubscription.plan}</strong>. Your payment is currently under review by administrators and will be activated shortly.
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader className="spinner" size={32} />
        </div>
      ) : (
        <>
          <div className="plans-grid">
            {/* FREE TIER CARD */}
            <div className="pricing-card">
              <h3 className="tier-title">Developer Free</h3>
              <div className="tier-price">
                <span className="price-amount">$0</span>
                <span className="price-period">/ month</span>
              </div>
              <ul className="tier-features">
                <li><Check size={14} style={{ color: "#10b981" }} /> 1 Active Workspace Room</li>
                <li><Check size={14} style={{ color: "#10b981" }} /> Public feed sharing access</li>
                <li><Check size={14} style={{ color: "#10b981" }} /> Default developer profile status</li>
                <li style={{ opacity: 0.5 }}><X size={14} style={{ color: "#ef4444" }} /> No verified profile badge</li>
                <li style={{ opacity: 0.5 }}><X size={14} style={{ color: "#ef4444" }} /> Standard workspace compiler</li>
              </ul>
              <button
                className={`btn-purchase ${currentSubscription.plan === "Free" && currentSubscription.status === "inactive" ? "active-plan" : ""}`}
                disabled
              >
                {currentSubscription.plan === "Free" && currentSubscription.status === "inactive" ? "Current Active Plan" : "Basic Access"}
              </button>
            </div>

            {/* DEVELOPER PRO TIER CARD */}
            <div className="pricing-card premium-tier">
              <div className="card-badge">PRO</div>
              <h3 className="tier-title">Developer Pro</h3>
              <div className="tier-price">
                <span className="price-amount">$9.99</span>
                <span className="price-period">/ month</span>
              </div>
              <ul className="tier-features">
                <li><Check size={14} style={{ color: "#8b5cf6" }} /> <strong>Green Verified Tick Badge</strong> on profile & feed</li>
                <li><Check size={14} style={{ color: "#8b5cf6" }} /> 5 Active Workspace Rooms</li>
                <li><Check size={14} style={{ color: "#8b5cf6" }} /> Unlimited sandbox file executions</li>
                <li><Check size={14} style={{ color: "#8b5cf6" }} /> Highlighting priority in Developer Search</li>
                <li><Check size={14} style={{ color: "#8b5cf6" }} /> High-speed cloud workspace container allocation</li>
              </ul>
              <button
                onClick={() => handleOpenCheckout("Developer Pro")}
                className={`btn-purchase ${
                  currentSubscription.plan === "Developer Pro" && currentSubscription.status === "active"
                    ? "active-plan"
                    : currentSubscription.plan === "Developer Pro" && currentSubscription.status === "pending"
                    ? "pending-plan"
                    : ""
                }`}
                disabled={
                  (currentSubscription.plan === "Developer Pro" && currentSubscription.status === "active") ||
                  (currentSubscription.plan === "Developer Pro" && currentSubscription.status === "pending") ||
                  currentSubscription.status === "pending" ||
                  (currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "active")
                }
              >
                {currentSubscription.plan === "Developer Pro" && currentSubscription.status === "active"
                  ? "Current Active Plan"
                  : currentSubscription.plan === "Developer Pro" && currentSubscription.status === "pending"
                  ? "Pending Approval..."
                  : "Upgrade to Pro"}
              </button>
            </div>

            {/* ELITE SPONSOR TIER CARD */}
            <div className="pricing-card elite-tier">
              <div className="card-badge">ELITE</div>
              <h3 className="tier-title">Elite Sponsor</h3>
              <div className="tier-price">
                <span className="price-amount">$29.99</span>
                <span className="price-period">/ month</span>
              </div>
              <ul className="tier-features">
                <li><Check size={14} style={{ color: "#f59e0b" }} /> <strong>Orange Verified Tick Badge</strong> on profile & feed</li>
                <li><Check size={14} style={{ color: "#f59e0b" }} /> Unlimited Active Workspace Rooms</li>
                <li><Check size={14} style={{ color: "#f59e0b" }} /> VIP custom banner highlights in social feeds</li>
                <li><Check size={14} style={{ color: "#f59e0b" }} /> Creator sponsor profile listings</li>
                <li><Check size={14} style={{ color: "#f59e0b" }} /> Dedicated administrative account safety priority</li>
              </ul>
              <button
                onClick={() => handleOpenCheckout("Elite Sponsor")}
                className={`btn-purchase ${
                  currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "active"
                    ? "active-plan"
                    : currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "pending"
                    ? "pending-plan"
                    : ""
                }`}
                disabled={
                  (currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "active") ||
                  (currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "pending") ||
                  currentSubscription.status === "pending"
                }
              >
                {currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "active"
                  ? "Current Active Plan"
                  : currentSubscription.plan === "Elite Sponsor" && currentSubscription.status === "pending"
                  ? "Pending Approval..."
                  : "Become Sponsor"}
              </button>
            </div>
          </div>

          {/* Billing Transaction Ledger */}
          <div className="billing-history-section">
            <h3>Billing Invoice History</h3>
            <div className="billing-table-wrapper">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Purchase Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length > 0 ? (
                    history.map((txn) => (
                      <tr key={txn._id}>
                        <td className="txn-id-cell">{txn.transactionId}</td>
                        <td><strong>{txn.plan}</strong></td>
                        <td>${txn.amount.toFixed(2)}</td>
                        <td>{txn.cardBrand} Ending in {txn.cardLast4}</td>
                        <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span style={{ background: "rgba(16, 185, 129, 0.08)", color: "#10b981", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" }}>
                            {txn.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "var(--admin-text-muted)", fontStyle: "italic" }}>
                        No billing subscription invoices recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CHECKOUT FLOW MODAL */}
      {isCheckoutOpen && (
        <div className="checkout-modal-overlay" onClick={handleCloseCheckout}>
          <div className="checkout-card" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-header">
              <h3 className="checkout-title">
                <Lock size={18} className="checkout-title-icon" /> Secure Checkout Process
              </h3>
              <button onClick={handleCloseCheckout} className="btn-close-checkout">
                <X size={16} />
              </button>
            </div>

            <div className="checkout-card-content">
              {/* LEFT COLUMN: ORDER SUMMARY & BADGE PREVIEW */}
              <div className="checkout-left-panel">
                <div className="checkout-summary-section">
                  <span className="checkout-summary-tag">UPGRADING PLAN</span>
                  <h2 className="checkout-summary-plan" style={{ color: selectedPlan === "Elite Sponsor" ? "#f59e0b" : "#8b5cf6" }}>
                    {selectedPlan}
                  </h2>
                  <div className="checkout-summary-price">
                    <span className="price-symbol">$</span>
                    <span className="price-val">{selectedPlan === "Developer Pro" ? "9.99" : "29.99"}</span>
                    <span className="price-period">/ month</span>
                  </div>
                </div>

                {/* LIVE BADGE PREVIEW CARD */}
                <div className="badge-preview-card">
                  <div className="preview-card-header">
                    <span className="preview-dot"></span>
                    <span className="preview-title">PROFILE BADGE PREVIEW</span>
                  </div>
                  <div className="preview-user-row">
                    <div className="preview-avatar">
                      {user?.username?.substring(0, 2).toUpperCase() || "CE"}
                    </div>
                    <div className="preview-user-info">
                      <div className="preview-username">@{user?.username || "developer"}</div>
                      <div className="preview-badge-row">
                        {selectedPlan === "Developer Pro" ? (
                          <span className="badge-pill-dev">
                            <Check size={10} style={{ marginRight: "3px" }} /> Developer Pro
                          </span>
                        ) : (
                          <span className="badge-pill-elite">
                            ⭐ Elite Sponsor
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="preview-card-footer">
                    Badge activates instantly upon admin approval
                  </div>
                </div>

                {/* PERKS LIST */}
                <div className="checkout-perks-list">
                  <div className="perk-item">
                    <Check size={14} className="perk-check" />
                    <span>Exclusive developer rank badge</span>
                  </div>
                  <div className="perk-item">
                    <Check size={14} className="perk-check" />
                    <span>Double daily experience points</span>
                  </div>
                  <div className="perk-item">
                    <Check size={14} className="perk-check" />
                    <span>Priority access to AI tools</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PAYMENT DETAILS FORM */}
              <form onSubmit={handlePurchase} className="checkout-right-panel">
                <div className="payment-tabs-wrapper">
                  <label className="checkout-label">Select Payment Method</label>
                  <div className="payment-tabs">
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethodType === "card" ? "active" : ""}`}
                      onClick={() => setPaymentMethodType("card")}
                    >
                      <CreditCard size={14} /> Card
                    </button>
                    <button
                      type="button"
                      className={`payment-tab-btn ${paymentMethodType === "upi" ? "active" : ""}`}
                      onClick={() => setPaymentMethodType("upi")}
                    >
                      <Smartphone size={14} /> UPI
                    </button>
                  </div>
                </div>

                <div className="form-inputs-container">
                  {paymentMethodType === "card" ? (
                    <>
                      <div className="card-input-wrapper">
                        <label className="checkout-label">Cardholder Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sachin Kumar"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                        />
                      </div>

                      <div className="card-input-wrapper">
                        <label className="checkout-label">Credit Card Number</label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="4242 4242 4242 4242"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ""))}
                        />
                        <div className="brand-logos">
                          <span onClick={() => setCardBrand("Visa")} className={`brand-pill ${cardBrand === "Visa" ? "selected" : ""}`}>Visa</span>
                          <span onClick={() => setCardBrand("MasterCard")} className={`brand-pill ${cardBrand === "MasterCard" ? "selected" : ""}`}>MasterCard</span>
                          <span onClick={() => setCardBrand("Amex")} className={`brand-pill ${cardBrand === "Amex" ? "selected" : ""}`}>Amex</span>
                        </div>
                      </div>

                      <div className="card-inputs-row">
                        <div className="card-input-wrapper">
                          <label className="checkout-label">Expiry Date</label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length > 2) {
                                val = val.substring(0, 2) + "/" + val.substring(2, 4);
                              }
                              setExpiryDate(val);
                            }}
                          />
                        </div>
                        <div className="card-input-wrapper">
                          <label className="checkout-label">CVV</label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="upi-app-selector">
                        <label className="checkout-label">Select UPI App</label>
                        <div className="upi-app-grid">
                          <div 
                            className={`upi-app-card gpay-card ${selectedUpiApp === "gpay" ? "selected" : ""}`}
                            onClick={() => { setSelectedUpiApp("gpay"); setUpiUsername(""); }}
                          >
                            <span className="gpay-text">GPay</span>
                          </div>
                          <div 
                            className={`upi-app-card phonepe-card ${selectedUpiApp === "phonepe" ? "selected" : ""}`}
                            onClick={() => { setSelectedUpiApp("phonepe"); setUpiUsername(""); }}
                          >
                            <span className="phonepe-text">PhonePe</span>
                          </div>
                          <div 
                            className={`upi-app-card paytm-card ${selectedUpiApp === "paytm" ? "selected" : ""}`}
                            onClick={() => { setSelectedUpiApp("paytm"); setUpiUsername(""); }}
                          >
                            <span className="paytm-text">Paytm</span>
                          </div>
                          <div 
                            className={`upi-app-card other-card ${selectedUpiApp === "other" ? "selected" : ""}`}
                            onClick={() => { setSelectedUpiApp("other"); setUpiId(""); }}
                          >
                            <span className="other-text">Custom UPI</span>
                          </div>
                        </div>
                      </div>

                      {selectedUpiApp === "other" ? (
                        <div className="card-input-wrapper">
                          <label className="checkout-label">UPI ID / VPA *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. username@upi or user@okaxis"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value.trim())}
                          />
                          <span className="upi-helper-text">
                            Enter your Virtual Payment Address (VPA) linked to your UPI app.
                          </span>
                        </div>
                      ) : (
                        <div className="card-input-wrapper">
                          <label className="checkout-label">
                            {selectedUpiApp === "phonepe" 
                              ? "PhonePe Number / ID *" 
                              : selectedUpiApp === "gpay" 
                              ? "Google Pay Username / ID *" 
                              : "Paytm Mobile Number / ID *"}
                          </label>
                          <div className="upi-input-group" style={{ display: "flex", alignItems: "stretch" }}>
                            <input
                              type="text"
                              required
                              placeholder={selectedUpiApp === "phonepe" || selectedUpiApp === "paytm" ? "e.g. 9876543210" : "e.g. sachinkumar"}
                              value={upiUsername}
                              onChange={(e) => setUpiUsername(e.target.value.replace(/\s/g, ""))}
                              style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                            />
                            <span className="upi-suffix-badge">
                              {selectedUpiApp === "gpay" ? "@okaxis" : selectedUpiApp === "phonepe" ? "@ybl" : "@paytm"}
                            </span>
                          </div>
                          <span className="upi-helper-text">
                            Enter your username or phone number associated with your {selectedUpiApp === "gpay" ? "Google Pay" : selectedUpiApp === "phonepe" ? "PhonePe" : "Paytm"} account.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="card-input-wrapper">
                    <label className="checkout-label">Billing Receipt Email</label>
                    <input
                      type="email"
                      required
                      placeholder="receipt@codeexpo.com"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-pay-now" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader className="spinner" size={14} /> Processing Secure Payment...
                    </>
                  ) : (
                    <>
                      <Lock size={14} /> {paymentMethodType === "upi" ? "Request UPI Activation" : "Pay & Request Activation"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
