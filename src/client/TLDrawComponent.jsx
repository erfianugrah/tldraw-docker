"use client";

import React, { useState } from "react";
import { useSync } from "@tldraw/sync";
import { AssetRecordType, getHashForString, Tldraw, uniqueId } from "tldraw";
import { ArrowLeft, Users } from "lucide-react";
import { ConfirmModal } from "./components/ConfirmModal";

const TLDrawComponent = ({ roomId, onConnectionStatusChange, onLoaded, onNavigateToRooms }) => {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const wsProtocol =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const workerUrl = typeof window !== "undefined" ? `${wsProtocol}//${window.location.host}` : "";

  const multiplayerAssets = React.useMemo(
    () => ({
      async upload(_asset, file) {
        console.log("Uploading asset:", file.name);
        const id = uniqueId();
        const objectName = `${id}-${file.name}`;
        const url = `${workerUrl}/uploads/${encodeURIComponent(objectName)}`;
        const response = await fetch(url, { method: "PUT", body: file });
        if (!response.ok) throw new Error(`Failed to upload asset: ${response.statusText}`);
        console.log("Asset uploaded successfully:", url);
        return url;
      },
      resolve(asset) {
        return asset.props.src;
      },
    }),
    [workerUrl]
  );

  const syncConfig = React.useMemo(
    () => ({
      uri: `${workerUrl}/connect/${roomId}`,
      assets: multiplayerAssets,
      onConnect: () => {
        console.log("Connected to room:", roomId);
        onConnectionStatusChange?.("connected");
        onLoaded?.();
      },
      onDisconnect: () => {
        console.log("Disconnected from room");
        onConnectionStatusChange?.("disconnected");
      },
      onError: (error) => {
        console.error("Connection error:", error);
        onConnectionStatusChange?.("error");
      },
    }),
    [workerUrl, roomId, multiplayerAssets, onConnectionStatusChange, onLoaded]
  );

  const store = useSync(syncConfig);

  const handleMount = React.useCallback(
    (editor) => {
      console.log("Editor mounted");
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
        };
        try {
          const response = await fetch(`${workerUrl}/unfurl?url=${encodeURIComponent(url)}`);
          if (response.ok) {
            const data = await response.json();
            asset.props.description = data?.description || "";
            asset.props.image = data?.image || "";
            asset.props.favicon = data?.favicon || "";
            asset.props.title = data?.title || "";
          }
        } catch (e) {
          console.error("Error unfurling URL:", e);
        }
        return asset;
      });
      onLoaded?.();
    },
    [workerUrl, onLoaded]
  );

  return (
    <div
      className="tldraw-wrapper"
      style={{ position: "fixed", inset: 0 }}
      role="application"
      aria-label="Drawing canvas"
    >
      <style>{`
        .tldraw-wrapper {
          display: flex;
          flex-direction: column;
        }

        .tldraw-navigation {
          height: 40px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          background: var(--color-panel);
          border-bottom: 1px solid var(--color-divider);
          flex: 0 0 auto;
          gap: 8px;
        }

        .tldraw-back-button {
          background: var(--color-muted-2);
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          color: var(--color-text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          height: 28px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .tldraw-back-button:hover {
          background: var(--color-hover);
        }

        .tldraw-back-button:active {
          background: var(--color-muted-1);
        }

        .tldraw-room-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-text-2);
          padding: 4px 8px;
          background: var(--color-muted-1);
          border-radius: 4px;
          border: 1px solid var(--color-divider);
        }

        .tldraw-room-info strong {
          color: var(--color-text);
        }

        .tldraw-container {
          flex: 1;
          position: relative;
        }

        .tldraw-container .tlui-layout {
          top: 0 !important;
        }

        @media (max-width: 768px) {
          .tldraw-back-button span {
            display: none;
          }
          
          .tldraw-room-info {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>

      <div className="tldraw-navigation">
        <button
          onClick={() => setShowLeaveConfirm(true)} // Simply show the modal, no window.confirm
          className="tldraw-back-button"
          title="Return to room list"
        >
          <ArrowLeft size={16} />
          <span>Back to Rooms</span>
        </button>

        <div className="tldraw-room-info" title={`Current room: ${roomId}`}>
          <Users size={14} />
          <span>
            Room: <strong>{roomId}</strong>
          </span>
        </div>
      </div>

      <div className="tldraw-container">
        <Tldraw store={store} onMount={handleMount} />
      </div>

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={() => {
          setShowLeaveConfirm(false);
          onNavigateToRooms?.();
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
  );
};

export default TLDrawComponent;
