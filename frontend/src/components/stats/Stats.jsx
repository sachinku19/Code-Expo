import React, { useState, useEffect } from "react";
import CountUpModule from "react-countup";
import { motion } from "framer-motion";
import { Activity, Code2, Gauge, Users } from "lucide-react";
import { getPublicStats } from "../../services/authService";
import "./Stats.css";

const CountUp = CountUpModule.default || CountUpModule;

function Stats() {
  const [dbStats, setDbStats] = useState({ developers: 0, rooms: 0, messages: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPublicStats();
        if (data.success) {
          setDbStats(data.stats);
        }
      } catch (err) {
        console.error("Error fetching landing stats:", err);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    {
      icon: Users,
      value: dbStats.developers || 0,
      suffix: "",
      title: "Developers Worldwide",
    },
    {
      icon: Code2,
      value: dbStats.executions || 0,
      suffix: "",
      title: "Code Executions",
    },
    {
      icon: Activity,
      value: dbStats.rooms || 0,
      suffix: "",
      title: "Collaborative Rooms",
    },
    {
      icon: Gauge,
      value: 99.9,
      suffix: "%",
      title: "Sandbox Uptime",
      decimals: 1
    },
  ];

  return (
    <section className="stats-section">
      <div className="stats-header">
        <h2>Trusted by Modern Engineering Teams</h2>
        <p>Providing milliseconds latency, secure runtimes, and instant synchronisation.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.title}
              className="stat-card"
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <div className="stat-icon">
                <Icon size={22} />
              </div>

              <h3>
                <CountUp
                  end={stat.value}
                  duration={2.5}
                  separator=","
                  decimals={stat.decimals || 0}
                  enableScrollSpy={true}
                  scrollSpyOnce={true}
                />
                {stat.suffix}
              </h3>

              <p>{stat.title}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default Stats;
