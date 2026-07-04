import Link from "next/link";
import type { PaginationMeta } from "@/features/consultation/types";

type Props = {
  pagination: PaginationMeta;
  /** ページ番号以外のクエリを含む base href (例: "/admin?tab=published") */
  baseHref: string;
};

const withPage = (baseHref: string, page: number): string => {
  const separator = baseHref.includes("?") ? "&" : "?";
  return `${baseHref}${separator}page=${page}`;
};

/**
 * ページ送り UI (Server Component)。ADR 011 §5.1 の「公開中/非表示中」タブの
 * pagination に使う。1ページで収まる場合は何も描画しない。
 */
export const ModerationPagination = ({ pagination, baseHref }: Props) => {
  if (pagination.total_pages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex items-center justify-between gap-4 text-sm"
      aria-label="ページネーション"
    >
      {pagination.has_prev ? (
        <Link
          href={withPage(baseHref, pagination.current_page - 1)}
          className="text-teal-600 underline hover:text-teal-800"
        >
          前のページ
        </Link>
      ) : (
        <span className="text-gray-300">前のページ</span>
      )}

      <span className="text-gray-500">
        {pagination.current_page} / {pagination.total_pages} ページ
      </span>

      {pagination.has_next ? (
        <Link
          href={withPage(baseHref, pagination.current_page + 1)}
          className="text-teal-600 underline hover:text-teal-800"
        >
          次のページ
        </Link>
      ) : (
        <span className="text-gray-300">次のページ</span>
      )}
    </nav>
  );
};
