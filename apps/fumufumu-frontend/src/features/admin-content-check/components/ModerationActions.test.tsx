import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  hideModerationTargetApi,
  unhideModerationTargetApi,
} from "../api/moderationActionApi";
import { ModerationActions } from "./ModerationActions";

vi.mock("../api/moderationActionApi", () => ({
  hideModerationTargetApi: vi.fn(),
  unhideModerationTargetApi: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// vitest.setup.ts の useRouter は呼び出しごとに新しい refresh(vi.fn) を返すため、
// refresh が呼ばれたことを観測できない。安定した参照を掴むためこのファイル限定で
// next/navigation を再モックし、router.refresh() の呼び出しを検証できるようにする。
const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const dummyModerationResponse = {
  target_type: "consultation" as const,
  target_id: 1,
  hidden_at: "2026-07-04T00:00:00Z",
};

describe("ModerationActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("mode=hide", () => {
    it("送信するとhideModerationTargetApiがtargetType/targetId/reason/skipAuditLogで呼ばれる", async () => {
      const user = userEvent.setup();
      vi.mocked(hideModerationTargetApi).mockResolvedValue(
        dummyModerationResponse,
      );

      render(
        <ModerationActions
          mode="hide"
          targetType="consultations"
          targetId={42}
        />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      await user.type(screen.getByLabelText(/非表示理由/), "reason");
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(hideModerationTargetApi).toHaveBeenCalledWith(
          "consultations",
          42,
          "reason",
          false,
        );
      });
      expect(unhideModerationTargetApi).not.toHaveBeenCalled();
    });

    it("成功時にtoast.successが呼ばれ、routerがrefreshされる想定でエラーは出ない", async () => {
      const user = userEvent.setup();
      vi.mocked(hideModerationTargetApi).mockResolvedValue(
        dummyModerationResponse,
      );

      render(
        <ModerationActions mode="hide" targetType="advices" targetId={1} />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("非表示にしました");
      });
      // 成功後に一覧を最新化するため router.refresh() が呼ばれること
      expect(refreshMock).toHaveBeenCalled();
    });

    it("ApiError(404)で「他の管理者が...」toastが出る", async () => {
      const user = userEvent.setup();
      vi.mocked(hideModerationTargetApi).mockRejectedValue(
        new ApiError(404, "Not Found"),
      );

      render(
        <ModerationActions
          mode="hide"
          targetType="consultations"
          targetId={1}
        />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "他の管理者が既に処理した可能性があります",
        );
      });
    });

    it("ApiError(500)で「非表示化に失敗しました」toastが出る", async () => {
      const user = userEvent.setup();
      vi.mocked(hideModerationTargetApi).mockRejectedValue(
        new ApiError(500, "Internal Error"),
      );

      render(
        <ModerationActions
          mode="hide"
          targetType="consultations"
          targetId={1}
        />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("非表示化に失敗しました");
      });
    });

    it("非ApiError(network failure)で「ネットワーク接続を確認してください」toastが出る", async () => {
      const user = userEvent.setup();
      vi.mocked(hideModerationTargetApi).mockRejectedValue(
        new TypeError("Failed to fetch"),
      );

      render(
        <ModerationActions
          mode="hide"
          targetType="consultations"
          targetId={1}
        />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "ネットワーク接続を確認してください",
        );
      });
    });

    it("投稿者本人にも効く旨の注意文が表示される", async () => {
      const user = userEvent.setup();
      render(
        <ModerationActions
          mode="hide"
          targetType="consultations"
          targetId={1}
        />,
      );
      await user.click(screen.getByRole("button", { name: "非表示にする" }));
      expect(
        screen.getByText(/投稿者本人であってもこの投稿を閲覧できなくなります/),
      ).toBeInTheDocument();
    });
  });

  describe("mode=unhide", () => {
    it("送信するとunhideModerationTargetApiがtargetType/targetId/skipAuditLogで呼ばれる", async () => {
      const user = userEvent.setup();
      vi.mocked(unhideModerationTargetApi).mockResolvedValue(
        dummyModerationResponse,
      );

      render(
        <ModerationActions
          mode="unhide"
          targetType="consultations"
          targetId={42}
          currentReason="spam"
        />,
      );
      await user.click(screen.getByRole("button", { name: "再度公開する" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(unhideModerationTargetApi).toHaveBeenCalledWith(
          "consultations",
          42,
          false,
        );
      });
      expect(hideModerationTargetApi).not.toHaveBeenCalled();
    });

    it("現在のhide理由が併記される", async () => {
      const user = userEvent.setup();
      render(
        <ModerationActions
          mode="unhide"
          targetType="consultations"
          targetId={1}
          currentReason="spam"
        />,
      );
      await user.click(screen.getByRole("button", { name: "再度公開する" }));
      expect(screen.getByText(/現在の非表示理由:\s*spam/)).toBeInTheDocument();
    });

    it("成功時にtoast.success('再度公開しました')が呼ばれる", async () => {
      const user = userEvent.setup();
      vi.mocked(unhideModerationTargetApi).mockResolvedValue(
        dummyModerationResponse,
      );

      render(
        <ModerationActions
          mode="unhide"
          targetType="consultations"
          targetId={1}
          currentReason={null}
        />,
      );
      await user.click(screen.getByRole("button", { name: "再度公開する" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("再度公開しました");
      });
      // 成功後に一覧を最新化するため router.refresh() が呼ばれること
      expect(refreshMock).toHaveBeenCalled();
    });

    it("ApiError(500)で「再公開に失敗しました」toastが出る", async () => {
      const user = userEvent.setup();
      vi.mocked(unhideModerationTargetApi).mockRejectedValue(
        new ApiError(500, "Internal Error"),
      );

      render(
        <ModerationActions
          mode="unhide"
          targetType="consultations"
          targetId={1}
          currentReason={null}
        />,
      );
      await user.click(screen.getByRole("button", { name: "再度公開する" }));
      await user.click(screen.getByRole("button", { name: "実行する" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("再公開に失敗しました");
      });
    });
  });
});
