import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdviceConfirmContainer } from "@/features/consultation/components/AdviceConfirmContainer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "アドバイス内容確認 | Fumufumu App" };

export default async function AdviceConfirmPage({ params }: PageProps) {
  const { id } = await params;
  let consultation = null;

  try {
    consultation = await fetchConsultationDetailApi(id);
  } catch (error) {
    notFound();
  }

  if (!consultation) notFound();

  return <AdviceConfirmContainer consultation={consultation} />;
}
