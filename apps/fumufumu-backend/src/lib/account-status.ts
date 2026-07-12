/**
 * 無効化(BAN)されたアカウントへ返す 403 レスポンスの契約を 1 箇所に集約する。
 *
 * disabled は「権限不足」(admin API の 404 化, ADR 010 §4) とは別概念で、
 * 本人に「無効化されている」ことを明確に伝える方が UX が良いため 403 + 明示メッセージにする (#136)。
 * frontend は人間向け文言ではなく安定した `code` で分岐するため、code は契約として固定する。
 * authGuard(全認証 API) と signin route の双方がこの同一ボディを返し、frontend の分岐を一本化する。
 */
export const ACCOUNT_DISABLED_CODE = "account_disabled" as const;

export const accountDisabledBody = {
	error: "Account disabled",
	code: ACCOUNT_DISABLED_CODE,
	message: "このアカウントは無効化されています",
} as const;
