"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api/client";
import {
  decideAdviceApi,
  decideConsultationApi,
} from "../api/adminContentCheckDecisionApi";

type Props = {
  kind: "consultation" | "advice";
  itemId: number;
};

export const DecisionActions = ({ kind, itemId }: Props) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!window.confirm("この投稿を承認しますか？")) return;

    setIsSubmitting(true);
    try {
      if (kind === "consultation") {
        await decideConsultationApi(itemId, "approved");
      } else {
        await decideAdviceApi(itemId, "approved");
      }
      toast.success("承認しました");
      router.refresh();
    } catch (error) {
      // 404: 他 admin が直前に承認/却下済みで pending 行が無い (backend NotFoundError)。
      // この場合はリストを refresh して該当アイテムを消す方が現実と整合する。
      if (error instanceof ApiError && error.status === 404) {
        toast.error("他の管理者が既に処理した可能性があります");
        router.refresh();
      } else {
        toast.error("承認に失敗しました");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={isSubmitting}
      className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      承認
    </button>
  );
};
