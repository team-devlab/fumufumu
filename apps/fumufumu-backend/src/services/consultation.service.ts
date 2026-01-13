// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse, ConsultationSavedResponse } from "@/types/consultation.response";
import type { ConsultationBody } from "@/validators/consultation.validator";

type ConsultationEntity = Awaited<ReturnType<ConsultationRepository["findAll"]>>[number];

export class ConsultationService {
	private static readonly BODY_PREVIEW_LENGTH = 100;

	constructor(private repository: ConsultationRepository) {}

	/**
	 * 相談データをレスポンス形式に変換する
	 * 
	 * @param consultation - Repository層から取得した相談データ
	 * @returns API レスポンス形式の相談データ
	 */
	private toConsultationResponse(consultation: ConsultationEntity): ConsultationResponse {
		return {
			id: consultation.id,
			title: consultation.title,
			body_preview: consultation.body.substring(0, ConsultationService.BODY_PREVIEW_LENGTH),
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
		};
	}

	private toConsultationSavedResponse(consultation: {
		id: number;
		draft: boolean;
		updated_at: string;
	}): ConsultationSavedResponse {
		return {
			id: consultation.id,
			draft: consultation.draft,
			updated_at: consultation.updated_at,
		};
	}

	async listConsultations(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const consultationList = await this.repository.findAll(filters);
		const responses = consultationList.map(consultation => this.toConsultationResponse(consultation));

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
	async createConsultation(
		data: ConsultationBody,
		authorId: number
	): Promise<ConsultationResponse> {
		const createdConsultation = await this.repository.create({
			...data,
			authorId,
		});

		return this.toConsultationResponse(createdConsultation);
	}

	/**
	 * 相談を更新する
	 * 
	 * @param data - 更新する相談データ
	 * @param data.id - 更新する相談ID
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 更新された相談のレスポンス
	 * @throws {Error} 更新失敗時
	 */
	async updateConsultation(
		id: number,
		data: ConsultationBody,
		requestUserId: number
	): Promise<ConsultationSavedResponse> {
    	const existingConsultation = await this.repository.findFirstById(id);

    	if (!existingConsultation) {
       		throw new Error('Consultation not found'); 
    	}

    	// データ所有者とリクエストユーザーが一致するかチェック
    	if (existingConsultation.authorId !== requestUserId) {
       		throw new Error('You do not have permission to update this consultation.');
    	}
    	
		const updatedConsultation = await this.repository.update({
			id,
			...data,
			authorId: existingConsultation.authorId ?? requestUserId,
		});

		return this.toConsultationSavedResponse({
			id: updatedConsultation.id,
			draft: updatedConsultation.draft,
			updated_at: updatedConsultation.updatedAt.toISOString(),
		});
	}
}

