import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";
import {
  fetchCurrentUserApi,
  fetchWithdrawalPreviewApi,
} from "@/features/user/api/userApi";
import { WithdrawalSection } from "@/features/user/components/WithdrawalSection";

export const metadata = {
  title: "退会 | Fumufumu App",
  description: "アカウントの退会手続き",
};

export default async function WithdrawalPage() {
  const user = await fetchCurrentUserApi();

  // (main)/layout が未認証(Cookie 無し)を弾くため、ここでの null はバックエンド到達不能等。
  // 保守的にプロフィールへ戻す(そちらで取得失敗を表示する)。
  if (user === null) {
    redirect(ROUTES.USER);
  }

  // 管理者は退会不可(moderation_actions の RESTRICT 回避が別 issue まで未整備。バックエンドも 403)。
  // 導線は /user 側で非表示だが、直接遷移にも明示メッセージで応じる。
  if (user.role === "admin") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h1 className="text-lg font-bold text-gray-900">退会</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理者アカウントは現在退会できません。運営にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  const preview = await fetchWithdrawalPreviewApi();

  if (preview === null) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <h1 className="sr-only">退会</h1>
          <p className="text-gray-600">
            退会情報の取得に失敗しました。時間をおいて再度お試しください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="sr-only">退会</h1>
      <WithdrawalSection preview={preview} />
    </div>
  );
}
