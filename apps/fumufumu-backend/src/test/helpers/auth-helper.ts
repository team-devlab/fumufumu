import { env } from 'cloudflare:test';
import app from '@/index';
import type { UserRole } from '@/db/schema/user';

/**
 * テスト用のユーザーを作成し、セッションCookieを返す
 *
 * role を 'admin' で渡した場合は、サインアップ後に users.role を直接 UPDATE する。
 * ADR 010 の本番運用方針（DB 直 UPDATE のみで admin 付与）をテストでも再現する。
 */
export async function createAndLoginUser(options?: { name?: string; email?: string; role?: UserRole }) {
  const name = options?.name ?? 'Test User';
  const email = options?.email ?? `test-${crypto.randomUUID()}@example.com`;
  const password = 'password123456';
  const role: UserRole = options?.role ?? 'user';

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

  if (role !== 'user') {
    await env.DB
      .prepare('UPDATE users SET role = ? WHERE id = ?')
      .bind(role, signupBody.app_user_id)
      .run();
  }

  return {
    cookie: sessionCookie,
    appUserId: signupBody.app_user_id,
    authUserId: signupBody.auth_user_id,
    email,
    name,
    role,
  };
}
