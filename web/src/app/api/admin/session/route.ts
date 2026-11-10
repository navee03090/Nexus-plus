import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminEmailForToken } from "@/lib/adminAccess";

export async function POST(request: Request) {
  let accessToken = "";
  try {
    const body = (await request.json()) as { access_token?: string };
    accessToken = body.access_token || "";
  } catch {
    accessToken = "";
  }

  const email = accessToken ? await adminEmailForToken(accessToken) : null;
  if (!email) {
    return NextResponse.json({ error: "This account cannot open the admin area." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
