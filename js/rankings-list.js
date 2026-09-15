---
---
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("rankings-list");

  const { data, error } = await supabaseClient
    .from("rankings")
    .select("id, title, description, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<div class="card"><p>Couldn't load rankings right now.</p></div>`;
    console.error(error);
    return;
  }

  if (!data.length) {
    container.innerHTML = `<div class="card"><p>No rankings published yet — check back soon.</p></div>`;
    return;
  }

  container.innerHTML = data.map((ranking) => `
    <a class="card" style="text-decoration:none; display:block;" href="{{ "/rankings/view/" | relative_url }}?id=${ranking.id}">
      <div class="meta">Ranking</div>
      <h3>${escapeHtml(ranking.title)}</h3>
      <p>${escapeHtml(ranking.description || "")}</p>
    </a>
  `).join("");
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
