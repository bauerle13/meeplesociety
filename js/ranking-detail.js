document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("ranking-detail");
  const id = new URLSearchParams(window.location.search).get("id");

  if (!id) {
    container.innerHTML = "<p>No ranking specified.</p>";
    return;
  }

  const { data: ranking, error: rankingError } = await supabaseClient
    .from("rankings")
    .select("id, title, description")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (rankingError || !ranking) {
    container.innerHTML = "<p>That ranking couldn't be found.</p>";
    return;
  }

  const { data: items, error: itemsError } = await supabaseClient
    .from("ranking_items")
    .select("rank, blurb, games ( name, image_url, year_published )")
    .eq("ranking_id", id)
    .order("rank", { ascending: true });

  if (itemsError) {
    container.innerHTML = "<p>Couldn't load the games in this ranking.</p>";
    return;
  }

  const rows = items.map((item) => `
    <div class="card" style="display:flex; gap:1rem; align-items:flex-start;">
      <div style="font-family:var(--font-head); font-weight:800; font-size:1.5rem; color:var(--marigold); min-width:2.5rem;">
        #${item.rank}
      </div>
      <div>
        <h3>${escapeHtml(item.games?.name || "Unknown game")}${item.games?.year_published ? ` <span style="color:var(--walnut); font-weight:400; font-size:0.85rem;">(${item.games.year_published})</span>` : ""}</h3>
        <p>${escapeHtml(item.blurb || "")}</p>
      </div>
    </div>
  `).join("");

  container.innerHTML = `
    <h1>${escapeHtml(ranking.title)}</h1>
    <p>${escapeHtml(ranking.description || "")}</p>
    <div style="display:flex; flex-direction:column; gap:1rem; margin-top:2rem;">
      ${rows || "<p>No games added to this ranking yet.</p>"}
    </div>
  `;
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
