import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { authApi } from "../api/authApi";
import { LoginForm } from "./LoginForm";

// signin の 403(account_disabled)ハンドリングを検証するため authApi をモックする。
// useAuth の useRouter は vitest.setup.ts のグローバルモックで賄われる。
vi.mock("../api/authApi", () => ({
  authApi: { signin: vi.fn(), signup: vi.fn(), signout: vi.fn() },
}));

describe("LoginForm アカウント無効化(#136)", () => {
  it("reason=account_disabled で無効化バナーを表示する", () => {
    render(<LoginForm reason="account_disabled" />);
    expect(
      screen.getByText("アカウントが無効化されました。"),
    ).toBeInTheDocument();
  });

  it("signin が 403(account_disabled)で失敗したら無効化メッセージを表示する", async () => {
    // signin は skipAuthRedirect のため apiClient はリダイレクトせず ApiError を投げる。
    vi.mocked(authApi.signin).mockRejectedValueOnce(
      new ApiError(403, "Account disabled", "account_disabled"),
    );

    render(<LoginForm />);

    await userEvent.type(
      screen.getByLabelText("メールアドレス"),
      "banned@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "password123456");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("このアカウントは無効化されています。"),
      ).toBeInTheDocument();
    });
  });
});
