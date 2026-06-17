import "server-only";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";
import type {
  PendingAdviceDetail,
  PendingAdviceDetailResponse,
  PendingAdviceListResponse,
  PendingConsultationDetail,
  PendingConsultationDetailResponse,
  PendingConsultationListResponse,
} from "../types";

/**
 * pending な相談を取得する (server-only)
 *
 * 既存 admin API が summary（id だけ軽量に返す）と detail（title/body 等を含む）に
 * 分かれているため、本関数で 2-call を内包し UI 表示に必要な詳細配列を返す。
 *
 * 並び順は backend の summary が `content_checks.created_at` 昇順を返すが、
 * detail call は順序を保証しないため、本関数で summary の id 順に並べ直す。
 */
export async function fetchPendingConsultationsApi(): Promise<
  PendingConsultationDetail[]
> {
  const cookieStore = await cookies();
  const headers = { Cookie: cookieStore.toString() };

  const summary = await apiClient<PendingConsultationListResponse>(
    "/api/admin/content-check/consultations?view=summary",
    { method: "GET", headers, cache: "no-store" },
  );

  const orderedIds = summary.consultations.map((c) => c.id);
  if (orderedIds.length === 0) {
    return [];
  }

  const detail = await apiClient<PendingConsultationDetailResponse>(
    `/api/admin/content-check/consultations?view=detail&ids=${orderedIds.join(",")}`,
    { method: "GET", headers, cache: "no-store" },
  );

  // detail の missing_ids / non_pending は同時操作（別 admin が直前に承認/却下）時に
  // 起きうるが、MVP では UI 側で扱わずそのまま欠落させる。運用上は次回再読込で解消する。
  const byId = new Map(detail.consultations.map((c) => [c.id, c]));
  return orderedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}

/**
 * pending なアドバイスを取得する (server-only)
 *
 * fetchPendingConsultationsApi と同じ 2-call パターン。
 */
export async function fetchPendingAdvicesApi(): Promise<PendingAdviceDetail[]> {
  const cookieStore = await cookies();
  const headers = { Cookie: cookieStore.toString() };

  const summary = await apiClient<PendingAdviceListResponse>(
    "/api/admin/content-check/advices?view=summary",
    { method: "GET", headers, cache: "no-store" },
  );

  const orderedIds = summary.advices.map((a) => a.id);
  if (orderedIds.length === 0) {
    return [];
  }

  const detail = await apiClient<PendingAdviceDetailResponse>(
    `/api/admin/content-check/advices?view=detail&ids=${orderedIds.join(",")}`,
    { method: "GET", headers, cache: "no-store" },
  );

  const byId = new Map(detail.advices.map((a) => [a.id, a]));
  return orderedIds.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
}
