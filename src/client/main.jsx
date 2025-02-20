import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Add global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

// Add unhandled promise rejection handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
