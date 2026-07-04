import "server-only";
import { cookies } from "next/headers";
import type {
  AdviceListResponse,
  ConsultationListResponse,
} from "@/features/consultation/types";
import { apiClient } from "@/lib/api/client";
import type { HideReasonsResponse, ModerationTargetType } from "../types";

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
 * 「非表示中」タブに現在の hide 理由を併記するため、対象IDぶんの最新hide理由を
 * バッチ endpoint で1回にまとめて取得する (server-only)
 *
 * 【設計メモ】
 * - 対象ごとに /history を叩くとN+1(1ページ表示で最大件数ぶんのDB往復)になるため、
 *   backendの GET /:targetType/hide-reasons(1クエリで解決)を使う。
 * - 理由併記はADR 011 §5.1の補助情報。履歴一覧UI自体は§6.1でPhase 2送り。
 * - 取得失敗時は例外を伝播させず空Mapに縮退する。理由が付かないだけで、非表示中リスト本体や
 *   unhide操作は表示され続けるべきで、補助情報の失敗でタブ全体を落とさないため。
 */
export async function fetchLatestHideReasonsApi(
  targetType: ModerationTargetType,
  ids: number[],
): Promise<Map<number, string | null>> {
  if (ids.length === 0) {
    return new Map();
  }

  try {
    const cookieStore = await cookies();
    const { reasons } = await apiClient<HideReasonsResponse>(
      `/api/admin/moderation/${targetType}/hide-reasons?ids=${ids.join(",")}`,
      {
        method: "GET",
        headers: { Cookie: cookieStore.toString() },
        cache: "no-store",
      },
    );

    return new Map(ids.map((id) => [id, reasons[String(id)] ?? null]));
  } catch {
    // 補助情報のため、取得失敗はログに委ね空Mapで縮退する(併記が消えるだけで一覧は維持)
    return new Map();
  }
}
