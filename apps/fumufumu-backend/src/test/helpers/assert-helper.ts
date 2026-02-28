import { expect } from 'vitest';

/**
 * 認証エラーレスポンスの共通検証
 */
export function assertUnauthorizedError(
  data: any,
  expectedMessage: string = 'Session invalid or missing.',
) {
  expect(data.error).toBe('Unauthorized');
  expect(data.message).toBe(expectedMessage);
}
