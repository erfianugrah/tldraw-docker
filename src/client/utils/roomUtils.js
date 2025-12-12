/**
 * Sanitizes a room name to ensure it's URL-safe and follows naming conventions
 * @param {string} roomName - The raw room name to sanitize
 * @returns {string} The sanitized room name
 */
export function sanitizeRoomName(roomName) {
  if (!roomName || typeof roomName !== "string") {
    return "";
  }

  return roomName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Generates a random room name using adjectives, nouns, and numbers
 * @returns {string} A randomly generated room name
 */
export function generateRandomRoomName() {
  const adjectives = ["happy", "clever", "swift", "brave", "calm", "eager", "fair", "kind"];
  const nouns = ["lion", "tiger", "river", "mountain", "forest", "ocean", "star", "moon"];

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);

  return `${adjective}-${noun}-${number}`;
}
