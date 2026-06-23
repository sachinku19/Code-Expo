import { useState } from "react";
import { Sparkles, Send, Check } from "lucide-react";
import Logo from "../shared/Logo";
import "./Footer.css";

function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubscribed(true);
    setEmail("");
    setTimeout(() => {
      setIsSubscribed(false);
    }, 3000);
  };

  const handleScrollToTop = () => {
    const heroSection = document.getElementById("hero");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Logo size={32} showText={true} onClick={handleScrollToTop} />

          <p>
            High-performance multiplayer coding environments for developers, remote teams, and hackathons.
          </p>

          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <h4>Stay Updated</h4>
            <div className="newsletter-input-wrapper">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubscribed}
                required
              />
              <button type="submit" disabled={isSubscribed} aria-label="Subscribe">
                {isSubscribed ? <Check size={14} /> : <Send size={14} />}
              </button>
            </div>
            {isSubscribed && <span className="newsletter-success">Thanks for subscribing!</span>}
          </form>
        </div>

        <div className="footer-links">
          <div>
            <h4>Product</h4>
            <a href="#collaboration">Collaborative Editor</a>
            <a href="#ai">AI Copilot Pair</a>
            <a href="#demo">Compiler Sandbox</a>
            <a href="#features">Interactive Canvas</a>
          </div>

          <div>
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">API Runtimes</a>
            <a href="#">Developer Setup</a>
            <a href="#">Support Center</a>
          </div>

          <div>
            <h4>Community</h4>
            <a href="#">Discord Workspace</a>
            <a href="#">GitHub Project</a>
            <a href="#">Developer Forum</a>
            <a href="#">Twitter Feed</a>
          </div>

          <div>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Security Grid</a>
            <a href="#">Cookie Settings</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Code Expo. Built for modern builders. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
