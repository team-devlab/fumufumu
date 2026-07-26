// Business層: ユーザービジネスロジック
import type { UserRepository } from "@/repositories/user.repository";
import type { UserRole } from "@/db/schema/user";
import { ForbiddenError, ValidationError } from "@/errors/AppError";

// メールは実運用上おおむね大小文字を区別しないため、確認入力の取りこぼしを防ぐ正規化。
function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

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

	/**
	 * 退会（アカウント削除・PII 消去）。認証情報・PII・業務ユーザー行を物理削除する。
	 *
	 * 認証済み前提だが disabled(BAN) 中でも呼ばれうる（消去権のため。ADR 013 §5.5）。
	 * 投稿は authorId の FK(set null) に委ねて匿名化し、この層では投稿を触らない（ADR 013 §5.2）。
	 *
	 * @throws {ForbiddenError} 管理者ロール（一時的に退会不可）
	 * @throws {ValidationError} 入力メールが登録メールと一致しない
	 * @throws {NotFoundError} 対応表・認証ユーザーが見つからない
	 */
	async withdraw(params: {
		appUserId: number;
		role: UserRole;
		inputEmail: string;
	}): Promise<void> {
		const { appUserId, role, inputEmail } = params;

		// 管理者は一時的に退会不可。moderation_actions.adminUserId の RESTRICT 回避（写し化
		// issue #148 / #150）が未整備のための一時措置（ADR 013 §6）。
		if (role === "admin") {
			throw new ForbiddenError(
				"管理者アカウントは現在退会できません。運営にお問い合わせください。",
			);
		}

		// type-to-confirm: 本人確認はメール一致で行う（パスワード再認証は採らない。ADR 013 §5.6）。
		const identity = await this.repository.getWithdrawalIdentity(appUserId);
		if (normalizeEmail(inputEmail) !== normalizeEmail(identity.email)) {
			throw new ValidationError(
				"入力されたメールアドレスが登録メールアドレスと一致しません",
			);
		}

		await this.repository.deleteAccountAtomically({
			appUserId,
			authUserId: identity.authUserId,
			email: identity.email,
		});

		// 退会イベントは PII なしで記録する（email/name は残さない。ADR 013 §6）。
		console.info("withdrawal: account deleted", { appUserId });
	}
}
