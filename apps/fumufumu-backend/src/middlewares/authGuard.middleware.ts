import { Next, Context } from 'hono';
import { eq } from 'drizzle-orm';

import { type Env, type Variables } from '../index';
import { authMappings, users } from '../db/schema/user';
import { accountDisabledBody } from '../lib/account-status';

type AppContext = Context<{ Bindings: Env, Variables: Variables }>;

/**
 * 保護ミドルウェアの定義: 認証・無効化チェック・ID/role 注入
 * 責務: 1. セッション検証 2. disabled(BAN) の enforce 3. appUserId と userRole を Context に注入
 *
 * @param c Hono Context (Context型を使用することでget()メソッド等が利用可能に)
 * @param next Next function
 */
export const authGuard = async (c: AppContext, next: Next) => {
  const auth = c.get('auth');
  const db = c.get('db');

  // セッションの検証
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // セッションが存在しないか、ユーザー情報がない場合は認証失敗
  const authUserId = session?.user?.id;
  if (!authUserId) {
    return c.json({
      error: 'Unauthorized',
      message: 'Session invalid or missing.'
    }, 401);
  }

  // authMappings と users を 1 往復(innerJoin)で引き、appUserId・disabled・role をまとめて取得する。
  // - disabled を毎リクエスト DB から読むため、BAN は次リクエストで即時に効く
  //   (Better Auth の cookieCache はこの独自クエリに影響しない)。
  // - role も同時に取り、後段の adminGuard が再クエリせず c.get('userRole') を使えるようにする (#136)。
  const rows = await db
    .select({
      appUserId: authMappings.appUserId,
      disabled: users.disabled,
      role: users.role,
    })
    .from(authMappings)
    .innerJoin(users, eq(users.id, authMappings.appUserId))
    .where(eq(authMappings.authUserId, authUserId))
    .limit(1);

  const account = rows[0];

  // マッピング欠落・users 行欠落はいずれも認証失敗として扱う(innerJoin なので両者を同時に担保)。
  if (!account) {
    return c.json({
      error: 'Unauthorized',
      message: 'App User ID mapping missing.'
    }, 401);
  }

  // disabled は権限不足(admin API の 404 化)とは別概念。
  // 本人に「無効化されている」ことを明確に伝えるため 403 + 明示メッセージにする (#136)。
  if (account.disabled) {
    return c.json(accountDisabledBody, 403);
  }

  // appUserId(業務ID) と role をコンテキストに格納
  c.set('appUserId', account.appUserId);
  c.set('userRole', account.role);

  await next();
};
