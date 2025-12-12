import { WebSocketServer } from "ws";
import { createServer } from "http";
import express from "express";
import { join, resolve } from "path";
import { promises as fs } from "fs";
import { readdir } from "fs/promises";
import { loadAsset, storeAsset } from "./assets.js";
import { getActiveRooms, makeOrLoadRoom, rooms } from "./rooms.js";
import { unfurl } from "./unfurl.js";
import cors from "cors";
import { PORT, NODE_ENV, IS_PRODUCTION, ROOMS_DIR, CORS_ENABLED, CORS_ORIGIN } from "./config.js";

// Create the Express app
const app = express();

// Configure middleware
if (CORS_ENABLED) {
  app.use(
    cors({
      origin: CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  console.log(`[INFO] Health check: ${new Date().toISOString()}`);
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Asset storage
app.put("/uploads/:id", async (req, res) => {
  const id = req.params.id;
  console.log(`[INFO] Upload request for asset: ${id}`);
  try {
    await storeAsset(id, req);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[ERROR] Failed to store asset: ${err.message}`);
    res.status(500).json({
      error: "Failed to store asset",
      message: err.message,
    });
  }
});

app.get("/uploads/:id", async (req, res) => {
  const id = req.params.id;
  console.log(`[INFO] Download request for asset: ${id}`);
  try {
    const data = await loadAsset(id);
    res.send(data);
  } catch (err) {
    console.error(`[ERROR] Failed to load asset: ${err.message}`);
    res.status(404).json({ error: "Asset not found", message: err.message });
  }
});

// Unfurl endpoint
app.get("/unfurl", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL parameter is required" });
  console.log(`[INFO] Unfurling URL: ${url}`);
  try {
    const data = await unfurl(url);
    res.json(data);
  } catch (err) {
    console.error(`[ERROR] Failed to unfurl: ${err.message}`);
    res.status(500).json({ error: "Failed to unfurl", message: err.message });
  }
});

// Room management
app.get("/api/rooms", async (req, res) => {
  console.log("[INFO] Fetching room list");
  try {
    await fs.mkdir(ROOMS_DIR, { recursive: true });
    const files = await readdir(ROOMS_DIR);
    const roomsFromFiles = files.map((file) => ({ id: file, isClosed: true }));
    const activeRooms = getActiveRooms();
    const mergedRooms = [...roomsFromFiles];

    activeRooms.forEach((activeRoom) => {
      const existing = mergedRooms.find((room) => room.id === activeRoom.id);
      if (existing) {
        existing.isClosed = false;
      } else {
        mergedRooms.push(activeRoom);
      }
    });

    res.json(mergedRooms);
  } catch (err) {
    console.error(`[ERROR] Failed to list rooms: ${err.message}`);
    res.status(500).json({ error: "Failed to list rooms" });
  }
});

// Delete room endpoint
app.delete("/api/rooms/:roomId", async (req, res) => {
  const roomId = req.params.roomId;
  console.log(`[INFO] Deleting room: ${roomId}`);
  try {
    const roomPath = join(ROOMS_DIR, roomId);
    const activeRoom = rooms.get(roomId);
    if (activeRoom) {
      activeRoom.room.close();
      rooms.delete(roomId);
    }
    await fs.unlink(roomPath);
    res.json({ success: true, message: "Room deleted" });
  } catch (err) {
    console.error(`[ERROR] Failed to delete room: ${err.message}`);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// Serve static files in production
if (IS_PRODUCTION) {
  const distPath = resolve("./dist");
  app.use(express.static(distPath));

  app.get("*", (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

// HTTP and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.pathname.split("/").pop();
  const userId = url.searchParams.get("userId") || url.searchParams.get("sessionId");

  if (!roomId || !userId) {
    console.error("[ERROR] Invalid WebSocket connection");
    ws.close(1008, "Invalid connection");
    return;
  }

  console.log(`[INFO] User ${userId} connected to room ${roomId}`);

  makeOrLoadRoom(roomId)
    .then((room) => {
      room.handleSocketConnect({ sessionId: userId, socket: ws });
    })
    .catch((err) => {
      console.error(`[ERROR] Failed to connect to room ${roomId}: ${err.message}`);
      ws.close(1011, "Error connecting to room");
    });
});

server.listen(PORT, () => {
  console.log(`[INFO] Server running at http://0.0.0.0:${PORT}`);
});
