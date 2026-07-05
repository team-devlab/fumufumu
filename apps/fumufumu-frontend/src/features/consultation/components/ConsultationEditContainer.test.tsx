import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/config/routes";
import { updateConsultation } from "@/features/consultation/api/consultationClientApi";
import { useConsultationEditFormStore } from "@/features/consultation/stores/useConsultationEditFormStore";
import type { ConsultationDetail, Tag } from "@/features/consultation/types";
import { ConsultationEditContainer } from "./ConsultationEditContainer";

vi.mock("@/features/consultation/api/consultationClientApi", () => ({
  updateConsultation: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// vitest.setup.ts の useRouter は呼び出しごとに新しい fn を返し push を観測できないため、
// このファイル限定で安定参照の push を掴めるよう再モックする。
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const buildDetail = (
  overrides?: Partial<ConsultationDetail>,
): ConsultationDetail => ({
  id: 7,
  title: "編集対象のタイトル",
  body_preview: "編集対象の本文プレビュー",
  body: "編集対象の本文です。これは10文字以上あります。",
  draft: true,
  hidden_at: null,
  solved_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "テスト太郎", disabled: false },
  advices: [],
  tags: [{ id: 2, name: "キャリア" }],
  ...overrides,
});

const availableTags: Tag[] = [
  { id: 2, name: "キャリア", sort_order: 1, count: 3 },
  { id: 5, name: "転職", sort_order: 2, count: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  // 編集ストアは sessionStorage 永続かつ in-memory singleton。sessionStorage.clear だけでは
  // メモリ上の editingId 等が残るため、ストア本体も明示的に初期化してテスト間の持ち越しを防ぐ。
  sessionStorage.clear();
  useConsultationEditFormStore.getState().reset();
});

describe("ConsultationEditContainer", () => {
  it("サーバ取得の下書きを seed してフォームに初期表示する", () => {
    render(
      <ConsultationEditContainer
        consultation={buildDetail()}
        availableTags={availableTags}
      />,
    );

    expect(screen.getByLabelText("タイトル")).toHaveValue("編集対象のタイトル");
    expect(screen.getByLabelText("相談内容")).toHaveValue(
      "編集対象の本文です。これは10文字以上あります。",
    );
  });

  it("render 時の seed で React の『レンダー中に別コンポーネントを更新』警告を出さない", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ConsultationEditContainer
        consultation={buildDetail()}
        availableTags={availableTags}
      />,
    );

    const warned = errorSpy.mock.calls.some((args) =>
      /Cannot update a component|while rendering a different component/.test(
        String(args[0]),
      ),
    );
    expect(warned).toBe(false);

    errorSpy.mockRestore();
  });

  it("下書き保存すると updateConsultation を draft:true と現在のタグで呼び、プロフィールへ遷移する", async () => {
    const user = userEvent.setup();
    vi.mocked(updateConsultation).mockResolvedValue({
      id: 20,
      draft: true,
      updated_at: "2026-07-05T00:00:00Z",
    });

    render(
      <ConsultationEditContainer
        consultation={buildDetail({ id: 20 })}
        availableTags={availableTags}
      />,
    );

    await user.click(screen.getByRole("button", { name: "下書き保存" }));

    await waitFor(() => {
      expect(updateConsultation).toHaveBeenCalledWith(20, {
        title: "編集対象のタイトル",
        body: "編集対象の本文です。これは10文字以上あります。",
        draft: true,
        tagIds: [2],
      });
    });
    expect(pushMock).toHaveBeenCalledWith(ROUTES.USER);
  });

  it("確認画面へは編集確認ルートへ遷移する", async () => {
    const user = userEvent.setup();

    render(
      <ConsultationEditContainer
        consultation={buildDetail({ id: 21 })}
        availableTags={availableTags}
      />,
    );

    await user.click(screen.getByRole("button", { name: "確認画面へ" }));

    expect(pushMock).toHaveBeenCalledWith(ROUTES.CONSULTATION.EDIT_CONFIRM(21));
  });

  it("タグが無い下書きは確認画面へ進めない(公開にはタグが必須)", async () => {
    const user = userEvent.setup();

    render(
      <ConsultationEditContainer
        consultation={buildDetail({ id: 22, tags: [] })}
        availableTags={availableTags}
      />,
    );

    await user.click(screen.getByRole("button", { name: "確認画面へ" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
