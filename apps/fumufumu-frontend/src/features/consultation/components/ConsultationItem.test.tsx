import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Consultation } from "@/features/consultation/types";
import { ConsultationItem } from "./ConsultationItem";

// issue #193: 一覧のタグと日時が仮の固定値（どの相談でも「キャリア」「2時間前」）だったため、
// props のデータがそのまま出ることを固定する。
const baseConsultation: Consultation = {
  id: 1,
  title: "テストの相談",
  body_preview: "本文のプレビューです。",
  draft: false,
  hidden_at: null,
  solved_at: null,
  created_at: "2026-08-23T00:30:00.000Z",
  updated_at: "2026-08-23T00:30:00.000Z",
  author: { id: 2, name: "テスト太郎", disabled: false },
};

describe("ConsultationItem", () => {
  it("紐づくタグの名前を表示する", () => {
    render(
      <ConsultationItem
        consultation={{
          ...baseConsultation,
          tags: [
            { id: 10, name: "お金" },
            { id: 11, name: "学び" },
          ],
        }}
      />,
    );

    expect(screen.getByText("お金")).toBeInTheDocument();
    expect(screen.getByText("学び")).toBeInTheDocument();
    // 仮値がそのまま残っていないこと
    expect(screen.queryByText("キャリア")).not.toBeInTheDocument();
  });

  it("タグが空・未指定のときはタグを表示しない", () => {
    const { rerender } = render(
      <ConsultationItem consultation={{ ...baseConsultation, tags: [] }} />,
    );
    expect(screen.queryByText("キャリア")).not.toBeInTheDocument();

    rerender(<ConsultationItem consultation={baseConsultation} />);
    expect(screen.queryByText("キャリア")).not.toBeInTheDocument();
  });

  it("作成日時を日本時間で表示する", () => {
    render(
      <ConsultationItem consultation={{ ...baseConsultation, tags: [] }} />,
    );

    // UTC の 00:30 は日本時間の 09:30。固定値「2時間前」は出さない
    expect(screen.getByText("2026/08/23 09:30")).toBeInTheDocument();
    expect(screen.queryByText("2時間前")).not.toBeInTheDocument();
  });
});
