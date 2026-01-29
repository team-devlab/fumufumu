import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';

// DBの型定義
interface CloudflareBindings {
    DB: D1Database;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
}

// マイグレーション型定義
interface D1Migration {
    name: string;
    queries: string[];
}

// Vite の import.meta.glob 型定義を追加
declare global {
    interface ImportMeta {
        glob<T = any>(
            pattern: string | string[],
            options?: {
                eager?: boolean;
                import?: string;
                query?: string;
                as?: string;
            }
        ): Record<string, T>;
    }
}

// マイグレーションヘルパー
function getMigrations(): D1Migration[] {
    const journalGlobs = import.meta.glob('../../drizzle/meta/_journal.json', { eager: true });
    const journalPath = Object.keys(journalGlobs)[0];
    const journal = journalGlobs[journalPath] as { entries: { tag: string }[] };

    if (!journal) {
        throw new Error('Migration journal not found');
    }

    const sqlGlobs = import.meta.glob('../../drizzle/*.sql', {
        eager: true,
        query: '?raw',
        import: 'default'
    });

    return journal.entries.map((entry) => {
        const sqlKey = `../../drizzle/${entry.tag}.sql`;
        const sqlContent = sqlGlobs[sqlKey] as string;

        if (!sqlContent) {
            throw new Error(`Migration file not found for: ${entry.tag}`);
        }

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

describe('Consultations API Integration Tests', () => {
    let sessionCookie: string | null = null;
    let attackerCookie: string | null = null;

    // テスト実行前のセットアップ
    beforeAll(async () => {
        // マイグレーション実行
        const migrations = getMigrations();
        await applyD1Migrations((env as unknown as CloudflareBindings).DB, migrations);

        // テストユーザーを作成してログイン
        const testUser = {
            name: 'Test User for Consultations',
            email: `consultation-test@example.com`,
            password: 'password123456',
        };

        const signupReq = new Request('http://localhost/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser),
        });

        const signupRes = await app.fetch(signupReq, env);
        expect(signupRes.status).toBe(200);

        sessionCookie = signupRes.headers.get('set-cookie');
        expect(sessionCookie).toBeTruthy();
        // Set-Cookie は属性付きで返ることがあるので "key=value" だけ抜き出す
        const setCookieA = signupRes.headers.get('set-cookie');
        expect(setCookieA).toBeTruthy();
        sessionCookie = (setCookieA as string).split(';')[0];

        // User B（攻撃者）を作成（別セッションCookie取得）
        const attacker = {
            name: 'Attacker',
            email: `attacker-${Date.now()}@example.com`,
            password: 'password123456',
        };

        const attackerSignupReq = new Request('http://localhost/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attacker),
        });

        const attackerSignupRes = await app.fetch(attackerSignupReq, env);
        expect(attackerSignupRes.status).toBe(200);

        const setCookieB = attackerSignupRes.headers.get('set-cookie');
        expect(setCookieB).toBeTruthy();
        attackerCookie = (setCookieB as string).split(';')[0];
    });

    describe('POST /api/users/me', () => {
        it('ユーザー取得', async () => {
            const req = new Request('http://localhost/api/users/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': sessionCookie!,
                },
            });

            const res = await app.fetch(req, env);
            expect(res.status).toBe(200);

            const data = await res.json() as any;
            expect(data.name).equal('Test User for Consultations');
            expect(data.disabled).equal(false);
            expect(data).toHaveProperty('createdAt');
            expect(data).toHaveProperty('updatedAt');
        });


        it('404 Not Found', async () => {
            const req = new Request('http://localhost/api/users/1234567890', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': sessionCookie!,
                },
            });

            const res = await app.fetch(req, env);
            expect(res.status).toBe(404);
        });

        it('401 Unauthorized', async () => {
            const req = new Request('http://localhost/api/users/me', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const res = await app.fetch(req, env);
            expect(res.status).toBe(401);
        });
    });
});

