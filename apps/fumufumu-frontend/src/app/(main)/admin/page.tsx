import {
  fetchPendingAdvicesApi,
  fetchPendingConsultationsApi,
} from "@/features/admin-content-check/api/adminContentCheckApi";
import { PendingAdviceList } from "@/features/admin-content-check/components/PendingAdviceList";
import { PendingConsultationList } from "@/features/admin-content-check/components/PendingConsultationList";

/**
 * /admin トップ: 投稿チェック一覧 (Server Component)
 *
 * 設計:
 *  - 相談 / アドバイスの 2 セクションを縦並びで表示 (plan §5.2、レイアウト案 A-1)
 *  - Promise.allSettled で並列取得し、片方失敗しても他方は表示する (plan §5.3)
 *  - 認可は親 layout (admin/layout.tsx) の role guard で済んでいるため本ページでは扱わない
 */
export default async function AdminPage() {
  const [consultationsResult, advicesResult] = await Promise.allSettled([
    fetchPendingConsultationsApi(),
    fetchPendingAdvicesApi(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">投稿チェック</h1>
        <p className="mt-1 text-sm text-gray-600">
          承認待ちの投稿を確認してください
        </p>
      </header>

      <PendingConsultationList
        {...(consultationsResult.status === "fulfilled"
          ? { status: "success" as const, items: consultationsResult.value }
          : {
              status: "error" as const,
              message: toErrorMessage(consultationsResult.reason),
            })}
      />

      <PendingAdviceList
        {...(advicesResult.status === "fulfilled"
          ? { status: "success" as const, items: advicesResult.value }
          : {
              status: "error" as const,
              message: toErrorMessage(advicesResult.reason),
            })}
      />
    </div>
  );
}

/** Promise rejection の reason を表示用文字列に変換する */
const toErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;
  return "不明なエラーが発生しました";
};
