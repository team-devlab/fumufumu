import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const returnTo = `${pathname}${search}`;
  const hasCookie = request.cookies.has(SESSION_COOKIE);

  if (!hasCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "unauthorized");
    loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  // server-side の apiClient() が 401 リダイレクト時の returnTo を復元するために使う。
  requestHeaders.set("x-pathname", returnTo);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/consultations/:path*", "/user/:path*"],
};
