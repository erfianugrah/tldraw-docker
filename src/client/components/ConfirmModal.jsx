"use client";

import { useEffect } from "react";

export function ConfirmModal({ isOpen, onClose, onConfirm, title, children }) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="modal-button modal-button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-button modal-button-primary" onClick={onConfirm} autoFocus>
            OK
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          width: 90%;
          max-width: 400px;
          color: #333;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .modal-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .modal-body {
          margin-bottom: 20px;
          font-size: 13px;
          line-height: 1.5;
          color: #666;
        }

        .modal-body p {
          margin: 0 0 8px 0;
        }

        .modal-body p:last-child {
          margin-bottom: 0;
        }

        .modal-body strong {
          color: #1a1a1a;
          font-weight: 500;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .modal-button {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-button-primary {
          background: #2F80ED;
          color: white;
          border: none;
        }

        .modal-button-primary:hover {
          background: #2B73D5;
        }

        .modal-button-secondary {
          background: none;
          border: none;
          color: #666;
          padding: 6px 8px;
        }

        .modal-button-secondary:hover {
          color: #1a1a1a;
        }

        .modal-button:focus {
          outline: 2px solid #2F80ED;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
