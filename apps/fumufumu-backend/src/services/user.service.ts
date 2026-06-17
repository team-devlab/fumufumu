// Business層: ユーザービジネスロジック
import type { UserRepository } from "@/repositories/user.repository";
import type { UserRole } from "@/db/schema/user";

/**
 * ユーザー情報レスポンス型
 *
 * role はフロントエンドの admin layout guard / UI 出し分けで参照される（ADR 010 §5）。
 * 自分自身の role を返すだけで他人の role は露出しない。
 */
export interface UserResponse {
	id: number;
	name: string;
	disabled: boolean;
	role: UserRole;
	createdAt: string;
	updatedAt: string;
}

export class UserService {
	constructor(private repository: UserRepository) { }

	/**
	 * ユーザーデータをレスポンス形式に変換する
	 * 
	 * @param user - Repository層から取得したユーザーデータ
	 * @returns APIレスポンス形式のユーザーデータ
	 */
	private toUserResponse(user: {
		id: number;
		name: string;
		disabled: boolean;
		role: UserRole;
		createdAt: Date;
		updatedAt: Date;
	}): UserResponse {
		return {
			id: user.id,
			name: user.name,
			disabled: user.disabled,
			role: user.role,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		};
	}

	/**
	 * 現在のユーザー情報を取得する
	 * 
	 * @param userId - ユーザーID
	 * @returns ユーザー情報
	 * @throws {NotFoundError} ユーザーが見つからない場合
	 */
	async getCurrentUser(userId: number): Promise<UserResponse> {
		const user = await this.repository.findFirstById(userId);
		return this.toUserResponse(user);
	}
}
