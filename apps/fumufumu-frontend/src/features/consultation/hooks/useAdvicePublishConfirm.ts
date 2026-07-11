"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ROUTES } from "@/config/routes";
import {
  publishAdvice,
  updateDraftAdvice,
} from "@/features/consultation/api/consultationClientApi";
import {
  useAdviceEditActions,
  useAdviceEditBody,
  useAdviceEditHasHydrated,
  useEditingAdviceId,
} from "@/features/consultation/stores/useAdviceEditFormStore";

// NOTE: A の useConsultationEditConfirm を参考にしつつ、本文はストア(未保存編集)優先・無ければ
// サーバ取得の initialBody へフォールバックする点が異なる(直リンク/リロード対応)。データが無い場合の
// 自動リダイレクト(useEffect)は行わない: persist の rehydration は非同期で、リロード直後は一瞬空に
// なるため、自動遷移させると復元前に飛ばされる。送信ボタン押下時に検証する。
export const useAdvicePublishConfirm = (
  adviceId: number,
  initialBody: string,
) => {
  const router = useRouter();

  const storeBody = useAdviceEditBody();
  const editingId = useEditingAdviceId();
  const hasHydrated = useAdviceEditHasHydrated();
  const { reset } = useAdviceEditActions();

  const [isProcessing, setIsProcessing] = useState(false);

  // ストアがこのアドバイスの未保存編集を保持していればそれを、無ければサーバ取得の本文
  // (initialBody)を使う。entry を経由しない直リンク/リロードで store が空でも、確認画面に
  // 本文を表示してそのまま公開できる(確認ページが既に取得済みの本文を渡すだけ・追加取得は不要)。
  const body = editingId === adviceId ? storeBody : initialBody;

  // persist の rehydration 完了までは store の値が使えず、未保存編集がある場合に一瞬サーバ値へ
  // フォールバックして見えてしまう。完了までフォーム描画を待つゲートに使う(entry と同機構)。
  const isReady = hasHydrated;

  const submit = async (draft: boolean) => {
    // 通常は initialBody が本人の有効な下書き本文のため空にならないが、万一空なら誤った
    // 保存/公開を防いで編集画面へ戻す(編集画面側で本人下書きの認可(404)も行う)。
    if (!body.trim()) {
      toast.error("編集内容が見つかりません。もう一度お試しください。");
      router.replace(ROUTES.ADVICE.DRAFT_EDIT(adviceId));
      return;
    }

    setIsProcessing(true);
    try {
      // 下書き保存は draft 維持(/draft)、公開は draft:false 化(/publish)。本文の最小長は
      // entry で検証済み。ここをすり抜けた場合も backend が 400/404 で拒否する(fail-closed)。
      if (draft) {
        await updateDraftAdvice(adviceId, body);
      } else {
        await publishAdvice(adviceId, body);
      }

      // 成功時は編集ストアを破棄する(次に別の下書きを開いた時に再 seed させる)
      reset();

      // ADR 007: 公開直後は content_check が pending で一般画面(一覧)に出ないため、著者本人の
      // プロフィールへ遷移し「審査中」であることを伝える(相談公開・A と同方針)。
      toast.success(
        draft
          ? "下書きを保存しました"
          : "公開しました。チェック完了後に表示されます。",
      );
      // 遷移先プロフィールの一覧は Router Cache に古い RSC が残るため、
      // refresh でキャッシュを無効化して更新を反映させる(無いと一覧が古いまま)。
      router.push(ROUTES.USER);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("エラーが発生しました。もう一度お試しください。");
      setIsProcessing(false);
    }
  };

  return {
    isReady,
    body,
    isProcessing,
    handleBack: () => router.back(), // ブラウザバックで編集画面に戻る(データは維持される)
    handleSaveDraft: () => submit(true),
    handlePublish: () => submit(false),
  };
};
