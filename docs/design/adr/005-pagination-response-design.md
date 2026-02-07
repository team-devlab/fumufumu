# [ADR] ページネーションのレスポンス設計・デフォルト件数・無限スクロール対応方針の決定

* **Status**: Accepted
* **Date**: 2026-02-07
* **Context**:
  * 相談一覧API（`GET /api/consultations`）にページネーション機能を追加するにあたり、以下の設計判断が必要となった：
    1. レスポンスに含めるページネーション情報の粒度（最小限 vs 充実）
    2. デフォルトの1ページあたりの件数（limit）
  * フロントエンド（React）、将来的なモバイルアプリ、管理画面など、複数のクライアントからの利用を想定する必要がある。
  * パフォーマンス、ユーザビリティ、保守性のバランスを考慮した決定が求められる。

---

## Decision 1: レスポンス型の選択

### 採用: メタデータ充実型

```typescript
type ConsultationListResponse = {
  data: Consultation[];
  pagination: {
    current_page: number;     // 現在のページ番号
    per_page: number;         // 1ページあたりの件数
    total_items: number;      // 全体の件数
    total_pages: number;      // 全体のページ数
    has_next: boolean;        // 次ページの有無
    has_prev: boolean;        // 前ページの有無
  };
};
```

### 不採用: シンプル型

```typescript
type ConsultationListResponse = {
  data: Consultation[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
```

---

## Comparison of Approaches

| 観点 | メタデータ充実型 | シンプル型 |
|------|----------------|-----------|
| **情報量** | 6項目 | 3項目 |
| **レスポンスサイズ** | 約120バイト | 約50バイト |
| **フロントでの計算** | 不要 | 必要 |
| **実装速度** | ◎ 速い | △ 計算ロジック実装が必要 |
| **保守性** | ◎ 高い（ロジック一元化） | △ 各クライアントで実装必要 |
| **バグ混入リスク** | ◎ 低い | △ 計算ミスの可能性あり |
| **DRY原則** | ◎ 遵守（1箇所で計算） | ✖ 違反（各所で同じ計算） |

---

## Consequences: Decision 1（レスポンス型）

### Merit

1. **フロントエンド実装の簡素化**
   ```tsx
   // 計算不要、即座に使える
   <button disabled={!pagination.has_next}>次へ</button>
   <span>{pagination.current_page} / {pagination.total_pages}</span>
   ```

2. **計算ロジックの一元化（DRY原則）**
   - バックエンドで1回計算 → 全クライアントで利用可能
   - React、モバイルアプリ、管理画面で同じロジックを実装する必要がない

3. **バグ混入リスクの低減**
   - フロント側で `Math.ceil(total / limit)` の計算ミスがない
   - 境界値（101件 ÷ 20件 = 6ページ）の判定ミスを防止

4. **可読性の向上**
   ```typescript
   if (pagination.has_next) {
     // 次ページがある
   }
   // ↑ 意味が一目瞭然
   ```

5. **テストの簡素化**
   - フロント側でページネーション計算のテストが不要
   - バックエンドで一元的にテスト

### Demerit

1. **レスポンスサイズの微増**
   - 約70バイトの増加（全体の0.7%程度）
   - 実際の影響は無視できるレベル

2. **バックエンドの計算コスト**
   - `total_pages`, `has_next`, `has_prev` の計算が必要
   - ただし、計算量は O(1) で実質的なコストは無視できる

## Decision 2: デフォルト件数

### 採用: 20件

```typescript
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
```

---

## Decision 3: 無限スクロール対応時のページネーション方式

### 採用: 現状の Offset Pagination を維持し、Cursor Pagination は必要時に共存導入する

### 背景

相談一覧画面で無限スクロールUIを導入する場合、Cursor Pagination への移行を検討した。

### 判断理由

1. **Offset Pagination でも無限スクロールは実現可能**
   - バックエンドは変更不要。フロントが `page` をインクリメントしてデータを追記するだけで対応できる

2. **Offset 方式の弱点は現時点で問題にならない**
   - スクロール中に新規投稿があるとデータのズレ（重複・欠落）が発生し得る
   - ただし、これは投稿頻度が高い場合に初めて顕在化する問題であり、現段階では許容範囲

3. **今移行すると手戻りコストが発生する**
   - 既存の Offset Pagination 実装（Repository / Service / Controller / テスト）を書き換える必要がある
   - YAGNI原則に基づき、問題が発生してから対処する

### 進め方

| Phase | 対応内容 | トリガー |
|-------|---------|---------|
| Phase 1 | Offset Pagination のまま運用 | 現在 |
| Phase 2 | Cursor Pagination を同一APIに共存導入 | 投稿頻度の増加によりデータのズレが問題化した時点 |

### Phase 2 の方針: 完全移行ではなく共存

Cursor Pagination は全件数（`total_items` / `total_pages`）の取得に向かない。
そのため、完全移行ではなく **同一APIにおける共存** を採用する。

```
Offset 方式:  GET /api/consultations?page=2&limit=20
Cursor 方式:  GET /api/consultations?after=<id>&limit=20
```

- `after` パラメータが指定された場合 → Cursor 方式で応答
- `page` パラメータが指定された場合（またはデフォルト） → Offset 方式で応答

画面の用途に応じてフロントが使い分ける想定：
- 全件数表示が必要な画面（ユーザー画面、管理画面など） → Offset 方式
- 無限スクロールで件数不要な画面（相談一覧など） → Cursor 方式

---

## Summary

| 項目 | 決定内容 | 理由 |
|------|---------|------|
| **レスポンス型** | メタデータ充実型 | 保守性、実装速度、バグ予防の観点から最適 |
| **デフォルト件数** | 20件 | パフォーマンス、UX、業界標準の観点から最適 |
| **最大件数** | 100件 | サーバー負荷対策 |
| **無限スクロール対応** | Offset維持、必要時にCursor共存 | YAGNI原則。手戻りコスト回避 |

**結論**: 保守性とユーザビリティを重視し、業界標準に準拠した設計を採用する。将来の Cursor Pagination 導入は完全移行ではなく共存方式とする。
