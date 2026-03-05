import Link from "next/link";

export const UserSessionExpiredState = () => {
  return (
    <section
      aria-labelledby="session-expired-heading"
      className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm"
    >
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="セッション期限切れアイコン"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 id="session-expired-heading" className="text-2xl font-bold text-gray-900">
        セッションの有効期限が切れました
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
        再度ログインしてください。
      </p>

      <div className="mt-6">
        <Link
          href="/login?returnTo=%2Fuser"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-150 hover:bg-blue-700"
        >
          ログイン画面へ
        </Link>
      </div>
    </section>
  );
};
