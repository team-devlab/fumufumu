import { Next, Context } from 'hono';

import { type Env, type Variables } from '../index';
import { ensureBusinessUser } from '../services/auth-provisioning';

type AppContext = Context<{ Bindings: Env, Variables: Variables }>;

/**
 * 保護ミドルウェアの定義: 認証とID注入
 * 責務: 1. セッション検証 2. authUserId に対応する appUserId を解決し Context に注入
 *
 * 業務層 (users / auth_mappings) は ensureBusinessUser で遅延生成する。
 * マッピングが既にあればそれを返し、無ければここで生成する（lazy provisioning）。
 * これにより email / Google いずれの経路でも、また signup 後の業務層生成が
 * 中断したケースでも、初回の保護ルートアクセスで自動的に整合性が回復する（issue #115）。
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
  const authUser = session?.user;
  if (!authUser?.id) {
    return c.json({
      error: 'Unauthorized',
      message: 'Session invalid or missing.'
    }, 401);
  }

  // appUserId (業務ID) を解決（無ければ遅延生成）し、コンテキストに格納
  const appUserId = await ensureBusinessUser(db, {
    authUserId: authUser.id,
    name: authUser.name,
  });
  c.set('appUserId', appUserId);

  await next();
};
