"use client";

import Link from "next/link";
import type React from "react";
import { useState } from "react";
import { ROUTES } from "@/config/routes";
import type { Advice, Consultation } from "@/features/consultation/types";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

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

/**
 * アドバイスタブの状態。取得失敗を「アドバイス0件」と区別するため、
 * 成功(空を含む)と失敗を判別ユニオンで表す (admin モデレーション一覧と同じ status パターン)。
 */
export type AdviceTabState =
  | { status: "success"; advices: Advice[] }
  | { status: "error" };

/**
 * 下書きソース1つ分の取得結果。取得失敗を「0件」と区別する判別ユニオン。
 */
export type DraftSourceResult<T> =
  | { status: "success"; items: T[] }
  | { status: "error" };

/**
 * 下書きタブの状態。相談・アドバイスの下書きは別々のAPIから取得するため、
 * ソース単位で success|error を持つ複合状態にする。片方が失敗しても
 * もう片方は表示できるよう、縮退はソース単位で行う。
 */
export type DraftTabState = {
  consultations: DraftSourceResult<Consultation>;
  advices: DraftSourceResult<Advice>;
};

/**
 * 相談とアドバイスの下書きを1リストに混在させるための判別ユニオン。
 * 種別ごとに表示内容が異なるため kind で分岐する。
 */
type MergedDraft =
  | { kind: "consultation"; data: Consultation }
  | { kind: "advice"; data: Advice };

// 下書きの「再開」導線: 相談・アドバイスとも編集画面へリンクする(ADR 012)。
// アドバイスは adviceId 単位の編集ルートへ。
const DraftCard: React.FC<{ item: MergedDraft }> = ({ item }) => {
  const label = item.kind === "consultation" ? "相談" : "アドバイス";
  const text = item.kind === "consultation" ? item.data.title : item.data.body;
  const badgeClass =
    item.kind === "consultation"
      ? "bg-teal-50 text-teal-700"
      : "bg-amber-50 text-amber-700";
  const href =
    item.kind === "consultation"
      ? ROUTES.CONSULTATION.EDIT(item.data.id)
      : ROUTES.ADVICE.DRAFT_EDIT(item.data.id);

  return (
    <Link href={href} className="block">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {label}
        </span>
        <p className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </Link>
  );
};

const DraftsTabContent: React.FC<{ state: DraftTabState }> = ({ state }) => {
  const { consultations, advices } = state;

  // 両ソースとも取得失敗したときだけ全体エラーに倒す(片方成功なら表示を優先)
  if (consultations.status === "error" && advices.status === "error") {
    return (
      <p role="alert" className="text-gray-500 text-sm py-8 text-center">
        下書きの取得に失敗しました
      </p>
    );
  }

  // 成功したソースのみをマージし、更新日時の新しい順に並べる(「続きから」の導線)
  const merged: MergedDraft[] = [
    ...(consultations.status === "success"
      ? consultations.items.map(
          (data): MergedDraft => ({ kind: "consultation", data }),
        )
      : []),
    ...(advices.status === "success"
      ? advices.items.map((data): MergedDraft => ({ kind: "advice", data }))
      : []),
  ].sort(
    (a, b) =>
      new Date(b.data.updated_at).getTime() -
      new Date(a.data.updated_at).getTime(),
  );

  const hasPartialError =
    consultations.status === "error" || advices.status === "error";

  return (
    <div className="space-y-3">
      {hasPartialError && (
        <p role="alert" className="text-amber-600 text-sm py-2 text-center">
          {consultations.status === "error"
            ? "相談の下書きの取得に失敗しました"
            : "アドバイスの下書きの取得に失敗しました"}
        </p>
      )}

      {merged.length > 0 &&
        merged.map((item) => (
          <DraftCard key={`${item.kind}-${item.data.id}`} item={item} />
        ))}

      {merged.length === 0 && !hasPartialError && (
        <p className="text-gray-500 text-sm py-8 text-center">
          下書きはまだありません
        </p>
      )}
    </div>
  );
};

const AdviceTabContent: React.FC<{ state: AdviceTabState }> = ({ state }) => {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-gray-500 text-sm py-8 text-center">
        アドバイスの取得に失敗しました
      </p>
    );
  }

  if (state.advices.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        まだアドバイスがありません
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {state.advices.map((advice) => (
        // アドバイス単独の詳細画面は無いため、所属相談(consultation_id)の詳細へ誘導する
        <Link
          key={advice.id}
          href={ROUTES.CONSULTATION.DETAIL(advice.consultation_id)}
          className="block"
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
            <div className="mb-2 empty:hidden">
              <ReviewStatusBadge status={advice.review_status} />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3 whitespace-pre-wrap">
              {advice.body}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

type Props = {
  consultations: Consultation[];
  adviceState: AdviceTabState;
  draftState: DraftTabState;
};

export const UserContentTabs: React.FC<Props> = ({
  consultations,
  adviceState,
  draftState,
}) => {
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
                    <div className="mb-2 empty:hidden">
                      <ReviewStatusBadge status={consultation.review_status} />
                    </div>
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

      {activeTab === "advices" && <AdviceTabContent state={adviceState} />}

      {activeTab === "drafts" && <DraftsTabContent state={draftState} />}
    </div>
  );
};
