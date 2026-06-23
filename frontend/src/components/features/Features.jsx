import "./Features.css";
import FeatureCard from "./FeatureCard";
import {
  Code2,
  Bot,
  Rocket,
  Video,
  Palette,
  MessageSquare,
  Flame,
  Trophy,
  Key
} from "lucide-react";

function Features() {
  const features = [
    {
      icon: Code2,
      title: "Multiplayer Code Editor",
      desc: "Write and edit code with your team in real-time. See live cursor movements and typing updates instantly.",
    },
    {
      icon: Bot,
      title: "AI Pair Programmer",
      desc: "Get intelligent pair programming help to write clean code, explain logic, and debug problems instantly.",
    },
    {
      icon: Rocket,
      title: "Sandboxed Compiler",
      desc: "Compile and execute JavaScript, Python, C++, and Java securely inside isolated runtime containers.",
    },
    {
      icon: Video,
      title: "Voice & Video Calls",
      desc: "Initiate voice or video sprint meetings directly inside your shared workspace to align the team.",
    },
    {
      icon: Palette,
      title: "Collaborative Whiteboard",
      desc: "Brainstorm, sketch architecture plans, and draw system flows side-by-side with other developers.",
    },
    {
      icon: MessageSquare,
      title: "Team Channels & DMs",
      desc: "Chat in shared project rooms or start direct messages with customizable notification alerts.",
    },
    {
      icon: Flame,
      title: "Developer Activity Heatmap",
      desc: "Track coding metrics, daily points, active days, and streaks on an interactive profile calendar.",
    },
    {
      icon: Trophy,
      title: "Global Leaderboard",
      desc: "Grow your social network, build followers, join trending public rooms, and claim top rankings.",
    },
    {
      icon: Key,
      title: "Git & Custom API Keys",
      desc: "Synchronize with GitHub repositories and generate developer access tokens for API requests.",
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
