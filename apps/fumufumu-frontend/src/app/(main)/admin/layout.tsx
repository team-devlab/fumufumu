import { notFound } from "next/navigation";
import { fetchCurrentUserApi } from "@/features/user/api/userApi";

/**
 * /admin/** の server-side 認可 guard (ADR 010 §5)
 *
 * - role !== 'admin' なら notFound() で 404 化する
 *   → admin 画面の存在自体を一般ユーザーから露出させない
 *   → バックエンドの adminGuard (/api/admin/* も 404 を返す) と挙動を揃える
 * - 親 (main)/layout.tsx で未認証は /login にリダイレクト済みなので、
 *   ここに到達する時点で「ログイン済みだが admin ではない」ケースのみ考慮すれば良い
 * - fetchCurrentUserApi が null を返すケース (バックエンド到達不能・セッション失効など) も
 *   保守的に notFound() に倒す
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await fetchCurrentUserApi();

  if (currentUser?.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
