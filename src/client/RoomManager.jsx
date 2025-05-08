"use client"

import { useState, useEffect } from "react"
import styles from "./styles/RoomManager.module.css"

const RoomManager = ({ onEnterRoom }) => {
  const [newRoomName, setNewRoomName] = useState("")
  const [roomHistory, setRoomHistory] = useState([])

  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem("tldraw-room-history")
      if (savedRooms) {
        setRoomHistory(JSON.parse(savedRooms))
      }
    } catch (error) {
      console.error("Failed to load room history:", error)
    }
  }, [])

  const handleCreateRoom = (e) => {
    e.preventDefault()

    if (!newRoomName.trim()) return

    const sanitizedName = newRoomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")

    if (sanitizedName) {
      onEnterRoom(sanitizedName)
    }
  }

  const handleRemoveFromHistory = (roomId, e) => {
    e.stopPropagation()

    const confirmed = window.confirm(
      `Remove "${roomId}" from your history? This won't delete the room, just remove it from your history list.`,
    )

    if (confirmed) {
      const updatedHistory = roomHistory.filter((id) => id !== roomId)
      setRoomHistory(updatedHistory)
      localStorage.setItem("tldraw-room-history", JSON.stringify(updatedHistory))
    }
  }

  const generateRandomRoom = () => {
    const adjectives = ["happy", "clever", "swift", "brave", "calm", "eager", "fair", "kind"]
    const nouns = ["lion", "tiger", "river", "mountain", "forest", "ocean", "star", "moon"]

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 1000)

    return `${adjective}-${noun}-${number}`
  }

  return (
    <main className={styles.roomManager} role="main">
      <div className={styles.container}>
        <h1 className={styles.title}>TLDraw Room Management</h1>

        <section className={styles.section} aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className={styles.sectionTitle}>Quick Access</h2>
          <div className={styles.buttonGroup}>
            <button
              className={styles.primaryButton}
              onClick={() => onEnterRoom(generateRandomRoom())}
              aria-label="Create room with random name"
            >
              Create Random Room
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => {
                const roomName = prompt("Enter room name:")
                if (roomName) {
                  const sanitizedName = roomName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "")

                  if (sanitizedName) {
                    onEnterRoom(sanitizedName)
                  }
                }
              }}
              aria-label="Enter specific room name"
            >
              Enter Specific Room
            </button>
          </div>

          <div className={styles.infoBox} role="note">
            <p>You can also access any room directly by adding the room name to the URL:</p>
            <code aria-label="URL format example">
              {window.location.origin}/<strong>your-room-name</strong>
            </code>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="create-room-title">
          <h2 id="create-room-title" className={styles.sectionTitle}>Create New Room</h2>
          <form className={styles.form} onSubmit={handleCreateRoom}>
            <div className={styles.formGroup}>
              <label htmlFor="room-name" className="sr-only">
                Room name
              </label>
              <input
                id="room-name"
                type="text"
                className={styles.formControl}
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name (e.g., team-meeting)"
                aria-label="Room name"
                aria-describedby="room-name-help"
              />
            </div>
            <button type="submit" className={styles.primaryButton}>
              Create Room
            </button>
          </form>
          <p id="room-name-help" className={styles.helpText}>
            Room names should use lowercase letters, numbers, and hyphens. Special characters will be converted to
            hyphens.
          </p>
        </section>

        {roomHistory.length > 0 && (
          <section className={styles.section} aria-labelledby="history-title">
            <div className={styles.headerWithAction}>
              <h2 id="history-title" className={styles.sectionTitle}>Recently Visited Rooms</h2>
              <button
                className={styles.textButton}
                onClick={() => {
                  if (window.confirm("Clear your room history? This will not delete any rooms.")) {
                    localStorage.removeItem("tldraw-room-history")
                    setRoomHistory([])
                  }
                }}
                aria-label="Clear room history"
              >
                Clear History
              </button>
            </div>

            <ul className={styles.roomList} role="list">
              {roomHistory.map((roomId) => (
                <li key={roomId} className={styles.roomItem}>
                  <button
                    className={styles.roomButton}
                    onClick={() => onEnterRoom(roomId)}
                    aria-label={`Enter room ${roomId}`}
                  >
                    <span className={styles.roomName}>{roomId}</span>
                    <span className={styles.roomAction} aria-hidden="true">
                      Enter Room
                    </span>
                  </button>
                  <button
                    className={styles.removeButton}
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

        <footer className={styles.footer}>
          <p>
            <strong>Note:</strong> Drawing changes are automatically saved and synced in real-time with other users in the same room.
          </p>
        </footer>
      </div>
    </main>
  )
}

export default RoomManager