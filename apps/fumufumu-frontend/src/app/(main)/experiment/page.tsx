"use client"

import { Button } from '@/components/ui/Button';
import { useState } from 'react';

/**
 * メインアプリケーションの仮のダッシュボード画面
 */
export default function DashboardPage() {
  // ボタンの無効化状態をデモするためのステート
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateContent = () => {
    setIsProcessing(true);
    console.log("コンテンツ作成処理を開始...");
    
    // 処理のデモとして3秒後に完了
    setTimeout(() => {
      console.log("コンテンツ作成処理が完了しました。");
      setIsProcessing(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        {/* メインタイトル */}
        <h1 className="text-4xl font-extrabold text-gray-900">ダッシュボード</h1>
        
        {/* 主要アクションボタンの利用例 */}
        <Button onClick={handleCreateContent} disabled={isProcessing} className="bg-blue-300">
          テスト {isProcessing ? '処理中...' : 'コンソールログを表示'}
        </Button>
      </div>

      {/* 主要コンテンツエリア */}
      <div className="p-8 bg-white rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">コンテンツリスト (仮)</h2>
        <ul className="space-y-2">
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">最初のふむふむメモ</li>
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">プロジェクトKの進捗報告</li>
          <li className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 transition">新しいアイデアのブレスト</li>
        </ul>

        {/* 別の Button.tsx の利用例 (無効化状態のデモ) */}
        <div className="mt-6 border-t pt-4">
          <p className="text-sm text-gray-600 mb-2">デモ: 無効なボタン</p>
          <Button disabled={true} className="bg-gray-400">
            削除 (無効)
          </Button>
        </div>
      </div>
    </div>
  );
}