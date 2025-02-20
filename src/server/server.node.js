import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import fastify from "fastify";
import { join, resolve } from "path";
import { loadAsset, storeAsset } from "./assets.js";
import { makeOrLoadRoom } from "./rooms.js";
import { unfurl } from "./unfurl.js";
import { readFile } from "fs/promises";

const PORT = process.env.PORT || 5858;

// For this example we use a simple fastify server with the official websocket plugin
// To keep things simple we're skipping normal production concerns like rate limiting and input validation.
const app = fastify();
app.register(websocketPlugin);
app.register(cors, { origin: "*" });

app.register(async (app) => {
  // This is the main entrypoint for the multiplayer sync
  app.get("/connect/:roomId", { websocket: true }, async (socket, req) => {
    // The roomId comes from the URL pathname
    const roomId = req.params.roomId;
    // The sessionId is passed from the client as a query param,
    // you need to extract it and pass it to the room.
    const sessionId = req.query?.["sessionId"];

    console.log(
      `WebSocket connection received: room=${roomId}, session=${sessionId}`,
    );

    // Here we make or get an existing instance of TLSocketRoom for the given roomId
    const room = await makeOrLoadRoom(roomId);
    // and finally connect the socket to the room
    room.handleSocketConnect({ sessionId, socket });
  });

  // To enable blob storage for assets, we add a simple endpoint supporting PUT and GET requests
  // But first we need to allow all content types with no parsing, so we can handle raw data
  app.addContentTypeParser("*", (_, __, done) => done(null));
  app.put("/uploads/:id", {}, async (req, res) => {
    const id = req.params.id;
    await storeAsset(id, req.raw);
    res.send({ ok: true });
  });
  app.get("/uploads/:id", async (req, res) => {
    const id = req.params.id;
    const data = await loadAsset(id);
    res.send(data);
  });

  // To enable unfurling of bookmarks, we add a simple endpoint that takes a URL query param
  app.get("/unfurl", async (req, res) => {
    const url = req.query.url;
    res.send(await unfurl(url));
  });
});

// Add a health check endpoint
app.get("/health", async (req, res) => {
  res.send({ status: "ok" });
});

// Serve static files (useful in production)
if (process.env.NODE_ENV === "production") {
  const distPath = resolve("./dist");

  // Simplified static file server without fastify-static
  app.get("/", async (req, reply) => {
    return reply.type("text/html").send(
      await readFile(join(distPath, "index.html")),
    );
  });

  // Handle static assets
  app.get("/:file", async (req, reply) => {
    const file = req.params.file;
    try {
      const content = await readFile(join(distPath, file));

      // Set content type based on file extension
      const ext = file.split(".").pop();
      const contentType = {
        js: "application/javascript",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        ico: "image/x-icon",
      }[ext] || "application/octet-stream";

      return reply.type(contentType).send(content);
    } catch (err) {
      // If file doesn't exist but it's not an API path, serve index.html (for SPA routing)
      if (
        err.code === "ENOENT" &&
        !file.startsWith("connect") &&
        !file.startsWith("uploads") &&
        !file.startsWith("unfurl")
      ) {
        return reply.type("text/html").send(
          await readFile(join(distPath, "index.html")),
        );
      }
      throw err;
    }
  });

  // Handle nested assets in directories
  app.get("/assets/:file", async (req, reply) => {
    const file = req.params.file;
    try {
      const content = await readFile(join(distPath, "assets", file));

      // Set content type based on file extension
      const ext = file.split(".").pop();
      const contentType = {
        js: "application/javascript",
        css: "text/css",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
      }[ext] || "application/octet-stream";

      return reply.type(contentType).send(content);
    } catch (err) {
      throw err;
    }
  });
}

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server started on port ${PORT}`);
});
