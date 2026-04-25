"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

type SignupFormProps = {
  returnTo?: string | null;
};

export const SignupForm = ({ returnTo }: SignupFormProps) => {
  const { signup, startGoogleAuth, isLoading, error } = useAuth();
  const loginHref = returnTo
    ? `/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/login";

  // 入力ステート
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // フック経由でAPIをコール
    signup({ name, email, password }, returnTo);
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">アカウント作成</h1>

      {/* エラー表示エリア */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 名前入力欄 */}
        <div>
          <input
            type="text"
            placeholder="ユーザー名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* メールアドレス入力欄 */}
        <div>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* パスワード入力欄 */}
        <div>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8} // 簡単なバリデーション
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 text-left mt-1 ml-1">
            ※8文字以上で入力してください
          </p>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
        >
          {isLoading ? "作成中..." : "アカウントを作成"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-gray-400 text-sm">
        <span className="h-px flex-1 bg-gray-200" />
        <span>または</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => startGoogleAuth(returnTo)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-bold"
        >
          G
        </span>
        <span>Googleで登録</span>
      </button>

      <p className="mt-6 text-sm text-gray-500">
        すでにアカウントをお持ちですか？{" "}
        <Link
          href={loginHref}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ログイン
        </Link>
      </p>
    </div>
  );
};
