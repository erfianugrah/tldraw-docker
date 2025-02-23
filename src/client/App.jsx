"use client"

import { useState, useEffect } from "react"
import TLDrawComponent from "./TLDrawComponent.jsx"
import RoomManager from "./RoomManager.jsx"
import "tldraw/tldraw.css"

function App() {
  const [currentMode, setCurrentMode] = useState("management")
  const [currentRoom, setCurrentRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("disconnected")
  const [connectionError, setConnectionError] = useState(null)

  useEffect(() => {
    const path = window.location.pathname
    const roomId = path.length > 1 ? path.substring(1) : null

    if (roomId) {
      console.log("Room ID found in URL:", roomId)
      handleRoomSelect(roomId)
    }
  }, [])

  const handleRoomSelect = (roomId) => {
    console.log("Connecting to room:", roomId)
    setIsLoading(true)
    setConnectionError(null)
    setCurrentRoom(roomId)

    window.history.pushState({}, "", `/${roomId}`)

    try {
      const savedRooms = localStorage.getItem("tldraw-room-history")
      const roomHistory = savedRooms ? JSON.parse(savedRooms) : []

      const updatedHistory = [roomId, ...roomHistory.filter((id) => id !== roomId)].slice(0, 10)

      localStorage.setItem("tldraw-room-history", JSON.stringify(updatedHistory))
    } catch (error) {
      console.error("Failed to save room history:", error)
    }

    setCurrentMode("drawing")
  }

  const handleReturnToRooms = () => {
    if (window.confirm("Are you sure you want to leave the current room?")) {
      setCurrentMode("management")
      setCurrentRoom(null)
      setConnectionStatus("disconnected")
      setConnectionError(null)
      window.history.pushState({}, "", "/")
    }
  }

  const handleConnectionStatusChange = (status) => {
    console.log("Connection status changed:", status)
    setConnectionStatus(status)

    if (status === "error") {
      setConnectionError("Could not connect to the server. Please check your network connection and try again.")
    } else {
      setConnectionError(null)
    }

    if (isLoading) {
      setIsLoading(false)
    }
  }

  const handleLoaded = () => {
    if (isLoading) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (currentMode !== "drawing") return

    const checkServerHealth = async () => {
      try {
        const response = await fetch("/health")
        if (!response.ok) {
          throw new Error("Server health check failed")
        }
        await response.json()
      } catch (error) {
        console.error("Server health check error:", error)
        if (connectionStatus === "connected") {
          setConnectionStatus("error")
          setConnectionError("Server connection lost. Please check your network connection.")
        }
      }
    }

    checkServerHealth()
    const interval = setInterval(checkServerHealth, 30000)
    return () => clearInterval(interval)
  }, [currentMode, connectionStatus])

  if (currentMode === "management") {
    return <RoomManager onEnterRoom={handleRoomSelect} />
  }

  return (
    <main className="relative w-screen h-screen" role="application" aria-label="Drawing Board">
      {connectionError && (
        <div
          role="alert"
          className="fixed top-0 left-0 right-0 p-3 bg-red-50 text-red-700 border-b border-red-200 text-sm text-center z-[9999]"
        >
          {connectionError}
          <button
            onClick={() => window.location.reload()}
            className="ml-3 bg-red-500 text-white border-none rounded px-2 py-1 text-xs cursor-pointer hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Retry connection"
          >
            Retry
          </button>
        </div>
      )}

      <div className="fixed inset-0">
        <TLDrawComponent
          roomId={currentRoom}
          onConnectionStatusChange={handleConnectionStatusChange}
          onLoaded={handleLoaded}
          onNavigateToRooms={handleReturnToRooms}
        />
      </div>

      {isLoading && (
        <div
          className="fixed inset-0 bg-white/80 flex items-center justify-center z-[9999]"
          role="progressbar"
          aria-valuetext="Loading drawing board"
          aria-busy="true"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg text-center">
            <h2 className="text-lg font-bold mb-3">Connecting to Room...</h2>
            <p className="text-gray-600">Setting up drawing board...</p>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
