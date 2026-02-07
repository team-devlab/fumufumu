# シンプルページネーション実装ガイド

**実装日**: 2026-02-07  
**対象**: 相談一覧API（`GET /api/consultations`）  
**方式**: オフセットベース（前/次ボタン）  
**関連ADR**: [005-pagination-response-design.md](../design/adr/005-pagination-response-design.md)

---

## 📋 目次

1. [概要](#概要)
2. [実装方針](#実装方針)
3. [実装手順](#実装手順)
4. [テスト項目](#テスト項目)
5. [注意事項](#注意事項)

---

## 概要

### 目的

相談一覧が増えた際のパフォーマンス改善とユーザビリティ向上のため、ページネーション機能を追加する。

### スコープ

- ✅ 実装対象: 相談一覧API（`GET /api/consultations`）
- ✅ UI: 前へ/次へボタン + ページ情報表示
- ❌ 対象外: ページ番号による直接ジャンプ機能
- ❌ 対象外: 無限スクロール

### 完成イメージ

```
┌─────────────────────────────────────────────┐
│ 相談一覧 (21件)                              │
├─────────────────────────────────────────────┤
│ □ 相談1                                     │
│ □ 相談2                                     │
│ □ 相談3                                     │
│ ...                                         │
│ □ 相談20                                    │
├─────────────────────────────────────────────┤
│ [< 前へ]  2 / 3ページ  [次へ >]             │
└─────────────────────────────────────────────┘
```

---

## 実装方針

### API仕様

**リクエスト:**
```
GET /api/consultations?page=1&limit=20
```

**レスポンス:**
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total_items": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

### デフォルト値

| パラメータ | デフォルト値 | 最小値 | 最大値 |
|-----------|------------|--------|--------|
| `page` | 1 | 1 | なし |
| `limit` | 20 | 1 | 100 |

---

## 実装手順

### ステップ1: 型定義の追加 📝

**ファイル:** `apps/fumufumu-backend/src/types/consultation.types.ts`

```typescript
// 既存の型定義に追加

/**
 * ページネーション用パラメータ
 */
export type PaginationParams = {
  page: number;    // ページ番号（1始まり）
  limit: number;   // 1ページあたりの件数
};

/**
 * ページネーション情報（レスポンス用）
 */
export type PaginationMeta = {
  current_page: number;   // 現在のページ番号
  per_page: number;       // 1ページあたりの件数
  total_items: number;    // 全体の件数
  total_pages: number;    // 全体のページ数
  has_next: boolean;      // 次ページの有無
  has_prev: boolean;      // 前ページの有無
};
```

---

### ステップ2: レスポンス型の更新 🔄

**ファイル:** `apps/fumufumu-backend/src/types/consultation.response.ts`

```typescript
import type { PaginationMeta } from "@/types/consultation.types";

// 既存の型を更新
export type ConsultationListResponse = {
  data: ConsultationResponse[];
  pagination: PaginationMeta;  // meta から pagination に変更
};
```

---

### ステップ3: バリデーションスキーマの追加 ✅

**ファイル:** `apps/fumufumu-backend/src/validators/consultation.validator.ts`

```typescript
// listConsultationsQuerySchema に追加
export const listConsultationsQuerySchema = z.object({
  userId: positiveIntegerStringSchema.optional(),
  draft: booleanStringSchema.optional(),
  solved: booleanStringSchema.optional(),
  
  // ↓ 追加
  page: z.coerce
    .number()
    .int("ページ番号は整数を指定してください")
    .min(1, "ページ番号は1以上を指定してください")
    .optional()
    .default(1),
    
  limit: z.coerce
    .number()
    .int("件数は整数を指定してください")
    .min(1, "件数は1以上を指定してください")
    .max(100, "件数は100以下を指定してください")
    .optional()
    .default(20),
});
```

---

### ステップ4: Repository層の修正 🗄️

**ファイル:** `apps/fumufumu-backend/src/repositories/consultation.repository.ts`

#### 4-1. `findAll` メソッドの更新

```typescript
/**
 * 相談一覧を取得する（ページネーション対応）
 */
async findAll(
  filters?: ConsultationFilters,
  pagination?: PaginationParams  // ← 追加
) {
  const whereConditions: SQL[] = [];

  // フィルタ条件の構築（既存のまま）
  if (filters?.userId !== undefined) {
    whereConditions.push(eq(consultations.authorId, filters.userId));
  }

  if (filters?.draft !== undefined) {
    whereConditions.push(eq(consultations.draft, filters.draft));
  }

  if (filters?.solved !== undefined) {
    whereConditions.push(
      filters.solved
        ? isNotNull(consultations.solvedAt)
        : isNull(consultations.solvedAt)
    );
  }

  // ↓ ページネーション処理を追加
  const { page = 1, limit = 20 } = pagination || {};
  const offset = (page - 1) * limit;

  return await this.db.query.consultations.findMany({
    where: whereConditions.length > 0 
      ? and(...whereConditions) 
      : undefined,
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: limit,    // ← 追加
    offset: offset,  // ← 追加
    with: {
      author: true,
    },
  });
}
```

#### 4-2. `count` メソッドの追加

```typescript
/**
 * 相談の総件数を取得する（フィルタ適用後）
 */
async count(filters?: ConsultationFilters): Promise<number> {
  const whereConditions: SQL[] = [];

  // フィルタ条件の構築（findAllと同じ）
  if (filters?.userId !== undefined) {
    whereConditions.push(eq(consultations.authorId, filters.userId));
  }

  if (filters?.draft !== undefined) {
    whereConditions.push(eq(consultations.draft, filters.draft));
  }

  if (filters?.solved !== undefined) {
    whereConditions.push(
      filters.solved
        ? isNotNull(consultations.solvedAt)
        : isNull(consultations.solvedAt)
    );
  }

  // COUNT クエリ
  const result = await this.db
    .select({ count: sql<number>`count(*)` })
    .from(consultations)
    .where(
      whereConditions.length > 0 
        ? and(...whereConditions) 
        : undefined
    );

  return result[0]?.count || 0;
}
```

---

### ステップ5: Service層の修正 🔧

**ファイル:** `apps/fumufumu-backend/src/services/consultation.service.ts`

```typescript
import type { PaginationParams, PaginationMeta } from "@/types/consultation.types";

/**
 * ページネーション情報を計算する
 */
private calculatePagination(
  currentPage: number,
  perPage: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / perPage);
  
  return {
    current_page: currentPage,
    per_page: perPage,
    total_items: totalItems,
    total_pages: totalPages,
    has_next: currentPage < totalPages,
    has_prev: currentPage > 1,
  };
}

/**
 * 相談一覧を取得する（ページネーション対応）
 */
async listConsultations(
  filters?: ConsultationFilters,
  pagination?: PaginationParams  // ← 追加
): Promise<ConsultationListResponse> {
  const { page = 1, limit = 20 } = pagination || {};

  // 並列で取得（パフォーマンス向上）
  const [consultationList, totalCount] = await Promise.all([
    this.repository.findAll(filters, { page, limit }),
    this.repository.count(filters),
  ]);

  const responses = consultationList.map(consultation => 
    this.toConsultationResponse(consultation)
  );

  return {
    data: responses,
    pagination: this.calculatePagination(page, limit, totalCount),
  };
}
```

---

### ステップ6: Controller層の修正 🎮

**ファイル:** `apps/fumufumu-backend/src/routes/consultations.controller.ts`

```typescript
export async function listConsultations(c: ListConsultationsContext) {
  try {
    const validatedQuery = c.req.valid("query");

    // フィルタオブジェクトを構築
    const filters: ConsultationFilters = {
      userId: validatedQuery.userId,
      draft: validatedQuery.draft,
      solved: validatedQuery.solved,
    };

    // ページネーション情報を抽出 ← 追加
    const pagination: PaginationParams = {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
    };

    const service = c.get("consultationService");
    const result = await service.listConsultations(filters, pagination);

    return c.json(result, 200);
  } catch (error) {
    // エラーハンドリング（既存のまま）
    // ...
  }
}
```

---

### ステップ7: 統合テストの追加 🧪

**ファイル:** `apps/fumufumu-backend/src/test/consultations.integration.test.ts`

```typescript
describe('GET /api/consultations - Pagination', () => {
  beforeAll(async () => {
    // 30件の相談を作成（テストデータ）
    for (let i = 1; i <= 30; i++) {
      const req = new Request('http://localhost/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie!,
        },
        body: JSON.stringify({
          title: `テスト相談 ${i}`,
          body: `これはテスト相談${i}の本文です。`,
          draft: false,
        }),
      });
      await app.fetch(req, env);
    }
  });

  it('デフォルト: page=1, limit=20 で取得できる', async () => {
    const req = new Request('http://localhost/api/consultations', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.data.length).toBe(20);
    expect(data.pagination.current_page).toBe(1);
    expect(data.pagination.per_page).toBe(20);
    expect(data.pagination.total_items).toBeGreaterThanOrEqual(30);
    expect(data.pagination.has_next).toBe(true);
    expect(data.pagination.has_prev).toBe(false);
  });

  it('page=2 で2ページ目を取得できる', async () => {
    const req = new Request('http://localhost/api/consultations?page=2', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.pagination.current_page).toBe(2);
    expect(data.pagination.has_prev).toBe(true);
  });

  it('limit=10 で件数を指定できる', async () => {
    const req = new Request('http://localhost/api/consultations?limit=10', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.data.length).toBe(10);
    expect(data.pagination.per_page).toBe(10);
  });

  it('存在しないページを指定すると空配列が返る', async () => {
    const req = new Request('http://localhost/api/consultations?page=999', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.data.length).toBe(0);
    expect(data.pagination.has_next).toBe(false);
  });

  it('不正なページ番号（0以下）は400エラー', async () => {
    const req = new Request('http://localhost/api/consultations?page=0', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
  });

  it('limitが100を超えると400エラー', async () => {
    const req = new Request('http://localhost/api/consultations?limit=101', {
      headers: { 'Cookie': sessionCookie! },
    });

    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
  });
});
```

---

## テスト項目

### バックエンド

- [ ] デフォルト値（page=1, limit=20）で正常動作
- [ ] ページ指定（page=2）で2ページ目が取得できる
- [ ] 件数指定（limit=10）で件数が変更される
- [ ] 総件数が正しく計算される
- [ ] has_next, has_prev が正しく計算される
- [ ] 存在しないページ（page=999）で空配列が返る
- [ ] 不正な値（page=0, limit=101）で400エラー
- [ ] フィルタ（draft, solved）とページネーションの併用

---

## 注意事項

### パフォーマンス

- **OFFSET の問題**: ページ番号が大きくなるとクエリが遅くなる
  - 例: `OFFSET 10000` は10,001件目からスキャンする必要がある
  - 対策: インデックスを適切に設定（`created_at DESC`）

### データ整合性

- **ページ遷移中の新規投稿**: 件数がずれる可能性がある
  - 例: 1ページ目を見ている間に新規投稿 → 2ページ目で重複表示
  - 現時点では許容する（カーソルベースで解決可能）

### UI/UX

- **空ページの扱い**: 存在しないページでは空リストを表示
  - 改善案: 「該当するデータがありません」メッセージを表示

---

## 実装完了チェックリスト

- [ ] ステップ1: 型定義の追加
- [ ] ステップ2: レスポンス型の更新
- [ ] ステップ3: バリデーションスキーマの追加
- [ ] ステップ4: Repository層の修正
- [ ] ステップ5: Service層の修正
- [ ] ステップ6: Controller層の修正
- [ ] ステップ7: 統合テストの追加
- [ ] ステップ8: フロントエンド型定義の更新
- [ ] ステップ9: Paginationコンポーネントの作成
- [ ] ステップ10: ページコンポーネントの更新
- [ ] テスト項目の実施
- [ ] 動作確認（ブラウザ）
- [ ] ドキュメントの更新

---

## 参考資料

- [Drizzle ORM - Limit & Offset](https://orm.drizzle.team/docs/rqb#limit--offset)
- [Next.js - Search Params](https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional)
- [Zod - Coercion](https://zod.dev/?id=coercion-for-primitives)

---

**作成者**: AI Assistant  
**最終更新**: 2026-02-07
