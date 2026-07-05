import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "@/config/routes";
import { updateConsultation } from "@/features/consultation/api/consultationClientApi";
import { useConsultationEditFormStore } from "@/features/consultation/stores/useConsultationEditFormStore";
import type { ConsultationDetail, Tag } from "@/features/consultation/types";
import { ConsultationEditConfirmContainer } from "./ConsultationEditConfirmContainer";
import { ConsultationEditContainer } from "./ConsultationEditContainer";

vi.mock("@/features/consultation/api/consultationClientApi", () => ({
  updateConsultation: vi.fn(),
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

const availableTags: Tag[] = [
  { id: 2, name: "キャリア", sort_order: 1, count: 3 },
];

const buildDetail = (id: number): ConsultationDetail => ({
  id,
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
});

// 編集ストアにサーバ値を seed する。ストアは非公開のため、実際の seed 経路である
// entry コンテナのレンダーで注入し、確認画面がそれを読める状態を作る。
const seedStore = (id: number) => {
  const { unmount } = render(
    <ConsultationEditContainer
      consultation={buildDetail(id)}
      availableTags={availableTags}
    />,
  );
  unmount();
};

beforeEach(() => {
  vi.clearAllMocks();
  // 編集ストアは sessionStorage 永続かつ in-memory singleton。sessionStorage.clear だけでは
  // メモリ上の editingId 等が残るため、ストア本体も明示的に初期化してテスト間の持ち越しを防ぐ。
  sessionStorage.clear();
  useConsultationEditFormStore.getState().reset();
});

describe("ConsultationEditConfirmContainer", () => {
  it("公開すると updateConsultation を draft:false とタグで呼び、プロフィールへ遷移する(審査中導線)", async () => {
    const user = userEvent.setup();
    vi.mocked(updateConsultation).mockResolvedValue({
      id: 31,
      draft: false,
      updated_at: "2026-07-05T00:00:00Z",
    });
    seedStore(31);

    render(<ConsultationEditConfirmContainer consultationId={31} />);
    await user.click(screen.getByRole("button", { name: "投稿する" }));

    await waitFor(() => {
      expect(updateConsultation).toHaveBeenCalledWith(31, {
        title: "編集対象のタイトル",
        body: "編集対象の本文です。これは10文字以上あります。",
        draft: false,
        tagIds: [2],
      });
    });
    // ADR 007 / #155: 公開直後は pending のため一覧ではなくプロフィールへ
    expect(pushMock).toHaveBeenCalledWith(ROUTES.USER);
    // Router Cache 無効化(遷移先プロフィール一覧を最新化)まで担保する
    expect(refreshMock).toHaveBeenCalled();
  });

  it("ストアが対象の相談を保持していない時は公開せず編集画面へ戻す(誤爆防止)", async () => {
    const user = userEvent.setup();
    // seed しない → ストアの editingId は対象 id と不一致

    render(<ConsultationEditConfirmContainer consultationId={40} />);
    await user.click(screen.getByRole("button", { name: "投稿する" }));

    expect(updateConsultation).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith(ROUTES.CONSULTATION.EDIT(40));
  });
});
