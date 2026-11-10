export const ADMIN_COOKIE = "np_admin";

const DEFAULT_ADMIN_EMAIL = "navee309010@gmail.com";

export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

export function supabaseAuthConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ervfizmcgcatlwynupbt.supabase.co",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_IJTTMi5K-ariqsakvSrYiA_LmeINzor",
  };
}

export async function adminEmailForToken(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const { url, anonKey } = supabaseAuthConfig();
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${trimmed}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { email?: string };
    const email = user.email || "";
    return isAdminEmail(email) ? email : null;
  } catch {
    return null;
  }
}
