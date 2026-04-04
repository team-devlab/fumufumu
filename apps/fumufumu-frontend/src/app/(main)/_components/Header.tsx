"use client";

import { usePathname, useRouter } from "next/navigation";
import type { FocusEvent, KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useConsultationActions,
  useHasInput,
} from "@/features/consultation/stores/useConsultationFormStore";

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { signout, isLoading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);

  const { reset } = useConsultationActions();
  const hasInput = useHasInput();

  const handleMenuButtonBlur = (event: FocusEvent<HTMLButtonElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (menuPanelRef.current?.contains(nextFocused)) return;
    setIsUserMenuOpen(false);
  };

  const handleMenuPanelBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextFocused)) {
      setIsUserMenuOpen(false);
    }
  };

  const handleUserMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    setIsUserMenuOpen(false);
    menuButtonRef.current?.focus();
  };

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

  const handleSignout = () => {
    setIsUserMenuOpen(false);
    signout();
  };

  const handleGoToProfile = () => {
    setIsUserMenuOpen(false);
    router.push(ROUTES.USER);
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
          onClick={handleCreateNew}
          type="button"
          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition duration-150 flex items-center"
        >
          + 新規作成
        </button>
        <div className="relative">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            onBlur={handleMenuButtonBlur}
            onKeyDown={handleUserMenuKeyDown}
            className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 hover:bg-teal-200 transition duration-150"
            aria-label="ユーザーメニュー"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="ユーザーアイコン"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>

          {isUserMenuOpen && (
            <div
              ref={menuPanelRef}
              role="menu"
              aria-label="ユーザーメニュー項目"
              onBlur={handleMenuPanelBlur}
              onKeyDown={handleUserMenuKeyDown}
              className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1 z-20"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleGoToProfile}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                プロフィール
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignout}
                disabled={isLoading}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                サインアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
