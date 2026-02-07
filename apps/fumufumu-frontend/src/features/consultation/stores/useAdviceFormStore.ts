import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type AdviceFormState = {
  body: string;
  setBody: (body: string) => void;
  reset: () => void;
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  body: "",
};

export const useAdviceFormStore = create<AdviceFormState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setBody: (body) => set({ body }),
      
      // リセット時は明示的に初期状態に戻す
      reset: () => set(INITIAL_STATE),
      
      hasInput: () => {
        const { body } = get();
        return body.trim() !== "";
      },
    }),
    {
      name: "advice-form-storage", // ストレージのキー名（一意にする）
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

//-- Selector Hooks --//
export const useAdviceBody = () => useAdviceFormStore((s) => s.body);
export const useAdviceHasInput = () => useAdviceFormStore((s) => s.hasInput());

export const useAdviceActions = () => {
  const setBody = useAdviceFormStore((s) => s.setBody);
  const reset = useAdviceFormStore((s) => s.reset);
  return { setBody, reset };
};