import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Advice, PaginationMeta } from "@/features/consultation/types";
import { PublishedAdviceList } from "./PublishedAdviceList";

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
  hidden_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "やまだ たろう", disabled: false },
  ...overrides,
});

describe("PublishedAdviceList", () => {
  it("status=success かつ items があると件数バッジと各 card, hideボタンが出る", () => {
    render(
      <PublishedAdviceList
        status="success"
        items={[sampleItem({ id: 1, body: "アドバイスA" }), sampleItem({ id: 2, body: "アドバイスB" })]}
        pagination={samplePagination({ total_items: 2 })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(screen.getByText("アドバイスA")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "非表示にする" })).toHaveLength(2);
  });

  it("所属相談IDへのlinkがtarget='_blank'で出る", () => {
    render(
      <PublishedAdviceList
        status="success"
        items={[sampleItem({ id: 5, consultation_id: 42 })]}
        pagination={samplePagination()}
        baseHref="/admin?tab=published"
      />,
    );
    const link = screen.getByRole("link", { name: "#42" });
    expect(link).toHaveAttribute("href", "/consultations/42");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(
      <PublishedAdviceList
        status="success"
        items={[]}
        pagination={samplePagination({ total_items: 0 })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByText("公開中のアドバイスはありません")).toBeInTheDocument();
  });

  it("status=error だとエラーメッセージが出る", () => {
    render(<PublishedAdviceList status="error" message="サーバーが応答しませんでした" />);
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("アドバイスの取得に失敗しました")).toBeInTheDocument();
  });
});
