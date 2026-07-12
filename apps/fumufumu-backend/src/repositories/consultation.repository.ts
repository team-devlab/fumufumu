import { consultations } from "@/db/schema/consultations";
import { users } from "@/db/schema/user";
import { consultationTaggings, tags } from "@/db/schema/tags";
import type { DbInstance } from "@/index";
import { eq, and, isNull, isNotNull, inArray, type SQL, sql, exists, notExists, or } from "drizzle-orm";
import type { ConsultationFilters, PaginationParams } from "@/types/consultation.types";
import { PAGINATION_CONFIG } from "@/types/consultation.types";
import type { AdviceFilters } from "@/types/advice.types";
import { DatabaseError, ConflictError, NotFoundError } from "@/errors/AppError";
import { advices } from "@/db/schema/advices";
import { contentChecks, type ContentCheckStatus, type ContentCheckTargetType } from "@/db/schema/content-checks";


export class ConsultationRepository {
	constructor(private db: DbInstance) {}

	private async insertConsultation(data: {
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
	}) {
		const [inserted] = await this.db
			.insert(consultations)
			.values({
				title: data.title,
				body: data.body,
				draft: data.draft,
				authorId: data.authorId,
			})
			.returning();

		if (!inserted) {
			throw new DatabaseError("相談の作成に失敗しました: insert操作がデータを返しませんでした");
		}

		return inserted;
	}

	private async validateAndInsertTaggings(consultationId: number, tagIds: number[]) {
		const uniqueTagIds = [...new Set(tagIds)];
		if (uniqueTagIds.length === 0) return;

		await this.db.insert(consultationTaggings).values(
			uniqueTagIds.map((tagId) => ({ consultationId, tagId })),
		);
	}

	async validateTagIdsExist(tagIds: number[]): Promise<number[]> {
		const uniqueTagIds = [...new Set(tagIds)];
		if (uniqueTagIds.length === 0) return uniqueTagIds;

		const existingTags = await this.db
			.select({ id: tags.id })
			.from(tags)
			.where(inArray(tags.id, uniqueTagIds));

		const existingTagIdSet = new Set(existingTags.map((tag) => tag.id));
		const missingTagIds = uniqueTagIds.filter((tagId) => !existingTagIdSet.has(tagId));

		if (missingTagIds.length > 0) {
			throw new ConflictError(`存在しないタグIDが含まれています: ${missingTagIds.join(", ")}`);
		}

		return uniqueTagIds;
	}

	private async findAuthorOrThrow(authorId: number) {
		const author = await this.db.query.users.findFirst({
			where: eq(users.id, authorId),
		});

		if (!author) {
			throw new NotFoundError(`指定されたユーザーが見つかりません: authorId=${authorId}`);
		}

		return author;
	}

	private async findVisibleConsultationOrThrow(consultationId: number) {
		const consultation = await this.db.query.consultations.findFirst({
			columns: { id: true },
			where: and(
				eq(consultations.id, consultationId),
				this.buildPublicConsultationCondition(),
			),
		});

		if (!consultation) {
			throw new NotFoundError(`指定された相談(ID:${consultationId})は見つかりませんでした`);
		}

		return consultation;
	}

	private buildPublicVisibilityCondition(): SQL {
		const approvedCheckExists = exists(
			this.db
				.select({ id: contentChecks.id })
				.from(contentChecks)
				.where(
					and(
						eq(contentChecks.targetType, "consultation"),
						eq(contentChecks.targetId, consultations.id),
						eq(contentChecks.status, "approved"),
					),
				),
		);

		const noCheckExists = notExists(
			this.db
				.select({ id: contentChecks.id })
				.from(contentChecks)
				.where(
					and(
						eq(contentChecks.targetType, "consultation"),
						eq(contentChecks.targetId, consultations.id),
					),
				),
		);

		// 既存データ(no-check)は表示を維持しつつ、check付きは approved のみ表示する
		return or(approvedCheckExists, noCheckExists) as SQL;
	}

