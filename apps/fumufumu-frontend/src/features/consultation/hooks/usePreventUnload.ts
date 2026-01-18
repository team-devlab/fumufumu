"use client";

import { useEffect } from "react";

/**
 * ブラウザの「戻る」「更新」「閉じる」系のボタン操作時に確認ダイアログを出すフック
 * @param isDirty - 保存されていない変更があるかどうか
 */
export const usePreventUnload = (isDirty: boolean) => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);
};
