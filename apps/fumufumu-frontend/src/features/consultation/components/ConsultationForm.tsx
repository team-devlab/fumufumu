import {
  CONSULTATION_LABELS,
  CONSULTATION_RULES,
} from "@/features/consultation/config/constants";

type Props = {
  title: string;
  body: string;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
};

export const ConsultationForm = ({
  title,
  body,
  onChangeTitle,
  onChangeBody,
}: Props) => {
  return (
    <div className="space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-xl font-bold text-gray-800 bg-gray-100 inline-block px-3 py-1 rounded-md">
        相談投稿
      </h1>

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
            {title.length} / {CONSULTATION_RULES.TITLE_MAX_LENGTH}
          </span>
        </div>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          // ★修正: 定数利用
          placeholder={CONSULTATION_LABELS.PLACEHOLDER_TITLE}
          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
            {body.length} / {CONSULTATION_RULES.BODY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="body"
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          placeholder={CONSULTATION_LABELS.PLACEHOLDER_BODY}
          rows={12}
          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
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
        <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-400 text-sm">
          {CONSULTATION_LABELS.TAG_DEV_MESSAGE}
        </div>
      </div>
    </div>
  );
};
