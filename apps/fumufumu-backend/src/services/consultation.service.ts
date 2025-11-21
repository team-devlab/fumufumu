// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}
		/**
		 * 組織一覧を取得
		 * 
		 * 【処理フロー】
		 * ステップ1:Repository層からデータを取得
		 *  - repository.findAll())を呼び出す
		 *  - クエリパラメータ(userId, draft, solved)を渡す
		 *  - DBから相談データ（Entity）と投稿者情報（Authoer）を取得
		 * 
		 * ステップ2:データ変換（Entity→Response）
		 *  - 取得した各相談データに対して以下の変換を行う
		 *   a) body（全文）→body_previewに変換
		 *   b) 日付フィールド（Date型）→文字列に変換
		 *     - hiddenAt,solvedAt,createdAt,updatedAt
		 *   c) フィールド名変換（キャメルケース→スネークケース）
		 *     - hiddenAt→hidden_at
		 *     - solvedAt→solved_at
		 *     - createdAt→created_at
		 *     - updatedAt→updated_at
		 *   d) authorId（数値）→author(オブジェクト)に展開
		 * 
		 * ステップ3: レスポンス形式に整形
		 *  - meta情報を追加（total::件数）
		 *  - data配列に変換後の相談データを格納
		 *  - ConsultationListResponse型で返却
		 * 
		 */

	async listConsultaitons(): Promise<ConsultationListResponse> {
		const entities = await this.repository.findAll();

		// ステップ2: Entity → Response変換
		const responses: ConsultationResponse[] = entities
			.filter(({ author }) => author !== null)
			.map(({ consultations, author }) => ({
				id: consultations.id,
				title: consultations.title,
				body_preview: consultations.body.substring(0, 100),
				draft: consultations.draft,
				hidden_at: consultations.hiddenAt?.toISOString() ?? null,
				solved_at: consultations.solvedAt?.toISOString() ?? null,
				created_at: consultations.createdAt.toISOString(),
				updated_at: consultations.updatedAt.toISOString(),
				author: author!
			}));

		// ステップ3: レスポンス形式に整形
		return { 
			meta: { 
				total: responses.length
			}, 
			data: responses
		};
	}
}

