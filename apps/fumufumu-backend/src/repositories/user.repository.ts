// Data層: ユーザーデータアクセス
import { authMappings, users } from "@/db/schema/user";
import type { DbInstance } from "@/index";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";
import { authUsers } from "@/db/schema/auth";

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

}
