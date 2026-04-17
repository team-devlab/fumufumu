import type { MailClient } from "@/clients/mail";
import type { ContentCheckRepository } from "@/repositories/content-check.repository";
import type { UserRepository } from "@/repositories/user.repository";

export class NotificationService {
	constructor(
		private readonly contentCheckRepository: ContentCheckRepository,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * NotificationService 側はこう考えると整理しやすいです。
	 * ContentCheckRepository で対象取得
	 * authorId がなければ失敗記録
	 * UserRepository で recipient（email）取得
	 * mailClient.sendApproved(...) 実行
	 * 成功なら markNotificationSent、失敗なら markNotificationFailed
	 */
	
	async sendPending(limit = 100) {
		const approvedList =
			await this.contentCheckRepository.listPendingApprovedForNotification(limit);

		for (const row of approvedList) {
			if (row.authorId === null) {
				continue;
			}
			await this.userRepository.findEmailByAppUserId(row.authorId);
		}

		// 仮実装
		return {
			targetCount: approvedList.length,
		};
	}
}
