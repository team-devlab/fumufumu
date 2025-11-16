import { Hono } from 'hono'
import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { type Context } from 'hono';

import { createBetterAuth, type AuthInstance } from './auth';
import type { D1Database } from '@cloudflare/workers-types';

import { users, authMappings } from './db/schema/user';
import * as authSchema from "./db/schema/auth";
import * as userSchema from "./db/schema/user";

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
  // スキーマを渡してDrizzleインスタンスを作成
  const db = drizzle(env.DB, { schema });

  c.set('db', db as DbInstance);

  const auth = createBetterAuth(db, env);
  c.set('auth', auth);

  console.log(`[DEBUG] 2. Auth Instance Set: Exists=${!!c.get('auth')}`);
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


// ------------------------------------------
// API ルーティング
// ------------------------------------------

// API グループを作成
const api = new Hono<{ Bindings: Env, Variables: Variables }>()

/**
 * 認証情報なしで利用可能なルート (SignUp, SignIn)
 * ----------------------------------------------------
 */

// サインアップ API (POST /api/signup)
api.post('/signup', async (c: Context<{ Bindings: Env, Variables: Variables }>) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const body = await c.req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  let result: any;

  try {
    // Better Auth の API を直接呼び出す
    result = await auth.api.signUpEmail({
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

  const authUserId = result.user?.id;
  // セッション ID を取得 (session.id か token のどちらか、または両方から取得を試みる)
  const sessionId = result.session?.id || result.token;

  if (!sessionId || !authUserId) {
    throw new Error("Sign-up succeeded, but session or user ID was not returned.");
  }

  let appUserId: number = 0; // 業務ユーザーIDのスコープを確保

  // 🚨 修正: Miniflare環境でのDrizzle D1トランザクションエラーを回避するため、
  // db.transaction() を使用せず、順次クエリを実行します。
  try {
    // 1. usersテーブルに業務ユーザーを作成
    const userInsertResult = await db.insert(users).values({
      name: name, // Better Authに渡された名前を使用
    }).returning({ id: users.id });

    // 挿入が成功し、IDが返されたことを確認
    if (!userInsertResult || userInsertResult.length === 0) {
      throw new Error("Failed to insert user into 'users' table.");
    }

    // 新しく作成された業務ユーザーIDを取得
    appUserId = userInsertResult[0].id;

    // 2. authMappingsテーブルにマッピングを作成
    await db.insert(authMappings).values({ // usersではなくauthMappingsを使用
      appUserId: appUserId,
      authUserId: authUserId,
    });

    // 3. セッションに業務ユーザーIDを紐づける (Better Authのカスタムペイロード)
    // 🚨 セッション更新APIが型定義に存在しないため、この処理はスキップし、保護ルートでDB検索を行う
    console.warn("WARNING: Skipping session data update due to type error. Using AuthMapping DB search for appUserId.");

  } catch (e) {
    console.error('DB transaction failed:', e);
    // エラー発生時に500を返す
    return c.json({ error: 'Failed to complete user setup on business DB.', details: (e as Error).message }, 500);
  }


  // 💡 appUserIdが0で返される場合はDBトランザクションが失敗しているため、
  // catchブロックでエラーを返しているため、この時点では成功していると見なせる
  return c.json({
    message: 'User created and signed in successfully.',
    app_session_id: sessionId,
    auth_user_id: authUserId,
    app_user_id: appUserId,
  });
});


// サインイン API (POST /api/signin)
api.post('/signin', async (c: Context<{ Bindings: Env, Variables: Variables }>) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  let result: any;

  try {
    // Better Auth の API を直接呼び出す
    result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: false,
    });
  } catch (e) {
    console.error('Sign-in failed:', e);
    return c.json({ error: 'Sign-in failed', details: (e as Error).message }, 401);
  }

  const sessionId = result.session?.id || result.token;
  const authUserId = result.user?.id;

  if (!sessionId || !authUserId) {
    throw new Error("Sign-in succeeded, but session or user ID was not returned.");
  }

  // サインイン時もセッションへのID紐づけはスキップし、ミドルウェアでDB検索を行う

  // 成功したセッション情報を返す
  return c.json({
    message: 'Sign in successful.',
    app_session_id: sessionId,
    auth_user_id: authUserId,
  });
});


/**
 * 認証必須のルート (Protected)
 * ----------------------------------------------------
 */

// 保護ミドルウェアの定義: 認証とID注入 (AuthMapping 検索バージョン)
api.use('/protected', async (c, next) => {
  const auth = c.get('auth');
  const db = c.get('db');

  // セッションの検証: クライアントから送信されたクッキー/ヘッダーを使用
  // sessionオブジェクトにはauthUserIdが含まれる
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // セッションが存在しないか、Better Auth側のユーザー情報がない場合は認証失敗
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized. Session invalid or missing.' }, 401);
  }

  // Auth側のユーザーIDを取得
  const authUserId = session.user.id;

  // 🚨 回避策: authUserIdをキーとしてauthMappingsテーブルからappUserIdを取得
  const mapping = await db.query.authMappings.findFirst({
    where: eq(authMappings.authUserId, authUserId),
  });

  // 業務IDがない場合は認証失敗
  if (!mapping) {
    console.error(`AuthMapping not found for authUserId: ${authUserId}`);
    return c.json({ error: 'Unauthorized. App User ID mapping missing.' }, 401);
  }

  // appUserId (業務ID) をコンテキストに格納
  c.set('appUserId', mapping.appUserId);

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