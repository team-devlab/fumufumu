import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { Env } from './index';

/**
 * Drizzleインスタンスと環境変数を受け取って Better Auth インスタンスを生成する関数
 * @param db DrizzleD1Databaseインスタンス
 * @param env Cloudflare Workersの環境変数 (Bindings)
 * @returns Better Authインスタンス
 */
export function createBetterAuth(db: DrizzleD1Database, env: Env) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		user: {
			modelName: "auth_users",
		},
		session: {
			modelName: "auth_sessions",
		},
		account: {
			modelName: "auth_accounts",
		},
		verification: {
			modelName: "auth_verifications",
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
	});
}