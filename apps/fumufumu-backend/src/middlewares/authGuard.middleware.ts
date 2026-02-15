import { Next, Context } from 'hono';
import { eq } from 'drizzle-orm';

import { type Env, type Variables } from '../index';
import { authMappings } from '../db/schema/user';

type AppContext = Context<{ Bindings: Env, Variables: Variables }>;

/**
 * 保護ミドルウェアの定義: 認証とID注入
 * 責務: 1. セッション検証 2. authUserIdからappUserIdをルックアップしContextに注入
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

  const mapping = await db.query.authMappings.findFirst({
    where: eq(authMappings.authUserId, authUserId),
  });

  // 業務ユーザーIDとのマッピングがない場合は認証失敗
  if (!mapping) {
    return c.json({ 
      error: 'Unauthorized', 
      message: 'App User ID mapping missing.' 
    }, 401);
  }

  // appUserId (業務ID) をコンテキストに格納
  c.set('appUserId', mapping.appUserId);

  await next();
};