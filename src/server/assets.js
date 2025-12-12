import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { ASSETS_DIR } from "./config.js";

/**
 * Store an asset to the filesystem
 * @param {string} id - The asset identifier
 * @param {Buffer|string} stream - The asset data
 */
export async function storeAsset(id, stream) {
  try {
    await mkdir(ASSETS_DIR, { recursive: true });
    await writeFile(join(ASSETS_DIR, id), stream);
    console.log(`Successfully stored asset: ${id}`);
  } catch (error) {
    console.error(`Error storing asset: ${id}`, error);
    throw error;
  }
}

/**
 * Load an asset from the filesystem
 * @param {string} id - The asset identifier
 * @returns {Promise<Buffer>} - The asset data
 */
export async function loadAsset(id) {
  try {
    console.log(`Loading asset: ${id}`);
    return await readFile(join(ASSETS_DIR, id));
  } catch (error) {
    console.error(`Error loading asset: ${id}`, error);
    throw error;
  }
}
