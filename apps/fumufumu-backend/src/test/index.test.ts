import { describe, it, expect } from 'vitest';
import app from '../index';

describe('Backend API', () => {
  it('should handle root request', async () => {
    const req = new Request('http://localhost/');
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    
    const text = await res.text();
    expect(text).toBe('Hello Hono!');
  });
});

