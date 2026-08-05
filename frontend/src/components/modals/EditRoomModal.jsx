import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Edit3, Globe, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { updateRoomDetails } from "../../services/roomService";
import "./EditRoomModal.css";

const EditRoomModal = ({
  isOpen,
  onClose,
  room,
  onRoomUpdated
}) => {
  const [title, setTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const targetRoomId = room?.roomId || room?._id || "";
  const initialTitle = (room?.title || "").trim();
  const initialIsPrivate = Boolean(room?.isPrivate);

  // Sync initial fields when modal opens or room changes
  useEffect(() => {
    if (isOpen && room) {
      setTitle(room.title || "");
      setIsPrivate(Boolean(room.isPrivate));
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen, room]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !room) return null;

  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 60;
  const hasChanged = trimmedTitle !== initialTitle || isPrivate !== initialIsPrivate;
  const isSaveDisabled = !isTitleValid || !hasChanged || isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await updateRoomDetails(targetRoomId, {
        title: trimmedTitle,
        isPrivate
      });

      if (res && res.success) {
        setSuccessMsg("Room updated successfully!");
        if (onRoomUpdated) {
          onRoomUpdated(res.room);
        }
        setTimeout(() => {
          onClose();
        }, 400);
      } else {
        setErrorMsg(res?.message || "Failed to update room settings");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "An error occurred while updating the room");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="ce-modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div
        className="edit-room-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-room-modal-title"
      >
        <div className="edit-room-modal-header">
          <div className="edit-room-title-group">
            <div className="edit-room-header-icon">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 id="edit-room-modal-title">Edit Workspace Settings</h3>
              <p className="edit-room-subtitle">Update title and visibility permissions for <code>{targetRoomId}</code></p>
            </div>
          </div>
          <button
            type="button"
            className="edit-room-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close edit modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-room-modal-body">
            {errorMsg && (
              <div className="edit-room-alert error">
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="edit-room-alert success">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Room Title Field */}
            <div className="edit-room-field">
              <label htmlFor="edit-room-title-input" className="edit-room-label">
                Room Title <span className="required-star">*</span>
              </label>
              <input
                id="edit-room-title-input"
                type="text"
                className={`edit-room-input ${trimmedTitle.length > 0 && !isTitleValid ? "invalid" : ""}`}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="Enter workspace room title (e.g. React Interview)"
                disabled={isSubmitting}
                maxLength={60}
                autoFocus
                autoComplete="off"
              />
              <div className="edit-room-field-meta">
                <span className="field-hint">
                  {trimmedTitle.length > 0 && trimmedTitle.length < 3
                    ? "Title must be at least 3 characters long"
                    : "Must be 3 to 60 characters long"}
                </span>
                <span className={`char-counter ${trimmedTitle.length > 60 ? "exceeded" : ""}`}>
                  {trimmedTitle.length}/60
                </span>
              </div>
            </div>

            {/* Privacy Setting Options */}
            <div className="edit-room-field">
              <label className="edit-room-label">Privacy & Visibility</label>
              <div className="privacy-options-grid">
                {/* Public Option */}
                <div
                  className={`privacy-option-card ${!isPrivate ? "selected" : ""}`}
                  onClick={() => !isSubmitting && setIsPrivate(false)}
                >
                  <div className="privacy-option-header">
                    <div className="privacy-icon-box public">
                      <Globe size={18} />
                    </div>
                    <div className="privacy-title-text">
                      <strong>Public Workspace</strong>
                      <span>Visible in explore listings. Developers can join freely.</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="roomPrivacy"
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Private Option */}
                <div
                  className={`privacy-option-card ${isPrivate ? "selected" : ""}`}
                  onClick={() => !isSubmitting && setIsPrivate(true)}
                >
                  <div className="privacy-option-header">
                    <div className="privacy-icon-box private">
                      <Lock size={18} />
                    </div>
                    <div className="privacy-title-text">
                      <strong>Private Workspace</strong>
                      <span>Hidden from public search. Join attempts require owner approval.</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="roomPrivacy"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(true)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="edit-room-modal-actions">
            <button
              type="button"
              className="edit-room-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-room-submit-btn"
              disabled={isSaveDisabled}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="edit-spinner" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditRoomModal;
