import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1';
import { createBetterAuth, type AuthInstance } from './auth';
import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// Hono Context (Variables) の拡張:
interface Variables {
  auth: AuthInstance;
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>()

// DI ミドルウェアの作成:
app.use('*', async (c, next) => {
  if (c.req.path === '/' || c.req.path === '/health') {
    return next();
  }

  const env = c.env;

  const auth = createBetterAuth(env.DB, env);
  c.set('auth', auth);

  await next();
});


app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    // NOTE: このルートはミドルウェアをスキップするため、drizzleを直接呼び出す
    const db = drizzle(env.DB);

    // 負荷の低いテストクエリを実行 
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

// コンテキストからインスタンスを取得するように変更
app.on(['GET', 'POST'], '/auth/*', async (c) => {
  // ミドルウェアで設定された auth インスタンスを取得
  const auth = c.get('auth');

  // Better Auth のハンドラにリクエスト処理を委譲
  return auth.handler(c.req.raw);
});

// 3. 既存ルートの修正: コンテキストからインスタンスを取得するように変更
app.get('/api/protected', async (c) => {
  // ミドルウェアで設定された auth インスタンスを取得
  const auth = c.get('auth');

  // Better Auth の API メソッドを使ってセッションを取得
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // NOTE: セッションには既に appUserId が含まれている
  return c.json({
    message: 'Welcome to the protected area!',
    user: session.user,
    appUserId: (session as any).appUserId,
  });
});

export default app
