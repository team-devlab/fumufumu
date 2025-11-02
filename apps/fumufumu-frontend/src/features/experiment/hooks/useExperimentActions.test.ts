// Vitestでは、`vi` を使ってモックやタイマー操作を行います。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// hooksをテストするために、testing-library/react から renderHook を使用します
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExperimentActions } from '@/features/experiment/hooks/useExperimentActions'
import * as mockApi from '@/features/experiment/api/mockApi'; // APIモジュールをインポート

// --- APIモジュールのモック化 ---
// Vitestの vi.mock を使って、外部依存（API呼び出し）を隔離します。
vi.mock('../api/mockApi', () => ({
	// createContent関数が呼ばれたら、このモック値を返すようにします
	createContent: vi.fn(),
}));

// mockApi.ts の createContent 関数への参照を Vitest の Mock 関数として取得
const createContentMock = mockApi.createContent as vi.Mock;

describe('useExperimentActions', () => {
	// 各テストの前にモックの動作を設定
	beforeEach(() => {
		createContentMock.mockResolvedValue({
			id: 'mock-uuid-999',
			title: 'テストコンテンツ',
			createdAt: new Date().toISOString()
		});
	});

	// 各テストの後にモックの使用状況をクリア
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('初期状態の isProcessing は false で、contents は空の配列であること', () => {
		// renderHookでカスタムフックをマウントし、その結果を取得
		const { result } = renderHook(() => useExperimentActions());

		// アサーション
		expect(result.current.isProcessing).toBe(false);
		expect(result.current.contents).toEqual([]);
	});

	it('handleCreateContent 実行中に isProcessing が true になり、完了後に false に戻ること', async () => {
        const { result } = renderHook(() => useExperimentActions());

        // act() の中でフックの関数を実行
        act(() => {
            result.current.handleCreateContent();
        });

        // 処理開始直後、isProcessingが true になっていることを確認
        expect(result.current.isProcessing).toBe(true);

        // waitFor を使用して、非同期処理後のステート更新（isProcessing: false）を待つ
        await waitFor(() => {
            // 処理完了後のisProcessingの状態を確認
            expect(result.current.isProcessing).toBe(false); // 失敗箇所を修正
        });
    });

	it('コンテンツ作成が成功した場合、contents リストに新しいアイテムが追加されること', async () => {
		const { result } = renderHook(() => useExperimentActions());

		await act(async () => {
			await result.current.handleCreateContent();
		});

		// アサーション
		expect(result.current.contents.length).toBe(1);
		expect(result.current.contents[0].title).toBe('テストコンテンツ');
		expect(createContentMock).toHaveBeenCalledOnce(); // APIモックが1回呼ばれたこと
	});
});