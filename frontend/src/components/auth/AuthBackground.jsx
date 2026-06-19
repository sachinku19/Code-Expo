import React, { useEffect, useRef } from "react";
import "./AuthBackground.css";

const AuthBackground = ({ theme = "dark" }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Track mouse coordinates for parallax
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isLightTheme = theme === "light";
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Use parent container bounding box rather than absolute window sizes
    const parent = canvas.parentElement;
    let width = (canvas.width = parent && parent.clientWidth > 0 ? parent.clientWidth : 450);
    let height = (canvas.height = parent && parent.clientHeight > 0 ? parent.clientHeight : 560);

    // 3D Projection parameters - Centered & Enlarged Globe
    let R = Math.min(width, height) * 0.36;
    let d = R * 2.3;
    let rotateY = 0;
    let rotateX = 0.28;

    const handleResize = () => {
      if (!canvas) return;
      const p = canvas.parentElement;
      width = canvas.width = p && p.clientWidth > 0 ? p.clientWidth : 450;
      height = canvas.height = p && p.clientHeight > 0 ? p.clientHeight : 560;
      R = Math.min(width, height) * 0.36;
      d = R * 2.3;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Generate Globe Grid Vertices
    const globePoints = [];
    const latLines = 20;
    const lngLines = 24;

    for (let i = 0; i <= latLines; i++) {
      const theta = (i * Math.PI) / latLines;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let j = 0; j < lngLines; j++) {
        const phi = (j * 2 * Math.PI) / lngLines;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        globePoints.push({
          baseX: R * sinTheta * cosPhi,
          baseY: R * cosTheta,
          baseZ: R * sinTheta * sinPhi,
        });
      }
    }

    // Stars background
    const starCount = 80;
    const stars = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.04 + 0.01,
      });
    }

    // Matrix-style vertical code rain columns
    const colCount = Math.max(15, Math.floor(width / 40));
    const rainColumns = [];
    for (let i = 0; i < colCount; i++) {
      rainColumns.push({
        x: i * 40 + Math.random() * 20,
        y: Math.random() * height - height,
        speed: Math.random() * 1.5 + 0.8,
        chars: Array.from({ length: Math.floor(Math.random() * 8) + 6 }, () => 
          Math.random() > 0.5 ? "1" : "0"
        ),
        opacity: Math.random() * 0.12 + 0.03
      });
    }

    // Active network arcs
    const networkArcs = [];
    const maxArcs = 5;
    for (let i = 0; i < maxArcs; i++) {
      networkArcs.push(createNewArc(i));
    }

    function createNewArc(idx) {
      const index = idx !== undefined ? idx : Math.floor(Math.random() * 100);
      const p1Idx = Math.floor(Math.random() * globePoints.length);
      let p2Idx = Math.floor(Math.random() * globePoints.length);
      while (p1Idx === p2Idx) {
        p2Idx = Math.floor(Math.random() * globePoints.length);
      }
      
      const arcColor = isLightTheme
        ? (index % 2 === 0 ? "rgba(99, 102, 241," : "rgba(6, 182, 212,")
        : (index % 2 === 0 ? "rgba(56, 189, 248," : "rgba(167, 139, 250,");

      return {
        p1Idx,
        p2Idx,
        progress: 0,
        speed: Math.random() * 0.007 + 0.003,
        color: arcColor,
      };
    }

    // Collaborative mock cursors moving around the sphere
    const cursors = [
      { name: "Sarah_Dev", color: "#38bdf8", angle: 0, targetAngle: 0, lat: Math.PI / 4, currentX: 0, currentY: 0 },
      { name: "John_X", color: "#a78bfa", angle: Math.PI / 3, targetAngle: Math.PI / 3, lat: Math.PI / 2, currentX: 0, currentY: 0 },
      { name: "AI_Agent", color: "#4ade80", angle: -Math.PI / 6, targetAngle: -Math.PI / 6, lat: Math.PI / 3, currentX: 0, currentY: 0 },
    ];

    // Holographic grid base disc configurations
    const basePy = R * 0.95;
    const baseRingRadii = [R * 1.15, R * 1.3, R * 1.45, R * 1.6];

    // ----------------------------------------------------
    // Animation rendering loop
    // ----------------------------------------------------
    const draw = () => {
      // Safety check for width/height bounds
      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // Smooth mouse parallax damping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const parallaxX = mouseRef.current.x * 20;
      const parallaxY = mouseRef.current.y * 20;

      // Perfectly centered horizontally and vertically
      const cx = width / 2 + parallaxX;
      const cy = height / 2 + parallaxY;

      // Clear with theme-specific radial gradient
      if (isLightTheme) {
        const bgGrad = ctx.createRadialGradient(
          cx,
          height / 2,
          20,
          cx,
          height / 2,
          width * 0.75
        );
        bgGrad.addColorStop(0, "#ffffff");
        bgGrad.addColorStop(1, "#f1f5f9");
        ctx.fillStyle = bgGrad;
      } else {
        const bgGrad = ctx.createRadialGradient(
          cx,
          height / 2,
          20,
          cx,
          height / 2,
          width * 0.7
        );
        bgGrad.addColorStop(0, "#080710");
        bgGrad.addColorStop(1, "#030303");
        ctx.fillStyle = bgGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Space Stars
      stars.forEach((star) => {
        ctx.fillStyle = isLightTheme
          ? `rgba(71, 85, 105, ${star.alpha * 0.25})`
          : `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        const sX = (star.x + mouseRef.current.x * 8 + width) % width;
        const sY = (star.y + mouseRef.current.y * 8 + height) % height;
        ctx.arc(sX, sY, star.r, 0, Math.PI * 2);
        ctx.fill();

        star.alpha += star.speed;
        if (star.alpha > 0.95 || star.alpha < 0.15) {
          star.speed = -star.speed;
        }
      });

      // 2. Draw Code Rain Columns (falling Matrix vertical streams)
      ctx.font = "9px monospace";
      rainColumns.forEach((col) => {
        for (let j = 0; j < col.chars.length; j++) {
          const charY = col.y - j * 14;
          if (charY > 0 && charY < height) {
            const alpha = col.opacity * (1 - j / col.chars.length);
            if (j === 0) {
              // Bright glowing head character
              ctx.fillStyle = isLightTheme
                ? `rgba(99, 102, 241, ${col.opacity * 2.2})`
                : `rgba(255, 255, 255, ${col.opacity * 2.0})`;
            } else {
              // Fading cyan trail character
              ctx.fillStyle = isLightTheme
                ? `rgba(99, 102, 241, ${alpha * 0.4})`
                : `rgba(6, 182, 212, ${alpha})`;
            }
            ctx.fillText(col.chars[j], col.x + parallaxX * 0.2, charY);
          }
        }
        col.y += col.speed;
        if (col.y - col.chars.length * 14 > height) {
          col.y = -20;
          col.speed = Math.random() * 1.5 + 0.8;
          col.x = Math.random() * width;
        }
      });

      // Apply rotation speeds
      rotateY += 0.0015;

      const currentRotateY = rotateY + mouseRef.current.x * 0.15;
      const currentRotateX = rotateX + mouseRef.current.y * 0.15;

      const sinRotY = Math.sin(currentRotateY);
      const cosRotY = Math.cos(currentRotateY);
      const sinRotX = Math.sin(currentRotateX);
      const cosRotX = Math.cos(currentRotateX);

      // Map globe vertices to 2D screen projection
      const projectedPoints = globePoints.map((pt) => {
        // Rotate Y
        let x1 = pt.baseX * cosRotY - pt.baseZ * sinRotY;
        let z1 = pt.baseX * sinRotY + pt.baseZ * cosRotY;

        // Rotate X
        let y2 = pt.baseY * cosRotX - z1 * sinRotX;
        let z2 = pt.baseY * sinRotX + z1 * cosRotX;

        const scale = d / (d + z2);
        return {
          sx: cx + x1 * scale,
          sy: cy + y2 * scale,
          sz: z2,
          scale: scale,
          visible: z2 < R * 0.6,
        };
      });

      // 3. Draw Holographic Base Disc Grid (Futuristic concentric console)
      ctx.strokeStyle = isLightTheme ? "rgba(99, 102, 241, 0.08)" : "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1.0;
      
      baseRingRadii.forEach((radius, ringIdx) => {
        ctx.beginPath();
        // Setup alternating dashed patterns rotating in opposite directions
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -Date.now() * 0.03 * (ringIdx % 2 === 0 ? 1 : -1);

        const steps = 72;
        for (let i = 0; i <= steps; i++) {
          const angle = (i * 2 * Math.PI) / steps;
          let bx = radius * Math.cos(angle);
          let bz = radius * Math.sin(angle);
          let by = basePy;

          // Rotate around Y and X axes
          let x1 = bx * cosRotY - bz * sinRotY;
          let z1 = bx * sinRotY + bz * cosRotY;
          let y2 = by * cosRotX - z1 * sinRotX;
          let z2 = by * sinRotX + z1 * cosRotX;

          const scale = d / (d + z2);
          const sx = cx + x1 * scale;
          const sy = cy + y2 * scale;

          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      });

      // Reset dashed lines for radial connectors
      ctx.setLineDash([]);
      
      ctx.beginPath();
      const radialLinesCount = 12;
      for (let i = 0; i < radialLinesCount; i++) {
        const angle = (i * 2 * Math.PI) / radialLinesCount;
        const rStart = R;
        const rEnd = R * 1.6;

        let bx1 = rStart * Math.cos(angle);
        let bz1 = rStart * Math.sin(angle);
        let x1_1 = bx1 * cosRotY - bz1 * sinRotY;
        let z1_1 = bx1 * sinRotY + bz1 * cosRotY;
        let y2_1 = basePy * cosRotX - z1_1 * sinRotX;
        let z2_1 = basePy * sinRotX + z1_1 * cosRotX;
        const scale1 = d / (d + z2_1);
        const sx1 = cx + x1_1 * scale1;
        const sy1 = cy + y2_1 * scale1;

        let bx2 = rEnd * Math.cos(angle);
        let bz2 = rEnd * Math.sin(angle);
        let x1_2 = bx2 * cosRotY - bz2 * sinRotY;
        let z1_2 = bx2 * sinRotY + bz2 * cosRotY;
        let y2_2 = basePy * cosRotX - z1_2 * sinRotX;
        let z2_2 = basePy * sinRotX + z1_2 * cosRotX;
        const scale2 = d / (d + z2_2);
        const sx2 = cx + x1_2 * scale2;
        const sy2 = cy + y2_2 * scale2;

        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
      }
      ctx.stroke();

      // 4. Draw Orbit Track (Satellites)
      const orbitColors = isLightTheme
        ? ["rgba(99, 102, 241, 0.12)", "rgba(6, 182, 212, 0.12)"]
        : ["rgba(99, 102, 241, 0.07)", "rgba(6, 182, 212, 0.07)"];
      const ringRadii = [R * 1.35, R * 1.6];
      const ringTiltX = [0.6, -0.4];

      ringRadii.forEach((radius, ringIdx) => {
        ctx.beginPath();
        const steps = 90;
        const tiltX = ringTiltX[ringIdx];

        for (let i = 0; i <= steps; i++) {
          const angle = (i * 2 * Math.PI) / steps;
          let rx = radius * Math.cos(angle);
          let ry = radius * Math.sin(angle) * Math.sin(tiltX);
          let rz = radius * Math.sin(angle) * Math.cos(tiltX);

          // Apply rotation
          let rxRot = rx * cosRotY - rz * sinRotY;
          let rzRot = rx * sinRotY + rz * cosRotY;
          let ryTilt = ry * cosRotX - rzRot * sinRotX;
          let rzTilt = ry * sinRotX + rzRot * cosRotX;

          const scale = d / (d + rzTilt);
          const rsx = cx + rxRot * scale;
          const rsy = cy + ryTilt * scale;

          if (i === 0) ctx.moveTo(rsx, rsy);
          else ctx.lineTo(rsx, rsy);
        }

        ctx.strokeStyle = orbitColors[ringIdx];
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Draw node pulse along orbit
        const ringTime = Date.now() * 0.0005 + ringIdx * Math.PI;
        let pulseX = radius * Math.cos(ringTime);
        let pulseY = radius * Math.sin(ringTime) * Math.sin(tiltX);
        let pulseZ = radius * Math.sin(ringTime) * Math.cos(tiltX);

        let pxRot = pulseX * cosRotY - pulseZ * sinRotY;
        let pzRot = pulseX * sinRotY + pulseZ * cosRotY;
        let pyTilt = pulseY * cosRotX - pzRot * sinRotX;
        let pzTilt = pulseY * sinRotX + pzRot * cosRotX;

        const pScale = d / (d + pzTilt);
        const psx = cx + pxRot * pScale;
        const psy = cy + pyTilt * pScale;

        const glowGrad = ctx.createRadialGradient(psx, psy, 0, psx, psy, 6);
        glowGrad.addColorStop(0, ringIdx === 0 ? "#6366f1" : "#06b6d4");
        glowGrad.addColorStop(1, "transparent");
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(psx, psy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = ringIdx === 0 ? "#818cf8" : "#22d3ee";
        ctx.beginPath();
        ctx.arc(psx, psy, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Globe Nodes with Pulsing sizes
      projectedPoints.forEach((pt) => {
        if (!pt.visible) return;

        const depthAlpha = Math.max(0.04, 1 - (pt.sz + R) / (2 * R));
        ctx.fillStyle = `rgba(99, 102, 241, ${depthAlpha * 0.5})`;
        ctx.beginPath();
        
        // Add subtle breathing pulse to nodes
        const pulseRatio = 1 + Math.sin(Date.now() * 0.003 + pt.sx) * 0.08;
        const dotRadius = Math.max(0.5, pt.scale * 1.2) * pulseRatio;
        
        ctx.arc(pt.sx, pt.sy, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing node peaks
        if (pt.sz < -R * 0.75) {
          ctx.fillStyle = `rgba(56, 189, 248, ${depthAlpha * 0.2})`;
          ctx.beginPath();
          ctx.arc(pt.sx, pt.sy, dotRadius * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 6. Draw Connection lines
      networkArcs.forEach((arc, arcIdx) => {
        const pt1 = projectedPoints[arc.p1Idx];
        const pt2 = projectedPoints[arc.p2Idx];

        if (pt1 && pt2 && pt1.visible && pt2.visible) {
          const mx = (pt1.sx + pt2.sx) / 2;
          const my = (pt1.sy + pt2.sy) / 2;

          const dx = pt2.sx - pt1.sx;
          const dy = pt2.sy - pt1.sy;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = -dy / len;
          const ny = dx / len;
          const displacement = len * 0.2;

          const ctrlX = mx + nx * displacement;
          const ctrlY = my + ny * displacement;

          const avgDepth = (pt1.sz + pt2.sz) / 2;
          const arcAlpha = Math.max(0.0, 1 - (avgDepth + R) / (2 * R)) * 0.35;

          ctx.beginPath();
          ctx.moveTo(pt1.sx, pt1.sy);
          ctx.quadraticCurveTo(ctrlX, ctrlY, pt2.sx, pt2.sy);
          ctx.strokeStyle = `${arc.color}${arcAlpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Render curve pulse dot
          const t = arc.progress;
          const pulseX = (1 - t) * (1 - t) * pt1.sx + 2 * (1 - t) * t * ctrlX + t * t * pt2.sx;
          const pulseY = (1 - t) * (1 - t) * pt1.sy + 2 * (1 - t) * t * ctrlY + t * t * pt2.sy;

          ctx.fillStyle = arcIdx % 2 === 0 ? "#38bdf8" : "#c084fc";
          ctx.beginPath();
          ctx.arc(pulseX, pulseY, 1.8, 0, Math.PI * 2);
          ctx.fill();

          arc.progress += arc.speed;
          if (arc.progress >= 1.0) {
            networkArcs[arcIdx] = createNewArc(arcIdx);
          }
        } else {
          networkArcs[arcIdx] = createNewArc(arcIdx);
        }
      });

      // 7. Draw Collaborative Cursors
      cursors.forEach((cur) => {
        if (Math.random() < 0.02) {
          cur.targetAngle = cur.angle + (Math.random() - 0.5) * 0.5;
          cur.lat = Math.max(Math.PI * 0.3, Math.min(Math.PI * 0.7, cur.lat + (Math.random() - 0.5) * 0.3));
        }

        cur.angle += (cur.targetAngle - cur.angle) * 0.03;

        const sTheta = Math.sin(cur.lat);
        const cTheta = Math.cos(cur.lat);
        const sPhi = Math.sin(cur.angle);
        const cPhi = Math.cos(cur.angle);

        let cx3d = R * sTheta * cPhi;
        let cy3d = R * cTheta;
        let cz3d = R * sTheta * sPhi;

        let rx = cx3d * cosRotY - cz3d * sinRotY;
        let rz = cx3d * sinRotY + cz3d * cosRotY;
        let ry = cy3d * cosRotX - rz * sinRotX;
        let rzFinal = cy3d * sinRotX + rz * cosRotX;

        if (rzFinal > R * 0.4) return;

        const scale = d / (d + rzFinal);
        const sx = cx + rx * scale;
        const sy = cy + ry * scale;

        cur.currentX += (sx - cur.currentX) * 0.15;
        cur.currentY += (sy - cur.currentY) * 0.15;

        // Pointer
        ctx.fillStyle = cur.color;
        ctx.beginPath();
        ctx.moveTo(cur.currentX, cur.currentY);
        ctx.lineTo(cur.currentX + 9, cur.currentY + 3);
        ctx.lineTo(cur.currentX + 3, cur.currentY + 9);
        ctx.closePath();
        ctx.fill();

        // User Label Tag
        ctx.fillStyle = isLightTheme ? "rgba(255, 255, 255, 0.95)" : "rgba(8, 8, 12, 0.9)";
        ctx.strokeStyle = isLightTheme ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;

        const textWidth = ctx.measureText(cur.name).width;
        const rectW = textWidth + 12;
        const rectH = 15;
        const rxOffset = cur.currentX + 7;
        const ryOffset = cur.currentY + 7;

        ctx.beginPath();
        ctx.roundRect(rxOffset, ryOffset, rectW, rectH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isLightTheme ? "#0f172a" : "#ffffff";
        ctx.font = "8px Inter, system-ui, sans-serif";
        ctx.fillText(cur.name, rxOffset + 6, ryOffset + 10.5);
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="auth-bg-viewport">
      {/* 3D Visualizer Canvas */}
      <canvas ref={canvasRef} className="auth-3d-canvas" />

      {/* Grid overlay */}
      <div className="cyber-grid-overlay" />

      {/* Cyber neons */}
      <div className="neon-beam beam-blue" />
      <div className="neon-beam beam-indigo" />
      <div className="neon-beam beam-cyan" />
      <div className="neon-beam beam-purple" />

      {/* Side Glowing Syntax Symbols exactly like the reference image */}
      <div className="floating-symbols-wrapper">
        <div className="developer-symbol symbol-left glowing-bracket">&lt;/&gt;</div>
        <div className="developer-symbol symbol-right glowing-braces">&#123; &#125;</div>
      </div>
    </div>
  );
};

export default AuthBackground;