	/**
	 * own-view 一覧の各アイテムに審査状態(reviewStatus)を付与する(#179)。
	 * 相関サブクエリを RQB の extras に載せる方式は `with` 併用時に外側行へ相関せず NULL に
	 * なるため採らず、一覧取得後に対象IDの content_checks を IN で一括取得してマップで引き当てる。
	 * content_checks は (target_type,target_id) が uq 制約で一意なので targetId → status は1対1。
	 * チェック未登録(既存データ)は NULL を返し、Service層で "approved" 相当へ寄せる。
	 * 相談・アドバイスの一覧で対称に使う。
	 */
	private async attachReviewStatus<T extends { id: number }>(
		rows: T[],
		targetType: ContentCheckTargetType,
	): Promise<Array<T & { reviewStatus: ContentCheckStatus | null }>> {
		if (rows.length === 0) {
			return [];
		}

		const ids = rows.map((row) => row.id);
		const checks = await this.db
			.select({ targetId: contentChecks.targetId, status: contentChecks.status })
			.from(contentChecks)
			.where(and(eq(contentChecks.targetType, targetType), inArray(contentChecks.targetId, ids)));

		const statusById = new Map<number, ContentCheckStatus>(
			checks.map((check) => [check.targetId, check.status]),
		);

		return rows.map((row) => ({ ...row, reviewStatus: statusById.get(row.id) ?? null }));
	}

	private buildPublicConsultationCondition(): SQL {
		return and(
			eq(consultations.draft, false),
			isNull(consultations.hiddenAt),
			this.buildPublicVisibilityCondition(),
		) as SQL;
	}

	private buildAdvicePublicVisibilityCondition(): SQL {
		const approvedCheckExists = exists(
			this.db
				.select({ id: contentChecks.id })
				.from(contentChecks)
				.where(
					and(
						eq(contentChecks.targetType, "advice"),
						eq(contentChecks.targetId, advices.id),
						eq(contentChecks.status, "approved"),
					),
				),
		);

		const noCheckExists = notExists(
			this.db
				.select({ id: contentChecks.id })
				.from(contentChecks)
				.where(
					and(
						eq(contentChecks.targetType, "advice"),
						eq(contentChecks.targetId, advices.id),
					),
				),
		);

		// 既存データ(no-check)は表示を維持しつつ、check付きは approved のみ表示する
		return or(approvedCheckExists, noCheckExists) as SQL;
	}

