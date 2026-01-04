import { Button } from "@/components/ui/Button";
import { ConsultationList } from "@/features/consultation/components/ConsultationList";

export default function ConsultationListPage() {
  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Main Content: List */}
      <ConsultationList />
    </div>
  );
}
