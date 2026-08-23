/**
 * 日時表示を1か所にまとめる。
 *
 * サーバーコンポーネントの実行環境（Cloudflare Workers）のタイムゾーンは UTC なので、
 * タイムゾーンを指定せずに整形すると日本時間と9時間ずれて表示される（issue #145）。
 * 表示は日本時間で固定し、サーバーとブラウザのどちらで整形しても同じ結果になるようにする。
 */
const JAPAN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * ISO 8601 の日時文字列を「2026/08/23 09:30」の形に整形する（日本時間）。
 *
 * @param isoString API が返す ISO 8601 の日時文字列
 */
export const formatDateTimeInJapan = (isoString: string): string =>
  JAPAN_DATE_TIME_FORMATTER.format(new Date(isoString));
