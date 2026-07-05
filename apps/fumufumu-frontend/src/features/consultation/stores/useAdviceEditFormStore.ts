import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/features/consultation/config/constants";

// サーバから取得した下書きでストアを初期化するためのペイロード。
// 同一相談に本人の複数アドバイスが併存し得るため、編集対象キーは adviceId で持つ。
type HydratePayload = {
  adviceId: number;
  body: string;
};

type AdviceEditFormState = {
  // 編集対象のアドバイスID。まだ seed していない場合は null
  editingId: number | null;
  body: string;
  // seed 後にユーザーが編集したか（未保存変更の有無 = usePreventUnload 用）
  isDirty: boolean;
  // persist(sessionStorage) の rehydration 完了フラグ。
  // Next.js では rehydration が mount 後に非同期反映されるため、seed の可否判定に使う。
  // ランタイム専用のため永続化しない（partialize で除外）。
  _hasHydrated: boolean;

  setBody: (body: string) => void;

  // サーバ取得した下書きでストアを初期化する（別のアドバイスを開いた時のみ呼ぶ）
  hydrateForAdvice: (payload: HydratePayload) => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
};

const INITIAL_STATE = {
  editingId: null as number | null,
  body: "",
  isDirty: false,
};

// コンポーネント等の利用側は下部の selector / action フックを使う。
// ストア本体の直接参照は、テストでの状態リセット等の用途に限る。
export const useAdviceEditFormStore = create<AdviceEditFormState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      _hasHydrated: false,

      // 編集操作は「未保存変更あり」に倒す
      setBody: (body) => set({ body, isDirty: true }),

      // seed 直後は未編集なので isDirty=false に戻す
      hydrateForAdvice: ({ adviceId, body }) =>
        set({ editingId: adviceId, body, isDirty: false }),

      reset: () => set({ ...INITIAL_STATE }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: STORAGE_KEYS.ADVICE_EDIT_FORM,
      storage: createJSONStorage(() => sessionStorage),
      // _hasHydrated はランタイムフラグなので永続化しない
      partialize: ({ editingId, body, isDirty }) => ({
        editingId,
        body,
        isDirty,
      }),
      // rehydration 完了時にフラグを立てる（storage が空でも呼ばれる）
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

//-- Selector Hooks (値取得。個別購読で無関係な更新の再レンダリングを防ぐ) --//
export const useEditingAdviceId = () =>
  useAdviceEditFormStore((s) => s.editingId);
export const useAdviceEditBody = () => useAdviceEditFormStore((s) => s.body);
export const useAdviceEditIsDirty = () =>
  useAdviceEditFormStore((s) => s.isDirty);
export const useAdviceEditHasHydrated = () =>
  useAdviceEditFormStore((s) => s._hasHydrated);

//-- Action Hooks --//
export const useAdviceEditActions = () => {
  const setBody = useAdviceEditFormStore((s) => s.setBody);
  const hydrateForAdvice = useAdviceEditFormStore((s) => s.hydrateForAdvice);
  const reset = useAdviceEditFormStore((s) => s.reset);

  return { setBody, hydrateForAdvice, reset };
};
