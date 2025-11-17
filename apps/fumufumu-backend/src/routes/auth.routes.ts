import { Hono } from 'hono';
import { users, authMappings } from '../db/schema/user';

import { type Env, type Variables } from '../index';

// 認証ルーターのHonoインスタンスを定義
export const authRouter = new Hono<{ Bindings: Env, Variables: Variables }>();

/**
 * サインアップ API (POST /api/signup)
 */
authRouter.post('/signup', async (c) => {
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
  const honoResponse = c.json(responseBody, 200);
  
  const setCookieHeader = authResponse.headers.get('Set-Cookie');
  if (setCookieHeader) {
    honoResponse.headers.set('Set-Cookie', setCookieHeader);
  } else {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signup.");
  }

  return honoResponse;
});


/**
 * サインイン API (POST /api/signin)
 */
authRouter.post('/signin', async (c) => {
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

  const honoResponse = c.json({
    message: 'Sign in successful.',
    auth_user_id: authUserId,
  }, 200);

  // Better AuthのレスポンスからSet-Cookieヘッダーを取得（クッキーをクライアントに設定させる）
  const setCookieHeader = authResponse.headers.get('Set-Cookie');

  // Set-CookieヘッダーをBetter Authのレスポンスからコピー
  if (setCookieHeader) {
    honoResponse.headers.set('Set-Cookie', setCookieHeader);
  } else {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signin.");
  }

  return honoResponse;
});