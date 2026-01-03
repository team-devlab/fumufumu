import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env, DbInstance } from './index';

/**
 * Drizzleインスタンスと環境変数を受け取って Better Auth インスタンスを生成する関数
 * @param db DbInstance型
 * @param env Cloudflare Workersの環境変数 (Bindings)
 * @returns Better Authインスタンス
 */
export function createBetterAuth(db: DbInstance, env: Env) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
		},
		user: {
			modelName: "authUsers",
		},
		session: {
			modelName: "authSessions",
			// 💡 パフォーマンス改善のための Cookie Cache を有効にする
			cookieCache: {
				enabled: true,
				maxAge: 7 * 24 * 60 * 60, // 一週間キャッシュ
			}
		},
		account: {
			modelName: "authAccounts",
		},
		verification: {
			modelName: "authVerifications",
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		// セキュリティ設定（重要）
		advanced: {
            // クロスドメインでCookieを有効にする設定
            defaultCookieAttributes: {
                sameSite: "none", // 異なるドメイン間で送受信するため必須
                secure: true,     // HTTPS必須
                httpOnly: true    // JSからのアクセス禁止（セキュリティ確保）
            }
        },
	});
}

export type AuthInstance = ReturnType<typeof createBetterAuth>;