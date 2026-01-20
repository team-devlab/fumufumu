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
};

export const useConsultationFormStore = create<ConsultationFormState>((set) => ({
  title: "",
  body: "",
  tags: [], // 初期値は空配列
  
  setTitle: (title) => set({ title }),
  setBody: (body) => set({ body }),
  setTags: (tags) => set({ tags }),
  
  reset: () => set({ title: "", body: "", tags: [] }),
}));
