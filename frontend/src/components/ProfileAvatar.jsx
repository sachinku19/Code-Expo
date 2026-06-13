import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { uploadAvatar, deleteAvatar } from "../services/userService";
import socket from "../socket/socket";
import { Camera, Trash2, Sliders, Maximize2, Loader, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import "./ProfileAvatar.css";

export default function ProfileAvatar() {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cropping, setCropping] = useState(false);

  // Drag and Crop coordinates/scale states
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageScale, setImageScale] = useState(1); // To fit inside 300px workspace
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle file validation
  const validateAndSetFile = (file) => {
    if (!file) return;

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only images (.jpg, .jpeg, .png, .webp) are allowed!");
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB!");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
      setCropping(true);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Drag & Drop event handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Cropping image mouse events
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Ensure image dimensions are calculated correctly even if the image loads from cache instantly
  useEffect(() => {
    if (cropping && imageRef.current) {
      const img = imageRef.current;
      const checkLoaded = () => {
        if (img.complete && img.naturalWidth > 0) {
          const scale = Math.max(300 / img.naturalWidth, 300 / img.naturalHeight);
          setImageScale(scale);
          setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        }
      };
      checkLoaded();
      img.addEventListener("load", checkLoaded);
      return () => {
        img.removeEventListener("load", checkLoaded);
      };
    }
  }, [cropping, previewUrl]);

  const handleImageLoad = (e) => {
    const img = e.target;
    // Calculate aspect fill ratio to cover 300px workspace
    const scale = Math.max(300 / img.naturalWidth, 300 / img.naturalHeight);
    setImageScale(scale);
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setOffset({ x: 0, y: 0 });
  };

  // Canvas Crop & Upload
  const handleCropAndUpload = async () => {
    if (!imageRef.current) return;
    
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth || img.width || 300;
    const naturalHeight = img.naturalHeight || img.height || 300;
    const scale = Math.max(300 / naturalWidth, 300 / naturalHeight);

    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 250;
      canvas.height = 250;
      const ctx = canvas.getContext("2d");

      const containerSize = 300;
      const cropSize = 250;
      const padding = (containerSize - cropSize) / 2; // 25px

      const displayW = naturalWidth * scale;
      const displayH = naturalHeight * scale;

      // Map container crop region (centered 250px) back to unscaled image source coordinates
      const cropX = (padding - ((containerSize - displayW * zoom) / 2 + offset.x)) / (zoom * scale);
      const cropY = (padding - ((containerSize - displayH * zoom) / 2 + offset.y)) / (zoom * scale);
      const cropW = cropSize / (zoom * scale);
      const cropH = cropSize / (zoom * scale);

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropSize, cropSize);

      // Compress canvas content to Blob (JPEG 85% quality for maximum browser compatibility)
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error("Failed to crop image.");
            setLoading(false);
            return;
          }

          const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("avatar", file);

          try {
            const data = await uploadAvatar(formData);
            
            // Update Auth Context User
            const updatedUser = { ...user, avatar: data.avatar };
            setUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            // Broadcast changes to active rooms
            socket.emit("avatar-updated", { userId: user.id, avatar: data.avatar });

            toast.success("Profile picture updated!");
            setCropping(false); // Only close modal on successful upload
          } catch (uploadErr) {
            toast.error(uploadErr.response?.data?.message || "Failed to upload avatar");
          } finally {
            setLoading(false);
          }
        },
        "image/jpeg",
        0.85
      );
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during cropping.");
      setLoading(false);
    }
  };

  // Delete Avatar
  const handleDeleteAvatar = async () => {
    const confirmDelete = window.confirm("Are you sure you want to remove your profile picture?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteAvatar();
      
      const updatedUser = { ...user, avatar: "" };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Broadcast removal
      socket.emit("avatar-updated", { userId: user.id, avatar: "" });

      toast.success("Profile picture removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove avatar");
    } finally {
      setLoading(false);
    }
  };

  const initial = user?.username?.charAt(0).toUpperCase() || "U";
  const displayW = imageSize.width * imageScale;
  const displayH = imageSize.height * imageScale;

  return (
    <div className="profile-avatar-wrapper">
      <div 
        className="avatar-container" 
        onClick={() => fileInputRef.current.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {loading && (
          <div className="avatar-loading-overlay">
            <div className="avatar-spinner" />
          </div>
        )}

        {user?.avatar ? (
          <img src={user.avatar} alt="Avatar" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">{initial}</div>
        )}

        <div className="avatar-overlay">
          <Camera size={18} />
          <span>Change Photo</span>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: "none" }} 
        accept="image/jpeg,image/jpg,image/png,image/webp" 
      />

      {user?.avatar && !loading && (
        <button className="avatar-delete-btn" onClick={handleDeleteAvatar} type="button">
          <Trash2 size={12} />
          <span>Delete Picture</span>
        </button>
      )}

      {/* Canvas Crop Overlay Modal */}
      {cropping && (
        <div className="avatar-crop-modal">
          <div className="crop-card">
            <h3>Crop Profile Picture</h3>
            
            <div className="crop-workspace">
              <img 
                ref={imageRef}
                src={previewUrl} 
                alt="Crop Preview" 
                className="crop-image-preview"
                onLoad={handleImageLoad}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  width: `${displayW * zoom}px`,
                  height: `${displayH * zoom}px`,
                  left: `${150 - (displayW * zoom) / 2 + offset.x}px`,
                  top: `${150 - (displayH * zoom) / 2 + offset.y}px`
                }}
              />
              <div className="crop-circular-mask" />
            </div>

            <div className="crop-controls">
              <div className="crop-zoom-slider-row">
                <span>Zoom</span>
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05"
                  className="crop-slider"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                />
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0", textAlign: "center" }}>
                Drag the image above to align your profile inside the circle.
              </p>
            </div>

            <div className="crop-actions">
              <button className="crop-btn cancel" onClick={() => setCropping(false)} disabled={loading}>Cancel</button>
              <button className="crop-btn apply" onClick={handleCropAndUpload} disabled={loading}>
                {loading ? "Uploading..." : "Apply & Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
