import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getCountUser, getPublicStats, getPublicDevelopers } from "../services/authService";
import { getWebsiteRatingInfo } from "../services/websiteRatingService";
import { useIsMobile } from "../hooks/useIsMobile";
import { useSmartNavbar } from "../hooks/useSmartNavbar";
import { useGateTransition } from "../routes/AppRoutes";
import Lenis from "lenis";
import {
  Sun,
  Moon,
  ArrowRight,
  Play,
  Check,
  Shield,
  Zap,
  Code,
  Video,
  Layout,
  Bot,
  MessageSquare,
  Terminal,
  Users,
  Compass,
  Sparkles,
  ArrowUpRight,
  Mic,
  MicOff,
  PhoneOff,
  Heart,
  MessageCircle,
  Lock,
  Folder,
  File,
  Award,
  Star,
  ShieldCheck,
  Flame,
  ChevronRight,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Square,
  Circle,
  Type,
  MousePointer,
  ChevronLeft,
  Plus,
  FolderPlus,
  FilePlus,
  LogOut,
  Copy,
  Bell,
  Send,
  BookOpen,
  Maximize2,
  Settings,
  History,
  Calendar,
  CheckSquare,
  ListTodo,
  Kanban,
  Clock,
  UserCheck,
  Cpu,
  FileCode2,
  Globe,
  Radio,
  Layers
} from "lucide-react";
import "./Home.css";
import NetworkFeedShowcase from "../components/landing/NetworkFeedShowcase";
import RoomCollaborationShowcase from "../components/landing/RoomCollaborationShowcase";

const MobileLandingPage = lazy(() => import("../components/mobile/MobileLandingPage"));

