import { WebSocketServer } from "ws";
import { createServer } from "http";
import fastify from "fastify";
import { join, resolve } from "path";
import { promises as fs } from "fs";
import { readdir, readFile } from "fs/promises";
import { loadAsset, storeAsset } from "./assets.js";
import { getActiveRooms, makeOrLoadRoom, rooms } from "./rooms.js";
import { unfurl } from "./unfurl.js";
import cors from "@fastify/cors";

const PORT = process.env.PORT || 5858;
const ROOMS_DIR = resolve("./.rooms");

// Create the HTTP server
const app = fastify({
  logger: {
    level: "info",
  },
});

// Register CORS
app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

// Allow all content types with no parsing for asset uploads
app.addContentTypeParser("*", (_, __, done) => done(null));

// Create WebSocket server (without Fastify plugin)
const wss = new WebSocketServer({
  noServer: true,
});

// Ping endpoint for health checks
app.get("/health", async (req, res) => {
  res.send({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Asset storage handling
app.put("/uploads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    app.log.info(`Asset upload request received: ${id}`);
    await storeAsset(id, req.raw);
    app.log.info(`Asset uploaded successfully: ${id}`);
    res.send({ ok: true });
  } catch (err) {
    app.log.error(`Error storing asset: ${err.message}`);
    res.status(500).send({
      error: "Failed to store asset",
      message: err.message,
    });
  }
});

app.get("/uploads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    app.log.info(`Asset download request received: ${id}`);
    const data = await loadAsset(id);
    app.log.info(`Asset downloaded successfully: ${id}`);
    res.send(data);
  } catch (err) {
    app.log.error(`Error loading asset: ${err.message}`);
    res.status(404).send({ error: "Asset not found", message: err.message });
  }
});

// Bookmark unfurling
app.get("/unfurl", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).send({ error: "URL parameter is required" });
    }
    app.log.info(`Unfurling URL: ${url}`);
    const data = await unfurl(url);
    app.log.info(`URL unfurled successfully: ${url}`);
    res.send(data);
  } catch (err) {
    app.log.error(`Error unfurling URL: ${err.message}`);
    res.status(500).send({
      error: "Failed to unfurl URL",
      message: err.message,
    });
  }
});

// Room listing endpoint
app.get("/api/rooms", async (req, res) => {
  try {
    app.log.info("Fetching room list");

    // Read room files from the directory
    let fileList = [];
    try {
      await fs.mkdir(ROOMS_DIR, { recursive: true });
      fileList = await readdir(ROOMS_DIR);
      app.log.info("Read files from directory:", fileList);
    } catch (err) {
      // Directory might not exist yet
      app.log.warn(`Rooms directory error: ${err.message}`);
      fileList = [];
    }

    // Map room files to room info
    const roomsFromFiles = fileList.map((filename) => ({
      id: filename,
      isClosed: true, // Default to closed since we don't know yet
      needsPersist: false,
    }));

    // Get active rooms from the rooms.js module
    const activeRooms = getActiveRooms();
    app.log.info("Active rooms:", activeRooms);

    // Merge the two lists, prioritizing active room data
    const mergedRooms = [...roomsFromFiles];

    // Update status for active rooms
    activeRooms.forEach((activeRoom) => {
      const existingIndex = mergedRooms.findIndex((room) =>
        room.id === activeRoom.id
      );
      if (existingIndex >= 0) {
        mergedRooms[existingIndex] = activeRoom;
      } else {
        mergedRooms.push(activeRoom);
      }
    });

    // Ensure proper JSON response with content-type
    res.header("Content-Type", "application/json");
    return res.send(mergedRooms);
  } catch (err) {
    app.log.error(`Error listing rooms: ${err.message}`);
    res.header("Content-Type", "application/json");
    return res.status(500).send({
      error: "Failed to list rooms",
      message: err.message,
    });
  }
});

// For backward compatibility
app.get("/debug/rooms", async (req, res) => {
  return res.redirect(307, "/api/rooms");
});

