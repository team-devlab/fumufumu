import type { ReactNode } from "react";
import Link from "next/link";

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-base font-bold text-gray-800">UI Sandbox</h1>
          <Link
            href="/consultations"
            className="text-sm text-teal-700 hover:text-teal-800"
          >
            本体へ戻る
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
