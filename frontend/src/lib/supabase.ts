import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

/** Normalize to E.164-ish for India-friendly input. */
export function normalizePhoneInput(raw: string): string {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  if (/^0\d{10}$/.test(trimmed)) return `+91${trimmed.slice(1)}`;
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  if (/^91\d{10}$/.test(trimmed)) return `+${trimmed}`;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}
