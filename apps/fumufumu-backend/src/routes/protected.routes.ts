import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema/user';

import { type Env, type Variables } from '../index';
import { authGuard } from '../middlewares/authGuard.middleware';

// 保護ルーターのHonoインスタンスを定義
export const protectedRouter = new Hono<{ Bindings: Env, Variables: Variables }>();

// インポートしたミドルウェアをルーター全体に適用
protectedRouter.use('/', authGuard);

/**
 * 保護された API (GET /api/protected)
 * - appUserIdを使って業務DBにアクセス
 */
protectedRouter.get('/', async (c) => {
  const appUserId = c.get('appUserId');
  const db = c.get('db');

  const userSettings = await db.query.users.findFirst({
    where: eq(users.id, appUserId),
    columns: {
      name: true,
    },
  });

  return c.json({
    message: 'Welcome to the protected area! ID Separation successful.',
    appUserId: appUserId,
    userName: userSettings?.name ?? 'Unknown User',
  });
});