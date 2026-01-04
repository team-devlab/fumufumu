import { Consultation } from "../types";
import { ConsultationItem } from "./ConsultationItem";

type Props = {
  consultations: Consultation[];
};

export const ConsultationList = ({ consultations }: Props) => {
  // データがない場合の表示（または空配列のまま表示）
  if (!consultations.length) {
    return <div className="p-8 text-center text-gray-500">相談が見つかりません</div>;
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => (
        <ConsultationItem key={consultation.id} consultation={consultation} />
      ))}
    </div>
  );
};
