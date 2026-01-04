"use client";

import { useConsultations } from "../hooks/useConsultations";
import { ConsultationItem } from "./ConsultationItem";

export const ConsultationList = () => {
  const { consultations, isLoading, error } = useConsultations();

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => (
        <ConsultationItem key={consultation.id} consultation={consultation} />
      ))}
    </div>
  );
};