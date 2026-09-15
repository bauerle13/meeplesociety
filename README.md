# The Meeple Society — website

Static site (GitHub Pages, Jekyll's built-in `{% include %}` for shared
header/footer, no theme/layouts) backed by Supabase for data + auth.

## 1. Repo setup

1. Create the GitHub repo (e.g. `meeple-society/meeple-society.github.io` for
   prod, or `meeple-society/prod` — whatever naming matches how you want the
   custom domain to attach).
2. Push this folder as the initial commit.
3. Repeat for a second repo/branch for **dev** — a separate repo is cleanest
   since it keeps the Pages URLs and Supabase projects fully independent.
4. In each repo's Settings → Pages, enable GitHub Pages from the `main` branch.

## 2. Supabase setup

1. Create two Supabase projects: `meeple-society-prod` and `meeple-society-dev`.
2. In each project's SQL editor, run `supabase/schema.sql`.
3. In each project's Settings → API, copy the **Project URL** and **anon public
   key** (never the `service_role` key).
4. Paste those into `js/supabase-client.js` — the prod site's copy gets the
   prod project's values, the dev site's copy gets the dev project's values.
5. In Authentication → Users, create your admin login (email + password).

## 3. Local preview

GitHub Pages runs Jekyll automatically on push, so to preview `{% include %}`
locally you need Jekyll installed:

```
gem install bundler jekyll
jekyll serve
```

Then visit `http://localhost:4000`.

## 4. What's scaffolded so far

- `index.html` — homepage with placeholder sections for videos, podcast
  episodes, and featured ranking (real data wiring comes next)
- `_includes/header.html` / `footer.html` — shared chrome, pulled into every
  page with `{% include header.html title="Page Name" %}`
- `css/style.css` — full design system (colors, type, components)
- `admin/login.html` + `admin/index.html` — Supabase Auth-gated admin shell
- `js/supabase-client.js` — Supabase client + `requireAdmin()` helper for
  gating admin pages
- `supabase/schema.sql` — full database schema + row-level security policies

## 5. Not built yet (next steps, per the build order)

- `rankings.html` (public) + `admin/rankings-admin.html` (builder UI)
- `admin/posts-admin.html`
- `.github/workflows/youtube-sync.yml` + `rss-sync.yml`
- `tracker.html` + `admin/tracker-admin.html`
- `reviews.html` + `map.html` + `admin/reviews-admin.html`
- `links.html`

## Notes on conventions used here

- Internal asset paths are relative with no leading slash (`css/style.css`,
  not `/css/style.css`) so the site works whether it's served at a domain
  root (prod) or a subpath (dev).
- No `_layouts` folder — pages include `header.html`/`footer.html` directly,
  the same pattern used on your other sites.
