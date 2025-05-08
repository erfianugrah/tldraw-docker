"use client"

import React, { useState } from "react"
import { useSync } from "@tldraw/sync"
import { AssetRecordType, getHashForString, Tldraw, uniqueId } from "tldraw"
import { ArrowLeft, Users } from "lucide-react"
import { ConfirmModal } from "./components/ConfirmModal"
import styles from "./styles/TLDrawComponent.module.css"

const TLDrawComponent = ({ roomId, onConnectionStatusChange, onLoaded, onNavigateToRooms }) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const wsProtocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"
  const workerUrl = typeof window !== "undefined" ? `${wsProtocol}//${window.location.host}` : ""

  const multiplayerAssets = React.useMemo(
    () => ({
      async upload(_asset, file) {
        console.log("Uploading asset:", file.name)
        const id = uniqueId()
        const objectName = `${id}-${file.name}`
        const url = `${workerUrl}/uploads/${encodeURIComponent(objectName)}`
        const response = await fetch(url, { method: "PUT", body: file })
        if (!response.ok) throw new Error(`Failed to upload asset: ${response.statusText}`)
        console.log("Asset uploaded successfully:", url)
        return url
      },
      resolve(asset) {
        return asset.props.src
      },
    }),
    [workerUrl],
  )

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
      onError: (error) => {
        console.error("Connection error:", error)
        onConnectionStatusChange?.("error")
      },
    }),
    [workerUrl, roomId, multiplayerAssets, onConnectionStatusChange, onLoaded],
  )

  const store = useSync(syncConfig)

  const handleMount = React.useCallback(
    (editor) => {
      console.log("Editor mounted")
      editor.registerExternalAssetHandler("url", async ({ url }) => {
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
    [workerUrl, onLoaded],
  )

  return (
    <div
      className={styles.wrapper}
      role="application"
      aria-label="Drawing canvas"
    >
      <div className={styles.navigation}>
        <button
          onClick={() => setShowLeaveConfirm(true)}
          className={styles.backButton}
          title="Return to room list"
        >
          <ArrowLeft size={16} />
          <span>Back to Rooms</span>
        </button>

        <div className={styles.roomInfo} title={`Current room: ${roomId}`}>
          <Users size={14} />
          <span>
            Room: <strong>{roomId}</strong>
          </span>
        </div>
      </div>

      <div className={styles.container}>
        <Tldraw store={store} onMount={handleMount} />
      </div>

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => {
          setShowLeaveConfirm(false)
          onNavigateToRooms?.()
        }}
        title="Leave Room?"
      >
        <p>Are you sure you want to leave this room?</p>
        <p>Your work is automatically saved, but any unsaved changes might still be syncing.</p>
        <p>
          You can always return to this room later using the room ID: <strong>{roomId}</strong>
        </p>
      </ConfirmModal>
    </div>
  )
}

export default TLDrawComponent