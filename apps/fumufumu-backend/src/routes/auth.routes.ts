import { Hono } from 'hono';
import { users, authMappings } from '../db/schema/user';
import { authUsers } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

import { type Env, type Variables } from '../index';

// 認証ルーターのHonoインスタンスを定義
export const authRouter = new Hono<{ Bindings: Env, Variables: Variables }>();

async function parseAuthResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.clone().json();
  }

  const text = await response.clone().text();
  return text ? { message: text } : {};
}

function copySetCookieHeader(source: Response, target: Response) {
  const setCookieHeader = source.headers.get('Set-Cookie');

  if (setCookieHeader) {
    target.headers.set('Set-Cookie', setCookieHeader);
  }
}

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
    authResult = await parseAuthResponse(betterAuthResponse);

  } catch (e) {
    console.error('Sign-up failed:', e);
    // Better Authからのエラーレスポンスをそのまま返す
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-up failed', details: (e as Error).message }, 400);
  }

  if (!authResponse.ok) {
    const errorResponse = c.json(authResult ?? { error: 'Sign-up failed' }, authResponse.status as any);
    copySetCookieHeader(authResponse, errorResponse);
    return errorResponse;
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

  copySetCookieHeader(authResponse, honoResponse);
  if (!authResponse.headers.get('Set-Cookie')) {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signup.");
  }

  return honoResponse;
});


/**
 * サインイン API (POST /api/signin)
 */
authRouter.post('/signin', async (c) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Better Authのエラー経路でUnhandled Rejectionが発生するケースを避けるため、
  // 未登録メールは事前に401で返す（メッセージは汎用化して情報漏洩を避ける）。
  const existingUser = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (existingUser.length === 0) {
    return c.json({ message: 'Invalid email or password' }, 401);
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
    authResult = await parseAuthResponse(betterAuthResponse);

  } catch (e) {
    console.error('Sign-in failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-in failed', details: (e as Error).message }, 401);
  }

  if (!authResponse.ok) {
    const errorResponse = c.json(authResult ?? { error: 'Sign-in failed' }, authResponse.status as any);
    copySetCookieHeader(authResponse, errorResponse);
    return errorResponse;
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

  copySetCookieHeader(authResponse, honoResponse);
  if (!authResponse.headers.get('Set-Cookie')) {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signin.");
  }

  return honoResponse;
});

/**
 * サインアウト API (POST /api/signout)
 */
authRouter.post('/signout', async (c) => {
  const auth = c.get('auth');

  let authResponse: Response;

  try {
    authResponse = await auth.api.signOut({
      headers: c.req.raw.headers,
      // クッキーを含むResponseを取得
      asResponse: true,
    });
  } catch (e) {
    console.error('Sign-out failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-out failed', details: (e as Error).message }, 400);
  }

  const honoResponse = c.json({
    message: 'Sign out successful.',
  }, 200);

  // Better AuthのレスポンスからSet-Cookieヘッダーを取得（クッキーをクライアント側で削除させる）
  const setCookieHeader = authResponse.headers.get('Set-Cookie');

  // Set-CookieヘッダーをBetter Authのレスポンスからコピー
  if (setCookieHeader) {
    honoResponse.headers.set('Set-Cookie', setCookieHeader);
  } else {
    console.warn("WARNING: Set-Cookie header missing from Better Auth response during signout.");
  }

  return honoResponse;
});
