import React, { useState, useEffect } from 'react'
import './RoomManager.css'

const RoomManager = ({ onEnterRoom }) => {
  const [newRoomName, setNewRoomName] = useState('')
  const [roomHistory, setRoomHistory] = useState([])
  
  // Load room history from localStorage on mount
  useEffect(() => {
    try {
      const savedRooms = localStorage.getItem('tldraw-room-history')
      if (savedRooms) {
        setRoomHistory(JSON.parse(savedRooms))
      }
    } catch (error) {
      console.error('Failed to load room history:', error)
    }
  }, [])
  
  // Handle room creation form submission
  const handleCreateRoom = (e) => {
    e.preventDefault()
    
    if (!newRoomName.trim()) return
    
    // Sanitize room name
    const sanitizedName = newRoomName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/-+/g, '-')         // Replace multiple hyphens with a single one
      .replace(/^-|-$/g, '')       // Remove leading/trailing hyphens
    
    if (sanitizedName) {
      onEnterRoom(sanitizedName)
    }
  }
  
  // Handle removing a room from history
  const handleRemoveFromHistory = (roomId, e) => {
    e.stopPropagation()
    
    const confirmed = window.confirm(
      `Remove "${roomId}" from your history? This won't delete the room, just remove it from your history list.`
    )
    
    if (confirmed) {
      const updatedHistory = roomHistory.filter(id => id !== roomId)
      setRoomHistory(updatedHistory)
      localStorage.setItem('tldraw-room-history', JSON.stringify(updatedHistory))
    }
  }
  
  // Generate a random room name
  const generateRandomRoom = () => {
    const adjectives = ['happy', 'clever', 'swift', 'brave', 'calm', 'eager', 'fair', 'kind']
    const nouns = ['lion', 'tiger', 'river', 'mountain', 'forest', 'ocean', 'star', 'moon']
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 1000)
    
    return `${adjective}-${noun}-${number}`
  }
  
  return (
    <div className="room-manager">
      <div className="room-manager-container">
        <h1>TLDraw Room Management</h1>
        
        <div className="quick-actions">
          <h2>Quick Access</h2>
          <div className="button-group">
            <button 
              className="primary-button"
              onClick={() => onEnterRoom(generateRandomRoom())}
            >
              Create Random Room
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                const roomName = prompt('Enter room name:')
                if (roomName) {
                  const sanitizedName = roomName
                    .trim()
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '')
                  
                  if (sanitizedName) {
                    onEnterRoom(sanitizedName)
                  }
                }
              }}
            >
              Enter Specific Room
            </button>
          </div>
          
          <div className="info-box">
            You can also access any room directly by adding the room name to the URL:<br />
            <code>{window.location.origin}/<strong>your-room-name</strong></code>
          </div>
        </div>
        
        <div className="create-room">
          <h2>Create New Room</h2>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Enter room name (e.g., team-meeting)"
              aria-label="Room name"
            />
            <button type="submit" className="primary-button">Create Room</button>
          </form>
          <p className="help-text">
            Room names should use lowercase letters, numbers, and hyphens.
            <br />Special characters will be converted to hyphens.
          </p>
        </div>
        
        {roomHistory.length > 0 && (
          <div className="room-history">
            <div className="header-with-action">
              <h2>Recently Visited Rooms</h2>
              <button 
                className="text-button"
                onClick={() => {
                  if (window.confirm('Clear your room history? This will not delete any rooms.')) {
                    localStorage.removeItem('tldraw-room-history')
                    setRoomHistory([])
                  }
                }}
              >
                Clear History
              </button>
            </div>
            
            <ul className="room-list">
              {roomHistory.map(roomId => (
                <li key={roomId} className="room-item">
                  <button 
                    className="room-button"
                    onClick={() => onEnterRoom(roomId)}
                  >
                    <span className="room-name">{roomId}</span>
                    <span className="room-action">Enter Room</span>
                  </button>
                  <button 
                    className="remove-button"
                    onClick={(e) => handleRemoveFromHistory(roomId, e)}
                    aria-label={`Remove ${roomId} from history`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="footer">
          <p>
            <strong>Note:</strong> Drawing changes are currently stored locally. 
            Multiplayer sync functionality is coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RoomManager
