// サービスファクトリー: 依存関係を解決してサービスインスタンスを生成
import type { DbInstance } from "@/index";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";
import { ContentCheckRepository } from "@/repositories/content-check.repository";
import { ConsultationContentCheckService } from "@/services/consultation-content-check.service";
import { UserRepository } from "@/repositories/user.repository";
import { UserService } from "@/services/user.service";
import { TagRepository } from "@/repositories/tag.repository";
import { TagService } from "@/services/tag.service";
import { NotificationService } from "@/services/notification.service";
import { ResendMailClient } from "@/clients/mail";

export type NotificationServiceFactoryOptions = {
	resendApiKey: string;
	resendFrom: string;
	appBaseUrl?: string;
	resendEndpoint?: string;
	timeoutMs?: number;
	fetchImpl?: typeof fetch;
};

/**
 * ConsultationServiceのファクトリー関数
 * DBインスタンスから依存関係を解決してServiceを生成する
 * 
 * @param db - データベースインスタンス（リクエストごとに異なる）
 * @returns 依存関係が解決されたConsultationServiceインスタンス
 */
export function createConsultationService(db: DbInstance): ConsultationService {
	const repository = new ConsultationRepository(db);
	return new ConsultationService(repository);
}

/**
 * ConsultationContentCheckServiceのファクトリー関数
 * DBインスタンスから依存関係を解決してServiceを生成する
 *
 * @param db - データベースインスタンス（リクエストごとに異なる）
 * @returns 依存関係が解決されたConsultationContentCheckServiceインスタンス
 */
export function createConsultationContentCheckService(db: DbInstance): ConsultationContentCheckService {
	const repository = new ContentCheckRepository(db);
	return new ConsultationContentCheckService(repository);
}

/**
 * UserServiceのファクトリー関数
 * DBインスタンスから依存関係を解決してServiceを生成する
 * 
 * @param db - データベースインスタンス（リクエストごとに異なる）
 * @returns 依存関係が解決されたUserServiceインスタンス
 */
export function createUserService(db: DbInstance): UserService {
	const repository = new UserRepository(db);
	return new UserService(repository);
}

/**
 * TagServiceのファクトリー関数
 * DBインスタンスから依存関係を解決してServiceを生成する
 * 
 * @param db - データベースインスタンス（リクエストごとに異なる）
 * @returns 依存関係が解決されたTagServiceインスタンス
 */
export function createTagService(db: DbInstance): TagService {
	const repository = new TagRepository(db);
	return new TagService(repository);
}

/**
 * NotificationServiceのファクトリー関数
 * DBインスタンスとResend設定から依存関係を解決してServiceを生成する
 *
 * @param db - データベースインスタンス
 * @param options - Resendクライアント設定
 * @returns 依存関係が解決されたNotificationServiceインスタンス
 */
export function createNotificationService(
	db: DbInstance,
	options: NotificationServiceFactoryOptions,
): NotificationService {
	const contentCheckRepository = new ContentCheckRepository(db);
	const userRepository = new UserRepository(db);
	const mailClient = new ResendMailClient({
		apiKey: options.resendApiKey,
		from: options.resendFrom,
		appBaseUrl: options.appBaseUrl,
		endpoint: options.resendEndpoint,
		timeoutMs: options.timeoutMs,
		fetchImpl: options.fetchImpl,
	});

	return new NotificationService(contentCheckRepository, userRepository, mailClient);
}
