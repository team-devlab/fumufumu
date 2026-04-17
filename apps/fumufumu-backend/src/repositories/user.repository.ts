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
	 * アプリユーザーIDから通知先メールアドレスを取得する
	 *
	 * @param appUserId - 業務DBのユーザーID (users.id)
	 * @returns メールアドレス
	 * @throws {NotFoundError} メールアドレスが見つからない場合
	 */
	async findEmailByAppUserId(appUserId: number): Promise<string> {
		const [row] = await this.db
			.select({ email: authUsers.email })
			.from(authMappings)
			.innerJoin(authUsers, eq(authMappings.authUserId, authUsers.id))
			.where(eq(authMappings.appUserId, appUserId))
			.limit(1);

		if (!row?.email) {
			throw new NotFoundError(
				`メールアドレスの取得に失敗しました: appUserId=${appUserId}`,
			);
		}

		return row.email;
	}
}
