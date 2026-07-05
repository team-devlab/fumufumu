import { isRedirectError } from "next/dist/client/components/redirect-error";
import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { fetchTagsApi } from "@/features/consultation/api/tagApi";
import { ConsultationEditContainer } from "@/features/consultation/components/ConsultationEditContainer";
import type { ConsultationDetail, Tag } from "@/features/consultation/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "相談を編集 | Fumufumu App" };
export const dynamic = "force-dynamic";

export default async function EditConsultationPage({ params }: PageProps) {
  const { id } = await params;

  let consultation: ConsultationDetail | null = null;
  try {
    consultation = await fetchConsultationDetailApi(id);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    notFound();
  }

  // 編集できるのは「本人の下書き」のみ（ADR 012）。
  // 他人の下書きは詳細取得時点で 404 になりここへ到達しない(fail-closed)。
  // 公開済み・非表示は編集導線の対象外とする。
  if (!consultation || !consultation.draft || consultation.hidden_at) {
    notFound();
  }

  let availableTags: Tag[] = [];
  try {
    const response = await fetchTagsApi();
    availableTags = response.data;
  } catch (error) {
    console.error(error);
  }

  return (
    <ConsultationEditContainer
      consultation={consultation}
      availableTags={availableTags}
    />
  );
}
