import { fetchConsultations } from "@/features/consultation/api";
import { ConsultationList } from "@/features/consultation/components/ConsultationList";

/**
 * 「相談」機能のルーティング エントリーポイント
 *
 * 実際のUIとロジックは features/consultation 配下にカプセル化されている。
 * このファイルは、どの機能コンポーネントをレンダリングするかを定義するだけ。
 */
export default async function ConsultationListPage() {
  const response = await fetchConsultations();
  const consultations = response.data;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <ConsultationList consultations={consultations} />
    </div>
  );
}
