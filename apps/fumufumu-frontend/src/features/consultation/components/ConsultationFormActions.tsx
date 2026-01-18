import { Button } from "@/components/ui/Button";

type Props = {
  onBack: () => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
};

export const ConsultationFormActions = ({
  onBack,
  onSaveDraft,
  onConfirm,
  isProcessing,
}: Props) => {
  return (
    <div className="flex items-center justify-between mt-8 py-4 px-2">
      {/* 左側: 戻るボタン */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center text-gray-500 hover:text-gray-800 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
        disabled={isProcessing}
      >
        <span className="mr-2">←</span>
        相談一覧に戻る
      </button>

      {/* 右側: アクションボタン */}
      <div className="flex items-center space-x-4">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isProcessing}
          className="px-6 py-3 font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下書き保存
        </button>
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
        >
          確認画面へ
        </Button>
      </div>
    </div>
  );
};
