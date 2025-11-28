# 相談一覧API - ユニットテスト実装・実行結果

> ⚠️ **テスト方針の変更について**  
> 今後のプロジェクトでは **APIテスト（E2Eテスト）をメイン** とし、新規での単体テストは実装しません。  
> 既存の単体テストは参考資料として残していますが、今後は `docs/verification/consultations-list-api-verification.md` のような実際のAPIテスト結果を記録していきます。

## 概要

相談一覧API (`GET /api/consultations`) のコントローラー層に対するユニットテストを実装しました。
モックを使用してDBへの依存をなくし、コントローラーのロジック（クエリパラメータの解析、フィルタ条件の構築）のみをテストしています。

**注**: このテストは初期実装時に作成されたものです。今後は実際のAPIテストを優先します。

## 実装日

2025年11月23日

## 更新履歴

- **2025-11-23**: 初版作成
- **2025-11-23**: authGuard追加に伴うテスト更新
- **2025-11-24**: エラーハンドリング追加、userIdフィルタ動作変更
- **2025-11-28**: RQB移行、著者退会対応、typo修正（listConsultaitons → listConsultations）

## テスト対象

- **ファイル**: `apps/fumufumu-backend/src/routes/consultations.controller.ts`
- **関数**: `listConsultations`
- **エンドポイント**: `GET /api/consultations`
- **認証**: authGuardミドルウェアを使用（テストではモック化）

## テスト戦略

### モック化の対象

1. **authGuard**: 認証済み状態をモック（appUserId = 1）
2. **ConsultationService**: サービス層をモック化し、コントローラー層の処理のみをテスト
3. **Hono Context**: リクエストコンテキストをモック化し、クエリパラメータの取得をシミュレート
4. **Database**: DBへの接続は不要（Serviceがモック化されているため）

### テストの目的

- authGuard通過後の認証状態が保持されているか
- クエリパラメータが正しく解析されているか
- サービス層に正しいフィルタ条件が渡されているか（userIdのデフォルト値: undefined）
- レスポンスの構造が正しいか
- エラーハンドリングが適切に動作するか

## テストケース

### 1. 全件取得

**説明**: クエリパラメータなしで全ての相談データを取得できる

**期待動作**:
- サービス層に `{ userId: undefined, draft: undefined, solved: undefined }` が渡される
  - userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
- `meta` と `data` プロパティが存在する
- `data` が配列である
- 各要素が必要なフィールドを持つ
- `author` オブジェクトに不要なフィールド（`createdAt`, `updatedAt`）が含まれない

**結果**: ✅ PASS

---

### 2. draft=false フィルタ

**説明**: 公開済みの相談のみを取得できる

**クエリパラメータ**: `?draft=false`

**期待動作**:
- サービス層に `{ userId: undefined, draft: false, solved: undefined }` が渡される
  - userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
- 全てのデータの `draft` が `false` である

**結果**: ✅ PASS

---

### 3. draft=true フィルタ

**説明**: 下書きの相談のみを取得できる

**クエリパラメータ**: `?draft=true`

**期待動作**:
- サービス層に `{ userId: undefined, draft: true, solved: undefined }` が渡される
  - userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
- 全てのデータの `draft` が `true` である

**結果**: ✅ PASS

---

### 4. solved=true フィルタ

**説明**: 解決済みの相談のみを取得できる

**クエリパラメータ**: `?solved=true`

**期待動作**:
- サービス層に `{ userId: undefined, draft: undefined, solved: true }` が渡される
  - userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
- 全てのデータの `solved_at` が `null` でない

**結果**: ✅ PASS

---

### 5. solved=false フィルタ

**説明**: 未解決の相談のみを取得できる

**クエリパラメータ**: `?solved=false`

**期待動作**:
- サービス層に `{ userId: undefined, draft: undefined, solved: false }` が渡される
  - userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
- 全てのデータの `solved_at` が `null` である

**結果**: ✅ PASS

---

### 6. userId フィルタ

**説明**: 特定ユーザーの相談のみを取得できる

**クエリパラメータ**: `?userId=1`

