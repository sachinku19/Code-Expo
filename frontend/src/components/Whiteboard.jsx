import { useRef, useEffect, useState } from "react";
import socket from "../socket/socket";
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Square,
  Circle,
  MoveRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Wifi,
  WifiOff,
  Activity,
  Users,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sliders,
  Download,
  Minus,
  Triangle,
  Shapes,
  Diamond,
  Hexagon,
  Star
} from "lucide-react";
import "./Whiteboard.css";

// Predefined neon cursor and swatches color palette
const COLOR_SWATCHES = [
  "#ffffff", // White
  "#38bdf8", // Sky Blue
  "#4ade80", // Mint Green
  "#fb923c", // Sunset Orange
  "#c084fc", // Lavender Purple
  "#f87171", // Rose Red
  "#fbbf24", // Amber Yellow
  "#f472b6"  // Blush Pink
];

const getCursorColor = (username) => {
  if (!username) return COLOR_SWATCHES[1];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_SWATCHES.length;
  return COLOR_SWATCHES[index];
};

function Whiteboard({ roomId, activeUsers = [], currentUser = {}, room = {} }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const textInputRef = useRef(null);
  const justBlurredRef = useRef(false);

  const [tool, setTool] = useState("pen"); // 'select' | 'pen' | 'highlighter' | 'eraser' | 'rectangle' | 'circle' | 'arrow' | 'text'
  const [color, setColor] = useState("#38bdf8");
  const [swatches, setSwatches] = useState(COLOR_SWATCHES);
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [gridType, setGridType] = useState(localStorage.getItem("whiteboard_gridType") || "dots"); // 'dots' | 'lines' | 'none'

  // Sync color swatches to light/dark themes dynamically
  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains("light");
      const firstColor = isLight ? "#0f172a" : "#ffffff";
      setSwatches([
        firstColor,
        "#38bdf8",
        "#4ade80",
        "#fb923c",
        "#c084fc",
        "#f87171",
        "#fbbf24",
        "#f472b6"
      ]);
      setColor((prev) => {
        if (prev === "#ffffff" && isLight) return "#0f172a";
        if (prev === "#0f172a" && !isLight) return "#ffffff";
        return prev;
      });
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Vector drawings list
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [currentElement, setCurrentElement] = useState(null);

  // Selection state
  const [selectedElement, setSelectedElement] = useState(null);
  const [dragStartOffset, setDragStartOffset] = useState(null);

  // Text tool overlay states
  const [textEditor, setTextEditor] = useState(null); // { x, y, modelX, modelY, text }

  // Socket & presence states
  const [activeCursors, setActiveCursors] = useState({});
  const [activeDrawings, setActiveDrawings] = useState({});
  const [activities, setActivities] = useState([]);
  const [socketConnected, setSocketConnected] = useState(socket.connected);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);

  // Initialize room data
  useEffect(() => {
    if (room && room.whiteboardData) {
      try {
        const loadedElements = JSON.parse(room.whiteboardData);
        if (Array.isArray(loadedElements)) {
          setElements(loadedElements);
          setHistory([loadedElements]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error("Error loading whiteboard:", err);
      }
    }
  }, [room]);

  // Handle socket connection states
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Listen to remote drawing actions
  useEffect(() => {
    const handleCursorMove = (data) => {
      setActiveCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          x: data.x,
          y: data.y,
          username: data.username,
          color: data.color
        }
      }));
    };

    const handleDrawUpdate = (data) => {
      if (data.isDrawing) {
        setActiveDrawings((prev) => ({
          ...prev,
          [data.userId]: data.element
        }));
      } else {
        setActiveDrawings((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    };

    const handleSyncWhiteboard = (data) => {
      if (Array.isArray(data.elements)) {
        setElements(data.elements);
        // Sync history
        setHistory((prev) => {
          const next = prev.slice(0, historyIndex + 1);
          return [...next, data.elements];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    };

    const handleActivity = (data) => {
      setActivities((prev) => [data, ...prev].slice(0, 15));
    };

    const handleClear = () => {
      setElements([]);
      setActiveDrawings({});
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), []]);
      setHistoryIndex((prev) => prev + 1);
    };

    socket.on("cursor-move", handleCursorMove);
    socket.on("draw-element-update", handleDrawUpdate);
    socket.on("sync-whiteboard", handleSyncWhiteboard);
    socket.on("whiteboard-activity", handleActivity);
    socket.on("clear-board", handleClear);

    return () => {
      socket.off("cursor-move", handleCursorMove);
      socket.off("draw-element-update", handleDrawUpdate);
      socket.off("sync-whiteboard", handleSyncWhiteboard);
      socket.off("whiteboard-activity", handleActivity);
      socket.off("clear-board", handleClear);
    };
  }, [historyIndex]);

  // Clean stale cursor indicators after inactive time (7 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        // Pre-emptively cleanup cursors if users leave or go idle
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Debounced auto-save to MongoDB
  useEffect(() => {
    if (!roomId) return;
    const timer = setTimeout(() => {
      socket.emit("save-whiteboard", {
        roomId,
        whiteboardData: JSON.stringify(elements)
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [elements, roomId]);

  // Add Undo/Redo & Tool selector keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else {
        switch (e.key.toLowerCase()) {
          case "v":
            setTool("select");
            break;
          case "p":
            setTool("pen");
            break;
          case "h":
            setTool("highlighter");
            break;
          case "e":
            setTool("eraser");
            break;
          case "r":
            setTool("rectangle");
            break;
          case "o":
            setTool("circle");
            break;
          case "a":
            setTool("arrow");
            break;
          case "t":
            setTool("text");
            break;
          default:
            break;
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history, elements, tool, color, brushSize, roomId, currentUser]);

  // Auto-focus text overlay editor
  useEffect(() => {
    if (textEditor && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textEditor]);

  // Container size change observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        drawCanvas();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elements, zoom, pan, currentElement, activeDrawings, gridType]);

  // Redraw canvas loop triggered by state changes
  useEffect(() => {
    drawCanvas();
  }, [elements, zoom, pan, currentElement, activeDrawings, gridType]);

  // Math helper for distance to segment
  const distanceToSegment = (p, v, w) => {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projection = {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y)
    };
    return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
  };

  // Get element at click coordinates
  const getElementAtPosition = (x, y) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (
        el.type === "rectangle" ||
        el.type === "triangle" ||
        el.type === "diamond" ||
        el.type === "hexagon" ||
        el.type === "star"
      ) {
        const minX = Math.min(el.x, el.x + el.width);
        const maxX = Math.max(el.x, el.x + el.width);
        const minY = Math.min(el.y, el.y + el.height);
        const maxY = Math.max(el.y, el.y + el.height);
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return el;
      } else if (el.type === "circle") {
        const rx = el.width / 2;
        const ry = el.height / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;
        const r = Math.sqrt(rx * rx + ry * ry);
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r + 6) return el;
      } else if (el.type === "arrow" || el.type === "line") {
        const dist = distanceToSegment({ x, y }, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
        if (dist <= 8) return el;
      } else if (el.type === "text") {
        const fontSize = Math.max(12, el.size * 4);
        const lines = el.text.split("\n");
        const lineHeight = fontSize * 1.25;
        const height = fontSize + (lines.length - 1) * lineHeight;
        const maxLineLength = Math.max(...lines.map((line) => line.length), 1);
        const width = maxLineLength * (fontSize * 0.55);
        if (x >= el.x && x <= el.x + width && y >= el.y - fontSize && y <= el.y + height - fontSize) return el;
      } else if (el.type === "pencil" || el.type === "highlighter" || el.type === "eraser") {
        for (const pt of el.points) {
          const dist = Math.sqrt((x - pt.x) ** 2 + (y - pt.y) ** 2);
          if (dist <= el.size * 2 + 6) return el;
        }
      }
    }
    return null;
  };

  // Main canvas renderer
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (gridType !== "none") {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Render static shapes
    elements.forEach((el) => drawElement(ctx, el));

    // Render other users' active drawings
    Object.values(activeDrawings).forEach((el) => {
      if (el) drawElement(ctx, el);
    });

    // Render client's current drawing
    if (currentElement) {
      drawElement(ctx, currentElement);
    }

    ctx.restore();
  };

  // Vector renderer
  const drawElement = (ctx, el) => {
    ctx.save();
    ctx.lineWidth = el.size;
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (el.type === "pencil") {
      if (el.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
    } else if (el.type === "highlighter") {
      if (el.points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = el.size * 2.2;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (el.type === "eraser") {
      if (el.points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = el.size * 2.5;
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        ctx.lineTo(el.points[i].x, el.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (el.type === "rectangle") {
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    } else if (el.type === "triangle") {
      ctx.beginPath();
      ctx.moveTo(el.x + el.width / 2, el.y);
      ctx.lineTo(el.x + el.width, el.y + el.height);
      ctx.lineTo(el.x, el.y + el.height);
      ctx.closePath();
      ctx.stroke();
    } else if (el.type === "diamond") {
      ctx.beginPath();
      ctx.moveTo(el.x + el.width / 2, el.y);
      ctx.lineTo(el.x + el.width, el.y + el.height / 2);
      ctx.lineTo(el.x + el.width / 2, el.y + el.height);
      ctx.lineTo(el.x, el.y + el.height / 2);
      ctx.closePath();
      ctx.stroke();
    } else if (el.type === "hexagon") {
      ctx.beginPath();
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (el.type === "star") {
      ctx.beginPath();
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      const innerRx = rx * 0.4;
      const innerRy = ry * 0.4;
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const currRx = i % 2 === 0 ? rx : innerRx;
        const currRy = i % 2 === 0 ? ry : innerRy;
        const px = cx + currRx * Math.cos(angle);
        const py = cy + currRy * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (el.type === "circle") {
      ctx.beginPath();
      const rx = el.width / 2;
      const ry = el.height / 2;
      const cx = el.x + rx;
      const cy = el.y + ry;
      const r = Math.sqrt(rx * rx + ry * ry);
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (el.type === "arrow") {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();

      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const arrowSize = Math.max(9, el.size * 2.8);
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(
        el.x2 - arrowSize * Math.cos(angle - Math.PI / 6),
        el.y2 - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        el.x2 - arrowSize * Math.cos(angle + Math.PI / 6),
        el.y2 - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    } else if (el.type === "line") {
      ctx.beginPath();
      ctx.moveTo(el.x1, el.y1);
      ctx.lineTo(el.x2, el.y2);
      ctx.stroke();
    } else if (el.type === "text") {
      ctx.font = `600 ${Math.max(12, el.size * 4)}px ui-monospace, 'Fira Code', monospace`;
      const lines = el.text.split("\n");
      const lineHeight = Math.max(12, el.size * 4) * 1.25;
      lines.forEach((line, index) => {
        ctx.fillText(line, el.x, el.y + index * lineHeight);
      });
    }

    ctx.restore();
  };

  // Draw Grid helper
  const drawGrid = (ctx, canvasWidth, canvasHeight) => {
    const gridSize = 40;
    const left = -pan.x / zoom;
    const top = -pan.y / zoom;
    const right = (canvasWidth - pan.x) / zoom;
    const bottom = (canvasHeight - pan.y) / zoom;

    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;
    
    const isLight = document.documentElement.classList.contains("light");

    if (gridType === "dots") {
      ctx.fillStyle = isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(148, 163, 184, 0.12)";
      for (let x = startX; x < right; x += gridSize) {
        for (let y = startY; y < bottom; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    } else if (gridType === "lines") {
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(148, 163, 184, 0.06)";
      ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = startX; x < right; x += gridSize) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
      }
      for (let y = startY; y < bottom; y += gridSize) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
      }
      ctx.stroke();
    }
  };

  // Convert client viewport coordinates to Canvas model coordinates
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    if (justBlurredRef.current) {
      return;
    }

    if (textEditor) {
      finishTextDrawing();
      return;
    }

    const { x, y } = getCanvasCoords(e);

    // Pan with spacebar or middle mouse button or click on background with select tool
    if (e.button === 1 || tool === "select" && !getElementAtPosition(x, y)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (tool === "select") {
      const element = getElementAtPosition(x, y);
      if (element) {
        setSelectedElement(element);
        if (
          element.type === "rectangle" ||
          element.type === "circle" ||
          element.type === "triangle" ||
          element.type === "text" ||
          element.type === "diamond" ||
          element.type === "hexagon" ||
          element.type === "star"
        ) {
          setDragStartOffset({ x: x - element.x, y: y - element.y });
        } else if (element.type === "arrow" || element.type === "line") {
          setDragStartOffset({
            x1: x - element.x1,
            y1: y - element.y1,
            x2: x - element.x2,
            y2: y - element.y2
          });
        } else {
          setDragStartOffset(element.points.map((pt) => ({ x: x - pt.x, y: y - pt.y })));
        }
        setIsDrawing(true);
      }
      return;
    }

    setIsDrawing(true);
    const elementId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      const newEl = {
        id: elementId,
        type: tool === "pen" ? "pencil" : tool === "highlighter" ? "highlighter" : "eraser",
        points: [{ x, y }],
        color: tool === "eraser" ? "rgba(0,0,0,1)" : color,
        size: brushSize
      };
      setCurrentElement(newEl);
      socket.emit("draw-element-update", { roomId, element: newEl, isDrawing: true, userId: currentUser?.id });
    } else if (
      tool === "rectangle" ||
      tool === "circle" ||
      tool === "triangle" ||
      tool === "diamond" ||
      tool === "hexagon" ||
      tool === "star"
    ) {
      const newEl = {
        id: elementId,
        type: tool,
        x,
        y,
        width: 0,
        height: 0,
        color,
        size: brushSize
      };
      setCurrentElement(newEl);
      socket.emit("draw-element-update", { roomId, element: newEl, isDrawing: true, userId: currentUser?.id });
    } else if (tool === "arrow" || tool === "line") {
      const newEl = {
        id: elementId,
        type: tool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color,
        size: brushSize
      };
      setCurrentElement(newEl);
      socket.emit("draw-element-update", { roomId, element: newEl, isDrawing: true, userId: currentUser?.id });
    } else if (tool === "text") {
      e.preventDefault(); // Prevent default focus stealing on canvas click
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const editorX = e.clientX - rect.left;
      const editorY = e.clientY - rect.top;

      setTextEditor({
        x: editorX,
        y: editorY,
        modelX: x,
        modelY: y,
        text: ""
      });
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoords(e);

    // Broadcast cursor position
    socket.emit("cursor-move", { roomId, x, y, username: currentUser?.username, color: getCursorColor(currentUser?.username) });

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawing) return;

    if (tool === "select" && selectedElement) {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id === selectedElement.id) {
            if (
              el.type === "rectangle" ||
              el.type === "circle" ||
              el.type === "triangle" ||
              el.type === "text" ||
              el.type === "diamond" ||
              el.type === "hexagon" ||
              el.type === "star"
            ) {
              return { ...el, x: x - dragStartOffset.x, y: y - dragStartOffset.y };
            } else if (el.type === "arrow" || el.type === "line") {
              return {
                ...el,
                x1: x - dragStartOffset.x1,
                y1: y - dragStartOffset.y1,
                x2: x - dragStartOffset.x2,
                y2: y - dragStartOffset.y2
              };
            } else {
              return {
                ...el,
                points: el.points.map((pt, idx) => ({
                  x: x - dragStartOffset[idx].x,
                  y: y - dragStartOffset[idx].y
                }))
              };
            }
          }
          return el;
        })
      );

      const updated = elements.find((el) => el.id === selectedElement.id);
      if (updated) {
        socket.emit("draw-element-update", { roomId, element: updated, isDrawing: true, userId: currentUser?.id });
      }
      return;
    }

    if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
      setCurrentElement((prev) => {
        const next = {
          ...prev,
          points: [...prev.points, { x, y }]
        };
        socket.emit("draw-element-update", { roomId, element: next, isDrawing: true, userId: currentUser?.id });
        return next;
      });
    } else if (
      tool === "rectangle" ||
      tool === "circle" ||
      tool === "triangle" ||
      tool === "diamond" ||
      tool === "hexagon" ||
      tool === "star"
    ) {
      setCurrentElement((prev) => {
        const next = {
          ...prev,
          width: x - prev.x,
          height: y - prev.y
        };
        socket.emit("draw-element-update", { roomId, element: next, isDrawing: true, userId: currentUser?.id });
        return next;
      });
    } else if (tool === "arrow" || tool === "line") {
      setCurrentElement((prev) => {
        const next = {
          ...prev,
          x2: x,
          y2: y
        };
        socket.emit("draw-element-update", { roomId, element: next, isDrawing: true, userId: currentUser?.id });
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing) return;

    setIsDrawing(false);

    if (tool === "select" && selectedElement) {
      const finalEl = elements.find((el) => el.id === selectedElement.id);
      if (finalEl) {
        socket.emit("draw-element-update", { roomId, element: finalEl, isDrawing: false, userId: currentUser?.id });
        socket.emit("sync-whiteboard", { roomId, elements });
        socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: `moved ${finalEl.type}` });
        
        // Push history
        const nextHistory = history.slice(0, historyIndex + 1);
        setHistory([...nextHistory, elements]);
        setHistoryIndex(nextHistory.length);
      }
      setSelectedElement(null);
      setDragStartOffset(null);
      return;
    }

    if (currentElement) {
      socket.emit("draw-element-update", { roomId, element: currentElement, isDrawing: false, userId: currentUser?.id });

      const newElements = [...elements, currentElement];
      setElements(newElements);
      setCurrentElement(null);

      // Push history
      const nextHistory = history.slice(0, historyIndex + 1);
      setHistory([...nextHistory, newElements]);
      setHistoryIndex(nextHistory.length);

      // Sync and log activity
      socket.emit("sync-whiteboard", { roomId, elements: newElements });
      
      let toolName = currentElement.type === "pencil" ? "drawing line" : currentElement.type;
      socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: `added ${toolName}` });
    }
  };

  const finishTextDrawing = () => {
    if (!textEditor || !textEditor.text.trim()) {
      setTextEditor(null);
      justBlurredRef.current = true;
      setTimeout(() => { justBlurredRef.current = false; }, 150);
      return;
    }

    const textEl = {
      id: Date.now().toString(36),
      type: "text",
      x: textEditor.modelX,
      y: textEditor.modelY,
      text: textEditor.text,
      color,
      size: brushSize
    };

    const newElements = [...elements, textEl];
    setElements(newElements);
    setTextEditor(null);
    justBlurredRef.current = true;
    setTimeout(() => { justBlurredRef.current = false; }, 150);

    // Push history
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, newElements]);
    setHistoryIndex(nextHistory.length);

    // Sync
    socket.emit("sync-whiteboard", { roomId, elements: newElements });
    socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: `added text: "${textEl.text.substring(0, 15)}..."` });
  };

  // Zoom helpers
  const handleZoom = (factor) => {
    setZoom((prev) => Math.max(0.1, Math.min(5, Number((prev * factor).toFixed(2)))));
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Undo/Redo logic
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const newElements = history[newIndex] || [];
      setElements(newElements);
      setHistoryIndex(newIndex);
      socket.emit("sync-whiteboard", { roomId, elements: newElements });
      socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: "performed undo" });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const newElements = history[newIndex] || [];
      setElements(newElements);
      setHistoryIndex(newIndex);
      socket.emit("sync-whiteboard", { roomId, elements: newElements });
      socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: "performed redo" });
    }
  };

  // Clear Board action
  const handleClearBoard = () => {
    const confirmClear = window.confirm("Are you sure you want to clear the whiteboard?");
    if (!confirmClear) return;

    setElements([]);
    setActiveDrawings({});
    
    const nextHistory = history.slice(0, historyIndex + 1);
    setHistory([...nextHistory, []]);
    setHistoryIndex(nextHistory.length);

    socket.emit("clear-board", { roomId });
    socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, avatar: currentUser?.avatar, action: "cleared the board" });
  };

  // Export board as PNG image
  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");

    const isLight = document.documentElement.classList.contains("light");
    tempCtx.fillStyle = isLight ? "#ffffff" : "#0D1117";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.save();
    tempCtx.translate(pan.x, pan.y);
    tempCtx.scale(zoom, zoom);

    if (gridType !== "none") {
      const gridSize = 40;
      const left = -pan.x / zoom;
      const top = -pan.y / zoom;
      const right = (canvas.width - pan.x) / zoom;
      const bottom = (canvas.height - pan.y) / zoom;
      const startX = Math.floor(left / gridSize) * gridSize;
      const startY = Math.floor(top / gridSize) * gridSize;
      
      if (gridType === "dots") {
        tempCtx.fillStyle = isLight ? "rgba(15, 23, 42, 0.05)" : "rgba(148, 163, 184, 0.12)";
        for (let x = startX; x < right; x += gridSize) {
          for (let y = startY; y < bottom; y += gridSize) {
            tempCtx.beginPath();
            tempCtx.arc(x, y, 1.2, 0, 2 * Math.PI);
            tempCtx.fill();
          }
        }
      } else if (gridType === "lines") {
        tempCtx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(148, 163, 184, 0.06)";
        tempCtx.lineWidth = 1 / zoom;
        tempCtx.beginPath();
        for (let x = startX; x < right; x += gridSize) {
          tempCtx.moveTo(x, top);
          tempCtx.lineTo(x, bottom);
        }
        for (let y = startY; y < bottom; y += gridSize) {
          tempCtx.moveTo(left, y);
          tempCtx.lineTo(right, y);
        }
        tempCtx.stroke();
      }
    }

    elements.forEach((el) => {
      tempCtx.save();
      tempCtx.lineWidth = el.size;
      tempCtx.strokeStyle = el.type === "eraser" ? (isLight ? "#ffffff" : "#0D1117") : el.color;
      tempCtx.fillStyle = el.type === "eraser" ? (isLight ? "#ffffff" : "#0D1117") : el.color;
      tempCtx.lineCap = "round";
      tempCtx.lineJoin = "round";

      if (el.type === "pencil") {
        if (el.points.length >= 2) {
          tempCtx.beginPath();
          tempCtx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            tempCtx.lineTo(el.points[i].x, el.points[i].y);
          }
          tempCtx.stroke();
        }
      } else if (el.type === "highlighter") {
        if (el.points.length >= 2) {
          tempCtx.save();
          tempCtx.globalAlpha = 0.42;
          tempCtx.lineWidth = el.size * 2.2;
          tempCtx.beginPath();
          tempCtx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            tempCtx.lineTo(el.points[i].x, el.points[i].y);
          }
          tempCtx.stroke();
          tempCtx.restore();
        }
      } else if (el.type === "eraser") {
        if (el.points.length >= 2) {
          tempCtx.lineWidth = el.size * 2.5;
          tempCtx.beginPath();
          tempCtx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            tempCtx.lineTo(el.points[i].x, el.points[i].y);
          }
          tempCtx.stroke();
        }
      } else if (el.type === "rectangle") {
        tempCtx.strokeRect(el.x, el.y, el.width, el.height);
      } else if (el.type === "triangle") {
        tempCtx.beginPath();
        tempCtx.moveTo(el.x + el.width / 2, el.y);
        tempCtx.lineTo(el.x + el.width, el.y + el.height);
        tempCtx.lineTo(el.x, el.y + el.height);
        tempCtx.closePath();
        tempCtx.stroke();
      } else if (el.type === "diamond") {
        tempCtx.beginPath();
        tempCtx.moveTo(el.x + el.width / 2, el.y);
        tempCtx.lineTo(el.x + el.width, el.y + el.height / 2);
        tempCtx.lineTo(el.x + el.width / 2, el.y + el.height);
        tempCtx.lineTo(el.x, el.y + el.height / 2);
        tempCtx.closePath();
        tempCtx.stroke();
      } else if (el.type === "hexagon") {
        tempCtx.beginPath();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        for (let i = 0; i < 6; i++) {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const px = cx + rx * Math.cos(angle);
          const py = cy + ry * Math.sin(angle);
          if (i === 0) tempCtx.moveTo(px, py);
          else tempCtx.lineTo(px, py);
        }
        tempCtx.closePath();
        tempCtx.stroke();
      } else if (el.type === "star") {
        tempCtx.beginPath();
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = el.width / 2;
        const ry = el.height / 2;
        const innerRx = rx * 0.4;
        const innerRy = ry * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5;
          const currRx = i % 2 === 0 ? rx : innerRx;
          const currRy = i % 2 === 0 ? ry : innerRy;
          const px = cx + currRx * Math.cos(angle);
          const py = cy + currRy * Math.sin(angle);
          if (i === 0) tempCtx.moveTo(px, py);
          else tempCtx.lineTo(px, py);
        }
        tempCtx.closePath();
        tempCtx.stroke();
      } else if (el.type === "circle") {
        tempCtx.beginPath();
        const rx = el.width / 2;
        const ry = el.height / 2;
        const cx = el.x + rx;
        const cy = el.y + ry;
        const r = Math.sqrt(rx * rx + ry * ry);
        tempCtx.arc(cx, cy, r, 0, 2 * Math.PI);
        tempCtx.stroke();
      } else if (el.type === "arrow") {
        tempCtx.beginPath();
        tempCtx.moveTo(el.x1, el.y1);
        tempCtx.lineTo(el.x2, el.y2);
        tempCtx.stroke();

        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
        const arrowSize = Math.max(9, el.size * 2.8);
        tempCtx.beginPath();
        tempCtx.moveTo(el.x2, el.y2);
        tempCtx.lineTo(
          el.x2 - arrowSize * Math.cos(angle - Math.PI / 6),
          el.y2 - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        tempCtx.lineTo(
          el.x2 - arrowSize * Math.cos(angle + Math.PI / 6),
          el.y2 - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        tempCtx.closePath();
        tempCtx.fill();
      } else if (el.type === "line") {
        tempCtx.beginPath();
        tempCtx.moveTo(el.x1, el.y1);
        tempCtx.lineTo(el.x2, el.y2);
        tempCtx.stroke();
      } else if (el.type === "text") {
        tempCtx.font = `600 ${Math.max(12, el.size * 4)}px ui-monospace, 'Fira Code', monospace`;
        const lines = el.text.split("\n");
        const lineHeight = Math.max(12, el.size * 4) * 1.25;
        lines.forEach((line, index) => {
          tempCtx.fillText(line, el.x, el.y + index * lineHeight);
        });
      }

      tempCtx.restore();
    });

    tempCtx.restore();

    const link = document.createElement("a");
    link.download = `whiteboard-${roomId || "export"}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    socket.emit("whiteboard-activity", { roomId, username: currentUser?.username, action: "exported board as image" });
  };

  return (
    <div ref={containerRef} className="whiteboard-container">
      {/* 1. Canvas Element */}
      <canvas
        ref={canvasRef}
        className={`whiteboard-canvas ${tool === "select" && !selectedElement ? "panning" : ""} ${tool === "text" ? "text-active" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* 2. Collaborative pointers */}
      <div className="whiteboard-cursors-container">
        {Object.entries(activeCursors).map(([id, cursor]) => {
          // Prevent showing own cursor twice
          if (id === socket.id) return null;
          
          const screenX = cursor.x * zoom + pan.x;
          const screenY = cursor.y * zoom + pan.y;

          const canvas = canvasRef.current;
          if (!canvas) return null;
          if (screenX < 0 || screenX > canvas.width || screenY < 0 || screenY > canvas.height) {
            return null;
          }

          return (
            <div key={id} className="wb-collaborator-cursor" style={{ left: screenX, top: screenY }}>
              <svg className="wb-cursor-pointer" width="16" height="16" viewBox="0 0 24 24" fill={cursor.color} stroke={cursor.color}>
                <polygon points="5 5 20 10 13 13 10 20" />
              </svg>
              <div className="wb-cursor-label" style={{ backgroundColor: cursor.color }}>
                {cursor.username}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Text tool overlay input */}
      {textEditor && (
        <textarea
          ref={textInputRef}
          className="wb-text-editor"
          style={{
            left: textEditor.x,
            top: textEditor.y,
            fontSize: `${Math.max(12, brushSize * 4)}px`,
            color: color
          }}
          value={textEditor.text}
          onChange={(e) => setTextEditor({ ...textEditor, text: e.target.value })}
          onBlur={finishTextDrawing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              finishTextDrawing();
            }
          }}
        />
      )}

      {/* 4. Top Floating Toolbar */}
      <div className="whiteboard-toolbar wb-glass-panel">
        <button
          className={`wb-tool-btn ${tool === "select" ? "active" : ""}`}
          onClick={() => setTool("select")}
          data-tooltip="Select & Move (V)"
          type="button"
        >
          <MousePointer size={18} />
        </button>
        <div className="wb-tool-divider" />
        <button
          className={`wb-tool-btn ${tool === "pen" ? "active" : ""}`}
          onClick={() => setTool("pen")}
          data-tooltip="Pencil (P)"
          type="button"
        >
          <PenTool size={18} />
        </button>
        <button
          className={`wb-tool-btn ${tool === "highlighter" ? "active" : ""}`}
          onClick={() => setTool("highlighter")}
          data-tooltip="Highlighter (H)"
          type="button"
        >
          <Highlighter size={18} />
        </button>
        <button
          className={`wb-tool-btn ${tool === "eraser" ? "active" : ""}`}
          onClick={() => setTool("eraser")}
          data-tooltip="Eraser (E)"
          type="button"
        >
          <Eraser size={18} />
        </button>
        <div className="wb-tool-divider" />
        
        {/* Shapes Popover Group */}
        <div className="wb-toolbar-item-wrapper">
          <button
            className={`wb-tool-btn ${["rectangle", "circle", "triangle", "diamond", "hexagon", "star", "line", "arrow"].includes(tool) ? "active" : ""}`}
            data-tooltip="Shapes"
            type="button"
          >
            {tool === "circle" && <Circle size={18} />}
            {tool === "rectangle" && <Square size={18} />}
            {tool === "triangle" && <Triangle size={18} />}
            {tool === "diamond" && <Diamond size={18} />}
            {tool === "hexagon" && <Hexagon size={18} />}
            {tool === "star" && <Star size={18} />}
            {tool === "line" && <Minus size={18} />}
            {tool === "arrow" && <MoveRight size={18} />}
            {!["rectangle", "circle", "triangle", "diamond", "hexagon", "star", "line", "arrow"].includes(tool) && <Shapes size={18} />}
          </button>
          
          <div className="wb-popup-panel wb-shapes-popup wb-glass-panel">
            <p className="wb-popup-title">Draw Shapes</p>
            <div className="wb-shapes-grid">
              <button
                className={`wb-shape-item-btn ${tool === "rectangle" ? "active" : ""}`}
                onClick={() => setTool("rectangle")}
                type="button"
                data-tooltip="Rectangle (R)"
              >
                <Square size={16} />
                <span>Rectangle</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "circle" ? "active" : ""}`}
                onClick={() => setTool("circle")}
                type="button"
                data-tooltip="Circle (O)"
              >
                <Circle size={16} />
                <span>Circle</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "triangle" ? "active" : ""}`}
                onClick={() => setTool("triangle")}
                type="button"
                data-tooltip="Triangle"
              >
                <Triangle size={16} />
                <span>Triangle</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "diamond" ? "active" : ""}`}
                onClick={() => setTool("diamond")}
                type="button"
                data-tooltip="Diamond"
              >
                <Diamond size={16} />
                <span>Diamond</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "hexagon" ? "active" : ""}`}
                onClick={() => setTool("hexagon")}
                type="button"
                data-tooltip="Hexagon"
              >
                <Hexagon size={16} />
                <span>Hexagon</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "star" ? "active" : ""}`}
                onClick={() => setTool("star")}
                type="button"
                data-tooltip="Star"
              >
                <Star size={16} />
                <span>Star</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "line" ? "active" : ""}`}
                onClick={() => setTool("line")}
                type="button"
                data-tooltip="Line"
              >
                <Minus size={16} />
                <span>Line</span>
              </button>
              <button
                className={`wb-shape-item-btn ${tool === "arrow" ? "active" : ""}`}
                onClick={() => setTool("arrow")}
                type="button"
                data-tooltip="Arrow (A)"
              >
                <MoveRight size={16} />
                <span>Arrow</span>
              </button>
            </div>
          </div>
        </div>

        <button
          className={`wb-tool-btn ${tool === "text" ? "active" : ""}`}
          onClick={() => setTool("text")}
          data-tooltip="Text (T)"
          type="button"
        >
          <Type size={18} />
        </button>
        
        <div className="wb-tool-divider" />
        
        {/* Color Popover Select */}
        <div className="wb-toolbar-item-wrapper">
          <button
            className="wb-tool-btn color-preview-btn"
            data-tooltip="Stroke Color"
            type="button"
          >
            <Palette size={18} />
            <span className="color-preview-dot" style={{ backgroundColor: color }} />
          </button>
          
          <div className="wb-popup-panel wb-color-popup wb-glass-panel">
            <p className="wb-popup-title">Stroke Color</p>
            <div className="wb-swatches-grid">
              {swatches.map((sw) => (
                <button
                  key={sw}
                  className={`wb-swatch ${color === sw ? "active" : ""}`}
                  style={{ backgroundColor: sw }}
                  onClick={() => {
                    setColor(sw);
                    if (tool === "eraser") setTool("pen");
                  }}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Brush Weight Popover Select */}
        <div className="wb-toolbar-item-wrapper">
          <button
            className="wb-tool-btn"
            data-tooltip="Brush Size"
            type="button"
          >
            <Sliders size={18} />
            <span className="size-preview-badge">{brushSize}</span>
          </button>
          
          <div className="wb-popup-panel wb-size-popup wb-glass-panel">
            <p className="wb-popup-title">Brush Weight</p>
            <div className="wb-size-presets">
              {[2, 4, 8, 14, 20].map((sz) => (
                <button
                  key={sz}
                  className={`wb-preset-btn ${brushSize === sz ? "active" : ""}`}
                  onClick={() => setBrushSize(sz)}
                  type="button"
                >
                  <span className="preset-circle" style={{ width: sz, height: sz }} />
                  <span className="preset-label">{sz}px</span>
                </button>
              ))}
            </div>
            <div className="wb-popup-divider" />
            <div className="wb-slider-control">
              <input
                type="range"
                min="1"
                max="30"
                className="wb-slider"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="wb-tool-divider" />
        <button
          className="wb-tool-btn"
          disabled={historyIndex <= 0}
          onClick={handleUndo}
          data-tooltip="Undo (Ctrl+Z)"
          type="button"
        >
          <Undo2 size={18} />
        </button>
        <button
          className="wb-tool-btn"
          disabled={historyIndex >= history.length - 1}
          onClick={handleRedo}
          data-tooltip="Redo (Ctrl+Y)"
          type="button"
        >
          <Redo2 size={18} />
        </button>
        
        <div className="wb-tool-divider" />
        <button
          className="wb-tool-btn"
          onClick={handleExportImage}
          data-tooltip="Export Image (PNG)"
          type="button"
          style={{ color: "var(--wb-color-accent)" }}
        >
          <Download size={18} />
        </button>
        <button
          className="wb-tool-btn"
          onClick={handleClearBoard}
          data-tooltip="Clear Board"
          style={{ color: "#ef4444" }}
          type="button"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* 8. Bottom Left Zoom Controls */}
      <div className="whiteboard-zoom-panel wb-glass-panel">
        <button className="wb-zoom-btn" onClick={() => handleZoom(0.85)} data-tooltip="Zoom Out" type="button">
          <ZoomOut size={16} />
        </button>
        <span className="wb-zoom-val">{Math.round(zoom * 100)}%</span>
        <button className="wb-zoom-btn" onClick={() => handleZoom(1.15)} data-tooltip="Zoom In" type="button">
          <ZoomIn size={16} />
        </button>
        <button className="wb-zoom-fit" onClick={resetZoom} type="button">
          Fit Screen
        </button>
        <div className="wb-tool-divider" />
        <button
          className={`wb-zoom-btn ${gridType !== "none" ? "active" : ""}`}
          onClick={() => {
            setGridType((prev) => {
              const next = prev === "dots" ? "lines" : prev === "lines" ? "none" : "dots";
              localStorage.setItem("whiteboard_gridType", next);
              return next;
            });
          }}
          data-tooltip={`Grid Style: ${gridType.toUpperCase()}`}
          style={{ color: gridType !== "none" ? "#2dd4bf" : "" }}
          type="button"
        >
          <Grid size={16} />
        </button>
      </div>

      {/* 9. Bottom Right Activity Feed */}
      {activities.length > 0 && (
        <div className="whiteboard-activity-feed wb-glass-panel">
          <p className="wb-panel-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Activity size={12} /> Live Activity
          </p>
          <div className="wb-feed-list">
            {activities.map((act) => (
              <div key={act.id} className="wb-feed-item" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div className="wb-feed-avatar-circle" style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: getCursorColor(act.username)
                }}>
                  {act.avatar ? (
                    <img src={act.avatar} alt={act.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    act.username?.charAt(0).toUpperCase() || "U"
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="wb-feed-name">{act.username}</span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>{act.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Whiteboard;
