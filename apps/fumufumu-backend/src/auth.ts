// src/auth.ts

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq, sql } from 'drizzle-orm';
import type { Env, DbInstance } from './index';

// 修正: userSchema と authSchema の両方をインポート (ここで定義を利用)
import * as userSchema from "./db/schema/user";
import * as authSchema from "./db/schema/auth";

// index.ts から schema をインポートしていた行は不要になる場合がありますが、
// 安全のため、ここではauth.ts内でローカルに結合します。
// import { schema as fullSchema } from './index'; // <- この行は不要

// Better Authが使用するすべてのスキーマを結合
const authDrizzleSchema = {
	...authSchema, // auth_users, auth_sessions, etc.
	// ...userSchema, // 業務DBスキーマはBetter Authには必須ではないが、渡しても問題ないことが多い
};

/**
 * Drizzleインスタンスと環境変数を受け取って Better Auth インスタンスを生成する関数
 * @param db DbInstance型
 * @param env Cloudflare Workersの環境変数 (Bindings)
 * @returns Better Authインスタンス
 */
// 修正: index.ts から schema を受け取る引数を削除 (DIミドルウェアの修正も必要)
export function createBetterAuth(db: DbInstance, env: Env) {
	const { users, authMappings } = userSchema;

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "sqlite",
			schema: authDrizzleSchema,
		}),
		emailAndPassword: { // [!code highlight]
			enabled: true,
			autoSignIn: true, // ★ 修正: 自動サインインを明示的に有効化 ★ // [!code focus]
		}, // [!code highlight]
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
		callbacks: {
			user: async ({ authUserId, session }: { authUserId: string, session: { user: { name?: string | null } } & Record<string, any> }) => {

				const existingMapping = await db.query.authMappings.findFirst({
					where: eq(authMappings.authUserId, authUserId),
				});

				let appUserId: number;

				if (existingMapping) {
					appUserId = existingMapping.appUserId;
				} else {
					await db.batch([
						db.insert(users).values({
							name: session.user.name ?? "New User",
						}),
						db.insert(authMappings).values({
							appUserId: sql`(last_insert_rowid())`,
							authUserId: authUserId,
						}),
					]);

					const newlyCreatedMapping = await db.query.authMappings.findFirst({
						where: eq(authMappings.authUserId, authUserId),
					});

					if (!newlyCreatedMapping) {
						throw new Error("Failed to create user and mapping in transaction.");
					}
					appUserId = newlyCreatedMapping.appUserId;
				}

				return {
					...session,
					appUserId: appUserId,
				};
			}
		}
	});
}

export type AuthInstance = ReturnType<typeof createBetterAuth>;