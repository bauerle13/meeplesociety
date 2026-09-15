const SUPABASE_URL = "https://grutacatrscglmhbkalc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdydXRhY2F0cnNjZ2xtaGJrYWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzI1NTksImV4cCI6MjEwNTA0ODU1OX0.DeL34T6qKr8Zk1B9hkIu30cUNsM3tMHOvd0rfP6LyRw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Redirects to the login page if there's no active session.
// Call this at the top of every admin page.
async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "{{ "/admin/login/" | relative_url }}";
    return null;
  }
  return session;
}

async function signOut() {
  await supabaseClient.auth.signOut();
  window.location.href = "{{ "/admin/login/" | relative_url }}";
}
