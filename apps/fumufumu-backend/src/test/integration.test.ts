// src/test/integration.test.ts
import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import path from 'path';
import fs from 'fs';

// DBの型定義エラーを回避するためのインターフェース再定義
// worker-configuration.d.ts の内容に合わせています
interface CloudflareBindings {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

// applyD1Migrations用の型定義
interface D1Migration {
  name: string;
  queries: string[];
}

// ヘルパー: Viteの機能を使ってビルド時にファイルを読み込む
function getMigrations(): D1Migration[] {
  // 1. _journal.json を読み込む
  // eager: true にすることで、非同期ではなく即座に中身を取得します
  const journalGlobs = import.meta.glob('../../drizzle/meta/_journal.json', { eager: true });
  
  // globの結果からジャーナルデータを取得 (キーは相対パス)
  const journalPath = Object.keys(journalGlobs)[0];
  const journal = journalGlobs[journalPath] as { entries: { tag: string }[] };

  if (!journal) {
    throw new Error('Migration journal not found via import.meta.glob');
  }

  // 2. すべての .sql ファイルを文字列(?raw)として読み込む
  const sqlGlobs = import.meta.glob('../../drizzle/*.sql', { 
    eager: true, 
    query: '?raw', 
    import: 'default' 
  });

  // 3. ジャーナルの順番通りにSQLを取得して整形する
  return journal.entries.map((entry) => {
    // import.meta.globのキーは、このファイルからの相対パスになります
    const sqlKey = `../../drizzle/${entry.tag}.sql`;
    const sqlContent = sqlGlobs[sqlKey] as string;

    if (!sqlContent) {
      throw new Error(`Migration file not found for: ${entry.tag} (looked at ${sqlKey})`);
    }

    // Drizzleの区切り文字で分割
    const queries = sqlContent
      .split('--> statement-breakpoint')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    return {
      name: entry.tag,
      queries: queries,
    };
  });
}

describe('Integration Tests', () => {
  // 1. テスト実行前のDBセットアップ
  beforeAll(async () => {
    // fsを使わず、Vite経由で読み込んだマイグレーションデータを使用
    const migrations = getMigrations();

    try {
      await applyD1Migrations((env as unknown as CloudflareBindings).DB, migrations);
    } catch (e) {
      console.error('Migration failed:', e);
      throw e;
    }
  });

  // 2. Health Check APIテスト
  describe('GET /health', () => {
    it('should return 200 OK and confirm DB connection', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.fetch(req, env);
      
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe('ok');
      expect(body.database).toBe('connected');
    });
  });

  // 3. 認証と保護ルートのシナリオテスト
  describe('Auth & Protected Routes Flow', () => {
    const testUser = {
      name: 'Integration Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'password123456',
    };

    // 認証なしでのアクセス確認（これはDB状態に依存しないので独立していてOK）
    it('should deny access to protected route without cookie', async () => {
      const req = new Request('http://localhost/api/protected');
      const res = await app.fetch(req, env);
      expect(res.status).toBe(401);
    });

    // ★重要: データの依存関係があるテストを一連の流れ（シナリオ）としてまとめる
    it('should handle full auth flow: Signup -> Access -> Signin', async () => {
			let sessionCookie: string | null = null;

			// --- Step 1: Sign Up ---
			console.log('Step 1: Signing up...');
			const signupReq = new Request('http://localhost/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(testUser),
			});
			const signupRes = await app.fetch(signupReq, env);
			expect(signupRes.status).toBe(200);

			const signupBody = await signupRes.json() as any;
			expect(signupBody).toHaveProperty('auth_user_id');
      
			// Cookieを取得
			sessionCookie = signupRes.headers.get('set-cookie');
			expect(sessionCookie).toBeTruthy();


			// --- Step 2: Access Protected Route (With Cookie) ---
			// ※同じテストケース内なのでDBの状態（ユーザー・セッション）は維持されています
			console.log('Step 2: Accessing protected route...');
			const protectedReq = new Request('http://localhost/api/protected', {
				headers: {
						// Set-Cookieヘッダーの値をそのままCookieリクエストヘッダーにセット
						'Cookie': sessionCookie!
				}
			});
			const protectedRes = await app.fetch(protectedReq, env);
			
			if (protectedRes.status !== 200) {
				const err = await protectedRes.json();
				console.error('Protected route error details:', err);
			}
			expect(protectedRes.status).toBe(200);
			const protectedBody = await protectedRes.json() as any;
			expect(protectedBody.message).toContain('Welcome');
			expect(protectedBody.userName).toBe(testUser.name);


			// --- Step 3: Sign In (Explicitly) ---
			// ※同じDBを使っているのでユーザーが存在し、ログインできるはず
			console.log('Step 3: Signing in explicitly...');
			const signinReq = new Request('http://localhost/api/auth/signin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
						email: testUser.email,
						password: testUser.password
				}),
			});
			const signinRes = await app.fetch(signinReq, env);
			expect(signinRes.status).toBe(200);
			
			const newCookie = signinRes.headers.get('set-cookie');
			expect(newCookie).toBeTruthy();
    });
  });
});
