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
	// HTTPS環境（本番環境など）かどうかの判定
	// FRONTEND_URL または BETTER_AUTH_URL に https が含まれていればセキュア環境とみなす
	const isSecure = env.FRONTEND_URL?.includes('https://') || env.BETTER_AUTH_URL?.startsWith('https://');

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
			defaultCookieAttributes: {
				// クロスドメイン(HTTPS)なら none、ローカル(HTTP)なら lax に切り替え
				sameSite: isSecure ? "none" : "lax",
				// HTTPS環境のみ true にする
				secure: isSecure,
				// JSからのアクセス禁止（セキュリティ確保）
				httpOnly: true,
				// 環境変数で指定があればドメインをセット（本番でのサブドメイン共有などに使用）
				domain: env.COOKIE_DOMAIN || undefined,
			}
		},
	});
}

export type AuthInstance = ReturnType<typeof createBetterAuth>;