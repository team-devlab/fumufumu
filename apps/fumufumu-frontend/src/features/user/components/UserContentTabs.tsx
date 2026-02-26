"use client";

import { useState } from "react";
import Link from "next/link";
import type React from "react";
import { ROUTES } from "@/config/routes";
import type { Consultation } from "@/features/consultation/types";

type TabId = "consultations" | "advices" | "drafts";

type Tab = {
  id: TabId;
  label: string;
};

const TABS: Tab[] = [
  { id: "consultations", label: "相談" },
  { id: "advices", label: "アドバイス" },
  { id: "drafts", label: "下書き" },
];

type Props = {
  consultations: Consultation[];
};

export const UserContentTabs: React.FC<Props> = ({ consultations }) => {
  const [activeTab, setActiveTab] = useState<TabId>("consultations");

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-teal-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "consultations" && (
        <div>
          {consultations.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              まだ相談がありません
            </p>
          ) : (
            <div className="space-y-3">
              {consultations.map((consultation) => (
                <Link
                  key={consultation.id}
                  href={ROUTES.CONSULTATION.DETAIL(consultation.id)}
                  className="block"
                >
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {consultation.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "advices" && (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">アドバイス一覧は現在準備中です</p>
        </div>
      )}

      {activeTab === "drafts" && (
        <div className="py-8 text-center">
          <p className="text-gray-500 text-sm">下書き一覧は現在準備中です</p>
        </div>
      )}
    </div>
  );
};
