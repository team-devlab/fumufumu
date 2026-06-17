// 認証ユーザー (auth_users) と業務層 (users / auth_mappings) を橋渡しするプロビジョニング処理
import { eq } from "drizzle-orm";
import type { DbInstance } from "@/index";
import { users, authMappings } from "@/db/schema/user";

// 認証側の name が未設定（Google で取得できない等）の場合のフォールバック表示名
const DEFAULT_USER_NAME = "ユーザー";

type EnsureBusinessUserParams = {
	authUserId: string;
	name?: string | null;
};

/**
 * 認証ユーザーに対応する業務層レコード (users / auth_mappings) の存在を保証し、
 * 業務用ユーザーID (app_user_id) を返す。
 *
 * email / Google いずれの経路でも、業務層の生成はこの関数に一本化している
 * （旧 databaseHooks.user.create.after を廃止。詳細は issue #115）。
 * authGuard の lazy provisioning と signup ラッパの双方から呼ばれるため、
 * 以下の性質を満たす:
 *
 * - 冪等: 既にマッピングが存在すればそのまま app_user_id を返す
 * - 並行安全: 同一 auth_user に対する同時リクエストは auth_mappings.auth_user_id の
 *   UNIQUE 制約で一方が弾かれる。衝突した側は勝者のマッピングを引き直し、自分が
 *   先に作成した users 行はベストエフォートで削除して孤立データを残さない
 *
 * @param db リクエストスコープの Drizzle インスタンス
 * @param params authUserId（必須）と表示名（任意）
 * @returns 業務用ユーザーID (app_user_id)
 */
export async function ensureBusinessUser(
	db: DbInstance,
	{ authUserId, name }: EnsureBusinessUserParams,
): Promise<number> {
	// 1. 既に業務層が作られていれば即返り（最頻ケース）
	const existing = await db.query.authMappings.findFirst({
		where: eq(authMappings.authUserId, authUserId),
	});
	if (existing) {
		return existing.appUserId;
	}

	// 2. users を作成
	const [appUser] = await db
		.insert(users)
		.values({ name: name?.trim() || DEFAULT_USER_NAME })
		.returning({ id: users.id });

	if (!appUser) {
		throw new Error(`Failed to insert app user for auth user: ${authUserId}`);
	}

	// 3. マッピングを作成。失敗時は孤立した users 行を残さないよう後始末する。
	try {
		await db.insert(authMappings).values({
			appUserId: appUser.id,
			authUserId,
		});
		return appUser.id;
	} catch (e) {
		// auth_user_id の UNIQUE 違反 = 並行リクエストが先に作成済み。
		// 勝者のマッピングを採用し、自分が作った users 行は掃除する。
		const winner = await db.query.authMappings.findFirst({
			where: eq(authMappings.authUserId, authUserId),
		});

		await deleteAppUserQuietly(db, appUser.id);

		if (winner) {
			return winner.appUserId;
		}

		// UNIQUE 違反以外の本物の失敗は呼び出し元に伝播させる。
		console.error("Failed to provision business-layer user for auth user:", authUserId, e);
		throw e;
	}
}

/**
 * 孤立した users 行をベストエフォートで削除する。
 * 後始末自体の失敗は本来のエラーを覆い隠さないようログのみに留める。
 */
async function deleteAppUserQuietly(db: DbInstance, appUserId: number): Promise<void> {
	try {
		await db.delete(users).where(eq(users.id, appUserId));
	} catch (cleanupError) {
		console.error("Failed to clean up orphaned app user:", appUserId, cleanupError);
	}
}
