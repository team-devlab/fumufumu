"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import {
  AUTH_CARD_CLASS,
  AUTH_CONTAINER_CLASS,
  AUTH_FOOTER_LINK_CLASS,
  AUTH_FOOTER_TEXT_CLASS,
  AUTH_HINT_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_NOTICE_CLASS,
  AUTH_SUBMIT_BUTTON_CLASS,
} from "../config/formStyles";
import { useAuth } from "../hooks/useAuth";
import { AuthFormHeader } from "./AuthFormHeader";

export const SignupForm = () => {
  const { signup, isLoading, error } = useAuth();
  const nameHintId = useId();
  const passwordHintId = useId();

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
    <div className={AUTH_CONTAINER_CLASS}>
      <AuthFormHeader />

      <div className={`mt-9 ${AUTH_CARD_CLASS}`}>
        <h1 className="mb-6 text-center text-[18px] font-bold text-slate-800">
          アカウント作成
        </h1>

        {error && (
          <div
            className={`${AUTH_NOTICE_CLASS} border-red-300 bg-red-50 text-red-800`}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 名前入力欄。投稿の著者として他の利用者に見えるため、本名不要であることを明示する。 */}
          <div className="space-y-2">
            <label htmlFor="signup-name" className={AUTH_LABEL_CLASS}>
              ユーザー名
            </label>
            <input
              id="signup-name"
              type="text"
              placeholder="ふむふむ太郎"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-describedby={nameHintId}
              className={AUTH_INPUT_CLASS}
            />
            <p id={nameHintId} className={AUTH_HINT_CLASS}>
              ※投稿したときに表示される名前です。本名でなくてかまいません
            </p>
          </div>

          {/* メールアドレス入力欄 */}
          <div className="space-y-2">
            <label htmlFor="signup-email" className={AUTH_LABEL_CLASS}>
              メールアドレス
            </label>
            <input
              id="signup-email"
              type="email"
              placeholder="sample@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={AUTH_INPUT_CLASS}
            />
          </div>

          {/* パスワード入力欄 */}
          <div className="space-y-2">
            <label htmlFor="signup-password" className={AUTH_LABEL_CLASS}>
              パスワード
            </label>
            <input
              id="signup-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8} // 簡単なバリデーション
              aria-describedby={passwordHintId}
              className={AUTH_INPUT_CLASS}
            />
            <p id={passwordHintId} className={AUTH_HINT_CLASS}>
              ※8文字以上で入力してください
            </p>
          </div>

          {/* 登録前にポリシーを読める状態にしておくための導線。
              本文に体調や病気のことを書いた場合の扱いもポリシー側に書いてあるため、
              アカウントを作る前に読めることが前提になる。 */}
          <p className={AUTH_HINT_CLASS}>
            ※ご登録の前に、お預かりする情報の扱いをまとめた
            <Link
              href={ROUTES.PRIVACY}
              className={`mx-1 ${AUTH_FOOTER_LINK_CLASS}`}
            >
              プライバシーポリシー
            </Link>
            をご確認ください
          </p>

          <Button
            type="submit"
            disabled={isLoading}
            className={AUTH_SUBMIT_BUTTON_CLASS}
          >
            {isLoading ? "作成中..." : "アカウントを作成"}
          </Button>
        </form>
      </div>

      <p className={AUTH_FOOTER_TEXT_CLASS}>
        すでにアカウントをお持ちですか？{" "}
        <Link href={ROUTES.LOGIN} className={AUTH_FOOTER_LINK_CLASS}>
          ログイン
        </Link>
      </p>
    </div>
  );
};
