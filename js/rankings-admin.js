let currentRanking = null;
let currentItems = [];

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;

  await loadRankingList();
  await loadGameSuggestions();

  document.getElementById("new-ranking-btn").addEventListener("click", createRanking);
  document.getElementById("save-ranking-btn").addEventListener("click", saveRankingDetails);
  document.getElementById("add-item-btn").addEventListener("click", addItem);
});

async function loadRankingList() {
  const listEl = document.getElementById("ranking-pick-list");
  const { data, error } = await supabaseClient
    .from("rankings")
    .select("id, title, published")
    .order("created_at", { ascending: false });

  if (error) {
    listEl.innerHTML = `<p style="padding:0.8rem;">Couldn't load rankings.</p>`;
    return;
  }

  if (!data.length) {
    listEl.innerHTML = `<p style="padding:0.8rem;">No rankings yet — create one above.</p>`;
    return;
  }

  listEl.innerHTML = data.map((r) => `
    <button data-id="${r.id}" class="${currentRanking && currentRanking.id === r.id ? "active" : ""}">
      ${escapeHtml(r.title)} ${r.published ? "" : "<em>(draft)</em>"}
    </button>
  `).join("");

  listEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => selectRanking(btn.dataset.id));
  });
}

async function createRanking() {
  const title = prompt("Title for the new ranking:");
  if (!title) return;

  const { data, error } = await supabaseClient
    .from("rankings")
    .insert({ title, published: false })
    .select()
    .single();

  if (error) {
    alert("Couldn't create ranking: " + error.message);
    return;
  }

  await loadRankingList();
  selectRanking(data.id);
}

async function selectRanking(id) {
  const { data: ranking, error } = await supabaseClient
    .from("rankings")
    .select("id, title, description, published")
    .eq("id", id)
    .single();

  if (error || !ranking) {
    alert("Couldn't load that ranking.");
    return;
  }

  currentRanking = ranking;

  document.getElementById("no-selection").style.display = "none";
  document.getElementById("builder-panel").style.display = "block";
  document.getElementById("rt-title").value = ranking.title;
  document.getElementById("rt-desc").value = ranking.description || "";
  document.getElementById("rt-published").checked = ranking.published;

  await loadItems();
  await loadRankingList();
}

async function loadItems() {
  const { data, error } = await supabaseClient
    .from("ranking_items")
    .select("id, rank, blurb, games ( id, name )")
    .eq("ranking_id", currentRanking.id)
    .order("rank", { ascending: true });

  if (error) {
    document.getElementById("items-list").innerHTML = "<p>Couldn't load games.</p>";
    return;
  }

  currentItems = data;
  renderItems();
}

function renderItems() {
  const el = document.getElementById("items-list");
  if (!currentItems.length) {
    el.innerHTML = "<p>No games added yet.</p>";
    return;
  }

  el.innerHTML = currentItems.map((item, idx) => `
    <div class="item-row">
      <div class="item-rank">#${item.rank}</div>
      <div style="flex:1;">
        <strong>${escapeHtml(item.games?.name || "Unknown game")}</strong>
        <p style="margin:0.2rem 0 0; font-size:0.9rem;">${escapeHtml(item.blurb || "")}</p>
      </div>
      <div class="item-actions">
        <button data-action="up" data-idx="${idx}" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button data-action="down" data-idx="${idx}" ${idx === currentItems.length - 1 ? "disabled" : ""}>↓</button>
        <button data-action="delete" data-idx="${idx}">✕</button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => handleItemAction(btn.dataset.action, parseInt(btn.dataset.idx)));
  });
}

async function handleItemAction(action, idx) {
  if (action === "delete") {
    const item = currentItems[idx];
    if (!confirm("Remove this game from the ranking?")) return;
    await supabaseClient.from("ranking_items").delete().eq("id", item.id);
    await loadItems();
    return;
  }

  const swapIdx = action === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= currentItems.length) return;

  const a = currentItems[idx];
  const b = currentItems[swapIdx];

  // Swap rank values between the two items.
  await supabaseClient.from("ranking_items").update({ rank: b.rank }).eq("id", a.id);
  await supabaseClient.from("ranking_items").update({ rank: a.rank }).eq("id", b.id);

  await loadItems();
}

async function addItem() {
  const nameInput = document.getElementById("game-name");
  const blurbInput = document.getElementById("item-blurb");
  const name = nameInput.value.trim();
  if (!name) return;

  // Find an existing game by name (case-insensitive), or create one.
  let { data: existing } = await supabaseClient
    .from("games")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  let gameId = existing?.id;

  if (!gameId) {
    const { data: newGame, error: gameError } = await supabaseClient
      .from("games")
      .insert({ name })
      .select()
      .single();

    if (gameError) {
      alert("Couldn't create game: " + gameError.message);
      return;
    }
    gameId = newGame.id;
    await loadGameSuggestions();
  }

  const nextRank = currentItems.length ? Math.max(...currentItems.map((i) => i.rank)) + 1 : 1;

  const { error: itemError } = await supabaseClient
    .from("ranking_items")
    .insert({ ranking_id: currentRanking.id, game_id: gameId, rank: nextRank, blurb: blurbInput.value.trim() || null });

  if (itemError) {
    alert("Couldn't add game to ranking: " + itemError.message);
    return;
  }

  nameInput.value = "";
  blurbInput.value = "";
  await loadItems();
}

async function saveRankingDetails() {
  const title = document.getElementById("rt-title").value.trim();
  const description = document.getElementById("rt-desc").value.trim();
  const published = document.getElementById("rt-published").checked;

  const { error } = await supabaseClient
    .from("rankings")
    .update({ title, description, published })
    .eq("id", currentRanking.id);

  if (error) {
    alert("Couldn't save: " + error.message);
    return;
  }

  currentRanking.title = title;
  await loadRankingList();
  alert("Saved.");
}

async function loadGameSuggestions() {
  const { data } = await supabaseClient.from("games").select("name").order("name");
  const list = document.getElementById("game-suggestions");
  if (!list || !data) return;
  list.innerHTML = data.map((g) => `<option value="${escapeHtml(g.name)}">`).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
