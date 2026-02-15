import { notFound } from "next/navigation";
import { fetchConsultationDetailApi } from "@/features/consultation/api/consultationApi";
import { AdviceNewContainer } from "@/features/consultation/components/AdviceNewContainer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "アドバイス作成 | Fumufumu App" };

export default async function NewAdvicePage({ params }: PageProps) {
  const { id } = await params;
  let consultation = null;

  try {
    consultation = await fetchConsultationDetailApi(id);
  } catch (error) {
    console.error(error);
    notFound();
  }

  if (!consultation || consultation.draft || consultation.hidden_at) {
    notFound();
  }

  return <AdviceNewContainer consultation={consultation} />;
}
