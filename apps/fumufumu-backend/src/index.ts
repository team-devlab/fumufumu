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
api.post('/signup', async (c) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const body = await c.req.json();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Better Authでサインアップを実行
  let authResponse: Response;
  let authResult: any;

  try {
    const betterAuthResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
      // クッキーを含むResponseを取得
      asResponse: true,
    });

    authResponse = betterAuthResponse;
    authResult = await betterAuthResponse.json();

  } catch (e) {
    console.error('Sign-up failed:', e);
    // Better Authからのエラーレスポンスをそのまま返す
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-up failed', details: (e as Error).message }, 400);
  }

  const authUserId = authResult.user?.id;
  
  if (!authUserId) {
    console.error("Sign-up succeeded, but user ID was not returned by Better Auth response.");
    return c.json({ error: 'Internal server error: Auth User ID missing.' }, 500);
  }

  let appUserId: number;

  // 業務DB (users, authMappings) の更新とIDマッピング
  try {
    const userInsertResult = await db.insert(users).values({
      name: name,
    }).returning({ id: users.id });

    if (!userInsertResult || userInsertResult.length === 0) {
      throw new Error("Failed to insert user into 'users' table.");
    }

    appUserId = userInsertResult[0].id;

    await db.insert(authMappings).values({
      appUserId: appUserId,
      authUserId: authUserId,
    });

  } catch (e) {
    console.error('DB transaction failed:', e);
    return c.json({ error: 'Failed to complete user setup on business DB.', details: (e as Error).message }, 500);
  }

  // 業務ユーザーIDをResponse Bodyに追加し、クッキーヘッダーをコピー
  const responseBody = {
    message: 'User created and signed in successfully.',
    auth_user_id: authUserId,
    app_user_id: appUserId,
  };

  const setCookieHeader = authResponse.headers.get('Set-Cookie');
  const honoResponse = c.json(responseBody, 200);

  if (setCookieHeader) {
    honoResponse.headers.set('Set-Cookie', setCookieHeader);
  } else {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signup.");
  }
  
  return honoResponse;
});


// サインイン API (POST /api/signin)
api.post('/signin', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  let authResponse: Response;
  let authResult: any;

  try {
    const betterAuthResponse = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      // クッキーを含むResponseを取得
      asResponse: true,
    });

    authResponse = betterAuthResponse;
    authResult = await betterAuthResponse.json();

  } catch (e) {
    console.error('Sign-in failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-in failed', details: (e as Error).message }, 401);
  }

  const authUserId = authResult.user?.id;

  if (!authUserId) {
    console.error("Sign-in succeeded, but user ID was not returned by Better Auth response.");
    return c.json({ error: 'Internal server error: Auth User ID missing.' }, 500);
  }

  // Better AuthのレスポンスからSet-Cookieヘッダーを取得（クッキーをクライアントに設定させる）
  const setCookieHeader = authResponse.headers.get('Set-Cookie');

  const honoResponse = c.json({
    message: 'Sign in successful.',
    auth_user_id: authUserId,
  }, 200);
  
  // Set-CookieヘッダーをBetter Authのレスポンスからコピー
  if (setCookieHeader) {
    honoResponse.headers.set('Set-Cookie', setCookieHeader);
  } else {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signin.");
  }

  return honoResponse;
});


/**
 * 認証必須のルート
 * ----------------------------------------------------
 */

// 保護ミドルウェアの定義: 認証とID注入
api.use('/protected', async (c, next) => {
  const auth = c.get('auth');
  const db = c.get('db');

  // セッションの検証
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  // セッションが存在しないか、Better Auth側のユーザー情報がない場合は認証失敗
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized. Session invalid or missing.' }, 401);
  }

  // Auth側のユーザーIDを取得
  const authUserId = session.user.id;


  // authUserIdをキーとしてauthMappingsテーブルからappUserIdを取得(ID分離のための処理)
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


api.get('/protected', async (c) => {
  // コンテキストから業務 ID と DB インスタンスを取得
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


// Honoアプリに API グループを登録
app.route('/api', api);

export default app