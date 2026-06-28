"use client";

import { useId, useRef, useState } from "react";

// backend validator (apps/fumufumu-backend/src/validators/content-check.validator.ts)
// の reason 上限 (.max(500)) と同条件で宣言している。frontend 側のクライアント
// バリデーションでカバーしたいだけで、本来は同じ schema / 定数を frontend から
// 共有して参照すべき。片方を変えるともう片方も同時に更新する必要がある。
// 共有定数化の検討は別 issue に切り出して扱う。
const MAX_REASON_LENGTH = 500;

type Props = {
  /**
   * 却下を確定したとき呼ばれる。
   * 成否にかかわらず dialog は閉じる (finally で close)。
   * throw された error は内部で握りつぶされるため、user-visible な error
   * feedback (toast 等) は親 component の責務。何も通知しないと silent fail
   * になる点に注意。
   */
  onSubmit: (reason: string) => Promise<void>;
  /** 親 (DecisionActions) の submission 状態と同期。submit ボタンの二重押下防止に使う */
  isSubmitting: boolean;
};

export const RejectDialog = ({ onSubmit, isSubmitting }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 親 (DecisionActions) は pending item の数だけ RejectDialog をレンダーする。
  // id をベタ書きにすると document 内で衝突し、label↔textarea のペアリングや
  // aria-labelledby の参照が「最初に見つかった一致」に倒れて壊れる。
  // SSR/CSR で安定 (hydration mismatch を起こさない) かつ instance ごとに
  // 一意になる id を React の useId で生成する。
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setReason("");
    setError(null);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = reason.trim();

    if (trimmed.length === 0) {
      setError("却下理由を入力してください");
      return;
    }
    setError(null);

    // 成功 / 失敗どちらでも dialog は閉じる
    // (成功: list refresh で行が消える / 失敗: toast を親側で出すので dialog は不要)
    // 親 (DecisionActions.decide) が全エラーを握りつぶす契約だが、safety net で
    // 本コンポーネント側でも catch する。catch しないと <form onSubmit> から
    // unhandled rejection として leak する。
    try {
      await onSubmit(trimmed);
    } catch {
      // intentionally swallowed; parent is responsible for user-visible error feedback
    } finally {
      handleClose();
    }
  };

  const remaining = MAX_REASON_LENGTH - reason.length;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isSubmitting}
        className="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        却下
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            投稿を却下する
          </h2>
          <div>
            <label
              htmlFor={reasonId}
              className="block text-sm font-medium text-gray-700"
            >
              却下理由（1〜{MAX_REASON_LENGTH} 文字）
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              maxLength={MAX_REASON_LENGTH}
              disabled={isSubmitting}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">残り {remaining} 文字</p>
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
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              却下する
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
};
