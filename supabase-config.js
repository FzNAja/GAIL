window.GAIL_SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
};

const { url, anonKey } = window.GAIL_SUPABASE_CONFIG;
window.gailSupabase =
  window.supabase && url && anonKey
    ? window.supabase.createClient(url, anonKey)
    : null;
