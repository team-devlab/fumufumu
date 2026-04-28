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
    router.push(ROUTES.CONSULTATION.LIST);
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
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
        <div>
          <button
            type="button"
            onClick={handleLogoClick}
            className="inline-flex items-center gap-2 rounded-md bg-[#0F9F92] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0C8F84]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
              aria-label="ホームアイコン"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10.5L12 3l9 7.5M6 9.5V21h12V9.5"
              />
            </svg>
            <span>ホーム</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              onBlur={handleMenuButtonBlur}
              onKeyDown={handleUserMenuKeyDown}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0F9F92] bg-white text-[#0F9F92] transition duration-150 hover:bg-[#E9FBF8]"
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
                className="absolute right-0 mt-2 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleGoToProfile}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                >
                  プロフィール
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignout}
                  disabled={isLoading}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  サインアウト
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleCreateNew}
            type="button"
            className="inline-flex h-10 items-center rounded-full bg-[#F2C300] px-6 text-sm font-bold text-[#5C3A00] transition-colors duration-150 hover:bg-[#EAB308]"
          >
            相談する
          </button>
        </div>
      </div>
    </header>
  );
};
