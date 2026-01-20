"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { useConsultationFormStore } from "@/features/consultation/stores/useConsultationFormStore";

export const TemporaryHeader = () => {
  const router = useRouter();
  // Storeからreset関数を取得（Selectorパターンで再レンダリング防止）
  const reset = useConsultationFormStore((state) => state.reset);

  // ADR 003: Entry Pointでのリセット処理
  const handleCreateNew = () => {
    reset(); // ストアを初期化
    router.push(ROUTES.CONSULTATION.NEW);
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b bg-white/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="font-bold text-xl text-gray-800">
        <Link href={ROUTES.HOME}>Fumufumu App</Link>
      </div>
      <div className="flex items-center space-x-4">
        <button
          type="button"
          className="text-gray-600 hover:text-gray-800 p-2 rounded-full transition duration-150"
        >
          SET
        </button>
        <button
          onClick={handleCreateNew}
          type="button"
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition duration-150 flex items-center"
        >
          + 新規作成
        </button>
      </div>
    </header>
  );
};
