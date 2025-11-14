import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Cloudflare Workersの実行モデルに基づき、D1バインディングからDrizzle DBインスタンスを生成します。
 *
 * 【重要】WorkersではDBバインディング (c.env.DB) はリクエスト時しか利用できません。
 * したがって、この関数はトップレベルで実行せず、必ずHonoのルートハンドラ内でリクエストごとに呼び出してください。
 *
 * @param d1Binding Cloudflare Workersのc.env.DBバインディング
 * @returns リクエスト固有のDrizzleD1Databaseインスタンス
 */
export function getDb(d1Binding: D1Database): DrizzleD1Database {
	return drizzle(d1Binding);
}
