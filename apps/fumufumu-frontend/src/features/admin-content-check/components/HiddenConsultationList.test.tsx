import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type {
  Consultation,
  PaginationMeta,
} from "@/features/consultation/types";
import { HiddenConsultationList } from "./HiddenConsultationList";

const samplePagination = (
  overrides?: Partial<PaginationMeta>,
): PaginationMeta => ({
  current_page: 1,
  per_page: 20,
  total_items: 1,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  ...overrides,
});

const sampleItem = (overrides?: Partial<Consultation>): Consultation => ({
  id: 1,
  title: "サンプル相談",
  body_preview: "サンプル本文",
  draft: false,
  hidden_at: "2026-07-01T00:00:00Z",
  solved_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "やまだ たろう", disabled: false },
  ...overrides,
});

describe("HiddenConsultationList", () => {
  it("status=success かつ items があると件数バッジと各 card, unhideボタンが出る", () => {
    render(
      <HiddenConsultationList
        status="success"
        items={[sampleItem({ id: 1 }), sampleItem({ id: 2 })]}
        pagination={samplePagination({ total_items: 2 })}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "再度公開する" }),
    ).toHaveLength(2);
  });

  it("reasonsに登録された理由がunhideダイアログに併記される", async () => {
    const user = userEvent.setup();
    render(
      <HiddenConsultationList
        status="success"
        items={[sampleItem({ id: 1 })]}
        pagination={samplePagination()}
        baseHref="/admin?tab=hidden"
        reasons={new Map([[1, "スパム投稿のため"]])}
      />,
    );
    await user.click(screen.getByRole("button", { name: "再度公開する" }));
    expect(
      screen.getByText(/現在の非表示理由:\s*スパム投稿のため/),
    ).toBeInTheDocument();
  });

  it("reasonsに無いidは(未入力)表示になる", async () => {
    const user = userEvent.setup();
    render(
      <HiddenConsultationList
        status="success"
        items={[sampleItem({ id: 1 })]}
        pagination={samplePagination()}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "再度公開する" }));
    expect(screen.getByText("(未入力)")).toBeInTheDocument();
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(
      <HiddenConsultationList
        status="success"
        items={[]}
        pagination={samplePagination({ total_items: 0 })}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    expect(screen.getByText("非表示中の相談はありません")).toBeInTheDocument();
  });

  it("status=error だとエラーメッセージが出る", () => {
    render(
      <HiddenConsultationList
        status="error"
        message="サーバーが応答しませんでした"
      />,
    );
    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("相談の取得に失敗しました"),
    ).toBeInTheDocument();
  });
});
