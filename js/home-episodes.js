---
---
document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("latest-episodes");

  const { data, error } = await supabaseClient
    .from("podcast_episodes")
    .select("title, audio_url, description, thumbnail_url, published_at")
    .order("published_at", { ascending: false })
    .limit(6);

  if (error || !data.length) {
    el.innerHTML = `<div class="card"><p>No episodes synced yet.</p></div>`;
    return;
  }

  el.innerHTML = data.map((ep, i) => `
    <div class="podcast-item">
      <img class="podcast-thumb" src="${escapeHtml(ep.thumbnail_url || "{{ "/assets/logo.png" | relative_url }}")}" alt="">
      <div class="podcast-info">
        <h3>${escapeHtml(ep.title)}</h3>
        <p class="podcast-excerpt">${escapeHtml(excerpt(ep.description))}</p>
      </div>
      <button class="podcast-play-btn" data-index="${i}" aria-label="Play episode">▶</button>
    </div>
  `).join("");

  let currentAudio = null;
  let currentBtn = null;

  el.querySelectorAll(".podcast-play-btn").forEach((btn) => {
    const episode = data[parseInt(btn.dataset.index)];

    btn.addEventListener("click", () => {
      if (!episode.audio_url) return;

      // Clicking the currently-playing episode's button toggles pause/resume.
      if (currentBtn === btn) {
        if (currentAudio.paused) {
          currentAudio.play();
          btn.textContent = "❚❚";
          btn.classList.add("playing");
        } else {
          currentAudio.pause();
          btn.textContent = "▶";
          btn.classList.remove("playing");
        }
        return;
      }

      // Switching to a different episode: stop whatever was playing.
      if (currentAudio) {
        currentAudio.pause();
        if (currentBtn) { currentBtn.textContent = "▶"; currentBtn.classList.remove("playing"); }
      }

      currentAudio = new Audio(episode.audio_url);
      currentBtn = btn;
      currentAudio.play();
      btn.textContent = "❚❚";
      btn.classList.add("playing");

      currentAudio.addEventListener("ended", () => {
        btn.textContent = "▶";
        btn.classList.remove("playing");
      });
    });
  });
});

function excerpt(html) {
  if (!html) return "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? text.slice(0, 140).trim() + "…" : text;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}