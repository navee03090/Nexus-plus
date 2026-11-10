import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminEmailForToken } from "@/lib/adminAccess";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value || "";
  const email = token ? await adminEmailForToken(token) : null;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";

  if (pathname === "/admin/login" || pathname === "/admin/reset") {
    if (email) {
      const home = request.nextUrl.clone();
      home.pathname = "/admin";
      home.search = "";
      return NextResponse.redirect(home);
    }
    return NextResponse.next();
  }

  if (!email) {
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(ADMIN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
