import Link from "next/link";
import type React from "react";
import { ROUTES } from "@/config/routes";
import { CONSULTATION_LABELS } from "@/features/consultation/config/constants";
import type { Consultation } from "@/features/consultation/types";
import { formatDateTimeInJapan } from "@/lib/datetime";

type Props = {
  consultation: Consultation;
};

export const ConsultationItem: React.FC<Props> = ({ consultation }) => {
  const isResolved = !!consultation.solved_at;

  return (
    <Link href={ROUTES.CONSULTATION.DETAIL(consultation.id)} className="block">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Header: User Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
              {/* ユーザーアイコン（仮） */}
              <svg
                className="w-6 h-6"
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
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold text-gray-700">
                {consultation.author?.name ??
                  CONSULTATION_LABELS.ANONYMOUS_USER}
              </span>
              <span className="text-xs text-gray-400">
                {formatDateTimeInJapan(consultation.created_at)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          {isResolved && (
            <span className="bg-teal-600 text-white text-xs px-3 py-1 rounded-full font-medium">
              {CONSULTATION_LABELS.STATUS_SOLVED}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {consultation.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {consultation.body_preview}
          </p>
        </div>

        {/* Footer: タグ。未設定のときは行ごと出さない */}
        {consultation.tags && consultation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {consultation.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
