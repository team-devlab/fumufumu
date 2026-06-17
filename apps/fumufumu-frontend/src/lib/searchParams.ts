/**
 * Next.js の searchParams は値が string | string[] | undefined になり得る。
 * 同一キーが複数指定された場合は先頭の値を採用し、未指定なら null を返す。
 */
export const pickFirst = (value?: string | string[]) => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};
