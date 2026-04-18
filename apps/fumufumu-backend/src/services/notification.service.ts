import type { ApprovedMailTargetType, MailClient } from "@/clients/mail";
import type { ContentCheckRepository } from "@/repositories/content-check.repository";
import type { UserRepository } from "@/repositories/user.repository";
import type {
	ResendSummary,
	SendPendingSummary,
} from "@/types/notification.types";

type ResendTarget = NonNullable<
	Awaited<ReturnType<ContentCheckRepository["findApprovedForResend"]>>
>;

type DispatchTarget =
	| {
		targetType: "consultation";
		targetId: number;
		authorId: number | null;
		title: string;
	}
	| {
		targetType: "advice";
		targetId: number;
		authorId: number | null;
		consultationId: number;
		consultationTitle?: string | null;
	};

export class NotificationService {
	constructor(
		private readonly contentCheckRepository: ContentCheckRepository,
		private readonly userRepository: UserRepository,
		private readonly mailClient: MailClient,
	) {}
	
	async sendPending(limit = 100): Promise<SendPendingSummary> {
		const approvedList =
			await this.contentCheckRepository.listPendingApprovedForNotification(limit);

		const summary: SendPendingSummary = {
			targetCount: approvedList.length,
			attemptedCount: 0,
			sentCount: 0,
			failedCount: 0,
		};

		for (const row of approvedList) {
			summary.attemptedCount += 1;

			try {
				await this.dispatchApprovedMail({
					targetType: "consultation",
					targetId: row.id,
					authorId: row.authorId,
					title: row.title,
				});

				await this.contentCheckRepository.markNotificationSent("consultation", row.id);
				summary.sentCount += 1;
			} catch (error) {
				await this.contentCheckRepository.markNotificationFailed(
					"consultation",
					row.id,
					this.toErrorMessage(error),
				);
				summary.failedCount += 1;
			}
		}

		return summary;
	}

	async resend(
		targetType: ApprovedMailTargetType,
		targetId: number,
	): Promise<ResendSummary> {
		const target = await this.contentCheckRepository.findApprovedForResend(
			targetType,
			targetId,
		);

		if (!target) {
			return {
				sent: false,
				targetType,
				targetId,
				reason: "approved かつ未通知の対象が見つかりませんでした",
			};
		}

		try {
			await this.dispatchApprovedMail(this.toDispatchTarget(target));
			await this.contentCheckRepository.markNotificationSent(
				target.targetType,
				target.targetId,
			);

			return {
				sent: true,
				targetType: target.targetType,
				targetId: target.targetId,
			};
		} catch (error) {
			await this.contentCheckRepository.markNotificationFailed(
				target.targetType,
				target.targetId,
				this.toErrorMessage(error),
			);

			return {
				sent: false,
				targetType: target.targetType,
				targetId: target.targetId,
				reason: this.toErrorMessage(error),
			};
		}
	}

	private toDispatchTarget(target: ResendTarget): DispatchTarget {
		if (target.targetType === "consultation") {
			return {
				targetType: "consultation",
				targetId: target.targetId,
				authorId: target.authorId,
				title: target.title,
			};
		}

		return {
			targetType: "advice",
			targetId: target.targetId,
			authorId: target.authorId,
			consultationId: target.consultationId,
		};
	}

	private async dispatchApprovedMail(target: DispatchTarget): Promise<void> {
		if (target.authorId === null) {
			throw new Error(
				`通知対象の投稿者が存在しません: targetType=${target.targetType}, targetId=${target.targetId}`,
			);
		}

		const to = await this.userRepository.findEmailByAppUserId(target.authorId);

		if (target.targetType === "consultation") {
			await this.mailClient.sendApproved({
				targetType: "consultation",
				targetId: target.targetId,
				to,
				consultationTitle: target.title,
			});
			return;
		}

		await this.mailClient.sendApproved({
			targetType: "advice",
			targetId: target.targetId,
			to,
			consultationId: target.consultationId,
			consultationTitle: target.consultationTitle ?? null,
		});
	}

	private toErrorMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		return "unknown notification error";
	}
}
