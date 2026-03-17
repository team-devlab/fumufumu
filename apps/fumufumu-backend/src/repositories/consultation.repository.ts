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
import { contentChecks } from "@/db/schema/content-checks";


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

	private buildPublicConsultationCondition(): SQL {
		return and(
			eq(consultations.draft, false),
			isNull(consultations.hiddenAt),
			this.buildPublicVisibilityCondition(),
		) as SQL;
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
			conditions.push(eq(consultations.draft, true));
			conditions.push(isNull(consultations.hiddenAt));
		} else {
			conditions.push(eq(consultations.draft, false));
			conditions.push(isNull(consultations.hiddenAt));

			if (!filters?.includeUnapprovedForOwn) {
				conditions.push(this.buildPublicVisibilityCondition());
			}
		}

		return conditions.length > 0 ? and(...conditions) : undefined;
	}

	/**
	 * アドバイス一覧のWHERE句を構築する（findAdvicesByConsultationId / countAdvicesByConsultationId 共通）
	 */
	private buildAdviceWhereConditions(consultationId: number, filters?: AdviceFilters): SQL {
		const conditions: SQL[] = [
			eq(advices.consultationId, consultationId),
			eq(advices.draft, false),
			isNull(advices.hiddenAt),
		];

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

		return await this.db.query.consultations.findMany({
			where: this.buildWhereConditions(filters),
			orderBy: (fields, { desc }) => [desc(fields.createdAt)],
			limit: limit,
			offset: offset,
			with: {
				author: true,
			},
		});
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
			where: this.buildAdviceWhereConditions(consultationId, filters),
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
			.where(this.buildAdviceWhereConditions(consultationId, filters));

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
	async updateDraftAdvice(data: {
		consultationId: number;
		authorId: number;
		body: string;
		draft: boolean;
	}) {
		const [updated] = await this.db.update(advices)
			.set({
				body: data.body,
				draft: data.draft,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(advices.consultationId, data.consultationId),
					eq(advices.authorId, data.authorId),
				)
			)
			.returning();
		if (!updated) {
			throw new NotFoundError(`指定された相談アドバイス(consultationId:${data.consultationId}, authorId:${data.authorId})は見つかりませんでした`);
		}

		return updated;
	}

	async findFirstAdviceByConsultation(consultationId: number, authorId: number) {
		const advice = await this.db.query.advices.findFirst({
			where: and(eq(advices.consultationId, consultationId), eq(advices.authorId, authorId)),
		});
		if (!advice) {
			throw new NotFoundError(`指定された相談アドバイス(consultationId:${consultationId}, authorId:${authorId})は見つかりませんでした`);
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
