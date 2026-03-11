import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

function isAuthRequired(pathname: string): boolean {
  if (pathname.startsWith("/user")) return true;
  if (pathname.startsWith("/consultations/new")) return true;
  if (/^\/consultations\/[^/]+\/advice/.test(pathname)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);

  const hasCookie = request.cookies.has(SESSION_COOKIE);

  if (!hasCookie && isAuthRequired(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthorized");
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|login|signup|api).*)"],
};
