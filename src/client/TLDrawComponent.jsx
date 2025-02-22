"use client"

import React from "react"
import { useSync } from "@tldraw/sync"
import { AssetRecordType, getHashForString, Tldraw, uniqueId } from "tldraw"

interface TLDrawComponentProps {
  roomId: string
  onConnectionStatusChange?: (status: "connected" | "disconnected" | "error") => void
  onLoaded?: () => void
}

const TLDrawComponent = ({ roomId, onConnectionStatusChange, onLoaded }: TLDrawComponentProps) => {
  // Determine the protocol and worker URL based on the current location.
  const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"
  const workerUrl = typeof window !== "undefined" ? `${wsProtocol}//${window.location.host}` : ""

  // Memoize the asset store so it doesn't get recreated on every render.
  const multiplayerAssets = React.useMemo(
    () => ({
      async upload(_asset: unknown, file: File) {
        console.log("Uploading asset:", file.name)
        const id = uniqueId()
        const objectName = `${id}-${file.name}`
        const url = `${workerUrl}/uploads/${encodeURIComponent(objectName)}`
        const response = await fetch(url, { method: "PUT", body: file })
        if (!response.ok) throw new Error(`Failed to upload asset: ${response.statusText}`)
        console.log("Asset uploaded successfully:", url)
        return url
      },
      resolve(asset: { props: { src: string } }) {
        return asset.props.src
      },
    }),
    [workerUrl]
  )

  // Memoize the sync configuration to avoid triggering new hook updates.
  const syncConfig = React.useMemo(
    () => ({
      uri: `${workerUrl}/connect/${roomId}`,
      assets: multiplayerAssets,
      onConnect: () => {
        console.log("Connected to room:", roomId)
        onConnectionStatusChange?.("connected")
        onLoaded?.()
      },
      onDisconnect: () => {
        console.log("Disconnected from room")
        onConnectionStatusChange?.("disconnected")
      },
      onError: (error: Error) => {
        console.error("Connection error:", error)
        onConnectionStatusChange?.("error")
      },
    }),
    [workerUrl, roomId, multiplayerAssets, onConnectionStatusChange, onLoaded]
  )

  // Call useSync with a stable configuration.
  const store = useSync(syncConfig)

  // Memoize the onMount handler.
  const handleMount = React.useCallback(
    (editor: any) => {
      console.log("Editor mounted")
      editor.registerExternalAssetHandler("url", async ({ url }: { url: string }) => {
        const asset = {
          id: AssetRecordType.createId(getHashForString(url)),
          typeName: "asset",
          type: "bookmark",
          meta: {},
          props: {
            src: url,
            description: "",
            image: "",
            favicon: "",
            title: "",
          },
        }
        try {
          const response = await fetch(`${workerUrl}/unfurl?url=${encodeURIComponent(url)}`)
          if (response.ok) {
            const data = await response.json()
            asset.props.description = data?.description || ""
            asset.props.image = data?.image || ""
            asset.props.favicon = data?.favicon || ""
            asset.props.title = data?.title || ""
          }
        } catch (e) {
          console.error("Error unfurling URL:", e)
        }
        return asset
      })
      onLoaded?.()
    },
    [workerUrl, onLoaded]
  )

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <Tldraw store={store} onMount={handleMount} />
    </div>
  )
}

export default TLDrawComponent
