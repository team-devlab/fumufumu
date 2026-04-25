import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { users, authMappings } from './db/schema/user';
import type { Env, DbInstance } from './index';

/**
 * Drizzleインスタンスと環境変数を受け取って Better Auth インスタンスを生成する関数
 * @param db DbInstance型
 * @param env Cloudflare Workersの環境変数 (Bindings)
 * @returns Better Authインスタンス
 */
export function createBetterAuth(db: DbInstance, env: Env) {
	// HTTPS環境（本番環境など）かどうかの判定
	// 注意: ローカル開発環境の FRONTEND_URL に本番のHTTPS URLをカンマ区切りで混ぜると、
	// isSecureがtrueになり、ローカルでCookie(Secure: true)が保存されなくなります。
	// 各環境の FRONTEND_URL には、その環境固有のURLのみを設定してください。
	const isSecure = env.FRONTEND_URL?.includes('https://') || env.BETTER_AUTH_URL?.startsWith('https://');

	// FRONTEND_URL（カンマ区切り）を Better Auth の trustedOrigins に渡す。
	// Better Auth は baseURL 以外のオリジンからのリクエストを CSRF 保護で弾くため、
	// フロント（http://localhost:3000）からの /api/auth/* 呼び出しを許可するには
	// 明示的に trustedOrigins を設定する必要がある。
	const trustedOrigins = (env.FRONTEND_URL ?? '')
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);

	const socialProviders =
		env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
				},
			}
			: {};

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
			// 自動アカウント連携を有効化する。Better Auth は emailVerified: true の
			// OAuth プロバイダに限って自動紐づけするため、「そのメールアドレスの所有を
			// プロバイダが検証済み」のときだけ連携が成立する。攻撃面はパスワード
			// リセットと同等（ADR 010 参照）。
			accountLinking: {
				enabled: true,
			},
		},
		verification: {
			modelName: "authVerifications",
		},
		socialProviders,
		databaseHooks: {
			user: {
				create: {
					// email/password 経由でも Google 経由でも、新規ユーザー作成時は
					// ここで業務層（users / authMappings）を同時に作成する。
					after: async (user) => {
						let appUserId: number | null = null;

						try {
							const [appUser] = await db
								.insert(users)
								.values({ name: user.name || 'ユーザー' })
								.returning({ id: users.id });

							if (!appUser) {
								throw new Error(`Failed to insert app user after auth user creation: ${user.id}`);
							}

							appUserId = appUser.id;

							await db.insert(authMappings).values({
								appUserId: appUser.id,
								authUserId: user.id,
							});
						} catch (e) {
							// authMappings 作成に失敗した場合、users のみ残ることを避けるため
							// 直前に作成した app user はベストエフォートで削除する。
							if (appUserId !== null) {
								try {
									await db.delete(users).where(eq(users.id, appUserId));
								} catch (cleanupError) {
									console.error('Failed to rollback app user creation after mapping failure:', cleanupError);
								}
							}

							console.error('Failed to provision business-layer user during auth user creation:', e);
							throw e;
						}
					},
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		trustedOrigins,
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
