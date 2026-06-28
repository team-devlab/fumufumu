import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  decideAdviceApi,
  decideConsultationApi,
} from "../api/adminContentCheckDecisionApi";
import { DecisionActions } from "./DecisionActions";

vi.mock("../api/adminContentCheckDecisionApi", () => ({
  decideConsultationApi: vi.fn(),
  decideAdviceApi: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 却下フローは RejectDialog.test.tsx で詳細検証する。本ファイルでは
// DecisionActions が onSubmit に reason を渡す配線だけ確認できれば十分なので、
// stub で「クリック1回 = onSubmit('test reason') 呼び出し」に縮約する。
vi.mock("./RejectDialog", () => ({
  RejectDialog: ({
    onSubmit,
    isSubmitting,
  }: {
    onSubmit: (reason: string) => Promise<void>;
    isSubmitting: boolean;
  }) => (
    <button
      type="button"
      data-testid="reject-stub"
      disabled={isSubmitting}
      onClick={() => onSubmit("test reason")}
    >
      却下
    </button>
  ),
}));

const dummyConsultationResponse = {
  consultation_id: 1,
  status: "approved" as const,
  reason: null,
  checked_at: "2026-06-28T00:00:00Z",
  updated_at: "2026-06-28T00:00:00Z",
};
const dummyAdviceResponse = {
  advice_id: 1,
  status: "approved" as const,
  reason: null,
  checked_at: "2026-06-28T00:00:00Z",
  updated_at: "2026-06-28T00:00:00Z",
};

describe("DecisionActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("承認パス", () => {
    it("confirm OK で kind=consultation の場合 decideConsultationApi が approved で呼ばれる", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(decideConsultationApi).mockResolvedValue(
        dummyConsultationResponse,
      );

      render(<DecisionActions kind="consultation" itemId={42} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      expect(decideConsultationApi).toHaveBeenCalledWith(
        42,
        "approved",
        undefined,
      );
      expect(decideAdviceApi).not.toHaveBeenCalled();
    });

    it("kind=advice なら decideAdviceApi が呼ばれる", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(decideAdviceApi).mockResolvedValue(dummyAdviceResponse);

      render(<DecisionActions kind="advice" itemId={7} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      expect(decideAdviceApi).toHaveBeenCalledWith(7, "approved", undefined);
      expect(decideConsultationApi).not.toHaveBeenCalled();
    });

    it("confirm Cancel なら API が呼ばれない", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      expect(decideConsultationApi).not.toHaveBeenCalled();
    });

    it("成功時に toast.success('承認しました') が呼ばれる", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(decideConsultationApi).mockResolvedValue(
        dummyConsultationResponse,
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("承認しました");
      });
    });

    it("ApiError(404) で「他の管理者が...」toast が出る", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new ApiError(404, "Not Found"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "他の管理者が既に処理した可能性があります",
        );
      });
    });

    it("ApiError(500) で「承認に失敗しました」toast が出る", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new ApiError(500, "Internal Error"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("承認に失敗しました");
      });
    });

    it("非 ApiError (network failure) で「ネットワーク接続を確認してください」toast が出る", async () => {
      const user = userEvent.setup();
      vi.spyOn(window, "confirm").mockReturnValue(true);
      // fetch が TypeError で throw するケースを模す (network down 等)
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new TypeError("Failed to fetch"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByRole("button", { name: "承認" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "ネットワーク接続を確認してください",
        );
      });
    });
  });

  describe("却下パス", () => {
    it("却下フローで decideConsultationApi が rejected と reason で呼ばれる", async () => {
      const user = userEvent.setup();
      vi.mocked(decideConsultationApi).mockResolvedValue({
        ...dummyConsultationResponse,
        status: "rejected",
        reason: "test reason",
      });

      render(<DecisionActions kind="consultation" itemId={42} />);
      await user.click(screen.getByTestId("reject-stub"));

      await waitFor(() => {
        expect(decideConsultationApi).toHaveBeenCalledWith(
          42,
          "rejected",
          "test reason",
        );
      });
      expect(toast.success).toHaveBeenCalledWith("却下しました");
    });

    it("kind=advice なら decideAdviceApi が rejected で呼ばれる", async () => {
      const user = userEvent.setup();
      vi.mocked(decideAdviceApi).mockResolvedValue({
        ...dummyAdviceResponse,
        status: "rejected",
        reason: "test reason",
      });

      render(<DecisionActions kind="advice" itemId={7} />);
      await user.click(screen.getByTestId("reject-stub"));

      await waitFor(() => {
        expect(decideAdviceApi).toHaveBeenCalledWith(
          7,
          "rejected",
          "test reason",
        );
      });
    });

    it("却下時の ApiError(404) で「他の管理者が...」toast が出る", async () => {
      const user = userEvent.setup();
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new ApiError(404, "Not Found"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByTestId("reject-stub"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "他の管理者が既に処理した可能性があります",
        );
      });
    });

    it("却下時の汎用エラーで「却下に失敗しました」toast が出る", async () => {
      const user = userEvent.setup();
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new ApiError(500, "Internal Error"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByTestId("reject-stub"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("却下に失敗しました");
      });
    });

    it("却下時の非 ApiError (network failure) で「ネットワーク接続を確認してください」toast が出る", async () => {
      const user = userEvent.setup();
      vi.mocked(decideConsultationApi).mockRejectedValue(
        new TypeError("Failed to fetch"),
      );

      render(<DecisionActions kind="consultation" itemId={1} />);
      await user.click(screen.getByTestId("reject-stub"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "ネットワーク接続を確認してください",
        );
      });
    });
  });
});
