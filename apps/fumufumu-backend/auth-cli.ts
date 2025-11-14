import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from 'drizzle-orm/d1';

// CLI実行時にはDBバインディングが存在しないため、ダミーのオブジェクトを使用します。
const DUMMY_DB_CLIENT = {
    // Drizzleが要求する最小限のメソッドをダミーとして定義
    prepare: () => ({ all: async () => [] }),
    dump: async () => ({})
} as any; 

const db = drizzle(DUMMY_DB_CLIENT);

// CLIが認識できるように `auth` としてエクスポート（または default export）
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite",
    }),
		user: {
			modelName: "auth_user",
		},
		session: {
			modelName: "auth_session",
		},
		account: {
			modelName: "auth_account",
		},
		verification: {
			modelName: "auth_verification",
		},
    secret: "THIS_IS_DUMMY_SECRET_FOR_CLI_ONLY", 
    // CLI実行時に不要なbaseURLなどは省略
});
