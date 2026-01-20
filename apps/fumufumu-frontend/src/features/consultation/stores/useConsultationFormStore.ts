import { create } from "zustand";

type ConsultationFormState = {
  title: string;
  body: string;
  tags: string[];

  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setTags: (tags: string[]) => void;

  reset: () => void;
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  title: "",
  body: "",
  tags: [] as string[],
};

// store自体は export しない（直接使わせない）のが理想
const useConsultationFormStore = create<ConsultationFormState>(
  (set, get) => ({
    ...INITIAL_STATE,

    setTitle: (title) => set({ title }),
    setBody: (body) => set({ body }),
    setTags: (tags) => set({ tags }),

    reset: () => set(INITIAL_STATE),

    hasInput: () => {
      const { title, body, tags } = get();
      return title.trim() !== "" || body.trim() !== "" || tags.length > 0;
    },
  }),
);

//-- Selector Hooks (ここから下を利用側でimportする) --//

// 値取得用 (個別に取得することで、無関係な更新による再レンダリングを防ぐ)
export const useConsultationTitle = () => useConsultationFormStore((s) => s.title);
export const useConsultationBody = () => useConsultationFormStore((s) => s.body);
export const useConsultationTags = () => useConsultationFormStore((s) => s.tags);
export const useHasInput = () => useConsultationFormStore((s) => s.hasInput());

// アクション取得用
export const useConsultationActions = () => {
  const setTitle = useConsultationFormStore((s) => s.setTitle);
  const setBody = useConsultationFormStore((s) => s.setBody);
  const setTags = useConsultationFormStore((s) => s.setTags);
  const reset = useConsultationFormStore((s) => s.reset);
  
  return { setTitle, setBody, setTags, reset };
};