**期待動作**:
- サービス層に `{ userId: 1, draft: undefined, solved: undefined }` が渡される
- 全てのデータの `author.id` が `1` である

**結果**: ✅ PASS

---

### 7. 複合フィルタ

**説明**: userId + draft + solved の組み合わせでフィルタできる

**クエリパラメータ**: `?userId=1&draft=false&solved=false`

**期待動作**:
- サービス層に `{ userId: 1, draft: false, solved: false }` が渡される
- 全てのデータが以下の条件を満たす:
  - `author.id` が `1`
  - `draft` が `false`
  - `solved_at` が `null`

**結果**: ✅ PASS

---

### 8. body_preview の文字数制限

**説明**: body_preview が100文字以内に切り取られている

**期待動作**:
- サービス層に `{ userId: undefined, draft: undefined, solved: undefined }` が渡される
- 全てのデータの `body_preview` の長さが100文字以下である

**結果**: ✅ PASS

---

## テスト実行結果

### 実行コマンド

```bash
pnpm test:unit --run consultations.controller.test.ts
```

### 出力結果

```
✓ src/routes/consultations.controller.test.ts (8 tests) 5ms

Test Files  1 passed (1)
     Tests  8 passed (8)
  Start at  00:02:46
  Duration  465ms (transform 74ms, setup 0ms, collect 148ms, tests 5ms, environment 0ms, prepare 54ms)
```

### サマリー

- **テストファイル数**: 1
- **テストケース数**: 8
- **成功**: 8 ✅
- **失敗**: 0
- **実行時間**: 5ms

---

## テスト環境

### 設定ファイル

