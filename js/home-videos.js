const HOME_VIDEO_LIMIT = 8;

document.addEventListener("DOMContentLoaded", async () => {
  const tabsEl = document.getElementById("home-playlist-tabs");
  const gridEl = document.getElementById("latest-videos");

  const [playlistsRes, videosRes] = await Promise.all([
    supabaseClient.from("playlists").select("id, name, slug, sort_order").order("sort_order"),
    supabaseClient
      .from("videos")
      .select("id, youtube_id, title, thumbnail_url, published_at, video_playlists ( playlist_id )")
      .order("published_at", { ascending: false }),
  ]);

  if (videosRes.error || !videosRes.data) {
    gridEl.innerHTML = `<div class="card"><p>No videos synced yet.</p></div>`;
    return;
  }

  const allVideos = videosRes.data;
  const playlists = playlistsRes.data || [];

  function render(filterPlaylistId) {
    const videos = (filterPlaylistId
      ? allVideos.filter((v) => v.video_playlists?.some((vp) => vp.playlist_id === filterPlaylistId))
      : allVideos
    ).slice(0, HOME_VIDEO_LIMIT);

    if (!videos.length) {
      gridEl.innerHTML = `<div class="card"><p>No videos here yet.</p></div>`;
      return;
    }

    gridEl.innerHTML = videos.map((v) => `
      <a class="card card-media" data-type="video" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.youtube_id)}" target="_blank" rel="noopener">
        <div class="meta">Video</div>
        ${v.thumbnail_url ? `<img class="card-thumb" src="${escapeHtml(v.thumbnail_url)}" alt="">` : ""}
        <div class="card-body">
          <h3>${escapeHtml(v.title)}</h3>
        </div>
      </a>
    `).join("");
  }

  function setActiveTab(btn) {
    tabsEl.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  const allBtn = document.createElement("button");
  allBtn.className = "tab-btn active";
  allBtn.textContent = "All Videos";
  allBtn.addEventListener("click", () => { setActiveTab(allBtn); render(null); });
  tabsEl.appendChild(allBtn);

  playlists.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.textContent = p.name;
    btn.addEventListener("click", () => { setActiveTab(btn); render(p.id); });
    tabsEl.appendChild(btn);
  });

  render(null);
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}