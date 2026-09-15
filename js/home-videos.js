document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("latest-videos");

  const { data, error } = await supabaseClient
    .from("videos")
    .select("youtube_id, title, thumbnail_url, published_at")
    .order("published_at", { ascending: false })
    .limit(6);

  if (error || !data.length) {
    el.innerHTML = `<div class="card"><p>No videos synced yet.</p></div>`;
    return;
  }

  el.innerHTML = data.map((v) => `
    <a class="card card-media" data-type="video" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.youtube_id)}" target="_blank" rel="noopener">
      <div class="meta">Video</div>
      ${v.thumbnail_url ? `<img class="card-thumb" src="${escapeHtml(v.thumbnail_url)}" alt="">` : ""}
      <div class="card-body">
        <h3>${escapeHtml(v.title)}</h3>
      </div>
    </a>
  `).join("");
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}