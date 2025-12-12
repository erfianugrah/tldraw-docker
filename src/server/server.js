import { WebSocketServer } from "ws";
import { TLSocketRoom } from "@tldraw/sync-core";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import _unfurl from "unfurl.js";

// Setup directories
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOMS_DIR = resolve("./.rooms");
const ASSETS_DIR = resolve("./.assets");

// Ensure directories exist
await mkdir(ROOMS_DIR, { recursive: true }).then(() => {
  console.log(`Created/verified room directory: ${ROOMS_DIR}`);
});
await mkdir(ASSETS_DIR, { recursive: true }).then(() => {
  console.log(`Created/verified assets directory: ${ASSETS_DIR}`);
});

// Room state management
const rooms = new Map();
let mutex = Promise.resolve(null);

// Room persistence
async function readSnapshotIfExists(roomId) {
  try {
    const filePath = join(ROOMS_DIR, roomId);
    console.log(`Attempting to read snapshot from: ${filePath}`);
    const data = await readFile(filePath);
    const snapshot = JSON.parse(data.toString()) ?? undefined;
    console.log(`Successfully read snapshot for room: ${roomId}`);
    return snapshot;
  } catch (e) {
    console.log(`No existing snapshot found for room: ${roomId}`, e.message);
    return undefined;
  }
}

async function saveSnapshot(roomId, snapshot) {
  try {
    const filePath = join(ROOMS_DIR, roomId);
    console.log(`Saving snapshot to: ${filePath}`);
    await writeFile(filePath, JSON.stringify(snapshot));
    console.log(`Successfully saved snapshot for room: ${roomId}`);
  } catch (e) {
    console.error(`Error saving snapshot for room: ${roomId}`, e);
  }
}

// Asset management
async function storeAsset(id, stream) {
  try {
    const filePath = join(ASSETS_DIR, id);
    console.log(`Storing asset at: ${filePath}`);
    await writeFile(filePath, stream);
    console.log(`Successfully stored asset: ${id}`);
  } catch (e) {
    console.error(`Error storing asset: ${id}`, e);
    throw e;
  }
}

async function loadAsset(id) {
  try {
    const filePath = join(ASSETS_DIR, id);
    console.log(`Loading asset from: ${filePath}`);
    return await readFile(filePath);
  } catch (e) {
    console.error(`Error loading asset: ${id}`, e);
    throw e;
  }
}

// URL unfurling
async function unfurl(url) {
  try {
    console.log(`Unfurling URL: ${url}`);
    const { title, description, open_graph, twitter_card, favicon } = await _unfurl.unfurl(url);
    const image = open_graph?.images?.[0]?.url || twitter_card?.images?.[0]?.url;
    console.log(`Successfully unfurled URL: ${url}`);
    return { title, description, image, favicon };
  } catch (error) {
    console.error(`Error unfurling URL: ${url}`, error);
    return { title: "", description: "", image: "", favicon: "" };
  }
}

// Room management
async function makeOrLoadRoom(roomId) {
  mutex = mutex
    .then(async () => {
      if (rooms.has(roomId)) {
        const roomState = rooms.get(roomId);
        if (!roomState.room.isClosed()) {
          console.log(`Using existing room: ${roomId}`);
          return null;
        }
      }

      console.log(`Creating/loading room: ${roomId}`);
      const initialSnapshot = await readSnapshotIfExists(roomId);

      const roomState = {
        needsPersist: false,
        id: roomId,
        room: new TLSocketRoom({
          initialSnapshot,
          onSessionRemoved(room, args) {
            console.log(`Client disconnected: sessionId=${args.sessionId}, roomId=${roomId}`);
            if (args.numSessionsRemaining === 0) {
              console.log(`No clients left, closing room: ${roomId}`);
              room.close();
            }
          },
          onDataChange() {
            console.log(`Data changed in room: ${roomId}`);
            roomState.needsPersist = true;
          },
        }),
      };

      rooms.set(roomId, roomState);
      console.log(`Room created: ${roomId}`);
      return null;
    })
    .catch((error) => {
      console.error(`Error creating/loading room: ${roomId}`, error);
      return error;
    });

  const err = await mutex;
  if (err) {
    console.error(`Mutex error for room: ${roomId}`, err);
    throw err;
  }
  return rooms.get(roomId).room;
}

