document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("latest-episodes");

  const { data, error } = await supabaseClient
    .from("podcast_episodes")
    .select("title, audio_url, published_at")
    .order("published_at", { ascending: false })
    .limit(6);

  if (error || !data.length) {
    el.innerHTML = `<div class="card"><p>No episodes synced yet.</p></div>`;
    return;
  }

  el.innerHTML = data.map((ep) => `
    <a class="card" data-type="podcast" href="${escapeHtml(ep.audio_url || "#")}" target="_blank" rel="noopener">
      <div class="meta">Episode</div>
      <h3>${escapeHtml(ep.title)}</h3>
    </a>
  `).join("");
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}