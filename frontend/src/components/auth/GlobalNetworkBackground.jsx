import React, { useEffect, useRef } from "react";

const GlobalNetworkBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 1. Generate 3D global developer nodes grouped into Left and Right hubs
    const nodesCount = 46;
    const nodes = [];
    for (let i = 0; i < nodesCount; i++) {
      const hub = i < 23 ? "left" : "right";
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      // Make radius compact so hubs stay grouped on screen edges
      const radius = Math.random() * 55 + 50; // between 50 and 105
      nodes.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        hub,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseVal: Math.random() * Math.PI,
        size: Math.random() * 1.5 + 1.0
      });
    }

    // 2. Generate local links inside each hub, and long inter-hub links bridging them
    const links = [];
    const localThreshold = 95;
    
    // Local connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].hub === nodes[j].hub) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < localThreshold) {
            links.push({ from: i, to: j, dist, isInterHub: false });
          }
        }
      }
    }

    // Inter-hub connections (bridge lines passing behind the central card)
    const interHubCount = 8;
    for (let k = 0; k < interHubCount; k++) {
      const leftIdx = Math.floor(Math.random() * 23);
      const rightIdx = 23 + Math.floor(Math.random() * 23);
      links.push({ from: leftIdx, to: rightIdx, dist: 600, isInterHub: true });
    }

    // 3. Generate packets traveling along links (collaboration flows)
    const packetsCount = 14;
    const packets = [];
    for (let i = 0; i < packetsCount; i++) {
      if (links.length > 0) {
        // Distribute packets on both local and inter-hub links
        packets.push({
          linkIdx: Math.floor(Math.random() * links.length),
          progress: Math.random(),
          speed: Math.random() * 0.005 + 0.002
        });
      }
    }

    const d = 260; // projection distance

    const draw = () => {
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Parallax damping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const parallaxX = mouseRef.current.x * 35;
      const parallaxY = mouseRef.current.y * 35;

      // Position the left and right hubs on screen margins
      const cxLeft = width * 0.16 + parallaxX;
      const cxRight = width * 0.84 + parallaxX;
      const cy = height / 2 + parallaxY;

      // Clear screen
      ctx.fillStyle = "#030303";
      ctx.fillRect(0, 0, width, height);

      // Re-draw subtle grid overlay
      ctx.strokeStyle = "rgba(255, 255, 255, 0.006)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      const gridSpacing = 60;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const time = Date.now() * 0.0002;
      
      // Rotation and Zoom scaling
      const rotY = time * 0.35;
      const rotX = time * 0.15;
      const zoomScale = 1.0 + Math.sin(time * 0.8) * 0.22;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      // Project vertices to 2D
      const projected = nodes.map((node) => {
        // Rotate Y
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.x * sinY + node.z * cosY;

        // Rotate X
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = node.y * sinX + z1 * cosX;

        // Perspective scale with camera zoom
        const scale = (d * zoomScale) / (d + z2);
        
        // Render relative to their respective left/right edge centers
        const cxHub = node.hub === "left" ? cxLeft : cxRight;
        
        return {
          sx: cxHub + x1 * scale,
          sy: cy + y2 * scale,
          sz: z2,
          scale: scale,
          pulse: Math.sin(node.pulseVal) * 0.25 + 1.0,
          hub: node.hub
        };
      });

      // Update node pulses
      nodes.forEach((node) => {
        node.pulseVal += node.pulseSpeed;
      });

      // 4. Draw connection links
      links.forEach((link) => {
        const p1 = projected[link.from];
        const p2 = projected[link.to];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.sx, p1.sy);
          ctx.lineTo(p2.sx, p2.sy);
          
          if (link.isInterHub) {
            // Glowing cross-screen lines connecting left and right hubs behind the card
            ctx.strokeStyle = "rgba(0, 210, 255, 0.12)";
            ctx.lineWidth = 0.85;
          } else {
            // Local regional hub links
            ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
            ctx.lineWidth = 0.7;
          }
          ctx.stroke();
        }
      });

      // 5. Draw active collaboration packets traveling
      packets.forEach((packet) => {
        const link = links[packet.linkIdx];
        if (!link) return;
        const p1 = projected[link.from];
        const p2 = projected[link.to];
        if (p1 && p2) {
          const t = packet.progress;
          const px = p1.sx * (1 - t) + p2.sx * t;
          const py = p1.sy * (1 - t) + p2.sy * t;
          
          // Packet glow gradient color
          ctx.fillStyle = link.isInterHub ? "#00ffcc" : "#00d2ff";
          ctx.beginPath();
          ctx.arc(px, py, 1.8, 0, Math.PI * 2);
          ctx.fill();

          packet.progress += packet.speed;
          if (packet.progress >= 1.0) {
            packet.progress = 0;
            packet.linkIdx = Math.floor(Math.random() * links.length);
            packet.speed = Math.random() * 0.005 + 0.002;
          }
        }
      });

      // 6. Draw glowing nodes
      projected.forEach((pt) => {
        const depthAlpha = Math.max(0.08, 1 - (pt.sz + 180) / 360);
        
        // Node color depending on left/right hub
        const nodeColor = pt.hub === "left" ? "rgba(99, 102, 241," : "rgba(0, 210, 255,";
        
        ctx.fillStyle = `${nodeColor}${depthAlpha * 0.35})`; 
        ctx.beginPath();
        const r = pt.scale * 1.5 * pt.pulse;
        ctx.arc(pt.sx, pt.sy, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${depthAlpha * 0.8})`; // White core
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, Math.max(0.2, r * 0.3), 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="global-network-canvas"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 1,
        pointerEvents: "none"
      }}
    />
  );
};

export default GlobalNetworkBackground;
