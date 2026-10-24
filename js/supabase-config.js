/* ================= SUPABASE CLIENT CONFIGURATION ================= */

const SUPABASE_URL = "https://fnuhhqpjbkmmzutqbswm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eO6OumF6WWMxqwRQGlxMzw_3b8Vyu8P";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Supabase JS did not load. Check the Supabase CDN script before supabase-config.js.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
