"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "../hooks/useAuth";

export const LoginForm = () => {
  const { signin, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signin({ email, password });
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">ログイン</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
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
