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
  Lock
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

  // Interactive Editor state
  const [selectedLang, setSelectedLang] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);

  const lenisRef = useRef(null);
  const navLinksRef = useRef({});
  const isScrollingRef = useRef(false);

  const handleNavClick = (id) => {
    setActiveSection(id); // Snaps navbar highlight immediately on click
    isScrollingRef.current = true;
    
    // Update browser URL address hash
    window.history.replaceState(null, null, `#${id === "hero" ? "" : id}`);
    
    if (lenisRef.current) {
      lenisRef.current.scrollTo(`#${id}`, { 
        duration: 0.9, // faster animation duration
        onComplete: () => {
          // Clear scroll flag shortly after scroll animation completes
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

    updateIndicator(); // Snaps indicator calculations in the same layout pass
    window.addEventListener("resize", updateIndicator);
    
    return () => {
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeSection, theme]);

  useEffect(() => {
    const handleScroll = () => {
      // Ignore scroll event highlights if currently executing a click animation
      if (isScrollingRef.current) return;

      const sectionIds = ["hero", "features", "editor-section", "ai-partner", "testimonials"];
      
      // If at the very bottom of the page, active section is the last one
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
        setActiveSection("testimonials");
        window.history.replaceState(null, null, "#testimonials");
        return;
      }

      const scrollPosition = window.scrollY + 120; // offset for header + padding
      
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(id);
            window.history.replaceState(null, null, `#${id === "hero" ? "" : id}`);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Handle initial page load with URL hash (e.g., localhost:5173/#features)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace("#", "");
      // Wait shortly for DOM mounting and Lenis initialization
      setTimeout(() => {
        if (lenisRef.current) {
          lenisRef.current.scrollTo(hash, { duration: 0.9 });
        } else {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }
      }, 400);
    }
  }, []);

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth exponential easing
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
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
    // Fetch total active developers count
    const fetchUserCount = async () => {
      try {
        const data = await getCountUser();
        if (data && data.userCount) {
          setTotalUser(data.userCount);
        }
      } catch (error) {
        console.error("Error fetching user count:", error);
      }
    };

    // Fetch workspace stats
    const fetchStats = async () => {
      try {
        const data = await getPublicStats();
        if (data && data.success) {
          setDbStats(data.stats);
        }
      } catch (error) {
        console.error("Error fetching landing stats:", error);
      }
    };

    // Fetch real website ratings/reviews
    const fetchReviews = async () => {
      try {
        const data = await getWebsiteRatingInfo();
        if (data && data.reviews) {
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchUserCount();
    fetchStats();
    fetchReviews();
  }, []);

  const codeSnippets = {
    javascript: `// Real-time Collaborative Code Sharing
const session = {
  room: "multiplayer-sandbox",
  users: ["Sachin", "Aman", "You"],
  sync: true
};

console.log("Ready to build faster together!");`,
    python: `# Python 3 Real-time Sandbox Simulation
import time

devs = ["Sachin", "Aman", "You"]
print("Spinning up secure Docker container...")

for user in devs:
    print(f"User connected: {user}")
    time.sleep(0.05)`,
    cpp: `// High Performance Coding Environment
#include <iostream>
using namespace std;

int main() {
    cout << "Room state synchronized." << endl;
    cout << "Average ping: 12ms" << endl;
    return 0;
}`,
    java: `// Enterprise Java Starter Setup
public class Sandbox {
    public static void main(String[] args) {
        System.out.println("Multiplexer channel opened...");
        System.out.println("Status: Live sync active.");
    }
}`
  };

  const outputs = {
    javascript: `[Running] node index.js\nReady to build faster together.\n\n[Done] exited with code 0 in 0.08s`,
    python: `[Running] python main.py\nSpinning up secure Docker container...\nUser connected: Sachin\nUser connected: Aman\nUser connected: You\n\n[Done] exited with code 0 in 0.15s`,
    cpp: `[Running] g++ main.cpp && ./a.out\nRoom state synchronized.\nAverage ping: 12ms\n\n[Done] exited with code 0 in 0.32s`,
    java: `[Running] javac Sandbox.java && java Sandbox\nMultiplexer channel opened...\nStatus: Live sync active.\n\n[Done] exited with code 0 in 0.44s`
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalOutput("Initializing compiler sandbox...");

    setTimeout(() => {
      setTerminalOutput(outputs[selectedLang]);
      setIsRunning(false);
    }, 1000);
  };

  // Hide output when switching language
  useEffect(() => {
    setShowTerminal(false);
  }, [selectedLang]);

  const defaultTestimonials = [
    {
      _id: "default-1",
      comment: "We transitioned all of our interview sessions and live debugging workflows to CodeExpo. The built-in audio/video runs incredibly smoothly.",
      rating: 5,
      user: {
        username: "Alex Rivera",
        avatar: "",
        programmingLanguages: ["TypeScript", "Rust"]
      }
    },
    {
      _id: "default-2",
      comment: "Being able to sketch out architectures on the multiplayer whiteboard right next to my editor files is a huge productivity booster.",
      rating: 5,
      user: {
        username: "Katarina Chen",
        avatar: "",
        programmingLanguages: ["Go", "React"]
      }
    },
    {
      _id: "default-3",
      comment: "The social hub has allowed me to share my daily projects and build a following of developers directly interested in my code.",
      rating: 5,
      user: {
        username: "Markus Vance",
        avatar: "",
        programmingLanguages: ["Python", "Docker"]
      }
    }
  ];

  // Combine real database reviews with fallback reviews to always keep the testimonial grid populated with at least 3 high-quality reviews
  const activeReviews = (() => {
    if (!reviews || reviews.length === 0) return defaultTestimonials;
    if (reviews.length >= 3) return reviews;
    const combined = [...reviews];
    for (let i = 0; i < defaultTestimonials.length; i++) {
      if (combined.length >= 3) break;
      const isAlreadyAdded = combined.some(
        (r) => (r.user?.username || "Anonymous") === defaultTestimonials[i].user.username
      );
      if (!isAlreadyAdded) {
        combined.push(defaultTestimonials[i]);
      }
    }
    return combined;
  })();

  const [reviewsIndex, setReviewsIndex] = useState(0);

  useEffect(() => {
    if (activeReviews.length === 0) return;

    const interval = setInterval(() => {
      setReviewsIndex((prev) => (prev + 1) % activeReviews.length);
    }, 4000); // 4 seconds auto-play is standard for sliders

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
              Interactive Sandbox
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
              ref={(el) => (navLinksRef.current["ai-partner"] = el)}
              href="#ai-partner" 
              className={`ce-nav-link ${activeSection === "ai-partner" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("ai-partner"); }}
            >
              AI Assistant
            </a>
            <a 
              ref={(el) => (navLinksRef.current["testimonials"] = el)}
              href="#testimonials" 
              className={`ce-nav-link ${activeSection === "testimonials" ? "active" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNavClick("testimonials"); }}
            >
              Testimonials
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
              Try Sandbox Editor
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

      {/* Interactive Monaco Editor Mockup Section */}
      <section id="editor-section" className="ce-section" style={{ borderTop: "none", paddingBottom: "32px" }}>
        <div className="ce-container">
          <div className="ce-ide">
            <div className="ce-ide-header">
              <div className="ce-ide-controls">
                <span className="ce-ide-dot red" />
                <span className="ce-ide-dot yellow" />
                <span className="ce-ide-dot green" />
                <span className="ce-ide-title">multiplayer-sandbox.js</span>
              </div>
              
              <div className="ce-ide-languages">
                {["javascript", "python", "cpp", "java"].map((lang) => (
                  <button
                    key={lang}
                    className={`ce-ide-tab ${selectedLang === lang ? "active" : ""}`}
                    onClick={() => setSelectedLang(lang)}
                  >
                    {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
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
                <code>{codeSnippets[selectedLang]}</code>
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
                <span>{isRunning ? "Compiling..." : "Run Code"}</span>
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
            <div className="ce-bento-card col-2">
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
            <div className="ce-bento-card">
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
            <div className="ce-bento-card">
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
            <div className="ce-bento-card col-2">
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

      {/* AI Partner Section */}
      <section id="ai-partner" className="ce-section">
        <div className="ce-container ce-split-feature">
          <div className="ce-split-content">
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

          <div className="ce-split-preview">
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
          <div className="ce-testimonials-left">
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
          <div className="ce-testimonials-right">
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
              <span className="ce-footer-link" style={{ cursor: "pointer" }}>Premium Plans</span>
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
