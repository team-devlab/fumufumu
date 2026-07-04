import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Consultation, PaginationMeta } from "@/features/consultation/types";
import { PublishedConsultationList } from "./PublishedConsultationList";

const samplePagination = (overrides?: Partial<PaginationMeta>): PaginationMeta => ({
  current_page: 1,
  per_page: 20,
  total_items: 2,
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
  hidden_at: null,
  solved_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "やまだ たろう", disabled: false },
  ...overrides,
});

describe("PublishedConsultationList", () => {
  it("status=success かつ items があると件数バッジと各 card, hideボタンが出る", () => {
    const items = [
      sampleItem({ id: 1, title: "相談A" }),
      sampleItem({ id: 2, title: "相談B" }),
    ];
    render(
      <PublishedConsultationList
        status="success"
        items={items}
        pagination={samplePagination()}
        baseHref="/admin?tab=published"
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "相談" })).toBeInTheDocument();
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(screen.getByText("相談A")).toBeInTheDocument();
    expect(screen.getByText("相談B")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "非表示にする" })).toHaveLength(2);
  });

  it("authorのnameがカードに表示される", () => {
    render(
      <PublishedConsultationList
        status="success"
        items={[sampleItem()]}
        pagination={samplePagination()}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByText(/投稿者:\s*やまだ たろう/)).toBeInTheDocument();
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(
      <PublishedConsultationList
        status="success"
        items={[]}
        pagination={samplePagination({ total_items: 0 })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByText(/（0 件）/)).toBeInTheDocument();
    expect(screen.getByText("公開中の相談はありません")).toBeInTheDocument();
  });

  it("status=error だと件数バッジは出ず、エラーメッセージと詳細が出る", () => {
    render(<PublishedConsultationList status="error" message="サーバーが応答しませんでした" />);
    expect(screen.queryByText(/件）/)).toBeNull();
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("相談の取得に失敗しました")).toBeInTheDocument();
    expect(within(alert).getByText("サーバーが応答しませんでした")).toBeInTheDocument();
  });

  it("pagination(total_pages>1)を渡すとページ送りリンクが出る", () => {
    render(
      <PublishedConsultationList
        status="success"
        items={[sampleItem()]}
        pagination={samplePagination({ total_pages: 2, has_next: true })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute(
      "href",
      "/admin?tab=published&page=2",
    );
  });
});
