import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/features/consultation/config/constants";
import type { ConsultationFormTag } from "@/features/consultation/types";

// サーバから取得した下書きでストアを初期化するためのペイロード
type HydratePayload = {
  id: number;
  title: string;
  body: string;
  tags: ConsultationFormTag[];
};

type ConsultationEditFormState = {
  // 編集対象の相談ID。まだ seed していない場合は null
  editingId: number | null;
  title: string;
  body: string;
  tags: ConsultationFormTag[];
  // seed 後にユーザーが編集したか（未保存変更の有無 = usePreventUnload 用）
  isDirty: boolean;
  // persist(sessionStorage) の rehydration 完了フラグ。
  // Next.js では rehydration が mount 後に非同期反映されるため、seed の可否判定に使う。
  // ランタイム専用のため永続化しない（partialize で除外）。
  _hasHydrated: boolean;

  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setTags: (tags: ConsultationFormTag[]) => void;

  // サーバ取得した下書きでストアを初期化する（別の相談を開いた時のみ呼ぶ）
  hydrateForConsultation: (payload: HydratePayload) => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
};

const INITIAL_STATE = {
  editingId: null as number | null,
  title: "",
  body: "",
  tags: [] as ConsultationFormTag[],
  isDirty: false,
};

// store 自体は export しない（利用側は下部の selector / action フックを使う）
const useConsultationEditFormStore = create<ConsultationEditFormState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      _hasHydrated: false,

      // 編集操作はすべて「未保存変更あり」に倒す
      setTitle: (title) => set({ title, isDirty: true }),
      setBody: (body) => set({ body, isDirty: true }),
      setTags: (tags) => set({ tags, isDirty: true }),

      // seed 直後は未編集なので isDirty=false に戻す
      hydrateForConsultation: ({ id, title, body, tags }) =>
        set({ editingId: id, title, body, tags, isDirty: false }),

      reset: () => set({ ...INITIAL_STATE }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: STORAGE_KEYS.CONSULTATION_EDIT_FORM,
      storage: createJSONStorage(() => sessionStorage),
      // _hasHydrated はランタイムフラグなので永続化しない
      partialize: ({ editingId, title, body, tags, isDirty }) => ({
        editingId,
        title,
        body,
        tags,
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
export const useEditingConsultationId = () =>
  useConsultationEditFormStore((s) => s.editingId);
export const useConsultationEditTitle = () =>
  useConsultationEditFormStore((s) => s.title);
export const useConsultationEditBody = () =>
  useConsultationEditFormStore((s) => s.body);
export const useConsultationEditTags = () =>
  useConsultationEditFormStore((s) => s.tags);
export const useConsultationEditIsDirty = () =>
  useConsultationEditFormStore((s) => s.isDirty);
export const useConsultationEditHasHydrated = () =>
  useConsultationEditFormStore((s) => s._hasHydrated);

//-- Action Hooks --//
export const useConsultationEditActions = () => {
  const setTitle = useConsultationEditFormStore((s) => s.setTitle);
  const setBody = useConsultationEditFormStore((s) => s.setBody);
  const setTags = useConsultationEditFormStore((s) => s.setTags);
  const hydrateForConsultation = useConsultationEditFormStore(
    (s) => s.hydrateForConsultation,
  );
  const reset = useConsultationEditFormStore((s) => s.reset);

  return { setTitle, setBody, setTags, hydrateForConsultation, reset };
};
