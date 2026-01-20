import { create } from "zustand";

type ConsultationFormState = {
  title: string;
  body: string;
  // UI上の表示用のみ（APIには送信しない想定）
  tags: string[];

  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setTags: (tags: string[]) => void;

  // ADR 003: アクション駆動リセット用
  reset: () => void;
  
  // 入力があるかどうかを判定する関数 (Getter)
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  title: "",
  body: "",
  tags: [] as string[],
};

export const useConsultationFormStore = create<ConsultationFormState>(
  (set, get) => ({
    ...INITIAL_STATE, // 初期値を展開

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