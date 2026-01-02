// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}

	async listConsultations(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const consultationList = await this.repository.findAll(filters);

		const responses: ConsultationResponse[] = consultationList.map((consultation) => ({
			id: consultation.id,
			title: consultation.title,
			body_preview: consultation.body.substring(0, 100),
			draft: consultation.draft,
			hidden_at: consultation.hiddenAt?.toISOString() ?? null,
			solved_at: consultation.solvedAt?.toISOString() ?? null,
			created_at: consultation.createdAt.toISOString(),
			updated_at: consultation.updatedAt.toISOString(),
			author: consultation.author ? {
				id: consultation.author.id,
				name: consultation.author.name,
				disabled: consultation.author.disabled,
			} : null
		}));

		return { 
			meta: { 
				total: responses.length
			}, 
			data: responses
		};
	}

	/**
	 * 相談を新規作成する
	 * 
	 * @param data - 作成する相談データ
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @param authorId - 投稿者ID（認証ユーザー）
	 * @returns 作成された相談のレスポンス
	 * @throws {Error} 作成失敗時
	 */
	// TODO: ここに createConsultation() メソッドを実装してください
	// 実装のポイント:
	// 1. Repository層の create() を呼び出す
	// 2. 戻り値が null の場合はエラーをスロー
	// 3. body_preview を生成（body.substring(0, 100)）
	// 4. 日時をISO文字列に変換（toISOString()）
	// 5. authorを整形（listConsultationsと同じパターン）
	// 6. ConsultationResponse型で返す
	async createConsultation(
		data: {
			title: string;
			body: string;
			draft: boolean
		},
		authorId: number
	): Promise<ConsultationResponse> {
		const createdConsultation = await this.repository.create({
			...data,
			authorId,
		});

		if (!createdConsultation) {
			throw new Error("作成に失敗しました");
		}

		return {
			id: createdConsultation.id,
			title: createdConsultation.title,
			body_preview: createdConsultation.body.substring(0, 100),
			draft: createdConsultation.draft,
			hidden_at: createdConsultation.hiddenAt?.toISOString() ?? null,
			solved_at: createdConsultation.solvedAt?.toISOString() ?? null,
			created_at: createdConsultation.createdAt.toISOString(),
			updated_at: createdConsultation.updatedAt.toISOString(),
			author: createdConsultation.author ? {
				id: createdConsultation.author.id,
				name: createdConsultation.author.name,
				disabled: createdConsultation.author.disabled,
			} : null
		};
	}
}

