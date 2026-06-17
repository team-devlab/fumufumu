import type { ApprovedMailTargetType, MailSendErrorKind } from "@/clients/mail";

export type ResendFailureKind =
	| "not_found"
	| "recipient_missing"
	| MailSendErrorKind;

export type ResendSummary =
	| { sent: true; targetType: ApprovedMailTargetType; targetId: number }
	| {
		sent: false;
		targetType: ApprovedMailTargetType;
		targetId: number;
		kind: ResendFailureKind;
		reason: string;
	};
