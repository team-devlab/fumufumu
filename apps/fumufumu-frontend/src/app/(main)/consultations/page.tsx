import { ConsultationList } from "@/features/consultation/components/ConsultationList";
import { fetchConsultations } from "@/features/consultation/api";

export default async function ConsultationListPage() {
  const response = await fetchConsultations();
  const consultations = response.data;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <ConsultationList consultations={consultations} />
    </div>
  );
}
