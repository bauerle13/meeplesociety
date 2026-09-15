---
---
document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("featured-ranking");

  const { data, error } = await supabaseClient
    .from("rankings")
    .select("id, title, description")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    el.innerHTML = `<div class="card"><p>No rankings published yet — check back soon.</p></div>`;
    return;
  }

  el.innerHTML = `
    <a class="card" style="text-decoration:none; display:block;" href="{{ "/rankings/view/" | relative_url }}?id=${data.id}">
      <div class="meta">Ranking</div>
      <h3>${escapeHtml(data.title)}</h3>
      <p>${escapeHtml(data.description || "")}</p>
    </a>
  `;
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
