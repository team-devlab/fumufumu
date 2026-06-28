import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RejectDialog } from "./RejectDialog";

describe("RejectDialog", () => {
  let showModalSpy: ReturnType<typeof vi.spyOn>;
  let closeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // vitest.setup.ts でグローバルに当てた最小スタブの上に spy を被せて
    // 呼び出し回数を観測する。call-through を維持して open / close も動かす。
    showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("却下ボタンクリックで showModal が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<RejectDialog onSubmit={vi.fn()} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    expect(showModalSpy).toHaveBeenCalledOnce();
  });

  it("空のまま送信すると validation error が出て onSubmit は呼ばれない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RejectDialog onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    await user.click(screen.getByRole("button", { name: "却下する" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "却下理由を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("空白のみの reason も validation error 扱いになる (trim 後判定)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RejectDialog onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    await user.type(screen.getByLabelText(/却下理由/), "   ");
    await user.click(screen.getByRole("button", { name: "却下する" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "却下理由を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("有効な reason で送信すると onSubmit(trimmed) と close が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<RejectDialog onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    await user.type(screen.getByLabelText(/却下理由/), "  spam です  ");
    await user.click(screen.getByRole("button", { name: "却下する" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("spam です");
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  it("onSubmit が reject しても close は呼ばれる (finally 経由)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("api error"));
    render(<RejectDialog onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    await user.type(screen.getByLabelText(/却下理由/), "reason");
    await user.click(screen.getByRole("button", { name: "却下する" }));
    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  it("キャンセルボタンで close が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<RejectDialog onSubmit={vi.fn()} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "却下" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("isSubmitting=true なら 却下 トリガーが disabled", () => {
    render(<RejectDialog onSubmit={vi.fn()} isSubmitting={true} />);
    expect(screen.getByRole("button", { name: "却下" })).toBeDisabled();
  });
});
