import "./TrustedTech.css";
import { Cpu, Database, Flame, Layers, Network, Terminal, Shield, Zap } from "lucide-react";

function TrustedTech() {
  const techs = [
    { name: "React 19", icon: Flame, color: "#61dafb" },
    { name: "Node.js", icon: Terminal, color: "#339933" },
    { name: "WebRTC Live", icon: Network, color: "#38bdf8" },
    { name: "Socket.io", icon: Cpu, color: "#ffffff" },
    { name: "Monaco Editor", icon: Layers, color: "#f59e0b" },
    { name: "Tailwind CSS", icon: Zap, color: "#06b6d4" },
    { name: "Docker", icon: Shield, color: "#2496ed" },
    { name: "Express API", icon: Database, color: "#a855f7" },
  ];

  // Double the list to ensure seamless looping scroll
  const marqueeItems = [...techs, ...techs];

  return (
    <div className="trusted-tech">
      <div className="trusted-container">
        <p className="trusted-title">POWERING HIGH-PERFORMANCE MULTIPLAYER COLLABORATION</p>
        
        <div className="marquee-wrapper">
          <div className="marquee-track">
            {marqueeItems.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <div key={index} className="tech-badge">
                  <Icon size={18} style={{ color: tech.color }} />
                  <span>{tech.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrustedTech;
