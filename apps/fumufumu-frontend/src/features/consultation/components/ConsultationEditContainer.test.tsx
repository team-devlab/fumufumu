import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsultationDetail, Tag } from "@/features/consultation/types";
import { ConsultationEditContainer } from "./ConsultationEditContainer";

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
  // 編集ストアは sessionStorage 永続。テスト間で状態を持ち越さない
  sessionStorage.clear();
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
});
