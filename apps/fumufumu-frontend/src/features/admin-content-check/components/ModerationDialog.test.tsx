import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModerationDialog } from "./ModerationDialog";

describe("ModerationDialog", () => {
  let showModalSpy: ReturnType<typeof vi.spyOn>;
  let closeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    showModalSpy = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    closeSpy = vi.spyOn(HTMLDialogElement.prototype, "close");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const hideProps = {
    mode: "hide" as const,
    triggerLabel: "非表示にする",
    title: "投稿を非表示にする",
    triggerClassName: "trigger",
  };

  it("トリガークリックで showModal が呼ばれる", async () => {
    const user = userEvent.setup();
    render(<ModerationDialog {...hideProps} onSubmit={vi.fn()} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    expect(showModalSpy).toHaveBeenCalledOnce();
  });

  it("mode=hide: reasonを入力せず送信するとonSubmitがreason=undefinedで呼ばれる（reasonは任意）", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ModerationDialog {...hideProps} onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    await user.click(screen.getByRole("button", { name: "実行する" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ reason: undefined, skipAuditLog: false });
    });
  });

  it("mode=hide: reasonを入力するとtrimしてonSubmitに渡る", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ModerationDialog {...hideProps} onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    await user.type(screen.getByLabelText(/非表示理由/), "  spam です  ");
    await user.click(screen.getByRole("button", { name: "実行する" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ reason: "spam です", skipAuditLog: false });
    });
  });

  it("スキップチェックを入れて送信するとskipAuditLog=trueで呼ばれる", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ModerationDialog {...hideProps} onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    await user.click(screen.getByLabelText(/テストデータ/));
    await user.click(screen.getByRole("button", { name: "実行する" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ reason: undefined, skipAuditLog: true });
    });
  });

  it("mode=unhide: reason入力欄が表示されない", async () => {
    const user = userEvent.setup();
    render(
      <ModerationDialog
        mode="unhide"
        triggerLabel="再度公開する"
        title="投稿を再度公開する"
        triggerClassName="trigger"
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "再度公開する" }));
    expect(screen.queryByLabelText(/非表示理由/)).toBeNull();
  });

  it("onSubmitがrejectしてもcloseが呼ばれる (finally経由)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("api error"));
    render(<ModerationDialog {...hideProps} onSubmit={onSubmit} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    await user.click(screen.getByRole("button", { name: "実行する" }));
    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  it("閉じるボタンでcloseが呼ばれる", async () => {
    const user = userEvent.setup();
    render(<ModerationDialog {...hideProps} onSubmit={vi.fn()} isSubmitting={false} />);
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(closeSpy).toHaveBeenCalledOnce();
  });

  it("isSubmitting=trueならトリガーがdisabled", () => {
    render(<ModerationDialog {...hideProps} onSubmit={vi.fn()} isSubmitting={true} />);
    expect(screen.getByRole("button", { name: "非表示にする" })).toBeDisabled();
  });

  it("descriptionが表示される", async () => {
    const user = userEvent.setup();
    render(
      <ModerationDialog
        {...hideProps}
        description={<p>投稿者本人にも効きます</p>}
        onSubmit={vi.fn()}
        isSubmitting={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "非表示にする" }));
    expect(screen.getByText("投稿者本人にも効きます")).toBeInTheDocument();
  });
});
