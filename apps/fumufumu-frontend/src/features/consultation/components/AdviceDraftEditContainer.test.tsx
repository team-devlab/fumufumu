import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/config/routes";
import { updateDraftAdvice } from "@/features/consultation/api/consultationClientApi";
import { useAdviceEditFormStore } from "@/features/consultation/stores/useAdviceEditFormStore";
import type { ConsultationDetail } from "@/features/consultation/types";
import { AdviceDraftEditContainer } from "./AdviceDraftEditContainer";

vi.mock("@/features/consultation/api/consultationClientApi", () => ({
  updateDraftAdvice: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// vitest.setup.ts の useRouter は呼び出しごとに新しい fn を返し push を観測できないため、
// このファイル限定で安定参照の push を掴めるよう再モックする。
const { pushMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: refreshMock,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const buildDetail = (
  overrides?: Partial<ConsultationDetail>,
): ConsultationDetail => ({
  id: 7,
  title: "アドバイス先の相談タイトル",
  body_preview: "相談本文プレビュー",
  body: "相談本文です。これは10文字以上あります。",
  draft: false,
  hidden_at: null,
  solved_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "テスト太郎", disabled: false },
  advices: [],
  tags: [],
  ...overrides,
});

const initialBody = "編集対象のアドバイス本文です。10文字以上あります。";

beforeEach(() => {
  vi.clearAllMocks();
  // 編集ストアは sessionStorage 永続かつ in-memory singleton。sessionStorage.clear だけでは
  // メモリ上の editingId 等が残るため、ストア本体も明示的に初期化してテスト間の持ち越しを防ぐ。
  sessionStorage.clear();
  useAdviceEditFormStore.getState().reset();
});

describe("AdviceDraftEditContainer", () => {
  it("サーバ取得の下書き本文を seed してフォームに初期表示する", () => {
    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={55}
        initialBody={initialBody}
      />,
    );

    expect(screen.getByLabelText("アドバイス内容")).toHaveValue(initialBody);
  });

  it("render 時の seed で React の『レンダー中に別コンポーネントを更新』警告を出さない", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={55}
        initialBody={initialBody}
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

  it("下書きを更新すると updateDraftAdvice を adviceID・本文で呼び、プロフィールへ遷移する", async () => {
    const user = userEvent.setup();
    vi.mocked(updateDraftAdvice).mockResolvedValue({
      id: 20,
      draft: true,
      updated_at: "2026-07-05T00:00:00Z",
      created_at: "2026-07-01T00:00:00Z",
    });

    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={20}
        initialBody={initialBody}
      />,
    );

    await user.click(screen.getByRole("button", { name: "下書きを更新" }));

    await waitFor(() => {
      expect(updateDraftAdvice).toHaveBeenCalledWith(20, initialBody);
    });
    expect(pushMock).toHaveBeenCalledWith(ROUTES.USER);
    // Router Cache 無効化(遷移先プロフィール一覧を最新化)まで担保する
    expect(refreshMock).toHaveBeenCalled();
    // reset() 後に古い prop で再 seed されず、ストアがクリアされたままであること
    // (再 seed されると編集前の値が復活し、保存内容が画面に反映されなくなる回帰の防止)
    await waitFor(() => {
      expect(useAdviceEditFormStore.getState().editingId).toBeNull();
    });
  });

  it("本文が短すぎる場合は更新せずエラーを出す", async () => {
    const user = userEvent.setup();

    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={21}
        initialBody={initialBody}
      />,
    );

    const textarea = screen.getByLabelText("アドバイス内容");
    await user.clear(textarea);
    await user.type(textarea, "短い");

    await user.click(screen.getByRole("button", { name: "下書きを更新" }));

    expect(updateDraftAdvice).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("『確認画面へ』は本文が十分なら確認ルートへ遷移し、下書き更新 API は叩かない", async () => {
    const user = userEvent.setup();

    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={22}
        initialBody={initialBody}
      />,
    );

    await user.click(screen.getByRole("button", { name: "確認画面へ" }));

    expect(pushMock).toHaveBeenCalledWith(ROUTES.ADVICE.DRAFT_EDIT_CONFIRM(22));
    expect(updateDraftAdvice).not.toHaveBeenCalled();
  });

  it("『確認画面へ』は本文が短すぎる場合は遷移せずエラーを出す", async () => {
    const user = userEvent.setup();

    render(
      <AdviceDraftEditContainer
        consultation={buildDetail()}
        adviceId={23}
        initialBody={initialBody}
      />,
    );

    const textarea = screen.getByLabelText("アドバイス内容");
    await user.clear(textarea);
    await user.type(textarea, "短い");

    await user.click(screen.getByRole("button", { name: "確認画面へ" }));

    expect(pushMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
