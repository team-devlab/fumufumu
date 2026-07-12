import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewStatusBanner } from "./ReviewStatusBanner";

describe("ReviewStatusBanner(#179)", () => {
  it("投稿チェック中(pending)は公開前状態を伝えるメッセージを出す", () => {
    render(<ReviewStatusBanner status="pending" />);
    expect(screen.getByText(/投稿チェック中/)).toBeInTheDocument();
    expect(
      screen.getByText(/ほかのユーザーにも表示されます/),
    ).toBeInTheDocument();
  });

  it("公開見送り(rejected)は見送りメッセージを出す", () => {
    render(<ReviewStatusBanner status="rejected" />);
    expect(screen.getByText(/公開を見送りました/)).toBeInTheDocument();
  });

  it("承認済み(approved)・未指定では何も描画しない", () => {
    const { container: approvedContainer } = render(
      <ReviewStatusBanner status="approved" />,
    );
    expect(approvedContainer).toBeEmptyDOMElement();

    const { container: undefinedContainer } = render(
      <ReviewStatusBanner status={undefined} />,
    );
    expect(undefinedContainer).toBeEmptyDOMElement();
  });
});
