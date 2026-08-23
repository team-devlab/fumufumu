import { describe, expect, it } from "vitest";
import { formatDateTimeInJapan } from "./datetime";

describe("formatDateTimeInJapan", () => {
  it("ISO 8601 の日時を日本時間で整形する", () => {
    expect(formatDateTimeInJapan("2026-08-23T09:30:00.000Z")).toBe(
      "2026/08/23 18:30",
    );
  });

  // 実行環境が UTC でも日本時間で出ることを固定する。
  // タイムゾーン指定を落とすと UTC 環境（CI や Cloudflare Workers）で 00:30 になる。
  it("UTC の 0 時台は同じ日の 9 時台として扱う", () => {
    expect(formatDateTimeInJapan("2026-08-23T00:30:00.000Z")).toBe(
      "2026/08/23 09:30",
    );
  });

  // 日付をまたぐ場合。UTC のままだと前日として表示されてしまう。
  it("UTC の深夜は翌日として扱う", () => {
    expect(formatDateTimeInJapan("2026-08-23T15:30:00.000Z")).toBe(
      "2026/08/24 00:30",
    );
  });
});
