import { Hono } from 'hono'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';

import { createBetterAuth, type AuthInstance } from './auth';
import type { D1Database } from '@cloudflare/workers-types';

import * as authSchema from "./db/schema/auth";
import * as userSchema from "./db/schema/user";
import * as consultationsSchema from "./db/schema/consultations";

import { authRouter } from './routes/auth.routes';
import { consultationsRoute } from '@/routes/consultations.controller';
import { protectedRouter } from './routes/protected.routes';

// Drizzle ORMのスキーマを統合
const schema = {
  ...authSchema,
  ...userSchema,
  ...consultationsSchema,
}

export type DbInstance = DrizzleD1Database<typeof schema>;

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// Hono Context (Variables) の拡張
export interface Variables {
  auth: AuthInstance;
  appUserId: number;
  db: DbInstance;
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>()

// --- 依存性注入 (DI) ミドルウェア ---
app.use('*', async (c, next) => {
  const env = c.env;
  // Drizzleインスタンスを作成し、DB接続とスキーマをHono Contextに設定
  const db = drizzle(env.DB, { schema });
  c.set('db', db as DbInstance);

  // Better AuthインスタンスをHono Contextに設定
  const auth = createBetterAuth(db, env);
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
    const db = drizzle(env.DB);

    // 接続テスト
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
  const auth = c.get('auth');

  // Better Auth のハンドラにリクエスト処理を委譲
  // c.req.raw は Hono の Request オブジェクトから、標準の Request オブジェクトを取得
  return auth.handler(c.req.raw);
});

app.get('/api/protected', async (c) => {
  const auth = c.get('auth');

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
