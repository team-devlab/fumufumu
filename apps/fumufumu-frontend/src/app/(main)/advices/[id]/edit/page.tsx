import { isRedirectError } from "next/dist/client/components/redirect-error";
import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdviceDraftEditContainer } from "@/features/consultation/components/AdviceDraftEditContainer";
import type { Advice, ConsultationDetail } from "@/features/consultation/types";
import { fetchUserAdviceDraftsApi } from "@/features/user/api/userAdviceApi";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "アドバイスを編集 | Fumufumu App" };
export const dynamic = "force-dynamic";

export default async function EditAdviceDraftPage({ params }: PageProps) {
  const { id } = await params;
  const adviceId = Number(id);

  // 編集できるのは「本人の下書きアドバイス」のみ(ADR 012)。
  // 本人限定・IDOR 安全な下書き一覧から id 一致を引き当てる。無ければ本人の下書きで
  // ない/存在しない → 404(fail-closed)。下書きは相談詳細の advices に含まれないため
  // ここが唯一のプリロード元になる。
  let adviceDraft: Advice | null = null;
  try {
    const drafts = await fetchUserAdviceDraftsApi();
    adviceDraft = drafts.data.find((advice) => advice.id === adviceId) ?? null;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    notFound();
  }

  if (!adviceDraft) {
    notFound();
  }

  // 親相談は編集画面のコンテキスト表示に使う。公開されている相談が前提。
  let consultation: ConsultationDetail | null = null;
  try {
    consultation = await fetchConsultationDetailApi(
      String(adviceDraft.consultation_id),
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    notFound();
  }

  if (!consultation || consultation.draft || consultation.hidden_at) {
    notFound();
  }

  return (
    <AdviceDraftEditContainer
      consultation={consultation}
      adviceId={adviceId}
      initialBody={adviceDraft.body}
    />
  );
}