// ==========================================
// 1. HERO SECTION (Memoized)
// ==========================================
const HeroSection = React.memo(({ totalUser, dbStats, navigate, user }) => {
  return (
    <section id="hero" className="ce-hero" aria-labelledby="hero-title">
      <div className="ce-container">
        <div className="ce-hero-badge">
          <span className="ce-hero-badge-pulse" />
          <span className="ce-hero-badge-text">
            {totalUser > 0 ? `${totalUser} developers online coding right now` : "Developers hub online"}
          </span>
        </div>

        <h1 id="hero-title" className="ce-hero-title">
          Where developers collaborate, code, and share in real time.
        </h1>

        <p className="ce-hero-subtitle">
          A professional multiplayer editor with integrated audio/video rooms, shared whiteboards, AI pair programming, and developer profiles.
        </p>

        <div className="ce-hero-ctas">
          <button className="ce-btn ce-btn-primary" onClick={() => navigate(user ? "/dashboard" : "/register")}>
            Create Workspace
            <ArrowRight size={16} />
          </button>
          <a href="#editor-section" className="ce-btn ce-btn-secondary">
            Explore Live Workspace
          </a>
        </div>

        {/* Core Live Stats Row */}
        <div className="ce-hero-stats">
          {/* Developers Stat */}
          <div className="ce-stat-item devs" style={{ "--stat-color": "#3b82f6" }}>
            <div className="ce-stat-header">
              <span className="ce-stat-lbl">Developers</span>
              <div className="ce-stat-icon-wrapper">
                <Users size={15} />
              </div>
            </div>
            <div className="ce-stat-body">
              <span className="ce-stat-val">
                {dbStats.developers > 0 ? dbStats.developers.toLocaleString() : "1,200+"}
              </span>
              <div className="ce-stat-badge">
                <span className="ce-badge-dot"></span>
                +14.8%
              </div>
            </div>
            <div className="ce-stat-footer">
              <div className="ce-stat-chart">
                <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
                  <path d="M0,20 Q15,5 30,15 T60,8 T90,2" fill="none" stroke="var(--stat-color)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M0,20 Q15,5 30,15 T60,8 T90,2 L100,2 L100,25 L0,25 Z" fill="url(#sparkline-grad-devs)" opacity="0.05" />
                  <defs>
                    <linearGradient id="sparkline-grad-devs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--stat-color)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="ce-stat-trend">Global active creators</span>
            </div>
          </div>

          {/* Active Rooms Stat */}
          <div className="ce-stat-item rooms" style={{ "--stat-color": "#10b981" }}>
            <div className="ce-stat-header">
              <span className="ce-stat-lbl">Active Rooms</span>
              <div className="ce-stat-icon-wrapper">
                <Compass size={15} />
              </div>
            </div>
            <div className="ce-stat-body">
              <span className="ce-stat-val">
                {dbStats.rooms > 0 ? dbStats.rooms.toLocaleString() : "850+"}
              </span>
              <div className="ce-stat-badge pulse">
                <span className="ce-badge-dot blinking"></span>
                Live
              </div>
            </div>
            <div className="ce-stat-footer">
              <div className="ce-stat-chart">
                <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
                  <path d="M0,18 Q15,22 30,12 T60,16 T90,5 L100,2" fill="none" stroke="var(--stat-color)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M0,18 Q15,22 30,12 T60,16 T90,5 L100,2 L100,25 L0,25 Z" fill="url(#sparkline-grad-rooms)" opacity="0.05" />
                  <defs>
                    <linearGradient id="sparkline-grad-rooms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--stat-color)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="ce-stat-trend">Realtime collaborations</span>
            </div>
          </div>

          {/* Executions Stat */}
          <div className="ce-stat-item executions" style={{ "--stat-color": "#a855f7" }}>
            <div className="ce-stat-header">
              <span className="ce-stat-lbl">Executions</span>
              <div className="ce-stat-icon-wrapper">
                <Zap size={15} />
              </div>
            </div>
            <div className="ce-stat-body">
              <span className="ce-stat-val">
                {dbStats.executions > 0 ? dbStats.executions.toLocaleString() : "10,000+"}
              </span>
              <div className="ce-stat-badge secure">
                <span className="ce-badge-dot"></span>
                99.9%
              </div>
            </div>
            <div className="ce-stat-footer">
              <div className="ce-stat-chart">
                <svg viewBox="0 0 100 25" width="100%" height="25" preserveAspectRatio="none">
                  <path d="M0,22 L10,8 L20,18 L30,5 L40,20 L50,8 L60,22 L70,12 L80,24 L90,5 L100,2" fill="none" stroke="var(--stat-color)" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M0,22 L10,8 L20,18 L30,5 L40,20 L50,8 L60,22 L70,12 L80,24 L90,5 L100,2 L100,25 L0,25 Z" fill="url(#sparkline-grad-execs)" opacity="0.05" />
                  <defs>
                    <linearGradient id="sparkline-grad-execs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--stat-color)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="ce-stat-trend">Isolated sandbox runs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";

// ==========================================
// 2. STORIES SYSTEM / COMMUNITY SPOTLIGHT (Self-Contained Rendering)
// ==========================================
const StoriesSection = React.memo(({ user }) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [isDevsLoading, setIsDevsLoading] = useState(true);
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);

  const storyTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    getPublicDevelopers()
      .then((res) => {
        if (res && res.success && Array.isArray(res.users) && res.users.length > 0) {
          const solidBanners = [
            "rgba(59, 130, 246, 0.15)",
            "rgba(16, 185, 129, 0.15)",
            "rgba(139, 92, 246, 0.15)",
            "rgba(236, 72, 153, 0.15)",
            "rgba(245, 158, 11, 0.15)"
          ];
          const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

          const realStories = res.users.map((realUser, idx) => ({
            id: realUser._id || realUser.id || idx + 1,
            user: realUser.username || `dev_${idx + 1}`,
            name: realUser.username
              ? realUser.username.charAt(0).toUpperCase() + realUser.username.slice(1)
              : "Developer",
            avatar: realUser.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${realUser.username || idx}`,
            role: realUser.title || "Fullstack Engineer",
            bio: realUser.bio || "Building innovative software on CodeExpo.",
            tags:
              realUser.programmingLanguages && realUser.programmingLanguages.length > 0
                ? realUser.programmingLanguages
                : ["React", "JavaScript"],
            color: colors[idx % colors.length],
            bgGradient: solidBanners[idx % solidBanners.length],
            status: realUser.status || "Active on CodeExpo",
            code: `// ${realUser.username || "Developer"}'s workspace\nconsole.log("CodeExpo Platform User");`
          }));
          setStories(realStories);
        }
      })
      .catch((err) => console.error("Error fetching public developers:", err))
      .finally(() => {
        setIsDevsLoading(false);
      });
  }, []);

  const handleDeveloperClick = (dev, e) => {
    if (e) e.stopPropagation();
    const targetUser = dev.user || dev.username || dev.name || "developer";
    const targetPath = `/u/${encodeURIComponent(targetUser)}`;
    const currentPath = window.location.pathname + window.location.search;

    if (currentPath === targetPath) return;

    const token = localStorage.getItem("token");

    if (user || token) {
      navigate(targetPath, { replace: false });
    } else {
      localStorage.setItem("redirectAfterLogin", targetPath);
      navigate("/login", {
        state: {
          from: { pathname: targetPath },
          message: `Please log in to view ${dev.name || targetUser}'s profile.`
        }
      });
    }
  };

  const handleOpenStory = (story) => {
    setActiveStory(story);
    setStoryProgress(0);
    clearInterval(progressIntervalRef.current);
    clearTimeout(storyTimerRef.current);

    const startTime = Date.now();
    const duration = 4000;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setStoryProgress(pct);
      if (pct >= 100) {
        clearInterval(progressIntervalRef.current);
      }
    }, 30);

    storyTimerRef.current = setTimeout(() => {
      handleNextStory(story.id);
    }, duration);
  };

  const handleNextStory = (currentId) => {
    const currentIndex = stories.findIndex((s) => s.id === currentId);
    if (currentIndex < stories.length - 1) {
      handleOpenStory(stories[currentIndex + 1]);
    } else {
      handleCloseStory();
    }
  };

  const handleCloseStory = () => {
    setActiveStory(null);
    setStoryProgress(0);
    clearInterval(progressIntervalRef.current);
    clearTimeout(storyTimerRef.current);
  };

  useEffect(() => {
    return () => {
      clearInterval(progressIntervalRef.current);
      clearTimeout(storyTimerRef.current);
    };
  }, []);

  // Pause marquee & floating animations when section is outside viewport (saves 100% GPU compositor bandwidth)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.remove("ce-marquee-offscreen");
          } else {
            el.classList.add("ce-marquee-offscreen");
          }
        });
      },
      { rootMargin: "250px 0px 250px 0px", threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setActiveStory(null);
      }
    };
    if (activeStory) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [activeStory]);

  return (
    <>
      <section ref={sectionRef} className="ce-section ce-dev-showcase-section" aria-labelledby="spotlight-heading">
        <div className="ce-container">
          <div className="ce-section-header ce-section-header-compact">
            <span className="ce-section-tag">COMMUNITY SPOTLIGHT</span>
            <h2 id="spotlight-heading" className="ce-section-title">
              Built for <span className="ce-title-highlight">{stories.length > 0 ? `${stories.length}+` : "22+"} Active Developers</span> — Built for Every Niche.
            </h2>
            <p className="ce-section-subtitle">
              Explore live developer portfolios, inspect real-time code snapshots, and connect across CodeExpo.
            </p>
          </div>
        </div>

        <div className="ce-dev-carousel-viewport">
          <div className="ce-dev-marquee-track">
            {isDevsLoading ? (
              <div className="ce-dev-marquee-group">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((skId) => (
                  <div
                    key={`sk-${skId}`}
                    style={{
                      width: "74px",
                      height: "74px",
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      margin: "0 10px",
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            ) : stories.length === 0 ? (
              <div className="ce-dev-marquee-group">
                <div
                  className="ce-dev-avatar-only"
                  onClick={() => navigate("/register")}
                  style={{
                    cursor: "pointer",
                    position: "relative",
                    width: "74px",
                    height: "74px",
                    borderRadius: "50%",
                    padding: "3px",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--ce-accent)"
                  }}
                  title="Join CodeExpo Network"
                >
                  <Plus size={24} />
                </div>
              </div>
            ) : (
              <>
                <div className="ce-dev-marquee-group">
                  {stories.map((dev) => (
                    <button
                      key={`g1-${dev.id}`}
                      type="button"
                      className="ce-dev-avatar-only"
                      onClick={() => handleOpenStory(dev)}
                      aria-label={`Open developer story of ${dev.name}`}
                      style={{
                        cursor: "pointer",
                        position: "relative",
                        width: "74px",
                        height: "74px",
                        borderRadius: "50%",
                        padding: "3px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                        flexShrink: 0,
                        display: "inline-block",
                        margin: "0 10px"
                      }}
                    >
                      <img
                        src={dev.avatar}
                        alt={dev.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover"
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          right: "3px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border: "2px solid #060609",
                          backgroundColor: dev.color,
                          boxShadow: "0 0 6px currentColor"
                        }}
                      />
                    </button>
                  ))}
                </div>

                <div className="ce-dev-marquee-group" aria-hidden="true">
                  {stories.map((dev) => (
                    <button
                      key={`g2-${dev.id}`}
                      type="button"
                      tabIndex={-1}
                      className="ce-dev-avatar-only"
                      onClick={() => handleOpenStory(dev)}
                      aria-label={`Open developer story of ${dev.name}`}
                      style={{
                        cursor: "pointer",
                        position: "relative",
                        width: "74px",
                        height: "74px",
                        borderRadius: "50%",
                        padding: "3px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                        flexShrink: 0,
                        display: "inline-block",
                        margin: "0 10px"
                      }}
                    >
                      <img
                        src={dev.avatar}
                        alt={dev.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover"
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: "3px",
                          right: "3px",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          border: "2px solid #060609",
                          backgroundColor: dev.color,
                          boxShadow: "0 0 6px currentColor"
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Stories Modal */}
      {activeStory && (
        <div className="ce-story-modal-overlay" onClick={handleCloseStory}>
          <div className="ce-story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ce-story-modal-progress">
              <div className="ce-story-modal-progress-bar" style={{ width: `${storyProgress}%` }} />
            </div>

            <div className="ce-story-modal-header">
              <div className="ce-story-modal-profile" onClick={() => handleDeveloperClick(activeStory)}>
                <img src={activeStory.avatar} alt={activeStory.user} className="ce-story-modal-avatar" loading="lazy" decoding="async" />
                <div>
                  <span className="ce-story-modal-name">{activeStory.name}</span>
                  <span className="ce-story-modal-handle">@{activeStory.user}</span>
                </div>
              </div>
              <button type="button" className="ce-story-modal-close" onClick={handleCloseStory} aria-label="Close developer story">
                &times;
              </button>
            </div>

            <div className="ce-story-modal-body">
              <div className="ce-story-status-card">
                <span className="ce-story-status-tag" style={{ color: activeStory.color }}>
                  ● LIVE CODE SNAPSHOT
                </span>
                <p className="ce-story-status-text">{activeStory.status}</p>
              </div>

              <pre className="ce-story-code-block">
                <code>{activeStory.code}</code>
              </pre>
            </div>

            <div className="ce-story-modal-footer">
              <button
                className="ce-btn ce-btn-primary"
                onClick={() => {
                  handleCloseStory();
                  navigate("/register");
                }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Join Coding Room
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

StoriesSection.displayName = "StoriesSection";

// ==========================================
// 3. WORKSPACE SANDBOX (Isolated Sandbox State)
// ==========================================
const WorkspaceSection = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspaceFiles, setWorkspaceFiles] = useState({
    "index.js": {
      name: "index.js",
      path: "src/index.js",
      lang: "javascript",
      content: `// Real-time Collaborative Code Sharing\nconst session = {\n  room: "multiplayer-sandbox",\n  users: ["Sachin", "Aman", "You"],\n  sync: true\n};\n\nconsole.log("Ready to build faster together!");`,
      isEntryPoint: true
    },
    "main.py": {
      name: "main.py",
      path: "scripts/main.py",
      lang: "python",
      content: `# Python 3 Real-time Sandbox Simulation\nimport time\n\ndevs = ["Sachin", "Aman", "You"]\nprint("Spinning up secure Docker container...")\n\nfor user in devs:\n    print(f"Collaborator: {user} joined the workspace")\n    time.sleep(0.02)`,
      isEntryPoint: false
    },
    "main.cpp": {
      name: "main.cpp",
      path: "main.cpp",
      lang: "cpp",
      content: `// High Performance Coding Environment\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Room state synchronized successfully." << endl;\n    cout << "Average pairing latency: 14ms" << endl;\n    return 0;\n}`,
      isEntryPoint: false
    },
    "Main.java": {
      name: "Main.java",
      path: "Main.java",
      lang: "java",
      content: `// Enterprise Java Starter Setup\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Multiplexer connection opened...");\n        System.out.println("Yjs CRDT live state: active.");\n    }\n}`,
      isEntryPoint: false
    },
    "input.txt": {
      name: "input.txt",
      path: "input.txt",
      lang: "text",
      content: `Test input buffer for CodeExpo compiler.`,
      isEntryPoint: false
    },
    "config.json": {
      name: "config.json",
      path: "config.json",
      lang: "json",
      content: `{\n  "version": "1.0.0",\n  "maxParticipants": 12,\n  "allowCalls": true,\n  "whiteboardEnabled": true,\n  "autoSave": true\n}`,
      isEntryPoint: false
    }
  });

  const [activeFileName, setActiveFileName] = useState("main.py");
  const [selectedLang, setSelectedLang] = useState("python");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");

  const handleRunCode = () => {
    setIsRunning(true);
    setTerminalOutput("Initializing CodeExpo local container sandbox...");

    const entryFileKey = Object.keys(workspaceFiles).find((key) => workspaceFiles[key].isEntryPoint) || "main.py";
    const entryFile = workspaceFiles[entryFileKey];

    const executionOutputs = {
      javascript: `[Workspace Compiler] Building local index.js graph...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running node index.js...\n\nReady to build faster together!\n\n[Done] Process finished with exit code 0.`,
      python: `[Workspace Compiler] Preparing python environment...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running python main.py...\n\nSpinning up secure Docker container...\nCollaborator: Sachin joined the workspace\nCollaborator: Aman joined the workspace\nCollaborator: You joined the workspace\n\n[Done] Process finished with exit code 0.`,
      cpp: `[Workspace Compiler] Compiling C++ binary...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running g++ main.cpp && ./a.out...\n\nRoom state synchronized successfully.\nAverage pairing latency: 14ms\n\n[Done] Process finished with exit code 0.`,
      java: `[Workspace Compiler] Compiling Java bytecode...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running javac Main.java && java Main...\n\nMultiplexer connection opened...\nYjs CRDT live state: active.\n\n[Done] Process finished with exit code 0.`,
      text: `[Workspace Compiler] Unable to compile file with type 'text'.\n[System Tip] Set a javascript, python, cpp, or java file as your entry point.`,
      json: `[Workspace Compiler] Parsed config.json successfully.\nNo executable logic declared.`
    };

    setTimeout(() => {
      setTerminalOutput(executionOutputs[entryFile.lang] || "Execution complete.");
      setIsRunning(false);
    }, 1200);
  };

  const handleFileClick = (fileName) => {
    setActiveFileName(fileName);
    const file = workspaceFiles[fileName];
    if (file.lang !== "text" && file.lang !== "json") {
      setSelectedLang(file.lang);
    }
  };

  const activeFile = workspaceFiles[activeFileName];

  return (
    <section id="editor-section" className="ce-section ce-editor-layered-section" aria-labelledby="editor-heading">
      <div className="ce-container">
        <div className="ce-section-header">
          <span className="ce-section-tag">MULTI-FILE WORKSPACE</span>
          <h2 id="editor-heading" className="ce-section-title">A complete local IDE, in your browser.</h2>
          <p className="ce-section-subtitle">
            Manage folder directories, edit multiple files in tabs, set compilation entry points, and execute source
            code with stdin buffers.
          </p>

          <div className="ce-editor-hero-actions">
            <button className="ce-btn ce-btn-primary" onClick={() => navigate(user ? "/dashboard" : "/register")}>
              Create Free Workspace <ArrowRight size={16} />
            </button>
            <button className="ce-btn ce-btn-secondary" onClick={handleRunCode}>
              {isRunning ? "Compiling..." : "Run Live Code Sandbox"}
            </button>
          </div>
        </div>

        {/* Divided 3D Overlapping Card Stage */}
        <div className="ce-editor-layered-stage reveal-init reveal-3d-up">
          {/* 3D Floating Ornaments */}
          <div className="ce-workspace-shape ce-shape-sphere">
            <svg width="70" height="70" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="glass-grad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.7)" />
                  <stop offset="40%" stopColor="rgba(139, 92, 246, 0.3)" />
                  <stop offset="85%" stopColor="rgba(99, 102, 241, 0.12)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0.02)" />
                </radialGradient>
                <linearGradient id="glass-spec" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                  <stop offset="40%" stopColor="white" stopOpacity="0" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.25" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#glass-grad)" />
              <circle cx="50" cy="50" r="45" fill="url(#glass-spec)" />
            </svg>
          </div>

          <div className="ce-workspace-shape ce-shape-star">
            <svg width="54" height="54" viewBox="0 0 24 24" fill="url(#star-gold-gradient)">
              <defs>
                <radialGradient id="star-gold-gradient" cx="30%" cy="30%" r="75%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="45%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#854d0e" />
                </radialGradient>
              </defs>
              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
            </svg>
          </div>

          {/* Glassmorphic Floating Tech Capsule */}
          <div className="ce-workspace-tech-capsule">
            <div className="ce-capsule-logo python">Py</div>
            <div className="ce-capsule-logo node">JS</div>
            <div className="ce-capsule-logo docker">Dk</div>
            <div className="ce-capsule-logo rtc">WebRTC</div>
            <div className="ce-capsule-logo yjs">Yjs</div>
          </div>

          {/* CARD 1: LEFT CARD — FILE EXPLORER & DIRECTORY TREE */}
          <div className="ce-editor-layered-card explorer-card tilted-left">
            <div className="ce-layer-floating-pill blue">MULTI-FILE TREE</div>

            <div className="ce-layer-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="window-title">EXPLORER</span>
            </div>

            <div className="ce-layer-card-body">
              <div className="explorer-sub-bar">
                <span>WORKSPACE FILES</span>
                <div className="exp-actions">
                  <FilePlus size={12} />
                  <FolderPlus size={12} />
                </div>
              </div>

              <div className="explorer-file-tree">
                {Object.keys(workspaceFiles).map((fileName) => {
                  const isActive = activeFileName === fileName;
                  return (
                    <div
                      key={fileName}
                      className={`tree-file-item ${isActive ? "active" : ""}`}
                      onClick={() => handleFileClick(fileName)}
                    >
                      <File size={13} style={{ color: isActive ? "#3b82f6" : "#64748b" }} />
                      <span>{fileName}</span>
                      {workspaceFiles[fileName].isEntryPoint && <span className="entry-pill">MAIN</span>}
                    </div>
                  );
                })}
              </div>

              <div className="explorer-footer-info">
                <Folder size={12} />
                <span>Sorting-Array Repo • 4 Files</span>
              </div>
            </div>
          </div>

          {/* CARD 2: CENTER CARD — CODE EDITOR & COMPILER OUTPUT */}
          <div className="ce-editor-layered-card editor-card center-focus">
            <div className="ce-layer-floating-pill purple">CRDT LIVE PAIRING</div>

            <div className="ce-layer-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="editor-tab-active">
                <span>{activeFileName}</span>
              </div>
              <div className="editor-lang-badge">
                <label htmlFor="language-select" className="sr-only">
                  Programming language
                </label>
                <select
                  id="language-select"
                  className="lang-select"
                  value={selectedLang.toUpperCase()}
                  onChange={(e) => setSelectedLang(e.target.value.toLowerCase())}
                >
                  <option value="JAVASCRIPT">JAVASCRIPT</option>
                  <option value="PYTHON">PYTHON</option>
                  <option value="CPP">CPP</option>
                  <option value="JAVA">JAVA</option>
                </select>
              </div>
            </div>

            <div className="ce-layer-card-body">
              <div className="code-canvas-container">
                {isRunning && (
                  <div className="code-compiling-overlay">
                    <Zap size={14} className="spin-icon" />
                    <span>Compiling AST...</span>
                  </div>
                )}

                <div className="code-gutter">
                  {activeFile.content.split("\n").map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>

                <div className="code-viewport">
                  <pre>
                    <code>{activeFile.content}</code>
                  </pre>

                  {/* Live Collaborator Cursors */}
                  <div className="live-cursor cursor-sachin" style={{ top: "34px", left: "140px" }}>
                    <span className="cursor-flag red">Sachin</span>
                  </div>
                  <div className="live-cursor cursor-aman" style={{ top: "86px", left: "190px" }}>
                    <span className="cursor-flag purple">Aman</span>
                  </div>
                </div>
              </div>

              {/* Console Terminal Pane */}
              <div className="terminal-console-box">
                <div className="term-header">
                  <span className="term-title">TERMINAL OUTPUT</span>
                  <button className="run-mini-btn" onClick={handleRunCode}>
                    <Play size={10} /> Run Code
                  </button>
                </div>
                <pre className="term-out">{terminalOutput || "Ready to execute."}</pre>
              </div>
            </div>
          </div>

          {/* CARD 3: RIGHT CARD — COLLABORATORS ROOM & SPATIAL CALLS */}
          <div className="ce-editor-layered-card room-card tilted-right">
            <div className="ce-layer-floating-pill emerald">WEBRTC VOICE CALLS</div>

            <div className="ce-layer-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="window-title">PARTICIPANTS (5)</span>
            </div>

            <div className="ce-layer-card-body">
              <div className="room-user-list">
                <div className="user-row owner">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=60&h=60&q=80"
                    alt="Niranjan"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <span className="u-name">Niranjan Jaiswal</span>
                    <span className="u-badge owner">OWNER</span>
                  </div>
                </div>
                <div className="user-row you">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=60&h=60&q=80"
                    alt="Sachin"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <span className="u-name">Sachin Kumar</span>
                    <span className="u-badge you">YOU</span>
                  </div>
                </div>
                <div className="user-row">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=60&h=60&q=80"
                    alt="Shubham"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <span className="u-name">Shubham Paithane</span>
                    <span className="u-badge member">MEMBER</span>
                  </div>
                </div>
              </div>

              <div className="room-chat-snippet">
                <div className="chat-msg">
                  <span className="chat-sender">Lulu_developer:</span>
                  <span className="chat-text">"Syncing CRDT matrix live"</span>
                </div>
              </div>

              <div className="room-call-action">
                <button className="call-btn active">
                  <Video size={12} />
                  <span>In Voice Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Technology Stack Badges */}
        <div className="ce-editor-tech-stack">
          <span className="tech-badge">PYTHON 3.11</span>
          <span className="tech-badge">NODE.JS V20</span>
          <span className="tech-badge">G++ COMPILER</span>
          <span className="tech-badge">YJS CRDT SYNC</span>
          <span className="tech-badge">DOCKER SANDBOX</span>
          <span className="tech-badge">WEBRTC AUDIO</span>
        </div>
      </div>
    </section>
  );
});

WorkspaceSection.displayName = "WorkspaceSection";

// ==========================================
// 4. BENTO FEATURES GRID (Memoized)
// ==========================================
const BentoSection = React.memo(() => {
  const [cameraActive, setCameraActive] = React.useState(true);
  const [micActive, setMicActive] = React.useState(true);
  const [callActive, setCallActive] = React.useState(true);

  return (
    <section id="features" className="ce-section" aria-labelledby="features-heading">
      <div className="ce-container">
        <div className="ce-section-header">
          <span className="ce-section-tag">Value Proposition</span>
          <h2 id="features-heading" className="ce-section-title">Built for developer productivity.</h2>
          <p className="ce-section-subtitle">
            All the tools you need to pair program, debug, share knowledge, and build your digital footprint in one
            unified interface.
          </p>
        </div>

        <div className="ce-bento">
          {/* Bento Card 1: Multiplayer Code Sync */}
          <div className="ce-bento-card col-2 reveal-init reveal-3d-left">
            <div className="ce-bento-card-icon">
              <Code size={20} />
            </div>
            <h3 className="ce-bento-card-title">Real-time Document Synchronization</h3>
            <p className="ce-bento-card-desc">
              Collaborate instantly with zero latency using advanced Conflict-free Replicated Data Types (CRDTs).
              Experience conflict-free simultaneous editing in any language.
            </p>

            <div className="ce-bento-preview">
              <pre style={{ margin: 0, fontFamily: "monospace", fontSize: "11px", color: "#a1a1aa" }}>
                {`// Syncing thread...
yDoc.getText('monaco')
  .insert(0, '// Start collaboration');`}
              </pre>
            </div>
          </div>

          {/* Bento Card 2: Voice & Video Rooms */}
          <div className="ce-bento-card reveal-init reveal-3d-right">
            <div className="ce-bento-card-icon">
              <Video size={20} />
            </div>
            <h3 className="ce-bento-card-title">Integrated Calls</h3>
            <p className="ce-bento-card-desc">
              No need to switch to Zoom or Slack. Start audio and video calls directly within your coding session.
            </p>

            <div className="ce-bento-preview ce-bento-call-preview">
              <div className="ce-call-window" style={{ opacity: callActive ? 1 : 0.5 }}>
                <div className="ce-call-participants">
                  {/* Participant 1 (Sachin) */}
                  <div className={`ce-call-feed ${!cameraActive || !callActive ? "muted" : ""}`}>
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Sachin Kumar"
                      loading="lazy"
                      decoding="async"
                      className="ce-call-feed-img"
                      style={{ filter: !cameraActive || !callActive ? "brightness(0.3)" : "none" }}
                    />
                    <span className="ce-call-feed-name">Sachin</span>
                    {callActive && micActive ? (
                      <div className="ce-call-audio-wave">
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <MicOff size={10} className="ce-call-feed-mute" />
                    )}
                  </div>
                  {/* Participant 2 (Aman) */}
                  <div className="ce-call-feed muted">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Aman Sharma"
                      loading="lazy"
                      decoding="async"
                      className="ce-call-feed-img"
                      style={{ filter: !callActive ? "brightness(0.3)" : "none" }}
                    />
                    <span className="ce-call-feed-name">Aman</span>
                    <MicOff size={10} className="ce-call-feed-mute" />
                  </div>
                </div>
                {/* Floating Controller overlay bar */}
                <div className="ce-call-controls">
                  <button
                    type="button"
                    className={`ce-call-icon-btn ${cameraActive && callActive ? "active" : ""}`}
                    onClick={() => setCameraActive(!cameraActive)}
                    aria-label={cameraActive ? "Turn camera off" : "Turn camera on"}
                    aria-pressed={cameraActive}
                    title={cameraActive ? "Turn camera off" : "Turn camera on"}
                  >
                    <Video size={12} />
                  </button>
                  <button
                    type="button"
                    className={`ce-call-icon-btn ${micActive && callActive ? "active" : ""}`}
                    onClick={() => setMicActive(!micActive)}
                    aria-label={micActive ? "Mute microphone" : "Unmute microphone"}
                    aria-pressed={micActive}
                    title={micActive ? "Mute microphone" : "Unmute microphone"}
                  >
                    <Mic size={12} />
                  </button>
                  <button
                    type="button"
                    className={`ce-call-icon-btn ${callActive ? "end" : "active"}`}
                    onClick={() => setCallActive(!callActive)}
                    aria-label={callActive ? "End call" : "Start call"}
                    title={callActive ? "End call" : "Start call"}
                  >
                    <PhoneOff size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Collaborative Whiteboard */}
          <div className="ce-bento-card reveal-init reveal-3d-left">
            <div className="ce-bento-card-icon">
              <Layout size={20} />
            </div>
            <h3 className="ce-bento-card-title">Shared Whiteboard</h3>
            <p className="ce-bento-card-desc">
              Sketch architecture diagrams, lay out system flows, and brainstorm UI layouts with multiplayer drawing
              canvas tools.
            </p>

            <div className="ce-bento-preview ce-bento-whiteboard-preview">
              {/* Whiteboard Background Sketch Layout */}
              <div className="ce-whiteboard-canvas">
                <div className="ce-canvas-shape frontend">Client App</div>
                <div className="ce-canvas-connection line1" />
                <div className="ce-canvas-shape gateway">API Gateway</div>
                <div className="ce-canvas-connection line2" />
                <div className="ce-canvas-shape db">Postgres DB</div>

                {/* Collaborative Cursors */}
                <div className="ce-canvas-cursor">
                  <span className="ce-canvas-cursor-pointer" />
                  <span className="ce-canvas-cursor-label">Sachin</span>
                </div>
              </div>

              {/* Shutter Overlay Doors */}
              <div className="ce-shutter-door left" />
              <div className="ce-shutter-door right" />

              {/* Padlock button overlay */}
              <div className="ce-shutter-lock">
                <Lock size={14} />
              </div>
            </div>
          </div>

          {/* Bento Card 4: Social Developer Hub */}
          <div className="ce-bento-card col-2 reveal-init reveal-3d-right">
            <div className="ce-bento-card-icon">
              <Compass size={20} />
            </div>
            <h3 className="ce-bento-card-title">Developer Social Space</h3>
            <p className="ce-bento-card-desc">
              Post code snippets, share engineering notes, build your follower base, and connect with other developers
              globally. Show off your portfolio stats in a structured feed.
            </p>

            <div className="ce-bento-preview ce-bento-deck-preview">
              <div className="ce-feed-deck">
                {/* Card 1: Topmost */}
                <div className="ce-feed-card card-1">
                  <div className="ce-feed-card-header">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Sachin Kumar"
                      loading="lazy"
                      decoding="async"
                      className="ce-feed-card-avatar-img"
                    />
                    <div className="ce-feed-card-user">
                      <span className="ce-feed-card-name">Sachin Kumar</span>
                      <span className="ce-feed-card-handle">@sachin_codes</span>
                    </div>
                    <span className="ce-feed-card-time">Just now</span>
                  </div>
                  <p className="ce-feed-card-body">
                    Just optimized the collaborative canvas component using absolute matrix coordinates. Sync rates are up
                    40%! ⚡
                  </p>
                  <div className="ce-feed-card-footer">
                    <span className="ce-feed-card-stat">
                      <Heart size={11} /> 42 likes
                    </span>
                    <span className="ce-feed-card-stat">
                      <MessageCircle size={11} /> 8 comments
                    </span>
                    <span className="ce-feed-card-tag">#react</span>
                  </div>
                </div>

                {/* Card 2: Stacked Middle */}
                <div className="ce-feed-card card-2">
                  <div className="ce-feed-card-header">
                    <img
                      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Aman Sharma"
                      loading="lazy"
                      decoding="async"
                      className="ce-feed-card-avatar-img"
                    />
                    <div className="ce-feed-card-user">
                      <span className="ce-feed-card-name">Aman Sharma</span>
                      <span className="ce-feed-card-handle">@aman_dev</span>
                    </div>
                  </div>
                  <p className="ce-feed-card-body">Refactoring collaborative document sync to support nested CRDTs.</p>
                </div>

                {/* Card 3: Stacked Bottom */}
                <div className="ce-feed-card card-3">
                  <div className="ce-feed-card-header">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80"
                      alt="Sarah Jenkins"
                      loading="lazy"
                      decoding="async"
                      className="ce-feed-card-avatar-img"
                    />
                    <div className="ce-feed-card-user">
                      <span className="ce-feed-card-name">Sarah Jenkins</span>
                      <span className="ce-feed-card-handle">@sarah_sys</span>
                    </div>
                  </div>
                  <p className="ce-feed-card-body">
                    Rust async thread pool initialized. High-throughput performance is running optimal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

BentoSection.displayName = "BentoSection";

// ==========================================
// 5. ANALYTICS GRID DISPLAY (Memoized)
// ==========================================
const AnalyticsSection = React.memo(() => {
  return (
    <section id="analytics" className="ce-section ce-analytics-section" aria-labelledby="analytics-heading">
      <div className="ce-container">
        <div className="ce-section-header">
          <span className="ce-section-tag">NETWORK ANALYTICS</span>
          <h2 id="analytics-heading" className="ce-section-title">Measure your footprint.</h2>
          <p className="ce-section-subtitle">
            Track your profile growth, coding execution metrics, and language skills inside a beautiful visual
            statistics dashboard.
          </p>
        </div>

        <div className="ce-analytics-grid">
          {/* Left Card: Developer Profile Stats Deck */}
          <div className="ce-analytics-card profile reveal-init reveal-3d-left">
            <div className="ce-analytics-card-header">
              <Users size={16} />
              <span>Developer Profile Deck</span>
            </div>
            <div className="ce-profile-deck-container">
              <div className="ce-card-deck">
                {/* Card 4 (Hours) */}
                <div className="ce-deck-card rank-4" style={{ "--card-accent": "#a855f7" }}>
                  <div className="ce-deck-card-rank">HOURS</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#a855f7" }}>
                    <Terminal size={20} style={{ color: "#a855f7" }} />
                  </div>
                  <span className="ce-deck-card-name">Coding Time</span>
                  <span className="ce-deck-card-user">Active Practice</span>
                  <div className="ce-deck-card-stats-vertical">
                    <div className="ce-hours-row-mini">
                      <span className="ce-hours-label-mini">Total Hours</span>
                      <span className="ce-hours-val-mini">145.8 hrs</span>
                    </div>
                    <div className="ce-hours-progress-mini">
                      <div className="ce-hours-progress-bar-mini" style={{ width: "72.9%", backgroundColor: "#a855f7" }} />
                    </div>
                  </div>
                </div>

                {/* Card 3 (Reputation) */}
                <div className="ce-deck-card rank-3" style={{ "--card-accent": "#10b981" }}>
                  <div className="ce-deck-card-rank">POINTS</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#10b981" }}>
                    <Award size={20} style={{ color: "#10b981" }} />
                  </div>
                  <span className="ce-deck-card-name">Reputation</span>
                  <span className="ce-deck-card-user">Global Rank: Top 1.5%</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">2,400</span>
                      <span className="ce-card-stat-label">Points</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">Rank 24</span>
                      <span className="ce-card-stat-label">Position</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 (Streak) */}
                <div className="ce-deck-card rank-2" style={{ "--card-accent": "#f59e0b" }}>
                  <div className="ce-deck-card-rank">STREAK</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#f59e0b" }}>
                    <Flame size={20} style={{ color: "#f59e0b" }} />
                  </div>
                  <span className="ce-deck-card-name">Coding Streak</span>
                  <span className="ce-deck-card-user">Daily Consistency</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">21 Days</span>
                      <span className="ce-card-stat-label">Active</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">95%</span>
                      <span className="ce-card-stat-label">Target</span>
                    </div>
                  </div>
                </div>

                {/* Card 1 (Overview) */}
                <div className="ce-deck-card rank-1" style={{ "--card-accent": "#3b82f6" }}>
                  <div className="ce-deck-card-rank">LVL 12</div>
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Sachin"
                    loading="lazy"
                    decoding="async"
                    className="ce-deck-card-img"
                  />
                  <span className="ce-deck-card-name">Sachin Kumar</span>
                  <span className="ce-deck-card-user">Principal Architect</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">12</span>
                      <span className="ce-card-stat-label">Level</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">4.9</span>
                      <span className="ce-card-stat-label">Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Card: Leaderboard Card Deck */}
          <div className="ce-analytics-card growth reveal-init reveal-3d-up">
            <div className="ce-analytics-card-header">
              <BarChart2 size={16} />
              <span>Leaderboard Standings</span>
            </div>
            <div className="ce-leaderboard-deck-container">
              <div className="ce-card-deck">
                {/* Card 4 (Rank 4, Sarah Jenkins) */}
                <div className="ce-deck-card rank-4" style={{ "--card-accent": "#f59e0b" }}>
                  <div className="ce-deck-card-rank">#4</div>
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Sarah"
                    loading="lazy"
                    decoding="async"
                    className="ce-deck-card-img"
                  />
                  <span className="ce-deck-card-name">Sarah Jenkins</span>
                  <span className="ce-deck-card-user">@sarah_sys</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">1.7k</span>
                      <span className="ce-card-stat-label">Rep</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">+410</span>
                      <span className="ce-card-stat-label">Follows</span>
                    </div>
                  </div>
                </div>

                {/* Card 3 (Rank 3, Katarina Chen) */}
                <div className="ce-deck-card rank-3" style={{ "--card-accent": "#a855f7" }}>
                  <div className="ce-deck-card-rank">#3</div>
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Katarina"
                    loading="lazy"
                    decoding="async"
                    className="ce-deck-card-img"
                  />
                  <span className="ce-deck-card-name">Katarina Chen</span>
                  <span className="ce-deck-card-user">@katarina_chen</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">1.8k</span>
                      <span className="ce-card-stat-label">Rep</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">+430</span>
                      <span className="ce-card-stat-label">Follows</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 (Rank 2, Aman Sharma) */}
                <div className="ce-deck-card rank-2" style={{ "--card-accent": "#10b981" }}>
                  <div className="ce-deck-card-rank">#2</div>
                  <img
                    src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Aman"
                    loading="lazy"
                    decoding="async"
                    className="ce-deck-card-img"
                  />
                  <span className="ce-deck-card-name">Aman Sharma</span>
                  <span className="ce-deck-card-user">@aman_dev</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">1.9k</span>
                      <span className="ce-card-stat-label">Rep</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">+480</span>
                      <span className="ce-card-stat-label">Follows</span>
                    </div>
                  </div>
                </div>

                {/* Card 1 (Rank 1, Sachin Kumar) */}
                <div className="ce-deck-card rank-1" style={{ "--card-accent": "#3b82f6" }}>
                  <div className="ce-deck-card-rank">#1</div>
                  <img
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"
                    alt="Sachin"
                    loading="lazy"
                    decoding="async"
                    className="ce-deck-card-img"
                  />
                  <span className="ce-deck-card-name">Sachin Kumar</span>
                  <span className="ce-deck-card-user">@sachin_codes</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">2.4k</span>
                      <span className="ce-card-stat-label">Rep</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">+520</span>
                      <span className="ce-card-stat-label">Follows</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card: Language Skill Index Deck */}
          <div className="ce-analytics-card skills reveal-init reveal-3d-right">
            <div className="ce-analytics-card-header">
              <Award size={16} />
              <span>Language Competence Deck</span>
            </div>
            <div className="ce-skills-deck-container">
              <div className="ce-card-deck">
                {/* Card 4 (C++) */}
                <div className="ce-deck-card rank-4" style={{ "--card-accent": "#a855f7" }}>
                  <div className="ce-deck-card-rank">70%</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#a855f7" }}>
                    <Terminal size={20} style={{ color: "#a855f7" }} />
                  </div>
                  <span className="ce-deck-card-name">C++ Native</span>
                  <span className="ce-deck-card-user">Performance Coding</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">9</span>
                      <span className="ce-card-stat-label">Projects</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">STL</span>
                      <span className="ce-card-stat-label">Lib</span>
                    </div>
                  </div>
                </div>

                {/* Card 3 (Python) */}
                <div className="ce-deck-card rank-3" style={{ "--card-accent": "#10b981" }}>
                  <div className="ce-deck-card-rank">88%</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#10b981" }}>
                    <Bot size={20} style={{ color: "#10b981" }} />
                  </div>
                  <span className="ce-deck-card-name">Python Sandbox</span>
                  <span className="ce-deck-card-user">AI & Data Pipelines</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">18</span>
                      <span className="ce-card-stat-label">Projects</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">FastAPI</span>
                      <span className="ce-card-stat-label">Stack</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 (JavaScript) */}
                <div className="ce-deck-card rank-2" style={{ "--card-accent": "#3b82f6" }}>
                  <div className="ce-deck-card-rank">95%</div>
                  <div className="ce-deck-icon-circle" style={{ borderColor: "#3b82f6" }}>
                    <Code size={20} style={{ color: "#3b82f6" }} />
                  </div>
                  <span className="ce-deck-card-name">JavaScript Core</span>
                  <span className="ce-deck-card-user">Frontend & Fullstack</span>
                  <div className="ce-deck-card-stats">
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">42</span>
                      <span className="ce-card-stat-label">Projects</span>
                    </div>
                    <div className="ce-deck-card-stat">
                      <span className="ce-card-stat-num">React</span>
                      <span className="ce-card-stat-label">Stack</span>
                    </div>
                  </div>
                </div>

                {/* Card 1 (Summary List) */}
                <div className="ce-deck-card rank-1" style={{ "--card-accent": "#3b82f6" }}>
                  <div className="ce-deck-card-rank">INDEX</div>
                  <span className="ce-deck-card-name" style={{ marginTop: "8px" }}>
                    Tech Competence
                  </span>
                  <span className="ce-deck-card-user" style={{ marginBottom: "12px" }}>
                    Overview Matrix
                  </span>
                  <div className="ce-skills-list-mini">
                    <div className="ce-skill-row-mini">
                      <div className="ce-skill-info-mini">
                        <span>JS</span>
                        <span>95%</span>
                      </div>
                      <div className="ce-skill-bar-mini">
                        <div className="ce-skill-fill-mini" style={{ width: "95%", backgroundColor: "#3b82f6" }} />
                      </div>
                    </div>
                    <div className="ce-skill-row-mini">
                      <div className="ce-skill-info-mini">
                        <span>Py</span>
                        <span>88%</span>
                      </div>
                      <div className="ce-skill-bar-mini">
                        <div className="ce-skill-fill-mini" style={{ width: "88%", backgroundColor: "#10b981" }} />
                      </div>
                    </div>
                    <div className="ce-skill-row-mini">
                      <div className="ce-skill-info-mini">
                        <span>C++</span>
                        <span>70%</span>
                      </div>
                      <div className="ce-skill-bar-mini">
                        <div className="ce-skill-fill-mini" style={{ width: "70%", backgroundColor: "#a855f7" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

AnalyticsSection.displayName = "AnalyticsSection";

// ==========================================
// 6. ECOSYSTEM TABS & PLATFORMS SHOWCASE (Isolated Sandbox Interaction)
// ==========================================
const EcosystemSection = React.memo(({ ecosystemTab, setEcosystemTab }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isVerseJoined, setIsVerseJoined] = useState(false);

  return (
    <section id="ecosystem" className="ce-section ce-squarespace-showcase-section" aria-labelledby="ecosystem-heading">
      <div className="ce-container">
        <div className="ce-section-header">
          <span className="ce-section-tag">GOOGLE PROPOSAL PLATFORM STACK</span>
          <h2 id="ecosystem-heading" className="ce-section-title">A unified workspace makes it real.</h2>
          <p className="ce-section-subtitle">
            Three revolutionary developer features integrated into one seamless engine. Manage sprint backlogs, pair
            program with Gemini AI, and collaborate inside global metaverse pods.
          </p>

          {/* Category Filter Tabs */}
          <div className="ce-ecosystem-tabs">
            <button
              className={`ce-eco-tab ${ecosystemTab === "all" ? "active" : ""}`}
              onClick={() => setEcosystemTab("all")}
            >
              All 3 Platforms
            </button>
            <button
              className={`ce-eco-tab planner ${ecosystemTab === "planner" ? "active" : ""}`}
              onClick={() => setEcosystemTab("planner")}
            >
              <Calendar size={14} /> Sprint Planner
            </button>
            <button
              className={`ce-eco-tab ai ${ecosystemTab === "ai-coder" ? "active" : ""}`}
              onClick={() => setEcosystemTab("ai-coder")}
            >
              <Sparkles size={14} /> Expo AI Coder
            </button>
            <button
              className={`ce-eco-tab verse ${ecosystemTab === "myverse" ? "active" : ""}`}
              onClick={() => setEcosystemTab("myverse")}
            >
              <Radio size={14} /> MyVerse Pods
            </button>
          </div>
        </div>

        {/* 3D Perspective Showcase Container */}
        <div className="ce-sq-stage reveal-init reveal-3d-up">
          {/* CARD 1: SPRINT PLANNER */}
          <div
            className={`ce-sq-card planner-sq ${
              ecosystemTab === "planner" ? "focused" : ecosystemTab === "all" ? "tilted-left" : "dimmed"
            }`}
            onClick={() => setEcosystemTab("planner")}
          >
            {/* Floating Pill Accents */}
            <div className="ce-sq-floating-badge red">SPRINT PLANNER</div>
            <div className="ce-sq-floating-badge pink">KANBAN BACKLOG</div>

            {/* Browser Window Bar */}
            <div className="ce-sq-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="window-title-nav">
                <span>SPRINT #14</span>
                <span>BACKLOG</span>
                <span>KANBAN</span>
                <span>TASK HUB</span>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="ce-sq-card-body">
              <div className="ce-sq-header-group">
                <div className="icon-box blue">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="sq-title">Sprint Planner Command Center</h3>
                  <span className="sq-subtitle">84% Merged to Main Branch • 12 Active Tickets</span>
                </div>
              </div>

              <div className="ce-sq-kanban-preview">
                <div className="sq-task-row active">
                  <span className="sq-pri critical">CRITICAL</span>
                  <span className="sq-task-name">WebRTC P2P Mesh Signal Gateway</span>
                  <span className="sq-pct">75%</span>
                </div>
                <div className="sq-task-row">
                  <span className="sq-pri high">HIGH</span>
                  <span className="sq-task-name">Gemini Context Memory Cache</span>
                  <span className="sq-pct">90%</span>
                </div>
                <div className="sq-task-row">
                  <span className="sq-pri done">DONE</span>
                  <span className="sq-task-name">CRDT Canvas Matrix Synchronizer</span>
                  <span className="sq-pct">100%</span>
                </div>
              </div>

              <div className="ce-sq-footer">
                <button
                  className="ce-btn ce-btn-secondary sq-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const token = localStorage.getItem("token");
                    if (user || token) {
                      navigate("/dashboard/planner");
                    } else {
                      localStorage.setItem("redirectAfterLogin", "/dashboard/planner");
                      navigate("/login", {
                        state: {
                          from: { pathname: "/dashboard/planner" },
                          message: "Please log in to access the Sprint Planner."
                        }
                      });
                    }
                  }}
                >
                  Open Sprint Planner <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: EXPO AI CODER */}
          <div
            className={`ce-sq-card ai-sq ${
              ecosystemTab === "ai-coder" || ecosystemTab === "all" ? "focused" : "dimmed"
            }`}
            onClick={() => setEcosystemTab("ai-coder")}
          >
            {/* Floating Pill Accents */}
            <div className="ce-sq-floating-badge purple">GEMINI 1.5 PRO</div>
            <div className="ce-sq-floating-badge cyan">AST PAIR CODER</div>

            {/* Browser Window Bar */}
            <div className="ce-sq-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="window-title-nav">
                <span>EXPO AI</span>
                <span>PAIR PROGRAMMER</span>
                <span>AST DIFF ENGINE</span>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="ce-sq-card-body">
              <div className="ce-sq-header-group">
                <div className="icon-box purple">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="sq-title">Expo AI Pair Programmer</h3>
                  <span className="sq-subtitle">Autonomous Gemini LLM Assistant • 280 tokens/sec</span>
                </div>
              </div>

              {/* AI Prompt & Code Diff Viewport */}
              <div className="ce-sq-ai-viewport">
                <div className="sq-ai-prompt">
                  <Sparkles size={13} style={{ color: "#a855f7" }} />
                  <span>"Refactor WebRTC Opus VBR audio pipeline & write Go unit tests"</span>
                </div>

                <div className="sq-ai-diff">
                  <div className="diff-line del">- peerConnection.addStream(audioStream);</div>
                  <div className="diff-line add">+ sender.setParameters(opusVBRConfig);</div>
                  <div className="diff-line add">+ assert.NoError(t, err); // Go unit test</div>
                </div>

                <div className="sq-ai-metrics">
                  <span className="chip">⚡ 280 tokens/s</span>
                  <span className="chip">⏱ 14ms latency</span>
                  <span className="chip green">0 Vulnerabilities</span>
                </div>
              </div>

              <div className="ce-sq-footer">
                <button
                  className="ce-btn ce-btn-primary sq-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(user ? "/dashboard" : "/register");
                  }}
                >
                  <Sparkles size={14} /> Run Expo AI Assistant
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: MYVERSE METAVERSE */}
          <div
            className={`ce-sq-card verse-sq ${
              ecosystemTab === "myverse" ? "focused" : ecosystemTab === "all" ? "tilted-right" : "dimmed"
            }`}
            onClick={() => setEcosystemTab("myverse")}
          >
            {/* Floating Pill Accents */}
            <div className="ce-sq-floating-badge emerald">MYVERSE SPACE</div>
            <div className="ce-sq-floating-badge gold">5 BREAKOUT PODS</div>

            {/* Browser Window Bar */}
            <div className="ce-sq-window-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="window-title-nav">
                <span>MYVERSE</span>
                <span>BREAKOUT PODS</span>
                <span>SPATIAL AUDIO</span>
              </div>
            </div>

            {/* Card Content Body */}
            <div className="ce-sq-card-body">
              <div className="ce-sq-header-group">
                <div className="icon-box emerald">
                  <Radio size={22} />
                </div>
                <div>
                  <h3 className="sq-title">MyVerse Developer Space</h3>
                  <span className="sq-subtitle">5 Global Breakout Pods • 142 Developers Connected</span>
                </div>
              </div>

              <div className="ce-sq-pod-grid">
                <div className="sq-pod-card live">
                  <div className="pod-top">
                    <span className="live-pill">
                      <Radio size={10} className="pulse-icon" /> LIVE POD #1
                    </span>
                    <span className="dev-cnt">142 devs</span>
                  </div>
                  <h4 className="pod-name">Google Cloud Sandbox</h4>
                  <span className="host-text">Host: Sachin Kumar</span>
                </div>

                <div className="sq-pod-mini-list">
                  <div className="mini-pod">
                    <span>#2 Whiteboard Studio</span>
                    <span className="cnt">110</span>
                  </div>
                  <div className="mini-pod">
                    <span>#3 Quantum Rust Lab</span>
                    <span className="cnt">89</span>
                  </div>
                  <div className="mini-pod">
                    <span>#4 AI Review Hub</span>
                    <span className="cnt">215</span>
                  </div>
                </div>
              </div>

              <div className="ce-sq-footer">
                <button
                  className={`ce-btn ${isVerseJoined ? "ce-btn-primary" : "ce-btn-secondary"} sq-btn`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVerseJoined(!isVerseJoined);
                  }}
                >
                  {isVerseJoined ? "Connected to MyVerse" : "Enter Pod Space"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

EcosystemSection.displayName = "EcosystemSection";

// ==========================================
// 7. PRICING & SUBSCRIPTION (Isolated Billing Tab Switcher)
// ==========================================
const PricingSection = React.memo(() => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  return (
    <section id="pricing" className="ce-section ce-pricing-section" aria-labelledby="pricing-heading">
      <div className="ce-container">
        <div className="ce-section-header">
          <span className="ce-section-tag">PREMIUM PLANS</span>
          <h2 id="pricing-heading" className="ce-section-title">Plans built to scale.</h2>
          <p className="ce-section-subtitle">
            Get access to high-performance containers, persistent workspaces, unlimited calling, and context-aware AI
            partner suggestions.
          </p>

          <div className="ce-pricing-billing-switch">
            <button
              className={`ce-billing-btn ${billingPeriod === "monthly" ? "active" : ""}`}
              onClick={() => setBillingPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              className={`ce-billing-btn ${billingPeriod === "yearly" ? "active" : ""}`}
              onClick={() => setBillingPeriod("yearly")}
            >
              Yearly <span className="ce-save-tag">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="ce-pricing-grid">
          {/* Free Plan */}
          <div className="ce-pricing-card reveal-init reveal-3d-left">
            <div className="ce-pricing-card-header">
              <h3 className="ce-plan-name">Developer Free</h3>
              <p className="ce-plan-desc">For hobbyists and quick code collaborations.</p>
              <div className="ce-plan-price">
                <span className="ce-currency">$</span>
                <span className="ce-amt">0</span>
                <span className="ce-period">/month</span>
              </div>
            </div>
            <ul className="ce-plan-features">
              <li>
                <Check size={14} /> <span>3 collaborative rooms</span>
              </li>
              <li>
                <Check size={14} /> <span>5 mins call duration limit</span>
              </li>
              <li>
                <Check size={14} /> <span>Single-file code compilation</span>
              </li>
              <li>
                <Check size={14} /> <span>10 AI partner prompts / day</span>
              </li>
            </ul>
            <button className="ce-btn ce-btn-secondary pricing-btn" onClick={() => navigate("/register")}>
              Get Started
            </button>
          </div>

          {/* Developer Pro */}
          <div className="ce-pricing-card popular reveal-init reveal-3d-up">
            <div className="ce-popular-badge">MOST POPULAR</div>
            <div className="ce-pricing-card-header">
              <h3 className="ce-plan-name">Developer Pro</h3>
              <p className="ce-plan-desc">For power users and teams who pairing daily.</p>
              <div className="ce-plan-price">
                <span className="ce-currency">$</span>
                <span className="ce-amt">{billingPeriod === "monthly" ? "12" : "9.60"}</span>
                <span className="ce-period">/month</span>
              </div>
            </div>
            <ul className="ce-plan-features">
              <li>
                <Check size={14} /> <span>Unlimited collaborative rooms</span>
              </li>
              <li>
                <Check size={14} /> <span>Unlimited audio / video calls</span>
              </li>
              <li>
                <Check size={14} /> <span>Persistent multi-file workspaces</span>
              </li>
              <li>
                <Check size={14} /> <span>Unlimited context-aware AI partner</span>
              </li>
              <li>
                <Check size={14} /> <span>Priority execution queues</span>
              </li>
            </ul>
            <button className="ce-btn ce-btn-primary pricing-btn" onClick={() => navigate("/register")}>
              Go Pro Now
            </button>
          </div>

          {/* Elite Sponsor */}
          <div className="ce-pricing-card reveal-init reveal-3d-right">
            <div className="ce-pricing-card-header">
              <h3 className="ce-plan-name">Elite Sponsor</h3>
              <p className="ce-plan-desc">For organizations supporting open source collaboration.</p>
              <div className="ce-plan-price">
                <span className="ce-currency">$</span>
                <span className="ce-amt">{billingPeriod === "monthly" ? "49" : "39.20"}</span>
                <span className="ce-period">/month</span>
              </div>
            </div>
            <ul className="ce-plan-features">
              <li>
                <Check size={14} /> <span>Everything in Developer Pro</span>
              </li>
              <li>
                <Check size={14} /> <span>Dedicated stats badges & custom URL</span>
              </li>
              <li>
                <Check size={14} /> <span>Priority SLA ticketing support</span>
              </li>
              <li>
                <Check size={14} /> <span>Early access features & betas</span>
              </li>
              <li>
                <Check size={14} /> <span>Exclusive profile banners</span>
              </li>
            </ul>
            <button className="ce-btn ce-btn-secondary pricing-btn" onClick={() => navigate("/register")}>
              Subscribe Sponsor
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

PricingSection.displayName = "PricingSection";

// ==========================================
// 8. TESTIMONIALS (Isolated 4s Coverflow carousel interval)
// ==========================================
const TestimonialsSection = React.memo(({ reviews }) => {
  const defaultTestimonials = [
    {
      _id: "default-1",
      comment:
        "We transitioned all of our interview sessions and live debugging workflows to CodeExpo. The built-in audio/video runs incredibly smoothly.",
      rating: 5,
      user: { username: "Alex Rivera", avatar: "", programmingLanguages: ["TypeScript", "Rust"] }
    },
    {
      _id: "default-2",
      comment:
        "Being able to sketch out architectures on the multiplayer whiteboard right next to my editor files is a huge productivity booster.",
      rating: 5,
      user: { username: "Katarina Chen", avatar: "", programmingLanguages: ["Go", "React"] }
    },
    {
      _id: "default-3",
      comment:
        "The social hub has allowed me to share my daily projects and build a following of developers directly interested in my code.",
      rating: 5,
      user: { username: "Markus Vance", avatar: "", programmingLanguages: ["Python", "Docker"] }
    }
  ];

  const activeReviews = (() => {
    const validReviews = (reviews || []).filter((r) => r && typeof r === "object");
    if (validReviews.length === 0) return defaultTestimonials;
    if (validReviews.length >= 3) return validReviews;
    const combined = [...validReviews];
    for (let i = 0; i < defaultTestimonials.length; i++) {
      if (combined.length >= 3) break;
      const isAlreadyAdded = combined.some(
        (r) => r && r.user && (r.user.username || "Anonymous") === defaultTestimonials[i].user.username
      );
      if (!isAlreadyAdded) combined.push(defaultTestimonials[i]);
    }
    return combined;
  })();

  const [reviewsIndex, setReviewsIndex] = useState(0);

  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (activeReviews.length === 0 || isPaused) return;
    const interval = setInterval(() => {
      setReviewsIndex((prev) => (prev + 1) % activeReviews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeReviews.length, isPaused]);

  const handlePrev = () => {
    setReviewsIndex((prev) => (prev - 1 + activeReviews.length) % activeReviews.length);
  };

  const handleNext = () => {
    setReviewsIndex((prev) => (prev + 1) % activeReviews.length);
  };

  return (
    <section
      id="testimonials"
      className="ce-section ce-testimonials-section"
      style={{ overflow: "hidden" }}
      aria-labelledby="testimonials-heading"
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          handlePrev();
        } else if (e.key === "ArrowRight") {
          handleNext();
        }
      }}
    >
      <div className="ce-container ce-testimonials-container-split">
        {/* Left Column */}
        <div className="ce-testimonials-left">
          <span className="ce-section-tag">CLIENT VOICES</span>
          <h2 id="testimonials-heading" className="ce-testimonials-title">
            Trusted By <br />
            <span>Developers</span>
          </h2>
          <p className="ce-testimonials-desc">
            Real feedback from engineers, builders, and developers who chose CodeExpo to sync their project development
            and pairing sessions.
          </p>

          <div className="ce-testimonials-nav">
            <button type="button" className="ce-testimonials-nav-btn prev" onClick={handlePrev} aria-label="Previous testimonial" aria-controls="testimonials-slider-track">
              ←
            </button>
            <button type="button" className="ce-testimonials-nav-btn next" onClick={handleNext} aria-label="Next testimonial" aria-controls="testimonials-slider-track">
              →
            </button>
            <span className="ce-testimonials-counter">
              {String(reviewsIndex + 1).padStart(2, "0")} / {String(activeReviews.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="ce-testimonials-right">
          <div className="ce-testimonials-carousel">
            <div className="ce-testimonials-slider-track" id="testimonials-slider-track">
              {activeReviews.map((review, idx) => {
                const username = review?.user?.username || "Anonymous";
                const avatar = review?.user?.avatar;
                const langs = Array.isArray(review?.user?.programmingLanguages) ? review.user.programmingLanguages : [];
                const title = langs.length > 0 ? langs.join(", ") : "Developer";

                let positionClass = "card-hidden";
                if (idx === reviewsIndex) {
                  positionClass = "card-active";
                } else if (idx === (reviewsIndex - 1 + activeReviews.length) % activeReviews.length) {
                  positionClass = "card-prev";
                } else if (idx === (idx === reviewsIndex ? -1 : (reviewsIndex + 1) % activeReviews.length)) {
                  positionClass = "card-prev";
                } else if (idx === (reviewsIndex + 1) % activeReviews.length) {
                  positionClass = "card-next";
                }

                return (
                  <div
                    id={`testimonial-panel-${idx}`}
                    role="tabpanel"
                    aria-labelledby={`testimonial-tab-${idx}`}
                    className={`ce-testimonial-card ${positionClass}`}
                    key={review._id || idx}
                    aria-hidden={idx !== reviewsIndex ? "true" : "false"}
                  >
                    <div className="ce-testimonial-card-inner">
                      <div className="ce-testimonial-stars">
                        {Array.from({ length: 5 }, (_, i) => (
                          <span
                            key={i}
                            style={{
                              color: i < review.rating ? "#eab308" : "rgba(255, 255, 255, 0.15)",
                              fontSize: "14px"
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <p className="ce-testimonial-text">"{review.comment || "No comment provided."}"</p>

                      <div className="ce-testimonial-user">
                        <div className="ce-testimonial-avatar">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={username}
                              loading="lazy"
                              decoding="async"
                              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                            />
                          ) : (
                            username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="ce-testimonial-meta">
                          <span className="ce-testimonial-name">{username}</span>
                          <span className="ce-testimonial-title">{title}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots */}
          <div className="ce-testimonials-dots" role="tablist" aria-label="Testimonial slides">
            {activeReviews.map((_, idx) => (
              <button
                key={idx}
                type="button"
                id={`testimonial-tab-${idx}`}
                aria-controls={`testimonial-panel-${idx}`}
                className={`ce-testimonials-dot ${idx === reviewsIndex ? "active" : ""}`}
                onClick={() => setReviewsIndex(idx)}
                aria-label={`Go to testimonial ${idx + 1}`}
                aria-selected={idx === reviewsIndex}
                aria-current={idx === reviewsIndex ? "true" : "false"}
                role="tab"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

TestimonialsSection.displayName = "TestimonialsSection";

// ==========================================
// 9. FOOTER PANEL (Memoized)
// ==========================================
const FooterSection = React.memo(({ navigate }) => {
  return (
    <footer className="ce-footer">
      <div className="ce-footer-watermark">CODEEXPO</div>

      <div className="ce-container" style={{ position: "relative", zIndex: 1 }}>
        <div className="ce-footer-grid">
          {/* Branding Column */}
          <div className="ce-footer-branding">
            <div className="ce-footer-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
              <img src="/logo.png" alt="CodeExpo" loading="lazy" decoding="async" style={{ height: "24px", width: "24px" }} />
              <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>CodeExpo</span>
            </div>
            <p className="ce-footer-desc">
              The ultimate workspace for collaborative coding, real-time shared whiteboards, and developer feeds.
            </p>

            <div className="ce-footer-contact">
              <a href="mailto:support@codeexpo.com" className="ce-footer-contact-link">
                support@codeexpo.com
              </a>
              <span className="ce-footer-contact-addr">Bengaluru, India</span>
            </div>

            <div className="ce-footer-status">
              <span className="ce-status-dot" />
              <span className="ce-status-text">All systems operational</span>
            </div>
          </div>

          {/* Product Column */}
          <div className="ce-footer-col">
            <span className="ce-footer-col-title">Product</span>
            <a href="#features" className="ce-footer-link">
              Features
            </a>
            <a href="#editor-section" className="ce-footer-link">
              Sandbox Editor
            </a>
            <a href="#ai-partner" className="ce-footer-link">
              AI Coding
            </a>
            <a href="#pricing" className="ce-footer-link">
              Premium Plans
            </a>
          </div>

          {/* Resources Column */}
          <div className="ce-footer-col">
            <span className="ce-footer-col-title">Resources</span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              API Reference
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Documentation
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              SLA Status
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Open Source
            </span>
          </div>

          {/* Legal Column */}
          <div className="ce-footer-col">
            <span className="ce-footer-col-title">Legal</span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Privacy Policy
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Terms of Service
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              GDPR Compliance
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Cookie Settings
            </span>
          </div>

          {/* Newsletter Column */}
          <div className="ce-footer-newsletter-col">
            <span className="ce-footer-col-title">Stay Updated</span>
            <p className="ce-footer-newsletter-desc">
              Subscribe to get notified about scaling updates, API releases, and product news.
            </p>
            <form className="ce-footer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="enter your email..." className="ce-footer-newsletter-input" required />
              <button type="submit" className="ce-footer-newsletter-btn" aria-label="Subscribe">
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="ce-footer-bottom">
          <span>© {new Date().getFullYear()} CodeExpo. All rights reserved.</span>
          <div style={{ display: "flex", gap: "16px" }}>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              GitHub
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              Discord
            </span>
            <span className="ce-footer-link" style={{ cursor: "pointer" }}>
              X / Twitter
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
});

FooterSection.displayName = "FooterSection";

// ==========================================
// MAIN HOME COMPONENT
// ==========================================
function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme: theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile(768);
  const { isVisible: navVisible, isScrolled: navScrolled, isMounted } = useSmartNavbar();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  // Loaded once on mount and passed down
  const [totalUser, setTotalUser] = useState(0);
  const [dbStats, setDbStats] = useState({ developers: 0, rooms: 0, messages: 0, executions: 0 });
  const [reviews, setReviews] = useState([]);
  const [activeSection, setActiveSection] = useState("hero");

  // Shared state with navbar scroll anchors
  const [ecosystemTab, setEcosystemTab] = useState("all");

  const lenisRef = useRef(null);
  const navLinksRef = useRef({});
  const isScrollingRef = useRef(false);

  // Fetch metrics once
  useEffect(() => {
    getCountUser()
      .then((res) => {
        if (res && (res.count || res.data?.count)) {
          setTotalUser(res.count || res.data?.count);
        }
      })
      .catch((err) => console.error("Error fetching countUser:", err));

    getPublicStats()
      .then((res) => {
        if (res && res.stats) {
          setDbStats(res.stats);
        }
      })
      .catch((err) => console.error("Error fetching publicStats:", err));

    getWebsiteRatingInfo()
      .then((res) => {
        if (res && res.success && res.ratings) {
          setReviews(res.ratings);
        }
      })
      .catch((err) => console.error("Error fetching website ratings:", err));
  }, []);

  // Fetch API fallbacks on mount
  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const data = await getCountUser();
        if (data && data.userCount) setTotalUser(data.userCount);
      } catch (e) {
        console.error(e);
      }
    };
    const fetchStats = async () => {
      try {
        const data = await getPublicStats();
        if (data && data.success) setDbStats(data.stats);
      } catch (e) {
        console.error(e);
      }
    };
    const fetchReviews = async () => {
      try {
        const data = await getWebsiteRatingInfo();
        if (data && data.reviews) setReviews(data.reviews);
      } catch (e) {
        console.error(e);
      }
    };

    fetchUserCount();
    fetchStats();
    fetchReviews();
  }, []);

  // Scroll Navigation Setup
  const handleNavClick = (id) => {
    let scrollTarget = id;
    if (id === "planner" || id === "ai-coder" || id === "myverse") {
      setEcosystemTab(id);
      scrollTarget = "ecosystem";
    } else if (id === "ecosystem") {
      setEcosystemTab("all");
    }
    setActiveSection(id);
    isScrollingRef.current = true;
    window.history.replaceState(null, null, `#${id === "hero" ? "" : id}`);

    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${scrollTarget}`, {
        duration: 0.9,
        onComplete: () => {
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 50);
        }
      });
    } else {
      const el = document.getElementById(scrollTarget);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 800);
      }
    }
  };

  // Nav link indicator sync
  useEffect(() => {
    let rafId;
    const updateIndicator = () => {
      rafId = requestAnimationFrame(() => {
        const activeLink = navLinksRef.current[activeSection];
        const navContainer = document.querySelector(".ce-nav-links");
        if (activeLink && navContainer) {
          const containerRect = navContainer.getBoundingClientRect();
          const linkRect = activeLink.getBoundingClientRect();
          const left = linkRect.left - containerRect.left;
          const width = linkRect.width;

          navContainer.style.setProperty("--active-left", `${left}px`);
          navContainer.style.setProperty("--active-width", `${width}px`);
          navContainer.style.setProperty("--indicator-opacity", "1");
        } else if (navContainer) {
          navContainer.style.setProperty("--indicator-opacity", "0");
        }
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeSection, theme]);

  // Section Observer for Active Nav Link
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px",
      threshold: 0
    };

    const handleIntersection = (entries) => {
      if (isScrollingRef.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const targetHash = id === "hero" ? "" : `#${id}`;
          if (window.location.hash !== targetHash) {
            setActiveSection(id);
            window.history.replaceState(null, null, targetHash || window.location.pathname);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    const sectionIds = [
      "hero",
      "editor-section",
      "ecosystem",
      "features",
      "analytics",
      "pricing",
      "testimonials"
    ];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Intersection Observer for 3D Scroll Reveal - Plays exactly once!
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-init");
    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.05
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-active");
          // Play exactly once by unobserving immediately!
          revealObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    revealElements.forEach((el) => revealObserver.observe(el));

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  // Hash anchor scrolling on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace("#", "");
      setTimeout(() => {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(hash, { duration: 0.9 });
        } else {
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }
      }, 400);
    }
  }, []);

  // Smooth scroll Lenis setup
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.0
    });
    lenisRef.current = lenis;

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
      cancelAnimationFrame(rafId);
    };
  }, []);

  if (isMobile) {
    return (
      <Suspense
        fallback={<div style={{ minHeight: "100vh", background: theme === "dark" ? "#0f172a" : "#ffffff" }} />}
      >
        <MobileLandingPage
          user={user}
          theme={theme}
          toggleTheme={toggleTheme}
          dbStats={dbStats}
          totalUser={totalUser}
          reviews={reviews}
        />
      </Suspense>
    );
  }

  return (
    <main className={`home-page ${theme === "light" ? "light-theme" : "dark-theme"} page-fade-in`}>
      {/* Refined Fixed Header */}
      <header
        className={`ce-navbar ${isMounted ? "has-transition" : ""} ${navScrolled ? "scrolled" : ""} ${
          !navVisible ? "ce-navbar-hidden" : ""
        }`}
      >
        <div className="ce-container ce-navbar-container">
          <div
            className="ce-nav-logo"
            onClick={() => navigate("/")}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate("/");
              }
            }}
            aria-label="CodeExpo homepage"
          >
            <img src="/logo.png" alt="CodeExpo" fetchpriority="high" decoding="async" className="ce-nav-logo-img" />
            <span className="ce-nav-logo-text">CodeExpo</span>
          </div>

          <nav className="ce-nav-links">
            <a
              ref={(el) => (navLinksRef.current["hero"] = el)}
              href="#hero"
              className={`ce-nav-link ${activeSection === "hero" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("hero");
              }}
            >
              Home
            </a>
            <a
              ref={(el) => (navLinksRef.current["editor-section"] = el)}
              href="#editor-section"
              className={`ce-nav-link ${activeSection === "editor-section" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("editor-section");
              }}
            >
              Workspace
            </a>
            <a
              ref={(el) => (navLinksRef.current["planner"] = el)}
              href="#planner"
              className={`ce-nav-link ${activeSection === "planner" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("planner");
              }}
            >
              Planner
            </a>
            <a
              ref={(el) => (navLinksRef.current["ai-coder"] = el)}
              href="#ai-coder"
              className={`ce-nav-link ${activeSection === "ai-coder" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("ai-coder");
              }}
            >
              Expo AI
            </a>
            <a
              ref={(el) => (navLinksRef.current["myverse"] = el)}
              href="#myverse"
              className={`ce-nav-link ${activeSection === "myverse" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("myverse");
              }}
            >
              MyVerse
            </a>
            <a
              ref={(el) => (navLinksRef.current["features"] = el)}
              href="#features"
              className={`ce-nav-link ${activeSection === "features" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("features");
              }}
            >
              Features
            </a>
            <a
              ref={(el) => (navLinksRef.current["analytics"] = el)}
              href="#analytics"
              className={`ce-nav-link ${activeSection === "analytics" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("analytics");
              }}
            >
              Analytics
            </a>
            <a
              ref={(el) => (navLinksRef.current["pricing"] = el)}
              href="#pricing"
              className={`ce-nav-link ${activeSection === "pricing" ? "active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick("pricing");
              }}
            >
              Plans
            </a>
            <span className="ce-nav-indicator" />
          </nav>

          <div className="ce-nav-actions">
            <button type="button" className="ce-theme-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <button type="button" className="ce-btn ce-btn-primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button type="button" className="ce-btn ce-btn-secondary" onClick={() => navigate("/login")}>
                  Sign In
                </button>
                <button
                  type="button"
                  className="ce-btn ce-btn-primary"
                  onClick={() => navigate(user || localStorage.getItem("token") ? "/dashboard" : "/register")}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="home-perspective-wrapper">
        {/* Radix Themes-Style Diagonal Diamond Grid */}
        <div className="ce-bg-diagonal-grid">
          <svg className="ce-bg-diagonal-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diagonal-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 0 0 L 60 60 M 60 0 L 0 60" fill="none" stroke="var(--diagonal-grid-color, rgba(255,255,255,0.02))" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diagonal-grid)" />
          </svg>
        </div>

        {/* Radix Themes-Style Soft Glow Backdrop Blobs */}
        <div className="ce-bg-glow-blobs">
          <div className="ce-glow-blob blob-blue"></div>
          <div className="ce-glow-blob blob-purple"></div>
          <div className="ce-glow-blob blob-cyan"></div>
          <div className="ce-glow-blob blob-emerald"></div>
        </div>

        {/* Winding Road shape background pathway */}
        <div className="ce-bg-road-wrapper">
          <svg className="ce-bg-road-svg" viewBox="0 0 1440 3200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path
              className="ce-bg-road-line-back"
              d="M720,0 C1200,600 200,1000 720,1600 C1200,2200 240,2600 720,3200"
              stroke="var(--road-bg-color, rgba(255, 255, 255, 0.03))"
              strokeWidth="24"
              strokeLinecap="round"
            />
            <path
              className="ce-bg-road-line-dashed"
              d="M720,0 C1200,600 200,1000 720,1600 C1200,2200 240,2600 720,3200"
              stroke="var(--road-dashed-color, rgba(255, 255, 255, 0.15))"
              strokeWidth="2"
              strokeDasharray="12,18"
              strokeLinecap="round"
            />
            <path
              className="ce-bg-road-line-glow"
              d="M720,0 C1200,600 200,1000 720,1600 C1200,2200 240,2600 720,3200"
              stroke="url(#road-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="road-gradient" x1="0" y1="0" x2="0" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="30%" stopColor="#a855f7" />
                <stop offset="70%" stopColor="#00f0ff" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 1. Hero Section */}
        <HeroSection totalUser={totalUser} dbStats={dbStats} navigate={navigate} user={user} />

        {/* 2. Futuristic Developer Stories Row */}
        <StoriesSection user={user} />

        {/* 3. Multi-File Workspace Sandbox Section */}
        <WorkspaceSection />

        {/* 3.5 Room Collaboration Hub (Meeting & Chat Showcase) */}
        <RoomCollaborationShowcase />

        {/* 4. Bento Grid Features Section */}
        <BentoSection />

        {/* 4.5 Live Workspace Feature Showcase & Network Feed */}
        <NetworkFeedShowcase />

        {/* 5. Developer Network Analytics Section */}
        <AnalyticsSection />

        {/* 6. Squarespace-Style Showcase */}
        <EcosystemSection ecosystemTab={ecosystemTab} setEcosystemTab={setEcosystemTab} />

        {/* 7. Pricing & Subscriptions Section */}
        <PricingSection />

        {/* 8. Testimonials Section */}
        <TestimonialsSection reviews={reviews} />

        {/* 9. Call to Action Panel */}
        <section className="ce-section" aria-labelledby="cta-heading">
          <div className="ce-container">
            <div className="ce-cta">
              <h2 id="cta-heading" className="ce-cta-title">Ready to write code together?</h2>
              <p className="ce-cta-desc">
                Spin up a secure multiplayer coding environment and connect with other developers instantly.
              </p>
              <button
                className="ce-btn ce-btn-primary"
                onClick={() => navigate(user || localStorage.getItem("token") ? "/dashboard" : "/register")}
              >
                Get Started for Free
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* 10. Footer Section */}
        <FooterSection navigate={navigate} />
      </div>
    </main>
  );
}

export default Home;
