import { notFound } from "next/navigation";
import { ConsultationEditConfirmContainer } from "@/features/consultation/components/ConsultationEditConfirmContainer";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "相談編集の確認 | Fumufumu App" };

export default async function EditConsultationConfirmPage({
  params,
}: PageProps) {
  const { id } = await params;
  const consultationId = Number(id);

  // 不正なIDはここで弾く。編集内容の妥当性(本人の下書きか)は編集画面側の認可に委ねる
  // (このページはストアの編集内容を確認・送信するだけで、サーバ取得は行わない)。
  if (!Number.isInteger(consultationId) || consultationId <= 0) {
    notFound();
  }

  return <ConsultationEditConfirmContainer consultationId={consultationId} />;
}
