"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import toast from "react-hot-toast";
import { withdrawAccount } from "@/features/user/api/userClientApi";
import type { WithdrawalPreview } from "@/features/user/types";
import { ApiError } from "@/lib/api/client";

type Props = {
  preview: WithdrawalPreview;
};

/**
 * 退会セクション。削除/匿名化件数を提示し、確認ダイアログ＋type-to-confirm(メール入力)で退会を確定する。
 * 認証・CSRF・admin 拒否はバックエンドと呼び出し元(サーバーComponent)で担保済み。
 * ミューテーション/toast/リダイレクトはこのコンポーネントが持つ(単一の退会フローのため presentational 分離はしない)。
 */
export const WithdrawalSection = ({ preview }: Props) => {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setEmail("");
    setError(null);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  // type-to-confirm: クライアントは登録メールを持たない(GET /api/users/me は email を返さない)ため
  // 一致判定はできない。空でないことだけを活性条件にし、実際の照合はバックエンドが行う(不一致は 400)。
  const canSubmit = email.trim().length > 0 && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await withdrawAccount(email.trim());
      // 成功。セッション Cookie はサーバーが Set-Cookie で破棄済み。完了を伝えてログイン画面へ。
      // 成功時は画面遷移するため isSubmitting は戻さない(遷移後の setState を避ける)。
      toast.success("退会が完了しました");
      router.push("/login?reason=withdrawn");
    } catch (err) {
      // apiClient は message にバックエンドの error(型名)を載せるため、status で分岐し文言は自前で出す。
      // 不一致(400)はダイアログを閉じずインラインエラーにし、入力し直せるようにする。
      if (err instanceof ApiError && err.status === 400) {
        setError(
          "入力されたメールアドレスが登録メールアドレスと一致しません。",
        );
      } else if (err instanceof ApiError && err.status === 403) {
        setError(
          "管理者アカウントは退会できません。運営にお問い合わせください。",
        );
      } else if (err instanceof ApiError) {
        setError("退会に失敗しました。時間をおいて再度お試しください。");
      } else {
        setError("ネットワーク接続を確認してください。");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-8 rounded-xl border border-red-200 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">
        退会（アカウント削除）
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        退会すると、メールアドレスなどの登録情報とパスワードは完全に削除され、元に戻せません。
      </p>

      <div className="mt-4 space-y-4 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">完全に削除されるもの</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              相談（回答のないもの）:{" "}
              <strong>{preview.consultations.delete}</strong> 件
            </li>
            <li>
              アドバイス: <strong>{preview.advices.delete}</strong> 件
            </li>
            <li>
              下書き: <strong>{preview.drafts.delete}</strong> 件
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-gray-900">
            「退会済みユーザー」として匿名化して残るもの（他の方の回答を守るため）
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              相談（回答のあるもの）:{" "}
              <strong>{preview.consultations.anonymize}</strong> 件
            </li>
            <li>
              アドバイス: <strong>{preview.advices.anonymize}</strong> 件
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          退会手続きへ進む
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h3 id={titleId} className="text-lg font-bold text-gray-900">
            本当に退会しますか？
          </h3>
          <p className="text-sm text-gray-600">
            この操作は取り消せません。確認のため、登録しているメールアドレスを入力してください。
          </p>

          <div>
            <label
              htmlFor={emailId}
              className="block text-sm font-medium text-gray-700"
            >
              メールアドレス
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              閉じる
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "退会処理中..." : "退会する"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
};
