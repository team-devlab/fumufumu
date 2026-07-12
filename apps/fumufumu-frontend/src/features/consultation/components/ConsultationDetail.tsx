import { isRedirectError } from "next/dist/client/components/redirect-error";
import Link from "next/link";
import { ROUTES } from "@/config/routes";
import { fetchCurrentUserApi } from "@/features/user/api/userApi";
import { fetchConsultationDetailApi } from "../api/consultationApi";
import type { ConsultationDetail as ConsultationDetailType } from "../types";
import { AdviceList } from "./AdviceList";
import { ConsultationQuestionCard } from "./ConsultationQuestionCard";
import { ReviewStatusBanner } from "./ReviewStatusBanner";

type Props = {
  consultationId: string;
};

export const ConsultationDetail = async ({ consultationId }: Props) => {
  // 並列でデータ取得（パフォーマンス低下を防ぐ）
  // ※ catchは個別にハンドリングしたい場合分けますが、今回はシンプルに
  const consultationPromise = fetchConsultationDetailApi(consultationId);
  const currentUserPromise = fetchCurrentUserApi();

  let consultation: ConsultationDetailType | null = null;
  let error: string | null = null;

  try {
    consultation = await consultationPromise;
  } catch (e) {
    // apiClientはErrorオブジェクトを投げるため、メッセージ内容で判定する
    if (isRedirectError(e)) throw e;

    if (e instanceof Error) {
      // バックエンドが返す error.name (例: NotFoundError) やステータスコード文字列をチェック
      if (e.message === "NotFoundError" || e.message.includes("404")) {
        error = "相談が見つかりませんでした。";
      } else if (e.message === "ForbiddenError" || e.message.includes("403")) {
        error = "この相談を閲覧する権限がありません。";
      } else {
        console.error(e); // 予期せぬエラーはログに出す
        error = "相談データの取得に失敗しました。";
      }
    } else {
      console.error(e);
      error = "予期しないエラーが発生しました。";
    }
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (!consultation) {
    return <div className="p-8 text-center">データが見つかりません</div>;
  }

  // NOTE(多層防御): フロントエンド側での権限チェック
  // バックエンドが万が一データを返してしまっても、ここでブロックする。
  // draft/hidden に加え、投稿チェック中/公開見送り(pending/rejected)も本人限定の非公開状態のため対象に含める。
  // これらは backend が本人にしか返さない(#179 Phase2)が、draft/hidden と同じく本人所有を確認して二重に防ぐ。
  const isUnpublishedForOwnerOnly =
    consultation.draft ||
    consultation.hidden_at !== null ||
    consultation.review_status === "pending" ||
    consultation.review_status === "rejected";
  if (isUnpublishedForOwnerOnly) {
    const currentUser = await currentUserPromise;

    // 未ログイン、またはIDが不一致の場合は表示しない
    // (consultation.author が null のケースも考慮)
    if (!currentUser || consultation.author?.id !== currentUser.id) {
      return (
        <div className="p-8 text-center text-red-500">
          この相談を閲覧する権限がありません。
        </div>
      );
    }
  }

  return (
    // 全体背景を薄いグレーにしてカードを浮き立たせる
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 投稿チェック中/公開見送りのとき本人に公開前状態を伝えるバナー(本文は伏せない, #179 Phase2)。
            承認済み/未指定では ReviewStatusBanner が null を返すため、empty:hidden で余白ごと畳む。 */}
        <div className="mb-6 empty:hidden">
          <ReviewStatusBanner status={consultation.review_status} />
        </div>

        {/* 1. 質問カードエリア */}
        <div className="mb-6">
          <ConsultationQuestionCard consultation={consultation} />
        </div>

        {/* 2. アクションボタンエリア */}
        <div className="flex justify-end mb-10">
          {/* TODO: アドバイス投稿フォーム機能は別PRで実装予定。現在はUIのみ実装。 */}
          <Link
            href={ROUTES.CONSULTATION.ADVICE.NEW(consultationId)}
            className="flex items-center gap-2 rounded-full bg-[#F2C300] px-8 py-3 font-bold text-[#5C3A00] shadow-sm transition-colors duration-200 hover:bg-[#EAB308]"
          >
            <span>この相談に対してアドバイスする</span>
          </Link>
        </div>

        {/* 3. アドバイス一覧エリア */}
        <div>
          <AdviceList advices={consultation.advices} />
        </div>
      </div>
    </div>
  );
};
