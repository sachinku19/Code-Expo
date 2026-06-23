import { useState, useEffect, useRef } from "react";
import Navbar from "../components/navbar/Navbar";
import Hero from "../components/hero/Hero";
import TrustedTech from "../components/trusted/TrustedTech";
import Features from "../components/features/Features";
import CollaborationDemo from "../components/collaboration/CollaborationDemo";
import WhiteboardShowcase from "../components/collaboration/WhiteboardShowcase";
import AIShowcase from "../components/ai/AIShowcase";
import SocialHubShowcase from "../components/social/SocialHubShowcase";
import Stats from "../components/stats/Stats";
import Testimonials from "../components/testimonials/Testimonials";
import CTA from "../components/cta/CTA";
import Footer from "../components/footer/Footer";
import VideoShowcase from "../components/shared/VideoShowcase";
import VideoModal from "../components/shared/VideoModal";
import "./Home.css";


function Home() {
  const [activeSection, setActiveSection] = useState("hero");
  const [theme, setTheme] = useState("dark");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const isProgrammaticScrollRef = useRef(false);

  const handleScrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      isProgrammaticScrollRef.current = true;
      setActiveSection(id); // Instantly update active link style
      element.scrollIntoView({ behavior: "smooth", block: "start" });

      // Debounce window scroll events to detect when the smooth scroll has finished
      let scrollTimeout;
      const onScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
          window.removeEventListener("scroll", onScroll);
        }, 150);
      };
      window.addEventListener("scroll", onScroll);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("codeExpoHomeTheme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);



  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      localStorage.setItem("codeExpoHomeTheme", nextTheme);
      return nextTheme;
    });
  };

  useEffect(() => {
    const sections = ["hero", "demo", "features", "collaboration", "whiteboard", "ai", "social-hub"];
    
    const observerOptions = {
      root: null,
      rootMargin: "-40% 0px -50% 0px", // Trigger when the section occupies the center of the viewport
      threshold: 0,
    };

    const observerCallback = (entries) => {
      if (isProgrammaticScrollRef.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => {
      sections.forEach((id) => {
        const element = document.getElementById(id);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  return (
    <main className={`home-page ${theme === "light" ? "light-theme" : "dark-theme"}`}>
      <Navbar activeSection={activeSection} theme={theme} onThemeToggle={toggleTheme} onScrollToSection={handleScrollToSection} />
      
      <div id="hero">
        <Hero onWatchDemo={() => setIsVideoModalOpen(true)} />
      </div>
      
      <TrustedTech />

      <div id="demo">
        <VideoShowcase videoSrc="/make_it_more_convenience_and_m.mp4" onWatchDemo={() => setIsVideoModalOpen(true)} />
      </div>
      
      <div id="features">
        <Features />
      </div>
      
      <div id="collaboration">
        <CollaborationDemo />
      </div>

      <div id="whiteboard">
        <WhiteboardShowcase />
      </div>
      
      <div id="ai">
        <AIShowcase />
      </div>

      <div id="social-hub">
        <SocialHubShowcase />
      </div>
      
      <Stats />
      
      <Testimonials />
      
      <CTA />
      
      <Footer />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoSrc="/make_it_more_convenience_and_m.mp4"
      />
    </main>
  );
}

export default Home;
