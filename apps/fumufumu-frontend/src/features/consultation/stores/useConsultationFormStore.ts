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

export const useConsultationFormStore = create<ConsultationFormState>(
  (set, get) => ({
    title: "",
    body: "",
    tags: [], // 初期値は空配列

    setTitle: (title) => set({ title }),
    setBody: (body) => set({ body }),
    setTags: (tags) => set({ tags }),

    reset: () => set({ title: "", body: "", tags: [] }),

    hasInput: () => {
      const { title, body, tags } = get();
      // タイトルか本文に文字がある、またはタグが選択されている場合に true
      return title.trim() !== "" || body.trim() !== "" || tags.length > 0;
    },
  }),
);