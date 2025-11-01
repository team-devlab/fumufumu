"use client";

import { useState } from "react";
import { createContent } from "../api/mockApi";
import type { ExperimentContent } from "../types";

/**
 * 実験機能のアクションと状態を管理するカスタムフック
 *
 * ロジックをコンポーネント(JSX)から分離することで、
 * 1. コンポーネントが「見た目」に集中できる
 * 2. ロジックが再利用可能になる
 */
export const useExperimentActions = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [contents, setContents] = useState<ExperimentContent[]>([]); // 別ファイルで定義した型定義を利用

    const handleCreateContent = async () => {
        setIsProcessing(true);
        console.log("コンテンツ作成処理を開始...");

        try {
            // 実際のAPI通信（モック）を呼び出す
            const newContent = await createContent("新しいコンテンツ");
            setContents((prev) => [...prev, newContent]);
            console.log("コンテンツ作成処理が完了しました。", newContent);
        } catch (error) {
            console.error("作成に失敗しました", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        contents,
        handleCreateContent,
    };
};