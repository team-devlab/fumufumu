export type ApprovedMailTargetType = "consultation" | "advice";
export type MailSendErrorKind = "config" | "temporary" | "unknown";

export type SendApprovedMailInput =
	| {
		targetType: "consultation";
		targetId: number;
		to: string;
		consultationTitle: string;
		recipientName?: string | null;
	}
	| {
		targetType: "advice";
		targetId: number;
		to: string;
		consultationId: number;
		consultationTitle?: string | null;
		recipientName?: string | null;
	};

export interface MailClient {
	sendApproved(input: SendApprovedMailInput): Promise<void>;
}

export class MailSendError extends Error {
	readonly kind: MailSendErrorKind;
	readonly statusCode?: number;
	readonly rawMessage?: string;

	constructor(
		message: string,
		kind: MailSendErrorKind,
		options?: {
			statusCode?: number;
			rawMessage?: string;
			cause?: unknown;
		},
	) {
		super(message, { cause: options?.cause });
		this.name = "MailSendError";
		this.kind = kind;
		this.statusCode = options?.statusCode;
		this.rawMessage = options?.rawMessage;
	}
}
