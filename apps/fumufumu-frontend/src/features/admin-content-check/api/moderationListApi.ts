import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import type {
  AdviceListResponse,
  ConsultationListResponse,
} from "@/features/consultation/types";
import type {
  ModerationHistoryResponse,
  ModerationTargetType,
} from "../types";

/**
 * 公開中の相談を取得する (server-only)
 *
 * 既定の `GET /api/consultations` は「承認済み かつ 非表示でない」投稿のみを返すため、
 * admin モデレーション画面の「公開中」タブにそのまま使える (ADR 011 §5.1)。
 */
export async function fetchPublishedConsultationsApi(
  page: number,
  limit: number,
): Promise<ConsultationListResponse> {
  const cookieStore = await cookies();
  return apiClient<ConsultationListResponse>(
    `/api/consultations?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
}

/**
 * 非表示中の相談を取得する (server-only, admin限定)
 *
 * `hiddenOnly=true` は admin 権限時のみ有効 (それ以外は無視される)。
 * layout レベルの admin guard を通過済み前提のため、本関数では role を再検証しない。
 */
export async function fetchHiddenConsultationsApi(
  page: number,
  limit: number,
): Promise<ConsultationListResponse> {
  const cookieStore = await cookies();
  return apiClient<ConsultationListResponse>(
    `/api/consultations?page=${page}&limit=${limit}&hiddenOnly=true`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
}

/**
 * 公開中のアドバイスを相談横断で取得する (server-only)
 */
export async function fetchPublishedAdvicesApi(
  page: number,
  limit: number,
): Promise<AdviceListResponse> {
  const cookieStore = await cookies();
  return apiClient<AdviceListResponse>(
    `/api/advices?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
}

/**
 * 非表示中のアドバイスを相談横断で取得する (server-only, admin限定)
 */
export async function fetchHiddenAdvicesApi(
  page: number,
  limit: number,
): Promise<AdviceListResponse> {
  const cookieStore = await cookies();
  return apiClient<AdviceListResponse>(
    `/api/advices?page=${page}&limit=${limit}&hiddenOnly=true`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
}

/**
 * 対象の hide/unhide 履歴を新しい順に取得する (server-only)
 */
export async function fetchModerationHistoryApi(
  targetType: ModerationTargetType,
  id: number,
): Promise<ModerationHistoryResponse> {
  const cookieStore = await cookies();
  return apiClient<ModerationHistoryResponse>(
    `/api/admin/moderation/${targetType}/${id}/history`,
    {
      method: "GET",
      headers: { Cookie: cookieStore.toString() },
      cache: "no-store",
    },
  );
}

/**
 * 「非表示中」タブに現在の hide 理由を併記するため、対象IDごとに履歴を取得し
 * 直近の hide アクションの reason を引き当てる (server-only)
 *
 * 【設計メモ】履歴の一覧表示UI自体はADR 011 §6.1によりPhase 2送りだが、
 * 「非表示中タブに現在の理由を併記する」要件(§5.1)は本PRのスコープのため、
 * historyの先頭(新しい順)から直近のhideアクションだけを抜き出して使う。
 * 対象が現在hidden状態である前提のため、履歴の先頭は通常hideアクションになる。
 */
export async function fetchLatestHideReasonsApi(
  targetType: ModerationTargetType,
  ids: number[],
): Promise<Map<number, string | null>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const { history } = await fetchModerationHistoryApi(targetType, id);
      const latestHide = history.find((entry) => entry.action === "hide");
      return [id, latestHide?.reason ?? null] as const;
    }),
  );

  return new Map(entries);
}
