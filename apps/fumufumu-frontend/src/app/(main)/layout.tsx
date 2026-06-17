import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "./_components/Header";

// Better Auth のセッション Cookie 名。
// production (HTTPS, `secure: true`) では `__Secure-` プレフィックスが自動で付くため、
// 両方をチェックして dev / production の両環境で同じコードが動くようにする。
// 参考: https://developer.mozilla.org/docs/Web/HTTP/Cookies#cookie_prefixes
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

// (main) セグメント配下 (/consultations/**, /user/**) の認証 guard。
// 旧 proxy.ts (middleware) は Next.js 16 で常に Node.js runtime 固定となり、
// OpenNext for Cloudflare が Node Middleware を未サポートのため layout 側へ移行した。
// 注: Server Component からは現在の pathname を取得できないため、
//     SSR 経由のリダイレクト時の returnTo は付与しない。
//     ブラウザ操作中の 401 は lib/api/client.ts が window.location から returnTo を構築する。
export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  if (!SESSION_COOKIE_NAMES.some((name) => cookieStore.has(name))) {
    redirect("/login?reason=unauthorized");
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
