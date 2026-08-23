"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import {
  AUTH_CARD_CLASS,
  AUTH_CONTAINER_CLASS,
  AUTH_FOOTER_LINK_CLASS,
  AUTH_FOOTER_TEXT_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_NOTICE_CLASS,
  AUTH_SUBMIT_BUTTON_CLASS,
} from "../config/formStyles";
import { useAuth } from "../hooks/useAuth";
import { AuthFormHeader } from "./AuthFormHeader";

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
    // アカウント無効化(BAN)で 403 を受け、強制的にログイン画面へ戻された場合の告知(#136)。
    account_disabled: {
      message: "アカウントが無効化されました。",
      className: "border-red-300 bg-red-50 text-red-800",
    },
    // 退会完了でログイン画面へ戻された場合の告知。
    withdrawn: {
      message: "退会が完了しました。\nご利用ありがとうございました。",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
  };

  const reasonInfo = reason ? reasonConfig[reason] : null;
  const showReasonMessage = Boolean(reasonInfo) && !error && !isLoading;

  return (
    <div className={AUTH_CONTAINER_CLASS}>
      <AuthFormHeader />

      <div className={`mt-9 ${AUTH_CARD_CLASS}`}>
        {showReasonMessage && reasonInfo && (
          <div className={`${AUTH_NOTICE_CLASS} ${reasonInfo.className}`}>
            {reasonInfo.message}
          </div>
        )}

        {error && (
          <div
            className={`${AUTH_NOTICE_CLASS} border-red-300 bg-red-50 text-red-800`}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="login-email" className={AUTH_LABEL_CLASS}>
              メールアドレス
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="sample@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className={AUTH_LABEL_CLASS}>
              パスワード
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className={AUTH_SUBMIT_BUTTON_CLASS}
          >
            {isLoading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>
      </div>

      {/* LP から来て、まだアカウントを持っていない人がここで詰まらないようにする。 */}
      <p className={AUTH_FOOTER_TEXT_CLASS}>
        アカウントをお持ちでないですか？{" "}
        <Link href={ROUTES.SIGNUP} className={AUTH_FOOTER_LINK_CLASS}>
          アカウント作成
        </Link>
      </p>
    </div>
  );
};
