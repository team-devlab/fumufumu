import { env } from 'cloudflare:test';
import app from '@/index';

/**
 * テスト用のユーザーを作成し、セッションCookieを返す
 */
export async function createAndLoginUser(options?: { name?: string; email?: string }) {
  const name = options?.name ?? 'Test User';
  const email = options?.email ?? `test-${crypto.randomUUID()}@example.com`;
  const password = 'password123456';

  const signupReq = new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const res = await app.fetch(signupReq, env);
  
  if (res.status !== 200) {
    throw new Error(`Signup failed for helper with status: ${res.status}`);
  }

  const signupBody = await res.json() as any;
  const setCookie = res.headers.get('set-cookie');
  
  if (!setCookie) {
    throw new Error('Set-Cookie header missing in signup response');
  }

  // 属性を取り除き "key=value" の形だけ抽出
  const sessionCookie = setCookie.split(';')[0];

  return {
    cookie: sessionCookie,
    appUserId: signupBody.app_user_id,
    authUserId: signupBody.auth_user_id,
    email,
    name
  };
}
