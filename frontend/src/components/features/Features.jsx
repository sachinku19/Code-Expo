import "./Features.css";
import FeatureCard from "./FeatureCard";
import {
  Bot,
  Box,
  Code2,
  Globe2,
  Rocket,
  Video,
  Zap,
} from "lucide-react";

function Features() {
  const features = [
    {
      icon: Zap,
      title: "Real-Time Collaboration",
      desc: "Multiple developers can write, refactor, and review code together with zero latency.",
    },
    {
      icon: Bot,
      title: "AI Pair Programmer",
      desc: "Generate functions, explain complex logic, find syntax bugs, and refactor code instantly.",
    },
    {
      icon: Rocket,
      title: "Zero-Config Compilation",
      desc: "Compile and execute JavaScript, Python, C++, and Java in isolated sandbox environments.",
    },
    {
      icon: Video,
      title: "Voice & Video Call Rooms",
      desc: "Conduct sprints, debug sessions, and code reviews directly inside your coding workspace.",
    },
    {
      icon: Globe2,
      title: "Polyglot Language Support",
      desc: "Choose from multiple supported runtimes with syntax highlighting and autocompletion.",
    },
    {
      icon: Box,
      title: "Quick-Start Templates",
      desc: "Spin up React, Next.js, MERN stack, or simple scripts from ready-made presets.",
    },
  ];

  return (
    <section className="features">
      <div className="features-header">
        <span className="section-kicker">
          <Code2 size={14} className="kicker-icon" />
          <span>Full Team Ecosystem</span>
        </span>

        <h2>Everything You Need To Build Together</h2>

        <p>
          One unified glassmorphic workspace for coding, communication, execution, and deployment.
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            index={index}
            icon={feature.icon}
            title={feature.title}
            desc={feature.desc}
          />
        ))}
      </div>
    </section>
  );
}

export default Features;
