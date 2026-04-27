import { Button } from "@/components/ui/Button";
import {
  CONSULTATION_LABELS,
  CONSULTATION_RULES,
} from "@/features/consultation/config/constants";
import type { ConsultationFormTag, Tag } from "@/features/consultation/types";

type Props = {
  title: string;
  body: string;
  tags: ConsultationFormTag[];
  availableTags: Tag[];
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onToggleTag: (tag: Tag) => void;
  titleCharCount: number;
  bodyCharCount: number;
  onBack: () => void;
  onSaveDraft: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
};

export const ConsultationForm = ({
  title,
  body,
  tags,
  availableTags,
  onChangeTitle,
  onChangeBody,
  onToggleTag,
  titleCharCount,
  bodyCharCount,
  onBack,
  onSaveDraft,
  onConfirm,
  isProcessing,
}: Props) => {
  return (
    <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      {/* タイトル入力 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="title"
            className="block text-lg font-bold text-gray-800"
          >
            {CONSULTATION_LABELS.TITLE}
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {titleCharCount} / {CONSULTATION_RULES.TITLE_MAX_LENGTH}
          </span>
        </div>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          // ★修正: 定数利用
          placeholder={CONSULTATION_LABELS.PLACEHOLDER_TITLE}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#0F9F92]"
          maxLength={CONSULTATION_RULES.TITLE_MAX_LENGTH}
        />
      </div>

      {/* 相談内容入力 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="body"
            className="block text-lg font-bold text-gray-800"
          >
            {CONSULTATION_LABELS.BODY}
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {bodyCharCount} / {CONSULTATION_RULES.BODY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="body"
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          placeholder={CONSULTATION_LABELS.PLACEHOLDER_BODY}
          rows={12}
          className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50 p-4 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-[#0F9F92]"
          maxLength={CONSULTATION_RULES.BODY_MAX_LENGTH}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label
            htmlFor="tags"
            className="block text-md font-bold text-gray-800"
          >
            {CONSULTATION_LABELS.TAGS_INPUT}
          </label>
          <span className="text-xs text-gray-400">
            ※ タグは1つ以上選択してください
          </span>
        </div>
        <div
          id="tags"
          className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
        >
          <p className="text-xs text-gray-500">
            選択中: {tags.length} / {CONSULTATION_RULES.TAGS_MAX_COUNT}
          </p>
          {availableTags.length === 0 ? (
            <p className="text-sm text-gray-500">選択可能なタグがありません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = tags.some(
                  (selectedTag) => selectedTag.id === tag.id,
                );
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          disabled={isProcessing}
        >
          <span className="mr-2">←</span>
          相談一覧に戻る
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isProcessing}
            className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 font-bold text-amber-600 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            下書き保存
          </button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-xl bg-teal-600 px-8 py-3 font-bold text-white shadow-md hover:bg-teal-700"
          >
            確認画面へ
          </Button>
        </div>
      </div>
    </div>
  );
};
