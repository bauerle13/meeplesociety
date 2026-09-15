# The Meeple Society — website

Static site (GitHub Pages, Jekyll's built-in `{% include %}` for shared
header/footer, no theme/layouts) backed by Supabase for data + auth.
Every internal page uses **pretty, extensionless URLs**.

## 1. Repo setup

1. Create the GitHub repo (e.g. `meeple-society/meeple-society.github.io` for
   prod, or `meeple-society/prod` — whatever naming matches how you want the
   custom domain to attach).
2. Push this folder as the initial commit.
3. Repeat for a second repo/branch for **dev** — a separate repo is cleanest
   since it keeps the Pages URLs and Supabase projects fully independent.
4. In each repo's Settings → Pages, enable GitHub Pages from the `main` branch.
5. **In the dev repo only**, edit `_config.yml` and set `baseurl` to the
   dev repo's name, e.g. `baseurl: "/meeple-society-dev"`, if the dev site is
   served at `username.github.io/repo-name/` rather than a custom domain.
   Leave `baseurl: ""` on prod. Every template uses the `relative_url` filter,
   which reads this value automatically — no other changes needed per
   environment.

## 2. How the pretty URLs work

Every page lives in its own folder as `index.html` — e.g. `rankings/index.html`
serves at `/rankings/`, not `/rankings/index.html`. `_config.yml` sets
`permalink: pretty` and every internal `<a href>`/`<script src>` uses Liquid's
`relative_url` filter (e.g. `{{ "/rankings/" | relative_url }}`) instead of a
hardcoded path, so links resolve correctly whether the site sits at a domain
root (prod) or a subpath (dev).

If you add a new page, follow the same pattern: create `<name>/index.html`
with `---\n---\n` front matter at the top (required for Jekyll to process the
Liquid tags), and link to it with `{{ "/name/" | relative_url }}`.

## 3. Supabase setup

1. Create two Supabase projects: `meeple-society-prod` and `meeple-society-dev`.
2. In each project's SQL editor, run `supabase/schema.sql`.
3. In each project's Settings → API, copy the **Project URL** and **anon public
   key** (never the `service_role` key).
4. Paste those into `js/supabase-client.js` — the prod site's copy gets the
   prod project's values, the dev site's copy gets the dev project's values.
5. In Authentication → Users, create your admin login (email + password).

## 4. Local preview

GitHub Pages runs Jekyll automatically on push, so to preview locally:

```
gem install bundler jekyll
jekyll serve
```

Then visit `http://localhost:4000`.

## 5. What's built so far

- `index.html` — homepage; the "Featured ranking" section pulls the most
  recently published ranking live from Supabase
- `rankings/` — public list of all published rankings
- `rankings/view/` — single ranking detail, reads `?id=` and renders the
  ranked games with blurbs
- `admin/login/` + `admin/` — Supabase Auth-gated dashboard shell
- `admin/rankings-admin/` — the rankings builder: create/edit rankings,
  toggle published, add games (creates the game if it doesn't exist yet),
  reorder with up/down, remove
- `tracker/`, `reviews/`, `map/`, `links/` — placeholder pages so nav links
  don't 404 yet
- `js/supabase-client.js` — client init + `requireAdmin()` / `signOut()`
- `supabase/schema.sql` — full schema + row-level security policies

## 6. Not built yet (next steps, per the build order)

- `admin/posts-admin/` + real post/video/episode feeds on the homepage
- `.github/workflows/youtube-sync.yml` + `rss-sync.yml`
- `admin/tracker-admin/` + public `tracker/` content
- `admin/reviews-admin/` + real `reviews/` and `map/` content
- Real content on `links/`

## Notes on conventions used here

- No `_layouts` folder — pages include `header.html`/`footer.html` directly.
- Pretty URLs via folder + `index.html`, with `relative_url` for every
  internal link and asset path — works unmodified on both environments.
