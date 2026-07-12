import type { ReviewStatus } from "@/features/consultation/types";

/**
 * 投稿チェック(content_check)状態のユーザー向け表示定義を一元管理する(#179)。
 *
 * 文言規約: pending は「投稿チェック中」、rejected は「公開見送り」。
 * 「審査」「承認」など運営がコンテンツを上から見定める含意の語は使わない。
 * 投稿チェックは公序良俗・誹謗中傷などへの備えであり、中立・事務的なフレーミングにする。
 *
 * approved / 未指定(旧backend・公開一覧・他人視点)は表示対象外(バッジもバナーも出さない)のため、
 * pending / rejected のみを定義する(Partial)。バッジ(一覧)とバナー(詳細)で共通の文言・配色を使う。
 */
export const REVIEW_STATUS_PRESENTATION: Partial<
  Record<
    ReviewStatus,
    {
      /** 一覧・カードに出す小さなバッジの文言 */
      badgeLabel: string;
      /** バッジの配色 */
      badgeClassName: string;
      /** 相談詳細で本文の上に出すバナーの本文 */
      bannerMessage: string;
      /** バナーの配色 */
      bannerClassName: string;
    }
  >
> = {
  pending: {
    badgeLabel: "投稿チェック中",
    badgeClassName: "bg-amber-50 text-amber-700",
    bannerMessage:
      "この相談は投稿チェック中です。公開前のチェックが完了すると、ほかのユーザーにも表示されます。",
    bannerClassName: "border-amber-200 bg-amber-50 text-amber-800",
  },
  rejected: {
    badgeLabel: "公開見送り",
    badgeClassName: "bg-gray-100 text-gray-600",
    bannerMessage: "この相談は公開を見送りました。",
    bannerClassName: "border-gray-200 bg-gray-50 text-gray-700",
  },
};
