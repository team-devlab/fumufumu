"use client";

import { ConsultationItem } from "@/features/consultation/components/ConsultationItem";
import { useInfiniteConsultations } from "@/features/consultation/hooks/useInfiniteConsultations";
import type { ConsultationListResponse } from "@/features/consultation/types";

type Props = {
  initialData: ConsultationListResponse;
};

/**
 * 相談一覧 UI（無限スクロール対応）
 *
 * 責務:
 *   - useInfiniteConsultations hook から状態を受け取り表示する
 *   - sentinel div を末尾に置き IntersectionObserver のターゲットとする
 *   - ローディング・エラー・認証エラー・リスト末尾の UI を担当
 *
 * 責務外:
 *   - 無限スクロールのロジック（hook に委譲）
 *   - 初期データ取得（page.tsx に委譲）
 */
export const ConsultationList = ({ initialData }: Props) => {
  const {
    items,
    isFetching,
    hasNext,
    appendError,
    isAuthError,
    sentinelRef,
    retryFetchMore,
  } = useInfiniteConsultations(initialData);

  if (!items.length && !isFetching) {
    return (
      <div className="p-8 text-center text-gray-500">相談が見つかりません</div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((consultation) => (
        <ConsultationItem key={consultation.id} consultation={consultation} />
      ))}

      {/*
       * sentinel: IntersectionObserver の検知ターゲット。
       * has_next=false / エラー状態では非表示にして observer の無駄撃ちを防ぐ。
       */}
      {hasNext && !isAuthError && appendError === null && (
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      )}

      {/* 追加ローディングスピナー */}
      {isFetching && (
        <div
          className="flex justify-center py-6"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">次のページを読み込んでいます</span>
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 追加取得エラー（401 以外） — 初回ロード失敗とは別枠で表示 */}
      {appendError !== null && !isAuthError && (
        <div className="text-center py-4 text-red-500" role="alert">
          <p>追加読み込みに失敗しました</p>
          <p className="mt-1 text-sm text-gray-500">{appendError}</p>
          <button
            type="button"
            onClick={retryFetchMore}
            disabled={isFetching}
            className="mt-3 rounded-md border border-teal-500 px-4 py-2 text-sm text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            再試行
          </button>
        </div>
      )}

      {/* 認証エラー（401）: 再ログイン導線 */}
      {isAuthError && (
        <div className="text-center py-4 text-amber-600" role="alert">
          <p>セッションが切れました。</p>
          <a
            href="/login?reason=session_expired"
            className="text-teal-600 underline hover:text-teal-800"
          >
            再ログインする
          </a>
        </div>
      )}

      {/* リスト末尾 — has_next=false になったら表示 */}
      {!hasNext && !isFetching && items.length > 0 && !isAuthError && (
        <div className="py-4 text-center text-sm text-gray-400">
          すべての相談を表示しました
        </div>
      )}
    </div>
  );
};
