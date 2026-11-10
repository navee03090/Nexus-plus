import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail, supabaseAuthConfig } from "@/lib/adminAccess";

export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email || "").trim().toLowerCase();
  } catch {
    email = "";
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json({
      ok: true,
      message: "If this email can open the admin area, a link is on its way.",
    });
  }

  const { url, anonKey } = supabaseAuthConfig();
  const redirectTo = `${request.nextUrl.origin}/admin/reset`;
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });

  if (error) {
    return NextResponse.json(
      { error: "The email could not be sent. Wait a minute and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Check your inbox and open the new link on this computer. An older link will not work.",
  });
}
