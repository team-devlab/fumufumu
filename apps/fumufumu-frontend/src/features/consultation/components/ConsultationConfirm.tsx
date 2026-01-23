import { Button } from "@/components/ui/Button";
import { CONSULTATION_LABELS } from "@/features/consultation/config/constants";

type Props = {
  title: string;
  body: string;
  tags: string[];
  onBack: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isProcessing: boolean;
};

export const ConsultationConfirm = ({
  title,
  body,
  tags,
  onBack,
  onSaveDraft,
  onPublish,
  isProcessing,
}: Props) => {
  return (
    <div className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      {/* ヘッダー */}
      <h1 className="text-xl font-bold text-gray-800 bg-gray-100 inline-block px-3 py-1 rounded-md">
        投稿内容確認
      </h1>

      {/* タイトル確認 */}
      <div className="space-y-2">
        <span className="block text-lg font-bold text-gray-600">
          {CONSULTATION_LABELS.TITLE}
        </span>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-bold">
          {title}
        </div>
      </div>

      {/* 相談内容確認 */}
      <div className="space-y-2">
        <span className="block text-lg font-bold text-gray-600">
          {CONSULTATION_LABELS.BODY}
        </span>
        <div className="text-xl font-bold text-gray-800 ">
          {body}
        </div>
      </div>

      {/* タグ確認 */}
      <div className="space-y-2">
        <span className="block text-md font-bold text-gray-600">
          {CONSULTATION_LABELS.TAGS_CONFIRM}
        </span>
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-teal-100 text-teal-700 text-sm rounded-full font-medium"
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">
              {CONSULTATION_LABELS.NO_TAG}
            </span>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          戻る
        </button>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isProcessing}
            className="px-6 py-3 font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            下書き保存
          </button>
          <Button
            onClick={onPublish}
            disabled={isProcessing}
            className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
          >
            投稿する
          </Button>
        </div>
      </div>
    </div>
  );
};
