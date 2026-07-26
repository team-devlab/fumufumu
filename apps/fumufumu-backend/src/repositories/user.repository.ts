// Data層: ユーザーデータアクセス
import { authMappings, users } from "@/db/schema/user";
import type { DbInstance } from "@/index";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";
import {
	authUsers,
	authSessions,
	authAccounts,
	authVerifications,
} from "@/db/schema/auth";

export class UserRepository {
	constructor(private db: DbInstance) {}

	/**
	 * IDでユーザーを取得する
	 * 
	 * @param id - ユーザーID
	 * @returns ユーザー情報
	 * @throws {NotFoundError} ユーザーが見つからない場合
	 */
	async findFirstById(id: number) {
		const user = await this.db.query.users.findFirst({
			where: eq(users.id, id),
			columns: {
				id: true,
				name: true,
				disabled: true,
				role: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundError(`ユーザーが見つかりません: id=${id}`);
		}

		return user;
	}

	/**
	 * 通知送信に必要な宛先情報（メールアドレス・表示名）を取得する
	 *
	 * @param appUserId - 業務DBのユーザーID (users.id)
	 * @returns 宛先情報
	 * @throws {NotFoundError} 宛先情報が見つからない場合
	 */
	async findNotificationRecipientByAppUserId(
		appUserId: number,
	): Promise<{ email: string; name: string }> {
		const [row] = await this.db
			.select({
				email: authUsers.email,
				name: users.name,
			})
			.from(authMappings)
			.innerJoin(authUsers, eq(authMappings.authUserId, authUsers.id))
			.innerJoin(users, eq(authMappings.appUserId, users.id))
			.where(eq(authMappings.appUserId, appUserId))
			.limit(1);

		if (!row?.email || !row?.name) {
			throw new NotFoundError(
				`通知先情報の取得に失敗しました: appUserId=${appUserId}`,
			);
		}

		return {
			email: row.email,
			name: row.name,
		};
	}

	/**
	 * 退会に必要な本人の認証側情報（authUserId・登録メール）を appUserId から引く。
	 *
	 * @throws {NotFoundError} 対応表・認証ユーザーが見つからない場合
	 */
	async getWithdrawalIdentity(
		appUserId: number,
	): Promise<{ authUserId: string; email: string }> {
		const [row] = await this.db
			.select({
				authUserId: authMappings.authUserId,
				email: authUsers.email,
			})
			.from(authMappings)
			.innerJoin(authUsers, eq(authMappings.authUserId, authUsers.id))
			.where(eq(authMappings.appUserId, appUserId))
			.limit(1);

		if (!row) {
			throw new NotFoundError(
				`退会対象のユーザーが見つかりません: appUserId=${appUserId}`,
			);
		}

		return row;
	}

	/**
	 * 退会: 認証情報・PII・業務ユーザー行を 1 つの db.batch で原子的に物理削除する。
	 *
	 * - D1 は db.transaction() が使えないため db.batch を使う。D1 の batch は原子的で、
	 *   途中失敗なら全体ロールバック（部分削除が起きない）。ADR 013 §5.3。
	 * - 子（セッション/アカウント/対応表）→ 親（users/auth_users）の順に明示削除する。
	 *   set null / cascade の FK は最終防御に残しつつ、削除意図をコードで可視化するため。
	 * - 投稿（consultations/advices）の authorId は FK の set null に委ねて匿名化する（ADR 013 §5.2）。
	 * - moderation_actions.adminUserId は RESTRICT。実行者参照が残るユーザー（元管理者）は
	 *   users 削除が失敗し batch ごとロールバックする。現状は退会を管理者ロールに限り拒否して
	 *   回避する（Service 層。ADR 013 §6 の一時措置）。
	 */
	async deleteAccountAtomically(params: {
		appUserId: number;
		authUserId: string;
		email: string;
	}): Promise<void> {
		const { appUserId, authUserId, email } = params;

		await this.db.batch([
			this.db.delete(authSessions).where(eq(authSessions.userId, authUserId)),
			this.db.delete(authAccounts).where(eq(authAccounts.userId, authUserId)),
			this.db
				.delete(authVerifications)
				.where(eq(authVerifications.identifier, email)),
			this.db.delete(authMappings).where(eq(authMappings.appUserId, appUserId)),
			this.db.delete(users).where(eq(users.id, appUserId)),
			this.db.delete(authUsers).where(eq(authUsers.id, authUserId)),
		]);
	}

}
