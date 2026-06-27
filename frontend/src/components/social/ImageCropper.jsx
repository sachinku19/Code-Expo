import { useState, useRef, useEffect } from "react";
import { RotateCw, Check, X, Sliders, Sun, Contrast, Eye } from "lucide-react";
import { motion } from "framer-motion";

export default function ImageCropper({ imageSrc, onCropComplete, onCancel, aspect = 1.2 }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("crop"); // "crop" or "adjust"
  
  // Dynamic resizable crop box state
  const [boxWidth, setBoxWidth] = useState(250);
  
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  // Mouse / Touch drag handlers to position image inside crop box
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Resizing state references
  const isResizing = useRef(false);
  const resizeStart = useRef({ centerX: 0, centerY: 0, startDist: 1, startWidth: 250 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    startPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    startPos.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
  };

  // Corner resize starter helpers
  const startResizeGesture = (clientX, clientY) => {
    isResizing.current = true;
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const startDist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2)) || 1;
    
    resizeStart.current = {
      centerX,
      centerY,
      startDist,
      startWidth: boxWidth
    };
  };

  const handleCornerMouseDown = (e, corner) => {
    e.stopPropagation();
    e.preventDefault();
    startResizeGesture(e.clientX, e.clientY);
  };

  const handleCornerTouchStart = (e, corner) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    startResizeGesture(e.touches[0].clientX, e.touches[0].clientY);
  };

  // Mouse wheel zoom support
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom((prev) => {
      const newZoom = prev - e.deltaY * 0.0015;
      return Math.min(Math.max(newZoom, 1), 3.5);
    });
  };

  // Bind mouse wheel listener on viewport element
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  // Window-level events listener for fluid dragging/resizing
  useEffect(() => {
    const handleGlobalMove = (e) => {
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      if (isResizing.current) {
        const { centerX, centerY, startDist, startWidth } = resizeStart.current;
        const currentDist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
        
        let newWidth = startWidth * (currentDist / startDist);
        
        // Constrain box size within container bounds
        const containerWidth = containerRef.current ? containerRef.current.clientWidth : 400;
        const containerHeight = containerRef.current ? containerRef.current.clientHeight : 260;
        
        const maxWidth = Math.min(containerWidth - 40, (containerHeight - 40) * aspect);
        const minWidth = 80;
        
        newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
        setBoxWidth(newWidth);
      } else if (isDragging.current) {
        const newX = clientX - startPos.current.x;
        const newY = clientY - startPos.current.y;
        setOffset({ x: newX, y: newY });
      }
    };

    const handleGlobalUp = () => {
      isResizing.current = false;
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalMove, { passive: false });
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [boxWidth, aspect]);

  const cropImage = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    const cropWidth = 720;
    const cropHeight = cropWidth / aspect;
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply brightness and contrast filters onto canvas
    if (ctx.filter !== undefined) {
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    }

    // Move origins to canvas center
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Map screen coordinates to high-res canvas coordinates
    const scaleRatio = canvas.width / boxWidth;
    
    // Get display sizes of image
    const displayWidth = img.clientWidth || img.width || 300;
    const displayHeight = img.clientHeight || img.height || 200;
    
    const drawWidth = displayWidth * zoom * scaleRatio;
    const drawHeight = displayHeight * zoom * scaleRatio;

    const dx = offset.x * scaleRatio;
    const dy = offset.y * scaleRatio;

    ctx.drawImage(
      img,
      -drawWidth / 2 + dx,
      -drawHeight / 2 + dy,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], "cropped_image.jpg", { type: "image/jpeg" });
        const croppedUrl = URL.createObjectURL(blob);
        onCropComplete(croppedFile, croppedUrl);
      }
    }, "image/jpeg", 0.92);
  };

  // Dimensions of crop boundary guide box
  const cropBoxHeight = boxWidth / aspect;

  return (
    <div className="ce-modal-overlay" style={{ zIndex: 10025, background: "rgba(5, 5, 10, 0.85)" }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="ce-modal-card"
        style={{ maxWidth: "440px", width: "90%", padding: "20px", border: "1px solid var(--ce-premium-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h4 style={{ margin: 0, color: "var(--ce-premium-text)", fontSize: "1rem", fontWeight: "700" }}>Advanced Image Editor</h4>
          <button style={{ background: "none", border: "none", color: "var(--ce-premium-muted)", cursor: "pointer" }} onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Adjust tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "12px", background: "rgba(255,255,255,0.03)", padding: "4px", borderRadius: "8px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("crop")}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === "crop" ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === "crop" ? "var(--ce-premium-text)" : "var(--ce-premium-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}
          >
            <Eye size={13} /> Crop Viewport
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("adjust")}
            style={{
              flex: 1,
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              border: "none",
              background: activeTab === "adjust" ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === "adjust" ? "var(--ce-premium-text)" : "var(--ce-premium-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px"
            }}
          >
            <Sliders size={13} /> Color Adjust
          </button>
        </div>

        {/* Interactive Viewport container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            position: "relative",
            width: "100%",
            height: "260px",
            background: "#08080c",
            overflow: "hidden",
            borderRadius: "8px",
            cursor: "move",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {/* Crop Boundary Indicator Box with Photoshop style grid & corners */}
          <div
            style={{
              position: "absolute",
              width: `${boxWidth}px`,
              height: `${cropBoxHeight}px`,
              border: "1.5px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
              pointerEvents: "none",
              zIndex: 3
            }}
          >
            {/* Rule of Thirds grid layout */}
            <div style={{ position: "absolute", top: 0, left: "33.33%", width: "1px", height: "100%", borderLeft: "1px dashed rgba(255,255,255,0.2)" }} />
            <div style={{ position: "absolute", top: 0, left: "66.66%", width: "1px", height: "100%", borderLeft: "1px dashed rgba(255,255,255,0.2)" }} />
            <div style={{ position: "absolute", left: 0, top: "33.33%", height: "1px", width: "100%", borderTop: "1px dashed rgba(255,255,255,0.2)" }} />
            <div style={{ position: "absolute", left: 0, top: "66.66%", height: "1px", width: "100%", borderTop: "1px dashed rgba(255,255,255,0.2)" }} />

            {/* Resizable Corner Handles */}
            <div
              onMouseDown={(e) => handleCornerMouseDown(e, "tl")}
              onTouchStart={(e) => handleCornerTouchStart(e, "tl")}
              style={{
                position: "absolute",
                top: -6,
                left: -6,
                width: "16px",
                height: "16px",
                borderLeft: "3.5px solid #6366f1",
                borderTop: "3.5px solid #6366f1",
                cursor: "nwse-resize",
                pointerEvents: "auto",
                zIndex: 10
              }}
            />
            <div
              onMouseDown={(e) => handleCornerMouseDown(e, "tr")}
              onTouchStart={(e) => handleCornerTouchStart(e, "tr")}
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: "16px",
                height: "16px",
                borderRight: "3.5px solid #6366f1",
                borderTop: "3.5px solid #6366f1",
                cursor: "nesw-resize",
                pointerEvents: "auto",
                zIndex: 10
              }}
            />
            <div
              onMouseDown={(e) => handleCornerMouseDown(e, "bl")}
              onTouchStart={(e) => handleCornerTouchStart(e, "bl")}
              style={{
                position: "absolute",
                bottom: -6,
                left: -6,
                width: "16px",
                height: "16px",
                borderLeft: "3.5px solid #6366f1",
                borderBottom: "3.5px solid #6366f1",
                cursor: "nesw-resize",
                pointerEvents: "auto",
                zIndex: 10
              }}
            />
            <div
              onMouseDown={(e) => handleCornerMouseDown(e, "br")}
              onTouchStart={(e) => handleCornerTouchStart(e, "br")}
              style={{
                position: "absolute",
                bottom: -6,
                right: -6,
                width: "16px",
                height: "16px",
                borderRight: "3.5px solid #6366f1",
                borderBottom: "3.5px solid #6366f1",
                cursor: "nwse-resize",
                pointerEvents: "auto",
                zIndex: 10
              }}
            />
          </div>

          <img
            ref={imgRef}
            src={imageSrc}
            alt="Source"
            draggable="false"
            style={{
              maxHeight: "90%",
              maxWidth: "90%",
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              filter: `brightness(${brightness}%) contrast(${contrast}%)`,
              left: `${offset.x}px`,
              top: `${offset.y}px`,
              position: "relative",
              pointerEvents: "none",
              userSelect: "none",
              transition: isDragging.current ? "none" : "transform 0.15s ease-out"
            }}
          />
        </div>

        {/* Adjustment Panels */}
        <div style={{ marginTop: "16px", minHeight: "115px" }}>
          {activeTab === "crop" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>Scale Zoom</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-text)", fontWeight: "600" }}>{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)" }}>Rotate Tilt</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-text)", fontWeight: "600" }}>{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Sun size={12} /> Brightness</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-text)", fontWeight: "600" }}>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-muted)", display: "flex", alignItems: "center", gap: "4px" }}><Contrast size={12} /> Contrast</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--ce-premium-text)", fontWeight: "600" }}>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="1"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reset View Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
              setRotation(0);
              setBrightness(100);
              setContrast(100);
              setBoxWidth(250);
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ce-premium-muted)",
              fontSize: "0.72rem",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
              textDecoration: "underline"
            }}
          >
            Reset Adjustments
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--ce-premium-border)", background: "transparent", color: "var(--ce-premium-text)", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={cropImage}
            style={{ flex: 1, padding: "8px 16px", borderRadius: "6px", border: "none", background: "var(--grad-premium)", color: "#fff", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
          >
            <Check size={14} /> Crop & Apply
          </button>
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </motion.div>
    </div>
  );
}
