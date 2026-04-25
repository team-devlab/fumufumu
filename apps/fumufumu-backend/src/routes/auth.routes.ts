import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { authUsers } from '../db/schema/auth';
import { authMappings } from '../db/schema/user';

import { type Env, type Variables } from '../index';

// 認証ルーターのHonoインスタンスを定義
export const authRouter = new Hono<{ Bindings: Env, Variables: Variables }>();

type AuthRequestBody = {
  email?: string;
  password?: string;
  name?: string;
};

type AuthApiResponse = Record<string, unknown> & {
  user?: {
    id?: unknown;
  };
};

type HeadersWithCookieAccessors = Headers & {
  getSetCookie?: () => string[];
  getAll?: (name: string) => string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getAuthUserId = (result: unknown): string | null => {
  if (!isRecord(result)) return null;

  const user = (result as AuthApiResponse).user;
  if (!isRecord(user)) return null;

  const userId = user.id;
  return typeof userId === 'string' && userId.length > 0 ? userId : null;
};

const toJsonErrorPayload = (payload: unknown, fallbackMessage: string): Record<string, unknown> =>
  isRecord(payload) ? payload : { error: fallbackMessage };

const toContentfulStatusCode = (status: number): ContentfulStatusCode => {
  if (status < 200 || status > 599) {
    return 500;
  }
  if (status === 204 || status === 205 || status === 304) {
    return 500;
  }
  return status as ContentfulStatusCode;
};

async function parseAuthResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.clone().json() as unknown;
  }

  const text = await response.clone().text();
  return text ? { message: text } : {};
}

function copySetCookieHeader(source: Response, target: Response) {
  // Better Auth は cookieCache 有効時などに複数の Set-Cookie を返すため、
  // getSetCookie() で配列として取得して個別に append する。
  // （.get() + .set() だと複数 Cookie が1つにマージされてブラウザでパース不能になる）
  const headers = source.headers as HeadersWithCookieAccessors;
  const setCookies = headers.getSetCookie?.()
    ?? headers.getAll?.('Set-Cookie')
    ?? headers.getAll?.('set-cookie');

  if (setCookies && setCookies.length > 0) {
    for (const cookie of setCookies) {
      target.headers.append('Set-Cookie', cookie);
    }
    return;
  }

  const setCookieHeader = source.headers.get('Set-Cookie');
  if (setCookieHeader) {
    target.headers.append('Set-Cookie', setCookieHeader);
  }
}

/**
 * サインアップ API (POST /api/auth/signup)
 *
 * Better Auth の signUpEmail を呼ぶ薄いラッパ。
 * 業務層 (users / authMappings) の作成は auth.ts の
 * databaseHooks.user.create.after で実施される。
 */
authRouter.post('/signup', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<AuthRequestBody>();
  const { email, password, name } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  let authResponse: Response;
  let authResult: unknown;

  try {
    authResponse = await auth.api.signUpEmail({
      body: { email, password, name: name ?? '' },
      asResponse: true,
    });
    authResult = await parseAuthResponse(authResponse);
  } catch (e) {
    console.error('Sign-up failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-up failed', details: (e as Error).message }, 400);
  }

  if (!authResponse.ok) {
    const errorResponse = c.json(
      toJsonErrorPayload(authResult, 'Sign-up failed'),
      toContentfulStatusCode(authResponse.status),
    );
    copySetCookieHeader(authResponse, errorResponse);
    return errorResponse;
  }

  const authUserId = getAuthUserId(authResult);

  if (!authUserId) {
    console.error('Sign-up succeeded, but user ID was not returned by Better Auth response.');
    return c.json({ error: 'Internal server error: Auth User ID missing.' }, 500);
  }

  // 業務層マッピングは auth.ts の databaseHooks.user.create.after で作られている想定。
  // レスポンスに appUserId を載せるために引き直す。
  const db = c.get('db');
  const mapping = await db.query.authMappings.findFirst({
    where: eq(authMappings.authUserId, authUserId),
  });

  if (!mapping) {
    console.error('Sign-up succeeded, but auth mapping was not created for auth user:', authUserId);
    return c.json({ error: 'Failed to complete user setup on business DB.' }, 500);
  }

  const honoResponse = c.json({
    message: 'User created and signed in successfully.',
    auth_user_id: authUserId,
    app_user_id: mapping.appUserId,
  }, 200);

  copySetCookieHeader(authResponse, honoResponse);
  return honoResponse;
});

/**
 * サインイン API (POST /api/auth/signin)
 *
 * Better Auth の signInEmail を呼ぶ薄いラッパ。
 */
authRouter.post('/signin', async (c) => {
  const auth = c.get('auth');
  const db = c.get('db');
  const body = await c.req.json<AuthRequestBody>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Better Auth のエラー経路での Unhandled Rejection を避けるため、未登録メールは
  // 事前に 401 で返す（メッセージは情報漏洩を避けるため汎用化）。
  const existingUser = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (existingUser.length === 0) {
    return c.json({ message: 'Invalid email or password' }, 401);
  }

  let authResponse: Response;
  let authResult: unknown;

  try {
    authResponse = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    });
    authResult = await parseAuthResponse(authResponse);
  } catch (e) {
    console.error('Sign-in failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-in failed', details: (e as Error).message }, 401);
  }

  if (!authResponse.ok) {
    const errorResponse = c.json(
      toJsonErrorPayload(authResult, 'Sign-in failed'),
      toContentfulStatusCode(authResponse.status),
    );
    copySetCookieHeader(authResponse, errorResponse);
    return errorResponse;
  }

  const authUserId = getAuthUserId(authResult);

  if (!authUserId) {
    console.error('Sign-in succeeded, but user ID was not returned by Better Auth response.');
    return c.json({ error: 'Internal server error: Auth User ID missing.' }, 500);
  }

  const honoResponse = c.json({
    message: 'Sign in successful.',
    auth_user_id: authUserId,
  }, 200);

  copySetCookieHeader(authResponse, honoResponse);
  return honoResponse;
});

/**
 * サインアウト API (POST /api/auth/signout)
 */
authRouter.post('/signout', async (c) => {
  const auth = c.get('auth');

  let authResponse: Response;

  try {
    authResponse = await auth.api.signOut({
      headers: c.req.raw.headers,
      asResponse: true,
    });
  } catch (e) {
    console.error('Sign-out failed:', e);
    if (e instanceof Response) {
      return e;
    }
    return c.json({ error: 'Sign-out failed', details: (e as Error).message }, 400);
  }

  const honoResponse = c.json({ message: 'Sign out successful.' }, 200);
  copySetCookieHeader(authResponse, honoResponse);
  return honoResponse;
});

/**
 * Better Auth 組み込みエンドポイントへの委譲 (catch-all)
 *
 * 上記のカスタムエンドポイント以外の `/api/auth/*` (例: `/sign-in/social`,
 * `/callback/:provider`, `/get-session` 等) は Better Auth に直接処理させる。
 */
authRouter.all('/*', (c) => c.get('auth').handler(c.req.raw));
