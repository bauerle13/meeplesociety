// Loaded via the Supabase CDN script tag (see admin pages) before this file runs.
// Fill these in per environment — use the PROD project's URL/key on the prod
// GitHub Pages site, and the DEV project's on the dev site. Never put the
// service_role key here — only the public anon key belongs in client code.
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Redirects to the login page if there's no active session.
// Call this at the top of every admin page.
async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return null;
  }
  return session;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
