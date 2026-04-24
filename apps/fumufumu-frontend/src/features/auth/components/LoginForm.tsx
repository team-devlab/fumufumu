"use client";

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
    <div className="mx-auto w-[calc(100%-32px)] max-w-[424px]">
      <div className="text-center">
        <div className="mx-auto inline-flex h-[74px] min-w-[218px] items-center justify-center rounded-2xl bg-[#0F9F92] px-8 shadow-[0_8px_20px_rgba(15,159,146,0.24)]">
          <span className="text-[48px] font-black leading-none tracking-[-0.02em] text-white">
            ふむふむ
          </span>
        </div>
        <p className="mt-5 text-[18px] font-semibold tracking-tight text-[#0F9F92] sm:text-[19px]">
          エンジニアのお悩み相談プラットフォーム
        </p>
      </div>

      <div className="mt-9 rounded-[20px] border border-[rgba(126,231,220,0.6)] bg-white px-7 py-8 shadow-[0_12px_26px_rgba(13,85,77,0.12)] sm:px-8 sm:py-9">
        {showReasonMessage && reasonInfo && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${reasonInfo.className}`}
          >
            {reasonInfo.message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="block text-left text-[14px] font-semibold text-[#0F8F84]"
            >
              メールアドレス
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="sample@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-[rgba(126,231,220,0.5)] bg-white px-3 text-[14px] text-slate-700 placeholder:text-[13px] placeholder:text-slate-400 transition focus:border-[rgba(15,159,146,0.8)] focus:outline-none focus:ring-2 focus:ring-[rgba(15,159,146,0.2)]"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="block text-left text-[14px] font-semibold text-[#0F8F84]"
            >
              パスワード
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 w-full rounded-xl border border-[rgba(126,231,220,0.5)] bg-white px-3 text-[14px] text-slate-700 placeholder:text-[13px] placeholder:text-slate-400 transition focus:border-[rgba(15,159,146,0.8)] focus:outline-none focus:ring-2 focus:ring-[rgba(15,159,146,0.2)]"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-[#0F9F92] text-[15px] font-semibold text-white shadow-none transition hover:bg-[#0C8F84] disabled:bg-[#70CFC5]"
          >
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
};
