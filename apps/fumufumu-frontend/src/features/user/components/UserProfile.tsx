import Link from "next/link";
import type React from "react";
import { ROUTES } from "@/config/routes";
import type { User } from "@/features/user/types";

type Props = {
  user: User;
};

export const UserProfile: React.FC<Props> = ({ user }) => {
  const isAdmin = user.role === "admin";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold flex-shrink-0">
          <svg
            className="w-10 h-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label="ユーザーアイコン"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-800">{user.name}</span>
          <Link
            href={`${ROUTES.USER}/edit`}
            className="text-xs text-teal-600 border border-teal-500 rounded px-2 py-0.5 hover:bg-teal-50 transition-colors"
          >
            編集
          </Link>
        </div>
      </div>

      {/* 退会導線。退会は正当な権利なので、入口(発見の場)は中立色にして警告しすぎない。
          赤(要注意)は確認ページ/ダイアログの不可逆操作に限定する。視認できる大きさ(text-sm)は確保する
          (小さすぎると発見しづらくダークパターン化するため)。管理者は無効化して存在を示す(バックエンドも 403)。 */}
      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        {isAdmin ? (
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="管理者アカウントは退会できません"
            className="cursor-not-allowed rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-400"
          >
            退会する
          </button>
        ) : (
          <Link
            href={ROUTES.USER_WITHDRAWAL}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            退会する
          </Link>
        )}
      </div>
    </div>
  );
};
