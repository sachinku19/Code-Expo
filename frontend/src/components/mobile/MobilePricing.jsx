import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./MobilePricing.css";

export default function MobilePricing({ user }) {
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // 'monthly' | 'yearly'
  const [activePlanIndex, setActivePlanIndex] = useState(1); // Default Pro
  const navigate = useNavigate();

  const handleSelectPlan = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/register");
    }
  };

  const plans = [
    {
      id: "free",
      name: "Developer Free",
      price: "$0",
      period: "/month",
      description: "For hobbyists and quick code collaborations.",
      features: [
        "3 collaborative rooms",
        "5 mins call duration limit",
        "Single-file code compilation",
        "10 AI partner prompts / day"
      ],
      cta: "Get Started",
      highlight: false
    },
    {
      id: "pro",
      name: "Developer Pro",
      price: billingPeriod === "monthly" ? "$12" : "$9.60",
      period: "/month",
      badge: "MOST POPULAR",
      description: "For power users and teams who pairing daily.",
      features: [
        "Unlimited collaborative rooms",
        "Unlimited audio / video calls",
        "Persistent multi-file workspaces",
        "Unlimited context-aware AI partner",
        "Priority execution queues"
      ],
      cta: "Go Pro Now",
      highlight: true
    },
    {
      id: "sponsor",
      name: "Elite Sponsor",
      price: billingPeriod === "monthly" ? "$49" : "$39.20",
      period: "/month",
      description: "For organizations supporting open source collaboration.",
      features: [
        "Everything in Developer Pro",
        "Dedicated stats badges & custom URL",
        "Priority SLA ticketing support",
        "Early access features & betas",
        "Exclusive profile banners"
      ],
      cta: "Subscribe Sponsor",
      highlight: false
    }
  ];

  return (
    <section className="mobile-pricing-section" id="pricing">
      {/* Header (Exact desktop text) */}
      <div className="mobile-pricing-header">
        <span className="mobile-section-tag">PREMIUM PLANS</span>
        <h2 className="mobile-pricing-title">Plans built to scale.</h2>
        <p className="mobile-pricing-sub">
          Get access to high-performance containers, persistent workspaces, unlimited calling, and context-aware AI partner suggestions.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pricing-billing-switch">
          <button
            className={`billing-btn ${billingPeriod === "monthly" ? "active" : ""}`}
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </button>
          <button
            className={`billing-btn ${billingPeriod === "yearly" ? "active" : ""}`}
            onClick={() => setBillingPeriod("yearly")}
          >
            Yearly <span className="save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Pricing Slider */}
      <div className="pricing-slider-wrapper">
        {plans.map((plan, idx) => {
          const isFeatured = plan.highlight;
          const isCurrentActive = activePlanIndex === idx;

          return (
            <div
              key={plan.id}
              className={`mobile-pricing-card ${isFeatured ? "featured" : ""} ${isCurrentActive ? "active" : ""}`}
              onClick={() => setActivePlanIndex(idx)}
            >
              {isFeatured && (
                <div className="pricing-featured-badge">
                  <Sparkles size={11} />
                  <span>{plan.badge}</span>
                </div>
              )}

              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-desc">{plan.description}</p>
              <div className="plan-price-group">
                <span className="plan-price">{plan.price}</span>
                <span className="plan-period">{plan.period}</span>
              </div>

              <div className="plan-features-list">
                {plan.features.map((feat, fIdx) => (
                  <div key={fIdx} className="plan-feature-item">
                    <Check size={14} className="check-icon" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                className={`plan-cta-btn ${isFeatured ? "primary" : "secondary"}`}
                onClick={handleSelectPlan}
              >
                <span>{plan.cta}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="pricing-dots">
        {plans.map((_, i) => (
          <span
            key={i}
            className={`pricing-dot ${activePlanIndex === i ? "active" : ""}`}
            onClick={() => setActivePlanIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
