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
import type { ContentCheckStatus } from "@/db/schema/content-checks";
import {
	CONSULTATION_TAG_RULE_MESSAGES,
	getConsultationTagRuleError,
} from "@/rules/consultation-tag.rule";

// Repositoryのメソッドの戻り値から型を抽出
type ConsultationEntity = Awaited<ReturnType<ConsultationRepository["findAll"]>>[number];
type ConsultationEntityById = Awaited<ReturnType<ConsultationRepository["findFirstById"]>>;
type AdviceEntity = Awaited<ReturnType<ConsultationRepository["createAdvice"]>>;
type AdviceEntityFromList = Awaited<ReturnType<ConsultationRepository["findAdvicesByConsultationId"]>>[number];
// 相談横断の一覧(findAllAdvices)だけは reviewStatus を持つ(own-view の審査状態表示, #179)。
// findAdvicesByConsultationId(相談スコープ)には付かないため型を分ける。
type AdviceEntityFromGlobalList = Awaited<ReturnType<ConsultationRepository["findAllAdvices"]>>[number];

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

        // reviewStatus を持つエンティティ(own-view 一覧 findAll 経由)にのみ review_status を付与する(#179)。
        // 承認済みのみ返る一覧やチェック未登録の既存データは NULL のため "approved" へ寄せ、
        // 本人が pending/rejected(投稿チェック中/公開見送り)を判別できるようにする。
        // 詳細は getConsultation が本人向けに review_status を後付けする(#179 Phase2)。作成レスポンスには付与しない。
        if ("reviewStatus" in consultation) {
            const reviewStatus: ContentCheckStatus | null = consultation.reviewStatus;
            response.review_status = reviewStatus ?? "approved";
        }

        // 詳細時のみ body プロパティを追加する
        if (isDetail) {
            response.body = consultation.body;
			// 【設計メモ：パフォーマンス最適化と実装コスト】
            // 1. パフォーマンス: 一覧取得APIに advices を含めるとデータ量が大きくなるため、意図的に空配列としている。
            // 2. 実装方針: 一覧用/詳細用で厳密に型を分けるとService層の変換ロジック(Mapper)が複雑化するため、
            //    あえて同一のレスポンス型定義を使用し、一覧時はここを空にする運用としている。
            //    詳細取得APIで呼び出す場合に限り、上位メソッドで正しいデータに上書きされる。
           	response.advices = [];
           	// tags も advices と同様、詳細取得時のみ上位メソッド(getConsultation)で実データに上書きする。
           	response.tags = [];
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
	private toAdviceResponse(advice: AdviceEntity | AdviceEntityFromList | AdviceEntityFromGlobalList): AdviceResponse {
		const response: AdviceResponse = {
			id: advice.id,
			consultation_id: advice.consultationId,
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

		// 相談横断の own-view 一覧(findAllAdvices)経由のエンティティのみ reviewStatus を持つ(#179)。
		// 承認済みのみ返る一覧やチェック未登録の既存データは NULL → "approved" に寄せ、相談側と対称に扱う。
		// 相談スコープ(findAdvicesByConsultationId)や作成レスポンスには付与しない(Phase2で別途)。
		if ("reviewStatus" in advice) {
			const reviewStatus: ContentCheckStatus | null = advice.reviewStatus;
			response.review_status = reviewStatus ?? "approved";
		}

		return response;
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

	private async attachTagsOrRollback(
		consultationId: number,
		authorId: number,
		tagIds?: number[],
	): Promise<void> {
		if (!tagIds || tagIds.length === 0) {
			return;
		}

		try {
			await this.repository.attachTags(consultationId, tagIds);
		} catch (originalError) {
			console.error("Consultation tag attach failed.", {
				event: "CONSULTATION_CREATION_TAG_ATTACH_FAILED",
				consultationId,
				authorId,
				tagIds,
				error: ConsultationService.toLogError(originalError),
			});

			try {
				await this.repository.deleteById(consultationId);
			} catch (rollbackError) {
				// NOTE: 構造化ログを出力して原因追求に必要な情報の消失を防ぐ
				console.error("Critical: Compensation failed during consultation creation.", {
					event: "CONSULTATION_CREATION_COMPENSATION_FAILURE",
					consultationId,
					authorId,
					tagIds,
					originalError: ConsultationService.toLogError(originalError),
					rollbackError: ConsultationService.toLogError(rollbackError),
				});

				throw new CompensationFailedError(
					`相談作成のタグ処理で失敗し、補償削除(ID:${consultationId})にも失敗しました。手動でのデータ削除(SQL etc.)が必要です。`,
				);
			}

			throw originalError;
		}
	}

	private async createContentCheckOrRollback(
		consultationId: number,
		authorId: number,
	): Promise<void> {
		try {
			await this.repository.createConsultationContentCheck(consultationId);
		} catch (originalError) {
			console.error("Consultation content-check creation failed.", {
				event: "CONSULTATION_CREATION_CONTENT_CHECK_FAILED",
				consultationId,
				authorId,
				error: ConsultationService.toLogError(originalError),
			});

			try {
				await this.repository.deleteById(consultationId);
			} catch (rollbackError) {
				console.error("Critical: Compensation failed during consultation content-check creation.", {
					event: "CONSULTATION_CREATION_CONTENT_CHECK_COMPENSATION_FAILURE",
					consultationId,
					authorId,
					originalError: ConsultationService.toLogError(originalError),
					rollbackError: ConsultationService.toLogError(rollbackError),
				});
				throw new CompensationFailedError(
					`投稿チェック作成で失敗し、補償削除(ID:${consultationId})にも失敗しました。手動でのデータ削除が必要です。`,
				);
			}

			throw originalError;
		}
	}

	private async assertConsultationReadableOrThrow(
		consultationId: number,
		consultation: {
			authorId: number | null;
			draft: boolean;
			hiddenAt: Date | null;
		},
		requestUserId?: number,
		includeHidden?: boolean,
	): Promise<ContentCheckStatus | null> {
		const contentCheck = await this.repository.findConsultationContentCheckByConsultationId(consultationId);
		// 著者本人か（未認証・作者不明は本人扱いにしない fail-closed）。draft/未承認の緩和はこの isOwner に集約する。
		const isOwner = requestUserId !== undefined && consultation.authorId === requestUserId;
		// draftは著者本人のみ閲覧可能（自分の下書き編集のため）
		const isDraftAndNotOwner = consultation.draft && !isOwner;
		// モデレーションによるhiddenは著者本人にも効かせる（advice hideと挙動を揃える）。
		// includeHidden(admin限定・コントローラ層でrole検証済み)の場合のみバイパスする
		const isHiddenByModeration = consultation.hiddenAt !== null && !includeHidden;
		// 未承認(pending/rejected=投稿チェック中/公開見送り)は本人にのみ開放する(#179 Phase2)。
		// 他人は従来通り404でfail-closed。本人が自分の相談詳細で公開前状態を把握できるようにするための緩和。
		const isNotApprovedAndNotOwner =
			contentCheck !== undefined && contentCheck.status !== "approved" && !isOwner;
		if (isDraftAndNotOwner || isHiddenByModeration || isNotApprovedAndNotOwner) {
			throw new NotFoundError(`相談が見つかりません: id=${consultationId}`);
		}

		// 呼び出し元(getConsultation)が review_status を返すために content_check の状態を返す。
		// この判定で引いた結果を使い回し、追加クエリを避ける。未登録(既存データ)は null。
		return contentCheck?.status ?? null;
	}

	async getConsultation(
		id: number,
		requestUserId: number,
		pagination?: PaginationParams,
	) :Promise<ConsultationResponse> {
		const { page = 1, limit = 20 } = pagination || {};
		const consultation = await this.repository.findFirstById(id);
		const reviewStatus = await this.assertConsultationReadableOrThrow(id, consultation, requestUserId);

		const [adviceList, adviceTotalCount, tagList] = await Promise.all([
			this.repository.findAdvicesByConsultationId(
				id,
				{ page, limit },
				undefined,
				"asc",
			),
			this.repository.countAdvicesByConsultationId(id),
			this.repository.findTagsByConsultationId(id),
		]);

		const baseResponse = this.toConsultationResponse(consultation, true);
		// #179 Phase2: 本人が自分の相談詳細で投稿チェック中/公開見送りを把握できるよう review_status を返す。
		// 本人以外はそもそも未承認に到達できない(404)ため実質 approved のみが返る。null(既存データ)は approved 相当。
		baseResponse.review_status = reviewStatus ?? "approved";

		return {
			...baseResponse,
			advices: adviceList.map(advice => this.toAdviceResponse(advice)),
			advice_pagination: this.calculatePagination({ page, limit }, adviceTotalCount),
			tags: tagList.map((tag) => ({ id: tag.id, name: tag.name })),
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

		if (
			secureFilters.draft !== true &&
			secureFilters.userId !== undefined &&
			requestUserId !== undefined &&
			secureFilters.userId === requestUserId
		) {
			secureFilters.includeUnapprovedForOwn = true;
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
		await this.assertConsultationReadableOrThrow(consultationId, consultation, requestUserId, filters?.includeHidden);

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
	 * 相談横断のアドバイス一覧を取得する。
	 *
	 * 【設計メモ】プロフィール画面の「自分のアドバイス一覧」(userIdフィルタ)と、
	 * admin モデレーションの「公開中/非表示中」タブ(includeHidden/hiddenOnly、コントローラ層で
	 * role検証済み)の両方から利用する共通APIとして設計している。
	 * 特定相談スコープの listAdvices と異なり、対象相談を1件に固定できないため、
	 * 親相談自体の非公開判定(draft/hidden/未承認)は Repository層のSQL(exists条件)で
	 * 行毎に検証する（buildAdviceParentVisibilityCondition, ADR 011 §4.1 のcascadeと同義）。
	 */
	async listAllAdvices(
		filters?: AdviceFilters,
		pagination?: PaginationParams,
		requestUserId?: number,
	): Promise<AdviceListResponse> {
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
					pagination: this.calculatePagination({ page, limit }, 0),
				};
			}
			secureFilters.userId = requestUserId;
		}

		// 本人が自分のuserIdで一覧を引く場合のみ、未承認(pending/rejected)の自分のアドバイスも含める(#179)。
		// 相談側 listConsultations と対称。他人のuserId指定では立てないため、他人の未承認は露出しない。
		if (
			secureFilters.draft !== true &&
			secureFilters.userId !== undefined &&
			requestUserId !== undefined &&
			secureFilters.userId === requestUserId
		) {
			secureFilters.includeUnapprovedForOwn = true;
		}

		const [adviceList, totalCount] = await Promise.all([
			this.repository.findAllAdvices(secureFilters, { page, limit }),
			this.repository.countAdvices(secureFilters),
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

		await this.attachTagsOrRollback(createdConsultation.id, authorId, data.tagIds);

		if (!data.draft) {
			await this.createContentCheckOrRollback(createdConsultation.id, authorId);
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

		const shouldQueueContentCheck = existingConsultation.draft === true && data.draft === false;
    	
		const updatedConsultation = await this.repository.update({
			id,
			title: data.title,
			body: data.body,
			draft: data.draft,
			authorId: existingConsultation.authorId ?? requestUserId,
			tagIds: data.tagIds,
			queueContentCheck: shouldQueueContentCheck,
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
	 * アドバイスの下書きを adviceId で更新する（引き当てを adviceId にした経緯は ADR 012）。
	 * 本人以外の id は引き当たらず404(IDOR: fail-closed)、公開済みは更新拒否。
	 *
	 * @param adviceId - アドバイスID
	 * @param data.body - アドバイス本文
	 * @param authorId - アドバイス者ID（認証ユーザー）
	 * @returns 更新された相談アドバイスのレスポンス
	 */
		async updateDraftAdvice(adviceId: number, data: UpdateDraftAdviceContentSchema, authorId: number): Promise<AdviceSavedResponse> {
			const existingAdvice = await this.repository.findAdviceByIdForAuthor(adviceId, authorId);
			if (existingAdvice.draft === false) {
				throw new NotFoundError('相談アドバイスは公開されているため、更新できません。');
			}
			const updatedAdvice = await this.repository.updateDraftAdviceById({
				adviceId,
				authorId,
				body: data.body,
			});
			return this.toAdviceSavedResponse({
				id: updatedAdvice.id,
				draft: updatedAdvice.draft,
				updated_at: updatedAdvice.updatedAt.toISOString(),
				created_at: updatedAdvice.createdAt.toISOString(),
			});
		}

	/**
	 * アドバイスの下書きを公開へ昇格する（ADR 012 追補: C）。
	 * 本人以外の id は引き当たらず404(IDOR: fail-closed)、公開済みは再公開不可。
	 * 公開可否は可視な親相談に限る（repository の findVisibleConsultationOrThrow）。
	 *
	 * @param adviceId - アドバイスID
	 * @param data.body - アドバイス本文（entry で未保存の編集も確認画面から公開反映するため受け取る）
	 * @param authorId - アドバイス者ID（認証ユーザー）
	 * @returns 公開された相談アドバイスのレスポンス
	 */
	async publishDraftAdvice(adviceId: number, data: UpdateDraftAdviceContentSchema, authorId: number): Promise<AdviceSavedResponse> {
		const existingAdvice = await this.repository.findAdviceByIdForAuthor(adviceId, authorId);
		if (existingAdvice.draft === false) {
			throw new NotFoundError('相談アドバイスは既に公開されているため、公開できません。');
		}
		const publishedAdvice = await this.repository.publishDraftAdviceById({
			adviceId,
			authorId,
			consultationId: existingAdvice.consultationId,
			body: data.body,
		});
		return this.toAdviceSavedResponse({
			id: publishedAdvice.id,
			draft: publishedAdvice.draft,
			updated_at: publishedAdvice.updatedAt.toISOString(),
			created_at: publishedAdvice.createdAt.toISOString(),
		});
	}

}
