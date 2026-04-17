import {
	MailSendError,
	type MailClient,
	type MailSendErrorKind,
	type SendApprovedMailInput,
} from "@/clients/mail/mail-client";

const DEFAULT_RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_ERROR_MESSAGE_LENGTH = 400;

type ResendMailClientOptions = {
	apiKey: string;
	from: string;
	appBaseUrl?: string;
	endpoint?: string;
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
};

type ResendSendEmailPayload = {
	from: string;
	to: string[];
	subject: string;
	text: string;
};

export class ResendMailClient implements MailClient {
	private readonly apiKey: string;
	private readonly from: string;
	private readonly appBaseUrl?: string;
	private readonly endpoint: string;
	private readonly timeoutMs: number;
	private readonly fetchImpl: typeof fetch;

	constructor(options: ResendMailClientOptions) {
		const apiKey = options.apiKey.trim();
		const from = options.from.trim();

		if (!apiKey) {
			throw new Error("ResendMailClient: apiKey is required");
		}
		if (!from) {
			throw new Error("ResendMailClient: from is required");
		}

		this.apiKey = apiKey;
		this.from = from;
		this.appBaseUrl = this.normalizeBaseUrl(options.appBaseUrl);
		this.endpoint = options.endpoint ?? DEFAULT_RESEND_ENDPOINT;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.fetchImpl = options.fetchImpl ?? fetch;
	}

	async sendApproved(input: SendApprovedMailInput): Promise<void> {
		const payload = this.buildPayload(input);
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await this.fetchImpl(this.endpoint, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			});

			if (!response.ok) {
				const rawMessage = this.truncate(await response.text());
				const kind = this.classifyByStatus(response.status);
				throw new MailSendError(
					`mail send failed: status=${response.status}, kind=${kind}`,
					kind,
					{
						statusCode: response.status,
						rawMessage,
					},
				);
			}
		} catch (error) {
			if (error instanceof MailSendError) {
				throw error;
			}

			if (this.isAbortError(error)) {
				throw new MailSendError(
					`mail send timeout: timeoutMs=${this.timeoutMs}`,
					"temporary",
					{ cause: error },
				);
			}

			if (this.isNetworkError(error)) {
				throw new MailSendError(
					"mail send failed due to network error",
					"temporary",
					{
						rawMessage: this.truncate(this.errorToMessage(error)),
						cause: error,
					},
				);
			}

			throw new MailSendError(
				"mail send failed due to unexpected error",
				"unknown",
				{ cause: error },
			);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private buildPayload(input: SendApprovedMailInput): ResendSendEmailPayload {
		const subject = input.targetType === "consultation"
			? "相談が承認されました"
			: "アドバイスが承認されました";

		const text = input.targetType === "consultation"
			? this.buildConsultationApprovedText(input)
			: this.buildAdviceApprovedText(input);

		return {
			from: this.from,
			to: [input.to],
			subject,
			text,
		};
	}

	private buildConsultationApprovedText(input: Extract<SendApprovedMailInput, { targetType: "consultation" }>): string {
		const recipient = input.recipientName?.trim();
		const greeting = recipient ? `${recipient}さん` : "ユーザー様";
		const actionUrl = this.buildActionUrl(input);
		return [
			`${greeting}`,
			"",
			"投稿いただいた相談が承認されました。",
			`相談ID: ${input.targetId}`,
			`タイトル: ${input.consultationTitle}`,
			...(actionUrl ? ["", `相談詳細: ${actionUrl}`] : []),
		].join("\n");
	}

	private buildAdviceApprovedText(input: Extract<SendApprovedMailInput, { targetType: "advice" }>): string {
		const recipient = input.recipientName?.trim();
		const greeting = recipient ? `${recipient}さん` : "ユーザー様";
		const actionUrl = this.buildActionUrl(input);
		return [
			`${greeting}`,
			"",
			"投稿いただいたアドバイスが承認されました。",
			`アドバイスID: ${input.targetId}`,
			`相談ID: ${input.consultationId}`,
			...(input.consultationTitle ? [`相談タイトル: ${input.consultationTitle}`] : []),
			...(actionUrl ? ["", `相談詳細: ${actionUrl}`] : []),
		].join("\n");
	}

	private buildActionUrl(input: SendApprovedMailInput): string | null {
		if (!this.appBaseUrl) {
			return null;
		}

		if (input.targetType === "consultation") {
			return `${this.appBaseUrl}/consultations/${input.targetId}`;
		}

		return `${this.appBaseUrl}/consultations/${input.consultationId}`;
	}

	private classifyByStatus(statusCode: number): MailSendErrorKind {
		if (statusCode === 408 || statusCode === 429 || statusCode >= 500) {
			return "temporary";
		}
		if (statusCode >= 400 && statusCode < 500) {
			return "config";
		}
		return "unknown";
	}

	private isAbortError(error: unknown): boolean {
		if (error instanceof DOMException) {
			return error.name === "AbortError";
		}
		return false;
	}

	private normalizeBaseUrl(value?: string): string | undefined {
		if (!value) {
			return undefined;
		}
		const normalized = value.trim().replace(/\/+$/, "");
		return normalized || undefined;
	}

	private isNetworkError(error: unknown): boolean {
		if (error instanceof TypeError) {
			return true;
		}
		return false;
	}

	private errorToMessage(error: unknown): string {
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	}

	private truncate(value: string): string {
		if (value.length <= MAX_ERROR_MESSAGE_LENGTH) {
			return value;
		}
		return `${value.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...`;
	}
}
