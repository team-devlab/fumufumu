// src/index.ts

import { Hono } from 'hono'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
// HonoのContext型をインポート
import { type Context } from 'hono';

import { createBetterAuth, type AuthInstance } from './auth';
import type { D1Database } from '@cloudflare/workers-types';

// スキーマのテーブル定義をインポート
import { users } from './db/schema/user';
import * as authSchema from "./db/schema/auth";
import * as userSchema from "./db/schema/user";

// 全てのスキーマテーブルを一つのオブジェクトにまとめる
const schema = {
  ...authSchema,
  ...userSchema,
}

export type DbInstance = DrizzleD1Database<typeof schema>;

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// Hono Context (Variables) の拡張
interface Variables {
  auth: AuthInstance;
  appUserId: number;
  db: DbInstance;
}

const app = new Hono<{ Bindings: Env, Variables: Variables }>()

// --- DI ミドルウェア ---
app.use('*', async (c, next) => {
  console.log(`[DEBUG] 1. Middleware Start: Path=${c.req.path}`);

  const env = c.env;
  const db = drizzle(env.DB, { schema }); // ここで schema を使用

  c.set('db', db as DbInstance);

  // ★ 修正: createBetterAuth に db インスタンスと env のみを渡す ★
  const auth = createBetterAuth(db, env); // [!code focus]
  c.set('auth', auth);

  console.log(`[DEBUG] 2. Auth Instance Set: Exists=${!!c.get('auth')}`);
  await next();
});


// --- ルート: / ---
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// --- ルート: /health ---
// NOTE: DIミドルウェアは /health にも適用されます
app.get('/health', async (c) => {
  const env = c.env;

  try {
    // D1データベースへの接続オブジェクトを作成
    // NOTE: このルートはミドルウェアをスキップするため、drizzleを直接呼び出す
    const db = drizzle(env.DB);

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

// ★ 修正: /auth/* ルートを削除 ★
// (ここでは Better Auth の HTML フォームは不要なため)


// ------------------------------------------
// API ルーティング
// ------------------------------------------

// API グループを作成
const api = new Hono<{ Bindings: Env, Variables: Variables }>()

/**
 * 認証情報なしで利用可能なルート (SignUp, SignIn)
 * ----------------------------------------------------
 */

// ★ 新規: サインアップ API (POST /api/signup) ★
api.post('/signup', async (c: Context<{ Bindings: Env, Variables: Variables }>) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // ★ 修正: result 変数を try ブロック外で宣言する ★ // [!code focus]
  let result: any;

  try {
    // Better Auth の API を直接呼び出す
    result = await auth.api.signUpEmail({ // ★ const を削除し、代入に変更 ★ // [!code focus]
      body: {
        email,
        password,
        name,
      },
      asResponse: false,
    });

  } catch (e) {
    console.error('Sign-up failed:', e);
    return c.json({ error: 'Sign-up failed', details: (e as Error).message }, 400);
  }

  // セッション ID を取得 (session.id か token のどちらか、または両方から取得を試みる)
  const sessionId = result.session?.id || result.token; // [!code focus]

  // セッション ID が取得できない場合はエラーを投げる
  if (!sessionId) {
    throw new Error("Sign-up succeeded, but session token or ID was not returned.");
  }

  return c.json({
    message: 'User created and signed in successfully.',
    app_session_id: sessionId,
    auth_user_id: result.user.id,
  });
});


// src/index.ts の /api/signin ハンドラ (修正後)

api.post('/signin', async (c: Context<{ Bindings: Env, Variables: Variables }>) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  let result: any; // ★ result 変数を try ブロック外で宣言 ★ // [!code focus]

  try {
    // Better Auth の API を直接呼び出す
    result = await auth.api.signInEmail({ // ★ const を削除し、代入に変更 ★ // [!code focus]
      body: {
        email,
        password,
      },
      asResponse: false, // リダイレクトなし
    });
  } catch (e) {
    console.error('Sign-in failed:', e);
    return c.json({ error: 'Sign-in failed', details: (e as Error).message }, 401);
  }

  const sessionId = result.session?.id || result.token; // [!code focus]

  if (!sessionId) {
    throw new Error("Sign-in succeeded, but session token or ID was not returned.");
  }

  // 成功したセッション情報を返す
  return c.json({
    message: 'Sign in successful.',
    app_session_id: sessionId,
    auth_user_id: result.user.id,
  });
});


/**
 * 認証必須のルート (Protected)
 * ----------------------------------------------------
 */

// 保護ミドルウェアの定義: 認証とID注入
api.use('/protected', async (c, next) => {
  const auth = c.get('auth');

  // セッションの検証: クライアントから送信されたクッキー/ヘッダーを使用
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // セッションが存在しない、または業務IDがない場合は認証失敗
  if (!session || !(session as any).appUserId) {
    return c.json({ error: 'Unauthorized. Session invalid or missing.' }, 401);
  }

  // appUserId (業務ID) をコンテキストに格納
  c.set('appUserId', (session as any).appUserId);

  await next();
});


// /api/protected の修正: 業務DBアクセスを追加
api.get('/protected', async (c) => {
  // コンテキストから業務 ID と DB インスタンスを取得
  const appUserId = c.get('appUserId');
  const db = c.get('db');

  // appUserId を使って業務DBにアクセス
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


// Honoアプリに API グループを登録
app.route('/api', api);

export default app