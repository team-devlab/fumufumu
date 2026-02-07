import { create } from "zustand";

type AdviceFormState = {
  body: string;
  setBody: (body: string) => void;
  reset: () => void;
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  body: "",
};

const useAdviceFormStore = create<AdviceFormState>((set, get) => ({
  ...INITIAL_STATE,

  setBody: (body) => set({ body }),
  reset: () => set(INITIAL_STATE),
  hasInput: () => {
    const { body } = get();
    return body.trim() !== "";
  },
}));

//-- Selector Hooks --//

export const useAdviceBody = () => useAdviceFormStore((s) => s.body);
export const useAdviceHasInput = () => useAdviceFormStore((s) => s.hasInput());

export const useAdviceActions = () => {
  const setBody = useAdviceFormStore((s) => s.setBody);
  const reset = useAdviceFormStore((s) => s.reset);
  return { setBody, reset };
};
