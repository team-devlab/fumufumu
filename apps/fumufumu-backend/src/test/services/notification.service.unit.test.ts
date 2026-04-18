import { describe, expect, it, vi } from "vitest";
import type { MailClient } from "@/clients/mail";
import { NotificationService } from "@/services/notification.service";
import type { ContentCheckRepository } from "@/repositories/content-check.repository";
import type { UserRepository } from "@/repositories/user.repository";

type MockContentCheckRepository = Pick<
	ContentCheckRepository,
	| "listPendingApprovedForNotification"
	| "markNotificationSent"
	| "markNotificationFailed"
>;

type MockUserRepository = Pick<
	UserRepository,
	"findNotificationRecipientByAppUserId"
>;

function createService(deps?: {
	contentCheckRepository?: MockContentCheckRepository;
	userRepository?: MockUserRepository;
	mailClient?: MailClient;
}) {
	const contentCheckRepository: MockContentCheckRepository = deps?.contentCheckRepository ?? {
		listPendingApprovedForNotification: vi.fn().mockResolvedValue([]),
		markNotificationSent: vi.fn().mockResolvedValue(null),
		markNotificationFailed: vi.fn().mockResolvedValue(null),
	};

	const userRepository: MockUserRepository = deps?.userRepository ?? {
		findNotificationRecipientByAppUserId: vi.fn().mockResolvedValue({
			email: "recipient@example.com",
			name: "テストユーザー",
		}),
	};

	const mailClient: MailClient = deps?.mailClient ?? {
		sendApproved: vi.fn().mockResolvedValue(undefined),
	};

	const service = new NotificationService(
		contentCheckRepository as unknown as ContentCheckRepository,
		userRepository as unknown as UserRepository,
		mailClient,
	);

	return {
		service,
		contentCheckRepository,
		userRepository,
		mailClient,
	};
}

describe("NotificationService", () => {
	it("sendPending は1件失敗しても継続し summary を返す", async () => {
		const contentCheckRepository: MockContentCheckRepository = {
			listPendingApprovedForNotification: vi.fn().mockResolvedValue([
				{
					id: 101,
					status: "approved",
					authorId: 10,
					title: "相談1",
					checkedAt: new Date(),
				},
				{
					id: 102,
					status: "approved",
					authorId: 20,
					title: "相談2",
					checkedAt: new Date(),
				},
			]),
			markNotificationSent: vi.fn().mockResolvedValue(null),
			markNotificationFailed: vi.fn().mockResolvedValue(null),
		};

		const userRepository: MockUserRepository = {
			findNotificationRecipientByAppUserId: vi.fn().mockImplementation(async (appUserId: number) => ({
				email: `user-${appUserId}@example.com`,
				name: `user-${appUserId}`,
			})),
		};

		const mailClient: MailClient = {
			sendApproved: vi.fn().mockImplementation(async (input) => {
				if (input.targetType === "consultation" && input.targetId === 101) {
					throw new Error("mail transport failed");
				}
			}),
		};

		const { service } = createService({
			contentCheckRepository,
			userRepository,
			mailClient,
		});

		const summary = await service.sendPending(10);

		expect(summary).toEqual({
			targetCount: 2,
			attemptedCount: 2,
			sentCount: 1,
			failedCount: 1,
			failedTargetIds: [101],
		});
		expect(contentCheckRepository.markNotificationFailed).toHaveBeenCalledWith(
			"consultation",
			101,
			"mail transport failed",
		);
		expect(contentCheckRepository.markNotificationSent).toHaveBeenCalledWith(
			"consultation",
			102,
		);
	});
});
