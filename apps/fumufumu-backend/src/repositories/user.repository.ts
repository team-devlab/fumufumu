// Data層: ユーザーデータアクセス
import { users } from "@/db/schema/user";
import type { DbInstance } from "@/index";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";

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
}
