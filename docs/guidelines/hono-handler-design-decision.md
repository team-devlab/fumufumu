# Honoハンドラ設計パターンの比較と判断

## 📌 概要

Honoでハンドラを実装する際、**公式推奨のインラインパターン**と**createFactoryパターン**の2つのアプローチがあります。本ドキュメントでは、ケント・ベックの設計原則に基づいて両者を比較し、プロジェクトに適した選択を検討します。

---

## 🔍 2つのパターン

### パターン1: Hono公式推奨（インラインハンドラ）

```typescript
consultationsRoute.get(
  "/",
  zValidator("query", listConsultationsQuerySchema),
  async (c) => {
    const validatedQuery = c.req.valid("query"); // 型推論が自動で効く
    // ...
  }
);
```

### パターン2: createFactoryパターン

```typescript
const factory = createFactory<{ Bindings: Env; Variables: Variables }>();

type ListConsultationsContext = Context<
  { Bindings: Env; Variables: Variables },
  string,
  { in: { query: unknown }; out: { query: z.output<typeof listConsultationsQuerySchema> } }
>;

export async function listConsultations(c: ListConsultationsContext) {
  // ...
}

export const listConsultationsHandlers = factory.createHandlers(
  zValidator("query", listConsultationsQuerySchema),
  async (c) => {
    return listConsultations(c);
  }
);

consultationsRoute.get("/", ...listConsultationsHandlers);
```

---

## ⚖️ ケント・ベックの原則に基づく比較

### 1. シンプルさ（Simplicity）

| 観点 | インライン | createFactory |
|-----|-----------|---------------|
| コード量 | ✅ 少ない | ❌ 多い |
| 型定義 | ✅ 不要（自動推論） | ❌ 手動で定義が必要 |
| 認知負荷 | ✅ 低い | ❌ 高い（複雑な型を理解する必要） |

**ケント・ベック**: *「シンプルなコードは読みやすく、変更しやすい」*

→ **インラインパターンが優位**

---

### 2. テスタビリティ（Testability）

| 観点 | インライン | createFactory |
|-----|-----------|---------------|
| ユニットテスト | ⚠️ 関数を直接テストしにくい | ✅ 関数をエクスポートしてテスト可能 |
| 統合テスト | ✅ `app.request()` で容易 | ✅ 同様に可能 |
| モックの複雑さ | ✅ 低い（サービス層のみモック） | ❌ 高い（Context全体をモックする必要） |

**ケント・ベック**: *「テストしにくいコードは設計に問題がある」*

→ **統合テスト形式であればインラインパターンでも十分テスト可能**

---

### 3. 責務の分離（Separation of Concerns）

```
┌─────────────────────────────────────────────────────────┐
│ Controller層（Presentation）                            │
│ - HTTPリクエスト/レスポンスの処理                        │
│ - バリデーション                                         │
│ - エラーハンドリング                                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Service層（Business Logic）                             │
│ - ビジネスロジック                                       │
│ - ドメインルール                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Repository層（Data Access）                             │
│ - データベースアクセス                                   │
└─────────────────────────────────────────────────────────┘
```

**重要な洞察**: ビジネスロジックのテストは**Service層**で行うべき。Controller層はHTTPの薄いラッパーであるべき。

→ Controller層をユニットテストする必要性は低い。統合テストで十分。

---

### 4. 変更容易性（Changeability）

| 観点 | インライン | createFactory |
|-----|-----------|---------------|
| ルート追加 | ✅ 簡単 | ⚠️ 型定義も追加が必要 |
| スキーマ変更 | ✅ 1箇所 | ❌ スキーマと型定義の2箇所 |
| フレームワーク更新 | ✅ 影響小 | ❌ 型定義が壊れる可能性 |

**ケント・ベック**: *「変更のコストを最小化せよ」*

→ **インラインパターンが優位**

---

## 🎯 結論

### 推奨: インラインパターン + 統合テスト

```typescript
// ✅ 推奨: シンプルなインラインハンドラ
consultationsRoute.get(
  "/",
  zValidator("query", listConsultationsQuerySchema),
  async (c) => {
    const validatedQuery = c.req.valid("query");
    // ...
  }
);
```

```typescript
// ✅ 推奨: 統合テスト
const app = new Hono().route("/consultations", consultationsRoute);

it("全件取得", async () => {
  const res = await app.request("/consultations");
  expect(res.status).toBe(200);
});
```

### createFactoryパターンが適する場面

1. **複数ルートで同じハンドラを再利用する場合**
2. **ミドルウェアチェーンが非常に複雑な場合**
3. **レガシーコードとの互換性が必要な場合**

---

## 📊 現状のプロジェクト評価

### 現在の実装（createFactoryパターン）

```typescript
type ListConsultationsContext = Context<
  { Bindings: Env; Variables: Variables },
  string,
  { in: { query: unknown }; out: { query: z.output<typeof listConsultationsQuerySchema> } }
>;
```

**問題点**:
- 複雑な型定義が必要
- Honoの内部構造（in/out）への依存
- テストのためにプロダクションコードが複雑化

**利点**:
- 既存のユニットテストが動作している
- 関数を直接テストできる

### 判断

**現時点では現状維持を推奨**

理由:
1. 既存のテストが動作している
2. 今すぐリファクタリングするコストが高い
3. 機能としては正しく動作している

**ただし、将来的には以下を検討**:
1. 新しいエンドポイントはインラインパターンで実装
2. 統合テスト形式への段階的移行
3. Service層のテストを充実させる

---

## 📚 参考

- [Hono Best Practices](https://hono.dev/docs/guides/best-practices)
- [Kent Beck - Test Driven Development](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Martin Fowler - Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**作成日**: 2025-12-06  
**更新日**: 2025-12-06

