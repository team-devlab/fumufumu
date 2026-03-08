import Link from "next/link";

export default function SandboxHomePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">検証ページ一覧</h2>
      <p className="text-sm text-gray-500">
        本体実装とは分離した、試験的なUI確認ページです。
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <Link
          href="/sandbox/session-toast"
          className="text-sm font-semibold text-teal-700 hover:text-teal-800"
        >
          セッション切れトースト検証を開く
        </Link>
      </div>
    </div>
  );
}
