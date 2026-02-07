import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdviceForm } from "@/features/consultation/components/AdviceForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * アドバイス作成ページ (Server Component)
 */
export default async function NewAdvicePage({ params }: PageProps) {
  const { id } = await params;

  // 親となる相談データを取得
  let consultation = null;
  try {
    consultation = await fetchConsultationDetailApi(id);
  } catch (error) {
    console.error(error);
    // 取得できない場合は404ページへ
    notFound();
  }

  if (!consultation) {
    notFound();
  }
  // 認可チェック追加
  if (consultation.draft) {
    // 下書きには回答できない
    notFound();
  }

  if (consultation.hidden_at) {
    // 非表示には回答できない
    notFound();
  }
  return <AdviceForm consultation={consultation} />;
}
