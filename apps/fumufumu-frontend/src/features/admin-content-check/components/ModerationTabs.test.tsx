import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModerationTabs } from "./ModerationTabs";

describe("ModerationTabs", () => {
  it("3つのタブが表示される", () => {
    render(<ModerationTabs activeTab="pending" />);
    expect(screen.getByRole("link", { name: "投稿チェック待ち" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "公開中" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "非表示中" })).toBeInTheDocument();
  });

  it("activeTab=pending は /admin へのリンクで aria-current=page になる", () => {
    render(<ModerationTabs activeTab="pending" />);
    const link = screen.getByRole("link", { name: "投稿チェック待ち" });
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("activeTab=published は他のタブに aria-current が付かない", () => {
    render(<ModerationTabs activeTab="published" />);
    expect(screen.getByRole("link", { name: "公開中" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "投稿チェック待ち" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "非表示中" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("非pendingタブは ?tab= 付きのhrefになる", () => {
    render(<ModerationTabs activeTab="pending" />);
    expect(screen.getByRole("link", { name: "公開中" })).toHaveAttribute(
      "href",
      "/admin?tab=published",
    );
    expect(screen.getByRole("link", { name: "非表示中" })).toHaveAttribute(
      "href",
      "/admin?tab=hidden",
    );
  });
});