	/**
	 * フィルタ条件からWHERE句を構築する（findAll / count 共通）
	 */
	private buildWhereConditions(filters?: ConsultationFilters): SQL | undefined {
		const conditions: SQL[] = [];

		if (filters?.userId !== undefined) {
            conditions.push(eq(consultations.authorId, filters.userId));
        }

		if (filters?.solved !== undefined) {
			conditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		if (filters?.draft === true) {
			// fail-closed: userIdが無いまま下書きを引くと全ユーザー分が露出する。
			// Serviceガードをすり抜けた直叩きでも漏らさないよう、常に0件になる条件を返す。
			if (filters?.userId === undefined) {
				return sql`1 = 0`;
			}

			conditions.push(eq(consultations.draft, true));
			conditions.push(isNull(consultations.hiddenAt));
		} else {
			conditions.push(eq(consultations.draft, false));

			if (filters?.hiddenOnly) {
				conditions.push(isNotNull(consultations.hiddenAt));
			} else if (!filters?.includeHidden) {
				conditions.push(isNull(consultations.hiddenAt));
			}

			// hiddenOnly/includeHidden(admin)でもbuildPublicVisibilityConditionは意図的に外さない。
			// モデレーションは「承認済みコンテンツの事後hide/unhide」を対象とする方針(ADR 011 §5.1、
			// approve→事後hideのフロー)であり、未承認(pending/rejected)投稿はcontent-checkの
			// 投稿チェック待ちタブで扱う。よって「未承認かつhidden」は非表示中タブの対象外(承認後に現れる)。
			if (!filters?.includeUnapprovedForOwn) {
				conditions.push(this.buildPublicVisibilityCondition());
			}
		}

		return conditions.length > 0 ? and(...conditions) : undefined;
	}

	/**
	 * 相談横断のアドバイス一覧で、親相談自体が非公開(draft/hidden/未承認)なら
	 * アドバイス自身の状態に関わらず到達不可にする(cascade, ADR 011 §4.1)。
	 * consultationIdでスコープされた既存の /:id/advices は呼び出し元Service層の
	 * assertConsultationReadableOrThrowで親を検証済みのため、本条件は適用しない。
	 */
	private buildAdviceParentVisibilityCondition(): SQL {
		return exists(
			this.db
				.select({ id: consultations.id })
				.from(consultations)
				.where(
					and(
						eq(consultations.id, advices.consultationId),
						this.buildPublicConsultationCondition(),
					),
				),
		) as SQL;
	}

	/**
	 * アドバイス一覧のWHERE句を構築する
	 * （findAdvicesByConsultationId / countAdvicesByConsultationId / findAllAdvices / countAdvices 共通）
	 *
	 * @param filters.consultationId - 指定時は特定の相談配下に絞り込む（未指定時は相談横断の一覧になる）
	 */
	private buildAdviceWhereConditions(filters?: AdviceFilters & { consultationId?: number }): SQL {
		// 下書きは本人限定の非公開データ。公開可視性(承認)や親相談の可視性は適用せず、
		// 著者スコープ(呼び出し元ServiceでuserIdを本人へ強制)とhidden除外のみで絞る。
		// 相談の下書き(buildWhereConditions の draft 分岐)と同じ扱い。
		if (filters?.draft === true) {
			// fail-closed: userIdが無いまま下書きを引くと全ユーザー分が露出する。
			// Serviceガードをすり抜けた直叩きでも漏らさないよう、常に0件になる条件を返す。
			if (filters?.userId === undefined) {
				return sql`1 = 0`;
			}

			const draftConditions: SQL[] = [
				eq(advices.draft, true),
				isNull(advices.hiddenAt),
			];

			if (filters?.consultationId !== undefined) {
				draftConditions.push(eq(advices.consultationId, filters.consultationId));
			}

			if (filters?.userId !== undefined) {
				draftConditions.push(eq(advices.authorId, filters.userId));
			}

			return and(...draftConditions) as SQL;
		}

		// 本人の own-view(userId===本人 のとき Service が includeUnapprovedForOwn を立てる)では
		// アドバイス自身の承認済みonly条件を外し、本人の pending/rejected も一覧に含める(#179、相談側と対称)。
		// fail-closed: userId 未指定のまま緩めると他人の未承認まで露出するため、userId が伴う場合に限る
		// (advices.controller.ts が懸念していた「他人userId指定時に未承認が混入しない」の担保)。
		const includeOwnUnapproved =
			filters?.includeUnapprovedForOwn === true && filters?.userId !== undefined;

		const conditions: SQL[] = [eq(advices.draft, false)];

		if (!includeOwnUnapproved) {
			conditions.push(this.buildAdvicePublicVisibilityCondition());
		}

		if (filters?.consultationId !== undefined) {
			conditions.push(eq(advices.consultationId, filters.consultationId));
		}

		if (filters?.hiddenOnly) {
			conditions.push(isNotNull(advices.hiddenAt));
		} else if (!filters?.includeHidden) {
			conditions.push(isNull(advices.hiddenAt));
		}

		// 相談横断の一覧(consultationId未指定)かつ非admin相当のクエリの場合のみ、親相談の可視性を追加検証する。
		// admin(includeHidden/hiddenOnly)は個別にhideしたアドバイスを親の状態と無関係に管理できる必要があるため対象外。
		if (filters?.consultationId === undefined && !filters?.includeHidden && !filters?.hiddenOnly) {
			conditions.push(this.buildAdviceParentVisibilityCondition());
		}

		if (filters?.userId !== undefined) {
			conditions.push(eq(advices.authorId, filters.userId));
		}

		return and(...conditions) as SQL;
	}

	async findFirstById(id: number) {
		const consultation = await this.db.query.consultations.findFirst({
			where: eq(consultations.id, id),
			with: {
				author: true,
			},
		});

		if (!consultation) {
			throw new NotFoundError(`相談が見つかりません: id=${id}`);
		}

		return consultation;
	}

	async findConsultationByIdForAccessCheck(id: number) {
		const consultation = await this.db.query.consultations.findFirst({
			columns: {
				id: true,
				authorId: true,
				draft: true,
				hiddenAt: true,
			},
			where: eq(consultations.id, id),
		});

		if (!consultation) {
			throw new NotFoundError(`相談が見つかりません: id=${id}`);
		}

		return consultation;
	}

	/**
	 * 相談に紐づくタグ一覧を取得する。
	 * 一覧(findAll)には含めず、詳細取得の合成でのみ利用する（advices と同じ流儀）。
	 * 並び順はタグマスタと揃えるため sortOrder 昇順（同値は id 昇順で安定化）。
	 */
	async findTagsByConsultationId(consultationId: number) {
		return await this.db
			.select({
				id: tags.id,
				name: tags.name,
				sortOrder: tags.sortOrder,
			})
			.from(consultationTaggings)
			.innerJoin(tags, eq(consultationTaggings.tagId, tags.id))
			.where(eq(consultationTaggings.consultationId, consultationId))
			.orderBy(tags.sortOrder, tags.id);
	}

	/**
	 * 相談一覧を取得する（RQB使用）
	 * 
	 * @param filters - フィルタ条件（オプショナル）
	 * @param filters.userId - 著者IDで絞り込み
	 * @param filters.draft - 下書き状態で絞り込み（true: 下書きのみ, false: 公開済みのみ）
	 * @param filters.solved - 解決状態で絞り込み（true: 解決済みのみ, false: 未解決のみ）
	 * @returns 相談データと著者情報の配列（authorは退会済みの場合null）
	 * @throws {Error} データベースクエリ実行エラー（上位層で処理）
	 */
	async findAll(filters?: ConsultationFilters, pagination?: PaginationParams) {
		const { page = PAGINATION_CONFIG.DEFAULT_PAGE, limit = PAGINATION_CONFIG.DEFAULT_LIMIT } = pagination || {};
		const offset = (page - 1) * limit;

		const rows = await this.db.query.consultations.findMany({
			where: this.buildWhereConditions(filters),
			orderBy: (fields, { desc }) => [desc(fields.createdAt), desc(fields.id)],
			limit: limit,
			offset: offset,
			with: {
				author: true,
			},
		});

		return await this.attachReviewStatus(rows, "consultation");
	}

	/**
	 * 相談の総件数を取得する（フィルタ適用後）
	 * @param filters - フィルタ条件（オプショナル）
	 * @returns 相談の総件数
	 */
	async count(filters?: ConsultationFilters): Promise<number> {
		// NOTE: DrizzleのRQBには専用のcount()メソッドが存在しないため、
		// Core APIを使用してCOUNT(*)クエリを実行しています。
		// この方法が最もパフォーマンスが良く、Drizzle公式の推奨パターンです。
		const result = await this.db
		.select({ count: sql<number>`count(*)` })
		.from(consultations)
		.where(this.buildWhereConditions(filters));
	
		return result[0]?.count || 0;
	}

	async findAdvicesByConsultationId(
		consultationId: number,
		pagination?: PaginationParams,
		filters?: AdviceFilters,
		sortOrder: "asc" | "desc" = "desc",
	) {
		const { page = PAGINATION_CONFIG.DEFAULT_PAGE, limit = PAGINATION_CONFIG.DEFAULT_LIMIT } = pagination || {};
		const offset = (page - 1) * limit;

		return await this.db.query.advices.findMany({
			where: this.buildAdviceWhereConditions({ ...filters, consultationId }),
			orderBy: (fields, { asc, desc }) =>
				sortOrder === "asc"
					? [asc(fields.createdAt), asc(fields.id)]
					: [desc(fields.updatedAt), desc(fields.id)],
			limit,
			offset,
			with: {
				author: true,
			},
		});
	}

	async countAdvicesByConsultationId(
		consultationId: number,
		filters?: AdviceFilters,
	): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(advices)
			.where(this.buildAdviceWhereConditions({ ...filters, consultationId }));

		return result[0]?.count || 0;
	}

