import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Advice, PaginationMeta } from "@/features/consultation/types";
import { HiddenAdviceList } from "./HiddenAdviceList";

const samplePagination = (overrides?: Partial<PaginationMeta>): PaginationMeta => ({
  current_page: 1,
  per_page: 20,
  total_items: 1,
  total_pages: 1,
  has_next: false,
  has_prev: false,
  ...overrides,
});

const sampleItem = (overrides?: Partial<Advice>): Advice => ({
  id: 1,
  consultation_id: 42,
  body: "サンプルアドバイス本文",
  draft: false,
  hidden_at: "2026-07-01T00:00:00Z",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "やまだ たろう", disabled: false },
  ...overrides,
});

describe("HiddenAdviceList", () => {
  it("status=success かつ items があると件数バッジと各 card, unhideボタンが出る", () => {
    render(
      <HiddenAdviceList
        status="success"
        items={[sampleItem({ id: 1 }), sampleItem({ id: 2 })]}
        pagination={samplePagination({ total_items: 2 })}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "再度公開する" })).toHaveLength(2);
  });

  it("reasonsに登録された理由がunhideダイアログに併記される", async () => {
    const user = userEvent.setup();
    render(
      <HiddenAdviceList
        status="success"
        items={[sampleItem({ id: 1 })]}
        pagination={samplePagination()}
        baseHref="/admin?tab=hidden"
        reasons={new Map([[1, "不適切な内容のため"]])}
      />,
    );
    await user.click(screen.getByRole("button", { name: "再度公開する" }));
    expect(screen.getByText(/現在の非表示理由:\s*不適切な内容のため/)).toBeInTheDocument();
  });

  it("所属相談IDへのlinkが出る", () => {
    render(
      <HiddenAdviceList
        status="success"
        items={[sampleItem({ id: 1, consultation_id: 99 })]}
        pagination={samplePagination()}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    expect(screen.getByRole("link", { name: "#99" })).toHaveAttribute(
      "href",
      "/consultations/99",
    );
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(
      <HiddenAdviceList
        status="success"
        items={[]}
        pagination={samplePagination({ total_items: 0 })}
        baseHref="/admin?tab=hidden"
        reasons={new Map()}
      />,
    );
    expect(screen.getByText("非表示中のアドバイスはありません")).toBeInTheDocument();
  });

  it("status=error だとエラーメッセージが出る", () => {
    render(<HiddenAdviceList status="error" message="サーバーが応答しませんでした" />);
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("アドバイスの取得に失敗しました")).toBeInTheDocument();
  });
});
