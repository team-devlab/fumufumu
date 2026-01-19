import { CONSULTATION_RULES } from "@/features/consultation/config/constants";

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
            タイトル
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
          placeholder="例）エンジニア3年目：技術スペシャリストかマネジメント、どちらを目指すべき？"
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
            相談内容
          </label>
          <span className="text-sm text-gray-500 font-mono">
            {body.length} / {CONSULTATION_RULES.BODY_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="body"
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          placeholder="質問内容を入力してください..."
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
            タグ選択
          </label>
          <span className="text-xs text-gray-400">
            ※ タグは1つ以上選択してください
          </span>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-400 text-sm">
          タグ機能は現在開発中です
        </div>
      </div>
    </div>
  );
};
