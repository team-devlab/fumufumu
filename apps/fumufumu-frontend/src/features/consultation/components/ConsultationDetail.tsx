import { fetchConsultationDetailApi } from "../api/consultationApi";
import type { ConsultationDetail as ConsultationDetailType } from "../types";
import { AdviceList } from "./AdviceList";
import { ConsultationQuestionCard } from "./ConsultationQuestionCard";

type Props = {
  consultationId: string;
};

export const ConsultationDetail = async ({ consultationId }: Props) => {
  let consultation: ConsultationDetailType | null = null;
  let error: string | null = null;

  try {
    consultation = await fetchConsultationDetailApi(consultationId);
  } catch (e) {
    console.error(e);
    error = "相談データの取得に失敗しました。";
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!consultation) {
    return <div className="p-8 text-center">データが見つかりません</div>;
  }

  return (
    // 全体背景を薄いグレーにしてカードを浮き立たせる
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 1. 質問カードエリア */}
        <div className="mb-6">
          <ConsultationQuestionCard consultation={consultation} />
        </div>

        {/* 2. アクションボタンエリア */}
        <div className="flex justify-end mb-10">
          {/* TODO: 回答投稿フォーム機能は別PRで実装予定。現在はUIのみ実装。 */}
          <button
            type="button"
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold py-3 px-8 rounded-full shadow-sm transition-colors duration-200 flex items-center gap-2"
          >
            <span>この相談に対して回答する</span>
          </button>
        </div>

        {/* 3. 回答一覧エリア */}
        <div>
          <AdviceList advices={consultation.advices} />
        </div>
      </div>
    </div>
  );
};
