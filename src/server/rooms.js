import { TLSocketRoom } from "@tldraw/sync-core";
import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
} from "@tldraw/tlschema";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { ROOMS_DIR, ROOM_PERSISTENCE_INTERVAL_MS } from "./config.js";

// Create a schema that includes the default shapes and bindings
const schema = createTLSchema({
  shapes: defaultShapeSchemas,
  bindings: defaultBindingSchemas,
});

// Function to read room snapshot from disk
async function readSnapshotIfExists(roomId) {
  try {
    const data = await readFile(join(ROOMS_DIR, roomId));
    console.log(`Successfully read snapshot for room: ${roomId}`);
    return JSON.parse(data.toString()) ?? undefined;
  } catch (e) {
    console.log(`No existing snapshot found for room: ${roomId}`, e.message);
    return undefined;
  }
}

// Function to save room snapshot to disk
async function saveSnapshot(roomId, snapshot) {
  try {
    await mkdir(ROOMS_DIR, { recursive: true });
    await writeFile(join(ROOMS_DIR, roomId), JSON.stringify(snapshot));
    console.log(`Successfully saved snapshot for room: ${roomId}`);
  } catch (e) {
    console.error(`Error saving snapshot for room: ${roomId}`, e);
  }
}

// We'll keep an in-memory map of rooms and their data
/**
 * @typedef {Object} RoomState
 * @property {TLSocketRoom<any, void>} room
 * @property {string} id
 * @property {boolean} needsPersist
 */

/** @type {Map<string, RoomState>} */
export const rooms = new Map();

// Very simple mutex using promise chaining, to avoid race conditions
// when loading rooms. In production you probably want one mutex per room
// to avoid unnecessary blocking!
let mutex = Promise.resolve(null);

/**
 * Get or create a TLSocketRoom for a given room ID
 * @param {string} roomId - The ID of the room to get or create
 * @returns {Promise<TLSocketRoom>} - The TLSocketRoom instance
 */
export async function makeOrLoadRoom(roomId) {
  mutex = mutex
    .then(async () => {
      if (rooms.has(roomId)) {
        const roomState = await rooms.get(roomId);
        if (!roomState.room.isClosed()) {
          console.log(`Using existing room: ${roomId}`);
          return null; // all good
        }
      }
      console.log(`Creating/loading room: ${roomId}`);
      const initialSnapshot = await readSnapshotIfExists(roomId);

      // Create TLSocketRoom instance first
      const socketRoom = new TLSocketRoom({
        schema, // Pass the schema to ensure proper validation
        initialSnapshot,
        onSessionRemoved(room, args) {
          console.log(
            `Client disconnected: sessionId=${args.sessionId}, roomId=${roomId}, remainingSessions=${args.numSessionsRemaining}`,
          );
          if (args.numSessionsRemaining === 0) {
            console.log(`No clients left, closing room: ${roomId}`);
            room.close();
          }
        },
        onDataChange() {
          console.log(`Data changed in room: ${roomId}`);
          // Use the rooms Map instead of the not-yet-initialized roomState
          const state = rooms.get(roomId);
          if (state) {
            state.needsPersist = true;
          }
        },
      });
      
      // Now create the roomState object
      const roomState = {
        needsPersist: false,
        id: roomId,
        room: socketRoom,
      };
      rooms.set(roomId, roomState);
      console.log(`Room created/loaded: ${roomId}`);
      return null; // all good
    })
    .catch((error) => {
      // return errors as normal values to avoid stopping the mutex chain
      console.error(`Error in mutex chain for room: ${roomId}`, error);
      return error;
    });

  const err = await mutex;
  if (err) {
    console.error(`Error making/loading room: ${roomId}`, err);
    throw err;
  }

  const roomState = rooms.get(roomId);

  if (!roomState) {
    console.error(
      `Room state not found for room: ${roomId} after mutex operation`,
    );
    throw new Error(`Room state not found for room: ${roomId}`);
  }

  return roomState.room;
}

/**
 * Get information about all active rooms
 * @returns {Array<Object>} - Array of room information objects
 */
export function getActiveRooms() {
  const activeRooms = [];
  for (const [id, roomState] of rooms.entries()) {
    // Use getSessions to get all active sessions
    let activeClients = 0;
    try {
      activeClients = roomState.room.getSessions().length;
    } catch (error) {
      console.error(`Error getting session count for room ${id}:`, error);
    }

    activeRooms.push({
      id,
      isClosed: roomState.room.isClosed(),
      needsPersist: roomState.needsPersist,
      activeClients,
    });
  }
  return activeRooms;
}

// Do persistence on a regular interval.
// In production you probably want a smarter system with throttling.
setInterval(() => {
  for (const roomState of rooms.values()) {
    if (roomState.needsPersist) {
      // persist room
      roomState.needsPersist = false;
      console.log("saving snapshot", roomState.id);
      saveSnapshot(roomState.id, roomState.room.getCurrentSnapshot());
    }
    if (roomState.room.isClosed()) {
      console.log("deleting room", roomState.id);
      rooms.delete(roomState.id);
    }
  }
}, ROOM_PERSISTENCE_INTERVAL_MS);