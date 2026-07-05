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

const clickDraftsTab = () => {
  fireEvent.click(screen.getByRole("button", { name: "下書き" }));
};

describe("UserContentTabs 下書きタブ", () => {
  it("相談とアドバイスの下書きを更新日時の新しい順に混在表示し、種別バッジとリンクを付ける", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={{
          consultations: {
            status: "success",
            items: [
              sampleConsultation({
                id: 5,
                title: "相談下書きA",
                draft: true,
                updated_at: "2026-02-01T10:00:00Z",
              }),
            ],
          },
          advices: {
            status: "success",
            items: [
              sampleAdvice({
                id: 8,
                consultation_id: 99,
                body: "アドバイス下書きB",
                draft: true,
                updated_at: "2026-03-01T10:00:00Z",
              }),
            ],
          },
        }}
      />,
    );

    clickDraftsTab();

    // 更新日時の新しい順: アドバイス下書きB(3月) → 相談下書きA(2月)
    const consultationText = screen.getByText("相談下書きA");
    const adviceText = screen.getByText("アドバイス下書きB");
    expect(
      adviceText.compareDocumentPosition(consultationText) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // リンク先(アドバイス単独の詳細は無いため所属相談へ誘導)
    const consultationCard = consultationText.closest("a");
    const adviceCard = adviceText.closest("a");
    expect(consultationCard).toHaveAttribute("href", "/consultations/5");
    expect(adviceCard).toHaveAttribute("href", "/consultations/99");

    // 種別バッジ(タブ名と文字列が重複するため各カード内にスコープして検証)
    expect(
      within(consultationCard as HTMLElement).getByText("相談"),
    ).toBeInTheDocument();
    expect(
      within(adviceCard as HTMLElement).getByText("アドバイス"),
    ).toBeInTheDocument();
  });

  it("相談の下書き取得だけ失敗すると、通知を出しつつアドバイスの下書きは表示する", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={{
          consultations: { status: "error" },
          advices: {
            status: "success",
            items: [
              sampleAdvice({
                id: 8,
                body: "生存アドバイス下書き",
                draft: true,
              }),
            ],
          },
        }}
      />,
    );

    clickDraftsTab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "相談の下書きの取得に失敗しました",
    );
    expect(screen.getByText("生存アドバイス下書き")).toBeInTheDocument();
    // 片方成功しているため全体エラーには倒さない
    expect(
      screen.queryByText("下書きはまだありません"),
    ).not.toBeInTheDocument();
  });

  it("アドバイスの下書き取得だけ失敗すると、通知を出しつつ相談の下書きは表示する", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={{
          consultations: {
            status: "success",
            items: [
              sampleConsultation({
                id: 5,
                title: "生存相談下書き",
                draft: true,
              }),
            ],
          },
          advices: { status: "error" },
        }}
      />,
    );

    clickDraftsTab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "アドバイスの下書きの取得に失敗しました",
    );
    expect(screen.getByText("生存相談下書き")).toBeInTheDocument();
  });

  it("相談・アドバイスの下書き取得が両方失敗するとタブ全体をエラー表示にする", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={{
          consultations: { status: "error" },
          advices: { status: "error" },
        }}
      />,
    );

    clickDraftsTab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "下書きの取得に失敗しました",
    );
  });

  it("下書きが両方空だと空状態メッセージを出す", () => {
    render(
      <UserContentTabs
        consultations={[sampleConsultation()]}
        adviceState={{ status: "success", advices: [] }}
        draftState={emptyDraftState}
      />,
    );

    clickDraftsTab();

    expect(screen.getByText("下書きはまだありません")).toBeInTheDocument();
  });
});
