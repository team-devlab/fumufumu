import {
  fetchPendingAdvicesApi,
  fetchPendingConsultationsApi,
} from "@/features/admin-content-check/api/adminContentCheckApi";
import {
  fetchHiddenAdvicesApi,
  fetchHiddenConsultationsApi,
  fetchLatestHideReasonsApi,
  fetchPublishedAdvicesApi,
  fetchPublishedConsultationsApi,
} from "@/features/admin-content-check/api/moderationListApi";
import { HiddenAdviceList } from "@/features/admin-content-check/components/HiddenAdviceList";
import { HiddenConsultationList } from "@/features/admin-content-check/components/HiddenConsultationList";
import {
  ModerationTabs,
  type ModerationTabKey,
} from "@/features/admin-content-check/components/ModerationTabs";
import { PendingAdviceList } from "@/features/admin-content-check/components/PendingAdviceList";
import { PendingConsultationList } from "@/features/admin-content-check/components/PendingConsultationList";
import { PublishedAdviceList } from "@/features/admin-content-check/components/PublishedAdviceList";
import { PublishedConsultationList } from "@/features/admin-content-check/components/PublishedConsultationList";
import type { ModerationTargetType } from "@/features/admin-content-check/types";
import type { PaginationMeta } from "@/features/consultation/types";

const PAGE_SIZE = 20;

const TAB_DESCRIPTIONS: Record<ModerationTabKey, string> = {
  pending: "承認待ちの投稿を確認してください",
  published: "公開中の投稿を確認し、必要に応じて非表示にできます",
  hidden: "非表示中の投稿を確認し、必要に応じて再度公開できます",
};

type PageProps = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

const toTab = (value: string | undefined): ModerationTabKey => {
  if (value === "published" || value === "hidden") return value;
  return "pending";
};

const toPage = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const toErrorMessage = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;
  return "不明なエラーが発生しました";
};

/**
 * PromiseSettledResult を「投稿チェック待ち」系 list component の Props (success/error)
 * に変換する。既存の toListProps と同義 (docs/projects/08 §5.3)。
 */
const toPendingListProps = <T,>(result: PromiseSettledResult<T[]>) => {
  if (result.status === "fulfilled") {
    return { status: "success" as const, items: result.value };
  }
  return { status: "error" as const, message: toErrorMessage(result.reason) };
};

/**
 * PromiseSettledResult<ConsultationListResponse | AdviceListResponse> を
 * 「公開中」タブの list component の Props に変換する。
 */
const toPublishedListProps = <T,>(
  result: PromiseSettledResult<{ data: T[]; pagination: PaginationMeta }>,
  baseHref: string,
) => {
  if (result.status === "rejected") {
    return { status: "error" as const, message: toErrorMessage(result.reason) };
  }
  return {
    status: "success" as const,
    items: result.value.data,
    pagination: result.value.pagination,
    baseHref,
  };
};

/**
 * 「非表示中」タブの list component の Props に変換する。ADR 011 §5.1 の
 * 「現在のhide理由を併記する」要件のため、成功時は対象IDごとに直近のhide理由も解決する。
 */
const toHiddenListProps = async <T extends { id: number }>(
  result: PromiseSettledResult<{ data: T[]; pagination: PaginationMeta }>,
  baseHref: string,
  targetType: ModerationTargetType,
) => {
  if (result.status === "rejected") {
    return { status: "error" as const, message: toErrorMessage(result.reason) };
  }

  const { data, pagination } = result.value;
  const reasons =
    data.length > 0
      ? await fetchLatestHideReasonsApi(
          targetType,
          data.map((item) => item.id),
        )
      : new Map<number, string | null>();

  return {
    status: "success" as const,
    items: data,
    pagination,
    baseHref,
    reasons,
  };
};

async function PendingTab() {
  const [consultationsResult, advicesResult] = await Promise.allSettled([
    fetchPendingConsultationsApi(),
    fetchPendingAdvicesApi(),
  ]);

  return (
    <>
      <PendingConsultationList {...toPendingListProps(consultationsResult)} />
      <PendingAdviceList {...toPendingListProps(advicesResult)} />
    </>
  );
}

async function PublishedTab({ page, baseHref }: { page: number; baseHref: string }) {
  const [consultationsResult, advicesResult] = await Promise.allSettled([
    fetchPublishedConsultationsApi(page, PAGE_SIZE),
    fetchPublishedAdvicesApi(page, PAGE_SIZE),
  ]);

  return (
    <>
      <PublishedConsultationList {...toPublishedListProps(consultationsResult, baseHref)} />
      <PublishedAdviceList {...toPublishedListProps(advicesResult, baseHref)} />
    </>
  );
}

async function HiddenTab({ page, baseHref }: { page: number; baseHref: string }) {
  const [consultationsResult, advicesResult] = await Promise.allSettled([
    fetchHiddenConsultationsApi(page, PAGE_SIZE),
    fetchHiddenAdvicesApi(page, PAGE_SIZE),
  ]);

  const [consultationsProps, advicesProps] = await Promise.all([
    toHiddenListProps(consultationsResult, baseHref, "consultations"),
    toHiddenListProps(advicesResult, baseHref, "advices"),
  ]);

  return (
    <>
      <HiddenConsultationList {...consultationsProps} />
      <HiddenAdviceList {...advicesProps} />
    </>
  );
}

/**
 * /admin トップ: 投稿チェック / モデレーション一覧 (Server Component)
 *
 * 設計:
 *  - 「投稿チェック待ち / 公開中 / 非表示中」の3タブを ?tab= で切り替える (ADR 011 §5.1)
 *  - タブ切替・ページ送りは Link 遷移のみで行い、useEffect や client state を持たない
 *  - 認可は親 layout (admin/layout.tsx) の role guard で済んでいるため本ページでは扱わない
 */
export default async function AdminPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activeTab = toTab(resolvedSearchParams.tab);
  const page = toPage(resolvedSearchParams.page);
  const baseHref = `/admin?tab=${activeTab}`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">投稿チェック</h1>
        <p className="mt-1 text-sm text-gray-600">{TAB_DESCRIPTIONS[activeTab]}</p>
      </header>

      <ModerationTabs activeTab={activeTab} />

      <div className="space-y-6">
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "published" && <PublishedTab page={page} baseHref={baseHref} />}
        {activeTab === "hidden" && <HiddenTab page={page} baseHref={baseHref} />}
      </div>
    </div>
  );
}
