import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../index';
import { createApiRequest } from './helpers/request-helper';

describe('Backend API - Basic & Logic', () => {
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
});
