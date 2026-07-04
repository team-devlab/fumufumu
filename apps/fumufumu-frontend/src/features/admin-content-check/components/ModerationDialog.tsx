"use client";

import { useId, useRef, useState } from "react";

// backend validator (apps/fumufumu-backend/src/validators/moderation.validator.ts)
// の reason 上限 (.max(500)) と同条件。RejectDialog と同じ理由で frontend 側にも
// 同じ定数を宣言している (共有定数化は別issue、RejectDialog.tsx 参照)。
const MAX_REASON_LENGTH = 500;

type Props = {
  mode: "hide" | "unhide";
  /** ダイアログを開くトリガーボタンのラベル (例: "非表示にする" / "再度公開する") */
  triggerLabel: string;
  /** ダイアログ見出し */
  title: string;
  /** trigger ボタンの見た目 (Tailwind class) */
  triggerClassName: string;
  /** 見出し直下に表示する注意文・現在のhide理由など */
  description?: React.ReactNode;
  /**
   * 確定時に呼ばれる。reasonはmode="hide"の時のみ意味を持つ (unhideでは常にundefined)。
   * 成否にかかわらずdialogは閉じる (finallyでclose)。throwされたerrorは内部で握りつぶすため、
   * user-visibleなerror feedback (toast等) は親componentの責務。
   */
  onSubmit: (input: { reason?: string; skipAuditLog: boolean }) => Promise<void>;
  /** 親の submission 状態と同期。submit ボタンの二重押下防止に使う */
  isSubmitting: boolean;
};

export const ModerationDialog = ({
  mode,
  triggerLabel,
  title,
  triggerClassName,
  description,
  onSubmit,
  isSubmitting,
}: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const skipAuditLogId = useId();
  const [reason, setReason] = useState("");
  const [skipAuditLog, setSkipAuditLog] = useState(false);

  const handleOpen = () => {
    setReason("");
    setSkipAuditLog(false);
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = reason.trim();

    try {
      await onSubmit({
        reason: mode === "hide" && trimmed.length > 0 ? trimmed : undefined,
        skipAuditLog,
      });
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
        className={triggerClassName}
      >
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-full max-w-md rounded-lg p-0 shadow-xl backdrop:bg-black/50"
      >
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            {title}
          </h2>

          {description && (
            <div className="text-sm text-gray-600">{description}</div>
          )}

          {mode === "hide" && (
            <div>
              <label
                htmlFor={reasonId}
                className="block text-sm font-medium text-gray-700"
              >
                非表示理由（任意、〜{MAX_REASON_LENGTH} 文字）
              </label>
              <textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={MAX_REASON_LENGTH}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">残り {remaining} 文字</p>
            </div>
          )}

          <div className="flex items-start gap-2">
            <input
              id={skipAuditLogId}
              type="checkbox"
              checked={skipAuditLog}
              onChange={(e) => setSkipAuditLog(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor={skipAuditLogId} className="text-sm text-gray-700">
              テストデータ（監査ログを残さない）
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              閉じる
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={
                mode === "hide"
                  ? "rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  : "rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              実行する
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
};
