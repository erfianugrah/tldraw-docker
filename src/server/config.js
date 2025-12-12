import { resolve } from "path";

// Server configuration
export const PORT = process.env.PORT || 5858;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

// Directory paths
export const BASE_DIR = process.env.BASE_DIR || ".";
export const ROOMS_DIR = process.env.ROOMS_DIR || resolve(BASE_DIR, "./.rooms");
export const ASSETS_DIR = process.env.ASSETS_DIR || resolve(BASE_DIR, "./.assets");

// Time intervals
export const ROOM_PERSISTENCE_INTERVAL_MS =
  parseInt(process.env.ROOM_PERSISTENCE_INTERVAL_MS, 10) || 2000;

// Logging
export const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? "info" : "debug");

// CORS configuration
export const CORS_ENABLED = process.env.CORS_ENABLED !== "false";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Export all environment variables for convenient access
export const env = {
  PORT,
  NODE_ENV,
  IS_PRODUCTION,
  BASE_DIR,
  ROOMS_DIR,
  ASSETS_DIR,
  ROOM_PERSISTENCE_INTERVAL_MS,
  LOG_LEVEL,
  CORS_ENABLED,
  CORS_ORIGIN,
};

export default env;