	/**
	 * 相談横断のアドバイス一覧を取得する（プロフィール画面の「自分のアドバイス一覧」、
	 * admin モデレーションの「公開中/非表示中」タブの両方から利用する想定）
	 */
	async findAllAdvices(filters?: AdviceFilters, pagination?: PaginationParams) {
		const { page = PAGINATION_CONFIG.DEFAULT_PAGE, limit = PAGINATION_CONFIG.DEFAULT_LIMIT } = pagination || {};
		const offset = (page - 1) * limit;

		const rows = await this.db.query.advices.findMany({
			where: this.buildAdviceWhereConditions(filters),
			orderBy: (fields, { desc }) => [desc(fields.createdAt), desc(fields.id)],
			limit,
			offset,
			with: {
				author: true,
			},
		});

		return await this.attachReviewStatus(rows, "advice");
	}

	/**
	 * 相談横断のアドバイス総件数を取得する（findAllAdvices と対）
	 */
	async countAdvices(filters?: AdviceFilters): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(advices)
			.where(this.buildAdviceWhereConditions(filters));

		return result[0]?.count || 0;
	}

	/**
	 * 相談を新規作成する
	 * 
	 * @param data - 作成する相談データ
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @param data.authorId - 投稿者ID（認証ユーザー）
	 * @returns 作成された相談データ（authorリレーション含む）
	 * @throws {Error} データベースエラー、作成失敗時
	 */
	async create(data: {
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
	}) {
		try {
			const inserted = await this.insertConsultation(data);
			const author = await this.findAuthorOrThrow(data.authorId);
			return {
				...inserted,
				author,
			};
		} catch (error) {
			// AppErrorの場合はそのまま再スロー
			if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
				throw error;
			}

			// D1/Drizzleのエラーを処理
			const errorMessage = (error as Error).message || String(error);
			
			// UNIQUE制約違反
			if (errorMessage.includes('UNIQUE constraint failed')) {
				throw new ConflictError("同じデータが既に存在します");
			}
			
			// FOREIGN KEY制約違反
			if (errorMessage.includes('FOREIGN KEY constraint failed')) {
				throw new ConflictError("指定されたユーザーが存在しません");
			}

			// その他のデータベースエラー
			throw new DatabaseError(`データベースエラーが発生しました: ${errorMessage}`);
		}
	}

	async attachTags(consultationId: number, tagIds: number[]) {
		try {
			await this.validateAndInsertTaggings(consultationId, tagIds);
		} catch (error) {
			if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
				throw error;
			}

			const errorMessage = (error as Error).message || String(error);
			if (errorMessage.includes("UNIQUE constraint failed")) {
				throw new ConflictError("同じタグ付けが既に存在します");
			}

			if (errorMessage.includes("FOREIGN KEY constraint failed")) {
				throw new ConflictError("指定されたタグまたは相談が存在しません");
			}

			throw new DatabaseError(`タグ付け処理でデータベースエラーが発生しました: ${errorMessage}`);
		}
	}

	async deleteById(id: number) {
		await this.db.delete(consultations).where(eq(consultations.id, id));
	}

	/**
	 * 相談を更新する
	 * @param data - 更新する相談データ
	 * @param data.id - 更新する相談ID
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 更新された相談データ
	 * @throws {Error} データベースエラー、更新失敗時
	 */
	async update(data:
	{
		id: number;
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
		tagIds?: number[];
		queueContentCheck?: boolean;
		}) {
			try {
				let uniqueTagIds: number[] | undefined;
				if (data.tagIds !== undefined) {
					// 先にタグ存在チェックを行い、無効IDでは更新自体を実行しない
					uniqueTagIds = [...new Set(data.tagIds)];
				}

				if (uniqueTagIds && uniqueTagIds.length > 0) {
					const existingTags = await this.db
						.select({ id: tags.id })
						.from(tags)
						.where(inArray(tags.id, uniqueTagIds));

					const existingTagIdSet = new Set(existingTags.map((tag) => tag.id));
					const missingTagIds = uniqueTagIds.filter((tagId) => !existingTagIdSet.has(tagId));
					if (missingTagIds.length > 0) {
						throw new ConflictError(`存在しないタグIDが含まれています: ${missingTagIds.join(", ")}`);
					}
				}

				const updateQuery = this.db
					.update(consultations)
					.set({
						title: data.title,
						body: data.body,
						draft: data.draft,
					})
					.where(
						and(
							eq(consultations.id, data.id),
							eq(consultations.authorId, data.authorId),
						)
					)
					.returning();

				const upsertPendingContentCheckQuery = data.queueContentCheck
					? this.db
						.insert(contentChecks)
						.values({
							targetType: "consultation",
							targetId: data.id,
							status: "pending",
							reason: null,
							checkedAt: null,
							updatedAt: new Date(),
						})
						.onConflictDoUpdate({
							target: [contentChecks.targetType, contentChecks.targetId],
							set: {
								status: "pending",
								reason: null,
								checkedAt: null,
								updatedAt: new Date(),
							},
						})
					: null;

				if (data.tagIds === undefined) {
					if (!upsertPendingContentCheckQuery) {
						const [updated] = await updateQuery;

						if (!updated) {
							throw new DatabaseError(`相談の更新に失敗しました: id=${data.id}`);
						}

						return updated;
					}

					const [updateResult] = await this.db.batch([
						updateQuery,
						upsertPendingContentCheckQuery,
					]);

					const [updated] = updateResult;

					if (!updated) {
						throw new DatabaseError(`相談の更新に失敗しました: id=${data.id}`);
					}

					return updated;
				}

				const deleteTaggingsQuery = this.db
					.delete(consultationTaggings)
					.where(eq(consultationTaggings.consultationId, data.id));

				const insertTaggingsQuery = uniqueTagIds && uniqueTagIds.length > 0
					? this.db.insert(consultationTaggings).values(
						uniqueTagIds.map((tagId) => ({ consultationId: data.id, tagId })),
					)
					: null;

				// 相談更新とタグ差し替えを同一バッチで実行し、途中失敗時の部分更新を防ぐ
				const statements = insertTaggingsQuery
					? [updateQuery, deleteTaggingsQuery, insertTaggingsQuery] as const
					: [updateQuery, deleteTaggingsQuery] as const;

				const statementsWithContentCheck = upsertPendingContentCheckQuery
					? [...statements, upsertPendingContentCheckQuery] as const
					: statements;

				const [updateResult] = await this.db.batch(statementsWithContentCheck);

				const [updated] = updateResult;
				if (!updated) {
					throw new DatabaseError(`相談の更新に失敗しました: id=${data.id}`);
				}

				return updated;
			} catch (error) {
				if (error instanceof DatabaseError || error instanceof ConflictError) {
					throw error;
				}

				const errorMessage = (error as Error).message || String(error);
				if (errorMessage.includes("UNIQUE constraint failed")) {
					throw new ConflictError("同じタグ付けが既に存在します");
				}

				if (errorMessage.includes("FOREIGN KEY constraint failed")) {
					throw new ConflictError("指定されたタグまたは相談が存在しません");
				}

				throw new DatabaseError(`相談更新処理でデータベースエラーが発生しました: ${errorMessage}`);
			}
	}

	/**
	 * 
	 * @param data - 作成する相談アドバイスデータ
	 * @param data.consultationId - 相談ID
	 * @param data.authorId - アドバイス者ID
	 * @param data.body - アドバイス本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 作成された相談アドバイスデータ（authorリレーション含む）
	 * @throws {Error} データベースエラー、作成失敗時
	 */
		async createAdvice(data: {
			consultationId: number;
			authorId: number;
			body: string;
			draft: boolean;
		}) {
		try {
			// 回答投稿（公開/下書き）は、公開可視な相談に対してのみ許可する
			await this.findVisibleConsultationOrThrow(data.consultationId);

			const insertQuery = this.db
				.insert(advices)
				.values({
					body: data.body,
					authorId: data.authorId,
					draft: data.draft,
					consultationId: data.consultationId,
				})
				.returning();

			let insertedAdvice;

			if (data.draft) {
				// 下書きの時は親の相談更新日時は更新しない
				[insertedAdvice] = await insertQuery;
			} else {
				const [insertResult, updateResult] = await this.db.batch([
					insertQuery, // 定義済みの変数を再利用
					this.db
						.update(consultations)
						.set({ updatedAt: new Date() })
						.where(and(eq(consultations.id, data.consultationId), isNull(consultations.hiddenAt)))
						.returning({ id: consultations.id }),
				]);

				// 親が見つからない（または非表示）のチェック
				if (updateResult.length === 0) {
					throw new NotFoundError(`指定された相談(id:${data.consultationId})は見つかりませんでした`);
				}
				insertedAdvice = insertResult[0];
			}

			if (!insertedAdvice) {
				throw new DatabaseError(`相談アドバイスの作成に失敗しました id=${data.consultationId}`);
			}

			if (!data.draft) {
				try {
					await this.db.insert(contentChecks).values({
						targetType: "advice",
						targetId: insertedAdvice.id,
						status: "pending",
					});
				} catch (contentCheckError) {
					try {
						await this.db.delete(advices).where(eq(advices.id, insertedAdvice.id));
					} catch (rollbackError) {
						throw new DatabaseError(
							`アドバイス投稿チェック作成に失敗し、補償削除も失敗しました: contentCheckError=${String(contentCheckError)}, rollbackError=${String(rollbackError)}`,
						);
					}

					throw new DatabaseError(
						`アドバイス投稿チェック作成に失敗しました: ${String(contentCheckError)}`,
					);
				}
			}

			const author = await this.db.query.users.findFirst({
				where: eq(users.id, data.authorId),
			});
			if (!author) {
				throw new NotFoundError("指定されたユーザーが見つかりません");
			}

			return {
				...insertedAdvice,
				author,
			};
		} catch (error) {
			const errorString = error instanceof Error
				? `${error.message} ${String(error.cause)}`
				: String(error);

			if (errorString.includes("FOREIGN KEY constraint failed")) {
				throw new NotFoundError(`指定された相談(ID:${data.consultationId})は見つかりませんでした`);
			}

			if (error instanceof DatabaseError || error instanceof NotFoundError) {
				throw error;
			}

			throw new DatabaseError(`データベースエラーが発生しました: ${errorString}`);
		}
	}

	/**
	 * アドバイスの下書きを更新する
	 * 
	 * @param data - 更新する相談アドバイスデータ
	 * @param data.consultationId - 相談ID
	 * @param data.authorId - アドバイス者ID
	 * @param data.body - アドバイス本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 更新された相談アドバイスデータ
	 */
	// 下書きアドバイスを id で更新する。
	// 同一相談に本人の複数アドバイス(公開/下書き)が併存し得るため、consultationId では
	// 更新対象を一意に特定できない。id + 本人 + draft=true で下書き1件に厳密に引き当てる(ADR 012)。
	// draft=true を条件に含めることで、read 後に公開へ変わっても公開済みを上書きしない(fail-closed)。
	async updateDraftAdviceById(data: {
		adviceId: number;
		authorId: number;
		body: string;
	}) {
		const [updated] = await this.db.update(advices)
			.set({
				body: data.body,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(advices.id, data.adviceId),
					eq(advices.authorId, data.authorId),
					eq(advices.draft, true),
				)
			)
			.returning();
		if (!updated) {
			throw new NotFoundError(`更新対象の下書きアドバイス(id:${data.adviceId})は見つかりませんでした`);
		}

		return updated;
	}

	// 下書きアドバイスを公開へ昇格する(ADR 012 追補: C)。
	// 本文更新 + draft:false 化 + 審査待ち content_check(advice) 作成 + 親相談 updatedAt 更新を
	// 単一 batch(atomic) で行う。content_check は (target_type,target_id) の一意制約に対し
	// onConflictDoUpdate で冪等化する(相談公開 update の queueContentCheck と同型)。
	// 引き当ては id + 本人 + draft=true に厳密化し(fail-closed)、read 後に公開へ変わっても
	// 公開済みを上書きしない。親相談は公開可視なものに限る(createAdvice と同じ findVisibleConsultationOrThrow)。
	// 非表示相談に紐づく下書きの閲覧/編集体験の改善は別issue(#175)で扱う。
	// 想定外エラーは握り潰さずグローバルハンドラへ委ねる(そこで 5xx のログ/メッセージ統一を行う。#177)。
	// createAdvice と違い前提チェック済みで FK 正規化も不要なため、ここでは try/catch しない。
	async publishDraftAdviceById(data: {
		adviceId: number;
		authorId: number;
		consultationId: number;
		body: string;
	}) {
		// 公開は公開可視な相談に対してのみ許可する(createAdvice と同じルール・fail-closed)
		await this.findVisibleConsultationOrThrow(data.consultationId);

		const now = new Date();

		const publishAdviceQuery = this.db
			.update(advices)
			.set({
				body: data.body,
				draft: false,
				updatedAt: now,
			})
			.where(
				and(
					eq(advices.id, data.adviceId),
					eq(advices.authorId, data.authorId),
					eq(advices.draft, true),
				),
			)
			.returning();

		// 公開時のみ親相談の updatedAt を更新する(下書き更新では触らない。createAdvice と同じ扱い)
		const touchConsultationQuery = this.db
			.update(consultations)
			.set({ updatedAt: now })
			.where(and(eq(consultations.id, data.consultationId), isNull(consultations.hiddenAt)))
			.returning({ id: consultations.id });

		const upsertPendingContentCheckQuery = this.db
			.insert(contentChecks)
			.values({
				targetType: "advice",
				targetId: data.adviceId,
				status: "pending",
				reason: null,
				checkedAt: null,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: [contentChecks.targetType, contentChecks.targetId],
				set: {
					status: "pending",
					reason: null,
					checkedAt: null,
					updatedAt: now,
				},
			});

		const [publishResult, touchResult] = await this.db.batch([
			publishAdviceQuery,
			touchConsultationQuery,
			upsertPendingContentCheckQuery,
		]);

		// batch はこの時点で既にコミット済み。以降のガードで throw しても content_check/親 touch は
		// 取り消されない。稀な競合(同時公開・可視チェック後の親非表示化)では「404 だが公開・pending
		// 生成済み」になり得る(createAdvice 非下書き分岐と同じ、許容している既存パターン)。
		const [published] = publishResult;
		if (!published) {
			// 本人の下書きでない/既に公開済み(fail-closed)
			throw new NotFoundError(`公開対象の下書きアドバイス(id:${data.adviceId})は見つかりませんでした`);
		}

		if (touchResult.length === 0) {
			// findVisibleConsultationOrThrow 後に親が非表示化した競合に対する防御
			throw new NotFoundError(`指定された相談(id:${data.consultationId})は見つかりませんでした`);
		}

		return published;
	}

	// アドバイスを id + 本人で引き当てる。本人以外の id は見つからず(IDOR: fail-closed)。
	async findAdviceByIdForAuthor(adviceId: number, authorId: number) {
		const advice = await this.db.query.advices.findFirst({
			where: and(eq(advices.id, adviceId), eq(advices.authorId, authorId)),
		});
		if (!advice) {
			throw new NotFoundError(`指定されたアドバイス(id:${adviceId})は見つかりませんでした`);
		}
		return advice;
	}

	/**
	 * 公開相談の作成/公開化時に、相談単位の投稿チェックをpendingで作成する
	 */
	async createConsultationContentCheck(consultationId: number) {
		try {
			const [inserted] = await this.db
				.insert(contentChecks)
				.values({
					targetType: "consultation",
					targetId: consultationId,
					status: "pending",
				})
				.returning();

			if (!inserted) {
				throw new DatabaseError("投稿チェックレコードの作成に失敗しました");
			}

			return inserted;
		} catch (error) {
			if (error instanceof DatabaseError || error instanceof ConflictError) {
				throw error;
			}

			const errorMessage = (error as Error).message || String(error);
			if (errorMessage.includes("UNIQUE constraint failed")) {
				throw new ConflictError(`投稿チェックレコードが既に存在します: consultationId=${consultationId}`);
			}

			throw new DatabaseError(`投稿チェックレコード作成でデータベースエラーが発生しました: ${errorMessage}`);
		}
	}

	/**
	 * 公開APIの可視性判定で使う、相談1件のチェック状態を取得する
	 */
	async findConsultationContentCheckByConsultationId(consultationId: number) {
		return await this.db.query.contentChecks.findFirst({
			where: and(
				eq(contentChecks.targetType, "consultation"),
				eq(contentChecks.targetId, consultationId),
			),
		});
	}
}
