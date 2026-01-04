import { ConsultationList } from "@/features/consultation/components/ConsultationList";
import { fetchConsultations } from "@/features/consultation/api/mockApi";

// Server Component なので async/await が使えます
export default async function ConsultationListPage() {
  // サーバーサイドでデータ取得
  const response = await fetchConsultations();
  const consultations = response.data;

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header Area: Search & Action は削除済み */}
      
      {/* 取得したデータをPropsとして渡す */}
      <ConsultationList consultations={consultations} />
    </div>
  );
}
