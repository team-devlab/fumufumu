import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/features/consultation/config/constants";
import type { ConsultationFormTag } from "@/features/consultation/types";

const normalizeTags = (rawTags: unknown): ConsultationFormTag[] => {
  if (!Array.isArray(rawTags)) return [];

  const normalizedTags: ConsultationFormTag[] = [];
  const seenKeys = new Set<string>();

  for (const rawTag of rawTags) {
    if (typeof rawTag === "string") {
      // 旧形式(string[])互換: id不明として保持し、後続のタグ一覧取得時に解決する
      const name = rawTag.trim();
      if (!name) continue;
      const key = `legacy:${name}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      normalizedTags.push({ id: 0, name });
      continue;
    }

    if (!rawTag || typeof rawTag !== "object") continue;
    const candidate = rawTag as { id?: unknown; name?: unknown };
    if (typeof candidate.name !== "string") continue;
    const name = candidate.name.trim();
    if (!name) continue;

    const id =
      typeof candidate.id === "number" && Number.isInteger(candidate.id)
        ? candidate.id
        : 0;
    const key = id > 0 ? `id:${id}` : `name:${name}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    normalizedTags.push({ id, name });
  }

  return normalizedTags;
};

type ConsultationFormState = {
  title: string;
  body: string;
  tags: ConsultationFormTag[];

  setTitle: (title: string) => void;
  setBody: (body: string) => void;
  setTags: (tags: ConsultationFormTag[]) => void;

  reset: () => void;
  hasInput: () => boolean;
};

const INITIAL_STATE = {
  title: "",
  body: "",
  tags: [] as ConsultationFormTag[],
};

// store自体は export しない（直接使わせない）のが理想
const useConsultationFormStore = create<ConsultationFormState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setTitle: (title) => set({ title }),
      setBody: (body) => set({ body }),
      setTags: (tags) => set({ tags: normalizeTags(tags) }),

      // リセット時は明示的に初期状態に戻す
      reset: () => set(INITIAL_STATE),

      hasInput: () => {
        const { title, body, tags } = get();
        return (
          title.trim() !== "" ||
          body.trim() !== "" ||
          normalizeTags(tags).length > 0
        );
      },
    }),
    {
      name: STORAGE_KEYS.CONSULTATION_FORM,
      storage: createJSONStorage(() => sessionStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return currentState;
        }

        const rawState = persistedState as Partial<ConsultationFormState> & {
          tags?: unknown;
        };
        return {
          ...currentState,
          ...rawState,
          tags: normalizeTags(rawState.tags),
        };
      },
    },
  ),
);

//-- Selector Hooks (ここから下を利用側でimportする) --//

// 値取得用 (個別に取得することで、無関係な更新による再レンダリングを防ぐ)
export const useConsultationTitle = () =>
  useConsultationFormStore((s) => s.title);
export const useConsultationBody = () =>
  useConsultationFormStore((s) => s.body);
export const useConsultationTags = () =>
  useConsultationFormStore((s) => s.tags);
export const useHasInput = () => useConsultationFormStore((s) => s.hasInput());

// アクション取得用
export const useConsultationActions = () => {
  const setTitle = useConsultationFormStore((s) => s.setTitle);
  const setBody = useConsultationFormStore((s) => s.setBody);
  const setTags = useConsultationFormStore((s) => s.setTags);
  const reset = useConsultationFormStore((s) => s.reset);

  return { setTitle, setBody, setTags, reset };
};
