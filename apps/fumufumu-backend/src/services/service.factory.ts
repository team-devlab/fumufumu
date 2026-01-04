// サービスファクトリー: 依存関係を解決してサービスインスタンスを生成
import type { DbInstance } from "@/index";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";

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

