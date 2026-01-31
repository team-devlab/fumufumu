// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse, ConsultationSavedResponse, AdviceSavedResponse } from "@/types/consultation.response";
import type { ConsultationContent, AdviceContent, UpdateDraftAdviceContentSchema } from "@/validators/consultation.validator";
import { ForbiddenError } from "@/errors/AppError";
import type { AdviceResponse } from "@/types/advice.response";

type ConsultationEntity = Awaited<ReturnType<ConsultationRepository["findAll"]>>[number];
type ConsultationEntityById = Awaited<ReturnType<ConsultationRepository["findFirstById"]>>;
type AdviceEntity = Awaited<ReturnType<ConsultationRepository["createAdvice"]>>;

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

		/**
	 * 相談回答データをレスポンス形式に変換する
	 * 
	 * @param advice - Repository層から取得した相談回答データ
	 * @returns API レスポンス形式の相談回答データ
	 */
	private toAdviceResponse(advice: AdviceEntity): AdviceResponse {
		return {
			id: advice.id,
			body: advice.body,
			draft: advice.draft,
			hidden_at: advice.hiddenAt?.toISOString() ?? null,
			created_at: advice.createdAt.toISOString(),
			updated_at: advice.updatedAt.toISOString(),
			author: advice.author ? {
				id: advice.author.id,
				name: advice.author.name,
				disabled: advice.author.disabled,
			} : null
		};
	}

	private toAdviceSavedResponse(advice: {
		id: number;
		draft: boolean;
		updated_at: string;
		created_at: string;
	}): AdviceSavedResponse {
		return {
			id: advice.id,
			draft: advice.draft,
			updated_at: advice.updated_at,
			created_at: advice.created_at,
		};
	}

	async getConsultation(id: number) :Promise<ConsultationResponse> {
		const consultation = await this.repository.findFirstById(id);
		return this.toConsultationResponse(consultation as unknown as ConsultationEntityById);
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
		data: ConsultationContent,
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
	 * @throws {ForbiddenError} 相談の所有者ではない場合
	 */
	async updateConsultation(
		id: number,
		data: ConsultationContent,
		requestUserId: number
	): Promise<ConsultationSavedResponse> {
    	const existingConsultation = await this.repository.findFirstById(id);

    	// データ所有者とリクエストユーザーが一致するかチェック
    	if (existingConsultation.authorId !== requestUserId) {
       		throw new ForbiddenError('相談の所有者ではないため、更新できません。');
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
	/**
	 * 
	 * 相談に対する回答を作成する
	 * 
	 * @param id - 相談ID
	 * @param data.body - 回答本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @param authorId - 回答者ID（認証ユーザー）
	 * @returns 
	 */
	async createAdvice(id: number, data: AdviceContent, authorId: number): Promise<AdviceResponse> {
		const createdAdvice = await this.repository.createAdvice({
			consultationId: id,
			authorId,
			...data,
		});

		return this.toAdviceResponse(createdAdvice);
	}

	/**
	 * アドバイスの下書きを更新する
	 * 
	 * @param id - 相談ID
	 * @param data.body - 回答本文
	 * @param authorId - 回答者ID（認証ユーザー）
	 * @returns 更新された相談回答のレスポンス
	 */
		async updateDraftAdvice(id: number, data: UpdateDraftAdviceContentSchema, authorId: number): Promise<AdviceSavedResponse> {
			const existingAdvice = await this.repository.findFirstDraftAdvice(id);

			if (existingAdvice.authorId === null) {
				throw new ForbiddenError('相談回答の作成者が退会しているため、更新できません。');
			}
			if (existingAdvice.authorId !== authorId) {
				throw new ForbiddenError('相談回答の所有者ではないため、更新できません。');
			}
			const updatedAdvice = await this.repository.updateDraftAdvice({
				consultationId: id,
				authorId: existingAdvice.authorId,
				body: data.body,
				draft: true,
			});
			return this.toAdviceSavedResponse({
				id: updatedAdvice.id,
				draft: updatedAdvice.draft,
				updated_at: updatedAdvice.updatedAt.toISOString(),
				created_at: updatedAdvice.createdAt.toISOString(),
			});
		}
	}
