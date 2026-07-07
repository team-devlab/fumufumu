import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/config/routes";
import {
  publishAdvice,
  updateDraftAdvice,
} from "@/features/consultation/api/consultationClientApi";
import { useAdviceEditFormStore } from "@/features/consultation/stores/useAdviceEditFormStore";
import type { ConsultationDetail } from "@/features/consultation/types";
import { AdviceDraftEditContainer } from "./AdviceDraftEditContainer";
import { AdvicePublishConfirmContainer } from "./AdvicePublishConfirmContainer";

vi.mock("@/features/consultation/api/consultationClientApi", () => ({
  publishAdvice: vi.fn(),
  updateDraftAdvice: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const { pushMock, replaceMock, refreshMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: refreshMock,
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const buildDetail = (): ConsultationDetail => ({
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
});

const initialBody =
  "確認画面で公開するアドバイス本文です。10文字以上あります。";

// 編集ストアにサーバ値を seed する。ストアは非公開のため、実際の seed 経路である
// entry コンテナのレンダーで注入し、確認画面がそれを読める状態を作る(A のテストと同型)。
const seedStore = (adviceId: number) => {
  const { unmount } = render(
    <AdviceDraftEditContainer
      consultation={buildDetail()}
      adviceId={adviceId}
      initialBody={initialBody}
    />,
  );
  unmount();
};

beforeEach(() => {
  vi.clearAllMocks();
  // 編集ストアは sessionStorage 永続かつ in-memory singleton。sessionStorage.clear だけでは
  // メモリ上の editingId 等が残るため、ストア本体も明示的に初期化してテスト間の持ち越しを防ぐ。
  sessionStorage.clear();
  useAdviceEditFormStore.getState().reset();
});

describe("AdvicePublishConfirmContainer", () => {
  it("公開すると publishAdvice を adviceId・本文で呼び、プロフィールへ遷移する(審査中導線)", async () => {
    const user = userEvent.setup();
    vi.mocked(publishAdvice).mockResolvedValue({
      id: 31,
      draft: false,
      updated_at: "2026-07-07T00:00:00Z",
      created_at: "2026-07-01T00:00:00Z",
    });
    seedStore(31);

    render(
      <AdvicePublishConfirmContainer
        consultation={buildDetail()}
        adviceId={31}
      />,
    );
    await user.click(screen.getByRole("button", { name: "公開する" }));

    await waitFor(() => {
      expect(publishAdvice).toHaveBeenCalledWith(31, initialBody);
    });
    // ADR 007: 公開直後は pending のため一覧ではなくプロフィールへ
    expect(pushMock).toHaveBeenCalledWith(ROUTES.USER);
    // Router Cache 無効化(遷移先プロフィール一覧を最新化)まで担保する
    expect(refreshMock).toHaveBeenCalled();
    // 成功後は編集ストアが破棄されていること
    await waitFor(() => {
      expect(useAdviceEditFormStore.getState().editingId).toBeNull();
    });
  });

  it("下書き保存すると updateDraftAdvice を呼び、公開はしない", async () => {
    const user = userEvent.setup();
    vi.mocked(updateDraftAdvice).mockResolvedValue({
      id: 32,
      draft: true,
      updated_at: "2026-07-07T00:00:00Z",
      created_at: "2026-07-01T00:00:00Z",
    });
    seedStore(32);

    render(
      <AdvicePublishConfirmContainer
        consultation={buildDetail()}
        adviceId={32}
      />,
    );
    await user.click(screen.getByRole("button", { name: "下書き保存" }));

    await waitFor(() => {
      expect(updateDraftAdvice).toHaveBeenCalledWith(32, initialBody);
    });
    expect(publishAdvice).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith(ROUTES.USER);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("ストアが対象のアドバイスを保持していない時は公開せず編集画面へ戻す(誤爆防止)", async () => {
    const user = userEvent.setup();
    // seed しない → ストアの editingId は対象 id と不一致

    render(
      <AdvicePublishConfirmContainer
        consultation={buildDetail()}
        adviceId={40}
      />,
    );
    await user.click(screen.getByRole("button", { name: "公開する" }));

    expect(publishAdvice).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith(ROUTES.ADVICE.DRAFT_EDIT(40));
  });
});
