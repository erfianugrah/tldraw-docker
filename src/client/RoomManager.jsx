"use client";

import { useState, useEffect } from "react";
import { sanitizeRoomName, generateRandomRoomName } from "./utils/roomUtils";
import { InputModal } from "./components/InputModal";
import { ConfirmModal } from "./components/ConfirmModal";
import "./RoomManager.css";

const RoomManager = ({ onEnterRoom }) => {
  const [newRoomName, setNewRoomName] = useState("");
  const [roomHistory, setRoomHistory] = useState([]);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [roomToRemove, setRoomToRemove] = useState(null);

  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem("tldraw-room-history");
      if (savedRooms) {
        setRoomHistory(JSON.parse(savedRooms));
      }
    } catch (error) {
      console.error("Failed to load room history:", error);
    }
  }, []);

  const handleCreateRoom = (e) => {
    e.preventDefault();

    if (!newRoomName.trim()) return;

    const sanitizedName = sanitizeRoomName(newRoomName);

    if (sanitizedName) {
      onEnterRoom(sanitizedName);
    }
  };

  const handleRemoveFromHistory = (roomId, e) => {
    e.stopPropagation();
    setRoomToRemove(roomId);
  };

  const confirmRemoveFromHistory = () => {
    if (roomToRemove) {
      const updatedHistory = roomHistory.filter((id) => id !== roomToRemove);
      setRoomHistory(updatedHistory);
      localStorage.setItem("tldraw-room-history", JSON.stringify(updatedHistory));
    }
    setRoomToRemove(null);
  };

  const handleEnterSpecificRoom = (roomName) => {
    const sanitizedName = sanitizeRoomName(roomName);

    if (sanitizedName) {
      onEnterRoom(sanitizedName);
    }
    setShowInputModal(false);
  };

  const handleClearHistory = () => {
    localStorage.removeItem("tldraw-room-history");
    setRoomHistory([]);
    setShowClearHistoryModal(false);
  };

  return (
    <main className="room-manager" role="main">
      <div className="room-manager-container">
        <h1>TLDraw Room Management</h1>

        <section className="quick-actions" aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title">Quick Access</h2>
          <div className="button-group">
            <button
              className="primary-button"
              onClick={() => onEnterRoom(generateRandomRoomName())}
              aria-label="Create room with random name"
            >
              Create Random Room
            </button>
            <button
              className="secondary-button"
              onClick={() => setShowInputModal(true)}
              aria-label="Enter specific room name"
            >
              Enter Specific Room
            </button>
          </div>

          <div className="info-box" role="note">
            <p>You can also access any room directly by adding the room name to the URL:</p>
            <code aria-label="URL format example">
              {window.location.origin}/<strong>your-room-name</strong>
            </code>
          </div>
        </section>

        <section className="create-room" aria-labelledby="create-room-title">
          <h2 id="create-room-title">Create New Room</h2>
          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label htmlFor="room-name" className="sr-only">
                Room name
              </label>
              <input
                id="room-name"
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name (e.g., team-meeting)"
                aria-label="Room name"
                aria-describedby="room-name-help"
              />
            </div>
            <button type="submit" className="primary-button">
              Create Room
            </button>
          </form>
          <p id="room-name-help" className="help-text">
            Room names should use lowercase letters, numbers, and hyphens. Special characters will
            be converted to hyphens.
          </p>
        </section>

        {roomHistory.length > 0 && (
          <section className="room-history" aria-labelledby="history-title">
            <div className="header-with-action">
              <h2 id="history-title">Recently Visited Rooms</h2>
              <button
                className="text-button"
                onClick={() => setShowClearHistoryModal(true)}
                aria-label="Clear room history"
              >
                Clear History
              </button>
            </div>

            <ul className="room-list" role="list">
              {roomHistory.map((roomId) => (
                <li key={roomId} className="room-item">
                  <button
                    className="room-button"
                    onClick={() => onEnterRoom(roomId)}
                    aria-label={`Enter room ${roomId}`}
                  >
                    <span className="room-name">{roomId}</span>
                    <span className="room-action" aria-hidden="true">
                      Enter Room
                    </span>
                  </button>
                  <button
                    className="remove-button"
                    onClick={(e) => handleRemoveFromHistory(roomId, e)}
                    aria-label={`Remove ${roomId} from history`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="footer">
          <p>
            <strong>Note:</strong> Drawing changes are automatically saved and synced in real-time
            with other users in the same room.
          </p>
        </footer>
      </div>

      <InputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onConfirm={handleEnterSpecificRoom}
        title="Enter Room Name"
        placeholder="e.g., team-meeting"
        helpText="Room names should use lowercase letters, numbers, and hyphens. Special characters will be converted to hyphens."
      />

      <ConfirmModal
        isOpen={showClearHistoryModal}
        onClose={() => setShowClearHistoryModal(false)}
        onConfirm={handleClearHistory}
        title="Clear Room History?"
      >
        <p>
          This will clear your room history. This will not delete any rooms, just remove them from
          your history list.
        </p>
      </ConfirmModal>

      <ConfirmModal
        isOpen={!!roomToRemove}
        onClose={() => setRoomToRemove(null)}
        onConfirm={confirmRemoveFromHistory}
        title="Remove from History?"
      >
        <p>
          Remove <strong>{roomToRemove}</strong> from your history?
        </p>
        <p>This won&apos;t delete the room, just remove it from your history list.</p>
      </ConfirmModal>
    </main>
  );
};

export default RoomManager;
