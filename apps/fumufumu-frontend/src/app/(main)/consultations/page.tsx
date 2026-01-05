import { fetchConsultations } from "@/features/consultation/api";
import { ConsultationList } from "@/features/consultation/components/ConsultationList";

export default async function ConsultationListPage() {
  const response = await fetchConsultations();
  const consultations = response.data;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <ConsultationList consultations={consultations} />
    </div>
  );
}
