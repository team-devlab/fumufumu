"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api/client";
import {
  hideModerationTargetApi,
  unhideModerationTargetApi,
} from "../api/moderationActionApi";
import type { ModerationTargetType } from "../types";
import { ModerationDialog } from "./ModerationDialog";

type Props =
  | {
      mode: "hide";
      targetType: ModerationTargetType;
      targetId: number;
    }
  | {
      mode: "unhide";
      targetType: ModerationTargetType;
      targetId: number;
      /** 非表示中タブでの現在の hide 理由併記用 (ADR 011 §5.1) */
      currentReason: string | null;
    };

export const ModerationActions = (props: Props) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({
    reason,
    skipAuditLog,
  }: {
    reason?: string;
    skipAuditLog: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      if (props.mode === "hide") {
        await hideModerationTargetApi(
          props.targetType,
          props.targetId,
          reason,
          skipAuditLog,
        );
        toast.success("非表示にしました");
      } else {
        await unhideModerationTargetApi(props.targetType, props.targetId, skipAuditLog);
        toast.success("再度公開しました");
      }
      router.refresh();
    } catch (error) {
      // 404: 他の管理者が直前にhide/unhide済み、または投稿自体が削除された可能性。
      // この場合はリストをrefreshして最新状態に合わせる方が現実と整合する。
      if (error instanceof ApiError && error.status === 404) {
        toast.error("他の管理者が既に処理した可能性があります");
        router.refresh();
      } else if (error instanceof ApiError) {
        toast.error(
          props.mode === "hide" ? "非表示化に失敗しました" : "再公開に失敗しました",
        );
      } else {
        toast.error("ネットワーク接続を確認してください");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (props.mode === "hide") {
    return (
      <ModerationDialog
        mode="hide"
        title="投稿を非表示にする"
        triggerLabel="非表示にする"
        triggerClassName="rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        description={
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
            非表示にすると、投稿者本人であってもこの投稿を閲覧できなくなります。
          </p>
        }
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    );
  }

  return (
    <ModerationDialog
      mode="unhide"
      title="投稿を再度公開する"
      triggerLabel="再度公開する"
      triggerClassName="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
      description={
        <p>
          現在の非表示理由:{" "}
          {props.currentReason ?? <span className="text-gray-400">(未入力)</span>}
        </p>
      }
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  );
};