// Room deletion endpoint
app.delete("/api/rooms/:roomId", async (req, res) => {
  try {
    const roomId = req.params.roomId;
    app.log.info(`Attempting to delete room: ${roomId}`);

    // 1. Check if room exists
    const roomPath = join(ROOMS_DIR, roomId);
    try {
      await fs.access(roomPath);
    } catch (err) {
      app.log.info(`Room ${roomId} not found`);
      return res.status(404).send({
        success: false,
        message: "Room not found",
      });
    }

    // 2. Close any active connections to the room
    const activeRoom = rooms.get(roomId);
    if (activeRoom && !activeRoom.room.isClosed()) {
      app.log.info(`Closing active connections to room ${roomId}`);
      activeRoom.room.close();
      rooms.delete(roomId);
    }

    // 3. Delete the room file
    await fs.unlink(roomPath);
    app.log.info(`Room ${roomId} deleted successfully`);

    return res.status(200).send({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (err) {
    app.log.error(`Error deleting room: ${err.message}`);
    return res.status(500).send({
      success: false,
      message: "Error deleting room",
      error: err.message,
    });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const distPath = resolve("./dist");

  // Create middleware to serve static files with proper content type
  const serveStaticFile = async (req, reply, filepath) => {
    try {
      const content = await readFile(filepath);

      // Set content type based on file extension
      const ext = filepath.split(".").pop().toLowerCase();
      const contentType = {
        js: "application/javascript",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        ico: "image/x-icon",
        html: "text/html",
        json: "application/json",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
        otf: "font/otf",
        eot: "application/vnd.ms-fontobject",
      }[ext] || "application/octet-stream";

      return reply.type(contentType).send(content);
    } catch (err) {
      app.log.error(`Error serving file ${filepath}: ${err.message}`);
      throw err;
    }
  };

  // Serve index.html for the root path
  app.get("/", async (req, reply) => {
    try {
      return await serveStaticFile(req, reply, join(distPath, "index.html"));
    } catch (err) {
      return reply.status(500).send("Server error");
    }
  });

  // Handle static assets in the root directory
  app.get("/:file", async (req, reply) => {
    const file = req.params.file;

    // Skip API routes
    if (
      file.startsWith("api") ||
      file.startsWith("connect") ||
      file.startsWith("uploads") ||
      file.startsWith("unfurl") ||
      file.startsWith("debug") ||
      file.startsWith("health")
    ) {
      return; // Let the next handler handle it
    }

    try {
      return await serveStaticFile(req, reply, join(distPath, file));
    } catch (err) {
      if (err.code === "ENOENT") {
        // If file doesn't exist, serve index.html (for SPA routing)
        return await serveStaticFile(req, reply, join(distPath, "index.html"));
      }
      return reply.status(404).send("Not found");
    }
  });

  // Handle nested assets in the assets directory
  app.get("/assets/:file", async (req, reply) => {
    const file = req.params.file;
    try {
      return await serveStaticFile(req, reply, join(distPath, "assets", file));
    } catch (err) {
      return reply.status(404).send("Asset not found");
    }
  });

  // Catch-all route for SPA
  app.get("*", async (req, reply) => {
    // Skip API routes
    if (
      req.url.startsWith("/api") ||
      req.url.startsWith("/connect") ||
      req.url.startsWith("/uploads") ||
      req.url.startsWith("/unfurl") ||
      req.url.startsWith("/debug") ||
      req.url.startsWith("/health")
    ) {
      return;
    }

    try {
      return await serveStaticFile(req, reply, join(distPath, "index.html"));
    } catch (err) {
      return reply.status(500).send("Server error");
    }
  });
}

// Start the server

const httpServer = createServer(app);
httpServer.listen(5858, "0.0.0.0", () => {
  console.log("Server started on port 5858");
});
const server = { server: httpServer };
// Handle WebSocket connections on the server's 'upgrade' event
server.server.on("upgrade", async (request, socket, head) => {
  // Parse the URL to extract the roomId
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathParts = url.pathname.split("/");
  const connectIndex = pathParts.indexOf("connect");

  // Check if this is a WebSocket request for our endpoint
  if (connectIndex === -1 || pathParts.length <= connectIndex + 1) {
    socket.destroy();
    return;
  }

  const roomId = pathParts[connectIndex + 1];
  const userId = url.searchParams.get("userId") ||
    url.searchParams.get("sessionId");

  if (!userId) {
    app.log.error("WebSocket connection without userId rejected");
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  app.log.info(`WebSocket connection request: room=${roomId}, user=${userId}`);

  // Handle WebSocket connection
  wss.handleUpgrade(request, socket, head, async (ws) => {
    try {
      // Get or create the room
      const room = await makeOrLoadRoom(roomId);

      // Connect the WebSocket to the room
      room.handleSocketConnect({
        sessionId: userId,
        socket: ws,
      });

      app.log.info(`User ${userId} connected to room ${roomId}`);
    } catch (error) {
      app.log.error(`Error connecting to room ${roomId}:`, error);
      if (ws.readyState === ws.OPEN) {
        ws.close(1011, "Error connecting to room");
      }
    }
  });
});

app.log.info(`Server started on port ${PORT}`);
app.log.info(
  `WebSocket server ready for connections at ws://0.0.0.0:${PORT}/connect/:roomId`,
);
