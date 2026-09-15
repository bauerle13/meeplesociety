const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---- Fill in your 5 playlists here ----
// youtube_playlist_id: the "list=" value from the playlist's YouTube URL
// slug: used in the page URL, e.g. /videos/?playlist=reviews
const PLAYLISTS = [
  { name: "Reviews", slug: "reviews", youtube_playlist_id: "REPLACE_ME_1" },
  { name: "Playthroughs", slug: "playthroughs", youtube_playlist_id: "REPLACE_ME_2" },
  { name: "Top 10s", slug: "top-10s", youtube_playlist_id: "REPLACE_ME_3" },
  { name: "News & Announcements", slug: "news", youtube_playlist_id: "REPLACE_ME_4" },
  { name: "Podcast Clips", slug: "podcast-clips", youtube_playlist_id: "REPLACE_ME_5" },
];

function supabaseHeaders(returnRepresentation = false) {
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: "resolution=merge-duplicates",
  };
  if (returnRepresentation) headers.Prefer += ",return=representation";
  return headers;
}

async function upsert(table, rows, onConflict, returnRepresentation = false) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: supabaseHeaders(returnRepresentation),
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert into ${table} failed (${res.status}): ${text}`);
  }
  return returnRepresentation ? res.json() : null;
}

async function fetchPlaylistItems(playlistId, maxResults = 50) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${YT_API_KEY}`
  );
  const data = await res.json();
  return (data.items || []).filter((item) => item.snippet?.resourceId?.videoId);
}

function toVideoRow(item) {
  return {
    youtube_id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnail_url: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
    published_at: item.snippet.publishedAt,
  };
}

async function main() {
  for (const [name, val] of Object.entries({ YT_API_KEY, CHANNEL_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
    if (!val) throw new Error(`Missing required env var: ${name}`);
  }

  const unfilled = PLAYLISTS.filter((p) => p.youtube_playlist_id.startsWith("REPLACE_ME"));
  if (unfilled.length) {
    console.log(`Skipping ${unfilled.length} playlist(s) still using placeholder IDs: ${unfilled.map((p) => p.name).join(", ")}`);
  }
  const activePlaylists = PLAYLISTS.filter((p) => !p.youtube_playlist_id.startsWith("REPLACE_ME"));

  // 1. All uploads → `videos` table (this is what "All Videos" shows).
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${YT_API_KEY}`
  );
  const channelData = await channelRes.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error("Couldn't find an uploads playlist for that channel ID.");

  const uploadItems = await fetchPlaylistItems(uploadsPlaylistId);
  const videoIdMap = {}; // youtube_id -> supabase uuid

  if (uploadItems.length) {
    const rows = uploadItems.map(toVideoRow);
    const inserted = await upsert("videos", rows, "youtube_id", true);
    inserted.forEach((v) => { videoIdMap[v.youtube_id] = v.id; });
    console.log(`Synced ${rows.length} video(s) from uploads.`);
  } else {
    console.log("No videos found in the uploads playlist.");
  }

  if (!activePlaylists.length) {
    console.log("No named playlists configured yet — skipping playlist tagging.");
    return;
  }

  // 2. Named playlists → `playlists` table.
  const playlistRows = activePlaylists.map((p, i) => ({
    youtube_playlist_id: p.youtube_playlist_id,
    name: p.name,
    slug: p.slug,
    sort_order: i,
  }));
  const insertedPlaylists = await upsert("playlists", playlistRows, "youtube_playlist_id", true);
  const playlistIdMap = {}; // youtube_playlist_id -> supabase uuid
  insertedPlaylists.forEach((p) => { playlistIdMap[p.youtube_playlist_id] = p.id; });

  // 3. Each playlist's videos → make sure they're in `videos` too, then tag them.
  const membershipRows = [];

  for (const playlist of activePlaylists) {
    const items = await fetchPlaylistItems(playlist.youtube_playlist_id);
    if (!items.length) {
      console.log(`No videos found in playlist "${playlist.name}".`);
      continue;
    }

    const newOnes = items.filter((item) => !videoIdMap[item.snippet.resourceId.videoId]);
    if (newOnes.length) {
      const rows = newOnes.map(toVideoRow);
      const inserted = await upsert("videos", rows, "youtube_id", true);
      inserted.forEach((v) => { videoIdMap[v.youtube_id] = v.id; });
    }

    const playlistSupabaseId = playlistIdMap[playlist.youtube_playlist_id];
    for (const item of items) {
      const videoId = videoIdMap[item.snippet.resourceId.videoId];
      if (videoId) membershipRows.push({ video_id: videoId, playlist_id: playlistSupabaseId });
    }

    console.log(`Tagged ${items.length} video(s) in playlist "${playlist.name}".`);
  }

  if (membershipRows.length) {
    await upsert("video_playlists", membershipRows, "video_id,playlist_id");
  }

  console.log("Playlist sync complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});