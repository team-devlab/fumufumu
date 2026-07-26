import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withdrawAccount } from "@/features/user/api/userClientApi";
import type { WithdrawalPreview } from "@/features/user/types";
import { ApiError } from "@/lib/api/client";
import { WithdrawalSection } from "./WithdrawalSection";

vi.mock("@/features/user/api/userClientApi", () => ({
  withdrawAccount: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// vitest.setup.ts の useRouter は呼び出しごとに新しい push(vi.fn) を返すため、
// push の呼び出しを観測できない。安定参照のためこのファイル限定で再モックする。
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/user/withdrawal",
  useSearchParams: () => new URLSearchParams(),
}));

const preview: WithdrawalPreview = {
  consultations: { delete: 1, anonymize: 1 },
  advices: { delete: 0, anonymize: 1 },
  drafts: { delete: 2 },
};

const openDialog = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "退会手続きへ進む" }));
};

describe("WithdrawalSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("相談/アドバイス/下書きの内訳を表示する", () => {
    render(<WithdrawalSection preview={preview} />);
    expect(screen.getByText(/完全に削除されるもの/)).toBeInTheDocument();
    expect(screen.getByText(/匿名化して残る/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // 下書き 削除
    expect(screen.getByText("0")).toBeInTheDocument(); // アドバイス 削除
  });

  it("メール未入力では退会ボタンが無効、入力すると有効になる（type-to-confirm）", async () => {
    const user = userEvent.setup();
    render(<WithdrawalSection preview={preview} />);
    await openDialog(user);

    const submit = screen.getByRole("button", { name: "退会する" });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("メールアドレス"), "me@example.com");
    expect(submit).toBeEnabled();
  });

  it("送信すると withdrawAccount が入力メールで呼ばれ、成功で完了 toast＋/login へ遷移する", async () => {
    const user = userEvent.setup();
    vi.mocked(withdrawAccount).mockResolvedValue({ message: "ok" });

    render(<WithdrawalSection preview={preview} />);
    await openDialog(user);
    await user.type(screen.getByLabelText("メールアドレス"), "me@example.com");
    await user.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => {
      expect(withdrawAccount).toHaveBeenCalledWith("me@example.com");
    });
    expect(toast.success).toHaveBeenCalledWith("退会が完了しました");
    expect(pushMock).toHaveBeenCalledWith("/login?reason=withdrawn");
  });

  it("メール不一致(400)はダイアログを閉じずインラインエラーを出し、遷移しない", async () => {
    const user = userEvent.setup();
    vi.mocked(withdrawAccount).mockRejectedValue(
      new ApiError(400, "ValidationError"),
    );

    render(<WithdrawalSection preview={preview} />);
    await openDialog(user);
    await user.type(
      screen.getByLabelText("メールアドレス"),
      "wrong@example.com",
    );
    await user.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "入力されたメールアドレスが登録メールアドレスと一致しません。",
        ),
      ).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
    // ダイアログは閉じず、入力し直せる
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
  });

  it("管理者(403)は退会できない旨のエラーを出す", async () => {
    const user = userEvent.setup();
    vi.mocked(withdrawAccount).mockRejectedValue(
      new ApiError(403, "ForbiddenError"),
    );

    render(<WithdrawalSection preview={preview} />);
    await openDialog(user);
    await user.type(
      screen.getByLabelText("メールアドレス"),
      "admin@example.com",
    );
    await user.click(screen.getByRole("button", { name: "退会する" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "管理者アカウントは退会できません。運営にお問い合わせください。",
        ),
      ).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
