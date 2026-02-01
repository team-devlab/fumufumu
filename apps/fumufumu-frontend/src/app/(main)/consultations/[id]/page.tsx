import { ConsultationDetail } from "@/features/consultation/components/ConsultationDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 相談詳細ページのエントリーポイント
 */
export default async function ConsultationDetailPage({ params }: PageProps) {
  // Next.js 15以降、paramsはPromiseとして扱われる可能性があるため await します
  // (バージョンによって不要な場合もありますが、awaitしておくと安全です)
  const { id } = await params;

  return <ConsultationDetail consultationId={id} />;
}
