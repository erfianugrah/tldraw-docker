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
    proxy: {
      "/connect": {
        target: "ws://localhost:5858",
        ws: true,
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
      "/unfurl": {
        target: "http://localhost:5858",
        changeOrigin: true,
      },
    },
  },
});
