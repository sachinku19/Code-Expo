import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Paintbrush, Eraser, Square, Circle, Trash2, Undo2, Award, Sparkles } from "lucide-react";
import "./WhiteboardShowcase.css";

function WhiteboardShowcase() {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#6366f1");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyPointer, setHistoryPointer] = useState(-1);
  const startPos = useRef({ x: 0, y: 0 });
  const snapshot = useRef(null);

  // Initialize and draw mock architecture layout on load
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Adjust canvas resolution for high-DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw preloaded flowchart
    drawPreloadedFlowchart(ctx, rect.width, rect.height);
    saveState();
  }, []);

  const drawPreloadedFlowchart = (ctx, w, h) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Background grid lines (very subtle)
    ctx.strokeStyle = "rgba(99, 102, 241, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Node 1: Developer A (Left side)
    drawNode(ctx, w * 0.2, h * 0.5, "Aman (Dev A)", "#3b82f6");

    // Node 2: Developer B (Right side)
    drawNode(ctx, w * 0.8, h * 0.5, "Sachin (Dev B)", "#10b981");

    // Node 3: Cloud Compiler (Center Top)
    drawNode(ctx, w * 0.5, h * 0.22, "Shared Compiler", "#6366f1");

    // Connectors
    drawArrow(ctx, w * 0.25, h * 0.45, w * 0.42, h * 0.28, "rgba(99, 102, 241, 0.4)");
    drawArrow(ctx, w * 0.75, h * 0.45, w * 0.58, h * 0.28, "rgba(99, 102, 241, 0.4)");
    drawArrow(ctx, w * 0.32, h * 0.5, w * 0.68, h * 0.5, "rgba(99, 102, 241, 0.4)");

    // Label texts for connectors
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillStyle = "rgba(161, 161, 170, 0.8)";
    ctx.textAlign = "center";
    ctx.fillText("Sync Runtimes", w * 0.32, h * 0.33);
    ctx.fillText("Sync Runtimes", w * 0.68, h * 0.33);
    ctx.fillText("Real-time Cursors", w * 0.5, h * 0.55);
  };

  const drawNode = (ctx, x, y, label, nodeColor) => {
    // Circle Node
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(9, 9, 11, 0.9)";
    ctx.fill();
    ctx.strokeStyle = nodeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = nodeColor;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Label Text
    ctx.font = "bold 12px Inter, sans-serif";
    ctx.fillStyle = "#fafafa";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + 5);
  };

  const drawArrow = (ctx, fromx, fromy, tox, toy, arrowColor) => {
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]); // dashed lines
    ctx.stroke();
    ctx.setLineDash([]); // reset dash

    // Arrow Head
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - 8 * Math.cos(angle - Math.PI / 6), toy - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - 8 * Math.cos(angle + Math.PI / 6), toy - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = arrowColor;
    ctx.fill();
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Clear history forward if we are drawing after an undo
    const newHistory = history.slice(0, historyPointer + 1);
    newHistory.push(data);
    
    setHistory(newHistory);
    setHistoryPointer(newHistory.length - 1);
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    startPos.current = { x, y };

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = tool === "eraser" ? "rgba(9, 9, 11, 1)" : color; // Eraser matches background color
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Take snapshot of drawing
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "pencil" || tool === "eraser") {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // Restore canvas state before drawing shape preview
      ctx.putImageData(snapshot.current, 0, 0);

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;

      if (tool === "rectangle") {
        const w = x - startPos.current.x;
        const h = y - startPos.current.y;
        ctx.strokeRect(startPos.current.x, startPos.current.y, w, h);
      } else if (tool === "circle") {
        const r = Math.sqrt(Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2));
        ctx.arc(startPos.current.x, startPos.current.y, r, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(9, 9, 11, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const handleUndo = () => {
    if (historyPointer <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const prevPointer = historyPointer - 1;
    ctx.putImageData(history[prevPointer], 0, 0);
    setHistoryPointer(prevPointer);
  };

  return (
    <section className="whiteboard-showcase-section" id="whiteboard">
      <div className="wb-left-content">
        <span className="wb-badge">
          <Sparkles size={14} className="wb-badge-icon" />
          <span>Multiplayer Canvas</span>
        </span>

        <h2>Collaborative Idea Board</h2>

        <p className="wb-desc">
          Plan database structures, map architecture layouts, and solve complex algorithms visually. Sketch with your team on a real-time responsive whiteboard synced with zero delay.
        </p>

        <div className="wb-interactive-indicator">
          <Award size={18} className="indicator-icon" />
          <span>Interactive Sandbox: Grab a tool and start sketching on the canvas!</span>
        </div>

        {/* Board Controls */}
        <div className="wb-toolbar-panel">
          <div className="toolbar-group">
            <span className="group-label">Tools</span>
            <div className="toolbar-buttons">
              <button 
                className={`tool-btn ${tool === "pencil" ? "active" : ""}`}
                onClick={() => setTool("pencil")}
                title="Pencil Tool"
              >
                <Paintbrush size={16} />
              </button>
              <button 
                className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
                onClick={() => setTool("eraser")}
                title="Eraser Tool"
              >
                <Eraser size={16} />
              </button>
              <button 
                className={`tool-btn ${tool === "rectangle" ? "active" : ""}`}
                onClick={() => setTool("rectangle")}
                title="Rectangle Tool"
              >
                <Square size={16} />
              </button>
              <button 
                className={`tool-btn ${tool === "circle" ? "active" : ""}`}
                onClick={() => setTool("circle")}
                title="Circle Tool"
              >
                <Circle size={16} />
              </button>
            </div>
          </div>

          <div className="toolbar-group">
            <span className="group-label">Colors</span>
            <div className="color-swatches">
              {["#6366f1", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#fafafa"].map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${color === c ? "active" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    if (tool === "eraser") setTool("pencil");
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="toolbar-group">
            <span className="group-label">Brush Size</span>
            <div className="size-slider-wrapper">
              <input
                type="range"
                min="2"
                max="12"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="size-slider"
              />
              <span className="size-label">{brushSize}px</span>
            </div>
          </div>

          <div className="toolbar-group actions-group">
            <span className="group-label">Actions</span>
            <div className="toolbar-buttons">
              <button 
                className="tool-btn action"
                onClick={handleUndo}
                disabled={historyPointer <= 0}
                title="Undo Action"
              >
                <Undo2 size={16} />
              </button>
              <button 
                className="tool-btn action danger"
                onClick={handleClear}
                title="Clear Board"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wb-right-canvas-wrapper">
        <motion.div 
          className="wb-canvas-container"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <div className="canvas-header">
            <div className="header-status">
              <span className="status-dot green" />
              <span>Canvas Active (3 Developers)</span>
            </div>
            <span className="canvas-name">neural-grid-flowchart.ce</span>
          </div>

          <canvas
            ref={canvasRef}
            className="wb-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </motion.div>
      </div>
    </section>
  );
}

export default WhiteboardShowcase;
