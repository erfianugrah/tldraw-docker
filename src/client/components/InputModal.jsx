"use client";

import { useEffect, useState } from "react";

export function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  placeholder,
  defaultValue = "",
  helpText = "",
}) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue, isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onConfirm(inputValue);
    }
  };

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
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="modal-input"
              autoFocus
              aria-label={title}
              aria-describedby={helpText ? "input-help-text" : undefined}
            />
            {helpText && (
              <p id="input-help-text" className="modal-help-text">
                {helpText}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-button modal-button-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button modal-button-primary"
              disabled={!inputValue.trim()}
            >
              OK
            </button>
          </div>
        </form>
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
        }

        .modal-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }

        .modal-input:focus {
          outline: none;
          border-color: #2F80ED;
          box-shadow: 0 0 0 2px rgba(47, 128, 237, 0.1);
        }

        .modal-help-text {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #888;
          line-height: 1.4;
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

        .modal-button-primary:hover:not(:disabled) {
          background: #2B73D5;
        }

        .modal-button-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
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
