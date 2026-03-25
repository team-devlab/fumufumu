"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { fetchConsultationsClient } from "@/features/consultation/api/consultationClientApi";
import { CONSULTATION_PAGINATION } from "@/features/consultation/config/constants";
import type {
  Consultation,
  ConsultationListResponse,
} from "@/features/consultation/types";
import { ApiError } from "@/lib/api/client";

// NOTE: 重複除去 (dedupe) は MVP 未実装。

// ─── 状態機械の型定義 ───────────────────────────────────────────

type InfiniteState = {
  items: Consultation[];
  page: number;
  hasNext: boolean;
  isFetching: boolean;
  appendError: string | null;
  isAuthError: boolean;
};

type Action =
  | { type: "FETCH_MORE_START" }
  | {
      type: "FETCH_MORE_SUCCESS";
      items: Consultation[];
      nextPage: number;
      hasNext: boolean;
    }
  | { type: "FETCH_MORE_ERROR"; message: string }
  | { type: "AUTH_ERROR" };

function reducer(state: InfiniteState, action: Action): InfiniteState {
  switch (action.type) {
    case "FETCH_MORE_START":
      return { ...state, isFetching: true, appendError: null };
    case "FETCH_MORE_SUCCESS":
      return {
        ...state,
        isFetching: false,
        items: [...state.items, ...action.items],
        page: action.nextPage,
        hasNext: action.hasNext,
      };
    case "FETCH_MORE_ERROR":
      return { ...state, isFetching: false, appendError: action.message };
    case "AUTH_ERROR":
      return { ...state, isFetching: false, isAuthError: true };
    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────

export function useInfiniteConsultations(
  initialData: ConsultationListResponse,
) {
  const initialPerPage =
    initialData.pagination.per_page > 0
      ? initialData.pagination.per_page
      : CONSULTATION_PAGINATION.DEFAULT_PER_PAGE;

  const [state, dispatch] = useReducer(reducer, {
    items: initialData.data,
    page: initialData.pagination.current_page,
    hasNext: initialData.pagination.has_next,
    isFetching: false,
    appendError: null,
    isAuthError: false,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const perPageRef = useRef(initialPerPage);
  const stateRef = useRef(state);
  stateRef.current = state;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchMore = useCallback((options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    const { isFetching, hasNext, appendError, isAuthError, page } =
      stateRef.current;

    if (isFetching) return;
    if (!hasNext) return;
    if (appendError !== null && !force) return;
    if (isAuthError) return;

    const nextPage = page + 1;
    dispatch({ type: "FETCH_MORE_START" });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetchConsultationsClient(nextPage, perPageRef.current, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.pagination.per_page > 0) {
          perPageRef.current = response.pagination.per_page;
        }
        dispatch({
          type: "FETCH_MORE_SUCCESS",
          items: response.data,
          nextPage,
          hasNext: response.pagination.has_next,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          dispatch({ type: "AUTH_ERROR" });
          return;
        }
        const message =
          error instanceof Error ? error.message : "読み込みに失敗しました";
        dispatch({ type: "FETCH_MORE_ERROR", message });
      });
  }, []);

  const retryFetchMore = useCallback(() => {
    fetchMore({ force: true });
  }, [fetchMore]);

  // IntersectionObserver
  useEffect(() => {
    if (!state.hasNext || state.appendError !== null || state.isAuthError) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          fetchMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [fetchMore, state.hasNext, state.appendError, state.isAuthError, state.page]);

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { ...state, sentinelRef, retryFetchMore };
}
