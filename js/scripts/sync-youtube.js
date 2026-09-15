// Fetches the channel's recent uploads via the YouTube Data API and
// upserts them into the Supabase `videos` table, keyed on youtube_id.
// Run by .github/workflows/youtube-sync.yml — needs no npm install,
// just Node 18+'s built-in fetch.

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  for (const [name, val] of Object.entries({ YT_API_KEY, CHANNEL_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
    if (!val) throw new Error(`Missing required env var: ${name}`);
  }

  // 1. Look up the channel's "uploads" playlist.
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${YT_API_KEY}`
  );
  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Couldn't find an uploads playlist for that channel ID.");
  }

  // 2. Pull the most recent videos from that playlist.
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=15&key=${YT_API_KEY}`
  );
  const playlistData = await playlistRes.json();

  const videos = (playlistData.items || [])
    .filter((item) => item.snippet?.resourceId?.videoId)
    .map((item) => ({
      youtube_id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      published_at: item.snippet.publishedAt,
    }));

  if (!videos.length) {
    console.log("No videos found in the uploads playlist.");
    return;
  }

  // 3. Upsert into Supabase (relies on the unique constraint on youtube_id).
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/videos?on_conflict=youtube_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(videos),
  });

  if (!upsertRes.ok) {
    const text = await upsertRes.text();
    throw new Error(`Supabase upsert failed (${upsertRes.status}): ${text}`);
  }

  console.log(`Synced ${videos.length} video(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});