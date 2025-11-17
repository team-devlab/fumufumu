import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1';
import { getDb } from './db';
import { createBetterAuth } from './auth';
import { consultationsRoute } from '@/routes/consultations.controller';

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    const db = drizzle(env.DB);

    // 負荷の低いテストクエリを実行 (SELECT 1 はDB接続を確認する最も一般的な方法)
    // このクエリが成功すれば、D1との接続は正常と判断
    const _ = await db.$client.prepare('SELECT 1').all();

    return c.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    }, 200);

  } catch (error) {
    console.error('D1 Health Check Failed:', error);

    return c.json({
      status: 'error',
      database: 'unavailable',
      message: (error as Error).message
    }, 503);
  }
})

app.on(['GET', 'POST'], '/auth/*', async (c) => {
  const db = getDb(c.env.DB);
  const auth = createBetterAuth(db, c.env);

  // Better Auth のハンドラにリクエスト処理を委譲
  // c.req.raw は Hono の Request オブジェクトから、標準の Request オブジェクトを取得
  return auth.handler(c.req.raw);
});

app.get('/api/protected', async (c) => {
  const db = getDb(c.env.DB);
  const auth = createBetterAuth(db, c.env);

  // Better Auth の API メソッドを使ってセッションを取得
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return c.json({
    message: 'Welcome to the protected area!',
    user: session.user
  });
});

// 相談APIルートをマウント
app.route('/api/consultations', consultationsRoute);

export default app
