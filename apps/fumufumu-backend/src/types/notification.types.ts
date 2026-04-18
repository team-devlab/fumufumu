import type { ApprovedMailTargetType } from "@/clients/mail";

export type SendPendingSummary = {
	targetCount: number;
	attemptedCount: number;
	sentCount: number;
	failedCount: number;
	failedTargetIds: number[];
};

export type ResendSummary =
	| { sent: true; targetType: ApprovedMailTargetType; targetId: number }
	| {
		sent: false;
		targetType: ApprovedMailTargetType;
		targetId: number;
		reason: string;
	};
