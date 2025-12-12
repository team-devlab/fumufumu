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
    // テスト間でCookieを共有するための変数
    let sessionCookie: string | null = null;
    let createdAuthUserId: string | null = null;
    
    const testUser = {
      name: 'Integration Test User',
      email: `test-${Date.now()}@example.com`, // ユニークにする
      password: 'password123456',
    };

    // ステップ1: サインアップ
    it('should sign up a new user and return session cookie', async () => {
      const req = new Request('http://localhost/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser),
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body).toHaveProperty('auth_user_id');
      expect(body).toHaveProperty('app_user_id');
      
      createdAuthUserId = body.auth_user_id;

      // Better AuthからのSet-Cookieヘッダーを取得
      sessionCookie = res.headers.get('set-cookie');
      expect(sessionCookie).toBeTruthy();
    });

    // ステップ2: 認証なしで保護ルートへアクセス (失敗することを確認)
    it('should deny access to protected route without cookie', async () => {
      const req = new Request('http://localhost/api/protected');
      const res = await app.fetch(req, env);
      
      // authGuardミドルウェアにより401が返るはず
      expect(res.status).toBe(401);
    });

    // ステップ3: 認証あり(Cookie付与)で保護ルートへアクセス
    it('should access protected route with valid cookie', async () => {
      if (!sessionCookie) throw new Error('Session cookie not found from signup step');

      const req = new Request('http://localhost/api/protected', {
        headers: {
          // 取得したCookieをリクエストヘッダーにセット
          'Cookie': sessionCookie
        }
      });

      const res = await app.fetch(req, env);
      
      if (res.status !== 200) {
        const err = await res.json();
        console.error('Protected route error:', err);
      }

      expect(res.status).toBe(200);
      
      const body = await res.json() as any;
      expect(body.message).toContain('Welcome');
      expect(body.userName).toBe(testUser.name);
    });

    // ステップ4: サインイン (サインアップとは別のセッション取得テスト)
    it('should sign in explicitly', async () => {
      const req = new Request('http://localhost/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        }),
      });

      const res = await app.fetch(req, env);
      expect(res.status).toBe(200);
      
      const newCookie = res.headers.get('set-cookie');
      expect(newCookie).toBeTruthy();
    });
  });
});
