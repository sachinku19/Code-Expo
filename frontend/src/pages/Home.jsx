import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getCountUser, getPublicStats } from "../services/authService";
import { getWebsiteRatingInfo } from "../services/websiteRatingService";
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
  HelpCircle
} from "lucide-react";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme: theme, toggleTheme } = useTheme();

  // Stats state
  const [totalUser, setTotalUser] = useState(0);
  const [dbStats, setDbStats] = useState({ developers: 0, rooms: 0, messages: 0, executions: 0 });
  const [reviews, setReviews] = useState([]);
  const [activeSection, setActiveSection] = useState("hero");

  // Lenis & Scroll refs
  const lenisRef = useRef(null);
  const navLinksRef = useRef({});
  const isScrollingRef = useRef(false);

  // ==========================================
  // 1. Stories System Tray State
  // ==========================================
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  const stories = [
    {
      id: 1,
      user: "sachin_codes",
      name: "Sachin Kumar",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80",
      status: "Refactoring Socket Engine",
      color: "#3b82f6",
      code: `const io = new Server(server, {\n  cors: {\n    origin: "*",\n    methods: ["GET", "POST"]\n  }\n});`
    },
    {
      id: 2,
      user: "aman_dev",
      name: "Aman Sharma",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80",
      status: "Coding Python Sandbox",
      color: "#10b981",
      code: `import docker\n\ndef spin_sandbox(image):\n    client = docker.from_env()\n    return client.containers.run(\n        image, detach=True, tty=True\n    )`
    },
    {
      id: 3,
      user: "katarina_chen",
      name: "Katarina Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80",
      status: "Designing Multiplayer Canvas",
      color: "#a855f7",
      code: `ctx.beginPath();\nctx.strokeStyle = activeColor;\nctx.lineWidth = brushWidth;\nctx.moveTo(prevX, prevY);\nctx.lineTo(currentX, currentY);\nctx.stroke();`
    },
    {
      id: 4,
      user: "sarah_sys",
      name: "Sarah Jenkins",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
      status: "Configuring WebRTC iceCandidates",
      color: "#f59e0b",
      code: `pc.onicecandidate = (event) => {\n  if (event.candidate) {\n    socket.emit("ice-candidate", {\n      candidate: event.candidate,\n      roomId\n    });\n  }\n};`
    },
    {
      id: 5,
      user: "markus_vance",
      name: "Markus Vance",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80",
      status: "Optimizing Follow Array Sync",
      color: "#ec4899",
      code: `await User.updateMany(\n  {},\n  { $pull: { followers: userId, following: userId } }\n);\nawait Follow.deleteMany({ follower: userId });`
    }
  ];

  const handleOpenStory = (story) => {
    setActiveStory(story);
    setStoryProgress(0);
    clearInterval(progressIntervalRef.current);
    clearTimeout(storyTimerRef.current);

    // Animate progress bar (4 seconds)
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

  // ==========================================
  // 2. Interactive Multi-File Workspace State
  // ==========================================
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

  const [activeFileName, setActiveFileName] = useState("index.js");
  const [selectedLang, setSelectedLang] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);

  const activeFile = workspaceFiles[activeFileName];

  // Set file as entry point
  const handleSetEntryPoint = (fileName) => {
    const updated = { ...workspaceFiles };
    Object.keys(updated).forEach((key) => {
      updated[key].isEntryPoint = key === fileName;
    });
    setWorkspaceFiles(updated);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalOutput("Initializing CodeExpo local container sandbox...");

    // Find the entry point file
    const entryFileKey = Object.keys(workspaceFiles).find(
      (key) => workspaceFiles[key].isEntryPoint
    );
    const entryFile = workspaceFiles[entryFileKey];

    const executionOutputs = {
      javascript: `[Workspace Compiler] Building local index.js graph...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running node index.js...\n\nReady to build faster together!\n\n[Done] Process finished with exit code 0.`,
      python: `[Workspace Compiler] Preparing python environment...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running python main.py...\n\nSpinning up secure Docker container...\nCollaborator: Sachin joined the workspace\nCollaborator: Aman joined the workspace\nCollaborator: You joined the workspace\n\n[Done] Process finished with exit code 0.`,
      cpp: `[Workspace Compiler] Compiling C++ binary...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running g++ main.cpp && ./a.out...\n\nRoom state synchronized successfully.\nAverage pairing latency: 14ms\n\n[Done] Process finished with exit code 0.`,
      java: `[Workspace Compiler] Compiling Java bytecode...\n[Workspace Compiler] Entry point verified: ${entryFile.path}\n[Workspace Compiler] Running javac Main.java && java Main...\n\nMultiplexer connection opened...\nYjs CRDT live state: active.\n\n[Done] Process finished with exit code 0.`,
      text: `[Workspace Compiler] Unable to compile file with type 'text'.\n[System Tip] Set a javascript, python, cpp, or java file as your entry point.`,
      json: `[Workspace Compiler] Parsed config.json successfully.\nNo executable logic declared.`,
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

  // ==========================================
  // 3. Pricing Configurations
  // ==========================================
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // monthly or yearly

  // ==========================================
  // 4. Interactive Helpdesk Ticketing System State
  // ==========================================
  const [tickets, setTickets] = useState([
    { id: "T-402", title: "WebRTC audio dropouts on low-bandwidth networks", category: "Calls", status: "RESOLVED", date: "2 mins ago" },
    { id: "T-403", title: "Add Docker support for Go compile workspace targets", category: "Compiler", status: "IN REVIEW", date: "2 hrs ago" },
    { id: "T-404", title: "Whiteboard eraser canvas synchronization lagging", category: "Whiteboard", status: "IN PROGRESS", date: "1 day ago" }
  ]);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("Compiler");

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) return;

    const newId = `T-${Math.floor(400 + Math.random() * 600)}`;
    const ticketObj = {
      id: newId,
      title: newTicketTitle,
      category: newTicketCategory,
      status: "OPEN",
      date: "Just now"
    };

    setTickets([ticketObj, ...tickets]);
    setNewTicketTitle("");
  };

  // ==========================================
  // Scroll Navigation Setup
  // ==========================================
  const handleNavClick = (id) => {
    setActiveSection(id);
    isScrollingRef.current = true;
    window.history.replaceState(null, null, `#${id === "hero" ? "" : id}`);

    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${id}`, {
        duration: 0.9,
        onComplete: () => {
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 50);
        }
      });
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 800);
      }
    }
  };

  useEffect(() => {
    const updateIndicator = () => {
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
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeSection, theme]);

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
          setActiveSection(id);
          window.history.replaceState(null, null, `#${id === "hero" ? "" : id}`);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    const sectionIds = ["hero", "editor-section", "features", "analytics", "pricing", "trust-safety", "ai-partner", "testimonials"];
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // ==========================================
  // Intersection Observer for 3D Scroll Reveal
  // ==========================================
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-init");
    const observerOptions = {
      root: null,
      rootMargin: "0px 0px -10% 0px", // Trigger when elements are slightly in view
      threshold: 0.05
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-active");
        } else {
          entry.target.classList.remove("reveal-active");
        }
      });
    }, observerOptions);

    revealElements.forEach((el) => revealObserver.observe(el));

    return () => {
      revealElements.forEach((el) => revealObserver.unobserve(el));
      revealObserver.disconnect();
    };
  }, []);

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

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2
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

  const defaultTestimonials = [
    {
      _id: "default-1",
      comment: "We transitioned all of our interview sessions and live debugging workflows to CodeExpo. The built-in audio/video runs incredibly smoothly.",
      rating: 5,
      user: { username: "Alex Rivera", avatar: "", programmingLanguages: ["TypeScript", "Rust"] }
    },
    {
      _id: "default-2",
      comment: "Being able to sketch out architectures on the multiplayer whiteboard right next to my editor files is a huge productivity booster.",
      rating: 5,
      user: { username: "Katarina Chen", avatar: "", programmingLanguages: ["Go", "React"] }
    },
    {
      _id: "default-3",
      comment: "The social hub has allowed me to share my daily projects and build a following of developers directly interested in my code.",
      rating: 5,
      user: { username: "Markus Vance", avatar: "", programmingLanguages: ["Python", "Docker"] }
    }
  ];

  const activeReviews = (() => {
    if (!reviews || reviews.length === 0) return defaultTestimonials;
    if (reviews.length >= 3) return reviews;
    const combined = [...reviews];
    for (let i = 0; i < defaultTestimonials.length; i++) {
      if (combined.length >= 3) break;
      const isAlreadyAdded = combined.some(
        (r) => (r.user?.username || "Anonymous") === defaultTestimonials[i].user.username
      );
      if (!isAlreadyAdded) combined.push(defaultTestimonials[i]);
    }
    return combined;
  })();

  const [reviewsIndex, setReviewsIndex] = useState(0);

  useEffect(() => {
    if (activeReviews.length === 0) return;
    const interval = setInterval(() => {
      setReviewsIndex((prev) => (prev + 1) % activeReviews.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeReviews.length]);

  const handlePrev = () => {
    setReviewsIndex((prev) => (prev - 1 + activeReviews.length) % activeReviews.length);
  };

  const handleNext = () => {
    setReviewsIndex((prev) => (prev + 1) % activeReviews.length);
  };

  return (
    <main className={`home-page ${theme === "light" ? "light-theme" : "dark-theme"} page-fade-in`}>

      {/* Refined Fixed Header */}
      <header className="ce-navbar">
        <div className="ce-container ce-navbar-container">
          <div className="ce-nav-logo" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="CodeExpo" className="ce-nav-logo-img" />
            <span className="ce-nav-logo-text">CodeExpo</span>
          </div>

          <nav className="ce-nav-links">
            <a
              ref={(el) => (navLinksRef.current["hero"] = el)}
              href="#hero"
              className={`ce-nav-link ${activeSection === "hero" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("hero"); }}
            >
              Home
            </a>
            <a
              ref={(el) => (navLinksRef.current["editor-section"] = el)}
              href="#editor-section"
              className={`ce-nav-link ${activeSection === "editor-section" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("editor-section"); }}
            >
              Workspace
            </a>
            <a
              ref={(el) => (navLinksRef.current["features"] = el)}
              href="#features"
              className={`ce-nav-link ${activeSection === "features" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("features"); }}
            >
              Features
            </a>
            <a
              ref={(el) => (navLinksRef.current["analytics"] = el)}
              href="#analytics"
              className={`ce-nav-link ${activeSection === "analytics" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("analytics"); }}
            >
              Analytics
            </a>
            <a
              ref={(el) => (navLinksRef.current["pricing"] = el)}
              href="#pricing"
              className={`ce-nav-link ${activeSection === "pricing" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("pricing"); }}
            >
              Plans
            </a>
            <a
              ref={(el) => (navLinksRef.current["trust-safety"] = el)}
              href="#trust-safety"
              className={`ce-nav-link ${activeSection === "trust-safety" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("trust-safety"); }}
            >
              Trust & Support
            </a>
            <span className="ce-nav-indicator" />
          </nav>

          <div className="ce-nav-actions">
            <button className="ce-theme-btn" onClick={toggleTheme} aria-label="Toggle Theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {user ? (
              <button className="ce-btn ce-btn-primary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button className="ce-btn ce-btn-secondary" onClick={() => navigate("/login")}>
                  Sign In
                </button>
                <button className="ce-btn ce-btn-primary" onClick={() => navigate("/register")}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="ce-hero">
        <div className="ce-container">
          <div className="ce-hero-badge">
            <span className="ce-hero-badge-pulse" />
            <span className="ce-hero-badge-text">
              {totalUser > 0 ? `${totalUser} developers online coding right now` : "Developers hub online"}
            </span>
          </div>

          <h1 className="ce-hero-title">
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
            <div className="ce-stat-item">
              <span className="ce-stat-val">
                {dbStats.developers > 0 ? dbStats.developers.toLocaleString() : "1,200+"}
              </span>
              <span className="ce-stat-lbl">Developers</span>
            </div>
            <div className="ce-stat-item">
              <span className="ce-stat-val">
                {dbStats.rooms > 0 ? dbStats.rooms.toLocaleString() : "850+"}
              </span>
              <span className="ce-stat-lbl">Active Rooms</span>
            </div>
            <div className="ce-stat-item">
              <span className="ce-stat-val">
                {dbStats.executions > 0 ? dbStats.executions.toLocaleString() : "10,000+"}
              </span>
              <span className="ce-stat-lbl">Executions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Futuristic Developer Stories Row */}
      <div className="ce-stories-section">
        <div className="ce-container">
          <h3 className="ce-stories-title">
            <Sparkles size={14} style={{ color: "#3b82f6" }} /> Live Developers Sharing Code
          </h3>
          <div className="ce-stories-tray">
            {stories.map((story) => (
              <div 
                key={story.id} 
                className="ce-story-bubble-wrapper"
                onClick={() => handleOpenStory(story)}
              >
                <div className="ce-story-bubble" style={{ "--story-color": story.color }}>
                  <img src={story.avatar} alt={story.user} className="ce-story-avatar" />
                  <span className="ce-story-pulse" style={{ backgroundColor: story.color }} />
                </div>
                <span className="ce-story-username">{story.user}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Stories Modal */}
      {activeStory && (
        <div className="ce-story-modal-overlay" onClick={handleCloseStory}>
          <div className="ce-story-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ce-story-modal-progress">
              <div className="ce-story-modal-progress-bar" style={{ width: `${storyProgress}%` }} />
            </div>
            
            <div className="ce-story-modal-header">
              <div className="ce-story-modal-profile">
                <img src={activeStory.avatar} alt={activeStory.user} className="ce-story-modal-avatar" />
                <div>
                  <span className="ce-story-modal-name">{activeStory.name}</span>
                  <span className="ce-story-modal-handle">@{activeStory.user}</span>
                </div>
              </div>
              <button className="ce-story-modal-close" onClick={handleCloseStory}>&times;</button>
            </div>

            <div className="ce-story-modal-body">
              <div className="ce-story-status-card">
                <span className="ce-story-status-tag" style={{ color: activeStory.color }}>● LIVE CODE SNAPSHOT</span>
                <p className="ce-story-status-text">{activeStory.status}</p>
              </div>

              <pre className="ce-story-code-block">
                <code>{activeStory.code}</code>
              </pre>
            </div>

            <div className="ce-story-modal-footer">
              <button 
                className="ce-btn ce-btn-primary" 
                onClick={() => { handleCloseStory(); navigate("/register"); }}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Join Coding Room
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-File Workspace Sandbox Section */}
      <section id="editor-section" className="ce-section" style={{ borderTop: "none", paddingBottom: "32px" }}>
        <div className="ce-container">
          <div className="ce-section-header">
            <span className="ce-section-tag">MULTI-FILE WORKSPACE</span>
            <h2 className="ce-section-title">A complete local IDE, in your browser.</h2>
            <p className="ce-section-subtitle">
              Manage folder directories, edit multiple files in tabs, set compilation entry points, and execute source code with stdin buffers.
            </p>
          </div>

          <div className="ce-workspace-ide reveal-init reveal-3d-left">
            
            {/* Sidebar Explorer */}
            <div className="ce-ide-sidebar">
              <div className="ce-sidebar-header">
                <span>WORKSPACE EXPLORER</span>
              </div>
              
              <div className="ce-sidebar-files">
                {/* Simulated folders */}
                <div className="ce-sidebar-item folder">
                  <Folder size={14} className="ce-folder-icon" />
                  <span>src</span>
                </div>
                
                {/* File list */}
                {Object.keys(workspaceFiles).map((fileName) => {
                  const fileObj = workspaceFiles[fileName];
                  return (
                    <div 
                      key={fileName}
                      className={`ce-sidebar-item file ${activeFileName === fileName ? "active" : ""}`}
                      onClick={() => handleFileClick(fileName)}
                    >
                      <File size={13} className="ce-file-icon" />
                      <span className="ce-file-name">{fileName}</span>
                      
                      {fileObj.isEntryPoint ? (
                        <span className="ce-entry-point-badge" title="Compilation Entry Point">
                          <Award size={10} style={{ color: "#eab308" }} />
                        </span>
                      ) : (
                        fileObj.lang !== "text" && fileObj.lang !== "json" && (
                          <button 
                            className="ce-set-entry-btn" 
                            onClick={(e) => { e.stopPropagation(); handleSetEntryPoint(fileName); }}
                            title="Set as Entry Point"
                          >
                            <Star size={10} />
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Editor Workspace Panel */}
            <div className="ce-ide-editor-panel">
              <div className="ce-ide-header">
                <div className="ce-ide-controls">
                  <span className="ce-ide-dot red" />
                  <span className="ce-ide-dot yellow" />
                  <span className="ce-ide-dot green" />
                  <span className="ce-ide-title">
                    {activeFileName} {activeFile.isEntryPoint && "(Entry Point)"}
                  </span>
                </div>
              </div>

              <div className="ce-ide-body">
                {/* Simulated Cursors */}
                <div 
                  className="ce-ide-cursor" 
                  style={{ top: "34px", left: "210px", "--cursor-color": "#ef4444" }} 
                  data-label="Sachin" 
                />
                <div 
                  className="ce-ide-cursor" 
                  style={{ top: "86px", left: "280px", "--cursor-color": "#a855f7" }} 
                  data-label="Aman" 
                />
                
                <pre className="ce-ide-code">
                  <code>{activeFile.content}</code>
                </pre>

                <div className="ce-ide-typing">
                  <span />
                  <span />
                  <span />
                  Aman is editing...
                </div>
              </div>

              <div className="ce-ide-footer">
                <button
                  className="ce-ide-run-btn"
                  onClick={handleRunCode}
                  disabled={isRunning}
                >
                  <Code size={14} />
                  <span>{isRunning ? "Compiling Project..." : "Run Project"}</span>
                </button>
              </div>

              {showTerminal && (
                <div className="ce-ide-terminal">
                  <div className="ce-ide-terminal-header">
                    <Terminal size={12} style={{ marginRight: "4px", display: "inline", verticalAlign: "middle" }} />
                    <span>Terminal Output</span>
                  </div>
                  <pre className="ce-ide-terminal-content">{terminalOutput}</pre>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="ce-section">
        <div className="ce-container">
          <div className="ce-section-header">
            <span className="ce-section-tag">Value Proposition</span>
            <h2 className="ce-section-title">Built for developer productivity.</h2>
            <p className="ce-section-subtitle">
              All the tools you need to pair program, debug, share knowledge, and build your digital footprint in one unified interface.
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
                Collaborate instantly with zero latency using advanced Conflict-free Replicated Data Types (CRDTs). Experience conflict-free simultaneous editing in any language.
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
                <div className="ce-call-window">
                  <div className="ce-call-participants">
                    {/* Participant 1 (Sachin) */}
                    <div className="ce-call-feed">
                      <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" 
                        alt="Sachin Kumar" 
                        className="ce-call-feed-img" 
                      />
                      <span className="ce-call-feed-name">Sachin</span>
                      <div className="ce-call-audio-wave">
                        <span /><span /><span /><span />
                      </div>
                    </div>
                    {/* Participant 2 (Aman) */}
                    <div className="ce-call-feed muted">
                      <img 
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80" 
                        alt="Aman Sharma" 
                        className="ce-call-feed-img" 
                      />
                      <span className="ce-call-feed-name">Aman</span>
                      <MicOff size={10} className="ce-call-feed-mute" />
                    </div>
                  </div>
                  {/* Floating Controller overlay bar */}
                  <div className="ce-call-controls">
                    <button className="ce-call-icon-btn active"><Video size={12} /></button>
                    <button className="ce-call-icon-btn active"><Mic size={12} /></button>
                    <button className="ce-call-icon-btn end"><PhoneOff size={12} /></button>
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
                Sketch architecture diagrams, lay out system flows, and brainstorm UI layouts with multiplayer drawing canvas tools.
              </p>

              <div className="ce-bento-preview ce-bento-whiteboard-preview">
                {/* Whiteboard Background Sketch Layout (Revealed on Hover) */}
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
                Post code snippets, share engineering notes, build your follower base, and connect with other developers globally. Show off your portfolio stats in a structured feed.
              </p>

              <div className="ce-bento-preview ce-bento-deck-preview">
                <div className="ce-feed-deck">
                  {/* Card 1: Topmost */}
                  <div className="ce-feed-card card-1">
                    <div className="ce-feed-card-header">
                      <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" 
                        alt="Sachin Kumar" 
                        className="ce-feed-card-avatar-img" 
                      />
                      <div className="ce-feed-card-user">
                        <span className="ce-feed-card-name">Sachin Kumar</span>
                        <span className="ce-feed-card-handle">@sachin_codes</span>
                      </div>
                      <span className="ce-feed-card-time">Just now</span>
                    </div>
                    <p className="ce-feed-card-body">
                      Just optimized the collaborative canvas component using absolute matrix coordinates. Sync rates are up 40%! ⚡
                    </p>
                    <div className="ce-feed-card-footer">
                      <span className="ce-feed-card-stat"><Heart size={11} /> 42 likes</span>
                      <span className="ce-feed-card-stat"><MessageCircle size={11} /> 8 comments</span>
                      <span className="ce-feed-card-tag">#react</span>
                    </div>
                  </div>

                  {/* Card 2: Stacked Middle */}
                  <div className="ce-feed-card card-2">
                    <div className="ce-feed-card-header">
                      <img 
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80" 
                        alt="Aman Sharma" 
                        className="ce-feed-card-avatar-img" 
                      />
                      <div className="ce-feed-card-user">
                        <span className="ce-feed-card-name">Aman Sharma</span>
                        <span className="ce-feed-card-handle">@aman_dev</span>
                      </div>
                    </div>
                    <p className="ce-feed-card-body">
                      Refactoring collaborative document sync to support nested CRDTs.
                    </p>
                  </div>

                  {/* Card 3: Stacked Bottom */}
                  <div className="ce-feed-card card-3">
                    <div className="ce-feed-card-header">
                      <img 
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" 
                        alt="Sarah Jenkins" 
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

      {/* Developer Network Analytics Section */}
      <section id="analytics" className="ce-section ce-analytics-section">
        <div className="ce-container">
          <div className="ce-section-header">
            <span className="ce-section-tag">NETWORK ANALYTICS</span>
            <h2 className="ce-section-title">Measure your footprint.</h2>
            <p className="ce-section-subtitle">
              Track your profile growth, coding execution metrics, and language skills inside a beautiful visual statistics dashboard.
            </p>
          </div>

          <div className="ce-analytics-grid">
            {/* Left Card: Developer Profile Stats */}
            <div className="ce-analytics-card profile reveal-init reveal-3d-left">
              <div className="ce-analytics-card-header">
                <Users size={16} />
                <span>Developer Profile</span>
              </div>
              <div className="ce-dev-profile-preview">
                <div className="ce-dev-profile-meta">
                  <div className="ce-circular-level">
                    <span className="ce-circular-level-num">12</span>
                    <span className="ce-circular-level-lbl">LVL</span>
                  </div>
                  <div>
                    <h4 className="ce-dev-profile-username">Sachin Kumar</h4>
                    <span className="ce-dev-profile-title">Principal Architect</span>
                  </div>
                </div>

                <div className="ce-dev-profile-badges">
                  <div className="ce-profile-stat-badge">
                    <Flame size={12} className="ce-stat-badge-icon" />
                    <span>21 Day Streak</span>
                  </div>
                  <div className="ce-profile-stat-badge">
                    <Award size={12} className="ce-stat-badge-icon" />
                    <span>2,400 Rep Pts</span>
                  </div>
                </div>

                <div className="ce-dev-profile-hours">
                  <div className="ce-hours-row">
                    <span>Coding Hours</span>
                    <span className="ce-hours-val">145.8 hrs</span>
                  </div>
                  <div className="ce-hours-progress">
                    <div className="ce-hours-progress-bar" style={{ width: "72.9%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Card: Follower Growth Graph */}
            <div className="ce-analytics-card growth reveal-init reveal-3d-up">
              <div className="ce-analytics-card-header">
                <BarChart2 size={16} />
                <span>Follower Growth (6 Months)</span>
              </div>
              <div className="ce-bar-chart-preview">
                <div className="ce-chart-bars">
                  <div className="ce-chart-bar-col"><div className="ce-bar" style={{ height: "30%" }} /><span>Feb</span></div>
                  <div className="ce-chart-bar-col"><div className="ce-bar" style={{ height: "45%" }} /><span>Mar</span></div>
                  <div className="ce-chart-bar-col"><div className="ce-bar" style={{ height: "40%" }} /><span>Apr</span></div>
                  <div className="ce-chart-bar-col"><div className="ce-bar" style={{ height: "65%" }} /><span>May</span></div>
                  <div className="ce-chart-bar-col"><div className="ce-bar" style={{ height: "85%" }} /><span>Jun</span></div>
                  <div className="ce-chart-bar-col"><div className="ce-bar glow" style={{ height: "100%" }} /><span>Jul</span></div>
                </div>
              </div>
            </div>

            {/* Right Card: Language Skill Index */}
            <div className="ce-analytics-card skills reveal-init reveal-3d-right">
              <div className="ce-analytics-card-header">
                <Award size={16} />
                <span>Language Competence</span>
              </div>
              <div className="ce-skills-list">
                <div className="ce-skill-row">
                  <div className="ce-skill-info"><span>JavaScript</span><span>95%</span></div>
                  <div className="ce-skill-bar"><div className="ce-skill-fill" style={{ width: "95%", backgroundColor: "#3b82f6" }} /></div>
                </div>
                <div className="ce-skill-row">
                  <div className="ce-skill-info"><span>Python</span><span>88%</span></div>
                  <div className="ce-skill-bar"><div className="ce-skill-fill" style={{ width: "88%", backgroundColor: "#10b981" }} /></div>
                </div>
                <div className="ce-skill-row">
                  <div className="ce-skill-info"><span>C++</span><span>70%</span></div>
                  <div className="ce-skill-bar"><div className="ce-skill-fill" style={{ width: "70%", backgroundColor: "#a855f7" }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Subscriptions Section */}
      <section id="pricing" className="ce-section ce-pricing-section">
        <div className="ce-container">
          <div className="ce-section-header">
            <span className="ce-section-tag">PREMIUM PLANS</span>
            <h2 className="ce-section-title">Plans built to scale.</h2>
            <p className="ce-section-subtitle">
              Get access to high-performance containers, persistent workspaces, unlimited calling, and context-aware AI partner suggestions.
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
                <li><Check size={14} /> <span>3 collaborative rooms</span></li>
                <li><Check size={14} /> <span>5 mins call duration limit</span></li>
                <li><Check size={14} /> <span>Single-file code compilation</span></li>
                <li><Check size={14} /> <span>10 AI partner prompts / day</span></li>
              </ul>
              <button className="ce-btn ce-btn-secondary pricing-btn" onClick={() => navigate("/register")}>
                Get Started
              </button>
            </div>

            {/* Developer Pro (Popular) */}
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
                <li><Check size={14} /> <span>Unlimited collaborative rooms</span></li>
                <li><Check size={14} /> <span>Unlimited audio / video calls</span></li>
                <li><Check size={14} /> <span>Persistent multi-file workspaces</span></li>
                <li><Check size={14} /> <span>Unlimited context-aware AI partner</span></li>
                <li><Check size={14} /> <span>Priority execution queues</span></li>
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
                <li><Check size={14} /> <span>Everything in Developer Pro</span></li>
                <li><Check size={14} /> <span>Dedicated stats badges & custom URL</span></li>
                <li><Check size={14} /> <span>Priority SLA ticketing support</span></li>
                <li><Check size={14} /> <span>Early access features & betas</span></li>
                <li><Check size={14} /> <span>Exclusive profile banners</span></li>
              </ul>
              <button className="ce-btn ce-btn-secondary pricing-btn" onClick={() => navigate("/register")}>
                Subscribe Sponsor
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Helpdesk & Trust Center Section */}
      <section id="trust-safety" className="ce-section ce-trust-safety-section">
        <div className="ce-container">
          <div className="ce-section-header">
            <span className="ce-section-tag">HELP & SAFETY CENTER</span>
            <h2 className="ce-section-title">Support Desk & Platform Trust.</h2>
            <p className="ce-section-subtitle">
              Open support tickets directly in your workspace. Monitor your guidelines standing and manage profile security metrics.
            </p>
          </div>

          <div className="ce-trust-layout">
            
            {/* Left Box: Trust & Guidelines Meter */}
            <div className="ce-trust-box trust-standing reveal-init reveal-3d-left">
              <h3 className="ce-trust-box-title">Account Standing & Guidelines</h3>
              <p className="ce-trust-box-desc">
                Review your current platform behavior metrics. Our system calculates standings based on guidelines compliance.
              </p>
              
              <div className="ce-health-meter-container">
                <div className="ce-health-gauge">
                  <div className="ce-gauge-needle" style={{ transform: "rotate(90deg)" }} />
                  <div className="ce-gauge-info">
                    <span className="ce-gauge-score">100%</span>
                    <span className="ce-gauge-label">HEALTH SCORE</span>
                  </div>
                </div>
                <div className="ce-standing-status">
                  <ShieldCheck size={16} className="ce-standing-icon" />
                  <div>
                    <span className="ce-standing-status-title">Good Standing</span>
                    <p className="ce-standing-status-desc">No guidelines violations or warnings active.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Box: Support Helpdesk Simulator */}
            <div className="ce-trust-box ticket-helpdesk reveal-init reveal-3d-right">
              <h3 className="ce-trust-box-title">Built-in Support Helpdesk</h3>
              <p className="ce-trust-box-desc">
                File help requests, suggest workspace features, and track resolved reports.
              </p>

              {/* Ticket submit form */}
              <form className="ce-ticket-form" onSubmit={handleCreateTicket}>
                <input 
                  type="text" 
                  placeholder="Summarize the issue or request..." 
                  value={newTicketTitle}
                  onChange={(e) => setNewTicketTitle(e.target.value)}
                  className="ce-ticket-input"
                  required 
                />
                <div className="ce-ticket-form-footer">
                  <select 
                    value={newTicketCategory}
                    onChange={(e) => setNewTicketCategory(e.target.value)}
                    className="ce-ticket-select"
                  >
                    <option value="Compiler">Compiler</option>
                    <option value="Calls">Calls / Voice</option>
                    <option value="Whiteboard">Whiteboard</option>
                    <option value="Billing">Billing</option>
                  </select>
                  <button type="submit" className="ce-btn ce-btn-primary ticket-submit-btn">
                    Create Ticket
                  </button>
                </div>
              </form>

              {/* Tickets list */}
              <div className="ce-tickets-list">
                {tickets.map((t) => (
                  <div key={t.id} className="ce-ticket-item">
                    <div className="ce-ticket-meta">
                      <span className="ce-ticket-id">{t.id}</span>
                      <span className="ce-ticket-cat">{t.category}</span>
                      <span className="ce-ticket-date">{t.date}</span>
                    </div>
                    <p className="ce-ticket-title-text">{t.title}</p>
                    <span className={`ce-ticket-status ${t.status.toLowerCase()}`}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* AI Partner Section */}
      <section id="ai-partner" className="ce-section">
        <div className="ce-container ce-split-feature">
          <div className="ce-split-content reveal-init reveal-3d-left">
            <span className="ce-section-tag">AI Integration</span>
            <h2 className="ce-section-title" style={{ fontSize: "36px" }}>
              Meet your inline AI coding partner.
            </h2>
            <p className="ce-section-subtitle" style={{ fontSize: "16px", marginBottom: "24px" }}>
              Get instant code suggestions, refactor functions, locate security bottlenecks, and chat with an AI assistant that understands the context of your collaborative editor.
            </p>
            <ul style={{ paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "14px", lineHeight: "2" }}>
              <li>Refactor code with single-click diff reviews</li>
              <li>Translate legacy components to modern syntax</li>
              <li>Autogenerate comprehensive unit tests</li>
            </ul>
          </div>

          <div className="ce-split-preview reveal-init reveal-3d-right">
            <div className="ce-diff-box">
              <div className="ce-diff-header">
                <Sparkles size={14} className="ce-diff-sparkle" />
                <span>AI Refactoring Suggestion</span>
              </div>
              <div className="ce-diff-lines">
                <span className="ce-diff-line del">{`- function calc(a, b) { return a + b; }`}</span>
                <span className="ce-diff-line add">{`+ const add = (a, b) => a + b; // Optimized lambda`}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="ce-section" style={{ overflow: "hidden" }}>
        <div className="ce-container ce-testimonials-container-split">
          
          {/* Left Column: Heading and nav controls */}
          <div className="ce-testimonials-left reveal-init reveal-3d-left">
            <span className="ce-section-tag">CLIENT VOICES</span>
            <h2 className="ce-testimonials-title">Trusted By <br /><span>Developers</span></h2>
            <p className="ce-testimonials-desc">
              Real feedback from engineers, builders, and developers who chose CodeExpo to sync their project development and pairing sessions.
            </p>
            
            <div className="ce-testimonials-nav">
              <button className="ce-testimonials-nav-btn prev" onClick={handlePrev} aria-label="Previous testimonial">
                ←
              </button>
              <button className="ce-testimonials-nav-btn next" onClick={handleNext} aria-label="Next testimonial">
                →
              </button>
              <span className="ce-testimonials-counter">
                {String(reviewsIndex + 1).padStart(2, '0')} / {String(activeReviews.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Right Column: Fanned Slider viewport */}
          <div className="ce-testimonials-right reveal-init reveal-3d-right">
            <div className="ce-testimonials-carousel">
              <div className="ce-testimonials-slider-track">
                {activeReviews.map((review, idx) => {
                  const username = review.user?.username || "Anonymous";
                  const avatar = review.user?.avatar;
                  const langs = review.user?.programmingLanguages || [];
                  const title = langs.length > 0 ? langs.join(", ") : "Developer";

                  // Assign position class for coverflow slide logic
                  let positionClass = "card-hidden";
                  if (idx === reviewsIndex) {
                    positionClass = "card-active";
                  } else if (idx === (reviewsIndex - 1 + activeReviews.length) % activeReviews.length) {
                    positionClass = "card-prev";
                  } else if (idx === (idx === reviewsIndex ? -1 : (reviewsIndex + 1) % activeReviews.length)) {
                    positionClass = "card-next";
                  } else if (idx === (reviewsIndex + 1) % activeReviews.length) {
                    positionClass = "card-next";
                  }

                  return (
                    <div className={`ce-testimonial-card ${positionClass}`} key={review._id}>
                      <div className="ce-testimonial-card-inner">
                        {/* Stars */}
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

                        <p className="ce-testimonial-text">
                          "{review.comment || "No comment provided."}"
                        </p>

                        <div className="ce-testimonial-user">
                          <div className="ce-testimonial-avatar">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={username}
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
            <div className="ce-testimonials-dots">
              {activeReviews.map((_, idx) => (
                <button
                  key={idx}
                  className={`ce-testimonials-dot ${idx === reviewsIndex ? "active" : ""}`}
                  onClick={() => setReviewsIndex(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Call to Action Panel */}
      <section className="ce-section">
        <div className="ce-container">
          <div className="ce-cta">
            <h2 className="ce-cta-title">Ready to write code together?</h2>
            <p className="ce-cta-desc">
              Spin up a secure multiplayer coding environment and connect with other developers instantly.
            </p>
            <button className="ce-btn ce-btn-primary" onClick={() => navigate("/register")}>
              Get Started for Free
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ce-footer">
        {/* Background Watermark Big Text */}
        <div className="ce-footer-watermark">CODEEXPO</div>

        <div className="ce-container" style={{ position: "relative", zIndex: 1 }}>
          <div className="ce-footer-grid">
            
            {/* Branding Column */}
            <div className="ce-footer-branding">
              <div className="ce-footer-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                <img src="/logo.png" alt="CodeExpo" style={{ height: "24px", width: "24px" }} />
                <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>CodeExpo</span>
              </div>
              <p className="ce-footer-desc">
                The ultimate workspace for collaborative coding, real-time shared whiteboards, and developer feeds.
              </p>
              
              {/* Support & Contact details */}
              <div className="ce-footer-contact">
                <a href="mailto:support@codeexpo.com" className="ce-footer-contact-link">support@codeexpo.com</a>
                <span className="ce-footer-contact-addr">Bengaluru, India</span>
              </div>

              {/* Systems status badge */}
              <div className="ce-footer-status">
                <span className="ce-status-dot" />
                <span className="ce-status-text">All systems operational</span>
              </div>
            </div>

            {/* Product Column */}
            <div className="ce-footer-col">
              <span className="ce-footer-col-title">Product</span>
              <a href="#features" className="ce-footer-link">Features</a>
              <a href="#editor-section" className="ce-footer-link">Sandbox Editor</a>
              <a href="#ai-partner" className="ce-footer-link">AI Coding</a>
              <a href="#pricing" className="ce-footer-link">Premium Plans</a>
            </div>

            {/* Resources Column */}
            <div className="ce-footer-col">
              <span className="ce-footer-col-title">Resources</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>API Reference</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Documentation</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>SLA Status</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Open Source</span>
            </div>

            {/* Legal Column */}
            <div className="ce-footer-col">
              <span className="ce-footer-col-title">Legal</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Privacy Policy</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Terms of Service</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>GDPR Compliance</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Cookie Settings</span>
            </div>

            {/* Newsletter Column */}
            <div className="ce-footer-newsletter-col">
              <span className="ce-footer-col-title">Stay Updated</span>
              <p className="ce-footer-newsletter-desc">
                Subscribe to get notified about scaling updates, API releases, and product news.
              </p>
              <form className="ce-footer-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="enter your email..." 
                  className="ce-footer-newsletter-input" 
                  required 
                />
                <button type="submit" className="ce-footer-newsletter-btn" aria-label="Subscribe">
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>
          </div>

          <div className="ce-footer-bottom">
            <span>© {new Date().getFullYear()} CodeExpo. All rights reserved.</span>
            <div style={{ display: "flex", gap: "16px" }}>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>GitHub</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Discord</span>
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>X / Twitter</span>
            </div>
          </div>
        </div>
      </footer>

    </main>
  );
}

export default Home;
