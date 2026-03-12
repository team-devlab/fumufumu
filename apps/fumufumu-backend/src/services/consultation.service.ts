import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters, PaginationMeta, PaginationParams } from "@/types/consultation.types";
import type { AdviceFilters } from "@/types/advice.types";
import type { ConsultationResponse, ConsultationListResponse, ConsultationSavedResponse, AdviceSavedResponse } from "@/types/consultation.response";
import type {
	CreateConsultationContent,
	UpdateConsultationContent,
	AdviceContent,
	UpdateDraftAdviceContentSchema,
} from "@/validators/consultation.validator";
import { CompensationFailedError, ForbiddenError, NotFoundError, ValidationError } from "@/errors/AppError";
import type { AdviceListResponse, AdviceResponse } from "@/types/advice.response";
import {
	CONSULTATION_TAG_RULE_MESSAGES,
	getConsultationTagRuleError,
} from "@/rules/consultation-tag.rule";

// Repositoryのメソッドの戻り値から型を抽出
type ConsultationEntity = Awaited<ReturnType<ConsultationRepository["findAll"]>>[number];
type ConsultationEntityById = Awaited<ReturnType<ConsultationRepository["findFirstById"]>>;
type AdviceEntity = Awaited<ReturnType<ConsultationRepository["createAdvice"]>>;
type AdviceEntityFromList = Awaited<ReturnType<ConsultationRepository["findAdvicesByConsultationId"]>>[number];

export class ConsultationService {
	private static readonly BODY_PREVIEW_LENGTH = 100;

	constructor(private repository: ConsultationRepository) {}

	private static toLogError(error: unknown) {
		if (error instanceof Error) {
			return {
				name: error.name,
				message: error.message,
				stack: error.stack,
			};
		}
		return { value: error };
	}
 
	/**
	 * 相談データをレスポンス形式に変換する
	 * * @param consultation - Repository層から取得した相談データ（一覧用 or 詳細用）
	 * @returns API レスポンス形式の相談データ
	 */
	private toConsultationResponse(
		consultation: ConsultationEntity | ConsultationEntityById,
		isDetail: boolean = false
	): ConsultationResponse {
		const response: ConsultationResponse = {
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
            } : null,
        };

        // 詳細時のみ body プロパティを追加する
        if (isDetail) {
            response.body = consultation.body;
			// 【設計メモ：パフォーマンス最適化と実装コスト】
            // 1. パフォーマンス: 一覧取得APIに advices を含めるとデータ量が大きくなるため、意図的に空配列としている。
            // 2. 実装方針: 一覧用/詳細用で厳密に型を分けるとService層の変換ロジック(Mapper)が複雑化するため、
            //    あえて同一のレスポンス型定義を使用し、一覧時はここを空にする運用としている。
            //    詳細取得APIで呼び出す場合に限り、上位メソッドで正しいデータに上書きされる。
           	response.advices = [];
        }

