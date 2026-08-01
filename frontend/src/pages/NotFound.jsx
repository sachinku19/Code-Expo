import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function NotFound() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const numVariants = {
    hidden: { 
      y: 80, 
      opacity: 0, 
      scale: 0.5, 
      rotate: -15 
    },
    visible: (i) => ({
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 12,
        delay: i * 0.25
      }
    }),
    hover: {
      scale: 1.15,
      y: -10,
      filter: "brightness(1.2)",
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.9, duration: 0.5, ease: "easeOut" }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { delay: 1.1, duration: 0.4, ease: "easeOut" }
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: isDark ? "#04040a" : "#f8fafc",
      color: isDark ? "#fff" : "#0f172a",
      fontFamily: "'Outfit', 'Inter', sans-serif",
      padding: "20px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background Glows */}
      <div style={{
        position: "absolute",
        width: "550px",
        height: "550px",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(0,0,0,0) 70%)",
        top: "15%",
        zIndex: 0,
        pointerEvents: "none"
      }} />

      {/* Cyber Grid Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: isDark
          ? "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)"
          : "linear-gradient(rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.02) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
        zIndex: 0,
        pointerEvents: "none"
      }} />

      {/* Container */}
      <div style={{ zIndex: 1, maxWidth: "600px" }}>
        
        {/* Animated Number Character Array */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "10px",
          marginBottom: "24px",
          userSelect: "none"
        }}>
          {["4", "0", "4"].map((char, index) => (
            <motion.span
              key={index}
              custom={index}
              variants={numVariants}
              initial="hidden"
              animate="visible"
              whileHover="hover"
              style={{
                fontSize: "10rem",
                fontWeight: "900",
                display: "inline-block",
                cursor: "pointer",
                lineHeight: "1",
                fontFamily: "'Outfit', sans-serif",
                background: index === 1
                  ? "linear-gradient(135deg, #00f0ff 0%, #0077ff 100%)" // Blue 0
                  : "linear-gradient(135deg, #aa3bff 0%, #ff0077 100%)", // Purple-Pink 4s
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: isDark 
                  ? `drop-shadow(0 8px 24px ${index === 1 ? "rgba(0, 240, 255, 0.3)" : "rgba(170, 59, 255, 0.3)"})`
                  : "none",
                letterSpacing: "-6px"
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* Details Section */}
        <motion.div
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <h2 style={{
            fontSize: "1.8rem",
            fontWeight: "800",
            margin: "0 0 12px 0",
            color: isDark ? "#f1f5f9" : "#0f172a",
            letterSpacing: "-0.5px"
          }}>
            Warp Coordinates Mismatched
          </h2>

          <p style={{
            fontSize: "0.96rem",
            lineHeight: "1.6",
            color: isDark ? "#94a3b8" : "#475569",
            marginBottom: "36px",
            padding: "0 40px"
          }}>
            The segment link or collaborative workspace page you requested does not exist on the node. Let's return to secure grid coordinates.
          </p>
        </motion.div>

        {/* Return buttons bar */}
        <motion.div
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: "flex",
            gap: "16px",
            justifyContent: "center"
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              color: isDark ? "#cbd5e1" : "#475569",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15, 23, 42, 0.12)",
              padding: "12px 24px",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.25s ease"
            }}
          >
            <ArrowLeft size={16} />
            <span>Go Back</span>
          </motion.button>

          <motion.button
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 0 25px rgba(170, 59, 255, 0.4)",
              background: "linear-gradient(135deg, #b94eff 0%, #aa3bff 100%)"
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #aa3bff 0%, #8b25d2 100%)",
              color: "#fff",
              border: "none",
              padding: "12px 26px",
              borderRadius: "12px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.9rem",
              boxShadow: "0 6px 20px rgba(170, 59, 255, 0.25)",
              transition: "all 0.25s ease"
            }}
          >
            <Home size={16} />
            <span>Return Home</span>
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}