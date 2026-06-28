"use client";

import { useRef, useState } from "react";

const MAX_REASON_LENGTH = 500;

type Props = {
  /** 却下を確定したとき呼ばれる。throw しても dialog は閉じる (finally で close) */
  onSubmit: (reason: string) => Promise<void>;
  /** 親 (DecisionActions) の submission 状態と同期。submit ボタンの二重押下防止に使う */
  isSubmitting: boolean;
};

export const RejectDialog = ({ onSubmit, isSubmitting }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(`理由は${MAX_REASON_LENGTH}文字以内で入力してください`);
      return;
    }
    setError(null);

    // 成功 / 失敗どちらでも dialog は閉じる
    // (成功: list refresh で行が消える / 失敗: toast を親側で出すので dialog は不要)
    try {
      await onSubmit(trimmed);
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
        className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 className="text-lg font-bold text-gray-900">投稿を却下する</h2>
          <div>
            <label
              htmlFor="reject-reason"
              className="block text-sm font-medium text-gray-700"
            >
              却下理由（1〜{MAX_REASON_LENGTH} 文字）
            </label>
            <textarea
              id="reject-reason"
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
