import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function middleware(request: NextRequest) {
  // Local/demo bypass — lets you preview the dashboard before auth is wired up.
  // Set AUTH_DEV_BYPASS=true in .env.local to enable.
  if (process.env.AUTH_DEV_BYPASS === "true") {
    return NextResponse.next();
  }

  const hasSessionCookie = AUTH_COOKIES.some((name) => request.cookies.has(name));
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
