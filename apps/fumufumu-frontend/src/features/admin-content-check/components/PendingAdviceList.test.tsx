import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PendingAdviceDetail } from "../types";
import { PendingAdviceList } from "./PendingAdviceList";

const sampleItem = (
  overrides?: Partial<PendingAdviceDetail>,
): PendingAdviceDetail => ({
  id: 1,
  consultation_id: 99,
  body: "サンプルアドバイス本文",
  author_id: 10,
  status: "pending",
  created_at: "2026-01-15T10:00:00Z",
  ...overrides,
});

describe("PendingAdviceList", () => {
  it("status=success かつ items があると件数バッジと各 card が出る", () => {
    const items = [
      sampleItem({ id: 1, body: "アドバイス本文 A" }),
      sampleItem({ id: 2, body: "アドバイス本文 B" }),
    ];
    render(<PendingAdviceList status="success" items={items} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "アドバイス" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(screen.getByText("アドバイス本文 A")).toBeInTheDocument();
    expect(screen.getByText("アドバイス本文 B")).toBeInTheDocument();
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(<PendingAdviceList status="success" items={[]} />);

    expect(screen.getByText(/（0 件）/)).toBeInTheDocument();
    expect(
      screen.getByText("チェック待ちのアドバイスはありません"),
    ).toBeInTheDocument();
  });

  it("status=error だと件数バッジは出ず、エラーメッセージと詳細が出る", () => {
    render(
      <PendingAdviceList
        status="error"
        message="サーバーが応答しませんでした"
      />,
    );

    expect(screen.queryByText(/件）/)).toBeNull();

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("アドバイスの取得に失敗しました"),
    ).toBeInTheDocument();
    expect(
      within(alert).getByText("サーバーが応答しませんでした"),
    ).toBeInTheDocument();
  });

  it("各アイテムに所属相談 ID への link が target='_blank' で出る", () => {
    const items = [sampleItem({ id: 5, consultation_id: 42 })];
    render(<PendingAdviceList status="success" items={items} />);

    const link = screen.getByRole("link", { name: "#42" });
    expect(link).toHaveAttribute("href", "/consultations/42");
    expect(link).toHaveAttribute("target", "_blank");
    // 別タブを安全に開くため noopener / noreferrer も付いていること
    expect(link.getAttribute("rel")).toMatch(/noopener/);
    expect(link.getAttribute("rel")).toMatch(/noreferrer/);
  });
});
