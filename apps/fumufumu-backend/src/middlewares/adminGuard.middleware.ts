import { Next, Context } from 'hono';
import { eq } from 'drizzle-orm';

import { type Env, type Variables } from '../index';
import { users } from '../db/schema/user';

type AppContext = Context<{ Bindings: Env, Variables: Variables }>;

/**
 * 管理者権限ガード: users.role === 'admin' のみ通過させる
 *
 * 前提: 直前で authGuard が実行され、c.get('appUserId') が確定していること。
 * 未認可時は 403 ではなく 404 を返す（admin API の存在自体を露出させないため）。
 * 詳細は ADR 010 §4 を参照。
 */
export const adminGuard = async (c: AppContext, next: Next) => {
  const appUserId = c.get('appUserId');
  const db = c.get('db');

  const user = await db.query.users.findFirst({
    where: eq(users.id, appUserId),
    columns: { role: true },
  });

  if (user?.role !== 'admin') {
    // クライアントには 404 を返しつつ、サーバーログでは「権限不足」を区別可能にする。
    // 運用上「自分が見れないのは権限不足？それとも本当に存在しない URL？」を切り分けるため。
    // TODO: プロジェクト全体で構造化ロガーを導入した際は、このログもそちらに寄せる。
    console.warn('adminGuard: access denied', {
      appUserId,
      role: user?.role ?? null,
      method: c.req.method,
      path: c.req.path,
    });
    return c.json({ error: 'Not Found' }, 404);
  }

  await next();
};
