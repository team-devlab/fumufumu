import { ConsultationItem } from "@/features/consultation/components/ConsultationItem";
import type { Consultation } from "@/features/consultation/types";

type Props = {
  consultations: Consultation[];
};

/**
 * 相談機能のダッシュボードUI（ロジックも含む）
 * page.tsx から UI とロジックをすべてこちらに移動する
 */
export const ConsultationList = ({ consultations }: Props) => {
  // 状態管理やロジックはすべて「features」の内部で完結する

  if (!consultations.length) {
    return (
      <div className="p-8 text-center text-gray-500">相談が見つかりません</div>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => (
        <ConsultationItem key={consultation.id} consultation={consultation} />
      ))}
    </div>
  );
};
