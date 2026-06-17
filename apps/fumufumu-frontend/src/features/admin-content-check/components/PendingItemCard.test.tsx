import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PendingItemCard } from "./PendingItemCard";

describe("PendingItemCard", () => {
  const baseProps = {
    id: 42,
    body: "本文テキスト",
    authorId: 7,
    createdAt: "2026-01-15T10:00:00Z",
  };

  it("id が #付き で表示される", () => {
    render(<PendingItemCard {...baseProps} />);
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("body が表示される", () => {
    render(<PendingItemCard {...baseProps} />);
    expect(screen.getByText("本文テキスト")).toBeInTheDocument();
  });

  it("title が渡されると h3 として描画される (相談用ユースケース)", () => {
    render(<PendingItemCard {...baseProps} title="相談タイトル" />);
    const heading = screen.getByRole("heading", {
      level: 3,
      name: "相談タイトル",
    });
    expect(heading).toBeInTheDocument();
  });

  it("title が未指定なら h3 が描画されない (アドバイス用ユースケース)", () => {
    render(<PendingItemCard {...baseProps} />);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("authorId が数値だと「ユーザー#{id}」表示になる", () => {
    render(<PendingItemCard {...baseProps} authorId={123} />);
    expect(screen.getByText(/投稿者:\s*ユーザー#123/)).toBeInTheDocument();
  });

  it("authorId が null だと退会/削除済み表示になる", () => {
    render(<PendingItemCard {...baseProps} authorId={null} />);
    expect(
      screen.getByText(/投稿者:\s*退会済み or 削除済みユーザー/),
    ).toBeInTheDocument();
  });

  it("meta slot に渡した要素が描画される", () => {
    render(
      <PendingItemCard
        {...baseProps}
        meta={<span data-testid="meta-marker">所属相談: #99</span>}
      />,
    );
    expect(screen.getByTestId("meta-marker")).toBeInTheDocument();
  });

  it("createdAt が ja-JP locale で表示される (年が含まれる)", () => {
    // toLocaleString('ja-JP') の出力は environment 依存だが、年部分はどの locale でも含まれる
    render(<PendingItemCard {...baseProps} createdAt="2026-01-15T10:00:00Z" />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });
});
