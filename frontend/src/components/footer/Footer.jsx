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
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="#ai">AI Assistant</a>
            <a href="#collaboration">Multiplayer</a>
          </div>

          <div>
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">Release Notes</a>
            <a href="#">API Runtimes</a>
            <a href="#">Support Help</a>
          </div>

          <div>
            <h4>Community</h4>
            <a href="#">Discord Server</a>
            <a href="#">GitHub Repo</a>
            <a href="#">Twitter Feed</a>
            <a href="#">YouTube Channel</a>
          </div>

          <div>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Cookie settings</a>
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
