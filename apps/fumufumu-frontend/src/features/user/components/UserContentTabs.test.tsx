import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Advice, Consultation } from "@/features/consultation/types";
import { UserContentTabs } from "./UserContentTabs";

const sampleConsultation = (
  overrides?: Partial<Consultation>,
): Consultation => ({
  id: 1,
  title: "サンプル相談タイトル",
  body_preview: "サンプル相談本文",
  draft: false,
  hidden_at: null,
  solved_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "テスト太郎", disabled: false },
  ...overrides,
});

const sampleAdvice = (overrides?: Partial<Advice>): Advice => ({
  id: 1,
  consultation_id: 42,
  body: "サンプルアドバイス本文",
  draft: false,
  hidden_at: null,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  author: { id: 10, name: "テスト太郎", disabled: false },
  ...overrides,
});

const clickAdviceTab = () => {
  fireEvent.click(screen.getByRole("button", { name: "アドバイス" }));
};

describe("UserContentTabs アドバイスタブ", () => {
  it("アドバイスタブを選ぶと本文が並び、所属相談の詳細へリンクする", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        advices={[
          sampleAdvice({ id: 1, consultation_id: 42, body: "アドバイスA" }),
          sampleAdvice({ id: 2, consultation_id: 7, body: "アドバイスB" }),
        ]}
      />,
    );

    clickAdviceTab();

    const linkA = screen.getByText("アドバイスA").closest("a");
    expect(linkA).toHaveAttribute("href", "/consultations/42");
    const linkB = screen.getByText("アドバイスB").closest("a");
    expect(linkB).toHaveAttribute("href", "/consultations/7");
  });

  it("アドバイスが空だと空状態メッセージが出る", () => {
    render(
      <UserContentTabs consultations={[sampleConsultation()]} advices={[]} />,
    );

    clickAdviceTab();

    expect(screen.getByText("まだアドバイスがありません")).toBeInTheDocument();
  });

  it("初期表示は相談タブで、アドバイス本文は出ない", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation({ title: "相談タイトル" })]}
        advices={[sampleAdvice({ body: "アドバイス本文" })]}
      />,
    );

    expect(screen.getByText("相談タイトル")).toBeInTheDocument();
    expect(screen.queryByText("アドバイス本文")).not.toBeInTheDocument();
  });

  it("相談・アドバイスが両方空でもタブ切替で各空状態を出し分ける", () => {
    render(<UserContentTabs consultations={[]} advices={[]} />);

    expect(screen.getByText("まだ相談がありません")).toBeInTheDocument();

    clickAdviceTab();

    const adviceEmpty = screen.getByText("まだアドバイスがありません");
    expect(adviceEmpty).toBeInTheDocument();
    // 相談タブの空状態は表示から外れている
    expect(
      within(document.body).queryByText("まだ相談がありません"),
    ).not.toBeInTheDocument();
  });
});
