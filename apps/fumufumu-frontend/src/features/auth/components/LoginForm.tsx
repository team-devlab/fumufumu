"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

type LoginFormProps = {
  reason?: string | null;
  returnTo?: string | null;
};

export const LoginForm = ({ reason, returnTo }: LoginFormProps) => {
  const { signin, startGoogleAuth, isLoading, error } = useAuth();
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
    oauth_failed: {
      message: "Google認証に失敗しました。もう一度お試しください。",
      className: "border-amber-300 bg-amber-50 text-amber-800",
    },
  };

  const reasonInfo = reason ? reasonConfig[reason] : null;
  const showReasonMessage = Boolean(reasonInfo) && !error && !isLoading;

  return (
    <div className="mx-auto w-[calc(100%-32px)] max-w-[424px]">
      <div className="text-center">
        <div className="mx-auto w-full max-w-[424px]">
          <Image
            src="/fumufumu-login-logo-lockup.svg"
            alt="ふむふむ"
            width={1100}
            height={420}
            priority
            className="h-auto w-full"
          />
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

        <div className="my-6 flex items-center gap-3 text-sm text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          <span>または</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => startGoogleAuth(returnTo)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* biome-ignore lint/performance/noImgElement: 装飾用の静的SVGアイコン。next/image による最適化対象外のため img を使用 */}
          <img
            src="/google-logo.svg"
            alt=""
            width={20}
            height={20}
            aria-hidden="true"
          />
          <span>Googleでログイン</span>
        </button>
      </div>
    </div>
  );
};
