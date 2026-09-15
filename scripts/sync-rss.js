// Fetches the podcast's RSS feed, parses it, and upserts episodes into
// the Supabase `podcast_episodes` table, keyed on guid.
// Run by .github/workflows/rss-sync.yml, which npm-installs this folder
// first (needs fast-xml-parser).

const { XMLParser } = require("fast-xml-parser");

const RSS_URL = process.env.PODCAST_RSS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  for (const [name, val] of Object.entries({ RSS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
    if (!val) throw new Error(`Missing required env var: ${name}`);
  }

  const feedRes = await fetch(RSS_URL);
  if (!feedRes.ok) {
    throw new Error(`Couldn't fetch the RSS feed (${feedRes.status}).`);
  }
  const xml = await feedRes.text();

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", maxEntityCount: 10000 });
  const feed = parser.parse(xml);

  const rawItems = feed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : [rawItems].filter(Boolean);

  const episodes = items
    .map((item) => ({
      guid: typeof item.guid === "object" ? item.guid["#text"] : item.guid,
      title: typeof item.title === "object" ? item.title["#text"] : item.title,
      audio_url: item.enclosure?.["@_url"] || null,
      description: typeof item.description === "string" ? item.description : (item.description?.["#text"] || null),
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
    }))
    .filter((ep) => ep.guid && ep.audio_url);

  if (!episodes.length) {
    console.log("No episodes found in the feed.");
    return;
  }

  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/podcast_episodes?on_conflict=guid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(episodes),
  });

  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    throw new Error(`Supabase upsert failed (${upsertRes.status}): ${text}`);
  }

  console.log(`Synced ${episodes.length} episode(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});