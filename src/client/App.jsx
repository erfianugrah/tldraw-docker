import React, { useState, useEffect } from 'react'
import TLDrawComponent from './TLDrawComponent.jsx'
import RoomManager from './RoomManager.jsx'
import 'tldraw/tldraw.css'

function App() {
  // State to track if we're in room management or drawing mode
  const [currentMode, setCurrentMode] = useState('management')
  const [currentRoom, setCurrentRoom] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [connectionError, setConnectionError] = useState(null)
  
  // Check URL for room ID on initial load
  useEffect(() => {
    const path = window.location.pathname;
    const roomId = path.length > 1 ? path.substring(1) : null;
    
    if (roomId) {
      console.log('Room ID found in URL:', roomId);
      handleRoomSelect(roomId);
    }
  }, [])

  // Handle room selection
  const handleRoomSelect = (roomId) => {
    console.log('Connecting to room:', roomId)
    setIsLoading(true)
    setConnectionError(null)
    setCurrentRoom(roomId)
    
    // Update URL without refreshing
    window.history.pushState({}, '', `/${roomId}`)
    
    // Save to room history
    try {
      const savedRooms = localStorage.getItem('tldraw-room-history')
      const roomHistory = savedRooms ? JSON.parse(savedRooms) : []
      
      // Add to history if not already there, or move to top if exists
      const updatedHistory = [
        roomId,
        ...roomHistory.filter(id => id !== roomId)
      ].slice(0, 10) // Keep only the 10 most recent
      
      localStorage.setItem('tldraw-room-history', JSON.stringify(updatedHistory))
    } catch (error) {
      console.error('Failed to save room history:', error)
    }
    
    // Change to drawing mode
    setCurrentMode('drawing')
  }
  
  // Handle returning to room management
  const handleReturnToRooms = () => {
    setCurrentMode('management')
    setCurrentRoom(null)
    setConnectionStatus('disconnected')
    setConnectionError(null)
    // Update URL without refreshing
    window.history.pushState({}, '', '/')
  }
  
  // Handle connection status changes
  const handleConnectionStatusChange = (status) => {
    console.log('Connection status changed:', status)
    setConnectionStatus(status)
    
    if (status === 'error') {
      setConnectionError('Could not connect to the server. Please check your network connection and try again.')
    } else {
      setConnectionError(null)
    }
    
    // If we get a connection status, we're no longer loading
    if (isLoading) {
      setIsLoading(false)
    }
  }
  
  // Handle when the editor is fully loaded
  const handleLoaded = () => {
    if (isLoading) {
      setIsLoading(false)
    }
  }

  // Check server health periodically when in drawing mode
  useEffect(() => {
    if (currentMode !== 'drawing') return;
    
    const checkServerHealth = async () => {
      try {
        const response = await fetch('/health');
        if (!response.ok) {
          throw new Error('Server health check failed');
        }
        await response.json();
        // If we get here, server is healthy
      } catch (error) {
        console.error('Server health check error:', error);
        if (connectionStatus === 'connected') {
          // Only update if we thought we were connected
          setConnectionStatus('error');
          setConnectionError('Server connection lost. Please check your network connection.');
        }
      }
    };
    
    // Check immediately
    checkServerHealth();
    
    // Then check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);
    
    return () => clearInterval(interval);
  }, [currentMode, connectionStatus]);

  // Render room manager when in management mode
  if (currentMode === 'management') {
    return <RoomManager onEnterRoom={handleRoomSelect} />
  }

  // Render drawing interface when in drawing mode
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Navigation bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '8px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1000,
        height: '48px'
      }}>
        <button
          onClick={handleReturnToRooms}
          style={{
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          ← Back to Rooms
        </button>
        
        <div style={{ marginLeft: '16px', fontSize: '14px' }}>
          Room: <strong>{currentRoom}</strong>
        </div>
        
        <div style={{
          marginLeft: 'auto',
          backgroundColor: connectionStatus === 'connected' ? '#d1fae5' : 
                          connectionStatus === 'disconnected' ? '#fff9db' : '#fee2e2',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          border: connectionStatus === 'connected' ? '1px solid #6ee7b7' : 
                connectionStatus === 'disconnected' ? '1px solid #ffe066' : '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 
              connectionStatus === 'connected' ? '#10b981' : 
              connectionStatus === 'disconnected' ? '#f59e0b' :
              '#ef4444',
            marginRight: '6px'
          }}></span>
          <strong>Status:</strong>&nbsp;
          {connectionStatus === 'connected' 
            ? 'Connected - changes sync in real-time' 
            : connectionStatus === 'error'
              ? 'Connection error - changes won\'t sync' 
              : 'Connecting...'}
        </div>
      </div>
      
      {/* Error message if connection fails */}
      {connectionError && (
        <div style={{
          position: 'absolute',
          top: '48px',
          left: 0,
          right: 0,
          padding: '12px 16px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          borderBottom: '1px solid #fca5a5',
          fontSize: '14px',
          zIndex: 999,
          textAlign: 'center'
        }}>
          {connectionError}
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginLeft: '12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* TLDraw canvas with top padding for the navigation bar */}
      <div style={{ 
        position: 'absolute', 
        top: connectionError ? '84px' : '48px', 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden'
      }}>
        <TLDrawComponent 
          roomId={currentRoom}
          onConnectionStatusChange={handleConnectionStatusChange}
          onLoaded={handleLoaded}
        />
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              Connecting to Room...
            </div>
            <div style={{ color: '#666' }}>
              Setting up drawing board...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
