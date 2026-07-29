import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Trash2, Loader2, ShieldAlert } from "lucide-react";
import "./SecurityDeleteRoomModal.css";

const SecurityDeleteRoomModal = ({
  isOpen,
  onClose,
  onConfirmDelete,
  roomTitle = "Workspace",
  roomId = "",
  isDeleting = false
}) => {
  const [confirmInput, setConfirmInput] = useState("");

  // Reset input when modal opens/closes or roomTitle changes
  useEffect(() => {
    if (isOpen) {
      setConfirmInput("");
    }
  }, [isOpen, roomTitle]);

  if (!isOpen) return null;

  const targetTitleClean = (roomTitle || "Workspace").trim();
  const inputClean = confirmInput.trim();
  const isMatch = inputClean === targetTitleClean;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isMatch && !isDeleting) {
      onConfirmDelete();
    }
  };

  return createPortal(
    <div className="ce-modal-overlay" onClick={() => !isDeleting && onClose()}>
      <div
        className="security-delete-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
      >
        <div className="security-delete-header">
          <div className="security-delete-title-group">
            <ShieldAlert size={22} />
            <h3 id="security-modal-title">Delete Workspace Permanently</h3>
          </div>
          <button
            type="button"
            className="security-delete-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="security-delete-body">
            <div className="security-warning-box">
              <AlertTriangle size={20} className="warning-icon" />
              <div className="warning-text-content">
                Unexpected bad things will happen if you don't read this!
                <br />
                This action <strong>CANNOT be undone</strong>. This will permanently delete the <strong>{targetTitleClean}</strong> workspace (ID: <code>{roomId}</code>), deleting:
                <ul className="warning-bullets">
                  <li>All saved source code files and directories</li>
                  <li>Live whiteboard canvas data & notes</li>
                  <li>Chat message history & meeting logs</li>
                  <li>Active member permissions and invites</li>
                </ul>
              </div>
            </div>

            <div className="security-confirm-prompt">
              <label htmlFor="confirm-room-input" className="confirm-label">
                To confirm deletion, please type <span className="target-title-badge">{targetTitleClean}</span> in the box below:
              </label>
              <input
                id="confirm-room-input"
                type="text"
                className={`security-confirm-input ${isMatch ? "matched" : ""}`}
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={`Type "${targetTitleClean}" to confirm`}
                disabled={isDeleting}
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>

          <div className="security-delete-actions">
            <button
              type="button"
              className="security-cancel-btn"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="security-submit-delete-btn"
              disabled={!isMatch || isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>Deleting Room...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>I understand the consequences, delete this room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SecurityDeleteRoomModal;
