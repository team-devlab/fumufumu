"use client";

import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/config/routes";
import {
  useConsultationActions,
  useHasInput,
} from "@/features/consultation/stores/useConsultationFormStore";

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();

  const { reset } = useConsultationActions();
  const hasInput = useHasInput();

  // ロゴクリック時のハンドラ
  const handleLogoClick = () => {
    // 入力画面(/new)および確認画面(/new/confirm)を判定
    const isEditing = pathname.startsWith(ROUTES.CONSULTATION.NEW);

    if (isEditing && hasInput) {
      const ok = window.confirm(
        "入力中の内容は破棄されます。トップページに戻りますか？",
      );
      if (!ok) return;

      reset();
    }
    router.push(ROUTES.HOME);
  };

  const handleCreateNew = () => {
    // 新規作成ボタンは「どこにいても」Storeにゴミがあれば確認する
    if (hasInput) {
      const ok = window.confirm(
        "入力中の内容があります。破棄して新規作成しますか？",
      );
      if (!ok) return;
    }

    reset();
    router.push(ROUTES.CONSULTATION.NEW);
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b bg-white/90 backdrop-blur-sm sticky top-0 z-10">
      <div className="font-bold text-xl text-gray-800">
        <button
          type="button"
          onClick={handleLogoClick}
          className="hover:opacity-70 transition-opacity"
        >
          Fumufumu App
        </button>
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
