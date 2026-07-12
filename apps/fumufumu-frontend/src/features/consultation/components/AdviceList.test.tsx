import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Advice } from "../types";
import { AdviceList } from "./AdviceList";

const sampleAdvice = (overrides?: Partial<Advice>): Advice => ({
  id: 1,
  consultation_id: 99,
  body: "サンプルのアドバイス本文です。",
  draft: false,
  hidden_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "回答者", disabled: false },
  ...overrides,
});

describe("AdviceList 投稿チェック状態バッジ(#179)", () => {
  it("投稿チェック中(pending)の回答に「投稿チェック中」バッジを出す", () => {
    render(
      <AdviceList
        advices={[
          sampleAdvice({ body: "pending本文", review_status: "pending" }),
        ]}
      />,
    );
    expect(screen.getByText("pending本文")).toBeInTheDocument();
    expect(screen.getByText("投稿チェック中")).toBeInTheDocument();
  });

  it("公開見送り(rejected)の回答に「公開見送り」バッジを出す", () => {
    render(
      <AdviceList advices={[sampleAdvice({ review_status: "rejected" })]} />,
    );
    expect(screen.getByText("公開見送り")).toBeInTheDocument();
  });

  it("承認済み(approved)・未指定の回答にはバッジを出さない", () => {
    render(
      <AdviceList
        advices={[
          sampleAdvice({ id: 1, review_status: "approved" }),
          sampleAdvice({ id: 2, review_status: undefined }),
        ]}
      />,
    );
    expect(screen.queryByText("投稿チェック中")).not.toBeInTheDocument();
    expect(screen.queryByText("公開見送り")).not.toBeInTheDocument();
  });
});
