"use client";

import { Button } from "@/components/ui/Button"; // 汎用UIコンポーネントをインポート
import { useExperimentActions } from "@/features/experiment/hooks/useExperimentActions";

/**
 * 実験機能のダッシュボードUI（ロジックも含む）
 * page.tsx から UI とロジックをすべてこちらに移動する
 */
export const ExperimentDashboard = () => {
  // 状態管理やロジックはすべて「features」の内部で完結する

  // カスタムフックからロジックを注入
  const { isProcessing, handleCreateContent } = useExperimentActions();

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold text-gray-900">
          ダッシュボード (from Features)
        </h1>
        <Button
          onClick={handleCreateContent}
          disabled={isProcessing}
          className="bg-blue-300"
        >
          テスト {isProcessing ? "処理中..." : "コンソールログを表示"}
        </Button>
      </div>

      <div className="p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          コンテンツリスト (仮)
        </h2>
        <ul className="space-y-2">
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">
            最初のふむふむメモ
          </li>
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">
            プロジェクトKの進捗報告
          </li>
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">
            新しいアイデアのブレスト
          </li>
        </ul>
        <div className="mt-6 border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">デモ: 無効なボタン</p>
          <Button disabled={true} className="bg-gray-400">
            削除 (無効)
          </Button>
        </div>
      </div>
    </div>
  );
};
