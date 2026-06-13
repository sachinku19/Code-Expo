import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { ArrowRight, Play, Radio, ShieldCheck, Terminal, Zap, Code } from "lucide-react";
import FloatingOrb from "../shared/FloatingOrb";
import "./Hero.css";
import { getCountUser, getPublicStats } from "../../services/authService";
import CountUpModule from "react-countup";

const CountUp = CountUpModule.default || CountUpModule;

function Hero({ onWatchDemo }) {
 
    const navigate=useNavigate()


  // =====================  
 //total user on website
 //==========================

  const [totalUser, setTotalUser] = useState(0);
  const [dbStats, setDbStats] = useState({ developers: 0, rooms: 0, messages: 0 });

  useEffect(()=>{
    const totalUserCount=async()=>{

      try{
        const data=await getCountUser();
        setTotalUser(data.userCount);

      }catch(error){
        console.log(error);
      }
      
    }
    totalUserCount();
  },[]);

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


  const [selectedLang, setSelectedLang] = useState("javascript");
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [showTerminal, setShowTerminal] = useState(false);

  const codeSnippets = {
    javascript: `// Real-time Collaborative Code Sharing
const session = {
  room: "Code Expo multiplayer",
  users: ["Sachin", "Aman", "You"],
  active: true
};

console.log(\`Connected to \${session.room}!\`);
console.log("Ready to build faster together.");`,
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
    javascript: `[Running] node index.js\nConnected to Code Expo multiplayer!\nReady to build faster together.\n\n[Done] exited with code 0 in 0.12s`,
    python: `[Running] python main.py\nSpinning up secure Docker container...\nUser connected: Sachin\nUser connected: Aman\nUser connected: You\n\n[Done] exited with code 0 in 0.28s`,
    cpp: `[Running] g++ main.cpp && ./a.out\nRoom state synchronized.\nAverage ping: 12ms\n\n[Done] exited with code 0 in 0.45s`,
    java: `[Running] javac Sandbox.java && java Sandbox\nMultiplexer channel opened...\nStatus: Live sync active.\n\n[Done] exited with code 0 in 0.62s`
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setShowTerminal(true);
    setTerminalOutput("Initializing compiler sandbox...");
    
    setTimeout(() => {
      setTerminalOutput(outputs[selectedLang]);
      setIsRunning(false);
    }, 1200);
  };

  // Change terminal output when language changes, but hide terminal until they run
  useEffect(() => {
    setShowTerminal(false);
  }, [selectedLang]);

  return (
    <section className="hero">
      <FloatingOrb size="400px" top="5%" left="-5%" />
      <FloatingOrb size="450px" top="40%" left="75%" />

      <div className="hero-grid-bg"></div>

      <div className="hero-left">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="live-users"
        >
          <span className="live-pulse"></span>
          <Radio size={14} className="live-icon" />
          <span>{totalUser} developers coding right now</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Code Together.
          <br />
          Build Faster.
          <br />
          <span className="gradient-text">
            <TypeAnimation
              sequence={[
                "Ship Smarter",
                2000,
                "Collaborate Better",
                2000,
                "Create Faster",
                2000,
              ]}
              repeat={Infinity}
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Real-time collaborative coding platform with live editing, chat, video
          calls, AI assistance, and instant code execution.
        </motion.p>

        <motion.div
          className="hero-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <button className="cta-primary" onClick={() => navigate("/register")}>
              Create Workspace
              <ArrowRight size={18} />
            </button>

          <button className="secondary-btn" onClick={onWatchDemo}>
            <Play size={17} />
            Watch Demo
          </button>
        </motion.div>

        <motion.div
          className="hero-trust-row"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <span>
            <ShieldCheck size={16} className="text-cyan" />
            Secure sandbox rooms
          </span>
          <span>
            <Zap size={16} className="text-purple" />
            Instant runs
          </span>
        </motion.div>

        <div className="hero-stats">
          <div>
            <h3>
              <CountUp
                end={dbStats.developers || 0}
                duration={2.5}
                separator=","
                enableScrollSpy={true}
                scrollSpyOnce={true}
              />
            </h3>
            <span>Developers</span>
          </div>

          <div>
            <h3>
              <CountUp
                end={dbStats.rooms || 0}
                duration={2.5}
                separator=","
                enableScrollSpy={true}
                scrollSpyOnce={true}
              />
            </h3>
            <span>Rooms</span>
          </div>

          <div>
            <h3>
              <CountUp
                end={dbStats.executions || 0}
                duration={2.5}
                separator=","
                enableScrollSpy={true}
                scrollSpyOnce={true}
              />
            </h3>
            <span>Executions</span>
          </div>
        </div>
      </div>

      <div className="hero-right">
        <motion.div
          className="editor-preview"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <div className="preview-glow"></div>

          {/* IDE Header */}
          <div className="editor-topbar">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <span className="room-name">collaborative-sandbox</span>
            <div className="lang-selector">
              {["javascript", "python", "cpp", "java"].map((lang) => (
                <button
                  key={lang}
                  className={`lang-tab ${selectedLang === lang ? "active" : ""}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  {lang === "cpp" ? "C++" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            <span className="run-status">Online</span>
          </div>

          {/* Code Window */}
          <div className="editor-code-container">
            <pre className="code-preview">
              <code>{codeSnippets[selectedLang]}</code>
            </pre>

            {/* Simulating active typing indicator */}
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
              Aman is typing...
            </div>

            {/* Simulating user cursors */}
            <div className="cursor cursor1">Sachin</div>
            <div className="cursor cursor2">Aman</div>
            <div className="cursor cursor3">You</div>
          </div>

          {/* Run Panel & Terminals */}
          <div className="editor-actions">
            <button 
              className={`run-btn ${isRunning ? "running" : ""}`} 
              onClick={handleRunCode}
              disabled={isRunning}
            >
              <Code size={16} />
              <span>{isRunning ? "Compiling..." : "Run Code"}</span>
            </button>
          </div>

          <AnimatePresence>
            {showTerminal && (
              <motion.div
                className="terminal-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="terminal-header">
                  <Terminal size={14} />
                  <span>Output Terminal</span>
                </div>
                <pre className="terminal-content">{terminalOutput}</pre>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
