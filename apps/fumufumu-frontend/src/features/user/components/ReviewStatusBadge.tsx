import type React from "react";
import type { ReviewStatus } from "@/features/consultation/types";

/**
 * 本人が自分の投稿一覧(プロフィール)で審査状態を判別するためのバッジ(#179)。
 *
 * 承認済み(approved)と未指定(旧backend/公開一覧)は普段の一覧と同じ見た目にするため何も描画しない。
 * 審査中(pending)・公開見送り(rejected)のみバッジを出す。
 * 「却下」は本人に角が立つため「公開見送り」とやわらげる(文言統一は #155 で追随余地あり)。
 */
const BADGE_CONFIG: Partial<
  Record<ReviewStatus, { label: string; className: string }>
> = {
  pending: { label: "審査中", className: "bg-amber-50 text-amber-700" },
  rejected: { label: "公開見送り", className: "bg-gray-100 text-gray-600" },
};

export const ReviewStatusBadge: React.FC<{ status?: ReviewStatus }> = ({
  status,
}) => {
  const config = status ? BADGE_CONFIG[status] : undefined;
  if (!config) {
    return null;
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
};
