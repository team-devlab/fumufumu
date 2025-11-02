import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperimentDashboard } from "@/features/experiment/components/ExperimentDashboard";

// --- カスタムフックのモック化 ---
// コンポーネントテストでは、依存するカスタムフックの内部ロジックではなく、
// そのインターフェース（戻り値）をモックすることで、ユニットテストとして独立させます。
// 💡 vi.mock をファイルの先頭で呼び出す（巻き上げられる）
vi.mock("../hooks/useExperimentActions", () => ({
  // 💡 テストケース内でアクセスできるように、exportされる関数を vi.fn() でラップして返す
  //    この vi.fn() は、テストケース内の mockUseExperimentActions に代入される
  useExperimentActions: vi.fn(),
}));

// 💡 モック関数への参照をファイルのトップで取得
//    useExperimentActions のモックを import のように取得
const { useExperimentActions: mockUseExperimentActions } = vi.mocked(
  // モックされているモジュールを as で型キャストして取得
  (await import("../hooks/useExperimentActions")) as {
    useExperimentActions: vi.Mock;
  },
);

const mockHandleCreateContent = vi.fn();

describe("ExperimentDashboard", () => {
  // 各テストの前に、デフォルトのモック値を設定
  beforeEach(() => {
    // モックにデフォルトの値を設定（テスト1のデフォルト値: isProcessing: false）
    mockUseExperimentActions.mockReturnValue({
      isProcessing: false,
      contents: [],
      handleCreateContent: mockHandleCreateContent,
    });
  });

  afterEach(() => {
    mockHandleCreateContent.mockClear();
    // useExperimentActions のモック呼び出し履歴をクリアし、設定を beforeEach でリセットする
    mockUseExperimentActions.mockClear();
  });

  // テストケース1: 通常時の描画とボタンクリックの動作
  it("初期状態でボタンが有効であり、クリックすると handleCreateContent が呼ばれること", () => {
    render(<ExperimentDashboard />);

    // ボタン要素を取得（テキストで特定）
    const button = screen.getByRole("button", {
      name: /テスト コンソールログを表示/i,
    });

    // 初期状態の確認: isProcessing: false のときはボタンは「有効」であるべき
    expect(button).toBeEnabled();

    // ボタンをクリック
    fireEvent.click(button);

    // フックから渡された関数が呼び出されたことを確認: クリックされたら呼ばれるべき
    expect(mockHandleCreateContent).toHaveBeenCalledOnce();
  });

  // テストケース2: 処理中の状態の描画
  it("isProcessing が true のとき、ボタンが無効化され、クリック操作が無視されること", () => {
    // 処理中の状態（isProcessing: true）をモックとして注入
    mockUseExperimentActions.mockReturnValue({
      isProcessing: true,
      contents: [],
      handleCreateContent: mockHandleCreateContent,
    });

    render(<ExperimentDashboard />);

    // ボタン要素を取得（テキストで特定）
    const button = screen.getByRole("button", { name: /テスト 処理中.../i });

    // 1. アサーション：無効化されていること
    expect(button).toBeDisabled();

    // 2. disabledな要素ではクリックイベントが発火しないことをテスト
    fireEvent.click(button);

    // 3. アサーション：関数が呼ばれていないこと
    expect(mockHandleCreateContent).not.toHaveBeenCalled();
  });
});
