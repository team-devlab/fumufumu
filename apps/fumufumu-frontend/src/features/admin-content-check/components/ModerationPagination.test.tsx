import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PaginationMeta } from "@/features/consultation/types";
import { ModerationPagination } from "./ModerationPagination";

const basePagination = (
  overrides?: Partial<PaginationMeta>,
): PaginationMeta => ({
  current_page: 2,
  per_page: 20,
  total_items: 45,
  total_pages: 3,
  has_next: true,
  has_prev: true,
  ...overrides,
});

describe("ModerationPagination", () => {
  it("total_pages<=1なら何も描画しない", () => {
    const { container } = render(
      <ModerationPagination
        pagination={basePagination({
          total_pages: 1,
          has_next: false,
          has_prev: false,
        })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("現在ページ/全ページ数が表示される", () => {
    render(
      <ModerationPagination
        pagination={basePagination()}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByText("2 / 3 ページ")).toBeInTheDocument();
  });

  it("has_prev/has_nextともにtrueなら両方リンクになり、pageクエリが付与される", () => {
    render(
      <ModerationPagination
        pagination={basePagination()}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute(
      "href",
      "/admin?tab=published&page=1",
    );
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute(
      "href",
      "/admin?tab=published&page=3",
    );
  });

  it("has_prev=falseなら前のページはリンクにならない", () => {
    render(
      <ModerationPagination
        pagination={basePagination({ current_page: 1, has_prev: false })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.queryByRole("link", { name: "前のページ" })).toBeNull();
    expect(screen.getByText("前のページ")).toBeInTheDocument();
  });

  it("has_next=falseなら次のページはリンクにならない", () => {
    render(
      <ModerationPagination
        pagination={basePagination({ current_page: 3, has_next: false })}
        baseHref="/admin?tab=published"
      />,
    );
    expect(screen.queryByRole("link", { name: "次のページ" })).toBeNull();
    expect(screen.getByText("次のページ")).toBeInTheDocument();
  });

  it("baseHrefにクエリが無い場合は?でpageを連結する", () => {
    render(
      <ModerationPagination pagination={basePagination()} baseHref="/admin" />,
    );
    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute(
      "href",
      "/admin?page=1",
    );
  });
});
