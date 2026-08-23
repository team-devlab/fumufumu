import Link from "next/link";
import { ROUTES } from "@/config/routes";

// サイト共通のフッター。
// 今はプライバシーポリシーだけを置くが、利用規約などを後から並べられるよう
// リンクは配列で持ち、表示側は件数を前提にしない。
const FOOTER_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: ROUTES.PRIVACY, label: "プライバシーポリシー" },
];

export const Footer = () => {
  return (
    <footer className="border-t border-gray-200 px-6 py-6">
      <nav aria-label="サイト情報" className="mx-auto max-w-6xl">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
          {FOOTER_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-gray-700 hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
};
