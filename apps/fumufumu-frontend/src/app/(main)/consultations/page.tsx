import { fetchConsultations } from "@/features/consultation/api";
import { ConsultationList } from "@/features/consultation/components/ConsultationList";
import { CONSULTATION_PAGINATION } from "@/features/consultation/config/constants";

/**
 * 「相談」機能のルーティング エントリーポイント
 *
 * 実際のUIとロジックは features/consultation 配下にカプセル化されている。
 * このファイルは、どの機能コンポーネントをレンダリングするかを定義するだけ。
 */
export default async function ConsultationListPage() {
  const initialData = await fetchConsultations(
    CONSULTATION_PAGINATION.INITIAL_PAGE,
    CONSULTATION_PAGINATION.DEFAULT_PER_PAGE,
  );

  return (
    <div className="max-w-4xl mx-auto w-full">
      <ConsultationList initialData={initialData} />
    </div>
  );
}
