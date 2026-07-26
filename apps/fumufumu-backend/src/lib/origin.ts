/**
 * FRONTEND_URL（カンマ区切り）を許可 Origin の配列に正規化する。末尾スラッシュは運用ミス防止で除去する。
 * CORS と CSRF(Origin 検証) が同じ許可リストを使い、二重定義でのずれを防ぐため 1 箇所に集約する。
 */
export function parseAllowedOrigins(frontendUrl: string | undefined): string[] {
	return (frontendUrl || "")
		.split(",")
		.map((url) => url.trim().replace(/\/$/, ""));
}
