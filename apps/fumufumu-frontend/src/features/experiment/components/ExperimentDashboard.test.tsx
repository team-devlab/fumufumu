import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExperimentDashboard } from './ExperimentDashboard';
import * as useExperimentActionsModule from '../hooks/useExperimentActions';

// --- カスタムフックのモック化 ---
// コンポーネントテストでは、依存するカスタムフックの内部ロジックではなく、
// そのインターフェース（戻り値）をモックすることで、ユニットテストとして独立させます。
const mockHandleCreateContent = vi.fn();
const mockUseExperimentActions = vi.spyOn(useExperimentActionsModule, 'useExperimentActions');


describe('ExperimentDashboard', () => {
	beforeEach(() => {
        mockHandleCreateContent.mockClear();
    });
	
	// テストケース1: 通常時の描画とボタンクリックの動作
	it('初期状態でボタンが有効であり、クリックすると handleCreateContent が呼ばれること', () => {
		// 通常の状態（isProcessing: false）をモックとして注入
		mockUseExperimentActions.mockReturnValue({
			isProcessing: false,
			contents: [],
			handleCreateContent: mockHandleCreateContent,
		});

		render(<ExperimentDashboard />);

		// ボタン要素を取得（テキストで特定）
		const button = screen.getByRole('button', { name: /テスト コンソールログを表示/i });

		// 初期状態の確認: isProcessing: false のときはボタンは「有効」であるべき
		expect(button).toBeEnabled();

		// ボタンをクリック
		fireEvent.click(button);

		// フックから渡された関数が呼び出されたことを確認: クリックされたら呼ばれるべき
		expect(mockHandleCreateContent).toHaveBeenCalledOnce();
	});

	// テストケース2: 処理中の状態の描画
	it('isProcessing が true のとき、ボタンが無効化され、クリック操作が無視されること', () => {
		// 処理中の状態（isProcessing: true）をモックとして注入
		mockUseExperimentActions.mockReturnValue({
			isProcessing: true,
			contents: [],
			handleCreateContent: mockHandleCreateContent,
		});

		render(<ExperimentDashboard />);

		// ボタン要素を取得（テキストで特定）
		const button = screen.getByRole('button', { name: /テスト 処理中.../i });

		// 1. アサーション：無効化されていること
		expect(button).toBeDisabled();

		// 2. fireEvent.click でクリックをシミュレート（disabled属性がonClickを防ぐかテスト）
		fireEvent.click(button);

		// 3. アサーション：関数が呼ばれていないこと
		expect(mockHandleCreateContent).not.toHaveBeenCalled();
	});
});