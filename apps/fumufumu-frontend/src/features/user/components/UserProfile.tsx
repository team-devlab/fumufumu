import Link from "next/link";
import type React from "react";
import { ROUTES } from "@/config/routes";
import type { User } from "@/features/user/types";

type Props = {
  user: User;
};

export const UserProfile: React.FC<Props> = ({ user }) => {
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
    </div>
  );
};
