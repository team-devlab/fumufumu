"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api/client";
import {
  decideAdviceApi,
  decideConsultationApi,
} from "../api/adminContentCheckDecisionApi";
import { RejectDialog } from "./RejectDialog";

type Props = {
  kind: "consultation" | "advice";
  itemId: number;
};

export const DecisionActions = ({ kind, itemId }: Props) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const decide = async (decision: "approved" | "rejected", reason?: string) => {
    setIsSubmitting(true);
    try {
      if (kind === "consultation") {
        await decideConsultationApi(itemId, decision, reason);
      } else {
        await decideAdviceApi(itemId, decision, reason);
      }
      toast.success(decision === "approved" ? "承認しました" : "却下しました");
      router.refresh();
    } catch (error) {
      // 404: 他 admin が直前に承認/却下済みで pending 行が無い (backend NotFoundError)。
      // この場合はリストを refresh して該当アイテムを消す方が現実と整合する。
      if (error instanceof ApiError && error.status === 404) {
        toast.error("他の管理者が既に処理した可能性があります");
        router.refresh();
      } else {
        toast.error(
          decision === "approved" ? "承認に失敗しました" : "却下に失敗しました",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("この投稿を承認しますか？")) return;
    await decide("approved");
  };

  const handleReject = async (reason: string) => {
    await decide("rejected", reason);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleApprove}
        disabled={isSubmitting}
        className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        承認
      </button>
      <RejectDialog onSubmit={handleReject} isSubmitting={isSubmitting} />
    </>
  );
};
