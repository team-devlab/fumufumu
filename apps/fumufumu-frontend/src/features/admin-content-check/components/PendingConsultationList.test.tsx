import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PendingConsultationDetail } from "../types";
import { PendingConsultationList } from "./PendingConsultationList";

const sampleItem = (
  overrides?: Partial<PendingConsultationDetail>,
): PendingConsultationDetail => ({
  id: 1,
  title: "サンプル相談",
  body: "サンプル本文",
  author_id: 10,
  status: "pending",
  created_at: "2026-01-15T10:00:00Z",
  ...overrides,
});

describe("PendingConsultationList", () => {
  it("status=success かつ items があると件数バッジと各 card が出る", () => {
    const items = [
      sampleItem({ id: 1, title: "相談A" }),
      sampleItem({ id: 2, title: "相談B" }),
    ];
    render(<PendingConsultationList status="success" items={items} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "相談" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/（2 件）/)).toBeInTheDocument();
    expect(screen.getByText("相談A")).toBeInTheDocument();
    expect(screen.getByText("相談B")).toBeInTheDocument();
  });

  it("status=success かつ items が空だと空状態メッセージが出る", () => {
    render(<PendingConsultationList status="success" items={[]} />);

    expect(screen.getByText(/（0 件）/)).toBeInTheDocument();
    expect(
      screen.getByText("チェック待ちの相談はありません"),
    ).toBeInTheDocument();
  });

  it("status=error だと件数バッジは出ず、エラーメッセージと詳細が出る", () => {
    render(
      <PendingConsultationList
        status="error"
        message="サーバーが応答しませんでした"
      />,
    );

    // 件数バッジ「（N 件）」は出ない
    expect(screen.queryByText(/件）/)).toBeNull();

    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("相談の取得に失敗しました"),
    ).toBeInTheDocument();
    expect(
      within(alert).getByText("サーバーが応答しませんでした"),
    ).toBeInTheDocument();
  });
});
