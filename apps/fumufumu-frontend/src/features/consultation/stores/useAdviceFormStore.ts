import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/features/consultation/config/constants";

type AdviceFormState = {
  body: string;
  setBody: (body: string) => void;
  reset: () => void;
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  body: "",
};

const useAdviceFormStore = create<AdviceFormState>()(
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
      name: STORAGE_KEYS.ADVICE_FORM,
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