// Persistence interval
setInterval(() => {
  for (const roomState of rooms.values()) {
    if (roomState.needsPersist) {
      roomState.needsPersist = false;
      console.log(`Saving snapshot for room: ${roomState.id}`);
      saveSnapshot(roomState.id, roomState.room.getCurrentSnapshot());
    }
    if (roomState.room.isClosed()) {
      console.log(`Cleaning up closed room: ${roomState.id}`);
      rooms.delete(roomState.id);
    }
  }
}, 2000);

// Express setup
const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Add basic middlewares
app.use(express.json());

// Raw body handling for uploads
app.use("/uploads", express.raw({ type: "*/*", limit: "100mb" }));

// Add basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Debug endpoint to see active rooms
app.get("/debug/rooms", (req, res) => {
  const roomInfo = Array.from(rooms.entries()).map(([id, state]) => ({
    id,
    isClosed: state.room.isClosed(),
    needsPersist: state.needsPersist,
  }));
  res.json(roomInfo);
});

// File endpoints
app.put("/uploads/:id", async (req, res) => {
  try {
    console.log(`Upload request received for asset: ${req.params.id}`);
    await storeAsset(req.params.id, req.body);
    console.log(`Upload successful for asset: ${req.params.id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error(`Upload error for asset: ${req.params.id}`, error);
    res.status(500).json({ error: "Upload failed", message: error.message });
  }
});

app.get("/uploads/:id", async (req, res) => {
  try {
    console.log(`Download request received for asset: ${req.params.id}`);
    const data = await loadAsset(req.params.id);
    console.log(`Download successful for asset: ${req.params.id}`);
    res.send(data);
  } catch (error) {
    console.error(`Download error for asset: ${req.params.id}`, error);
    res.status(404).json({ error: "Asset not found", message: error.message });
  }
});

// URL unfurling endpoint
app.get("/unfurl", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      console.error("Unfurl request missing URL parameter");
      res.status(400).json({ error: "URL required" });
      return;
    }
    console.log(`Unfurl request received for URL: ${url}`);
    const data = await unfurl(url);
    console.log(`Unfurl successful for URL: ${url}`);
    res.json(data);
  } catch (error) {
    console.error(`Unfurl error for URL: ${req.query.url}`, error);
    res.status(500).json({ error: "Unfurl failed", message: error.message });
  }
});

// Serve static files if we're in production mode
if (process.env.NODE_ENV === "production") {
  console.log("Serving static files from dist directory");
  app.use(express.static(resolve(join(__dirname, "../../dist"))));

  // SPA route - this should be after all API routes
  app.get("*", (req, res) => {
    res.sendFile(resolve(join(__dirname, "../../dist/index.html")));
  });
}

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  perMessageDeflate: true,
});

// WebSocket handling
wss.on("connection", async (ws, req) => {
  try {
    console.log("WebSocket connection attempt received:", req.url);

    // Parse the URL carefully
    const urlParts = req.url.split("/");
    const connectIndex = urlParts.indexOf("connect");

    // Extract roomId from the path
    const roomId =
      connectIndex >= 0 && urlParts.length > connectIndex + 1
        ? urlParts[connectIndex + 1].split("?")[0]
        : "default-room";

    // Extract sessionId from query params
    const sessionId = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    ).searchParams.get("sessionId");

    console.log(`Room ID: ${roomId}, Session ID: ${sessionId}`);

    if (!sessionId) {
      console.error("No sessionId provided");
      ws.close(1000, "No sessionId provided");
      return;
    }

    const room = await makeOrLoadRoom(roomId);
    console.log(`Room created/loaded: ${roomId}`);

    if (room) {
      room.handleSocketConnect({
        sessionId,
        socket: {
          send: (data) => {
            if (ws.readyState === ws.OPEN) {
              try {
                const message = typeof data === "string" ? data : JSON.stringify(data);
                ws.send(message);
              } catch (error) {
                console.error("Error sending message:", error);
              }
            }
          },
          close: (code, reason) => {
            try {
              ws.close(code, reason);
            } catch (error) {
              console.error("Error closing socket:", error);
            }
          },
        },
      });

      ws.on("message", (data) => {
        try {
          const message = data.toString();
          room.handleSocketMessage(sessionId, message);
        } catch (error) {
          console.error("Error handling message:", error);
        }
      });

      ws.on("close", (code, reason) => {
        console.log(
          `WebSocket connection closed: code=${code}, reason=${reason || "No reason provided"}`
        );
        room.handleSocketClose(sessionId);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        room.handleSocketError(sessionId);
      });
    } else {
      console.error("Failed to create/load room");
      ws.close(1000, "Failed to create/load room");
    }
  } catch (error) {
    console.error("Error handling WebSocket connection:", error);
    ws.close(1000, "Internal server error");
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});
