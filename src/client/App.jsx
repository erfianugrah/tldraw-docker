import React, { useEffect } from 'react'
import { useSync } from '@tldraw/sync'
import {
  AssetRecordType,
  getHashForString,
  Tldraw,
  uniqueId,
} from 'tldraw'

// Set this to your server URL in production
// In development, we'll proxy to the server
const API_URL = import.meta.env.PROD ? '' : ''

function App() {
  // Get room ID from URL or use a default
  const roomId = window.location.pathname.split('/')[1] || 'default-room'
  console.log('Connecting to room:', roomId)
  
  // Set up WebSocket URL
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${wsProtocol}//${window.location.host}/connect/${roomId}`
  console.log('WebSocket URL:', wsUrl)
  
  // Add browser detection
  useEffect(() => {
    // Detect browser
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
    
    if (isChrome) {
      console.log('Chrome detected, applying specific styles')
      document.documentElement.classList.add('chrome-browser')
    } else if (isSafari) {
      console.log('Safari detected, applying specific styles')
      document.documentElement.classList.add('safari-browser')
    } else {
      console.log('Firefox or other browser detected')
    }
  }, [])

  // Create a store connected to multiplayer
  const store = useSync({
    uri: wsUrl,
    assets: multiplayerAssets,
  })

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0,
      overflow: 'hidden',
      width: '100vw',
      height: '100vh',
    }}>
      <Tldraw
        store={store}
        onMount={(editor) => {
          console.log('Editor mounted')
          // Fix viewport for Chrome if needed
          const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
          if (isChrome) {
            // Reset viewport and camera on Chrome
            setTimeout(() => {
              editor.resetZoom()
              editor.resetCamera()
            }, 100)
          }
          // When the editor is ready, register the bookmark unfurling handler
          editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
        }}
      />
    </div>
  )
}

// How does our server handle assets like images and videos?
const multiplayerAssets = {
  // to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
  async upload(_asset, file) {
    console.log('Uploading asset:', file.name)
    const id = uniqueId()

    const objectName = `${id}-${file.name}`
    const url = `${API_URL}/uploads/${encodeURIComponent(objectName)}`

    const response = await fetch(url, {
      method: 'PUT',
      body: file,
    })

    if (!response.ok) {
      console.error('Asset upload failed:', response.status, response.statusText)
      throw new Error(`Failed to upload asset: ${response.statusText}`)
    }

    console.log('Asset uploaded successfully:', url)
    return url
  },
  // to retrieve an asset, we can just use the same URL
  resolve(asset) {
    return asset.props.src
  },
}

// How does our server handle bookmark unfurling?
async function unfurlBookmarkUrl({ url }) {
  console.log('Unfurling URL:', url)
  
  const asset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: 'asset',
    type: 'bookmark',
    meta: {},
    props: {
      src: url,
      description: '',
      image: '',
      favicon: '',
      title: '',
    },
  }

  try {
    const response = await fetch(`${API_URL}/unfurl?url=${encodeURIComponent(url)}`)
    
    if (!response.ok) {
      console.error('Unfurl request failed:', response.status, response.statusText)
      return asset
    }
    
    const data = await response.json()
    console.log('Unfurl data:', data)

    asset.props.description = data?.description ?? ''
    asset.props.image = data?.image ?? ''
    asset.props.favicon = data?.favicon ?? ''
    asset.props.title = data?.title ?? ''
  } catch (e) {
    console.error('Error unfurling URL:', e)
  }

  return asset
}

export default App
