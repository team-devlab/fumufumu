import { isRedirectError } from "next/dist/client/components/redirect-error";
import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdvicePublishConfirmContainer } from "@/features/consultation/components/AdvicePublishConfirmContainer";
import type { Advice, ConsultationDetail } from "@/features/consultation/types";
import { fetchUserAdviceDraftsApi } from "@/features/user/api/userAdviceApi";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "アドバイス公開の確認 | Fumufumu App" };
export const dynamic = "force-dynamic";

export default async function PublishAdviceConfirmPage({ params }: PageProps) {
  const { id } = await params;
  const adviceId = Number(id);

  if (!Number.isInteger(adviceId) || adviceId <= 0) {
    notFound();
  }

  // 公開できるのは「本人の下書きアドバイス」のみ(ADR 012)。entry と同じく本人限定・IDOR 安全な
  // 下書き一覧から id 一致を引き当てる。無ければ本人の下書きでない/存在しない → 404(fail-closed)。
  // 公開する本文は編集ストア(未保存編集)を優先し、無ければここで取得した本文へフォールバックする。
  // 確認ルートにもサーバ側ガードを敷いて defense-in-depth とする。
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

  // 親相談は確認画面のコンテキスト表示に使う。公開されている相談が前提(非可視なら公開不可)。
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
    <AdvicePublishConfirmContainer
      consultation={consultation}
      adviceId={adviceId}
      initialBody={adviceDraft.body}
    />
  );
}