        return response;
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
	 * 相談アドバイスデータをレスポンス形式に変換する
	 * * @param advice - Repository層から取得した相談アドバイスデータ（作成時 or 詳細取得時）
	 * @returns API レスポンス形式の相談アドバイスデータ
	 */
	private toAdviceResponse(advice: AdviceEntity | AdviceEntityFromList): AdviceResponse {
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

	async getConsultation(
		id: number,
		requestUserId: number,
		pagination?: PaginationParams,
	) :Promise<ConsultationResponse> {
		const { page = 1, limit = 20 } = pagination || {};
		const consultation = await this.repository.findFirstById(id);
		const contentCheck = await this.repository.findConsultationContentCheckByConsultationId(id);

		// NOTE: 権限チェック
		const isHidden = consultation.draft || consultation.hiddenAt !== null;
		const isNotApproved = contentCheck !== undefined && contentCheck.status !== "approved";
		if ((isHidden && consultation.authorId !== requestUserId) || isNotApproved) {
			throw new NotFoundError(`相談が見つかりません: id=${id}`);
		}

		const [adviceList, adviceTotalCount] = await Promise.all([
			this.repository.findAdvicesByConsultationId(
				id,
				{ page, limit },
				undefined,
				"asc",
			),
			this.repository.countAdvicesByConsultationId(id),
		]);

		const baseResponse = this.toConsultationResponse(consultation, true);

		return {
			...baseResponse,
			advices: adviceList.map(advice => this.toAdviceResponse(advice)),
			advice_pagination: this.calculatePagination({ page, limit }, adviceTotalCount),
		};
	}

	async listConsultations(
		filters?: ConsultationFilters,
		pagination?: PaginationParams,
		requestUserId?: number,
	): Promise<ConsultationListResponse> {
		const { page = 1, limit = 20 } = pagination || {};

		// NOTE: 元の引数を変更しないようシャローコピーを作成
        const secureFilters = { ...filters };

		// NOTE(【ポリシー】 Secure by Default): 明示的な指定がない限り、機密性の高い下書きは除外する
        if (secureFilters.draft === undefined) {
            secureFilters.draft = false;
        }

		// NOTE(ビジネスロジック): 下書き取得時は、強制的に「自分のデータ」に絞り込む
        if (secureFilters.draft === true) {
			// セキュリティガード: requestUserIdが未定義の場合、Repository側で全件露出するリスクを防ぐため、即時空配列を返す
			// 認証必須のエンドポイントなら本来あり得ないが、安全のため
            if (requestUserId === undefined) {
                 return {
                    data: [],
                    pagination: this.calculatePagination({ page, limit }, 0)
                 };
            }
            secureFilters.userId = requestUserId;
        }

		// 並列で取得（パフォーマンス向上）
		const [consultationList, totalCount] = await Promise.all([
			this.repository.findAll(secureFilters, { page, limit }),
			this.repository.count(secureFilters),
		]);
		const responses = consultationList.map(consultation => this.toConsultationResponse(consultation, false));

		return { 
			data: responses,
			pagination: this.calculatePagination({ page, limit }, totalCount),
		};
	}

	async listAdvices(
		consultationId: number,
		pagination?: PaginationParams,
		requestUserId?: number,
		filters?: AdviceFilters,
	): Promise<AdviceListResponse> {
		const { page = 1, limit = 20 } = pagination || {};

		const consultation = await this.repository.findConsultationByIdForAccessCheck(consultationId);
		const isHiddenConsultation = consultation.draft || consultation.hiddenAt !== null;
		if (isHiddenConsultation && consultation.authorId !== requestUserId) {
			throw new NotFoundError(`相談が見つかりません: id=${consultationId}`);
		}

		const [adviceList, totalCount] = await Promise.all([
			this.repository.findAdvicesByConsultationId(consultationId, { page, limit }, filters),
			this.repository.countAdvicesByConsultationId(consultationId, filters),
		]);

		return {
			data: adviceList.map((advice) => this.toAdviceResponse(advice)),
			pagination: this.calculatePagination({ page, limit }, totalCount),
		};
	}

	/**
	 * ページネーション情報を計算する
	 * @param pagination - ページネーションパラメータ
	 * @param totalCount - 総件数
	 * @returns ページネーション情報
	 */
	private calculatePagination(
		pagination: PaginationParams,
		totalCount: number,
	): PaginationMeta {
		const totalPages = Math.ceil(totalCount / pagination.limit);

		return {
			current_page: pagination.page,
			per_page: pagination.limit,
			total_items: totalCount,
			total_pages: totalPages,
			has_next: pagination.page < totalPages,
			has_prev: pagination.page > 1,
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
		data: CreateConsultationContent,
		authorId: number
	): Promise<ConsultationResponse> {
		const createRuleError = getConsultationTagRuleError(data.draft, data.tagIds);
		if (createRuleError) {
			throw new ValidationError(CONSULTATION_TAG_RULE_MESSAGES[createRuleError]);
		}

		if (data.tagIds?.length) {
			await this.repository.validateTagIdsExist(data.tagIds);
		}

		const createdConsultation = await this.repository.create({
			title: data.title,
			body: data.body,
			draft: data.draft,
			authorId,
		});

		try {
			if (data.tagIds && data.tagIds.length > 0) {
				await this.repository.attachTags(createdConsultation.id, data.tagIds);
			}
		} catch (originalError) {
			console.error("Consultation tag attach failed.", {
				event: "CONSULTATION_CREATION_TAG_ATTACH_FAILED",
				consultationId: createdConsultation.id,
				authorId,
				tagIds: data.tagIds,
				error: ConsultationService.toLogError(originalError),
			});

			try {
				await this.repository.deleteById(createdConsultation.id);
			} catch (rollbackError) {
			    // NOTE: 構造化ログを出力して原因追求に必要な情報の消失を防ぐ
                console.error("Critical: Compensation failed during consultation creation.", {
                    event: "CONSULTATION_CREATION_COMPENSATION_FAILURE",
                    consultationId: createdConsultation.id,
                    authorId,
                    tagIds: data.tagIds,
                    originalError: ConsultationService.toLogError(originalError),
                    rollbackError: ConsultationService.toLogError(rollbackError),
                });
                
                throw new CompensationFailedError(
                    `相談作成のタグ処理で失敗し、補償削除(ID:${createdConsultation.id})にも失敗しました。手動でのデータ削除(SQL etc.)が必要です。`
                );
			}
			throw originalError;
		}

		if (!data.draft) {
			try {
				await this.repository.createConsultationContentCheck(createdConsultation.id);
			} catch (originalError) {
				console.error("Consultation content-check creation failed.", {
					event: "CONSULTATION_CREATION_CONTENT_CHECK_FAILED",
					consultationId: createdConsultation.id,
					authorId,
					error: ConsultationService.toLogError(originalError),
				});

				try {
					await this.repository.deleteById(createdConsultation.id);
				} catch (rollbackError) {
					console.error("Critical: Compensation failed during consultation content-check creation.", {
						event: "CONSULTATION_CREATION_CONTENT_CHECK_COMPENSATION_FAILURE",
						consultationId: createdConsultation.id,
						authorId,
						originalError: ConsultationService.toLogError(originalError),
						rollbackError: ConsultationService.toLogError(rollbackError),
					});
					throw new CompensationFailedError(
						`投稿チェック作成で失敗し、補償削除(ID:${createdConsultation.id})にも失敗しました。手動でのデータ削除が必要です。`,
					);
				}

				throw originalError;
			}
		}

		return this.toConsultationResponse(createdConsultation, true);
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
		data: UpdateConsultationContent,
		requestUserId: number
	): Promise<ConsultationSavedResponse> {
    	const existingConsultation = await this.repository.findFirstById(id);

    	if (existingConsultation.authorId !== requestUserId) {
    		throw new ForbiddenError('相談の所有者ではないため、更新できません。');
    	}

		const updateRuleError = getConsultationTagRuleError(data.draft, data.tagIds);
		if (updateRuleError) {
			throw new ValidationError(CONSULTATION_TAG_RULE_MESSAGES[updateRuleError]);
		}
    	
		const updatedConsultation = await this.repository.update({
			id,
			title: data.title,
			body: data.body,
			draft: data.draft,
			authorId: existingConsultation.authorId ?? requestUserId,
			tagIds: data.tagIds,
		})
			.catch((error) => {
				if (data.tagIds !== undefined) {
					console.error("Consultation update with tag replacement failed.", {
						event: "CONSULTATION_UPDATE_WITH_TAG_REPLACEMENT_FAILED",
						consultationId: id,
						requestUserId,
						draft: data.draft,
						tagIds: data.tagIds,
						error: ConsultationService.toLogError(error),
					});
				}
				throw error;
			});

		return this.toConsultationSavedResponse({
			id: updatedConsultation.id,
			draft: updatedConsultation.draft,
			updated_at: updatedConsultation.updatedAt.toISOString(),
		});
	}
	
	/**
	 * 
	 * 相談に対するアドバイスを作成する
	 * 
	 * @param id - 相談ID
	 * @param data.body - アドバイス本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @param authorId - アドバイス者ID（認証ユーザー）
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
	 * @param data.body - アドバイス本文
	 * @param authorId - アドバイス者ID（認証ユーザー）
	 * @returns 更新された相談アドバイスのレスポンス
	 */
		async updateDraftAdvice(id: number, data: UpdateDraftAdviceContentSchema, authorId: number): Promise<AdviceSavedResponse> {
			const existingAdvice = await this.repository.findFirstAdviceByConsultation(id, authorId);
			if (!existingAdvice) {
				throw new NotFoundError(`指定された相談アドバイス(consultationId:${id})は見つかりませんでした`);
			}
			if (existingAdvice.draft === false) {
				throw new NotFoundError('相談アドバイスは公開されているため、更新できません。');
			}
			const updatedAdvice = await this.repository.updateDraftAdvice({
				consultationId: id,
				authorId: authorId,
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

	async listPendingConsultationContentChecks() {
		const rows = await this.repository.listPendingConsultationContentChecks();
		return {
			consultations: rows.map((row) => ({
				id: row.id,
				status: row.status,
				created_at: row.createdAt.toISOString(),
			})),
		};
	}

	async findPendingConsultationsByIds(ids: number[]) {
		const [statuses, pendingConsultations] = await Promise.all([
			this.repository.findConsultationContentCheckStatusesByIds(ids),
			this.repository.findPendingConsultationDetailsByIds(ids),
		]);

		const statusById = new Map(statuses.map((row) => [row.targetId, row.status]));
		const pendingIdSet = new Set(pendingConsultations.map((row) => row.id));

		const missingIds = ids.filter((id) => !statusById.has(id));
		const nonPending = ids
			.filter((id) => statusById.has(id) && !pendingIdSet.has(id))
			.map((id) => ({
				id,
				current_status: statusById.get(id)!,
			}));

		return {
			consultations: pendingConsultations.map((row) => ({
				id: row.id,
				title: row.title,
				body: row.body,
				author_id: row.authorId,
				status: row.status,
				created_at: row.createdAt.toISOString(),
			})),
			missing_ids: missingIds,
			non_pending: nonPending,
		};
	}

	async decideConsultationContentCheck(
		consultationId: number,
		decision: "approved" | "rejected",
		reason?: string,
	) {
		const updated = await this.repository.updateConsultationContentCheckDecision(
			consultationId,
			decision,
			reason,
		);

		return {
			consultation_id: consultationId,
			status: updated.status,
			reason: updated.reason,
			checked_at: updated.checkedAt?.toISOString() ?? null,
			updated_at: updated.updatedAt.toISOString(),
		};
	}
	}
