import Link from "next/link";
import { ROUTES } from "@/config/routes";

/**
 * デザインは仮のヘッダーコンポーネント
 */
const TemporaryHeader = () => (
  <header className="flex items-center justify-between h-16 px-4 border-b bg-white/90 backdrop-blur-sm sticky top-0 z-10">
    <div className="font-bold text-xl text-gray-800">
      <Link href={ROUTES.HOME}>Fumufumu App</Link>
    </div>
    <div className="flex items-center space-x-4">
      <button
        type="button"
        className="text-gray-600 hover:text-gray-800 p-2 rounded-full transition duration-150"
      >
        SET
      </button>
      {/* Linkコンポーネントに変更 */}
      <Link
        href={ROUTES.CONSULTATION.NEW}
        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition duration-150 flex items-center"
      >
        + 新規作成
      </Link>
    </div>
  </header>
);

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col h-screen">
      <TemporaryHeader />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}