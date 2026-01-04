"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export const SignupForm = () => {
  const { signup, isLoading, error } = useAuth();

  // 入力ステート
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // フック経由でAPIをコール
    signup({ name, email, password });
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

      <p className="mt-6 text-sm text-gray-500">
        すでにアカウントをお持ちですか？{" "}
        <Link
          href="/login"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ログイン
        </Link>
      </p>
    </div>
  );
};
