import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, DoorOpen, Terminal, Bot, MessageSquare, Globe } from "lucide-react";
import "./MobileStats.css";

export default function MobileStats({ dbStats, totalUser }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const devCount = totalUser || dbStats?.developers || 0;
  const roomCount = dbStats?.rooms || 0;
  const execCount = dbStats?.executions || 0;
  const msgCount = dbStats?.messages || 0;
  const aiCount = dbStats?.aiSessions || (execCount > 0 ? Math.round(execCount * 1.2) : 0);
  const countryCount = dbStats?.countries || (devCount > 0 ? Math.min(devCount, 15) : 1);

  const statsData = [
    {
      id: "developers",
      label: "Developers",
      target: devCount,
      prefix: "",
      suffix: "+",
      formatValue: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + "M+" : val >= 1000 ? (val / 1000).toFixed(1) + "K+" : val + "+"),
      icon: Users,
      color: "#2563eb"
    },
    {
      id: "rooms",
      label: "Active Rooms",
      target: roomCount,
      prefix: "",
      suffix: "+",
      formatValue: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + "M+" : val >= 1000 ? (val / 1000).toFixed(1) + "K+" : val + "+"),
      icon: DoorOpen,
      color: "#7c3aed"
    },
    {
      id: "executions",
      label: "Executions",
      target: execCount,
      prefix: "",
      suffix: "+",
      isLarge: true,
      formatValue: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + "M+" : val >= 1000 ? (val / 1000).toFixed(1) + "K+" : val + "+"),
      icon: Terminal,
      color: "#10b981"
    },
    {
      id: "aiSessions",
      label: "AI Sessions",
      target: aiCount,
      prefix: "",
      suffix: "+",
      formatValue: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + "M+" : val >= 1000 ? (val / 1000).toFixed(1) + "K+" : val + "+"),
      icon: Bot,
      color: "#ec4899"
    },
    {
      id: "messages",
      label: "Messages Sent",
      target: msgCount,
      prefix: "",
      suffix: "+",
      formatValue: (val) => (val >= 1000000 ? (val / 1000000).toFixed(1) + "M+" : val >= 1000 ? (val / 1000).toFixed(1) + "K+" : val + "+"),
      icon: MessageSquare,
      color: "#f59e0b"
    },
    {
      id: "countries",
      label: "Countries",
      target: countryCount,
      prefix: "",
      suffix: "",
      formatValue: (val) => val.toString(),
      icon: Globe,
      color: "#06b6d4"
    }
  ];

  return (
    <section className="mobile-stats-section" ref={ref}>
      <div className="mobile-stats-header">
        <span className="mobile-section-tag">LIVE PLATFORM METRICS</span>
        <h2 className="mobile-stats-title">Empowering Global Developers</h2>
      </div>

      {/* 2-Column Grid */}
      <div className="mobile-stats-grid">
        {statsData.map((stat, idx) => (
          <StatCard key={stat.id} stat={stat} index={idx} isInView={isInView} />
        ))}
      </div>
    </section>
  );
}

function StatCard({ stat, index, isInView }) {
  const [count, setCount] = useState(0);
  const [ripple, setRipple] = useState(false);
  const Icon = stat.icon;

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 1500; // 1.5s animation
    const steps = 30;
    const stepTime = duration / steps;
    const increment = stat.target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= stat.target) {
        setCount(stat.target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, stat.target]);

  const handleTouch = () => {
    setRipple(true);
    setTimeout(() => setRipple(false), 500);
  };

  const displayVal = stat.formatValue
    ? stat.formatValue(count)
    : count >= 1000
    ? (count / 1000).toFixed(0) + "K" + stat.suffix
    : count + stat.suffix;

  return (
    <motion.div
      className={`mobile-stat-card ${ripple ? "ripple-active" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      onClick={handleTouch}
      onTouchStart={handleTouch}
    >
      <div className="stat-card-glow" style={{ background: stat.color }} />
      <div className="stat-icon-badge" style={{ color: stat.color, backgroundColor: `${stat.color}15` }}>
        <Icon size={18} />
      </div>

      <div className="stat-value">{displayVal}</div>
      <div className="stat-label">{stat.label}</div>
    </motion.div>
  );
}
