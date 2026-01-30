import { Advice } from "../types";

type Props = {
  advices: Advice[];
};

export const AdviceList = ({ advices }: Props) => {
  if (advices.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
        まだ回答はありません。最初の回答を投稿してみましょう！
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">
        回答 ({advices.length}件)
      </h2>
      
      {advices.map((advice) => {
         const formattedDate = new Date(advice.created_at).toLocaleString("ja-JP");

         return (
          <div key={advice.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
             {/* ヘッダーエリア */}
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                       {advice.author?.name ?? "退会済みユーザー"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{formattedDate}</div>
                  </div>
               </div>
            </div>
            
            {/* 回答本文 */}
            <div className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
              {advice.body}
            </div>
          </div>
        );
      })}
    </div>
  );
};
