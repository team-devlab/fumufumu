import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';
import { setupIntegrationTest } from './helpers/db-helper';
import { createApiRequest } from './helpers/request-helper';

describe('Backend API - Basic & Logic', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  it('should handle root request', async () => {
    const req = createApiRequest('/');
    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toBe('Hello Hono!');
  });

  describe('CORS & Environment Variables Logic', () => {

    it('CORS: 環境変数の末尾スラッシュが除去されて正常に許可されるか', async () => {
      const mockEnv = {
        ...env,
        FRONTEND_URL: 'http://localhost:3000/',
      };

      const req = createApiRequest('/api/health');
      req.headers.set('Origin', 'http://localhost:3000');

      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('CORS: カンマ区切りの複数URLが正しく認識されるか', async () => {
      const mockEnv = {
        ...env,
        FRONTEND_URL: 'http://localhost:3000, https://another-app.com',
      };

      const req = createApiRequest('/api/health');
      req.headers.set('Origin', 'https://another-app.com');

      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://another-app.com');
    });

    it('CORS: VERCEL_TEAM_SLUG に基づく動的許可が正しく動作するか', async () => {
      const mockEnv = {
        ...env,
        VERCEL_TEAM_SLUG: 'my-team-slug',
      };

      const previewOrigin = 'https://fumufumu-abc-123-my-team-slug.vercel.app';
      const req = createApiRequest('/api/health');
      req.headers.set('Origin', previewOrigin);

      const res = await app.fetch(req, mockEnv);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(previewOrigin);
    });

    it('CORS: 許可されていないドメインはフォールバック（最初のURL）が返るか', async () => {
      const mockEnv = {
        ...env,
        FRONTEND_URL: 'http://localhost:3000',
      };

      const req = createApiRequest('/api/health');
      req.headers.set('Origin', 'https://evil-attacker.com');

      const res = await app.fetch(req, mockEnv);

      // 許可されない場合、最初のURLが返る
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });
  });

  it('Auth: COOKIE_DOMAIN が設定されている場合、Set-Cookieヘッダーに反映されるか', async () => {
    const mockEnv = {
      ...env,
      // 32文字以上のダミーシークレットを使用
      BETTER_AUTH_SECRET: 'a_very_long_secret_for_testing_purposes_32_chars',
      BETTER_AUTH_URL: 'http://localhost:8787',
      COOKIE_DOMAIN: 'example.com',
    };

    const req = createApiRequest('/api/auth/signup', 'POST', {
      body: { email: 'test_domain@example.com', password: 'password123', name: 'test' }
    });
    const res = await app.fetch(req, mockEnv);

    // まずステータスコードが正常であることを確認（デバッグしやすくするため）
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('Domain=example.com');
  });

  it('Auth: HTTPS環境（isSecure=true）の時に Cookie が Secure; SameSite=None になるか', async () => {
    const mockEnv = {
      ...env,
      BETTER_AUTH_SECRET: 'a_very_long_secret_for_testing_purposes_32_chars',
      BETTER_AUTH_URL: 'https://api.example.com', // HTTPS
      FRONTEND_URL: 'https://app.example.com',    // HTTPS
    };

    const req = createApiRequest('/api/auth/signup', 'POST', {
      body: { email: 'test_secure@example.com', password: 'password123', name: 'test2' }
    });
    const res = await app.fetch(req, mockEnv);

    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain('Secure');
    expect(setCookie).toContain('SameSite=None');
  });

  it('CORS: 環境変数が完全に未設定の場合、ワイルドカード(*)を返してCORSエラーを誘発するか', async () => {
    const mockEnv = { ...env };
    delete (mockEnv as any).FRONTEND_URL; // 明示的に削除

    const req = createApiRequest('/api/health');
    req.headers.set('Origin', 'https://any-domain.com');

    const res = await app.fetch(req, mockEnv);

    // allowedOrigins[0] がないので '*' が返る
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
