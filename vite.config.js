import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    proxy: {
      "/connect": {
        target: "ws://localhost:5858",
        ws: true,
        changeOrigin: true,
        // Add logging for debugging
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url,
            );
          });
          proxy.on("proxyReqWs", (_proxyReq, req, _socket, _options, _head) => {
            console.log("WebSocket connected:", req.url);
          });
        },
      },
      "/uploads": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
      "/unfurl": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
    },
  },
});
