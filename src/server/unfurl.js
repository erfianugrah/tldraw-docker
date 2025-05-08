import _unfurl from "unfurl.js";

/**
 * Extract metadata from a URL using unfurl.js
 * @param {string} url - The URL to unfurl
 * @returns {Promise<Object>} - The extracted metadata
 */
export async function unfurl(url) {
  try {
    console.log(`Unfurling URL: ${url}`);
    const { title, description, open_graph, twitter_card, favicon } =
      await _unfurl.unfurl(url);

    const image = open_graph?.images?.[0]?.url ||
      twitter_card?.images?.[0]?.url;

    console.log(`Successfully unfurled URL: ${url}`);
    return {
      title: title || "",
      description: description || "",
      image: image || "",
      favicon: favicon || "",
    };
  } catch (error) {
    console.error(`Error unfurling URL: ${url}`, error);
    return {
      title: "",
      description: "",
      image: "",
      favicon: "",
    };
  }
}