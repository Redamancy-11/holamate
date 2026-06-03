const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { getJson } = require("serpapi");

async function test() {
  const apiKey = process.env.SERPAPI_API_KEY;
  try {
    console.log('--- Google Web Search Test ---');
    const json = await getJson({
      engine: "google",
      q: "Bún bò Huế Ngô Thúy Hòa Lạc menu review",
      api_key: apiKey
    });
    console.log('Organic results count:', json.organic_results ? json.organic_results.length : 0);
    if (json.organic_results) {
      json.organic_results.slice(0, 3).forEach((res, i) => {
        console.log(`[${i}] Title:`, res.title);
        console.log(`[${i}] Snippet:`, res.snippet);
      });
    }
  } catch (err) {
    console.error('Error running test:', err);
  }
}

test();
