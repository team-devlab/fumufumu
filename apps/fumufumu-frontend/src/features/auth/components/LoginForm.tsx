"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

type LoginFormProps = {
  reason?: string | null;
  returnTo?: string | null;
};

export const LoginForm = ({ reason, returnTo }: LoginFormProps) => {
  const { signin, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signin({ email, password }, returnTo);
  };

  const reasonConfig: Record<string, { message: string; className: string }> = {
    unauthorized: {
      message: "ログインが必要です🔐",
      className: "border-[#A7F3D0] bg-[#ECFEF6] text-[#0F4D3F]",
    },
    session_expired: {
      message: "セッションが終了しました。再度ログインお願いします🌿",
      className: "border-amber-300 bg-amber-50 text-amber-800",
    },
    signed_out: {
      message: "サインアウトしました。\nご利用ありがとうございました。",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
  };

  const reasonInfo = reason ? reasonConfig[reason] : null;
  const showReasonMessage = Boolean(reasonInfo) && !error && !isLoading;

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">ログイン</h1>

      {showReasonMessage && reasonInfo && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${reasonInfo.className}`}
        >
          {reasonInfo.message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
        >
          {isLoading ? "ログイン中..." : "ログイン"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-gray-500">
        アカウントをお持ちでないですか？{" "}
        <Link
          href="/signup"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          サインアップ
        </Link>
      </p>
    </div>
  );
};