#### vitest.unit.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
```

**特徴**:
- Cloudflare Workers 環境ではなく、Node.js 環境で実行
- パスエイリアス (`@/*`) をサポート
- グローバルなテスト関数を有効化

### package.json スクリプト

```json
{
  "scripts": {
    "test:unit": "vitest --config vitest.unit.config.ts"
  }
}
```

---

## テスト実行方法

### 1. 単一ファイルのテスト実行

```bash
cd apps/fumufumu-backend
pnpm test:unit --run consultations.controller.test.ts
```

### 2. 全てのユニットテストを実行

```bash
cd apps/fumufumu-backend
pnpm test:unit --run
```

### 3. ウォッチモードでテスト実行（開発時）

```bash
cd apps/fumufumu-backend
pnpm test:unit consultations.controller.test.ts
```

### 4. カバレッジ付きでテスト実行

```bash
cd apps/fumufumu-backend
pnpm test:unit --coverage
```

---

## テストコードの構造

### モックの実装

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listConsultations } from './consultations.controller';
import { ConsultationService } from '@/services/consultation.service';

// ConsultationServiceをモック化
vi.mock('@/services/consultation.service');

describe('Consultations API', () => {
  let mockContext: any;
  let mockConsultationService: any;

  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks();

    // Contextのモック作成
    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'db') return {};
        // authGuardで設定されるが、現在の実装では使用していない
        if (key === 'appUserId') return 1;
        return undefined;
      }),
      req: {
        query: vi.fn(() => undefined),
      },
      json: vi.fn((data: any) => ({
        json: async () => data,
        status: 200,
      })),
    };
  });

  // テストケース...
});
```

### テストケースの例

```typescript
it('draft=false: 公開済みの相談のみを取得できる', async () => {
  // クエリパラメータのモック設定
  mockContext.req.query = vi.fn((key: string) => {
    if (key === 'draft') return 'false';
    return undefined;
  });

  // モックデータの準備
  const mockData = {
    meta: { total: 2 },
    data: [/* ... */],
  };

  mockConsultationService = {
    listConsultaitons: vi.fn().mockResolvedValue(mockData),
  };
  vi.mocked(ConsultationService).mockImplementation(() => mockConsultationService);

  // テスト実行
  const response = await listConsultations(mockContext);
  const data: any = await response.json();

  // アサーション
  // userIdが指定されていない場合はundefined（全ユーザーの相談を取得）
  expect(mockConsultationService.listConsultaitons).toHaveBeenCalledWith({
    userId: undefined,
    draft: false,
    solved: undefined,
  });

  data.data.forEach((item: any) => {
    expect(item.draft).toBe(false);
  });
});
```

---

## 技術スタック

- **テストフレームワーク**: Vitest v3.2.4
- **モックライブラリ**: Vitest の組み込み機能 (`vi.mock`, `vi.fn`)
- **実行環境**: Node.js
- **TypeScript**: 型安全なテストコード

---

## モック化の利点

### 1. 高速実行
- DBへの接続が不要なため、テストが高速（5ms）
- CIパイプラインでの実行に最適

### 2. 独立性
- 外部依存（DB、ネットワーク）がないため、テストが常に同じ結果を返す
- テスト環境の構築が不要

### 3. 焦点の絞り込み
- コントローラー層のロジックのみをテスト
- クエリパラメータの解析とフィルタ条件の構築に焦点

### 4. メンテナンス性
- テストデータが明示的でわかりやすい
- モックの設定を変更するだけで様々なシナリオをテスト可能

---

## 今後の課題と方針

> ⚠️ **テスト方針の変更**  
> 以下の課題は参考情報として残していますが、今後は **APIテスト（E2Eテスト）** を優先します。  
> 新規の単体テストや統合テストは実装せず、実際のAPIテストで検証します。  
> 詳細は `docs/verification/consultations-list-api-verification.md` を参照してください。

### 1. ~~統合テスト~~ → APIテストで代替

~~現在のユニットテストはモックを使用していますが、実際のDB操作を含む統合テストも必要です~~

**方針変更**: 実際のAPIテスト（curl等）で以下を検証します：
- 実際のD1データベースへの接続
- マイグレーションの適用
- シードデータの挿入
- エンドツーエンドの動作確認

→ `docs/verification/consultations-list-api-verification.md` に記録済み ✅

### 2. クエリパラメータのバリデーション

現在、クエリパラメータのバリデーションは未実装です。以下の対応が必要：

- **無効なuserIdの検証**: `userId=abc`、`userId=-1`などを400エラーで返す
- **無効なdraft/solvedの検証**: `draft=yes`などを400エラーで返す
- **推奨アプローチ**: zod + @hono/zod-validator の導入
  - バリデーションミドルウェアとして実装
  - スキーマ定義により型安全性を確保
  - 自動的に400エラーレスポンスを返す

### 3. エッジケースのテスト → APIテストで検証

以下のエッジケースは **実際のAPIテスト** で検証します：

- 存在しないユーザーIDでのフィルタ → curl等で実際に試す
- 空の結果セット → 実際のAPIレスポンスを確認
- 大量データでのパフォーマンス → 必要に応じて実測

### 4. エラーハンドリングのテスト → APIテストで検証

エラーケースも **実際のAPIテスト** で検証します：

- サービス層でのエラー発生時の挙動 → 実際のエラーシナリオでテスト
- DB接続エラー時の挙動 → 環境を変えて実測
- タイムアウト処理 → 実際の負荷テストで確認

**現在の実装状況**:
- ✅ try-catchブロックによるエラーハンドリング実装済み
- ✅ 500 Internal Server Errorレスポンス実装済み
- ✅ APIテストで動作確認済み

### 5. レスポンスフォーマットの検証 → APIテストで確認

- JSONスキーマバリデーション → 実際のレスポンスをjq等で検証
- RFC 9457 Problem Details形式のエラーレスポンス → 将来の実装課題

---

## まとめ

相談一覧APIのコントローラー層に対するユニットテストを実装し、8つのテストケースすべてが成功しました。

**テスト方針の変更について**:
- このユニットテストは初期実装時の成果物として残しています
- **今後は実際のAPIテスト（E2Eテスト）を優先**します
- 新規の単体テストは追加せず、`docs/verification/consultations-list-api-verification.md` のような実APIテストで検証します

モックを使用することで、高速で安定したテストを実現し、コントローラー層のロジック（クエリパラメータの解析とフィルタ条件の構築）が正しく動作することを確認しました。

今後は統合テストやエッジケースのテストを追加して、より堅牢なAPIを構築していきます。

