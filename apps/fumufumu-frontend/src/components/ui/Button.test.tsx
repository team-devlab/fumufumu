import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button Component", () => {
  it("ラベルが正しく表示されること", () => {
    render(<Button>テストボタン</Button>);
    expect(screen.getByText("テストボタン")).toBeDefined();
  });

  it("disabled 属性が正しく反映されること", () => {
    render(<Button disabled>無効ボタン</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
