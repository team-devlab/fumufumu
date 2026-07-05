import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Advice, Consultation } from "@/features/consultation/types";
import { type DraftTabState, UserContentTabs } from "./UserContentTabs";

// 下書きタブを検証しないケース用の、両ソースとも空の下書き状態
const emptyDraftState: DraftTabState = {
  consultations: { status: "success", items: [] },
  advices: { status: "success", items: [] },
};

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
        adviceState={{
          status: "success",
          advices: [
            sampleAdvice({ id: 1, consultation_id: 42, body: "アドバイスA" }),
            sampleAdvice({ id: 2, consultation_id: 7, body: "アドバイスB" }),
          ],
        }}
        draftState={emptyDraftState}
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
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={emptyDraftState}
      />,
    );

    clickAdviceTab();

    expect(screen.getByText("まだアドバイスがありません")).toBeInTheDocument();
  });

  it("アドバイス取得失敗時はエラー表示になり、空状態とは区別される", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "error" }}
        draftState={emptyDraftState}
      />,
    );

    clickAdviceTab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "アドバイスの取得に失敗しました",
    );
    // 障害時に「0件」と誤読させないため、空状態メッセージは出さない
    expect(
      screen.queryByText("まだアドバイスがありません"),
    ).not.toBeInTheDocument();
  });

  it("初期表示は相談タブで、アドバイス本文は出ない", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation({ title: "相談タイトル" })]}
        adviceState={{
          status: "success",
          advices: [sampleAdvice({ body: "アドバイス本文" })],
        }}
        draftState={emptyDraftState}
      />,
    );

    expect(screen.getByText("相談タイトル")).toBeInTheDocument();
    expect(screen.queryByText("アドバイス本文")).not.toBeInTheDocument();
  });

  it("相談・アドバイスが両方空でもタブ切替で各空状態を出し分ける", () => {
    render(
      <UserContentTabs
        consultations={[]}
        adviceState={{ status: "success", advices: [] }}
        draftState={emptyDraftState}
      />,
    );

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
