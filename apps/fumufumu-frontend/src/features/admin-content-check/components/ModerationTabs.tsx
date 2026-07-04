import Link from "next/link";

export type ModerationTabKey = "pending" | "published" | "hidden";

const TABS: Array<{ key: ModerationTabKey; label: string }> = [
  { key: "pending", label: "投稿チェック待ち" },
  { key: "published", label: "公開中" },
  { key: "hidden", label: "非表示中" },
];

type Props = {
  activeTab: ModerationTabKey;
};

/**
 * admin トップのタブナビゲーション (Server Component)
 *
 * タブ切替は ?tab= の Link 遷移のみで実現し、useEffect や client state は使わない
 * (CLAUDE.md の useEffect 既定禁止ルール)。ページ番号はタブ切替時にリセットされる想定
 * (Link に page を含めないため)。
 */
export const ModerationTabs = ({ activeTab }: Props) => {
  return (
    <nav
      className="flex gap-2 border-b border-gray-200"
      aria-label="投稿モデレーションタブ"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={tab.key === "pending" ? "/admin" : `/admin?tab=${tab.key}`}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "border-b-2 border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700"
                : "border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
