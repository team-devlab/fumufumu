import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has(SESSION_COOKIE);

  if (!hasCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthorized");
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // matcher に含まれないパスは認証不要（公開ルート）
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|login|signup|api).*)"],
};
