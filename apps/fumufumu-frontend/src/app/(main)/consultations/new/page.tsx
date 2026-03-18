import { fetchTagsApi } from "@/features/consultation/api/tagApi";
import { ConsultationNewContainer } from "@/features/consultation/components/ConsultationNewContainer";
import type { Tag } from "@/features/consultation/types";

export const metadata = { title: "新規相談作成 | Fumufumu App" };
export const dynamic = "force-dynamic";

export default async function NewConsultationPage() {
  let availableTags: Tag[] = [];

  try {
    const response = await fetchTagsApi();
    availableTags = response.data;
  } catch (error) {
    console.error(error);
  }

  return <ConsultationNewContainer availableTags={availableTags} />;
}
