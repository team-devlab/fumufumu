import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdviceConfirm } from "@/features/consultation/components/AdviceConfirm";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * アドバイス投稿確認ページ (Server Component)
 */
export default async function AdviceConfirmPage({ params }: PageProps) {
  const { id } = await params;

  let consultation = null;
  try {
    consultation = await fetchConsultationDetailApi(id);
  } catch (error) {
    console.error(error);
    notFound();
  }

  if (!consultation) {
    notFound();
  }

  return <AdviceConfirm consultation={consultation} />;
}
