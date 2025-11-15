import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from 'drizzle-orm/d1';
import { eq, sql } from 'drizzle-orm';
import type { Env } from './index';
import type { D1Database } from '@cloudflare/workers-types';
import * as userSchema from "./db/schema/user";
import * as authSchema from "./db/schema/auth";
const schema = {
	...authSchema,
	...userSchema,
}

// NOTE: Better AuthのSession型は公開されていない可能性があるため、
// ここでは必要なプロパティのみを持つ最小限のインターフェースを定義するか、
// 型を無視して実装を進めます。今回は型を無視して実装を進めます。

/**
 * Drizzleインスタンスと環境変数を受け取って Better Auth インスタンスを生成する関数
 * @param d1Binding D1Databaseのバインディング
 * @param env Cloudflare Workersの環境変数 (Bindings)
 * @returns Better Authインスタンス
 */
export function createBetterAuth(d1Binding: D1Database, env: Env) {
	const db = drizzle(d1Binding, { schema });
	const { users, authMappings } = userSchema;

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
		callbacks: {
			// 引数にインポートした型ではなく、インラインで型を定義 (anyを避けるため)
			// TypeScriptの型推論が不足しているため、引数にオブジェクトの分解構文を使い、
			// 必要なプロパティの型を明示的に指定します。
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

// createBetterAuth 関数の戻り値の型を抽出してエクスポート
export type AuthInstance = ReturnType<typeof createBetterAuth>;
