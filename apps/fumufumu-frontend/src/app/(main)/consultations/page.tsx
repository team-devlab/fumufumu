import { Button } from "@/components/ui/Button";
import { ConsultationList } from "@/features/consultation/components/ConsultationList";

export default function ConsultationListPage() {
  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Header Area: Search & Action */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex-1 max-w-lg relative">
            {/* 検索バー（見た目だけ） */}
            <input
              type="text"
              placeholder="検索バー"
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        
        <div className="ml-4">{/* 相談作成ボタン（見た目だけ） */}
          <Button className="bg-orange-400 hover:bg-orange-500 text-white font-bold px-6 py-2 rounded-lg">
            相談する
          </Button>
        </div>
      </div>

      {/* Main Content: List */}
      <ConsultationList />
    </div>
  );
}
