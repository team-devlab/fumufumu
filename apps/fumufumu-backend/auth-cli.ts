import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from 'drizzle-orm/d1';

// CLI実行時にはDBバインディングが存在しないため、ダミーのオブジェクトを使用します。
// Drizzle Adapterはスキーマ生成時にはDB接続を試みないので、これで問題ありません。
const DUMMY_DB_CLIENT = {
    // Drizzleが要求する最小限のメソッドをダミーとして定義
    prepare: () => ({ all: async () => [] }),
    dump: async () => ({})
} as any; 

const db = drizzle(DUMMY_DB_CLIENT);

// CLIが認識できるように `auth` としてエクスポート（または default export）
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite", // Drizzleの設定に合わせる
    }),
    secret: "THIS_IS_DUMMY_SECRET_FOR_CLI_ONLY", 
    // CLI実行時に不要なbaseURLなどは省略
});